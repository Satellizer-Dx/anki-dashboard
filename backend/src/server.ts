import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

let latestData: any = null;

app.post("/sync", (req, res) => {
  const data = req.body;
  if (!data) {
    return res.status(400).json({ error: "No data provided" });
  }
  latestData = data;
  console.log("Data received:");
  console.log(JSON.stringify(latestData, null, 2));

  res.json({ ok: true });
  //res.json({ message: "Data received successfully" });
});

app.get("/latest", (_req, res) => {
  res.json(latestData ?? { message: "No data received yet" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
