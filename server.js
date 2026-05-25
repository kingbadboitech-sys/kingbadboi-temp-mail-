const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Visitor count per device tracked client-side via localStorage
// Server keeps a simple in-memory total counter
let totalVisitors = 0;
const visitedDevices = new Set();

app.post("/api/visit", (req, res) => {
  const { deviceId } = req.body;
  if (deviceId && !visitedDevices.has(deviceId)) {
    visitedDevices.add(deviceId);
    totalVisitors++;
  }
  res.json({ total: totalVisitors, unique: visitedDevices.size });
});

app.get("/api/visitors", (req, res) => {
  res.json({ total: totalVisitors, unique: visitedDevices.size });
});

// Proxy: Generate a new temp email via Guerrilla Mail
app.get("/api/generate", async (req, res) => {
  try {
    const fetch = (await import("node-fetch")).default;
    const response = await fetch(
      "https://api.guerrillamail.com/ajax.php?f=get_email_address&lang=en&site=guerrillamail.info&ref_mid=&cm=0"
    );
    const data = await response.json();
    res.json({
      email: data.email_addr,
      token: data.sid_token,
      timestamp: data.email_timestamp,
    });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "Failed to generate email" });
  }
});

// Proxy: Check inbox for given token
app.get("/api/inbox", async (req, res) => {
  const { token, seq } = req.query;
  if (!token) return res.status(400).json({ error: "Missing token" });
  try {
    const fetch = (await import("node-fetch")).default;
    const response = await fetch(
      `https://api.guerrillamail.com/ajax.php?f=check_email&seq=${seq || 0}&sid_token=${token}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Inbox error:", err);
    res.status(500).json({ error: "Failed to check inbox" });
  }
});

// Proxy: Get a single message
app.get("/api/message", async (req, res) => {
  const { token, id } = req.query;
  if (!token || !id) return res.status(400).json({ error: "Missing params" });
  try {
    const fetch = (await import("node-fetch")).default;
    const response = await fetch(
      `https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${id}&sid_token=${token}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Message error:", err);
    res.status(500).json({ error: "Failed to fetch message" });
  }
});

app.listen(PORT, () => {
  console.log(`🥷 KingBadBoi TempMail running on http://localhost:${PORT}`);
});
