const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MAILTM = 'https://api.mail.tm';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function proxy(url, opts) {
  opts = opts || {};
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch(e) { data = { error: text }; }
  return { status: res.status, data };
}

// Get ALL available domains
app.get('/api/domains', async (req, res) => {
  try {
    // Fetch multiple pages to get all domains
    const r1 = await proxy(MAILTM + '/domains?page=1');
    const r2 = await proxy(MAILTM + '/domains?page=2');
    const list1 = r1.data['hydra:member'] || [];
    const list2 = r2.data['hydra:member'] || [];
    const all = [...list1, ...list2];
    res.json({ 'hydra:member': all });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/accounts', async (req, res) => {
  try {
    const { status, data } = await proxy(MAILTM + '/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.status(status).json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/token', async (req, res) => {
  try {
    const { status, data } = await proxy(MAILTM + '/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.status(status).json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const page = req.query.page || 1;
    const { status, data } = await proxy(MAILTM + '/messages?page=' + page, {
      headers: { 'Authorization': auth }
    });
    res.status(status).json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages/:id', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const { status, data } = await proxy(MAILTM + '/messages/' + req.params.id, {
      headers: { 'Authorization': auth }
    });
    res.status(status).json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const r = await fetch(MAILTM + '/messages/' + req.params.id, {
      method: 'DELETE', headers: { 'Authorization': auth }
    });
    res.status(r.status).json({ ok: r.ok });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const r = await fetch(MAILTM + '/accounts/' + req.params.id, {
      method: 'DELETE', headers: { 'Authorization': auth }
    });
    res.status(r.status).json({ ok: r.ok });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('KingBadBoi TempMail on port ' + PORT));
