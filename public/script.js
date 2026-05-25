// ===== KingBadBoi Tech TempMail =====

const API = '';  // same-origin proxy via server.js

// State
let state = {
  email: null,
  password: null,
  token: null,
  accountId: null,
  messages: [],
  autoRefreshTimer: null,
  currentMsgId: null
};

// ===== FOLLOW MODAL =====
const followModal = document.getElementById('followModal');
const followedBtn = document.getElementById('followedBtn');

// Check if followed before
if (localStorage.getItem('kbb_followed') === 'yes') {
  followModal.style.display = 'none';
}

followedBtn.addEventListener('click', () => {
  localStorage.setItem('kbb_followed', 'yes');
  followModal.style.display = 'none';
  showToast('Welcome to KingBadBoi Tech! 👑');
});

// ===== DOM REFS =====
const emailDisplay = document.getElementById('emailDisplay');
const copyBtn = document.getElementById('copyBtn');
const generateBtn = document.getElementById('generateBtn');
const refreshBtn = document.getElementById('refreshBtn');
const deleteBtn = document.getElementById('deleteBtn');
const statusMsg = document.getElementById('statusMsg');
const inboxSection = document.getElementById('inboxSection');
const messageList = document.getElementById('messageList');
const msgCount = document.getElementById('msgCount');
const inboxRefreshBtn = document.getElementById('inboxRefreshBtn');
const msgModal = document.getElementById('msgModal');
const closeMsgBtn = document.getElementById('closeMsgBtn');
const deleteMsgBtn = document.getElementById('deleteMsgBtn');

// Toast
const toast = document.createElement('div');
toast.id = 'toast';
document.body.appendChild(toast);

function showToast(msg, duration = 2500) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function setStatus(msg, type = '') {
  statusMsg.textContent = msg;
  statusMsg.className = 'status-msg ' + type;
}

// ===== GENERATE RANDOM PASSWORD =====
function randomPassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ===== RANDOM USERNAME =====
function randomUsername() {
  const adj = ['cool','fast','dark','epic','hot','wild','real','top','vibe','king','bad','boi'];
  const noun = ['wolf','ninja','star','boss','fire','ghost','blade','storm','flash','tech'];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = noun[Math.floor(Math.random() * noun.length)];
  const num = Math.floor(Math.random() * 9000 + 1000);
  return `${a}${n}${num}`;
}

// ===== FETCH HELPER =====
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(API + path, { ...options, headers });
  return res;
}

// ===== GENERATE EMAIL =====
generateBtn.addEventListener('click', generateEmail);
refreshBtn.addEventListener('click', async () => {
  if (state.accountId && state.token) {
    await deleteAccount();
  }
  generateEmail();
});

async function generateEmail() {
  clearAutoRefresh();
  setStatus('Fetching available domains...', 'info');
  emailDisplay.textContent = 'Generating...';
  emailDisplay.classList.add('loading');
  generateBtn.disabled = true;

  try {
    // Get domain
    const domRes = await apiFetch('/api/domains');
    const domData = await domRes.json();
    const domains = domData['hydra:member'] || domData.members || [];
    if (!domains.length) throw new Error('No domains available');
    const domain = domains[0].domain;

    const username = randomUsername();
    const address = `${username}@${domain}`;
    const password = randomPassword();

    setStatus('Creating mailbox...', 'info');

    // Create account
    const accRes = await apiFetch('/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ address, password })
    });
    const accData = await accRes.json();
    if (!accRes.ok) throw new Error(accData['hydra:description'] || 'Failed to create account');

    state.accountId = accData.id;
    state.email = address;
    state.password = password;

    // Get token
    const tokRes = await apiFetch('/api/token', {
      method: 'POST',
      body: JSON.stringify({ address, password })
    });
    const tokData = await tokRes.json();
    if (!tokRes.ok) throw new Error('Failed to authenticate');
    state.token = tokData.token;

    // Update UI
    emailDisplay.classList.remove('loading');
    emailDisplay.textContent = state.email;
    copyBtn.disabled = false;
    refreshBtn.disabled = false;
    deleteBtn.disabled = false;
    setStatus('✓ Email ready! Use it anywhere.', 'success');

    inboxSection.classList.remove('hidden');
    loadMessages();
    startAutoRefresh();

    showToast('📧 Email generated!');
  } catch (err) {
    emailDisplay.textContent = 'Error — try again';
    emailDisplay.classList.remove('loading');
    setStatus('❌ ' + err.message, 'error');
    showToast('Error: ' + err.message, 3000);
  } finally {
    generateBtn.disabled = false;
  }
}

// ===== COPY EMAIL =====
copyBtn.addEventListener('click', () => {
  if (!state.email) return;
  navigator.clipboard.writeText(state.email).then(() => {
    showToast('📋 Copied to clipboard!');
    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => copyBtn.innerHTML = '<i class="far fa-copy"></i>', 1500);
  });
});

// ===== DELETE ACCOUNT =====
deleteBtn.addEventListener('click', async () => {
  if (!confirm('Delete this email address? All messages will be lost.')) return;
  await deleteAccount();
  resetState();
});

async function deleteAccount() {
  if (!state.accountId) return;
  try {
    await apiFetch(`/api/accounts/${state.accountId}`, { method: 'DELETE' });
  } catch (e) { /* silent */ }
}

function resetState() {
  clearAutoRefresh();
  state = { email: null, password: null, token: null, accountId: null, messages: [], autoRefreshTimer: null, currentMsgId: null };
  emailDisplay.textContent = 'Click Generate to get your email';
  emailDisplay.classList.remove('loading');
  copyBtn.disabled = true;
  refreshBtn.disabled = true;
  deleteBtn.disabled = true;
  inboxSection.classList.add('hidden');
  messageList.innerHTML = '<div class="empty-inbox"><i class="fas fa-envelope-open"></i><p>Inbox is empty. Use this email to sign up for anything!</p></div>';
  msgCount.textContent = '0 messages';
  setStatus('');
  showToast('🗑️ Email deleted');
}

// ===== LOAD MESSAGES =====
inboxRefreshBtn.addEventListener('click', loadMessages);

async function loadMessages() {
  if (!state.token) return;
  inboxRefreshBtn.innerHTML = '<i class="fas fa-sync-alt spin"></i> Refresh';
  try {
    const res = await apiFetch('/api/messages');
    const data = await res.json();
    const msgs = data['hydra:member'] || data.members || [];
    state.messages = msgs;
    renderMessages(msgs);
  } catch (e) {
    // silent fail
  } finally {
    inboxRefreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
  }
}

function renderMessages(msgs) {
  msgCount.textContent = `${msgs.length} message${msgs.length !== 1 ? 's' : ''}`;
  if (!msgs.length) {
    messageList.innerHTML = '<div class="empty-inbox"><i class="fas fa-envelope-open"></i><p>Inbox is empty. Use this email to sign up for anything!</p></div>';
    return;
  }
  messageList.innerHTML = msgs.map(m => {
    const from = m.from?.address || m.from || 'Unknown';
    const name = m.from?.name || from;
    const date = new Date(m.createdAt).toLocaleString();
    const preview = m.intro || '';
    const unread = !m.seen ? 'unread' : '';
    return `
      <div class="msg-item ${unread}" data-id="${m.id}" onclick="openMessage('${m.id}')">
        <div class="msg-item-from">
          <span>${escHtml(name)}</span>
          <span class="msg-item-time">${date}</span>
        </div>
        <div class="msg-item-subject">${escHtml(m.subject || '(No Subject)')}</div>
        <div class="msg-item-preview">${escHtml(preview)}</div>
      </div>
    `;
  }).join('');
}

// ===== OPEN MESSAGE =====
async function openMessage(id) {
  state.currentMsgId = id;
  try {
    const res = await apiFetch(`/api/messages/${id}`);
    const msg = await res.json();

    document.getElementById('msgSubject').textContent = msg.subject || '(No Subject)';
    document.getElementById('msgFrom').textContent = `From: ${msg.from?.address || msg.from || 'Unknown'}`;
    document.getElementById('msgDate').textContent = new Date(msg.createdAt).toLocaleString();

    // Render body
    let body = '';
    if (msg.html && msg.html.length) {
      // Strip to plain text from HTML
      const tmp = document.createElement('div');
      tmp.innerHTML = Array.isArray(msg.html) ? msg.html.join('') : msg.html;
      body = tmp.innerText || tmp.textContent;
    } else if (msg.text) {
      body = msg.text;
    } else {
      body = '(No content)';
    }
    document.getElementById('msgBody').textContent = body;

    msgModal.classList.remove('hidden');

    // Mark as read in UI
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) el.classList.remove('unread');
  } catch (e) {
    showToast('Failed to load message', 2000);
  }
}
window.openMessage = openMessage;

closeMsgBtn.addEventListener('click', () => msgModal.classList.add('hidden'));
msgModal.addEventListener('click', (e) => { if (e.target === msgModal) msgModal.classList.add('hidden'); });

deleteMsgBtn.addEventListener('click', async () => {
  if (!state.currentMsgId) return;
  try {
    await apiFetch(`/api/messages/${state.currentMsgId}`, { method: 'DELETE' });
    msgModal.classList.add('hidden');
    showToast('🗑️ Message deleted');
    state.messages = state.messages.filter(m => m.id !== state.currentMsgId);
    renderMessages(state.messages);
  } catch (e) {
    showToast('Failed to delete', 2000);
  }
});

// ===== AUTO REFRESH =====
function startAutoRefresh() {
  clearAutoRefresh();
  state.autoRefreshTimer = setInterval(loadMessages, 10000); // every 10s
}
function clearAutoRefresh() {
  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }
}

// ===== UTILS =====
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
