const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, "data", "items.json");

function loadItems() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

app.use(express.static(path.join(__dirname, "public")));

// GET /api/items - list every item (optionally filter with ?timeOfDay=dusk or ?category=Forest)
app.get("/api/items", (req, res) => {
  const items = loadItems();
  const { timeOfDay, category } = req.query;

  const filtered = items.filter((item) => {
    const matchesTime = timeOfDay ? item.timeOfDay === timeOfDay : true;
    const matchesCategory = category ? item.category === category : true;
    return matchesTime && matchesCategory;
  });

  res.json(filtered);
});

// GET /api/items/:id - a single item's full details, shown when a photo is clicked
app.get("/api/items/:id", (req, res) => {
  const items = loadItems();
  const item = items.find((i) => i.id === Number(req.params.id));

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  res.json(item);
});

app.listen(PORT, () => {
  console.log(`The Golden Hour Archive is running at http://localhost:${PORT}`);
});
