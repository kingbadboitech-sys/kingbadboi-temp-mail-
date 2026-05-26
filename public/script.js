/* ═══════════════════════════════════════════════════════════════
   KingBadBoi TempMail · script.js
   Guerrilla Mail API: generate → auto-poll every 5s → show mails
═══════════════════════════════════════════════════════════════ */

// ── STATE ─────────────────────────────────────────────────────
let state = {
  email:      null,
  sid_token:  null,
  timestamp:  null,
  mails:      [],        // all known mails {id, from, subject, date, read}
  seqId:      0,         // last mail_id seen (used for check_email polling)
  pollTimer:  null,      // setInterval handle
  countTimer: null,      // countdown interval
  secsLeft:   3600,      // 60 min session
  polling:    false,
  openMailId: null,
};

const POLL_INTERVAL = 5000; // 5 seconds

// ── DEVICE ID (per-device visitor tracking) ───────────────────
function deviceId() {
  let id = localStorage.getItem('kbb_did');
  if (!id) { id = 'kbb_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('kbb_did', id); }
  return id;
}

// ── VISITOR COUNT ─────────────────────────────────────────────
async function registerVisitor() {
  try {
    const r = await fetch('/api/visit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({deviceId: deviceId()}) });
    const d = await r.json();
    document.getElementById('visitorCount').textContent = d.count.toLocaleString();
  } catch {}
}

// ── PARTICLES ─────────────────────────────────────────────────
function initParticles() {
  const cv = document.getElementById('particles');
  const cx = cv.getContext('2d');
  let W = cv.width = innerWidth, H = cv.height = innerHeight;
  const pts = Array.from({length:55}, () => ({
    x: Math.random()*W, y: Math.random()*H,
    vx:(Math.random()-.5)*.35, vy:(Math.random()-.5)*.35,
    r: Math.random()*1.4+.3,
    a: Math.random()*.35+.08,
    c: ['#ff1f3d','#00ffe0','#ffd700'][Math.floor(Math.random()*3)]
  }));
  const draw = () => {
    cx.clearRect(0,0,W,H);
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0;
      if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      cx.beginPath(); cx.arc(p.x,p.y,p.r,0,Math.PI*2);
      cx.fillStyle=p.c; cx.globalAlpha=p.a; cx.fill();
    });
    cx.globalAlpha=1; requestAnimationFrame(draw);
  };
  draw();
  addEventListener('resize', () => { W=cv.width=innerWidth; H=cv.height=innerHeight; });
}

// ── TOAST ─────────────────────────────────────────────────────
function toast(msg, dur=2800) {
  document.querySelector('.toast')?.remove();
  const t = Object.assign(document.createElement('div'), {className:'toast', textContent:msg});
  document.body.appendChild(t);
  setTimeout(() => t.remove(), dur);
}

// ── COUNTDOWN TIMER ───────────────────────────────────────────
function startCountdown() {
  clearInterval(state.countTimer);
  state.secsLeft = 3600;
  document.getElementById('cardFooter').style.display = 'flex';
  const tick = () => {
    const m = String(Math.floor(state.secsLeft/60)).padStart(2,'0');
    const s = String(state.secsLeft%60).padStart(2,'0');
    document.getElementById('timerVal').textContent = `${m}:${s}`;
    if (state.secsLeft <= 0) { clearInterval(state.countTimer); stopPolling(); toast('⏰ Session expired. Generate a new email.'); }
    state.secsLeft--;
  };
  tick();
  state.countTimer = setInterval(tick, 1000);
}

// ── GENERATE EMAIL ─────────────────────────────────────────────
async function generateEmail() {
  const btn = document.getElementById('generateBtn');
  btn.innerHTML = '<span class="spin"></span> GENERATING...';
  btn.disabled = true;

  stopPolling();
  state.mails = []; state.seqId = 0;
  renderInbox([]);
  document.getElementById('inboxSection').style.display = 'none';
  document.getElementById('newMailBanner').style.display = 'none';

  try {
    const r = await fetch('/api/generate');
    if (!r.ok) throw new Error(await r.text());
    const d = await r.json();

    state.email     = d.email;
    state.sid_token = d.sid_token;
    state.timestamp = d.timestamp;
    state.seqId     = 0;

    // Show email address
    document.getElementById('emailAddr').textContent = state.email;
    document.getElementById('copyBtn').style.display = 'flex';
    document.getElementById('inboxBtn').disabled = false;
    document.getElementById('inboxAddrTag').textContent = state.email;

    // Show inbox section and start polling
    document.getElementById('inboxSection').style.display = 'block';
    startCountdown();
    startPolling();
    toast('✅ Shadow email generated!');
  } catch (err) {
    document.getElementById('emailAddr').innerHTML = '<span class="addr-placeholder">⚠ Failed — try again</span>';
    toast('❌ Error: ' + (err.message || 'Could not generate email'));
  }

  btn.innerHTML = '<span class="btn-icon">⚡</span> GENERATE EMAIL';
  btn.disabled = false;
}

// ── POLLING ENGINE ─────────────────────────────────────────────
function startPolling() {
  if (state.polling) return;
  state.polling = true;
  setPollUI(true);
  // poll immediately, then every 5s
  pollInbox();
  state.pollTimer = setInterval(pollInbox, POLL_INTERVAL);
}

function stopPolling() {
  clearInterval(state.pollTimer);
  state.pollTimer = null;
  state.polling = false;
  setPollUI(false);
}

function setPollUI(active) {
  const dot   = document.getElementById('pollDot');
  const label = document.getElementById('pollLabel');
  if (active) {
    dot.classList.add('active');
    label.textContent = 'Auto-refresh: ON (5s)';
  } else {
    dot.classList.remove('active');
    label.textContent = 'Auto-refresh: OFF';
  }
}

// ── POLL INBOX (check_email) ──────────────────────────────────
async function pollInbox() {
  if (!state.sid_token) return;
  try {
    const r = await fetch(`/api/check?sid_token=${encodeURIComponent(state.sid_token)}&seq=${state.seqId}`);
    if (!r.ok) return;
    const d = await r.json();

    if (!d.list || d.list.length === 0) return;

    let hasNew = false;
    d.list.forEach(mail => {
      // mail_id is string from API
      const id = String(mail.mail_id);
      if (!state.mails.find(m => m.id === id)) {
        state.mails.unshift({
          id,
          from:    mail.mail_from    || 'Unknown',
          subject: mail.mail_subject || '(No Subject)',
          excerpt: mail.mail_excerpt || '',
          date:    mail.mail_date    || '',
          timestamp: mail.mail_timestamp || 0,
          read:    false,
        });
        // track highest id as new seq
        if (parseInt(id) > state.seqId) state.seqId = parseInt(id);
        hasNew = true;
      }
    });

    if (hasNew) {
      renderInbox(state.mails);
      showNewMailBanner();
      // Play a subtle audio ping if supported
      try { new Audio('data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUoAAAA' + 'AAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA').play(); } catch{}
    }
  } catch {}
}

function showNewMailBanner() {
  const banner = document.getElementById('newMailBanner');
  banner.style.display = 'block';
  clearTimeout(showNewMailBanner._t);
  showNewMailBanner._t = setTimeout(() => banner.style.display = 'none', 4000);
  // Also scroll inbox into view
  document.getElementById('inboxSection').scrollIntoView({behavior:'smooth', block:'start'});
}

// ── MANUAL CHECK ─────────────────────────────────────────────
async function manualCheck() {
  if (!state.sid_token) return;
  const btn = document.getElementById('inboxBtn');
  btn.innerHTML = '<span class="spin"></span> SCANNING...';
  btn.disabled = true;
  await pollInbox();
  btn.innerHTML = '<span class="btn-icon">📬</span> CHECK INBOX';
  btn.disabled = false;
  document.getElementById('inboxSection').scrollIntoView({behavior:'smooth'});
}

// ── RENDER INBOX ──────────────────────────────────────────────
function renderInbox(mails) {
  const list = document.getElementById('inboxList');
  if (!mails.length) {
    list.innerHTML = `
      <div class="inbox-empty">
        <div class="empty-icon">🥷</div>
        <p>Inbox in stealth mode...<br><span>Auto-scanning every 5 seconds</span></p>
      </div>`;
    return;
  }
  list.innerHTML = mails.map(m => `
    <div class="inbox-item ${m.read ? '' : 'unread'}" id="iitem-${m.id}" onclick="openMail('${m.id}')">
      <div class="inbox-item-icon">${m.read ? '📧' : '📩'}</div>
      <div class="i-info">
        <div class="i-from">${esc(m.from)}</div>
        <div class="i-subject">${esc(m.subject)}</div>
      </div>
      <div class="i-date">${esc(m.date)}</div>
      <button class="i-del" onclick="event.stopPropagation();deleteMail('${m.id}')" title="Delete">🗑</button>
    </div>`).join('');
}

// ── OPEN MAIL (fetch full body) ───────────────────────────────
async function openMail(id) {
  state.openMailId = id;
  const overlay = document.getElementById('viewerOverlay');
  const meta    = document.getElementById('viewerMeta');
  const body    = document.getElementById('viewerBody');
  const footer  = document.getElementById('viewerFooter');

  overlay.style.display = 'flex';
  meta.innerHTML = '<span style="color:var(--dim);font-family:var(--ff-mono)">Loading message...</span>';
  body.innerHTML = '';
  footer.innerHTML = '';

  // Mark read in local state
  const m = state.mails.find(x => x.id === id);
  if (m) { m.read = true; renderInbox(state.mails); }

  try {
    const r = await fetch(`/api/email/${id}?sid_token=${encodeURIComponent(state.sid_token)}`);
    if (!r.ok) throw new Error('fetch failed');
    const d = await r.json();

    meta.innerHTML = `
      <div class="vm-from">FROM: ${esc(d.from)}</div>
      <div class="vm-sub">${esc(d.subject)}</div>
      <div class="vm-date">${esc(d.date || '')}</div>`;

    // Render body — try iframe for HTML, fallback to pre
    const html = d.body || '';
    if (/<[a-z][\s\S]*>/i.test(html)) {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:100%;border:none;min-height:300px;background:#fff;display:block';
      iframe.sandbox = 'allow-same-origin';
      body.appendChild(iframe);
      iframe.contentDocument.open();
      iframe.contentDocument.write(html);
      iframe.contentDocument.close();
      setTimeout(() => { try { iframe.style.height = iframe.contentDocument.body.scrollHeight + 30 + 'px'; } catch{} }, 300);
    } else {
      body.innerHTML = `<pre style="white-space:pre-wrap;font-family:var(--ff-mono);font-size:13px;color:var(--txt)">${esc(html)}</pre>`;
    }

    footer.innerHTML = `<button class="btn-del-email" onclick="deleteMail('${id}',true)">🗑 DELETE THIS EMAIL</button>`;
  } catch {
    meta.innerHTML = '';
    body.innerHTML = '<p style="color:var(--dim)">Could not load this email.</p>';
  }
}

// ── DELETE MAIL ────────────────────────────────────────────────
async function deleteMail(id, closeViewer = false) {
  state.mails = state.mails.filter(m => m.id !== id);
  renderInbox(state.mails);
  if (closeViewer) document.getElementById('viewerOverlay').style.display = 'none';
  try {
    await fetch(`/api/email/${id}?sid_token=${encodeURIComponent(state.sid_token)}`, {method:'DELETE'});
  } catch {}
  toast('🗑 Email deleted');
}

// ── COPY EMAIL ────────────────────────────────────────────────
function copyEmail() {
  if (!state.email) return;
  navigator.clipboard.writeText(state.email).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✅ COPIED';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '⧉ COPY'; btn.classList.remove('copied'); }, 2000);
    toast('📋 Email copied to clipboard!');
  });
}

// ── FOLLOW GATE ───────────────────────────────────────────────
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
    localStorage.setItem('kbb_tapped_follow', '1');
  });
  document.getElementById('unlockBtn').addEventListener('click', () => {
    if (!localStorage.getItem('kbb_tapped_follow')) {
      toast('⚠ Please tap JOIN WHATSAPP CHANNEL first!');
      return;
    }
    localStorage.setItem('kbb_unlocked', '1');
    gate.style.display = 'none';
    app.classList.remove('hidden');
    registerVisitor();
  });
}

// ── HELPERS ───────────────────────────────────────────────────
function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── BOOT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initGate();

  document.getElementById('generateBtn').addEventListener('click', generateEmail);
  document.getElementById('inboxBtn').addEventListener('click', manualCheck);
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.textContent = '↻ SCANNING...';
    btn.disabled = true;
    await pollInbox();
    btn.textContent = '↻ REFRESH NOW';
    btn.disabled = false;
  });
  document.getElementById('copyBtn').addEventListener('click', copyEmail);
  document.getElementById('viewerClose').addEventListener('click', () => {
    document.getElementById('viewerOverlay').style.display = 'none';
  });
  document.getElementById('viewerOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });
});
