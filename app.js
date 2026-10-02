const $=id=>document.getElementById(id);
const DB='mcApps',PW='mcAdminHash',SES='mcAdminSession';
const load=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){alert('Could not save in this browser.');return false}};
const apps=()=>load(DB)||[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isAdmin=()=>sessionStorage.getItem(SES)==='1';

async function hash(s){
  if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('mc:'+s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  let h=5381;for(const c of 'mc:'+s)h=((h<<5)+h+c.charCodeAt(0))>>>0;return 'f'+h;
}

function go(v){
  if(v==='admin'){ v=isAdmin()?'admin':'login'; }
  ['apply','done','login','admin'].forEach(x=>$('v-'+x).classList.toggle('hide',x!==v));
  $('logoutBtn').classList.toggle('hide',!isAdmin());
  if(v==='login'){const first=!load(PW);$('loginTitle').textContent=first?'Create admin password':'Admin login';$('pw2Box').classList.toggle('hide',!first);$('loginBtn').textContent=first?'Create password':'Log in';$('loginErr').textContent='';$('pw').value='';$('pw2').value=''}
  if(v==='admin')renderAdmin();
  window.scrollTo(0,0);
}

/* Apply form */
document.querySelectorAll('input[name=exp]').forEach(r=>r.addEventListener('change',()=>$('expBox').classList.toggle('hide',r.value!=='Yes'||!r.checked)));
const radio=n=>(document.querySelector(`input[name=${n}]:checked`)||{}).value;
function token(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const r=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>a[b%a.length]).join('');return `MC-${r(4)}-${r(4)}`}

function submitApp(e){
  e.preventDefault();
  const d={name:$('name').value.trim(),mc:$('mc').value.trim(),age:+$('age').value,role:$('role').value,exp:radio('exp'),expText:$('expText').value.trim(),rules:radio('rules'),friendly:radio('friendly')};
  let m='';
  if(!d.name)m='Enter your name.';
  else if(!/^[A-Za-z0-9_]{3,16}$/.test(d.mc))m='Minecraft name must be 3–16 letters, numbers or underscores.';
  else if(!d.age||d.age<5||d.age>99)m='Enter a valid age.';
  else if(!d.role)m='Choose the role you want.';
  else if(!d.exp)m='Say whether you have server experience.';
  else if(d.exp==='Yes'&&!d.expText)m='Describe your previous server experience.';
  else if(!d.rules)m='Answer the rules question.';
  else if(!d.friendly)m='Answer the friendliness question.';
  $('err').textContent=m;if(m)return false;
  d.token=token();d.date=new Date().toISOString();d.status='pending';
  const list=apps();list.unshift(d);save(DB,list);
  $('tokenOut').textContent=d.token;
  $('codeOut').value=btoa(unescape(encodeURIComponent(JSON.stringify(d))));
  $('form').reset();$('expBox').classList.add('hide');
  go('done');return false;
}
function copy(id,btn){const t=$(id);t.select();(navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).catch(()=>document.execCommand('copy')).finally(()=>{const o=btn.textContent;btn.textContent='Copied';setTimeout(()=>btn.textContent=o,1500)})}

/* Auth */
async function doLogin(e){
  e.preventDefault();const p=$('pw').value,stored=load(PW);
  if(!stored){
    if(p.length<8){$('loginErr').textContent='Use at least 8 characters.';return false}
    if(p!==$('pw2').value){$('loginErr').textContent='Passwords do not match.';return false}
    save(PW,await hash(p));
  }else if(await hash(p)!==stored){$('loginErr').textContent='Wrong password.';return false}
  sessionStorage.setItem(SES,'1');go('admin');return false;
}
function logout(){sessionStorage.removeItem(SES);go('apply')}
function resetPw(){if(confirm('Remove the current password and set a new one?')){localStorage.removeItem(PW);logout();go('admin')}}

/* Admin */
function renderAdmin(){
  if(!isAdmin())return go('login');
  const all=apps(),q=$('q').value.toLowerCase(),f=$('filter').value;
  const c=s=>all.filter(a=>a.status===s).length;
  $('stats').innerHTML=[['Total',all.length],['Pending',c('pending')],['Accepted',c('accepted')],['Rejected',c('rejected')]].map(s=>`<div class="stat">${s[0]}<b>${s[1]}</b></div>`).join('');
  const rows=all.filter(a=>(!f||a.status===f)&&(!q||[a.name,a.mc,a.token].join(' ').toLowerCase().includes(q)));
  $('list').innerHTML=rows.length?rows.map(a=>{
    const yn=v=>`<span class="tag ${v==='Yes'?'t-ok':'t-no'}">${v}</span>`;
    return `<details class="app"><summary><b>${esc(a.mc)}</b><span>${esc(a.name)}, ${a.age}</span><span class="tag t-${a.status}">${a.status}</span><span class="hint">${esc(a.token)}</span></summary>
    <div class="det"><dl><dt>Name</dt><dd>${esc(a.name)}</dd><dt>Minecraft name</dt><dd>${esc(a.mc)}</dd><dt>Age</dt><dd>${a.age}</dd><dt>Role</dt><dd>${esc(a.role)}</dd>
    <dt>Server experience</dt><dd>${yn(a.exp)} ${esc(a.expText||'')}</dd><dt>Follows rules</dt><dd>${yn(a.rules)}</dd><dt>Friendly</dt><dd>${yn(a.friendly)}</dd>
    <dt>Token</dt><dd>${esc(a.token)}</dd><dt>Sent</dt><dd>${new Date(a.date).toLocaleString()}</dd></dl>
    <div class="acts"><button class="sm" onclick="setStatus('${a.token}','accepted')">Accept</button><button class="sm ghost" onclick="setStatus('${a.token}','pending')">Pending</button><button class="sm bad" onclick="setStatus('${a.token}','rejected')">Reject</button><button class="sm bad" onclick="del('${a.token}')">Delete</button></div></div></details>`}).join('')
  :'<div class="empty">No applications yet. Import a player code above.</div>';
}
function setStatus(t,s){const l=apps();const a=l.find(x=>x.token===t);if(a){a.status=s;save(DB,l);renderAdmin()}}
function del(t){if(confirm('Delete this application?')){save(DB,apps().filter(x=>x.token!==t));renderAdmin()}}
function importCodes(){
  const l=apps();let n=0,bad=0;
  $('importBox').value.split(/\s+/).filter(Boolean).forEach(c=>{
    try{const d=JSON.parse(decodeURIComponent(escape(atob(c))));
      if(!d.token||!d.mc||!d.name)throw 0;
      if(!l.some(x=>x.token===d.token)){d.status=['accepted','rejected'].includes(d.status)?'pending':'pending';l.unshift(d);n++}
    }catch(e){bad++}
  });
  save(DB,l);$('importBox').value='';
  $('importMsg').textContent=`${n} imported${bad?`, ${bad} invalid`:''}.`;renderAdmin();
}
function exportJSON(){
  const b=new Blob([JSON.stringify(apps(),null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='applications-backup.json';a.click();
}
go('apply');
