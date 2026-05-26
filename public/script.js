/* ═══════════════════════════════════════════════════════════════════
   KingBadBoi TempMail v3 · script.js
   Two engines: Guerrilla Mail + Mail.tm
   Real people names · All domains · Auto-poll
═══════════════════════════════════════════════════════════════════ */

// ── REAL PEOPLE NAME BANKS ────────────────────────────────────────
const FIRST_NAMES = [
  'James','Oliver','William','Henry','Charles','George','Edward','Thomas',
  'Alexander','Benjamin','Samuel','Joseph','Michael','Robert','David',
  'Emily','Sophia','Charlotte','Amelia','Isabella','Mia','Evelyn','Harper',
  'Sofia','Camila','Luna','Grace','Chloe','Penelope','Layla','Eleanor',
  'Liam','Noah','Ethan','Mason','Logan','Lucas','Jackson','Aiden',
  'Mohammed','Yusuf','Omar','Ibrahim','Hassan','Ali','Fatima','Aisha',
  'Carlos','Diego','Miguel','Lucia','Valentina','Gabriela','Santiago',
  'Wei','Min','Jing','Xiao','Li','Mei','Zhang','Liu',
  'Arjun','Priya','Rahul','Neha','Akash','Divya','Rohit','Ananya',
  'Ivan','Nikolai','Anastasia','Elena','Dmitri','Olga','Sergei',
  'Lena','Jonas','Emma','Felix','Anna','Max','Julia','Leon','Hannah',
  'Pierre','Marie','Jacques','Isabelle','François','Camille',
  'Yuki','Kenji','Hana','Takeshi','Sakura','Ryo','Akira','Natsuki',
  'Kwame','Amara','Chioma','Emeka','Ngozi','Kofi','Ade','Zara',
];

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
  'Wilson','Anderson','Taylor','Thomas','Jackson','White','Harris',
  'Martin','Thompson','Young','Walker','Allen','King','Wright','Scott',
  'Green','Baker','Adams','Nelson','Carter','Mitchell','Perez',
  'Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Sanchez',
  'Müller','Schmidt','Fischer','Weber','Meyer','Wagner','Becker',
  'Rossi','Ferrari','Russo','Colombo','Ricci','Marino','Greco',
  'Dubois','Bernard','Thomas','Robert','Richard','Petit','Moreau',
  'Tanaka','Suzuki','Sato','Watanabe','Ito','Yamamoto','Nakamura',
  'Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon',
  'Patel','Shah','Kumar','Singh','Sharma','Gupta','Verma','Joshi',
  'Mensah','Osei','Agyei','Asante','Boateng','Owusu','Amoah',
  'Ivanov','Petrov','Sidorov','Kuznetsov','Popov','Sokolov',
  'Andersen','Nielsen','Hansen','Pedersen','Christensen','Jensen',
  'Chen','Wang','Li','Zhang','Liu','Yang','Huang','Zhou',
  'Ahmed','Hassan','Ali','Mohammed','Ibrahim','Khalil','Nasser',
];

function randomName() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return { first: f, last: l };
}

function buildUsername(first, last) {
  const sep = ['.','-','_',''][Math.floor(Math.random()*4)];
  const num = Math.random() < 0.4 ? Math.floor(Math.random()*9999) : '';
  return (first + sep + last + num).toLowerCase().replace(/[^a-z0-9._-]/g,'');
}

// ── PAGE SWITCHER ─────────────────────────────────────────────────
let currentPage = 'gm';
function switchPage(page) {
  currentPage = page;
  document.getElementById('pageGM').classList.toggle('active', page === 'gm');
  document.getElementById('pageTM').classList.toggle('active', page === 'tm');
  document.getElementById('tabGM').classList.toggle('active', page === 'gm');
  document.getElementById('tabTM').classList.toggle('active', page === 'tm');
  document.getElementById('tabTM').classList.toggle('tm', page === 'tm');
}

// ── PARTICLES ─────────────────────────────────────────────────────
function initParticles() {
  const cv = document.getElementById('particles');
  const cx = cv.getContext('2d');
  let W = cv.width = innerWidth, H = cv.height = innerHeight;
  const pts = Array.from({length:60}, () => ({
    x: Math.random()*W, y: Math.random()*H,
    vx:(Math.random()-.5)*.35, vy:(Math.random()-.5)*.35,
    r: Math.random()*1.4+.3, a: Math.random()*.3+.07,
    c: ['#ff1f3d','#00ffe0','#ffd700','#a855f7'][Math.floor(Math.random()*4)]
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
  addEventListener('resize',()=>{W=cv.width=innerWidth;H=cv.height=innerHeight;});
}

// ── TOAST ─────────────────────────────────────────────────────────
function toast(msg, dur=2800) {
  document.querySelector('.toast')?.remove();
  const t = Object.assign(document.createElement('div'),{className:'toast',textContent:msg});
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), dur);
}

// ── ESC ───────────────────────────────────────────────────────────
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── DEVICE ID ─────────────────────────────────────────────────────
function deviceId() {
  let id = localStorage.getItem('kbb_did');
  if (!id) { id='kbb_'+Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem('kbb_did',id); }
  return id;
}

// ── VISITOR COUNT ─────────────────────────────────────────────────
async function registerVisitor() {
  try {
    const r = await fetch('/api/visit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deviceId:deviceId()})});
    const d = await r.json();
    document.getElementById('visitorCount').textContent = d.count.toLocaleString();
  } catch {}
}

// ── FOLLOW GATE ───────────────────────────────────────────────────
function initGate() {
  const gate = document.getElementById('followGate');
  const app  = document.getElementById('app');
  if (localStorage.getItem('kbb_unlocked')==='1') {
    gate.style.display='none'; app.classList.remove('hidden');
    registerVisitor(); return;
  }
  document.getElementById('followBtn').addEventListener('click',()=>localStorage.setItem('kbb_tapped_follow','1'));
  document.getElementById('unlockBtn').addEventListener('click',()=>{
    if (!localStorage.getItem('kbb_tapped_follow')) { toast('⚠ Please tap JOIN WHATSAPP CHANNEL first!'); return; }
    localStorage.setItem('kbb_unlocked','1');
    gate.style.display='none'; app.classList.remove('hidden');
    registerVisitor();
  });
}

// ── DOMAIN CHIPS HELPER ───────────────────────────────────────────
function buildChips(containerId, selectId, domains) {
  const container = document.getElementById(containerId);
  const select    = document.getElementById(selectId);
  // Populate select
  select.innerHTML = domains.map(d=>`<option value="${d}">${d}</option>`).join('');
  // Build chips
  container.innerHTML = domains.map(d=>`<span class="domain-chip" data-domain="${d}" onclick="selectDomain('${containerId}','${selectId}','${d}')">${d}</span>`).join('');
  // Activate first
  const first = container.querySelector('.domain-chip');
  if (first) first.classList.add('active-chip');
}

function selectDomain(containerId, selectId, domain) {
  document.getElementById(selectId).value = domain;
  document.querySelectorAll(`#${containerId} .domain-chip`).forEach(c=>{
    c.classList.toggle('active-chip', c.dataset.domain === domain);
  });
}

// ── VIEWER (shared) ───────────────────────────────────────────────
let viewerDeleteFn = null;
function openViewer(from, subject, date, bodyHtml, isHtml, deleteFn) {
  document.getElementById('viewerMeta').innerHTML = `
    <div class="vm-from">FROM: ${esc(from)}</div>
    <div class="vm-sub">${esc(subject)}</div>
    <div class="vm-date">${esc(date)}</div>`;

  const bodyEl = document.getElementById('viewerBody');
  if (isHtml && bodyHtml) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText='width:100%;border:none;min-height:300px;background:#fff;display:block';
    iframe.sandbox='allow-same-origin';
    bodyEl.innerHTML='';
    bodyEl.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(bodyHtml);
    iframe.contentDocument.close();
    setTimeout(()=>{try{iframe.style.height=iframe.contentDocument.body.scrollHeight+30+'px';}catch{}},300);
  } else {
    bodyEl.innerHTML=`<pre style="white-space:pre-wrap;font-family:var(--ff-mono);font-size:13px;color:var(--txt)">${esc(bodyHtml||'(empty)')}</pre>`;
  }

  viewerDeleteFn = deleteFn;
  document.getElementById('viewerFooter').innerHTML =
    `<button class="btn-del-email" onclick="viewerDeleteFn && viewerDeleteFn()">🗑 DELETE THIS EMAIL</button>`;
  document.getElementById('viewerOverlay').style.display='flex';
}

function closeViewer() {
  document.getElementById('viewerOverlay').style.display='none';
}

// ════════════════════════════════════════════════════════════════════
//  GUERRILLA MAIL ENGINE
// ════════════════════════════════════════════════════════════════════
const gm = {
  email:null, sid_token:null, mails:[], seqId:0,
  pollTimer:null, countTimer:null, secsLeft:3600, polling:false
};

async function gmLoadDomains() {
  try {
    const r = await fetch('/api/gm/domains');
    const d = await r.json();
    buildChips('gmDomainChips','gmDomain', d.domains);
    // Suggest a random name
    const n = randomName();
    document.getElementById('gmFirstName').value = n.first;
    document.getElementById('gmLastName').value  = n.last;
  } catch { toast('⚠ Could not load GM domains'); }
}

async function gmGenerate() {
  const firstName = document.getElementById('gmFirstName').value.trim() || randomName().first;
  const lastName  = document.getElementById('gmLastName').value.trim()  || randomName().last;
  const domain    = document.getElementById('gmDomain').value;
  const user      = buildUsername(firstName, lastName);

  const btn = document.getElementById('gmGenerateBtn');
  btn.innerHTML='<span class="spin"></span> GENERATING...'; btn.disabled=true;

  gmStopPolling(); gm.mails=[]; gm.seqId=0;
  gmRenderInbox([]);
  document.getElementById('gmInboxSection').style.display='none';
  document.getElementById('gmNewMailBanner').style.display='none';

  try {
    const url = domain ? `/api/gm/generate?user=${encodeURIComponent(user)}&domain=${encodeURIComponent(domain)}`
                       : `/api/gm/generate`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    const d = await r.json();

    gm.email     = d.email;
    gm.sid_token = d.sid_token;
    gm.seqId     = 0;

    document.getElementById('gmEmailAddr').textContent = gm.email;
    document.getElementById('gmCopyBtn').style.display='flex';
    document.getElementById('gmInboxBtn').disabled=false;
    document.getElementById('gmInboxAddrTag').textContent = gm.email;
    document.getElementById('gmInboxSection').style.display='block';

    gmStartCountdown();
    gmStartPolling();
    toast(`✅ Shadow email ready! (${firstName} ${lastName})`);
  } catch(err) {
    document.getElementById('gmEmailAddr').innerHTML='<span class="addr-placeholder">⚠ Failed — try again</span>';
    toast('❌ '+( err.message||'Could not generate email'));
  }
  btn.innerHTML='<span class="btn-icon">⚡</span> GENERATE EMAIL'; btn.disabled=false;
}

function gmStartCountdown() {
  clearInterval(gm.countTimer);
  gm.secsLeft=3600;
  document.getElementById('gmCardFooter').style.display='flex';
  const tick=()=>{
    const m=String(Math.floor(gm.secsLeft/60)).padStart(2,'0');
    const s=String(gm.secsLeft%60).padStart(2,'0');
    document.getElementById('gmTimerVal').textContent=`${m}:${s}`;
    if(gm.secsLeft<=0){clearInterval(gm.countTimer);gmStopPolling();toast('⏰ Session expired. Generate a new email.');}
    gm.secsLeft--;
  };
  tick(); gm.countTimer=setInterval(tick,1000);
}

function gmStartPolling() {
  if(gm.polling)return;
  gm.polling=true; gmSetPollUI(true);
  gmPollInbox();
  gm.pollTimer=setInterval(gmPollInbox,5000);
}

function gmStopPolling() {
  clearInterval(gm.pollTimer); gm.pollTimer=null;
  gm.polling=false; gmSetPollUI(false);
}

function gmSetPollUI(active) {
  document.getElementById('gmPollDot').classList.toggle('active',active);
  document.getElementById('gmPollLabel').textContent=active?'Auto-refresh: ON (5s)':'Auto-refresh: OFF';
}

async function gmPollInbox() {
  if(!gm.sid_token)return;
  try {
    const r=await fetch(`/api/gm/check?sid_token=${encodeURIComponent(gm.sid_token)}&seq=${gm.seqId}`);
    if(!r.ok)return;
    const d=await r.json();
    if(!d.list||!d.list.length)return;
    let hasNew=false;
    d.list.forEach(mail=>{
      const id=String(mail.mail_id);
      if(!gm.mails.find(m=>m.id===id)){
        gm.mails.unshift({id,from:mail.mail_from||'Unknown',subject:mail.mail_subject||'(No Subject)',excerpt:mail.mail_excerpt||'',date:mail.mail_date||'',read:false});
        if(parseInt(id)>gm.seqId)gm.seqId=parseInt(id);
        hasNew=true;
      }
    });
    if(hasNew){gmRenderInbox(gm.mails);gmShowNewBanner();}
  } catch {}
}

function gmShowNewBanner() {
  const b=document.getElementById('gmNewMailBanner');
  b.style.display='block';
  clearTimeout(gmShowNewBanner._t);
  gmShowNewBanner._t=setTimeout(()=>b.style.display='none',4000);
  document.getElementById('gmInboxSection').scrollIntoView({behavior:'smooth',block:'start'});
}

async function gmManualCheck() {
  if(!gm.sid_token)return;
  const btn=document.getElementById('gmInboxBtn');
  btn.innerHTML='<span class="spin"></span> SCANNING...'; btn.disabled=true;
  await gmPollInbox();
  btn.innerHTML='<span class="btn-icon">📬</span> CHECK INBOX'; btn.disabled=false;
  document.getElementById('gmInboxSection').scrollIntoView({behavior:'smooth'});
}

function gmRenderInbox(mails) {
  const list=document.getElementById('gmInboxList');
  if(!mails.length){
    list.innerHTML=`<div class="inbox-empty"><div class="empty-icon">🥷</div><p>Inbox in stealth mode...<br><span>Auto-scanning every 5 seconds</span></p></div>`;
    return;
  }
  list.innerHTML=mails.map(m=>`
    <div class="inbox-item ${m.read?'':'unread'}" onclick="gmOpenMail('${m.id}')">
      <div class="inbox-item-icon">${m.read?'📧':'📩'}</div>
      <div class="i-info">
        <div class="i-from">${esc(m.from)}</div>
        <div class="i-subject">${esc(m.subject)}</div>
      </div>
      <div class="i-date">${esc(m.date)}</div>
      <button class="i-del" onclick="event.stopPropagation();gmDeleteMail('${m.id}')" title="Delete">🗑</button>
    </div>`).join('');
}

async function gmOpenMail(id) {
  const m=gm.mails.find(x=>x.id===id);
  if(m){m.read=true;gmRenderInbox(gm.mails);}
  document.getElementById('viewerMeta').innerHTML='<span style="color:var(--dim);font-family:var(--ff-mono)">Loading...</span>';
  document.getElementById('viewerBody').innerHTML='';
  document.getElementById('viewerFooter').innerHTML='';
  document.getElementById('viewerOverlay').style.display='flex';
  try {
    const r=await fetch(`/api/gm/email/${id}?sid_token=${encodeURIComponent(gm.sid_token)}`);
    const d=await r.json();
    const isHtml=/<[a-z][\s\S]*>/i.test(d.body||'');
    openViewer(d.from, d.subject, d.date, d.body, isHtml, ()=>gmDeleteMail(id,true));
  } catch {
    document.getElementById('viewerBody').innerHTML='<p style="color:var(--dim)">Could not load this email.</p>';
  }
}

async function gmDeleteMail(id, closeViewer=false) {
  gm.mails=gm.mails.filter(m=>m.id!==id);
  gmRenderInbox(gm.mails);
  if(closeViewer) document.getElementById('viewerOverlay').style.display='none';
  try{await fetch(`/api/gm/email/${id}?sid_token=${encodeURIComponent(gm.sid_token)}`,{method:'DELETE'});}catch{}
  toast('🗑 Email deleted');
}

function gmCopyEmail() {
  if(!gm.email)return;
  navigator.clipboard.writeText(gm.email).then(()=>{
    const btn=document.getElementById('gmCopyBtn');
    btn.textContent='✅ COPIED'; btn.classList.add('copied');
    setTimeout(()=>{btn.textContent='⧉ COPY';btn.classList.remove('copied');},2000);
    toast('📋 Email copied!');
  });
}

// ════════════════════════════════════════════════════════════════════
//  MAIL.TM ENGINE
// ════════════════════════════════════════════════════════════════════
const tm = {
  email:null, token:null, accountId:null, password:null,
  mails:[], pollTimer:null, polling:false, seenIds:new Set()
};

async function tmLoadDomains() {
  try {
    const r=await fetch('/api/mailtm/domains');
    const d=await r.json();
    buildChips('tmDomainChips','tmDomain',d.domains);
    const n=randomName();
    document.getElementById('tmFirstName').value=n.first;
    document.getElementById('tmLastName').value=n.last;
  } catch { toast('⚠ Could not load Mail.tm domains'); }
}

async function tmGenerate() {
  const firstName=document.getElementById('tmFirstName').value.trim()||randomName().first;
  const lastName =document.getElementById('tmLastName').value.trim() ||randomName().last;
  const domain   =document.getElementById('tmDomain').value;
  if(!domain){toast('⚠ Please select a domain first');return;}

  const user     =buildUsername(firstName,lastName);
  const address  =`${user}@${domain}`;
  const password ='Kbb'+Math.random().toString(36).slice(2,10)+'!9';

  const btn=document.getElementById('tmGenerateBtn');
  btn.innerHTML='<span class="spin"></span> CREATING...'; btn.disabled=true;

  tmStopPolling(); tm.mails=[]; tm.seenIds=new Set();
  tmRenderInbox([]);
  document.getElementById('tmInboxSection').style.display='none';
  document.getElementById('tmNewMailBanner').style.display='none';

  try {
    const r=await fetch('/api/mailtm/generate',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({address,password})
    });
    const d=await r.json();
    if(d.error) throw new Error(d.error);

    tm.email=d.email; tm.token=d.token; tm.accountId=d.id; tm.password=password;

    document.getElementById('tmEmailAddr').textContent=tm.email;
    document.getElementById('tmCopyBtn').style.display='flex';
    document.getElementById('tmInboxBtn').disabled=false;
    document.getElementById('tmInboxAddrTag').textContent=tm.email;
    document.getElementById('tmCardFooter').style.display='flex';
    document.getElementById('tmPassNote').style.display='block';
    document.getElementById('tmInboxSection').style.display='block';

    tmStartPolling();
    toast(`✅ Ghost mailbox ready! (${firstName} ${lastName})`);
  } catch(err) {
    document.getElementById('tmEmailAddr').innerHTML='<span class="addr-placeholder">⚠ Failed — try again</span>';
    toast('❌ '+(err.message||'Could not create mailbox'));
  }
  btn.innerHTML='<span class="btn-icon">🌐</span> CREATE MAILBOX'; btn.disabled=false;
}

function tmStartPolling() {
  if(tm.polling)return;
  tm.polling=true; tmSetPollUI(true);
  tmPollInbox();
  tm.pollTimer=setInterval(tmPollInbox,6000);
}

function tmStopPolling() {
  clearInterval(tm.pollTimer); tm.pollTimer=null;
  tm.polling=false; tmSetPollUI(false);
}

function tmSetPollUI(active) {
  document.getElementById('tmPollDot').classList.toggle('active',active);
  document.getElementById('tmPollLabel').textContent=active?'Auto-refresh: ON (6s)':'Auto-refresh: OFF';
}

async function tmPollInbox() {
  if(!tm.token)return;
  try {
    const r=await fetch(`/api/mailtm/messages?token=${encodeURIComponent(tm.token)}`);
    if(!r.ok)return;
    const d=await r.json();
    let hasNew=false;
    (d.list||[]).forEach(msg=>{
      if(!tm.seenIds.has(msg.id)){
        tm.seenIds.add(msg.id);
        tm.mails.unshift({id:msg.id,from:msg.from,subject:msg.subject,date:msg.date,read:msg.seen});
        hasNew=true;
      }
    });
    // Also update read status
    (d.list||[]).forEach(msg=>{
      const local=tm.mails.find(m=>m.id===msg.id);
      if(local) local.read=msg.seen;
    });
    if(hasNew){tmRenderInbox(tm.mails);tmShowNewBanner();}
    else if(d.list) tmRenderInbox(tm.mails); // refresh read state
  } catch {}
}

function tmShowNewBanner() {
  const b=document.getElementById('tmNewMailBanner');
  b.style.display='block';
  clearTimeout(tmShowNewBanner._t);
  tmShowNewBanner._t=setTimeout(()=>b.style.display='none',4000);
  document.getElementById('tmInboxSection').scrollIntoView({behavior:'smooth',block:'start'});
}

async function tmManualCheck() {
  if(!tm.token)return;
  const btn=document.getElementById('tmInboxBtn');
  btn.innerHTML='<span class="spin"></span> SCANNING...'; btn.disabled=true;
  await tmPollInbox();
  btn.innerHTML='<span class="btn-icon">📬</span> CHECK INBOX'; btn.disabled=false;
  document.getElementById('tmInboxSection').scrollIntoView({behavior:'smooth'});
}

function tmRenderInbox(mails) {
  const list=document.getElementById('tmInboxList');
  if(!mails.length){
    list.innerHTML=`<div class="inbox-empty"><div class="empty-icon">👻</div><p>Ghost inbox active...<br><span>Auto-scanning every 6 seconds</span></p></div>`;
    return;
  }
  list.innerHTML=mails.map(m=>`
    <div class="inbox-item ${m.read?'':'unread'}" onclick="tmOpenMail('${m.id}')">
      <div class="inbox-item-icon">${m.read?'📧':'📩'}</div>
      <div class="i-info">
        <div class="i-from">${esc(m.from)}</div>
        <div class="i-subject">${esc(m.subject)}</div>
      </div>
      <div class="i-date">${esc(m.date.slice(0,16).replace('T',' '))}</div>
      <button class="i-del" onclick="event.stopPropagation();tmDeleteMail('${m.id}')" title="Delete">🗑</button>
    </div>`).join('');
}

async function tmOpenMail(id) {
  const m=tm.mails.find(x=>x.id===id);
  if(m){m.read=true;tmRenderInbox(tm.mails);}
  document.getElementById('viewerMeta').innerHTML='<span style="color:var(--dim);font-family:var(--ff-mono)">Loading...</span>';
  document.getElementById('viewerBody').innerHTML='';
  document.getElementById('viewerFooter').innerHTML='';
  document.getElementById('viewerOverlay').style.display='flex';
  try {
    const r=await fetch(`/api/mailtm/message/${id}?token=${encodeURIComponent(tm.token)}`);
    const d=await r.json();
    openViewer(d.from, d.subject, d.date?.slice(0,16).replace('T',' '), d.body, d.isHtml, ()=>tmDeleteMail(id,true));
  } catch {
    document.getElementById('viewerBody').innerHTML='<p style="color:var(--dim)">Could not load this email.</p>';
  }
}

async function tmDeleteMail(id, closeViewer_=false) {
  tm.mails=tm.mails.filter(m=>m.id!==id);
  tm.seenIds.delete(id);
  tmRenderInbox(tm.mails);
  if(closeViewer_) closeViewer();
  try{await fetch(`/api/mailtm/message/${id}?token=${encodeURIComponent(tm.token)}`,{method:'DELETE'});}catch{}
  toast('🗑 Email deleted');
}

function tmCopyEmail() {
  if(!tm.email)return;
  navigator.clipboard.writeText(tm.email).then(()=>{
    const btn=document.getElementById('tmCopyBtn');
    btn.textContent='✅ COPIED'; btn.classList.add('copied');
    setTimeout(()=>{btn.textContent='⧉ COPY';btn.classList.remove('copied');},2000);
    toast('📋 Email copied!');
  });
}

// ── BOOT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  initParticles();
  initGate();
  gmLoadDomains();
  tmLoadDomains();

  // Viewer close
  document.getElementById('viewerClose').addEventListener('click', closeViewer);
  document.getElementById('viewerOverlay').addEventListener('click',e=>{
    if(e.target===e.currentTarget) closeViewer();
  });

  // Suggest new random name on input focus if empty
  ['gmFirstName','gmLastName','tmFirstName','tmLastName'].forEach(id=>{
    document.getElementById(id).addEventListener('focus',function(){
      if(!this.value){
        const n=randomName();
        if(id.includes('First')) this.placeholder=n.first;
        else this.placeholder=n.last;
      }
    });
  });

  // Sync domain chips when select changes
  document.getElementById('gmDomain').addEventListener('change',function(){
    selectDomain('gmDomainChips','gmDomain',this.value);
  });
  document.getElementById('tmDomain').addEventListener('change',function(){
    selectDomain('tmDomainChips','tmDomain',this.value);
  });
});
