import "dotenv/config";

const ANKI_URL = process.env.ANKI_URL!;
const API_URL = process.env.API_URL!;
const API_KEY = process.env.API_KEY!;

if (!ANKI_URL || !API_URL || !API_KEY) {
  throw new Error("Missing required environment variables");
}

type AnkiResponse<T> = {
  result: T;
  error: string | null;
};

// ---- Generic AnkiConnect request ----
async function ankiRequest<T>(action: string, params = {}): Promise<T> {
  const res = await fetch(ANKI_URL, {
    method: "POST",
    body: JSON.stringify({
      action,
      version: 6,
      params,
    }),
  });

  if (!res.ok) {
    throw new Error(`Anki request failed: ${res.status}`);
  }

  const data: AnkiResponse<T> = await res.json();

  if (data.error) {
    throw new Error(`Anki error: ${data.error}`);
  }

  return data.result;
}

// ---- Retry wrapper ----
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    console.warn(`Retrying... (${retries})`);
    await new Promise((r) => setTimeout(r, delayMs));
    return withRetry(fn, retries - 1, delayMs);
  }
}

// ---- Main sync logic ----
async function sync() {
  console.log("Fetching Anki stats...");

  const deckNames = await withRetry(() => ankiRequest<any>("deckNames"));

  console.log(deckNames);

  const deckStats = await withRetry(() =>
    ankiRequest<any>("getDeckStats", {
      decks: ["Kaishi 1.5k", "日本語 Mining Deck"],
    }),
  );

  console.log(deckStats);

  const payload = {
    timestamp: new Date().toISOString(),
    deckNames,
    deckStats,
  };

  console.log("Sending to API...");

  const res = await withRetry(() =>
    fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }),
  );

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }

  console.log("Sync successful");
}

// ---- Run ----
sync().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
