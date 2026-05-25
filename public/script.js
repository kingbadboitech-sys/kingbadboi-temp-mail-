
// ===== KingBadBoi Tech TempMail =====

const API = 'https://api.mail.tm';

let state = {
  email: null,
  password: null,
  token: null,
  accountId: null,
  messages: [],
  autoRefreshTimer: null,
  currentMsgId: null,
  fullName: null
};

// ===== REAL US FIRST + LAST NAMES =====
const FIRST_NAMES = [
  'James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles',
  'Christopher','Daniel','Matthew','Anthony','Mark','Donald','Steven','Paul','Andrew','Joshua',
  'Kenneth','Kevin','Brian','George','Timothy','Ronald','Edward','Jason','Jeffrey','Ryan',
  'Jacob','Gary','Nicholas','Eric','Jonathan','Stephen','Larry','Justin','Scott','Brandon',
  'Benjamin','Samuel','Raymond','Gregory','Frank','Alexander','Patrick','Jack','Dennis','Jerry',
  'Mary','Patricia','Jennifer','Linda','Barbara','Elizabeth','Susan','Jessica','Sarah','Karen',
  'Lisa','Nancy','Betty','Margaret','Sandra','Ashley','Dorothy','Kimberly','Emily','Donna',
  'Michelle','Carol','Amanda','Melissa','Deborah','Stephanie','Rebecca','Sharon','Laura','Cynthia',
  'Kathleen','Amy','Angela','Shirley','Anna','Brenda','Pamela','Emma','Nicole','Helen',
  'Samantha','Katherine','Christine','Debra','Rachel','Carolyn','Janet','Catherine','Maria','Heather'
];

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
  'Turner','Phillips','Evans','Kelly','Stewart','Reed','Morris','Cook','Morgan','Bell',
  'Murphy','Bailey','Cooper','Richardson','Cox','Howard','Ward','Torres','Peterson','Gray',
  'Ramirez','James','Watson','Brooks','Kelly','Sanders','Price','Bennett','Wood','Barnes',
  'Ross','Henderson','Coleman','Jenkins','Perry','Powell','Long','Patterson','Hughes','Flores',
  'Washington','Butler','Simmons','Foster','Gonzales','Bryant','Alexander','Russell','Griffin','Diaz'
];

// Track used names this session
const usedNames = new Set();

function generateUniqueName() {
  let attempts = 0;
  while (attempts < 200) {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const full = first + ' ' + last;
    if (!usedNames.has(full)) {
      usedNames.add(full);
      return { first, last, full };
    }
    attempts++;
  }
  // Fallback with random number suffix
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return { first, last, full: first + ' ' + last };
}

function nameToEmail(first, last, domain) {
  const sep = Math.random() > 0.5 ? '.' : '_';
  const num = Math.floor(Math.random() * 9000) + 100;
  // e.g. james.smith491@domain or jsmith2034@domain
  const style = Math.floor(Math.random() * 3);
  let user;
  if (style === 0) user = (first + sep + last + num).toLowerCase();
  else if (style === 1) user = (first[0] + last + num).toLowerCase();
  else user = (first + last[0] + num).toLowerCase();
  // Remove spaces/special chars
  return user.replace(/[^a-z0-9._]/g, '') + '@' + domain;
}

// ===== FOLLOW MODAL =====
const followModal = document.getElementById('followModal');
const followedBtn = document.getElementById('followedBtn');

if (localStorage.getItem('kbb_followed') === 'yes') {
  followModal.style.display = 'none';
}
followedBtn.addEventListener('click', () => {
  localStorage.setItem('kbb_followed', 'yes');
  followModal.style.display = 'none';
  showToast('Welcome to KingBadBoi Tech! 👑');
});

// ===== DOM REFS =====
const emailDisplay   = document.getElementById('emailDisplay');
const nameDisplay    = document.getElementById('nameDisplay');
const copyEmailBtn   = document.getElementById('copyBtn');
const copyNameBtn    = document.getElementById('copyNameBtn');
const generateBtn    = document.getElementById('generateBtn');
const refreshBtn     = document.getElementById('refreshBtn');
const deleteBtn      = document.getElementById('deleteBtn');
const statusMsg      = document.getElementById('statusMsg');
const inboxSection   = document.getElementById('inboxSection');
const messageList    = document.getElementById('messageList');
const msgCount       = document.getElementById('msgCount');
const inboxRefreshBtn= document.getElementById('inboxRefreshBtn');
const msgModal       = document.getElementById('msgModal');
const closeMsgBtn    = document.getElementById('closeMsgBtn');
const deleteMsgBtn   = document.getElementById('deleteMsgBtn');

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

function randomPassword(len = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ===== API HELPER =====
async function apiFetch(path, options) {
  options = options || {};
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch(API + path, Object.assign({}, options, { headers }));
  return res;
}

// ===== GENERATE =====
generateBtn.addEventListener('click', generateEmail);
refreshBtn.addEventListener('click', async function() {
  if (state.accountId && state.token) await deleteAccount();
  generateEmail();
});

async function generateEmail() {
  clearAutoRefresh();
  setStatus('Fetching domains...', 'info');
  emailDisplay.textContent = 'Generating...';
  nameDisplay.textContent  = '...';
  emailDisplay.classList.add('loading');
  generateBtn.disabled = true;

  try {
    const domRes  = await apiFetch('/api/domains');
    const domData = await domRes.json();
    const domains = domData['hydra:member'] || domData.members || [];
    if (!domains.length) throw new Error('No domains available right now');
    const domain = domains[0].domain;

    const nameObj  = generateUniqueName();
    const address  = nameToEmail(nameObj.first, nameObj.last, domain);
    const password = randomPassword();

    setStatus('Creating mailbox...', 'info');

    const accRes  = await apiFetch('/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ address, password })
    });
    const accData = await accRes.json();
    if (!accRes.ok) throw new Error(accData['hydra:description'] || accData.detail || 'Account creation failed');

    state.accountId = accData.id;
    state.email     = address;
    state.password  = password;
    state.fullName  = nameObj.full;

    setStatus('Authenticating...', 'info');

    const tokRes  = await apiFetch('/api/token', {
      method: 'POST',
      body: JSON.stringify({ address, password })
    });
    const tokData = await tokRes.json();
    if (!tokRes.ok) throw new Error('Authentication failed — try again');
    state.token = tokData.token;

    // Update UI
    emailDisplay.classList.remove('loading');
    emailDisplay.textContent = state.email;
    nameDisplay.textContent  = state.fullName;
    copyEmailBtn.disabled = false;
    copyNameBtn.disabled  = false;
    refreshBtn.disabled   = false;
    deleteBtn.disabled    = false;
    setStatus('Ready! Use this email and name to sign up.', 'success');

    inboxSection.classList.remove('hidden');
    loadMessages();
    startAutoRefresh();
    showToast('Email generated! 👑');
  } catch (err) {
    emailDisplay.textContent = 'Error — click Generate again';
    nameDisplay.textContent  = '';
    emailDisplay.classList.remove('loading');
    setStatus('Error: ' + err.message, 'error');
  } finally {
    generateBtn.disabled = false;
  }
}

// ===== COPY =====
copyEmailBtn.addEventListener('click', function() {
  if (!state.email) return;
  navigator.clipboard.writeText(state.email).then(function() {
    showToast('Email copied!');
    copyEmailBtn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(function(){ copyEmailBtn.innerHTML = '<i class="far fa-copy"></i>'; }, 1500);
  });
});
copyNameBtn.addEventListener('click', function() {
  if (!state.fullName) return;
  navigator.clipboard.writeText(state.fullName).then(function() {
    showToast('Name copied!');
    copyNameBtn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(function(){ copyNameBtn.innerHTML = '<i class="far fa-copy"></i>'; }, 1500);
  });
});

// ===== DELETE ACCOUNT =====
deleteBtn.addEventListener('click', async function() {
  if (!confirm('Delete this temp email? All messages will be gone.')) return;
  await deleteAccount();
  resetState();
});
async function deleteAccount() {
  if (!state.accountId || !state.token) return;
  try {
    await apiFetch('/api/accounts/' + state.accountId, { method: 'DELETE' });
  } catch(e) {}
}
function resetState() {
  clearAutoRefresh();
  state = { email:null, password:null, token:null, accountId:null, messages:[], autoRefreshTimer:null, currentMsgId:null, fullName:null };
  emailDisplay.textContent = 'Click Generate to get your email';
  nameDisplay.textContent  = '';
  emailDisplay.classList.remove('loading');
  copyEmailBtn.disabled = true;
  copyNameBtn.disabled  = true;
  refreshBtn.disabled   = true;
  deleteBtn.disabled    = true;
  inboxSection.classList.add('hidden');
  renderEmptyInbox();
  setStatus('');
  showToast('Email deleted');
}

// ===== LOAD MESSAGES =====
inboxRefreshBtn.addEventListener('click', loadMessages);

async function loadMessages() {
  if (!state.token) return;
  inboxRefreshBtn.innerHTML = '<i class="fas fa-sync-alt spin"></i> Refresh';
  try {
    const res  = await apiFetch('/api/messages?page=1');
    if (res.status === 401) {
      // Token expired — re-auth
      await reAuth();
      return loadMessages();
    }
    const data = await res.json();
    const msgs = data['hydra:member'] || data.members || [];
    state.messages = msgs;
    renderMessages(msgs);
  } catch(e) {
    setStatus('Inbox error: ' + e.message, 'error');
  } finally {
    inboxRefreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
  }
}

async function reAuth() {
  if (!state.email || !state.password) return;
  try {
    const res  = await fetch(API + '/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: state.email, password: state.password })
    });
    const data = await res.json();
    if (data.token) state.token = data.token;
  } catch(e) {}
}

function renderEmptyInbox() {
  messageList.innerHTML = '<div class="empty-inbox"><i class="fas fa-envelope-open"></i><p>Inbox empty — use this email &amp; name to register anywhere.</p></div>';
  msgCount.textContent = '0 messages';
}

function renderMessages(msgs) {
  msgCount.textContent = msgs.length + ' message' + (msgs.length !== 1 ? 's' : '');
  if (!msgs.length) { renderEmptyInbox(); return; }

  messageList.innerHTML = msgs.map(function(m) {
    const fromAddr = (m.from && m.from.address) ? m.from.address : String(m.from || 'Unknown');
    const fromName = (m.from && m.from.name)    ? m.from.name    : fromAddr;
    const date     = new Date(m.createdAt).toLocaleString();
    const preview  = m.intro || '';
    const unread   = !m.seen ? 'unread' : '';
    return '<div class="msg-item ' + unread + '" data-id="' + m.id + '" onclick="openMessage(\'' + m.id + '\')">'
      + '<div class="msg-item-from"><span>' + escHtml(fromName) + '</span><span class="msg-item-time">' + date + '</span></div>'
      + '<div class="msg-item-subject">' + escHtml(m.subject || '(No Subject)') + '</div>'
      + '<div class="msg-item-preview">' + escHtml(preview) + '</div>'
      + '</div>';
  }).join('');
}

// ===== OPEN MESSAGE =====
window.openMessage = async function(id) {
  state.currentMsgId = id;
  document.getElementById('msgSubject').textContent = 'Loading...';
  document.getElementById('msgFrom').textContent    = '';
  document.getElementById('msgDate').textContent    = '';
  document.getElementById('msgBody').textContent    = '';
  msgModal.classList.remove('hidden');

  try {
    const res = await apiFetch('/api/messages/' + id);
    if (res.status === 401) { await reAuth(); return window.openMessage(id); }
    const msg = await res.json();

    document.getElementById('msgSubject').textContent = msg.subject || '(No Subject)';
    document.getElementById('msgFrom').textContent    = 'From: ' + ((msg.from && msg.from.address) ? msg.from.address : String(msg.from || 'Unknown'));
    document.getElementById('msgDate').textContent    = new Date(msg.createdAt).toLocaleString();

    // Extract body — prefer HTML stripped, fallback to text
    let body = '';
    if (msg.html && msg.html.length) {
      const raw = Array.isArray(msg.html) ? msg.html.join('') : msg.html;
      const tmp = document.createElement('div');
      tmp.innerHTML = raw;
      // Remove script/style tags
      tmp.querySelectorAll('script,style').forEach(function(el){ el.remove(); });
      body = tmp.innerText || tmp.textContent || '';
    } else if (msg.text) {
      body = msg.text;
    } else {
      body = '(Empty message)';
    }
    document.getElementById('msgBody').textContent = body.trim();

    const el = document.querySelector('[data-id="' + id + '"]');
    if (el) el.classList.remove('unread');
  } catch(e) {
    document.getElementById('msgBody').textContent = 'Failed to load message.';
  }
};

closeMsgBtn.addEventListener('click', function(){ msgModal.classList.add('hidden'); });
msgModal.addEventListener('click', function(e){ if (e.target === msgModal) msgModal.classList.add('hidden'); });

deleteMsgBtn.addEventListener('click', async function() {
  if (!state.currentMsgId) return;
  try {
    await apiFetch('/api/messages/' + state.currentMsgId, { method: 'DELETE' });
    msgModal.classList.add('hidden');
    state.messages = state.messages.filter(function(m){ return m.id !== state.currentMsgId; });
    renderMessages(state.messages);
    showToast('Message deleted');
  } catch(e) {
    showToast('Delete failed');
  }
});

// ===== AUTO REFRESH (every 8 seconds) =====
function startAutoRefresh() {
  clearAutoRefresh();
  state.autoRefreshTimer = setInterval(loadMessages, 8000);
}
function clearAutoRefresh() {
  if (state.autoRefreshTimer) { clearInterval(state.autoRefreshTimer); state.autoRefreshTimer = null; }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

