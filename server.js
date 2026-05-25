const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = 'https://api.mail.tm';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function mtFetch(url, opts) {
  opts = opts || {};
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch(e) { data = { error: text }; }
  return { status: res.status, ok: res.ok, data };
}

app.get('/api/domains', async (req, res) => {
  try {
    const r1 = await mtFetch(BASE + '/domains?page=1');
    const r2 = await mtFetch(BASE + '/domains?page=2');
    const all = [
      ...(r1.data['hydra:member'] || []),
      ...(r2.data['hydra:member'] || [])
    ];
    res.json({ domains: all });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/accounts', async (req, res) => {
  try {
    const r = await mtFetch(BASE + '/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.status(r.status).json(r.data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/token', async (req, res) => {
  try {
    const r = await mtFetch(BASE + '/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.status(r.status).json(r.data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const r = await mtFetch(BASE + '/messages?page=1', {
      headers: { 'Authorization': auth }
    });
    res.status(r.status).json(r.data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages/:id', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const r = await mtFetch(BASE + '/messages/' + req.params.id, {
      headers: { 'Authorization': auth }
    });
    res.status(r.status).json(r.data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const r = await fetch(BASE + '/messages/' + req.params.id, {
      method: 'DELETE', headers: { 'Authorization': auth }
    });
    res.status(r.status).json({ ok: r.ok });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const r = await fetch(BASE + '/accounts/' + req.params.id, {
      method: 'DELETE', headers: { 'Authorization': auth }
    });
    res.status(r.status).json({ ok: r.ok });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('KingBadBoi TempMail running on port ' + PORT));
