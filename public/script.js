// ===== KingBadBoi Tech TempMail — Shadow Ninja Edition =====

let S = {
  email:null, password:null, token:null, accountId:null,
  messages:[], timer:null, fullName:null, currentMsgId:null,
  domains:[], tokenExpiry:null
};

const FIRST=['James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles',
  'Christopher','Daniel','Matthew','Anthony','Mark','Donald','Steven','Paul','Andrew','Joshua',
  'Kenneth','Kevin','Brian','George','Timothy','Ronald','Edward','Jason','Jeffrey','Ryan',
  'Jacob','Gary','Nicholas','Eric','Jonathan','Stephen','Larry','Justin','Scott','Brandon',
  'Mary','Patricia','Jennifer','Linda','Barbara','Elizabeth','Susan','Jessica','Sarah','Karen',
  'Lisa','Nancy','Betty','Margaret','Sandra','Ashley','Dorothy','Kimberly','Emily','Donna',
  'Michelle','Carol','Amanda','Melissa','Deborah','Stephanie','Rebecca','Sharon','Laura','Cynthia',
  'Samantha','Katherine','Christine','Rachel','Carolyn','Janet','Catherine','Maria','Heather','Anna',
  'Emma','Nicole','Helen','Pamela','Brenda','Angela','Amy','Christine','Kathleen','Diane'];

const LAST=['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
  'Turner','Phillips','Evans','Kelly','Stewart','Reed','Morris','Cook','Morgan','Bell',
  'Washington','Butler','Simmons','Foster','Bryant','Alexander','Russell','Griffin','Diaz','Hayes',
  'Myers','Ford','Hamilton','Graham','Sullivan','Wallace','Woods','Cole','West','Jordan'];

const used=new Set();
function pickName(){
  for(let i=0;i<300;i++){
    const f=FIRST[Math.floor(Math.random()*FIRST.length)];
    const l=LAST[Math.floor(Math.random()*LAST.length)];
    if(!used.has(f+l)){used.add(f+l);return{first:f,last:l,full:f+' '+l};}
  }
  return{first:FIRST[0],last:LAST[0],full:FIRST[0]+' '+LAST[0]};
}

function makeAddr(first,last,domain){
  const n=Math.floor(Math.random()*9000)+100;
  const styles=[
    first.toLowerCase()+'.'+last.toLowerCase()+n,
    first.toLowerCase()+last.toLowerCase()+n,
    first[0].toLowerCase()+last.toLowerCase()+n,
    first.toLowerCase()+n,
    last.toLowerCase()+'.'+first[0].toLowerCase()+n
  ];
  return styles[Math.floor(Math.random()*styles.length)].replace(/[^a-z0-9._]/g,'')+'@'+domain;
}

function randPw(){
  const c='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({length:16},()=>c[Math.floor(Math.random()*c.length)]).join('');
}

// ===== MODAL =====
const followModal=document.getElementById('followModal');
if(localStorage.getItem('kbb')=='1') followModal.style.display='none';
document.getElementById('followedBtn').onclick=()=>{
  localStorage.setItem('kbb','1');
  followModal.style.display='none';
  toast('Welcome to KingBadBoi Tech! 👑');
};

// ===== DOM =====
const $=id=>document.getElementById(id);
const elEmail=$('emailDisplay'), elName=$('nameDisplay'), elStatus=$('statusMsg');
const elInbox=$('inboxSection'), elMsgList=$('messageList'), elMsgCount=$('msgCount');
const elModal=$('msgModal'), elDomains=$('domainList');
const btnGen=$('generateBtn'), btnNew=$('refreshBtn'), btnDel=$('deleteBtn');
const btnCpE=$('copyBtn'), btnCpN=$('copyNameBtn'), btnIR=$('inboxRefreshBtn');
const btnClose=$('closeMsgBtn'), btnDelMsg=$('deleteMsgBtn');

// Toast
const toastEl=document.createElement('div');
toastEl.id='toast'; document.body.appendChild(toastEl);
function toast(msg,ms){
  toastEl.textContent=msg; toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),ms||2500);
}
function setStatus(msg,type){
  elStatus.textContent=msg;
  elStatus.className='status-msg'+(type?' '+type:'');
}

// ===== API CALL =====
async function call(path,opts){
  opts=opts||{};
  const h={'Content-Type':'application/json'};
  if(S.token) h['Authorization']='Bearer '+S.token;
  Object.assign(h,opts.headers||{});
  const r=await fetch(path,Object.assign({},opts,{headers:h}));
  return r;
}

// ===== LOAD DOMAINS =====
async function loadDomains(){
  try{
    const r=await call('/api/domains');
    const d=await r.json();
    S.domains=d.domains||[];
    if(elDomains){
      elDomains.innerHTML=S.domains.length
        ? S.domains.map(x=>'<span class="dtag">@'+esc(x.domain)+'</span>').join('')
        : '<span class="dtag-dim">Loading...</span>';
    }
  }catch(e){ console.log('domain load err',e); }
}

// ===== GENERATE =====
async function generate(){
  stopTimer();
  setStatus('Connecting to mail server...','info');
  elEmail.textContent='Please wait...';
  elEmail.classList.add('loading');
  elName.textContent='...';
  btnGen.disabled=true;

  try{
    // Always refresh domains
    await loadDomains();
    if(!S.domains.length) throw new Error('Mail server unreachable — try again');

    // Pick random domain
    const dom=S.domains[Math.floor(Math.random()*S.domains.length)].domain;
    const name=pickName();
    const addr=makeAddr(name.first,name.last,dom);
    const pw=randPw();

    setStatus('Creating mailbox on '+dom+'...','info');

    // Create account
    const ar=await call('/api/accounts',{method:'POST',body:JSON.stringify({address:addr,password:pw})});
    const ad=await ar.json();
    if(!ar.ok) throw new Error(ad['hydra:description']||ad.detail||ad.message||'Create failed ('+ar.status+')');

    S.accountId=ad.id; S.email=addr; S.password=pw; S.fullName=name.full;

    // Get token
    setStatus('Authenticating...','info');
    const tr=await call('/api/token',{method:'POST',body:JSON.stringify({address:addr,password:pw})});
    const td=await tr.json();
    if(!tr.ok) throw new Error(td.message||td['hydra:description']||'Auth failed ('+tr.status+')');
    S.token=td.token;
    S.tokenExpiry=Date.now()+(55*60*1000); // refresh token before 60min expiry

    elEmail.classList.remove('loading');
    elEmail.textContent=addr;
    elName.textContent=name.full;
    btnCpE.disabled=false; btnCpN.disabled=false;
    btnNew.disabled=false; btnDel.disabled=false;
    setStatus('✓ Ready — copy the name & email and use them to sign up anywhere','success');
    elInbox.classList.remove('hidden');
    fetchMsgs(false);
    startTimer();
    toast('Identity generated! 👑');
  }catch(e){
    elEmail.classList.remove('loading');
    elEmail.textContent='Failed — try again';
    elName.textContent='';
    setStatus('✗ '+e.message,'error');
    toast(e.message,4000);
  }finally{
    btnGen.disabled=false;
  }
}

btnGen.addEventListener('click',generate);
btnNew.addEventListener('click',async()=>{
  if(S.accountId){try{await call('/api/accounts/'+S.accountId,{method:'DELETE'});}catch(e){}}
  const d=S.domains; S={email:null,password:null,token:null,accountId:null,messages:[],timer:null,fullName:null,currentMsgId:null,domains:d,tokenExpiry:null};
  generate();
});
btnDel.addEventListener('click',async()=>{
  if(!confirm('Delete this email address and all messages?')) return;
  stopTimer();
  if(S.accountId){try{await call('/api/accounts/'+S.accountId,{method:'DELETE'});}catch(e){}}
  resetUI(); toast('Deleted ✓');
});

function resetUI(){
  stopTimer();
  const d=S.domains;
  S={email:null,password:null,token:null,accountId:null,messages:[],timer:null,fullName:null,currentMsgId:null,domains:d,tokenExpiry:null};
  elEmail.textContent='Click Generate to create your email';
  elName.textContent='Your name will appear here';
  elEmail.classList.remove('loading');
  btnCpE.disabled=true; btnCpN.disabled=true;
  btnNew.disabled=true; btnDel.disabled=true;
  elInbox.classList.add('hidden');
  elMsgCount.textContent='0 messages';
  elMsgList.innerHTML=emptyHTML();
  setStatus('');
}

// ===== COPY =====
btnCpE.addEventListener('click',()=>{
  if(!S.email) return;
  navigator.clipboard.writeText(S.email).then(()=>{
    toast('Email copied! 📋');
    btnCpE.innerHTML='<i class="fas fa-check"></i>';
    setTimeout(()=>btnCpE.innerHTML='<i class="far fa-copy"></i>',1600);
  });
});
btnCpN.addEventListener('click',()=>{
  if(!S.fullName) return;
  navigator.clipboard.writeText(S.fullName).then(()=>{
    toast('Name copied! 📋');
    btnCpN.innerHTML='<i class="fas fa-check"></i>';
    setTimeout(()=>btnCpN.innerHTML='<i class="far fa-copy"></i>',1600);
  });
});

// ===== TOKEN REFRESH =====
async function ensureToken(){
  if(!S.email||!S.password) return false;
  // Refresh if within 5 min of expiry or already expired
  if(S.tokenExpiry && Date.now()<S.tokenExpiry) return true;
  try{
    const r=await fetch('/api/token',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({address:S.email,password:S.password})
    });
    const d=await r.json();
    if(d.token){
      S.token=d.token;
      S.tokenExpiry=Date.now()+(55*60*1000);
      return true;
    }
  }catch(e){}
  return false;
}

// ===== FETCH MESSAGES =====
btnIR.addEventListener('click',()=>fetchMsgs(false));

async function fetchMsgs(isAuto){
  if(!S.token) return;
  if(!isAuto) btnIR.innerHTML='<i class="fas fa-sync-alt spin"></i>';

  try{
    await ensureToken();
    let r=await call('/api/messages');
    // Handle 401 by re-authing once more
    if(r.status===401){
      S.tokenExpiry=0;
      const ok=await ensureToken();
      if(ok) r=await call('/api/messages');
      else return;
    }
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    const msgs=d['hydra:member']||d.members||[];
    const prevCount=S.messages.length;
    S.messages=msgs;
    renderMsgs(msgs);
    // Notify if new mail arrived while auto-refreshing
    if(isAuto && msgs.length>prevCount){
      toast('📬 New message arrived!',3000);
    }
  }catch(e){
    if(!isAuto) toast('Inbox error: '+e.message,3000);
  }finally{
    if(!isAuto) btnIR.innerHTML='<i class="fas fa-sync-alt"></i> Refresh';
  }
}

function emptyHTML(){
  return '<div class="empty-box"><i class="fas fa-envelope-open"></i><p>Inbox empty<br>Sign up somewhere with the email above and your verification code will appear here.</p></div>';
}

function renderMsgs(msgs){
  elMsgCount.textContent=msgs.length+' message'+(msgs.length!==1?'s':'');
  if(!msgs.length){elMsgList.innerHTML=emptyHTML();return;}
  elMsgList.innerHTML=msgs.map(m=>{
    const from=(m.from&&m.from.name)?m.from.name:(m.from&&m.from.address)?m.from.address:'Unknown';
    const date=new Date(m.createdAt).toLocaleString();
    return '<div class="msg-item'+(!m.seen?' unread':'')+'" onclick="readMsg(\''+m.id+'\')">'+
      '<div class="msg-top"><span class="msg-sender">'+esc(from)+'</span><span class="msg-time">'+date+'</span></div>'+
      '<div class="msg-subj">'+esc(m.subject||'(No Subject)')+'</div>'+
      '<div class="msg-prev">'+esc(m.intro||'')+'</div>'+
      '</div>';
  }).join('');
}

// ===== READ MESSAGE =====
window.readMsg=async function(id){
  S.currentMsgId=id;
  $('mSubject').textContent='Loading...';
  $('mFrom').textContent=''; $('mDate').textContent=''; $('mBody').innerHTML='';
  elModal.classList.remove('hidden');
  try{
    await ensureToken();
    let r=await call('/api/messages/'+id);
    if(r.status===401){S.tokenExpiry=0;await ensureToken();r=await call('/api/messages/'+id);}
    if(!r.ok) throw new Error('HTTP '+r.status);
    const msg=await r.json();
    $('mSubject').textContent=msg.subject||'(No Subject)';
    $('mFrom').textContent='From: '+((msg.from&&msg.from.address)?msg.from.address:'Unknown');
    $('mDate').textContent=new Date(msg.createdAt).toLocaleString();

    // Show full body — HTML preferred for proper code display
    if(msg.html){
      const raw=Array.isArray(msg.html)?msg.html.join(''):msg.html;
      // Sanitise: remove scripts/iframes, keep content
      const tmp=document.createElement('div');
      tmp.innerHTML=raw;
      tmp.querySelectorAll('script,iframe,object,embed,form').forEach(el=>el.remove());
      // Extract text with line breaks preserved
      const text=tmp.innerText||tmp.textContent||'';
      $('mBody').textContent=text.trim();
    } else if(msg.text){
      $('mBody').textContent=msg.text.trim();
    } else {
      $('mBody').textContent='(No content)';
    }

    // Highlight any verification codes (4–8 digit numbers)
    highlightCodes($('mBody'));

    const el=document.querySelector('[onclick="readMsg(\''+id+'\')"]');
    if(el) el.classList.remove('unread');
  }catch(e){
    $('mBody').textContent='Could not load message: '+e.message;
  }
};

// Auto-highlight OTP/verification codes in message body
function highlightCodes(el){
  const text=el.textContent;
  // Match 4–8 digit codes
  const coded=text.replace(/\b(\d{4,8})\b/g,'<span class="otp-code">$1</span>');
  if(coded!==text) el.innerHTML=coded;
}

btnClose.addEventListener('click',()=>elModal.classList.add('hidden'));
elModal.addEventListener('click',e=>{if(e.target===elModal)elModal.classList.add('hidden');});
btnDelMsg.addEventListener('click',async()=>{
  if(!S.currentMsgId) return;
  try{await call('/api/messages/'+S.currentMsgId,{method:'DELETE'});}catch(e){}
  elModal.classList.add('hidden');
  S.messages=S.messages.filter(m=>m.id!==S.currentMsgId);
  renderMsgs(S.messages);
  toast('Deleted ✓');
});

// ===== TIMER — check every 6 seconds =====
function startTimer(){
  stopTimer();
  S.timer=setInterval(()=>fetchMsgs(true),6000);
}
function stopTimer(){if(S.timer){clearInterval(S.timer);S.timer=null;}}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// Load domains on boot
loadDomains();
