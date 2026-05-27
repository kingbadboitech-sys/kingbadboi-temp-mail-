const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fetch   = require('node-fetch'); // v2 — CommonJS, no dynamic import

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const GM_BASE = 'https://api.guerrillamail.com/ajax.php';
const AGENT   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0';
const MAILTM  = 'https://api.mail.tm';

// Full Guerrilla Mail domain list — all verified working
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
const gmHdr = { 'User-Agent': AGENT, 'Accept': 'application/json' };

async function gmFetch(params) {
  const qs = new URLSearchParams(params).toString();
  const r  = await fetch(`${GM_BASE}?${qs}`, { headers: gmHdr });
  if (!r.ok) throw new Error(`GM HTTP ${r.status}`);
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { throw new Error('GM returned invalid JSON: ' + text.slice(0, 120)); }
}

function tmHdr(token) {
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
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

// GET /api/gm/domains — return full hardcoded list instantly (no round-trip lag)
app.get('/api/gm/domains', (_req, res) => {
  res.json({ domains: GM_DOMAINS });
});

// GET /api/gm/generate?user=LOCALPART&domain=DOMAIN
// Flow: get_email_address (fresh session) → set_email_user (set localpart)
app.get('/api/gm/generate', async (req, res) => {
  const { user, domain } = req.query;
  try {
    // Step 1 — get fresh session + sid_token
    const init = await gmFetch({ f: 'get_email_address', lang: 'en', ip: '127.0.0.1', agent: AGENT });
    const sid  = init.sid_token;
    if (!sid) throw new Error('No sid_token returned from Guerrilla Mail');

    if (!user) {
      // No custom user — just return whatever GM assigned
      return res.json({
        email:     init.email_addr,
        sid_token: sid,
        timestamp: init.email_timestamp || 0
      });
    }

    // Step 2 — set the username we want
    const setData = await gmFetch({
      f: 'set_email_user', email_user: user,
      lang: 'en', sid_token: sid, ip: '127.0.0.1', agent: AGENT
    });

    // GM returns the full address after set_email_user
    let email = setData.email_addr || init.email_addr || '';

    // If caller asked for a specific domain and GM returned a different one,
    // swap the domain portion (the sid_token + user is what matters for delivery)
    if (domain && email && !email.toLowerCase().endsWith('@' + domain.toLowerCase())) {
      const local = email.split('@')[0];
      email = `${local}@${domain}`;
    }

    return res.json({
      email,
      sid_token: sid,
      timestamp: setData.email_timestamp || init.email_timestamp || 0
    });

  } catch (err) {
    console.error('[GM generate]', err.message);
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
    console.error('[GM check]', err.message);
    res.status(500).json({ error: 'Inbox check failed: ' + err.message });
  }
});

// GET /api/gm/email/:id?sid_token=
app.get('/api/gm/email/:id', async (req, res) => {
  const { sid_token } = req.query;
  const { id }        = req.params;
  if (!sid_token) return res.status(400).json({ error: 'Missing sid_token' });
  try {
    const data = await gmFetch({ f: 'fetch_email', email_id: id, sid_token, ip: '127.0.0.1', agent: AGENT });
    res.json({
      id:      data.mail_id,
      from:    data.mail_from    || '',
      subject: data.mail_subject || '(No Subject)',
      body:    data.mail_body    || '',
      date:    data.mail_date    || ''
    });
  } catch (err) {
    console.error('[GM fetch email]', err.message);
    res.status(500).json({ error: 'Failed to load email.' });
  }
});

// DELETE /api/gm/email/:id?sid_token=
app.delete('/api/gm/email/:id', async (req, res) => {
  const { sid_token } = req.query;
  const { id }        = req.params;
  try {
    await gmFetch({ f: 'del_email', 'email_ids[]': id, sid_token, ip: '127.0.0.1', agent: AGENT });
    res.json({ deleted: true });
  } catch { res.json({ deleted: false }); }
});

// ════════════════════════════════════════════════════════════════════════════════
//  MAIL.TM
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/mailtm/domains — fetch live from Mail.tm
app.get('/api/mailtm/domains', async (_req, res) => {
  try {
    const r    = await fetch(`${MAILTM}/domains?page=1`, { headers: tmHdr() });
    const data = await r.json();
    const doms = (data['hydra:member'] || [])
      .filter(d => d.isActive !== false)
      .map(d => d.domain);
    res.json({ domains: doms.length ? doms : ['mail.tm'] });
  } catch (err) {
    console.error('[TM domains]', err.message);
    res.json({ domains: ['mail.tm'] });
  }
});

// POST /api/mailtm/generate  body: { address, password }
app.post('/api/mailtm/generate', async (req, res) => {
  const { address, password } = req.body || {};
  if (!address || !password) return res.status(400).json({ error: 'Missing address or password' });

  try {
    // 1. Create account
    const cr = await fetch(`${MAILTM}/accounts`, {
      method:  'POST',
      headers: tmHdr(),
      body:    JSON.stringify({ address, password })
    });
    const crBody = await cr.json();

    if (!cr.ok) {
      const msg = crBody['hydra:description'] || crBody.detail || crBody.message || `HTTP ${cr.status}`;
      console.error('[TM create]', msg);
      return res.status(400).json({ error: msg });
    }

    // 2. Authenticate — get JWT
    const tr = await fetch(`${MAILTM}/token`, {
      method:  'POST',
      headers: tmHdr(),
      body:    JSON.stringify({ address, password })
    });
    const trBody = await tr.json();

    if (!tr.ok || !trBody.token) {
      const msg = trBody['hydra:description'] || trBody.message || `Auth HTTP ${tr.status}`;
      console.error('[TM token]', msg);
      return res.status(400).json({ error: 'Auth failed: ' + msg });
    }

    console.log('[TM] Account ready:', address);
    res.json({ email: crBody.address || address, token: trBody.token, id: crBody.id });

  } catch (err) {
    console.error('[TM generate]', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/mailtm/messages?token=&page=
app.get('/api/mailtm/messages', async (req, res) => {
  const { token, page = 1 } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const r = await fetch(`${MAILTM}/messages?page=${page}`, { headers: tmHdr(token) });
    if (r.status === 401) return res.status(401).json({ error: 'Token expired' });
    if (!r.ok)            return res.status(r.status).json({ error: `TM error ${r.status}` });
    const data = await r.json();
    const list = (data['hydra:member'] || []).map(m => ({
      id:      m.id,
      from:    m.from?.address || m.from?.name || 'Unknown',
      subject: m.subject || '(No Subject)',
      date:    m.createdAt || '',
      seen:    m.seen || false
    }));
    res.json({ list, total: data['hydra:totalItems'] || 0 });
  } catch (err) {
    console.error('[TM messages]', err.message);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// GET /api/mailtm/message/:id?token=
app.get('/api/mailtm/message/:id', async (req, res) => {
  const { token } = req.query;
  const { id }    = req.params;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const r = await fetch(`${MAILTM}/messages/${id}`, { headers: tmHdr(token) });
    if (!r.ok) return res.status(r.status).json({ error: 'Message not found' });
    const data   = await r.json();
    const htmlBody = Array.isArray(data.html) ? (data.html[0] || '') : (data.html || '');
    res.json({
      id:      data.id,
      from:    data.from?.address || data.from?.name || '',
      subject: data.subject || '',
      body:    htmlBody || data.text || '',
      date:    data.createdAt || '',
      isHtml:  !!htmlBody
    });
  } catch (err) {
    console.error('[TM message]', err.message);
    res.status(500).json({ error: 'Failed to fetch message.' });
  }
});

// DELETE /api/mailtm/message/:id?token=
app.delete('/api/mailtm/message/:id', async (req, res) => {
  const { token } = req.query;
  const { id }    = req.params;
  try {
    await fetch(`${MAILTM}/messages/${id}`, { method: 'DELETE', headers: tmHdr(token) });
    res.json({ deleted: true });
  } catch { res.json({ deleted: false }); }
});

// DELETE /api/mailtm/account/:id?token=
app.delete('/api/mailtm/account/:id', async (req, res) => {
  const { token } = req.query;
  const { id }    = req.params;
  try {
    await fetch(`${MAILTM}/accounts/${id}`, { method: 'DELETE', headers: tmHdr(token) });
    res.json({ deleted: true });
  } catch { res.json({ deleted: false }); }
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🥷 KingBadBoi TempMail v3.1 → http://localhost:${PORT}`));
