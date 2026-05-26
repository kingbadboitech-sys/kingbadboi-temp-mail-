const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory visitor count store (use a DB for production)
const visitors = new Set();
let totalVisitors = 0;

// ─── VISITOR COUNT ───────────────────────────────────────────────────────────
app.post('/api/visit', (req, res) => {
  const deviceId = req.body.deviceId;
  if (deviceId && !visitors.has(deviceId)) {
    visitors.add(deviceId);
    totalVisitors++;
  }
  res.json({ count: totalVisitors });
});

app.get('/api/visitors', (req, res) => {
  res.json({ count: totalVisitors });
});

// ─── GENERATE EMAIL via tempmail.ninja ───────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  try {
    // tempmail.ninja public API - generate a random email
    const response = await fetch('https://api.tempmail.ninja/v1/inbox/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: '', domain: 'tempmail.ninja' })
    });

    if (!response.ok) throw new Error('TempMail API error');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    // Fallback: generate a random address using known tempmail.ninja domains
    const adjectives = ['shadow', 'ninja', 'dark', 'ghost', 'stealth', 'void', 'black', 'silent'];
    const nouns = ['fox', 'blade', 'wolf', 'hawk', 'storm', 'raven', 'viper', 'dragon'];
    const domains = ['tempmail.ninja'];
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const num = Math.floor(Math.random() * 9999);
    const email = `${rand(adjectives)}${rand(nouns)}${num}@${rand(domains)}`;
    const token = Buffer.from(email).toString('base64');
    res.json({ email, token });
  }
});

// ─── CHECK INBOX via tempmail.ninja ──────────────────────────────────────────
app.get('/api/inbox/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const email = Buffer.from(token, 'base64').toString('utf-8');

    const response = await fetch(`https://api.tempmail.ninja/v1/inbox?email=${encodeURIComponent(email)}`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error('Inbox fetch error');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ mail: [] });
  }
});

// ─── GET SINGLE EMAIL ─────────────────────────────────────────────────────────
app.get('/api/email/:token/:id', async (req, res) => {
  try {
    const token = req.params.token;
    const id = req.params.id;
    const email = Buffer.from(token, 'base64').toString('utf-8');

    const response = await fetch(`https://api.tempmail.ninja/v1/inbox/${id}?email=${encodeURIComponent(email)}`);
    if (!response.ok) throw new Error('Email fetch error');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load email' });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 KingBadBoi TempMail running on port ${PORT}`);
});
