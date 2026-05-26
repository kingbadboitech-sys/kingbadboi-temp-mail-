// ===== GUERRILLA MAIL =====
const G = {
  sid: null, email: null, fullName: null,
  timer: null, seq: 0, currentMsgId: null
};

const G_DOMAINS = [
  'guerrillamailblock.com','guerrillamail.com','guerrillamail.biz',
  'guerrillamail.de','guerrillamail.net','guerrillamail.org',
  'grr.la','spam4.me','sharklasers.com','guerrillamail.info'
];

async function gGenerate() {
  gStopTimer();
  gStatus('Getting email address...','info');
  gEl('g-emailDisplay').textContent = 'Please wait...';
  gEl('g-emailDisplay').classList.add('loading');
  gEl('g-nameDisplay').textContent = '...';
  gEl('g-generate').disabled = true;

  try {
    // Step 1: get session + address
    const r = await fetch('/api/guerrilla/address');
    const d = await r.json();
    if (!d.sid_token) throw new Error('Could not get session from Guerrilla Mail');
    G.sid = d.sid_token;

    // Step 2: pick name + random domain, set custom username
    const name = pickRandomName();
    G.fullName = name.full;
    const user = (name.first + name.last + Math.floor(Math.random()*9000+100)).toLowerCase().replace(/[^a-z0-9]/g,'');

    const sr = await fetch('/api/guerrilla/set?user=' + encodeURIComponent(user) + '&sid=' + G.sid);
    const sd = await sr.json();
    G.email = sd.email_addr || (user + '@guerrillamailblock.com');
    G.seq = 0;

    gEl('g-emailDisplay').classList.remove('loading');
    gEl('g-emailDisplay').textContent = G.email;
    gEl('g-nameDisplay').textContent = G.fullName;
    gEl('g-copyEmail').disabled = false;
    gEl('g-copyName').disabled = false;
    gEl('g-new').disabled = false;
    gEl('g-delete').disabled = false;
    gStatus('✓ Ready — copy name & email to sign up anywhere','success');
    gEl('g-inboxSection').classList.remove('hidden');
    gFetchMsgs(false);
    gStartTimer();
    showToast('Guerrilla identity generated! 💀');
  } catch(e) {
    gEl('g-emailDisplay').classList.remove('loading');
    gEl('g-emailDisplay').textContent = 'Failed — try again';
    gEl('g-nameDisplay').textContent = '';
    gStatus('✗ ' + e.message, 'error');
  } finally {
    gEl('g-generate').disabled = false;
  }
}

async function gFetchMsgs(isAuto) {
  if (!G.sid) return;
  if (!isAuto) gEl('g-refresh').innerHTML = '<i class="fas fa-sync-alt spin"></i>';
  try {
    const r = await fetch('/api/guerrilla/check?sid=' + G.sid + '&seq=' + G.seq);
    const d = await r.json();
    const list = d.list || [];
    // Update seq to latest mail_id
    if (list.length) G.seq = list[0].mail_id;
    // Get full list
    const lr = await fetch('/api/guerrilla/list?sid=' + G.sid + '&offset=0');
    const ld = await lr.json();
    const msgs = ld.list || [];
    const prev = parseInt(gEl('g-msgCount').textContent) || 0;
    gRenderMsgs(msgs);
    if (isAuto && msgs.length > prev) showToast('📬 New message arrived!', 3000);
  } catch(e) {
    if (!isAuto) showToast('Inbox error: ' + e.message, 3000);
  } finally {
    if (!isAuto) gEl('g-refresh').innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
  }
}

function gRenderMsgs(msgs) {
  gEl('g-msgCount').textContent = msgs.length + ' message' + (msgs.length !== 1 ? 's' : '');
  if (!msgs.length) {
    gEl('g-msgList').innerHTML = '<div class="empty-box"><i class="fas fa-envelope-open"></i><p>Inbox empty — sign up anywhere using the email above</p></div>';
    return;
  }
  gEl('g-msgList').innerHTML = msgs.map(m => {
    const from = m.mail_from || 'Unknown';
    const subj = htmlDecode(m.mail_subject || '(No Subject)');
    const prev = htmlDecode(m.mail_excerpt || '');
    const date = m.mail_date || '';
    const unread = m.mail_read === '0' ? ' unread' : '';
    return '<div class="msg-item' + unread + '" onclick="gOpenMsg(\'' + m.mail_id + '\')">'
      + '<div class="msg-top"><span class="msg-sender">' + esc(from) + '</span><span class="msg-time">' + esc(date) + '</span></div>'
      + '<div class="msg-subj">' + esc(subj) + '</div>'
      + '<div class="msg-prev">' + esc(prev) + '</div>'
      + '</div>';
  }).join('');
}

window.gOpenMsg = async function(id) {
  G.currentMsgId = id;
  openModal('Loading...', '', '', '');
  try {
    const r = await fetch('/api/guerrilla/fetch?sid=' + G.sid + '&id=' + id);
    const msg = await r.json();
    const subj = htmlDecode(msg.mail_subject || '(No Subject)');
    const from = msg.mail_from || 'Unknown';
    const date = msg.mail_date || '';
    // Prefer body text
    let body = '';
    if (msg.mail_body) {
      const tmp = document.createElement('div');
      tmp.innerHTML = msg.mail_body;
      tmp.querySelectorAll('script,style,iframe').forEach(el => el.remove());
      body = (tmp.innerText || tmp.textContent || '').trim();
    }
    if (!body && msg.mail_excerpt) body = htmlDecode(msg.mail_excerpt);
    openModal(subj, 'From: ' + from, date, body);
    // mark read in UI
    const el = document.querySelector('[onclick="gOpenMsg(\'' + id + '\')"]');
    if (el) el.classList.remove('unread');
  } catch(e) {
    document.getElementById('mBody').textContent = 'Failed to load: ' + e.message;
  }
};

window.gDeleteMsg = async function() {
  if (!G.currentMsgId) return;
  closeModal();
  gFetchMsgs(false);
  showToast('Deleted ✓');
};

function gStartTimer() { gStopTimer(); G.timer = setInterval(() => gFetchMsgs(true), 7000); }
function gStopTimer() { if (G.timer) { clearInterval(G.timer); G.timer = null; } }
function gStatus(msg, type) { const el = gEl('g-status'); el.textContent = msg; el.className = 'status-msg' + (type ? ' ' + type : ''); }
function gEl(id) { return document.getElementById(id); }

// Button wiring (called from main.js after DOM ready)
function initGuerrillaButtons() {
  gEl('g-generate').addEventListener('click', gGenerate);
  gEl('g-new').addEventListener('click', async () => {
    gStopTimer();
    G.sid = null; G.email = null; G.fullName = null; G.seq = 0;
    gEl('g-emailDisplay').textContent = 'Click Generate below';
    gEl('g-nameDisplay').textContent = 'Click Generate below';
    gEl('g-emailDisplay').classList.add('dim');
    gEl('g-nameDisplay').classList.add('dim');
    gEl('g-copyEmail').disabled = true; gEl('g-copyName').disabled = true;
    gEl('g-new').disabled = true; gEl('g-delete').disabled = true;
    gEl('g-inboxSection').classList.add('hidden');
    gStatus('');
    gGenerate();
  });
  gEl('g-delete').addEventListener('click', async () => {
    if (!confirm('Delete this email?')) return;
    gStopTimer();
    if (G.sid) { try { await fetch('/api/guerrilla/forget?sid=' + G.sid); } catch(e) {} }
    G.sid = null; G.email = null; G.fullName = null; G.seq = 0;
    gEl('g-emailDisplay').textContent = 'Click Generate below';
    gEl('g-nameDisplay').textContent = 'Click Generate below';
    gEl('g-copyEmail').disabled = true; gEl('g-copyName').disabled = true;
    gEl('g-new').disabled = true; gEl('g-delete').disabled = true;
    gEl('g-inboxSection').classList.add('hidden');
    gStatus('');
    showToast('Deleted ✓');
  });
  gEl('g-copyEmail').addEventListener('click', () => {
    if (!G.email) return;
    navigator.clipboard.writeText(G.email).then(() => {
      showToast('Email copied! 📋');
      gEl('g-copyEmail').innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => gEl('g-copyEmail').innerHTML = '<i class="far fa-copy"></i>', 1600);
    });
  });
  gEl('g-copyName').addEventListener('click', () => {
    if (!G.fullName) return;
    navigator.clipboard.writeText(G.fullName).then(() => {
      showToast('Name copied! 📋');
      gEl('g-copyName').innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => gEl('g-copyName').innerHTML = '<i class="far fa-copy"></i>', 1600);
    });
  });
  gEl('g-refresh').addEventListener('click', () => gFetchMsgs(false));
}
