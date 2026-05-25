/* ===== KingBadBoi Shadow Ninja TempMail ===== */

// ── Particles ──────────────────────────────────────────────
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 1.5 + 0.3;
    this.speedX = (Math.random() - 0.5) * 0.4;
    this.speedY = -Math.random() * 0.5 - 0.1;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.color = Math.random() > 0.5 ? '#00e5ff' : '#a855f7';
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.y < 0 || this.x < 0 || this.x > canvas.width) this.reset();
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

for (let i = 0; i < 120; i++) particles.push(new Particle());

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ── Toast ───────────────────────────────────────────────────
function showToast(msg, duration = 2500) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

// ── Device ID & Visitor Count ───────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem('kb_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('kb_device_id', id);
  }
  return id;
}

async function registerVisit() {
  try {
    const res = await fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId() })
    });
    const data = await res.json();
    updateVisitorDisplay(data.unique);
  } catch {
    // Fallback: count from localStorage
    const count = parseInt(localStorage.getItem('kb_visitor_total') || '0') + 1;
    localStorage.setItem('kb_visitor_total', count);
    updateVisitorDisplay(count);
  }
}

function updateVisitorDisplay(count) {
  const el = document.getElementById('visitor-count');
  if (el) el.textContent = count.toLocaleString();
}

// ── Follow Gate ─────────────────────────────────────────────
const gateEl = document.getElementById('follow-gate');
const mainEl = document.getElementById('main-site');
const enterBtn = document.getElementById('enter-btn');
const followLink = document.getElementById('follow-link');

let followClicked = localStorage.getItem('kb_followed') === '1';

followLink.addEventListener('click', () => {
  followClicked = true;
  localStorage.setItem('kb_followed', '1');
  setTimeout(() => {
    enterBtn.textContent = "✅ Followed! Enter Site";
    enterBtn.style.borderColor = '#25D366';
    enterBtn.style.color = '#25D366';
  }, 500);
});

enterBtn.addEventListener('click', () => {
  if (!followClicked && localStorage.getItem('kb_followed') !== '1') {
    showToast('👆 Please follow the channel first!', 3000);
    followLink.style.animation = 'none';
    followLink.offsetHeight;
    followLink.style.animation = 'gateIn 0.3s ease';
    return;
  }
  gateEl.style.animation = 'gateOut 0.3s ease forwards';
  setTimeout(() => {
    gateEl.style.display = 'none';
    mainEl.classList.remove('hidden');
    registerVisit();
  }, 280);
});

// Inject gateOut keyframe
const style = document.createElement('style');
style.textContent = `@keyframes gateOut { to { opacity: 0; transform: scale(1.05); } }`;
document.head.appendChild(style);

// Auto-open if already followed
if (localStorage.getItem('kb_followed') === '1') {
  gateEl.style.display = 'none';
  mainEl.classList.remove('hidden');
  registerVisit();
}

// ── State ────────────────────────────────────────────────────
let currentEmail = null;
let currentToken = null;
let currentSeq = 0;

// ── DOM Refs ─────────────────────────────────────────────────
const generateBtn = document.getElementById('generate-btn');
const inboxBtn = document.getElementById('inbox-btn');
const emailDisplay = document.getElementById('email-display');
const copyBtn = document.getElementById('copy-btn');
const emailMeta = document.getElementById('email-meta');
const inboxPanel = document.getElementById('inbox-panel');
const inboxList = document.getElementById('inbox-list');
const inboxTag = document.getElementById('inbox-tag');
const refreshBtn = document.getElementById('refresh-btn');
const msgModal = document.getElementById('msg-modal');
const modalClose = document.getElementById('modal-close');

// ── Generate Email ────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  generateBtn.disabled = true;
  generateBtn.innerHTML = `<span class="spinner"></span> GENERATING...`;
  emailDisplay.innerHTML = `<span class="email-placeholder">Summoning from the shadows...</span>`;

  try {
    const res = await fetch('/api/generate');
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();

    currentEmail = data.email;
    currentToken = data.token;
    currentSeq = 0;

    emailDisplay.textContent = currentEmail;
    copyBtn.style.display = 'flex';
    emailMeta.textContent = `⏱ Generated at ${new Date().toLocaleTimeString()} · Valid for 24 hours`;

    inboxBtn.disabled = false;
    inboxPanel.classList.add('hidden');
    inboxList.innerHTML = `<div class="inbox-empty"><div class="empty-icon">🕵️</div><div>No messages yet. Waiting in the shadows...</div></div>`;
    inboxTag.textContent = currentEmail;

    showToast('✅ Shadow Ninja email ready!');
  } catch (err) {
    emailDisplay.innerHTML = `<span class="email-placeholder" style="color:#ff3a6e">⚠ Failed. Check connection & try again.</span>`;
    showToast('❌ Generation failed', 3000);
  }

  generateBtn.disabled = false;
  generateBtn.innerHTML = `<span class="btn-icon">⚡</span> GENERATE EMAIL`;
});

// ── Copy Email ────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  if (!currentEmail) return;
  navigator.clipboard.writeText(currentEmail).then(() => {
    showToast('📋 Email copied!');
    copyBtn.textContent = '✅';
    setTimeout(() => { copyBtn.textContent = '📋'; }, 2000);
  });
});

// ── Check Inbox ───────────────────────────────────────────────
inboxBtn.addEventListener('click', () => checkInbox());
refreshBtn.addEventListener('click', () => checkInbox());

async function checkInbox() {
  if (!currentToken) return;
  refreshBtn.textContent = '⏳ Loading...';
  inboxPanel.classList.remove('hidden');
  inboxPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  try {
    const res = await fetch(`/api/inbox?token=${encodeURIComponent(currentToken)}&seq=${currentSeq}`);
    const data = await res.json();

    const emails = data.list || [];

    if (emails.length === 0) {
      inboxList.innerHTML = `<div class="inbox-empty"><div class="empty-icon">🕵️</div><div>No messages yet. Waiting in the shadows...</div></div>`;
    } else {
      // Update seq to latest
      if (data.count > 0) currentSeq = emails[0].mail_id;

      inboxList.innerHTML = emails.map(mail => `
        <div class="inbox-item" onclick="openMessage('${mail.mail_id}')">
          <div class="inbox-from">📩 ${escHtml(mail.mail_from)}</div>
          <div class="inbox-subject">${escHtml(mail.mail_subject || '(No Subject)')}</div>
          <div class="inbox-time">${formatTime(mail.mail_timestamp)}</div>
        </div>
      `).join('');
    }
  } catch {
    inboxList.innerHTML = `<div class="inbox-empty" style="color:#ff3a6e">⚠ Failed to load inbox. Try again.</div>`;
  }

  refreshBtn.textContent = '🔄 Refresh';
}

// ── Open Message ──────────────────────────────────────────────
async function openMessage(mailId) {
  if (!currentToken) return;
  document.getElementById('modal-from').textContent = 'Loading...';
  document.getElementById('modal-subject').textContent = '';
  document.getElementById('modal-date').textContent = '';
  document.getElementById('modal-body').innerHTML = '<div class="spinner"></div>';
  msgModal.classList.remove('hidden');

  try {
    const res = await fetch(`/api/message?token=${encodeURIComponent(currentToken)}&id=${mailId}`);
    const data = await res.json();

    document.getElementById('modal-from').textContent = `FROM: ${data.mail_from || '—'}`;
    document.getElementById('modal-subject').textContent = data.mail_subject || '(No Subject)';
    document.getElementById('modal-date').textContent = formatTime(data.mail_timestamp);

    const body = data.mail_body || data.mail_text_only || '(Empty message)';
    // If it looks like HTML, render it in an iframe-safe way
    if (/<[a-z][\s\S]*>/i.test(body)) {
      document.getElementById('modal-body').innerHTML = `<div style="pointer-events:none">${body}</div>`;
    } else {
      document.getElementById('modal-body').textContent = body;
    }
  } catch {
    document.getElementById('modal-body').textContent = '⚠ Could not load message.';
  }
}

window.openMessage = openMessage;

modalClose.addEventListener('click', () => msgModal.classList.add('hidden'));
msgModal.addEventListener('click', (e) => { if (e.target === msgModal) msgModal.classList.add('hidden'); });

// ── Helpers ───────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleString();
}
