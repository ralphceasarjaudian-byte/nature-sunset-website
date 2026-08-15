const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, "data", "items.json");
const FEEDBACK_PATH = path.join(__dirname, "data", "feedback.json");

app.use(express.json());

function loadItems() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function loadFeedback() {
  if (!fs.existsSync(FEEDBACK_PATH)) return [];
  const raw = fs.readFileSync(FEEDBACK_PATH, "utf-8");
  return raw.trim() ? JSON.parse(raw) : [];
}

function saveFeedback(entries) {
  fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(entries, null, 2));
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

// POST /api/feedback - store a visitor's feedback message
app.post("/api/feedback", (req, res) => {
  const { name, email, message } = req.body || {};

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  const entries = loadFeedback();
  entries.push({
    id: Date.now(),
    name: (name || "").trim() || "Anonymous",
    email: (email || "").trim(),
    message: message.trim(),
    submittedAt: new Date().toISOString(),
  });
  saveFeedback(entries);

  res.status(201).json({ success: true });
});

// GET /api/feedback?key=... - view submitted messages (protected with a simple shared key
// so random visitors can't read everyone's feedback/emails). Set your own key by creating
// an ADMIN_KEY environment variable; otherwise it falls back to "letmein".
const ADMIN_KEY = process.env.ADMIN_KEY || "letmein";

app.get("/api/feedback", (req, res) => {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Invalid or missing key." });
  }

  const entries = loadFeedback().sort(
    (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
  );
  res.json(entries);
});

app.listen(PORT, () => {
  console.log(`The Golden Hour Archive is running at http://localhost:${PORT}`);
});
