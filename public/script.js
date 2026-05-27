/* ═══════════════════════════════════════════════════════════════
   KingBadBoi TempMail v3.1 · script.js
   • Guerrilla Mail — all 8 domains, random per generate
   • Mail.tm — live domains, correct API flow
   • US-only first/last names, new name every generate
   • No layout thrash, minimal repaints
═══════════════════════════════════════════════════════════════ */

// ── US NAME BANKS (male + female, common US names only) ──────────
const MALE_FIRST = [
  'James','John','Robert','Michael','William','David','Richard','Joseph',
  'Thomas','Charles','Christopher','Daniel','Matthew','Anthony','Mark',
  'Donald','Steven','Paul','Andrew','Kenneth','Joshua','Kevin','Brian',
  'George','Timothy','Ronald','Edward','Jason','Jeffrey','Ryan',
  'Jacob','Gary','Nicholas','Eric','Jonathan','Stephen','Larry','Justin',
  'Scott','Brandon','Benjamin','Samuel','Raymond','Gregory','Frank',
  'Alexander','Patrick','Jack','Dennis','Jerry','Tyler','Aaron','Henry',
  'Douglas','Jose','Adam','Peter','Nathan','Zachary','Walter','Kyle',
  'Harold','Carl','Jeremy','Keith','Roger','Gerald','Ethan','Arthur',
  'Terry','Christian','Sean','Lawrence','Austin','Joe','Noah','Jesse',
  'Albert','Bryan','Billy','Bruce','Willie','Jordan','Dylan','Alan',
  'Ralph','Gabriel','Roy','Juan','Wayne','Eugene','Logan','Randy',
  'Louis','Russell','Vincent','Philip','Bobby','Johnny','Bradley','Travis'
];

const FEMALE_FIRST = [
  'Mary','Patricia','Jennifer','Linda','Barbara','Elizabeth','Susan','Jessica',
  'Sarah','Karen','Lisa','Nancy','Betty','Margaret','Sandra','Ashley',
  'Dorothy','Kimberly','Emily','Donna','Michelle','Carol','Amanda','Melissa',
  'Deborah','Stephanie','Rebecca','Sharon','Laura','Cynthia','Kathleen','Amy',
  'Angela','Shirley','Anna','Brenda','Pamela','Emma','Nicole','Helen',
  'Samantha','Katherine','Christine','Debra','Rachel','Carolyn','Janet','Catherine',
  'Maria','Heather','Diane','Julie','Joyce','Victoria','Kelly','Christina',
  'Lauren','Joan','Evelyn','Olivia','Judith','Megan','Cheryl','Martha',
  'Andrea','Frances','Hannah','Jacqueline','Ann','Gloria','Jean','Kathryn',
  'Alice','Teresa','Sara','Janice','Doris','Madison','Julia','Grace',
  'Judy','Abigail','Marie','Denise','Beverly','Amber','Danielle','Marilyn',
  'Rose','Brittany','Diana','Natalie','Sophia','Charlotte','Alexis','Tiffany'
];

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
  'Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson',
  'Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson',
  'White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen',
  'Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera',
  'Campbell','Mitchell','Carter','Roberts','Phillips','Evans','Turner',
  'Torres','Parker','Collins','Edwards','Stewart','Flores','Morris',
  'Murphy','Cook','Rogers','Morgan','Peterson','Cooper','Reed','Bailey',
  'Bell','Gomez','Kelly','Howard','Ward','Cox','Diaz','Richardson',
  'Wood','Watson','Brooks','Bennett','Gray','James','Reyes','Cruz',
  'Hughes','Price','Myers','Long','Foster','Sanders','Ross','Morales',
  'Powell','Sullivan','Russell','Ortiz','Jenkins','Gutierrez','Perry','Butler',
  'Barnes','Fisher','Henderson','Coleman','Simmons','Patterson','Jordan','Reynolds'
];

// Separators and number patterns that look natural in email addresses
const SEPS  = ['.', '_', ''];
const NUMFN = [
  () => '',
  () => String(Math.floor(Math.random() * 99) + 1),
  () => String(Math.floor(Math.random() * 999) + 1),
  () => String(new Date().getFullYear() - Math.floor(Math.random() * 30 + 18)).slice(2)
];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomName() {
  const isMale = Math.random() < 0.5;
  const first  = isMale ? pickRandom(MALE_FIRST) : pickRandom(FEMALE_FIRST);
  const last   = pickRandom(LAST_NAMES);
  return { first, last };
}

// Build a natural-looking email local part from first/last name
function buildLocalPart(first, last) {
  const f   = first.toLowerCase().replace(/[^a-z]/g, '');
  const l   = last.toLowerCase().replace(/[^a-z]/g, '');
  const sep = pickRandom(SEPS);
  const num = pickRandom(NUMFN)();

  // Several patterns that look like real people's emails
  const patterns = [
    () => f + sep + l + num,
    () => f.charAt(0) + sep + l + num,
    () => f + sep + l.charAt(0) + l.slice(1) + num,
    () => l + sep + f.charAt(0) + num,
    () => f + num,
    () => f + sep + l,
  ];
  return pickRandom(patterns)().slice(0, 40); // GM has username length limits
}

// ── PAGE SWITCH ──────────────────────────────────────────────────
function switchPage(p) {
  document.getElementById('pageGM').classList.toggle('active', p === 'gm');
  document.getElementById('pageTM').classList.toggle('active', p === 'tm');
  document.getElementById('tabGM').classList.toggle('active', p === 'gm');
  document.getElementById('tabTM').classList.toggle('active', p === 'tm');
  document.getElementById('tabTM').classList.toggle('tm', p === 'tm');
}

// ── PARTICLES (lightweight — 40 pts, requestAnimationFrame) ──────
function initParticles() {
  const cv = document.getElementById('particles');
  const cx = cv.getContext('2d');
  let W = cv.width = innerWidth, H = cv.height = innerHeight;

  const COLORS = ['#ff1f3d','#00ffe0','#ffd700','#a855f7'];
  const pts = Array.from({ length: 40 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
    r: Math.random() * 1.3 + .3,
    a: Math.random() * .28 + .06,
    c: COLORS[Math.floor(Math.random() * COLORS.length)]
  }));

  let raf;
  function draw() {
    cx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;
      cx.globalAlpha = p.a;
      cx.fillStyle   = p.c;
      cx.beginPath();
      cx.arc(p.x, p.y, p.r, 0, 6.2832);
      cx.fill();
    }
    cx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }
  draw();

  // Pause particles when tab hidden (saves CPU)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else draw();
  });

  addEventListener('resize', () => {
    W = cv.width = innerWidth;
    H = cv.height = innerHeight;
  });
}

// ── TOAST ────────────────────────────────────────────────────────
let _toastT;
function toast(msg, dur = 2800) {
  document.querySelector('.toast')?.remove();
  clearTimeout(_toastT);
  const t = document.createElement('div');
  t.className   = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  _toastT = setTimeout(() => t.remove(), dur);
}

// ── HELPERS ──────────────────────────────────────────────────────
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function deviceId() {
  let id = localStorage.getItem('kbb_did');
  if (!id) { id = 'kbb_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('kbb_did', id); }
  return id;
}

// ── VISITOR COUNT ────────────────────────────────────────────────
async function registerVisitor() {
  try {
    const r = await fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: deviceId() })
    });
    const d = await r.json();
    document.getElementById('visitorCount').textContent = d.count.toLocaleString();
  } catch {}
}

// ── FOLLOW GATE ──────────────────────────────────────────────────
function initGate() {
  const gate = document.getElementById('followGate');
  const app  = document.getElementById('app');
  if (localStorage.getItem('kbb_unlocked') === '1') {
    gate.style.display = 'none';
    app.classList.remove('hidden');
    registerVisitor();
    return;
  }
  document.getElementById('followBtn').addEventListener('click', () => {
    localStorage.setItem('kbb_tapped', '1');
  });
  document.getElementById('unlockBtn').addEventListener('click', () => {
    if (!localStorage.getItem('kbb_tapped')) {
      toast('⚠ Please tap JOIN WHATSAPP CHANNEL first!'); return;
    }
    localStorage.setItem('kbb_unlocked', '1');
    gate.style.display = 'none';
    app.classList.remove('hidden');
    registerVisitor();
  });
}

// ── DOMAIN CHIPS BUILDER ─────────────────────────────────────────
function buildChips(chipId, selectId, domains, onSelect) {
  const sel  = document.getElementById(selectId);
  const wrap = document.getElementById(chipId);

  sel.innerHTML  = domains.map(d => `<option value="${d}">${d}</option>`).join('');
  wrap.innerHTML = domains.map(d =>
    `<span class="domain-chip" data-d="${d}" onclick="selectChip('${chipId}','${selectId}','${d}',null)">${d}</span>`
  ).join('');

  // Mark first active
  const first = wrap.querySelector('.domain-chip');
  if (first) first.classList.add('active-chip');
}

function selectChip(chipId, selectId, domain, _cb) {
  document.getElementById(selectId).value = domain;
  document.querySelectorAll(`#${chipId} .domain-chip`).forEach(c => {
    c.classList.toggle('active-chip', c.dataset.d === domain);
  });
}

function gmOnDomainChange(v) { selectChip('gmChips', 'gmDomain', v, null); }
function tmOnDomainChange(v) { selectChip('tmChips', 'tmDomain', v, null); }

// ── SHARED VIEWER ────────────────────────────────────────────────
let _viewerDelFn = null;

function openViewer(from, subject, date, body, isHtml, delFn) {
  _viewerDelFn = delFn;

  document.getElementById('vMeta').innerHTML = `
    <div class="vm-from">FROM: ${esc(from)}</div>
    <div class="vm-sub">${esc(subject)}</div>
    <div class="vm-date">${esc(date)}</div>`;

  const vBody = document.getElementById('vBody');
  vBody.innerHTML = '';

  if (isHtml && body) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;border:none;min-height:300px;background:#fff;display:block';
    iframe.sandbox = 'allow-same-origin';
    vBody.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(body);
    iframe.contentDocument.close();
    setTimeout(() => {
      try { iframe.style.height = iframe.contentDocument.body.scrollHeight + 28 + 'px'; } catch {}
    }, 350);
  } else {
    vBody.innerHTML = `<pre style="white-space:pre-wrap;font-family:var(--ff-mono);font-size:13px;color:var(--txt)">${esc(body || '(empty)')}</pre>`;
  }

  document.getElementById('vFoot').innerHTML =
    `<button class="btn-del-email" onclick="_viewerDelFn&&_viewerDelFn()">🗑 DELETE THIS EMAIL</button>`;

  document.getElementById('viewerOverlay').style.display = 'flex';
}

function closeViewer() {
  document.getElementById('viewerOverlay').style.display = 'none';
}

// ════════════════════════════════════════════════════════════════
//  GUERRILLA MAIL ENGINE
// ════════════════════════════════════════════════════════════════
const GM = {
  email: null, sid: null, mails: [], seq: 0,
  pollTmr: null, cntTmr: null, secsLeft: 3600, polling: false
};

// All 8 GM domains hardcoded — no round-trip needed
const GM_DOMAINS = [
  'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
  'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net',
  'guerrillamail.org', 'spam4.me'
];

function gmInit() {
  buildChips('gmChips', 'gmDomain', GM_DOMAINS, null);
  gmSetNewName(); // prefill a random name
}

function gmSetNewName() {
  const n = randomName();
  document.getElementById('gmFirst').value = n.first;
  document.getElementById('gmLast').value  = n.last;
  return n;
}

async function gmGenerate() {
  // Always assign a fresh random name on each generate
  const n      = gmSetNewName();
  const domain = document.getElementById('gmDomain').value || GM_DOMAINS[Math.floor(Math.random() * GM_DOMAINS.length)];
  const local  = buildLocalPart(n.first, n.last);

  const btn = document.getElementById('gmGenBtn');
  btn.innerHTML = '<span class="spin"></span> GENERATING…';
  btn.disabled  = true;

  gmStop();
  GM.mails = []; GM.seq = 0;
  gmRender([]);
  document.getElementById('gmInbox').style.display  = 'none';
  document.getElementById('gmBanner').style.display = 'none';

  try {
    const url = `/api/gm/generate?user=${encodeURIComponent(local)}&domain=${encodeURIComponent(domain)}`;
    const r   = await fetch(url);
    const d   = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || `HTTP ${r.status}`);

    GM.email = d.email;
    GM.sid   = d.sid_token;
    GM.seq   = 0;

    document.getElementById('gmAddr').textContent      = GM.email;
    document.getElementById('gmCopyBtn').style.display = 'flex';
    document.getElementById('gmCheckBtn').disabled     = false;
    document.getElementById('gmInboxTag').textContent  = GM.email;
    document.getElementById('gmInbox').style.display   = 'block';

    gmStartCountdown();
    gmStartPoll();
    toast(`✅ Email ready — ${n.first} ${n.last}`);
  } catch (err) {
    document.getElementById('gmAddr').innerHTML = '<span class="addr-placeholder">⚠ Failed — try again</span>';
    toast('❌ ' + (err.message || 'Generation failed'));
  }

  btn.innerHTML = '<span>⚡</span> GENERATE EMAIL';
  btn.disabled  = false;
}

function gmStartCountdown() {
  clearInterval(GM.cntTmr);
  GM.secsLeft = 3600;
  document.getElementById('gmFooter').style.display = 'flex';
  GM.cntTmr = setInterval(() => {
    const m = String(Math.floor(GM.secsLeft / 60)).padStart(2, '0');
    const s = String(GM.secsLeft % 60).padStart(2, '0');
    document.getElementById('gmTimer').textContent = `${m}:${s}`;
    if (GM.secsLeft <= 0) { clearInterval(GM.cntTmr); gmStop(); toast('⏰ Session expired. Generate a new email.'); }
    GM.secsLeft--;
  }, 1000);
}

function gmStartPoll() {
  if (GM.polling) return;
  GM.polling = true;
  gmSetPollUI(true);
  gmPoll(); // immediate first check
  GM.pollTmr = setInterval(gmPoll, 5000);
}

function gmStop() {
  clearInterval(GM.pollTmr); GM.pollTmr = null;
  GM.polling = false; gmSetPollUI(false);
}

function gmSetPollUI(on) {
  document.getElementById('gmPollDot').classList.toggle('active', on);
  document.getElementById('gmPollLbl').textContent = on ? 'Auto-refresh: ON (5s)' : 'Auto-refresh: OFF';
}

async function gmPoll() {
  if (!GM.sid) return;
  try {
    const r = await fetch(`/api/gm/check?sid_token=${encodeURIComponent(GM.sid)}&seq=${GM.seq}`);
    if (!r.ok) return;
    const d = await r.json();
    if (!d.list || !d.list.length) return;

    let hasNew = false;
    for (const m of d.list) {
      const id = String(m.mail_id);
      if (GM.mails.find(x => x.id === id)) continue;
      GM.mails.unshift({ id, from: m.mail_from || 'Unknown', subject: m.mail_subject || '(No Subject)', date: m.mail_date || '', read: false });
      if (parseInt(id) > GM.seq) GM.seq = parseInt(id);
      hasNew = true;
    }
    if (hasNew) { gmRender(GM.mails); gmBanner('gm'); }
  } catch {}
}

async function gmManualCheck() {
  if (!GM.sid) return;
  const btn = document.getElementById('gmCheckBtn');
  btn.innerHTML = '<span class="spin"></span> SCANNING…'; btn.disabled = true;
  await gmPoll();
  btn.innerHTML = '<span>📬</span> CHECK INBOX'; btn.disabled = false;
  document.getElementById('gmInbox').scrollIntoView({ behavior: 'smooth' });
}

async function gmRefresh() {
  const btn = document.querySelector('#gmInbox .btn-refresh');
  if (btn) { btn.textContent = '↻ SCANNING…'; btn.disabled = true; }
  await gmPoll();
  if (btn) { btn.textContent = '↻ REFRESH'; btn.disabled = false; }
}

function gmRender(mails) {
  const el = document.getElementById('gmList');
  if (!mails.length) {
    el.innerHTML = `<div class="inbox-empty"><div class="empty-icon">🥷</div><p>Inbox in stealth mode…<br><span>Auto-scanning every 5 seconds</span></p></div>`;
    return;
  }
  el.innerHTML = mails.map(m => `
    <div class="inbox-item ${m.read ? '' : 'unread'}" onclick="gmOpen('${m.id}')">
      <div class="inbox-item-icon">${m.read ? '📧' : '📩'}</div>
      <div class="i-info">
        <div class="i-from">${esc(m.from)}</div>
        <div class="i-subject">${esc(m.subject)}</div>
      </div>
      <div class="i-date">${esc(m.date)}</div>
      <button class="i-del" onclick="event.stopPropagation();gmDel('${m.id}')" title="Delete">🗑</button>
    </div>`).join('');
}

async function gmOpen(id) {
  const m = GM.mails.find(x => x.id === id);
  if (m) { m.read = true; gmRender(GM.mails); }

  document.getElementById('vMeta').innerHTML = '<span style="color:var(--dim);font-family:var(--ff-mono)">Loading…</span>';
  document.getElementById('vBody').innerHTML = '';
  document.getElementById('vFoot').innerHTML = '';
  document.getElementById('viewerOverlay').style.display = 'flex';

  try {
    const r = await fetch(`/api/gm/email/${id}?sid_token=${encodeURIComponent(GM.sid)}`);
    if (!r.ok) throw new Error('not ok');
    const d = await r.json();
    const isHtml = /<[a-z][\s\S]*>/i.test(d.body || '');
    openViewer(d.from, d.subject, d.date, d.body, isHtml, () => gmDel(id, true));
  } catch {
    document.getElementById('vBody').innerHTML = '<p style="color:var(--dim)">Could not load email.</p>';
  }
}

async function gmDel(id, closeV = false) {
  GM.mails = GM.mails.filter(m => m.id !== id);
  gmRender(GM.mails);
  if (closeV) closeViewer();
  try { await fetch(`/api/gm/email/${id}?sid_token=${encodeURIComponent(GM.sid)}`, { method: 'DELETE' }); } catch {}
  toast('🗑 Email deleted');
}

function gmCopy() {
  if (!GM.email) return;
  navigator.clipboard.writeText(GM.email).then(() => {
    const b = document.getElementById('gmCopyBtn');
    b.textContent = '✅ COPIED'; b.classList.add('copied');
    setTimeout(() => { b.textContent = '⧉ COPY'; b.classList.remove('copied'); }, 2000);
    toast('📋 Copied to clipboard!');
  });
}

// ════════════════════════════════════════════════════════════════
//  MAIL.TM ENGINE
// ════════════════════════════════════════════════════════════════
const TM = {
  email: null, token: null, id: null,
  mails: [], seenIds: new Set(),
  pollTmr: null, polling: false
};

async function tmInit() {
  try {
    const r = await fetch('/api/mailtm/domains');
    const d = await r.json();
    buildChips('tmChips', 'tmDomain', d.domains, null);
  } catch {
    buildChips('tmChips', 'tmDomain', ['mail.tm'], null);
  }
  tmSetNewName();
}

function tmSetNewName() {
  const n = randomName();
  document.getElementById('tmFirst').value = n.first;
  document.getElementById('tmLast').value  = n.last;
  return n;
}

async function tmGenerate() {
  const n      = tmSetNewName(); // fresh name every time
  const domain = document.getElementById('tmDomain').value;
  if (!domain) { toast('⚠ No domain selected'); return; }

  const local    = buildLocalPart(n.first, n.last);
  const address  = `${local}@${domain}`;
  // Strong enough password for Mail.tm (min 8 chars, mixed)
  const password = 'Kx' + Math.random().toString(36).slice(2, 9) + 'Z9!';

  const btn = document.getElementById('tmGenBtn');
  btn.innerHTML = '<span class="spin"></span> CREATING…'; btn.disabled = true;

  tmStop();
  TM.mails = []; TM.seenIds = new Set();
  tmRender([]);
  document.getElementById('tmInbox').style.display  = 'none';
  document.getElementById('tmBanner').style.display = 'none';

  try {
    const r = await fetch('/api/mailtm/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ address, password })
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || `HTTP ${r.status}`);

    TM.email = d.email;
    TM.token = d.token;
    TM.id    = d.id;

    document.getElementById('tmAddr').textContent      = TM.email;
    document.getElementById('tmCopyBtn').style.display = 'flex';
    document.getElementById('tmCheckBtn').disabled     = false;
    document.getElementById('tmInboxTag').textContent  = TM.email;
    document.getElementById('tmFooter').style.display  = 'flex';
    document.getElementById('tmPassNote').style.display = 'block';
    document.getElementById('tmInbox').style.display   = 'block';

    tmStartPoll();
    toast(`✅ Mailbox ready — ${n.first} ${n.last}`);
  } catch (err) {
    document.getElementById('tmAddr').innerHTML = '<span class="addr-placeholder">⚠ Failed — try again</span>';
    toast('❌ ' + (err.message || 'Creation failed'));
  }

  btn.innerHTML = '<span>🌐</span> CREATE MAILBOX'; btn.disabled = false;
}

function tmStartPoll() {
  if (TM.polling) return;
  TM.polling = true; tmSetPollUI(true);
  tmPoll();
  TM.pollTmr = setInterval(tmPoll, 6000);
}

function tmStop() {
  clearInterval(TM.pollTmr); TM.pollTmr = null;
  TM.polling = false; tmSetPollUI(false);
}

function tmSetPollUI(on) {
  document.getElementById('tmPollDot').classList.toggle('active', on);
  document.getElementById('tmPollLbl').textContent = on ? 'Auto-refresh: ON (6s)' : 'Auto-refresh: OFF';
}

async function tmPoll() {
  if (!TM.token) return;
  try {
    const r = await fetch(`/api/mailtm/messages?token=${encodeURIComponent(TM.token)}`);
    if (r.status === 401) { tmStop(); toast('⚠ Session expired. Create a new mailbox.'); return; }
    if (!r.ok) return;
    const d = await r.json();

    let hasNew = false;
    for (const m of (d.list || [])) {
      if (TM.seenIds.has(m.id)) continue;
      TM.seenIds.add(m.id);
      TM.mails.unshift({ id: m.id, from: m.from, subject: m.subject, date: m.date, read: m.seen });
      hasNew = true;
    }
    // Refresh read state for existing
    for (const m of (d.list || [])) {
      const local = TM.mails.find(x => x.id === m.id);
      if (local && m.seen) local.read = true;
    }
    if (hasNew) { tmRender(TM.mails); gmBanner('tm'); }
    else if (d.list) tmRender(TM.mails);
  } catch {}
}

async function tmManualCheck() {
  if (!TM.token) return;
  const btn = document.getElementById('tmCheckBtn');
  btn.innerHTML = '<span class="spin"></span> SCANNING…'; btn.disabled = true;
  await tmPoll();
  btn.innerHTML = '<span>📬</span> CHECK INBOX'; btn.disabled = false;
  document.getElementById('tmInbox').scrollIntoView({ behavior: 'smooth' });
}

async function tmRefresh() {
  const btn = document.querySelector('#tmInbox .btn-refresh');
  if (btn) { btn.textContent = '↻ SCANNING…'; btn.disabled = true; }
  await tmPoll();
  if (btn) { btn.textContent = '↻ REFRESH'; btn.disabled = false; }
}

function tmRender(mails) {
  const el = document.getElementById('tmList');
  if (!mails.length) {
    el.innerHTML = `<div class="inbox-empty"><div class="empty-icon">👻</div><p>Ghost inbox active…<br><span>Auto-scanning every 6 seconds</span></p></div>`;
    return;
  }
  el.innerHTML = mails.map(m => {
    const dt = m.date ? m.date.slice(0, 16).replace('T', ' ') : '';
    return `
    <div class="inbox-item ${m.read ? '' : 'unread'}" onclick="tmOpen('${m.id}')">
      <div class="inbox-item-icon">${m.read ? '📧' : '📩'}</div>
      <div class="i-info">
        <div class="i-from">${esc(m.from)}</div>
        <div class="i-subject">${esc(m.subject)}</div>
      </div>
      <div class="i-date">${esc(dt)}</div>
      <button class="i-del" onclick="event.stopPropagation();tmDel('${m.id}')" title="Delete">🗑</button>
    </div>`;
  }).join('');
}

async function tmOpen(id) {
  const m = TM.mails.find(x => x.id === id);
  if (m) { m.read = true; tmRender(TM.mails); }

  document.getElementById('vMeta').innerHTML = '<span style="color:var(--dim);font-family:var(--ff-mono)">Loading…</span>';
  document.getElementById('vBody').innerHTML = '';
  document.getElementById('vFoot').innerHTML = '';
  document.getElementById('viewerOverlay').style.display = 'flex';

  try {
    const r = await fetch(`/api/mailtm/message/${id}?token=${encodeURIComponent(TM.token)}`);
    if (!r.ok) throw new Error('not ok');
    const d = await r.json();
    openViewer(d.from, d.subject, d.date ? d.date.slice(0, 16).replace('T', ' ') : '', d.body, d.isHtml, () => tmDel(id, true));
  } catch {
    document.getElementById('vBody').innerHTML = '<p style="color:var(--dim)">Could not load email.</p>';
  }
}

async function tmDel(id, closeV = false) {
  TM.mails    = TM.mails.filter(m => m.id !== id);
  TM.seenIds.delete(id);
  tmRender(TM.mails);
  if (closeV) closeViewer();
  try { await fetch(`/api/mailtm/message/${id}?token=${encodeURIComponent(TM.token)}`, { method: 'DELETE' }); } catch {}
  toast('🗑 Email deleted');
}

function tmCopy() {
  if (!TM.email) return;
  navigator.clipboard.writeText(TM.email).then(() => {
    const b = document.getElementById('tmCopyBtn');
    b.textContent = '✅ COPIED'; b.classList.add('copied');
    setTimeout(() => { b.textContent = '⧉ COPY'; b.classList.remove('copied'); }, 2000);
    toast('📋 Copied to clipboard!');
  });
}

// ── SHARED NEW MAIL BANNER ────────────────────────────────────────
let _bannerT = {};
function gmBanner(engine) {
  const id = engine === 'gm' ? 'gmBanner' : 'tmBanner';
  const el = document.getElementById(id);
  el.style.display = 'block';
  clearTimeout(_bannerT[engine]);
  _bannerT[engine] = setTimeout(() => { el.style.display = 'none'; }, 4500);
  const section = document.getElementById(engine === 'gm' ? 'gmInbox' : 'tmInbox');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── BOOT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initGate();
  gmInit();
  tmInit();
});
