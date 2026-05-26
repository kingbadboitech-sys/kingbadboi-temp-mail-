// ===== MAIL.TM =====
const M = {
  token: null, accountId: null, email: null,
  password: null, fullName: null, timer: null,
  tokenExpiry: null, currentMsgId: null, domains: []
};

async function mLoadDomains() {
  try {
    const r = await fetch('/api/mailtm/domains');
    const d = await r.json();
    M.domains = d.domains || [];
    const el = document.getElementById('m-domainList');
    el.innerHTML = M.domains.length
      ? M.domains.map(x => '<span class="dtag">@' + esc(x.domain) + '</span>').join('')
      : '<span class="dtag-dim">No domains found</span>';
  } catch(e) { console.log('domain err', e); }
}

async function mGenerate() {
  mStopTimer();
  mStatus('Loading domains...', 'info');
  mEl('m-emailDisplay').textContent = 'Please wait...';
  mEl('m-emailDisplay').classList.add('loading');
  mEl('m-nameDisplay').textContent = '...';
  mEl('m-generate').disabled = true;
  try {
    await mLoadDomains();
    if (!M.domains.length) throw new Error('No domains available — try again');
    const dom = M.domains[Math.floor(Math.random() * M.domains.length)].domain;
    const name = pickRandomName();
    M.fullName = name.full;
    const user = (name.first + name.last + Math.floor(Math.random()*8000+100)).toLowerCase().replace(/[^a-z0-9._]/g,'');
    const address = user + '@' + dom;
    const password = randPw();
    mStatus('Creating mailbox on @' + dom + '...', 'info');

    const ar = await fetch('/api/mailtm/accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });
    const ad = await ar.json();
    if (!ar.ok) throw new Error(ad['hydra:description'] || ad.detail || ad.message || 'Account error ' + ar.status);
    M.accountId = ad.id; M.email = address; M.password = password;

    mStatus('Authenticating...', 'info');
    const tr = await fetch('/api/mailtm/token', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });
    const td = await tr.json();
    if (!tr.ok) throw new Error(td.message || 'Auth failed ' + tr.status);
    M.token = td.token;
    M.tokenExpiry = Date.now() + 55 * 60 * 1000;

    mEl('m-emailDisplay').classList.remove('loading');
    mEl('m-emailDisplay').textContent = address;
    mEl('m-nameDisplay').textContent = M.fullName;
    mEl('m-copyEmail').disabled = false; mEl('m-copyName').disabled = false;
    mEl('m-new').disabled = false; mEl('m-delete').disabled = false;
    mStatus('✓ Ready — copy name & email to sign up anywhere', 'success');
    mEl('m-inboxSection').classList.remove('hidden');
    mFetchMsgs(false);
    mStartTimer();
    showToast('Mail.tm identity generated! ✉️');
  } catch(e) {
    mEl('m-emailDisplay').classList.remove('loading');
    mEl('m-emailDisplay').textContent = 'Failed — try again';
    mEl('m-nameDisplay').textContent = '';
    mStatus('✗ ' + e.message, 'error');
  } finally {
    mEl('m-generate').disabled = false;
  }
}

async function mEnsureToken() {
  if (!M.email || !M.password) return false;
  if (M.tokenExpiry && Date.now() < M.tokenExpiry) return true;
  try {
    const r = await fetch('/api/mailtm/token', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: M.email, password: M.password })
    });
    const d = await r.json();
    if (d.token) { M.token = d.token; M.tokenExpiry = Date.now() + 55 * 60 * 1000; return true; }
  } catch(e) {}
  return false;
}

async function mFetchMsgs(isAuto) {
  if (!M.token) return;
  if (!isAuto) mEl('m-refresh').innerHTML = '<i class="fas fa-sync-alt spin"></i>';
  try {
    await mEnsureToken();
    const r = await fetch('/api/mailtm/messages', {
      headers: { 'Authorization': 'Bearer ' + M.token }
    });
    if (r.status === 401) { M.tokenExpiry = 0; await mEnsureToken(); return mFetchMsgs(isAuto); }
    const d = await r.json();
    const msgs = d['hydra:member'] || d.members || [];
    const prev = parseInt(mEl('m-msgCount').textContent) || 0;
    mRenderMsgs(msgs);
    if (isAuto && msgs.length > prev) showToast('📬 New message arrived!', 3000);
  } catch(e) {
    if (!isAuto) showToast('Inbox error: ' + e.message, 3000);
  } finally {
    if (!isAuto) mEl('m-refresh').innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
  }
}

function mRenderMsgs(msgs) {
  mEl('m-msgCount').textContent = msgs.length + ' message' + (msgs.length !== 1 ? 's' : '');
  if (!msgs.length) {
    mEl('m-msgList').innerHTML = '<div class="empty-box"><i class="fas fa-envelope-open"></i><p>Inbox empty — sign up anywhere using the email above</p></div>';
    return;
  }
  mEl('m-msgList').innerHTML = msgs.map(m => {
    const from = (m.from && m.from.name) ? m.from.name : (m.from && m.from.address) ? m.from.address : 'Unknown';
    const date = new Date(m.createdAt).toLocaleString();
    return '<div class="msg-item' + (!m.seen ? ' unread' : '') + '" onclick="mOpenMsg(\'' + m.id + '\')">'
      + '<div class="msg-top"><span class="msg-sender">' + esc(from) + '</span><span class="msg-time">' + date + '</span></div>'
      + '<div class="msg-subj">' + esc(m.subject || '(No Subject)') + '</div>'
      + '<div class="msg-prev">' + esc(m.intro || '') + '</div>'
      + '</div>';
  }).join('');
}

window.mOpenMsg = async function(id) {
  M.currentMsgId = id;
  openModal('Loading...', '', '', '');
  try {
    await mEnsureToken();
    const r = await fetch('/api/mailtm/messages/' + id, {
      headers: { 'Authorization': 'Bearer ' + M.token }
    });
    const msg = await r.json();
    let body = '';
    if (msg.html) {
      const raw = Array.isArray(msg.html) ? msg.html.join('') : msg.html;
      const tmp = document.createElement('div');
      tmp.innerHTML = raw;
      tmp.querySelectorAll('script,style,iframe').forEach(el => el.remove());
      body = (tmp.innerText || tmp.textContent || '').trim();
    }
    if (!body && msg.text) body = msg.text.trim();
    if (!body) body = '(Empty message)';
    const from = (msg.from && msg.from.address) ? msg.from.address : 'Unknown';
    openModal(msg.subject || '(No Subject)', 'From: ' + from, new Date(msg.createdAt).toLocaleString(), body);
    const el = document.querySelector('[onclick="mOpenMsg(\'' + id + '\')"]');
    if (el) el.classList.remove('unread');
  } catch(e) {
    document.getElementById('mBody').textContent = 'Failed to load: ' + e.message;
  }
};

window.mDeleteCurrentMsg = async function() {
  if (!M.currentMsgId) return;
  try {
    await fetch('/api/mailtm/messages/' + M.currentMsgId, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + M.token }
    });
  } catch(e) {}
  closeModal();
  mFetchMsgs(false);
  showToast('Deleted ✓');
};

function mStartTimer() { mStopTimer(); M.timer = setInterval(() => mFetchMsgs(true), 7000); }
function mStopTimer() { if (M.timer) { clearInterval(M.timer); M.timer = null; } }
function mStatus(msg, type) { const el = mEl('m-status'); el.textContent = msg; el.className = 'status-msg' + (type ? ' ' + type : ''); }
function mEl(id) { return document.getElementById(id); }

function initMailtmButtons() {
  mEl('m-generate').addEventListener('click', mGenerate);
  mEl('m-new').addEventListener('click', async () => {
    mStopTimer();
    if (M.accountId) { try { await fetch('/api/mailtm/accounts/' + M.accountId, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + M.token } }); } catch(e) {} }
    M.token = null; M.accountId = null; M.email = null; M.password = null; M.fullName = null;
    mEl('m-emailDisplay').textContent = 'Click Generate below';
    mEl('m-nameDisplay').textContent = 'Click Generate below';
    mEl('m-copyEmail').disabled = true; mEl('m-copyName').disabled = true;
    mEl('m-new').disabled = true; mEl('m-delete').disabled = true;
    mEl('m-inboxSection').classList.add('hidden');
    mStatus('');
    mGenerate();
  });
  mEl('m-delete').addEventListener('click', async () => {
    if (!confirm('Delete this email?')) return;
    mStopTimer();
    if (M.accountId) { try { await fetch('/api/mailtm/accounts/' + M.accountId, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + M.token } }); } catch(e) {} }
    M.token = null; M.accountId = null; M.email = null; M.password = null; M.fullName = null;
    mEl('m-emailDisplay').textContent = 'Click Generate below';
    mEl('m-nameDisplay').textContent = 'Click Generate below';
    mEl('m-copyEmail').disabled = true; mEl('m-copyName').disabled = true;
    mEl('m-new').disabled = true; mEl('m-delete').disabled = true;
    mEl('m-inboxSection').classList.add('hidden');
    mStatus('');
    showToast('Deleted ✓');
  });
  mEl('m-copyEmail').addEventListener('click', () => {
    if (!M.email) return;
    navigator.clipboard.writeText(M.email).then(() => {
      showToast('Email copied! 📋');
      mEl('m-copyEmail').innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => mEl('m-copyEmail').innerHTML = '<i class="far fa-copy"></i>', 1600);
    });
  });
  mEl('m-copyName').addEventListener('click', () => {
    if (!M.fullName) return;
    navigator.clipboard.writeText(M.fullName).then(() => {
      showToast('Name copied! 📋');
      mEl('m-copyName').innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => mEl('m-copyName').innerHTML = '<i class="far fa-copy"></i>', 1600);
    });
  });
  mEl('m-refresh').addEventListener('click', () => mFetchMsgs(false));
}
