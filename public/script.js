/* ─── KingBadBoi TempMail · Shadow Ninja ─────────────────────── */

const API = ''; // empty = same origin (server.js serves frontend too)

// ─── STATE ────────────────────────────────────────────────────────
let currentEmail = null;
let currentToken = null;
let timerInterval = null;
let timerSeconds = 600; // 10 minutes

// ─── DEVICE ID ────────────────────────────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem('kbb_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('kbb_device_id', id);
  }
  return id;
}

// ─── VISITOR COUNT ────────────────────────────────────────────────
async function registerVisitor() {
  try {
    const res = await fetch(API + '/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId() })
    });
    const data = await res.json();
    document.getElementById('visitorCount').textContent = data.count.toLocaleString();
  } catch {
    // silent fail
  }
}

// ─── PARTICLES ────────────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.5 + 0.3,
    alpha: Math.random() * 0.4 + 0.1,
    color: Math.random() > 0.6 ? '#ff2244' : Math.random() > 0.5 ? '#00ffe7' : '#ffd700'
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });
}

// ─── TOAST ────────────────────────────────────────────────────────
function showToast(msg, duration = 2500) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ─── TIMER ────────────────────────────────────────────────────────
function startTimer() {
  clearInterval(timerInterval);
  timerSeconds = 600;
  document.getElementById('emailTimer').style.display = 'flex';
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      showToast('⏰ Email expired! Generate a new one.');
      document.getElementById('emailTimer').style.display = 'none';
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const s = String(timerSeconds % 60).padStart(2, '0');
  document.getElementById('timerCount').textContent = `${m}:${s}`;
}

// ─── GENERATE EMAIL ────────────────────────────────────────────────
async function generateEmail() {
  const btn = document.getElementById('generateBtn');
  const display = document.getElementById('emailDisplay');

  btn.innerHTML = '<span class="spinner"></span> SUMMONING...';
  btn.disabled = true;
  display.innerHTML = '<span class="email-placeholder">Summoning shadow email...</span>';

  try {
    const res = await fetch(API + '/api/generate', { method: 'POST' });
    const data = await res.json();

    currentEmail = data.email;
    currentToken = data.token || btoa(data.email);

    display.textContent = currentEmail;
    document.getElementById('copyBtn').style.display = 'inline-block';
    document.getElementById('inboxBtn').disabled = false;
    document.getElementById('inboxEmailTag').textContent = currentEmail;

    startTimer();
    showToast('✅ Shadow email summoned!');
  } catch (err) {
    display.innerHTML = '<span class="email-placeholder">⚠ Failed to generate. Retry.</span>';
    showToast('❌ Generation failed. Check connection.');
  }

  btn.innerHTML = '<span class="btn-icon">⚡</span> GENERATE EMAIL';
  btn.disabled = false;
}

// ─── COPY EMAIL ────────────────────────────────────────────────────
function copyEmail() {
  if (!currentEmail) return;
  navigator.clipboard.writeText(currentEmail).then(() => showToast('📋 Email copied!'));
}

// ─── CHECK INBOX ────────────────────────────────────────────────────
async function checkInbox() {
  if (!currentToken) return;

  const btn = document.getElementById('inboxBtn');
  const section = document.getElementById('inboxSection');
  const list = document.getElementById('inboxList');

  btn.innerHTML = '<span class="spinner"></span> SCANNING...';
  btn.disabled = true;
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  list.innerHTML = `
    <div class="inbox-empty">
      <div class="inbox-empty-icon">🔍</div>
      <p>Scanning shadow inbox...<br><span>Connecting to TempMail Ninja</span></p>
    </div>`;

  try {
    const res = await fetch(API + '/api/inbox/' + encodeURIComponent(currentToken));
    const data = await res.json();

    const emails = data.mail || data.emails || data.messages || data || [];
    renderInbox(Array.isArray(emails) ? emails : []);
  } catch {
    list.innerHTML = `
      <div class="inbox-empty">
        <div class="inbox-empty-icon">⚠</div>
        <p>Could not reach inbox.<br><span>Try refreshing in a few seconds.</span></p>
      </div>`;
  }

  btn.innerHTML = '<span class="btn-icon">📬</span> CHECK INBOX';
  btn.disabled = false;
}

// ─── RENDER INBOX ────────────────────────────────────────────────
function renderInbox(mails) {
  const list = document.getElementById('inboxList');

  if (!mails.length) {
    list.innerHTML = `
      <div class="inbox-empty">
        <div class="inbox-empty-icon">🥷</div>
        <p>No messages yet...<br><span>Your inbox is in stealth mode.</span></p>
      </div>`;
    return;
  }

  list.innerHTML = mails.map((m, i) => {
    const from = m.from || m.sender || 'Unknown Sender';
    const subject = m.subject || '(No Subject)';
    const date = m.date ? new Date(m.date * 1000).toLocaleString() : 'Just now';
    const id = m.id || m._id || i;

    return `
      <div class="inbox-item" onclick="openEmail('${id}')">
        <div class="inbox-item-icon">📧</div>
        <div class="inbox-item-info">
          <div class="inbox-item-from">${escHtml(from)}</div>
          <div class="inbox-item-subject">${escHtml(subject)}</div>
        </div>
        <div class="inbox-item-date">${escHtml(date)}</div>
      </div>`;
  }).join('');
}

// ─── OPEN EMAIL ──────────────────────────────────────────────────
async function openEmail(id) {
  const overlay = document.getElementById('emailViewerOverlay');
  const meta    = document.getElementById('viewerMeta');
  const body    = document.getElementById('viewerBody');

  overlay.style.display = 'flex';
  meta.innerHTML = '<span style="color:var(--text-dim);font-family:var(--font-mono)">Loading message...</span>';
  body.innerHTML = '';

  try {
    const res = await fetch(`${API}/api/email/${encodeURIComponent(currentToken)}/${id}`);
    const m = await res.json();

    const from    = m.from || m.sender || 'Unknown';
    const subject = m.subject || '(No Subject)';
    const date    = m.date ? new Date(m.date * 1000).toLocaleString() : '';
    const content = m.body || m.html || m.text || m.content || '(Empty message)';

    meta.innerHTML = `
      <div class="meta-from">FROM: ${escHtml(from)}</div>
      <div class="meta-sub">${escHtml(subject)}</div>
      <div class="meta-date">${escHtml(date)}</div>`;

    // Render HTML if it looks like HTML, else plain text
    if (/<[a-z][\s\S]*>/i.test(content)) {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:100%;border:none;min-height:300px;background:#fff;';
      body.appendChild(iframe);
      iframe.contentDocument.open();
      iframe.contentDocument.write(content);
      iframe.contentDocument.close();
      iframe.onload = () => {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
      };
    } else {
      body.innerHTML = `<pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:14px;">${escHtml(content)}</pre>`;
    }
  } catch {
    meta.innerHTML = '';
    body.innerHTML = '<p style="color:var(--text-dim)">Failed to load email.</p>';
  }
}

// ─── FOLLOW GATE ──────────────────────────────────────────────────
function initGate() {
  const followed = localStorage.getItem('kbb_followed');
  const gate = document.getElementById('followGate');
  const app  = document.getElementById('app');

  if (followed === 'yes') {
    gate.style.display = 'none';
    app.classList.remove('hidden');
    registerVisitor();
    return;
  }

  document.getElementById('followBtn').addEventListener('click', () => {
    // Mark that they clicked follow (opens WhatsApp)
    localStorage.setItem('kbb_clicked_follow', 'yes');
  });

  document.getElementById('unlockBtn').addEventListener('click', () => {
    const clicked = localStorage.getItem('kbb_clicked_follow');
    if (!clicked) {
      showToast('⚠ Please click "JOIN WHATSAPP CHANNEL" first!');
      return;
    }
    localStorage.setItem('kbb_followed', 'yes');
    gate.style.display = 'none';
    app.classList.remove('hidden');
    registerVisitor();
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── BOOT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initGate();

  document.getElementById('generateBtn').addEventListener('click', generateEmail);
  document.getElementById('inboxBtn').addEventListener('click', checkInbox);
  document.getElementById('refreshBtn').addEventListener('click', checkInbox);
  document.getElementById('copyBtn').addEventListener('click', copyEmail);
  document.getElementById('viewerClose').addEventListener('click', () => {
    document.getElementById('emailViewerOverlay').style.display = 'none';
  });
  document.getElementById('emailViewerOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });
});
