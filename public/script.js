// ===== KingBadBoi Tech TempMail =====

let state = {
  email: null, password: null, token: null,
  accountId: null, messages: [], timer: null,
  fullName: null, currentMsgId: null
};

// ===== US NAMES =====
const FIRST = ['James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles',
  'Christopher','Daniel','Matthew','Anthony','Mark','Donald','Steven','Paul','Andrew','Joshua',
  'Kenneth','Kevin','Brian','George','Timothy','Ronald','Edward','Jason','Jeffrey','Ryan',
  'Mary','Patricia','Jennifer','Linda','Barbara','Elizabeth','Susan','Jessica','Sarah','Karen',
  'Lisa','Nancy','Betty','Margaret','Sandra','Ashley','Dorothy','Kimberly','Emily','Donna',
  'Michelle','Carol','Amanda','Melissa','Deborah','Stephanie','Rebecca','Sharon','Laura','Cynthia',
  'Samantha','Katherine','Christine','Rachel','Carolyn','Janet','Catherine','Maria','Heather','Anna'];

const LAST = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
  'Turner','Phillips','Evans','Kelly','Stewart','Reed','Morris','Cook','Morgan','Bell',
  'Washington','Butler','Simmons','Foster','Bryant','Alexander','Russell','Griffin','Diaz','Hayes'];

const usedCombos = new Set();

function pickName() {
  for (let i = 0; i < 300; i++) {
    const f = FIRST[Math.floor(Math.random() * FIRST.length)];
    const l = LAST[Math.floor(Math.random() * LAST.length)];
    const key = f + l;
    if (!usedCombos.has(key)) { usedCombos.add(key); return { first: f, last: l, full: f + ' ' + l }; }
  }
  const f = FIRST[Math.floor(Math.random() * FIRST.length)];
  const l = LAST[Math.floor(Math.random() * LAST.length)];
  return { first: f, last: l, full: f + ' ' + l };
}

function makeAddress(first, last, domain) {
  const n = Math.floor(Math.random() * 8000) + 100;
  const styles = [
    first.toLowerCase() + '.' + last.toLowerCase() + n,
    first.toLowerCase() + last.toLowerCase() + n,
    first[0].toLowerCase() + last.toLowerCase() + n,
    last.toLowerCase() + first[0].toLowerCase() + n,
    first.toLowerCase() + '_' + last.toLowerCase() + n
  ];
  const u = styles[Math.floor(Math.random() * styles.length)].replace(/[^a-z0-9._]/g, '');
  return u + '@' + domain;
}

function randPass() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({length: 16}, () => c[Math.floor(Math.random() * c.length)]).join('');
}

// ===== MODAL =====
const followModal = document.getElementById('followModal');
if (localStorage.getItem('kbb_followed') === '1') followModal.style.display = 'none';
document.getElementById('followedBtn').addEventListener('click', () => {
  localStorage.setItem('kbb_followed', '1');
  followModal.style.display = 'none';
  toast('Welcome! 👑');
});

// ===== DOM =====
const elEmail    = document.getElementById('emailDisplay');
const elName     = document.getElementById('nameDisplay');
const elStatus   = document.getElementById('statusMsg');
const elInbox    = document.getElementById('inboxSection');
const elMsgList  = document.getElementById('messageList');
const elMsgCount = document.getElementById('msgCount');
const elModal    = document.getElementById('msgModal');
const btnGen     = document.getElementById('generateBtn');
const btnNew     = document.getElementById('refreshBtn');
const btnDel     = document.getElementById('deleteBtn');
const btnCpEmail = document.getElementById('copyBtn');
const btnCpName  = document.getElementById('copyNameBtn');
const btnIRefresh= document.getElementById('inboxRefreshBtn');
const btnClose   = document.getElementById('closeMsgBtn');
const btnDelMsg  = document.getElementById('deleteMsgBtn');

// Toast
const toastEl = document.createElement('div');
toastEl.id = 'toast';
document.body.appendChild(toastEl);
function toast(msg, ms) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), ms || 2500);
}
function status(msg, type) {
  elStatus.textContent = msg;
  elStatus.className = 'status-msg' + (type ? ' ' + type : '');
}

// ===== API =====
async function api(path, opts) {
  opts = opts || {};
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  if (opts.headers) Object.assign(headers, opts.headers);
  const res = await fetch(path, Object.assign({}, opts, { headers }));
  return res;
}

// ===== GENERATE =====
async function generate() {
  stopTimer();
  status('Fetching domain...', 'info');
  elEmail.textContent = 'Please wait...';
  elName.textContent = '...';
  elEmail.classList.add('loading');
  btnGen.disabled = true;

  try {
    // Step 1 — get domain
    const dr = await api('/api/domains');
    if (!dr.ok) throw new Error('Could not reach mail server (status ' + dr.status + ')');
    const dd = await dr.json();
    const domains = dd['hydra:member'] || dd.members || [];
    if (!domains.length) throw new Error('No domains available — try again in a moment');
    const latDomain = domains.find(d => d.domain && d.domain.endsWith('.lat'));
    const domain = latDomain ? latDomain.domain : domains[0].domain;

    // Step 2 — build identity
    const name = pickName();
    const address = makeAddress(name.first, name.last, domain);
    const password = randPass();
    status('Creating mailbox...', 'info');

    // Step 3 — create account
    const ar = await api('/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ address, password })
    });
    const ad = await ar.json();
    if (!ar.ok) throw new Error(ad['hydra:description'] || ad.detail || ad.message || 'Account error (code ' + ar.status + ')');

    state.accountId = ad.id;
    state.email = address;
    state.password = password;
    state.fullName = name.full;

    // Step 4 — get token
    status('Authenticating...', 'info');
    const tr = await api('/api/token', {
      method: 'POST',
      body: JSON.stringify({ address, password })
    });
    const td = await tr.json();
    if (!tr.ok) throw new Error(td.message || td['hydra:description'] || 'Auth failed (code ' + tr.status + ')');
    state.token = td.token;

    // Done
    elEmail.classList.remove('loading');
    elEmail.textContent = address;
    elName.textContent = name.full;
    btnCpEmail.disabled = false;
    btnCpName.disabled = false;
    btnNew.disabled = false;
    btnDel.disabled = false;
    status('✓ Ready! Copy the name and email to sign up anywhere.', 'success');
    elInbox.classList.remove('hidden');
    loadMsgs();
    startTimer();
    toast('Email generated! 👑');
  } catch(e) {
    elEmail.classList.remove('loading');
    elEmail.textContent = 'Failed — click Generate again';
    elName.textContent = '';
    status('✗ ' + e.message, 'error');
    toast(e.message, 4000);
  } finally {
    btnGen.disabled = false;
  }
}

btnGen.addEventListener('click', generate);
btnNew.addEventListener('click', async () => {
  if (state.accountId) {
    try { await api('/api/accounts/' + state.accountId, { method: 'DELETE' }); } catch(e) {}
  }
  state = { email:null, password:null, token:null, accountId:null, messages:[], timer:null, fullName:null, currentMsgId:null };
  generate();
});
btnDel.addEventListener('click', async () => {
  if (!confirm('Delete this email? All messages will be gone.')) return;
  stopTimer();
  if (state.accountId) {
    try { await api('/api/accounts/' + state.accountId, { method: 'DELETE' }); } catch(e) {}
  }
  resetUI();
  toast('Deleted ✓');
});

function resetUI() {
  stopTimer();
  state = { email:null, password:null, token:null, accountId:null, messages:[], timer:null, fullName:null, currentMsgId:null };
  elEmail.textContent = 'Click Generate to get your email';
  elName.textContent = 'Generate to get a name';
  elEmail.classList.remove('loading');
  btnCpEmail.disabled = true; btnCpName.disabled = true;
  btnNew.disabled = true; btnDel.disabled = true;
  elInbox.classList.add('hidden');
  elMsgCount.textContent = '0 messages';
  elMsgList.innerHTML = emptyHtml();
  status('');
}

// ===== COPY =====
btnCpEmail.addEventListener('click', () => {
  if (!state.email) return;
  navigator.clipboard.writeText(state.email).then(() => {
    toast('Email copied!');
    btnCpEmail.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => btnCpEmail.innerHTML = '<i class="far fa-copy"></i>', 1600);
  });
});
btnCpName.addEventListener('click', () => {
  if (!state.fullName) return;
  navigator.clipboard.writeText(state.fullName).then(() => {
    toast('Name copied!');
    btnCpName.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => btnCpName.innerHTML = '<i class="far fa-copy"></i>', 1600);
  });
});

// ===== INBOX =====
btnIRefresh.addEventListener('click', loadMsgs);

async function reAuth() {
  if (!state.email || !state.password) return false;
  try {
    const r = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: state.email, password: state.password })
    });
    const d = await r.json();
    if (d.token) { state.token = d.token; return true; }
  } catch(e) {}
  return false;
}

async function loadMsgs(isAuto) {
  if (!state.token) return;
  if (!isAuto) btnIRefresh.innerHTML = '<i class="fas fa-sync-alt spin"></i>';

  try {
    let r = await api('/api/messages?page=1');
    if (r.status === 401) {
      const ok = await reAuth();
      if (ok) r = await api('/api/messages?page=1');
      else return;
    }
    if (!r.ok) throw new Error('status ' + r.status);
    const d = await r.json();
    const msgs = d['hydra:member'] || d.members || [];
    state.messages = msgs;
    renderMsgs(msgs);
  } catch(e) {
    if (!isAuto) toast('Inbox error: ' + e.message, 3000);
  } finally {
    if (!isAuto) btnIRefresh.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
  }
}

function emptyHtml() {
  return '<div class="empty-inbox"><i class="fas fa-envelope-open"></i><p>Inbox empty — sign up somewhere using the email above.</p></div>';
}

function renderMsgs(msgs) {
  elMsgCount.textContent = msgs.length + ' message' + (msgs.length !== 1 ? 's' : '');
  if (!msgs.length) { elMsgList.innerHTML = emptyHtml(); return; }
  elMsgList.innerHTML = msgs.map(m => {
    const from = (m.from && m.from.name) ? m.from.name : (m.from && m.from.address) ? m.from.address : 'Unknown';
    const date = new Date(m.createdAt).toLocaleString();
    return '<div class="msg-item' + (!m.seen ? ' unread' : '') + '" onclick="openMsg(\'' + m.id + '\')">'
      + '<div class="msg-item-top"><span class="msg-from-name">' + esc(from) + '</span><span class="msg-time">' + date + '</span></div>'
      + '<div class="msg-subject">' + esc(m.subject || '(No Subject)') + '</div>'
      + '<div class="msg-preview">' + esc(m.intro || '') + '</div>'
      + '</div>';
  }).join('');
}

// ===== READ MESSAGE =====
window.openMsg = async function(id) {
  state.currentMsgId = id;
  document.getElementById('mSubject').textContent = 'Loading...';
  document.getElementById('mFrom').textContent = '';
  document.getElementById('mDate').textContent = '';
  document.getElementById('mBody').textContent = '';
  elModal.classList.remove('hidden');

  try {
    let r = await api('/api/messages/' + id);
    if (r.status === 401) { await reAuth(); r = await api('/api/messages/' + id); }
    if (!r.ok) throw new Error('Could not load message');
    const msg = await r.json();

    document.getElementById('mSubject').textContent = msg.subject || '(No Subject)';
    document.getElementById('mFrom').textContent = 'From: ' + ((msg.from && msg.from.address) ? msg.from.address : 'Unknown');
    document.getElementById('mDate').textContent = new Date(msg.createdAt).toLocaleString();

    let body = '';
    if (msg.html) {
      const raw = Array.isArray(msg.html) ? msg.html.join('') : msg.html;
      const d = document.createElement('div');
      d.innerHTML = raw;
      d.querySelectorAll('script,style,head').forEach(el => el.remove());
      body = (d.innerText || d.textContent || '').trim();
    }
    if (!body && msg.text) body = msg.text.trim();
    if (!body) body = '(Empty message)';
    document.getElementById('mBody').textContent = body;

    const el = document.querySelector('[onclick="openMsg(\'' + id + '\')"]');
    if (el) el.classList.remove('unread');
  } catch(e) {
    document.getElementById('mBody').textContent = 'Failed to load: ' + e.message;
  }
};

btnClose.addEventListener('click', () => elModal.classList.add('hidden'));
elModal.addEventListener('click', e => { if (e.target === elModal) elModal.classList.add('hidden'); });

btnDelMsg.addEventListener('click', async () => {
  if (!state.currentMsgId) return;
  await api('/api/messages/' + state.currentMsgId, { method: 'DELETE' });
  elModal.classList.add('hidden');
  state.messages = state.messages.filter(m => m.id !== state.currentMsgId);
  renderMsgs(state.messages);
  toast('Deleted ✓');
});

// ===== TIMER =====
function startTimer() {
  stopTimer();
  state.timer = setInterval(() => loadMsgs(true), 7000);
}
function stopTimer() {
  if (state.timer) { clearInterval(state.timer); state.timer = null; }
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
