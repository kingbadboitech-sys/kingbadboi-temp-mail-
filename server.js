const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GUERRILLA = 'https://api.guerrillamail.com/ajax.php';
const MAILTM = 'https://api.mail.tm';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── GUERRILLA MAIL ───────────────────────────────────────────

// Get new email address (returns sid_token + email)
app.get('/api/guerrilla/address', async (req, res) => {
  try {
    const r = await fetch(`${GUERRILLA}?f=get_email_address&lang=en`);
    const d = await r.json();
    res.json(d);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Set custom username
app.get('/api/guerrilla/set', async (req, res) => {
  try {
    const { user, sid } = req.query;
    const r = await fetch(`${GUERRILLA}?f=set_email_user&email_user=${encodeURIComponent(user)}&sid_token=${sid}&lang=en`);
    const d = await r.json();
    res.json(d);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Check inbox
app.get('/api/guerrilla/check', async (req, res) => {
  try {
    const { sid, seq } = req.query;
    const r = await fetch(`${GUERRILLA}?f=check_email&sid_token=${sid}&seq=${seq||0}`);
    const d = await r.json();
    res.json(d);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Fetch single email
app.get('/api/guerrilla/fetch', async (req, res) => {
  try {
    const { sid, id } = req.query;
    const r = await fetch(`${GUERRILLA}?f=fetch_email&email_id=${id}&sid_token=${sid}`);
    const d = await r.json();
    res.json(d);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Get email list
app.get('/api/guerrilla/list', async (req, res) => {
  try {
    const { sid, offset } = req.query;
    const r = await fetch(`${GUERRILLA}?f=get_email_list&sid_token=${sid}&offset=${offset||0}&seq=0`);
    const d = await r.json();
    res.json(d);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Forget / delete address
app.get('/api/guerrilla/forget', async (req, res) => {
  try {
    const { sid } = req.query;
    const r = await fetch(`${GUERRILLA}?f=forget_me&sid_token=${sid}`);
    const d = await r.json();
    res.json(d);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── MAIL.TM ──────────────────────────────────────────────────

async function mtFetch(url, opts) {
  const r = await fetch(url, opts || {});
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch(e) { d = { error: t }; }
  return { status: r.status, ok: r.ok, data: d };
}

app.get('/api/mailtm/domains', async (req, res) => {
  try {
    const r1 = await mtFetch(`${MAILTM}/domains?page=1`);
    const r2 = await mtFetch(`${MAILTM}/domains?page=2`);
    const all = [...(r1.data['hydra:member']||[]), ...(r2.data['hydra:member']||[])];
    res.json({ domains: all });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/mailtm/accounts', async (req, res) => {
  try {
    const r = await mtFetch(`${MAILTM}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.status(r.status).json(r.data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/mailtm/token', async (req, res) => {
  try {
    const r = await mtFetch(`${MAILTM}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.status(r.status).json(r.data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/mailtm/messages', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const r = await mtFetch(`${MAILTM}/messages?page=1`, { headers: { 'Authorization': auth } });
    res.status(r.status).json(r.data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/mailtm/messages/:id', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const r = await mtFetch(`${MAILTM}/messages/${req.params.id}`, { headers: { 'Authorization': auth } });
    res.status(r.status).json(r.data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/mailtm/messages/:id', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const r = await fetch(`${MAILTM}/messages/${req.params.id}`, { method: 'DELETE', headers: { 'Authorization': auth } });
    res.status(r.status).json({ ok: r.ok });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/mailtm/accounts/:id', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const r = await fetch(`${MAILTM}/accounts/${req.params.id}`, { method: 'DELETE', headers: { 'Authorization': auth } });
    res.status(r.status).json({ ok: r.ok });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── STATIC ───────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('KingBadBoi TempMail on port ' + PORT));
