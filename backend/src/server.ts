import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

let latestData: SyncData | null = null;

interface DeckStat {
  deck_id: number | string;
  name: string;
  new_count: number;
  learn_count: number;
  review_count: number;
  total_in_deck: number;
}

interface SyncData {
  timestamp: string;
  deckStats: Record<string, DeckStat>;
}

app.post("/sync", async (req, res) => {
  const data: SyncData = req.body;
  if (!data) {
    return res.status(400).json({ error: "No data provided" });
  }
  latestData = data;
  console.log("Data received:");
  console.log(JSON.stringify(latestData, null, 2));

  await prisma.syncSnapshot.create({
    data: {
      timestamp: new Date(data.timestamp),
      decks: {
        create: Object.values(data.deckStats).map((deck) => ({
          deckId: BigInt(deck.deck_id),
          name: deck.name,
          newCount: deck.new_count,
          learnCount: deck.learn_count,
          reviewCount: deck.review_count,
          totalInDeck: deck.total_in_deck,
        })),
      },
    },
  });

  console.log("Data saved to database");
  res.json({ ok: true });
});

app.get("/latest", async (_req, res) => {
  const latestSnapshot = await prisma.syncSnapshot.findFirst({
    orderBy: { timestamp: "desc" },
    include: { decks: true },
  });

  if (!latestSnapshot) {
    return res.json({ message: "No snapshots found" });
  }

  const response = {
    ...latestSnapshot,
    decks: latestSnapshot.decks.map((deck) => ({
      ...deck,
      deckId: deck.deckId.toString(),
    })),
  };

  res.json(response);
});

app.get("/summary", async (_req, res) => {
  const latestSnapshot = await prisma.syncSnapshot.findFirst({
    orderBy: { timestamp: "desc" },
    include: { decks: true },
  });

  if (!latestSnapshot) {
    return res.json({ message: "No snapshots found" });
  }

  const totalDecks = latestSnapshot.decks.length;

  const totalCards = latestSnapshot.decks.reduce(
    (sum, deck) => sum + deck.totalInDeck,
    0,
  );

  const totalNewDue = latestSnapshot.decks.reduce(
    (sum, deck) => sum + deck.newCount,
    0,
  );

  const totalLearnDue = latestSnapshot.decks.reduce(
    (sum, deck) => sum + deck.learnCount,
    0,
  );

  const totalReviewsDue = latestSnapshot.decks.reduce(
    (sum, deck) => sum + deck.reviewCount,
    0,
  );

  res.json({
    lastSync: latestSnapshot.timestamp,
    totalDecks,
    totalCards,
    totalNewDue,
    totalLearnDue,
    totalReviewsDue,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
