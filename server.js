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

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const GM     = 'https://api.guerrillamail.com/ajax.php';
const AGENT  = 'KingBadBoi_TempMail/3.0';
const MAILTM = 'https://api.mail.tm';

// ── VISITOR TRACKING ──────────────────────────────────────────────────────────
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

// ════════════════════════════════════════════════════════════════════════════════
//  GUERRILLA MAIL ROUTES
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/gm/domains — returns all available GM domains
app.get('/api/gm/domains', async (req, res) => {
  try {
    const url = `${GM}?f=get_email_address&lang=en&ip=127.0.0.1&agent=${AGENT}`;
    const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
    const data = await r.json();
    // GM returns domain list inside response
    const domains = data.domain_list || ['guerrillamailblock.com','grr.la','guerrillamail.info','guerrillamail.biz','guerrillamail.de','guerrillamail.net','guerrillamail.org','spam4.me'];
    res.json({ domains });
  } catch (err) {
    // Fallback known domains
    res.json({ domains: ['guerrillamailblock.com','grr.la','guerrillamail.info','guerrillamail.biz','guerrillamail.de','guerrillamail.net','guerrillamail.org','spam4.me'] });
  }
});

// GET /api/gm/generate?user=NAME&domain=DOMAIN — set specific address
app.get('/api/gm/generate', async (req, res) => {
  const { user, domain } = req.query;
  try {
    let url;
    if (user && domain) {
      url = `${GM}?f=set_email_user&email_user=${encodeURIComponent(user)}&lang=en&ip=127.0.0.1&agent=${AGENT}`;
      // First get a session
      const initR = await fetch(`${GM}?f=get_email_address&lang=en&ip=127.0.0.1&agent=${AGENT}`, { headers: { 'User-Agent': AGENT } });
      const initData = await initR.json();
      const sid = initData.sid_token;
      // Set the user
      const setUrl = `${GM}?f=set_email_user&email_user=${encodeURIComponent(user)}&lang=en&sid_token=${encodeURIComponent(sid)}&ip=127.0.0.1&agent=${AGENT}`;
      const r2 = await fetch(setUrl, { headers: { 'User-Agent': AGENT } });
      const data2 = await r2.json();
      return res.json({
        email: data2.email_addr || `${user}@${domain}`,
        sid_token: sid,
        timestamp: data2.email_timestamp || 0,
      });
    }
    url = `${GM}?f=get_email_address&lang=en&ip=127.0.0.1&agent=${AGENT}`;
    const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
    if (!r.ok) throw new Error(`GM ${r.status}`);
    const data = await r.json();
    res.json({ email: data.email_addr, sid_token: data.sid_token, timestamp: data.email_timestamp });
  } catch (err) {
    console.error('gm/generate:', err.message);
    res.status(500).json({ error: 'Failed to generate email.' });
  }
});

// GET /api/gm/check?sid_token=&seq=
app.get('/api/gm/check', async (req, res) => {
  const { sid_token, seq = 0 } = req.query;
  if (!sid_token) return res.status(400).json({ error: 'Missing sid_token' });
  try {
    const url = `${GM}?f=check_email&seq=${seq}&sid_token=${encodeURIComponent(sid_token)}&ip=127.0.0.1&agent=${AGENT}`;
    const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
    const data = await r.json();
    res.json({ list: data.list || [], count: data.count || 0, email: data.email || '' });
  } catch (err) {
    res.status(500).json({ error: 'Inbox check failed.' });
  }
});

// GET /api/gm/email/:id?sid_token=
app.get('/api/gm/email/:id', async (req, res) => {
  const { sid_token } = req.query;
  const { id } = req.params;
  if (!sid_token) return res.status(400).json({ error: 'Missing sid_token' });
  try {
    const url = `${GM}?f=fetch_email&email_id=${id}&sid_token=${encodeURIComponent(sid_token)}&ip=127.0.0.1&agent=${AGENT}`;
    const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
    const data = await r.json();
    res.json({ id: data.mail_id, from: data.mail_from, subject: data.mail_subject, body: data.mail_body, date: data.mail_date });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load email.' });
  }
});

// DELETE /api/gm/email/:id?sid_token=
app.delete('/api/gm/email/:id', async (req, res) => {
  const { sid_token } = req.query;
  const { id } = req.params;
  try {
    const url = `${GM}?f=del_email&email_ids[]=${id}&sid_token=${encodeURIComponent(sid_token)}&ip=127.0.0.1&agent=${AGENT}`;
    await fetch(url, { headers: { 'User-Agent': AGENT } });
    res.json({ deleted: true });
  } catch { res.json({ deleted: false }); }
});

// GET /api/gm/list?sid_token=&offset=
app.get('/api/gm/list', async (req, res) => {
  const { sid_token, offset = 0 } = req.query;
  if (!sid_token) return res.status(400).json({ error: 'Missing sid_token' });
  try {
    const url = `${GM}?f=get_email_list&offset=${offset}&sid_token=${encodeURIComponent(sid_token)}&ip=127.0.0.1&agent=${AGENT}`;
    const r = await fetch(url, { headers: { 'User-Agent': AGENT } });
    const data = await r.json();
    res.json({ list: data.list || [], count: data.count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get list.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  MAIL.TM ROUTES
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/mailtm/domains — fetch all available Mail.tm domains
app.get('/api/mailtm/domains', async (req, res) => {
  try {
    const r = await fetch(`${MAILTM}/domains?page=1`, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    const data = await r.json();
    const domains = (data['hydra:member'] || []).map(d => d.domain);
    res.json({ domains: domains.length ? domains : ['mail.tm'] });
  } catch (err) {
    console.error('mailtm/domains:', err.message);
    res.json({ domains: ['mail.tm'] });
  }
});

// POST /api/mailtm/generate — create account + return token
app.post('/api/mailtm/generate', async (req, res) => {
  const { address, password } = req.body;
  if (!address || !password) return res.status(400).json({ error: 'Missing address or password' });
  try {
    // Create account
    const cr = await fetch(`${MAILTM}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ address, password })
    });
    if (!cr.ok) {
      const e = await cr.json();
      return res.status(400).json({ error: e['hydra:description'] || 'Account creation failed.' });
    }
    const acc = await cr.json();

    // Get token
    const tr = await fetch(`${MAILTM}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ address, password })
    });
    if (!tr.ok) return res.status(400).json({ error: 'Auth failed.' });
    const tok = await tr.json();

    res.json({ email: address, token: tok.token, id: acc.id });
  } catch (err) {
    console.error('mailtm/generate:', err.message);
    res.status(500).json({ error: 'Failed to create mail.tm account.' });
  }
});

// GET /api/mailtm/messages?token=&page=
app.get('/api/mailtm/messages', async (req, res) => {
  const { token, page = 1 } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const r = await fetch(`${MAILTM}/messages?page=${page}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    if (!r.ok) return res.status(401).json({ error: 'Unauthorized' });
    const data = await r.json();
    const list = (data['hydra:member'] || []).map(m => ({
      id: m.id,
      from: m.from?.address || '',
      subject: m.subject || '(No Subject)',
      date: m.createdAt || '',
      seen: m.seen,
    }));
    res.json({ list, total: data['hydra:totalItems'] || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// GET /api/mailtm/message/:id?token=
app.get('/api/mailtm/message/:id', async (req, res) => {
  const { token } = req.query;
  const { id } = req.params;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const r = await fetch(`${MAILTM}/messages/${id}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    if (!r.ok) return res.status(404).json({ error: 'Message not found' });
    const data = await r.json();
    res.json({
      id: data.id,
      from: data.from?.address || '',
      subject: data.subject || '',
      body: data.html?.[0] || data.text || '',
      date: data.createdAt || '',
      isHtml: !!(data.html?.[0]),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch message.' });
  }
});

// DELETE /api/mailtm/message/:id?token=
app.delete('/api/mailtm/message/:id', async (req, res) => {
  const { token } = req.query;
  const { id } = req.params;
  try {
    await fetch(`${MAILTM}/messages/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    res.json({ deleted: true });
  } catch { res.json({ deleted: false }); }
});

// DELETE /api/mailtm/account/:id?token=
app.delete('/api/mailtm/account/:id', async (req, res) => {
  const { token } = req.query;
  const { id } = req.params;
  try {
    await fetch(`${MAILTM}/accounts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    res.json({ deleted: true });
  } catch { res.json({ deleted: false }); }
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🥷 KingBadBoi TempMail v3 → http://localhost:${PORT}`);
});
