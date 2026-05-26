const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Dynamic import for node-fetch (ESM)
let fetch;
(async () => { fetch = (await import('node-fetch')).default; })();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Guerrilla Mail base URL
const GM = 'https://api.guerrillamail.com/ajax.php';
const AGENT = 'KingBadBoi_TempMail/2.0';

// ── Visitor tracking (in-memory; use Redis/DB for production) ────────────────
const visitors = new Set();
let totalVisitors = 0;

app.post('/api/visit', (req, res) => {
  const { deviceId } = req.body;
  if (deviceId && !visitors.has(deviceId)) {
    visitors.add(deviceId);
    totalVisitors++;
  }
  res.json({ count: totalVisitors });
});

app.get('/api/visitors', (req, res) => res.json({ count: totalVisitors }));

// ── GET EMAIL ADDRESS ─────────────────────────────────────────────────────────
// Calls Guerrilla Mail get_email_address → returns { email_addr, sid_token, email_timestamp }
app.get('/api/generate', async (req, res) => {
  try {
    const url = `${GM}?f=get_email_address&lang=en&ip=127.0.0.1&agent=${AGENT}`;
    const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
    if (!r.ok) throw new Error(`GM responded ${r.status}`);
    const data = await r.json();
    // Return only what the frontend needs
    res.json({
      email: data.email_addr,
      sid_token: data.sid_token,
      timestamp: data.email_timestamp,
      alias: data.alias || ''
    });
  } catch (err) {
    console.error('generate error:', err.message);
    res.status(500).json({ error: 'Failed to generate email. Try again.' });
  }
});

// ── CHECK INBOX (POLL) ────────────────────────────────────────────────────────
// Calls check_email with seq (last known mail id) and sid_token
// Returns list of new messages
app.get('/api/check', async (req, res) => {
  const { sid_token, seq = 0 } = req.query;
  if (!sid_token) return res.status(400).json({ error: 'Missing sid_token' });

  try {
    const url = `${GM}?f=check_email&seq=${seq}&sid_token=${encodeURIComponent(sid_token)}&ip=127.0.0.1&agent=${AGENT}`;
    const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
    if (!r.ok) throw new Error(`GM responded ${r.status}`);
    const data = await r.json();
    res.json({
      list: data.list || [],
      count: data.count || 0,
      email: data.email || ''
    });
  } catch (err) {
    console.error('check error:', err.message);
    res.status(500).json({ error: 'Inbox check failed.' });
  }
});

// ── FETCH SINGLE EMAIL BODY ───────────────────────────────────────────────────
app.get('/api/email/:id', async (req, res) => {
  const { sid_token } = req.query;
  const { id } = req.params;
  if (!sid_token) return res.status(400).json({ error: 'Missing sid_token' });

  try {
    const url = `${GM}?f=fetch_email&email_id=${id}&sid_token=${encodeURIComponent(sid_token)}&ip=127.0.0.1&agent=${AGENT}`;
    const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
    if (!r.ok) throw new Error(`GM responded ${r.status}`);
    const data = await r.json();
    res.json({
      id: data.mail_id,
      from: data.mail_from,
      subject: data.mail_subject,
      body: data.mail_body,
      date: data.mail_date,
      timestamp: data.mail_timestamp
    });
  } catch (err) {
    console.error('fetch email error:', err.message);
    res.status(500).json({ error: 'Failed to load email.' });
  }
});

// ── GET EMAIL LIST (full list, not just new) ──────────────────────────────────
app.get('/api/list', async (req, res) => {
  const { sid_token, offset = 0 } = req.query;
  if (!sid_token) return res.status(400).json({ error: 'Missing sid_token' });

  try {
    const url = `${GM}?f=get_email_list&offset=${offset}&sid_token=${encodeURIComponent(sid_token)}&ip=127.0.0.1&agent=${AGENT}`;
    const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
    if (!r.ok) throw new Error(`GM responded ${r.status}`);
    const data = await r.json();
    res.json({ list: data.list || [], count: data.count || 0 });
  } catch (err) {
    console.error('list error:', err.message);
    res.status(500).json({ error: 'Failed to get email list.' });
  }
});

// ── DELETE EMAIL ──────────────────────────────────────────────────────────────
app.delete('/api/email/:id', async (req, res) => {
  const { sid_token } = req.query;
  const { id } = req.params;
  try {
    const url = `${GM}?f=del_email&email_ids[]=${id}&sid_token=${encodeURIComponent(sid_token)}&ip=127.0.0.1&agent=${AGENT}`;
    await fetch(url, { headers: { 'User-Agent': AGENT } });
    res.json({ deleted: true });
  } catch {
    res.json({ deleted: false });
  }
});

app.listen(PORT, () => {
  console.log(`🥷 KingBadBoi TempMail running → http://localhost:${PORT}`);
});
