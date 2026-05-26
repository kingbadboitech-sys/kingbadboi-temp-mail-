const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fetch   = require('node-fetch');   // v2 CommonJS — no dynamic import needed

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const GM_BASE = 'https://api.guerrillamail.com/ajax.php';
const AGENT   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KingBadBoi/3.1';
const MAILTM  = 'https://api.mail.tm';

// All known Guerrilla Mail domains (GM API sometimes only returns one)
const GM_DOMAINS = [
  'guerrillamailblock.com',
  'grr.la',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'spam4.me'
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const gmHeaders = { 'User-Agent': AGENT, 'Accept': 'application/json' };

async function gmFetch(params) {
  const qs = new URLSearchParams(params).toString();
  const r  = await fetch(`${GM_BASE}?${qs}`, { headers: gmHeaders, timeout: 10000 });
  if (!r.ok) throw new Error(`GM HTTP ${r.status}`);
  return r.json();
}

// ── VISITOR TRACKING ──────────────────────────────────────────────────────────
const visitors = new Set();
let totalVisitors = 0;

app.post('/api/visit', (req, res) => {
  const { deviceId } = req.body || {};
  if (deviceId && !visitors.has(deviceId)) { visitors.add(deviceId); totalVisitors++; }
  res.json({ count: totalVisitors });
});
app.get('/api/visitors', (_req, res) => res.json({ count: totalVisitors }));

// ════════════════════════════════════════════════════════════════════════════════
//  GUERRILLA MAIL
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/gm/domains
app.get('/api/gm/domains', (_req, res) => {
  // Return our hardcoded full list instantly — no round-trip needed
  res.json({ domains: GM_DOMAINS });
});

// GET /api/gm/generate?user=&domain=
// Flow:
//   1. get_email_address  → gives us sid_token + default address
//   2. set_email_user     → sets our chosen username
//   3. The domain is controlled by the `site` param GM supports
app.get('/api/gm/generate', async (req, res) => {
  const { user, domain } = req.query;
  try {
    // Step 1 — fresh session
    const init = await gmFetch({
      f: 'get_email_address', lang: 'en', ip: '127.0.0.1', agent: AGENT
    });
    const sid = init.sid_token;
    if (!sid) throw new Error('No sid_token from GM');

    if (!user) {
      // No custom user requested — return whatever GM gave us
      return res.json({ email: init.email_addr, sid_token: sid, timestamp: init.email_timestamp || 0 });
    }

    // Step 2 — set custom username
    const set = await gmFetch({
      f: 'set_email_user', email_user: user, lang: 'en',
      sid_token: sid, ip: '127.0.0.1', agent: AGENT
    });

    // GM set_email_user returns the new full address in email_addr
    let email = set.email_addr || `${user}@${init.email_alias_error ? GM_DOMAINS[0] : (domain || GM_DOMAINS[0])}`;

    // If domain requested differs from what GM returned, patch it
    // (GM only supports its own domain list but the set call can return the right one)
    if (domain && email && !email.endsWith('@' + domain)) {
      // Reconstruct with requested domain — GM will still deliver it
      const localPart = email.split('@')[0];
      email = `${localPart}@${domain}`;
    }

    res.json({ email, sid_token: sid, timestamp: set.email_timestamp || init.email_timestamp || 0 });
  } catch (err) {
    console.error('gm/generate error:', err.message);
    res.status(500).json({ error: 'Failed to generate email: ' + err.message });
  }
});

// GET /api/gm/check?sid_token=&seq=
app.get('/api/gm/check', async (req, res) => {
  const { sid_token, seq = 0 } = req.query;
  if (!sid_token) return res.status(400).json({ error: 'Missing sid_token' });
  try {
    const data = await gmFetch({ f: 'check_email', seq, sid_token, ip: '127.0.0.1', agent: AGENT });
    res.json({ list: data.list || [], count: data.count || 0, email: data.email || '' });
  } catch (err) {
    res.status(500).json({ error: 'Inbox check failed: ' + err.message });
  }
});

// GET /api/gm/email/:id?sid_token=
app.get('/api/gm/email/:id', async (req, res) => {
  const { sid_token } = req.query;
  const { id } = req.params;
  if (!sid_token) return res.status(400).json({ error: 'Missing sid_token' });
  try {
    const data = await gmFetch({ f: 'fetch_email', email_id: id, sid_token, ip: '127.0.0.1', agent: AGENT });
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
    await gmFetch({ f: 'del_email', 'email_ids[]': id, sid_token, ip: '127.0.0.1', agent: AGENT });
    res.json({ deleted: true });
  } catch { res.json({ deleted: false }); }
});

// ════════════════════════════════════════════════════════════════════════════════
//  MAIL.TM  — proper REST flow
// ════════════════════════════════════════════════════════════════════════════════

const tmHeaders = (token) => ({
  'Content-Type':  'application/json',
  'Accept':        'application/json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
});

// GET /api/mailtm/domains
app.get('/api/mailtm/domains', async (_req, res) => {
  try {
    const r    = await fetch(`${MAILTM}/domains?page=1`, { headers: tmHeaders(), timeout: 10000 });
    const data = await r.json();
    const doms = (data['hydra:member'] || []).filter(d => d.isActive).map(d => d.domain);
    res.json({ domains: doms.length ? doms : ['mail.tm'] });
  } catch (err) {
    console.error('mailtm/domains:', err.message);
    res.json({ domains: ['mail.tm'] });
  }
});

// POST /api/mailtm/generate  { address, password }
// Correct flow: POST /accounts  →  POST /token  →  return { email, token, id }
app.post('/api/mailtm/generate', async (req, res) => {
  const { address, password } = req.body || {};
  if (!address || !password) return res.status(400).json({ error: 'Missing address or password' });

  try {
    // 1. Create account
    const cr = await fetch(`${MAILTM}/accounts`, {
      method:  'POST',
      headers: tmHeaders(),
      body:    JSON.stringify({ address, password }),
      timeout: 12000
    });

    // Handle duplicate / validation errors gracefully
    if (!cr.ok) {
      const errBody = await cr.json().catch(() => ({}));
      const msg = errBody['hydra:description'] || errBody.message || `HTTP ${cr.status}`;
      console.error('mailtm create account failed:', msg);
      return res.status(400).json({ error: msg });
    }

    const acc = await cr.json();

    // 2. Get JWT token
    const tr = await fetch(`${MAILTM}/token`, {
      method:  'POST',
      headers: tmHeaders(),
      body:    JSON.stringify({ address, password }),
      timeout: 12000
    });

    if (!tr.ok) {
      const errBody = await tr.json().catch(() => ({}));
      const msg = errBody['hydra:description'] || errBody.message || `Auth HTTP ${tr.status}`;
      console.error('mailtm token failed:', msg);
      return res.status(400).json({ error: 'Authentication failed: ' + msg });
    }

    const tok = await tr.json();
    if (!tok.token) return res.status(500).json({ error: 'No token returned from Mail.tm' });

    console.log(`✅ Mail.tm account created: ${address}`);
    res.json({ email: acc.address || address, token: tok.token, id: acc.id });

  } catch (err) {
    console.error('mailtm/generate exception:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/mailtm/messages?token=&page=
app.get('/api/mailtm/messages', async (req, res) => {
  const { token, page = 1 } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const r = await fetch(`${MAILTM}/messages?page=${page}`, { headers: tmHeaders(token), timeout: 10000 });
    if (r.status === 401) return res.status(401).json({ error: 'Token expired or invalid' });
    if (!r.ok) return res.status(r.status).json({ error: `Mail.tm error ${r.status}` });
    const data = await r.json();
    const list = (data['hydra:member'] || []).map(m => ({
      id:      m.id,
      from:    m.from?.address || m.from?.name || 'Unknown',
      subject: m.subject || '(No Subject)',
      date:    m.createdAt || '',
      seen:    m.seen || false,
    }));
    res.json({ list, total: data['hydra:totalItems'] || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages: ' + err.message });
  }
});

// GET /api/mailtm/message/:id?token=
app.get('/api/mailtm/message/:id', async (req, res) => {
  const { token } = req.query;
  const { id }    = req.params;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const r = await fetch(`${MAILTM}/messages/${encodeURIComponent(id)}`, {
      headers: tmHeaders(token), timeout: 10000
    });
    if (!r.ok) return res.status(r.status).json({ error: 'Message not found' });
    const data = await r.json();
    // html is an array in Mail.tm response
    const htmlBody = Array.isArray(data.html) ? data.html[0] : (data.html || '');
    const textBody = data.text || '';
    res.json({
      id:      data.id,
      from:    data.from?.address || data.from?.name || '',
      subject: data.subject || '',
      body:    htmlBody || textBody,
      date:    data.createdAt || '',
      isHtml:  !!htmlBody,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch message: ' + err.message });
  }
});

// DELETE /api/mailtm/message/:id?token=
app.delete('/api/mailtm/message/:id', async (req, res) => {
  const { token } = req.query;
  const { id }    = req.params;
  try {
    await fetch(`${MAILTM}/messages/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: tmHeaders(token), timeout: 8000
    });
    res.json({ deleted: true });
  } catch { res.json({ deleted: false }); }
});

// DELETE /api/mailtm/account/:id?token=
app.delete('/api/mailtm/account/:id', async (req, res) => {
  const { token } = req.query;
  const { id }    = req.params;
  try {
    await fetch(`${MAILTM}/accounts/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: tmHeaders(token), timeout: 8000
    });
    res.json({ deleted: true });
  } catch { res.json({ deleted: false }); }
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🥷 KingBadBoi TempMail v3.1 → http://localhost:${PORT}`);
});
