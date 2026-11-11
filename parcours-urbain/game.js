/* =====================================================================
   GAME.JS - moteur du jeu. Normalement vous n'avez rien à modifier ici :
   tout se règle dans config.js
   ===================================================================== */
const C=window.CONFIG;
const $=id=>document.getElementById(id);
const SND={marche:'market',police:'police',ecole:'school',calme:'mosque',circulation:'traffic'};
const SNDLABEL={market:'Ambiance de marché',police:'Radios',school:'Cour de récréation',mosque:'Calme',traffic:'Circulation'};
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const fmt=t=>{t=Math.floor(t);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};
const ESSAIS=C.essais||3, MPP=C.metresParPixel||0.5;
const fmtDist=m=>m>=1000?(m/1000).toFixed(2).replace('.',',')+' km':Math.round(m)+' m';
const buzz=n=>{try{navigator.vibrate&&navigator.vibrate(n)}catch(e){}};
document.title=C.titre;$('tTitle').textContent=C.titre;$('tSub').textContent=C.sousTitre;$('tIntro').textContent=C.intro;

/* ----- tracé ----- */
const ROUTE=C.trace,cum=[0];for(let i=1;i<ROUTE.length;i++)cum.push(cum[i-1]+Math.hypot(ROUTE[i][0]-ROUTE[i-1][0],ROUTE[i][1]-ROUTE[i-1][1]));
const L=cum[cum.length-1];
function posAt(s){s=Math.max(0,Math.min(L,s));let i=1;while(i<cum.length-1&&cum[i]<s)i++;const a=ROUTE[i-1],b=ROUTE[i],t=(s-cum[i-1])/((cum[i]-cum[i-1])||1);return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
function project(x,y){let best=1e9,bs=0;for(let i=1;i<ROUTE.length;i++){const a=ROUTE[i-1],b=ROUTE[i],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1;let t=((x-a[0])*dx+(y-a[1])*dy)/l2;t=Math.max(0,Math.min(1,t));const px=a[0]+dx*t,py=a[1]+dy*t,d=Math.hypot(x-px,y-py);if(d<best){best=d;bs=cum[i-1]+t*Math.sqrt(l2)}}return bs}
const CPS=C.points.map((p,i)=>({...p,id:i,s:project(p.x,p.y)})).sort((a,b)=>a.s-b.s);
const ZONES=C.ambiances.map(z=>({...z,k:SND[z.son]||'traffic',s:project(z.x,z.y)}));
const PLACES=(C.lieux||[]).map(p=>({...p,s:project(p.x,p.y)}));
const HOTS=C.reperes;

/* ----- images ----- */
const mapImg=new Image();mapImg.src=C.plan;let MW=1180,MH=740;mapImg.onload=()=>{MW=mapImg.naturalWidth;MH=mapImg.naturalHeight};
const imgCache={};function loadImg(src){if(!src)return null;if(imgCache[src])return imgCache[src];const i=new Image();i.src=src;imgCache[src]=i;return i}
CPS.concat(HOTS).forEach(p=>loadImg(p.image));

const S={name:'',gender:'M',s:0,walked:0,errors:0,solved:{},elapsed:0,running:false,free:false,paused:true,full:false,dir:0,sound:true,done:false,edit:false,admin:false,curCp:null,lastRow:null};
const keys={};

/* ----- accueil : mini tracé + chiffres ----- */
(function(){
  const xs=ROUTE.map(p=>p[0]),ys=ROUTE.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const k=Math.min(260/(x1-x0||1),110/(y1-y0||1)),ox=(300-(x1-x0)*k)/2,oy=(150-(y1-y0)*k)/2;
  const pt=p=>[(ox+(p[0]-x0)*k).toFixed(1),(oy+(p[1]-y0)*k).toFixed(1)];
  const d=ROUTE.map((p,i)=>(i?'L':'M')+pt(p).join(' ')).join(' ');
  let s='<path d="'+d+'" fill="none" stroke="currentColor" stroke-opacity=".9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  CPS.forEach(c=>{const q=pt(posAt(c.s));s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="5" fill="#F0AE2B" stroke="#1F5C3A" stroke-width="2"/>'});
  const a=pt(ROUTE[0]),b=pt(ROUTE[ROUTE.length-1]);
  s+='<circle cx="'+a[0]+'" cy="'+a[1]+'" r="5" fill="#fff"/><circle cx="'+b[0]+'" cy="'+b[1]+'" r="5" fill="#fff" stroke="#F0AE2B" stroke-width="2"/>';
  $('mini').innerHTML=s;$('mini').style.color='#F8F9FA';
  const f=$('facts');[[CPS.length,'points d\'analyse'],[fmtDist(L*MPP),'de parcours'],[HOTS.length,'repères']].forEach(([v,l])=>{const e=document.createElement('div');e.className='fact';e.innerHTML='<b></b><span></span>';e.firstChild.textContent=v;e.lastChild.textContent=l;f.appendChild(e)});
  $('ver').textContent=C.version||'';
})();

/* ===== classement : local, Claude (db) ou Supabase ===== */
const LB={kind:'local',db:null,uid:null,rows:null};
const SBK=C.classement||{};
const sb=(path,opt)=>fetch(SBK.supabaseUrl.replace(/\/$/,'')+'/rest/v1/'+path,Object.assign({},opt,{headers:Object.assign({apikey:SBK.supabaseCle,Authorization:'Bearer '+SBK.supabaseCle,'Content-Type':'application/json'},(opt&&opt.headers)||{})}));
async function lbInit(){
  if(SBK.supabaseUrl&&SBK.supabaseCle){LB.kind='supabase';return}
  try{const cl=window.claude;if(!cl||!cl.use)return;const db=await cl.use('db');if(!db)return;
    let uid=null;try{const u=await cl.use('user');if(u&&u.id)uid=await u.id()}catch(e){}
    LB.db=db;LB.uid=uid;LB.kind='claude';
    db.collection('scores').orderBy('time','asc').limit(200).onSnapshot(snap=>{LB.rows=(snap.docs||[]).map(d=>Object.assign({},d.data(),{id:d.id}));if($('mBoard').classList.contains('on'))renderBoard()},()=>{LB.rows=null});
  }catch(e){}
}
async function saveScore(r){
  const l=store.get('urban-scores')||[];l.push(r);store.set('urban-scores',l);
  try{
    if(LB.kind==='supabase'){const res=await sb('scores',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({name:r.name,gender:r.gender,time:r.time,distance:r.distance})});return res.ok?'shared':'local'}
    if(LB.kind==='claude'&&LB.uid){const ref=LB.db.collection('scores').doc(LB.uid);const snap=await ref.get();
      if(!snap.exists||(snap.data().time>r.time)){await ref.set(r)}return 'shared'}
  }catch(e){}
  return 'local';
}
async function getRows(){
  if(LB.kind==='supabase'){try{const res=await sb('scores?select=*&order=time.asc&limit=200');if(res.ok)return{rows:await res.json(),shared:true}}catch(e){}}
  if(LB.kind==='claude'&&LB.rows)return{rows:LB.rows,shared:true};
  return{rows:store.get('urban-scores')||[],shared:false};
}
async function removeRow(r){
  if(LB.kind==='supabase'){const code=$('adminCode').value;if(!code){toast('Entrez le code admin');return}
    try{const res=await sb('rpc/supprimer_score',{method:'POST',body:JSON.stringify({p_id:r.id,p_code:code})});if(!res.ok)throw 0}catch(e){toast('Suppression refusée');return}}
  else if(LB.kind==='claude'&&r.id&&LB.db){try{await LB.db.collection('scores').doc(r.id).delete()}catch(e){toast('Suppression refusée : réservée à l\'administrateur');return}}
  else{store.set('urban-scores',(store.get('urban-scores')||[]).filter(x=>!(x.ts===r.ts&&x.name===r.name)))}
  renderBoard();
}
async function renderBoard(){
  const {rows,shared}=await getRows();const list=rows.slice().sort((a,b)=>a.time-b.time||(a.ts||0)-(b.ts||0));
  const b=$('boardBody');b.innerHTML='';
  document.querySelectorAll('.adm').forEach(e=>e.hidden=!S.admin);
  if(!list.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='Aucun résultat pour le moment. Soyez le premier.';tr.appendChild(td);b.appendChild(tr)}
  list.forEach((r,i)=>{const tr=document.createElement('tr');if(S.lastRow&&r.name===S.lastRow.name&&r.time===S.lastRow.time)tr.className='me';
    const c1=document.createElement('td'),rk=document.createElement('span');rk.className='rk'+(i<3?' g'+(i+1):'');rk.textContent=i+1;c1.appendChild(rk);
    const c2=document.createElement('td');c2.textContent=r.name;
    const c3=document.createElement('td');c3.className='n';c3.textContent=fmt(r.time);
    const c4=document.createElement('td');c4.className='n';c4.textContent=r.distance!=null?fmtDist(r.distance):'—';
    tr.append(c1,c2,c3,c4);
    if(S.admin){const c5=document.createElement('td');c5.className='adm';const bt=document.createElement('button');bt.className='del';bt.textContent='Supprimer';bt.onclick=()=>removeRow(r);c5.appendChild(bt);tr.appendChild(c5)}
    b.appendChild(tr)});
  $('boardSrc').textContent=shared?'Classement partagé entre tous les joueurs.':'Classement enregistré sur cet appareil uniquement.';
  $('adminCode').hidden=!(S.admin&&LB.kind==='supabase');
  return list;
}
function openBoard(){S.paused=true;show('mBoard');renderBoard();$('boardClose').focus()}

/* ===== dessin ===== */
const cv=$('map'),cx=cv.getContext('2d');let W=0,H=0,DPR=1;
function resize(){const r=$('stage').getBoundingClientRect();DPR=Math.min(2,window.devicePixelRatio||1);W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR}
new ResizeObserver(resize).observe($('stage'));
function view(){
  const fit=Math.min(W/MW,H/MH);
  if(S.full||S.edit||W<=0)return{k:fit,ox:(W-MW*fit)/2,oy:(H-MH*fit)/2};
  const k=Math.max(fit,Math.min(1.7,Math.max(.9,W/620))),p=posAt(S.s);
  let ox=W/2-p[0]*k,oy=H/2-p[1]*k;
  ox=MW*k<W?(W-MW*k)/2:Math.min(0,Math.max(W-MW*k,ox));oy=MH*k<H?(H-MH*k)/2:Math.min(0,Math.max(H-MH*k,oy));
  return{k,ox,oy};
}
function pathTo(s){cx.beginPath();cx.moveTo(ROUTE[0][0],ROUTE[0][1]);for(let i=1;i<ROUTE.length;i++){if(cum[i]<=s)cx.lineTo(ROUTE[i][0],ROUTE[i][1]);else{const p=posAt(s);cx.lineTo(p[0],p[1]);break}}}
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
let edPts=[];
function draw(){
  cx.setTransform(DPR,0,0,DPR,0,0);cx.fillStyle='#FBFAF5';cx.fillRect(0,0,W,H);
  const v=view();cx.save();cx.translate(v.ox,v.oy);cx.scale(v.k,v.k);
  if(mapImg.complete&&mapImg.naturalWidth)cx.drawImage(mapImg,0,0,MW,MH);
  const accent=css('--accent'),route=css('--route');
  cx.lineCap='round';cx.lineJoin='round';
  if(C.afficherTrace!==false){cx.strokeStyle='#111';cx.lineWidth=5;pathTo(L);cx.stroke()}
  cx.strokeStyle='#fff';cx.lineWidth=9;pathTo(S.s);cx.stroke();cx.strokeStyle=route;cx.lineWidth=5;pathTo(S.s);cx.stroke();
  HOTS.forEach(h=>{cx.fillStyle='#fff';cx.strokeStyle='#25262a';cx.lineWidth=2;cx.beginPath();cx.arc(h.x,h.y-14,7,0,7);cx.fill();cx.stroke();cx.fillStyle='#25262a';cx.beginPath();cx.arc(h.x,h.y-14,2.5,0,7);cx.fill()});
  CPS.forEach((c,i)=>{const p=posAt(c.s),ok=S.solved[c.id];cx.save();cx.translate(p[0],p[1]);cx.rotate(Math.PI/4);cx.fillStyle=ok?'#3f7d58':accent;cx.strokeStyle='#fff';cx.lineWidth=2.5;cx.fillRect(-9,-9,18,18);cx.strokeRect(-9,-9,18,18);cx.restore();cx.fillStyle=ok?'#fff':'#121212';cx.font='700 12px sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(ok?'✓':String(i+1),p[0],p[1]+1)});
  const p=posAt(S.s),col=S.gender==='F'?'#c2428a':'#2f7fc1';
  cx.fillStyle='rgba(0,0,0,.25)';cx.beginPath();cx.ellipse(p[0],p[1]+13,11,4,0,0,7);cx.fill();
  cx.fillStyle=col;cx.strokeStyle='#fff';cx.lineWidth=3;cx.beginPath();cx.arc(p[0],p[1],14,0,7);cx.fill();cx.stroke();
  cx.fillStyle='#fff';cx.beginPath();cx.arc(p[0],p[1]-4,4,0,7);cx.fill();
  cx.beginPath();if(S.gender==='F'){cx.moveTo(p[0],p[1]+1);cx.lineTo(p[0]-6,p[1]+9);cx.lineTo(p[0]+6,p[1]+9);cx.closePath()}else{cx.arc(p[0],p[1]+7,6,Math.PI,0)}cx.fill();
  if(S.edit&&edPts.length>1){cx.strokeStyle='#d3362b';cx.lineWidth=3;cx.setLineDash([8,6]);cx.beginPath();edPts.forEach((q,i)=>i?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1]));cx.stroke();cx.setLineDash([])}
  if(S.edit){cx.fillStyle='#d3362b';cx.font='700 11px sans-serif';edPts.forEach((q,i)=>{cx.beginPath();cx.arc(q[0],q[1],4,0,7);cx.fill();cx.fillText(i+1,q[0]+7,q[1]-6)})}
  cx.restore();
}
function showImage(canvas,item,label){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const fallback=()=>{c.fillStyle='#FBFAF5';c.fillRect(0,0,w,h);if(mapImg.complete&&mapImg.naturalWidth){const z=2.4,sw=w/z,sh=h/z,sx=Math.max(0,Math.min(MW-sw,item.x-sw/2)),sy=Math.max(0,Math.min(MH-sh,item.y-sh/2));c.drawImage(mapImg,sx,sy,sw,sh,0,0,w,h);const px=(item.x-sx)*z,py=(item.y-sy)*z;c.strokeStyle='#E02424';c.lineWidth=4;c.beginPath();c.arc(px,py,20,0,7);c.stroke();c.beginPath();c.arc(px,py,4,0,7);c.fillStyle='#E02424';c.fill()}};
  const im=loadImg(item.image);
  const paint=()=>{c.fillStyle='#FBFAF5';c.fillRect(0,0,w,h);const r=Math.min(w/im.naturalWidth,h/im.naturalHeight);c.drawImage(im,(w-im.naturalWidth*r)/2,(h-im.naturalHeight*r)/2,im.naturalWidth*r,im.naturalHeight*r)};
  if(!im)fallback();else if(im.complete&&im.naturalWidth)paint();else if(im.complete)fallback();else{fallback();im.onload=paint}
}

/* ===== interface ===== */
const show=id=>$(id).classList.add('on'),hide=id=>$(id).classList.remove('on');
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('on'),2600)}
function avatarSvg(g){const col=g==='F'?'#c2428a':'#2f7fc1';return '<svg width="34" height="34" viewBox="0 0 30 30"><circle cx="15" cy="15" r="14" fill="'+col+'"/><circle cx="15" cy="11" r="4.6" fill="#fff"/>'+(g==='F'?'<path d="M15 17 L8 25 H22z" fill="#fff"/>':'<path d="M6.5 24a8.5 8.5 0 0 1 17 0z" fill="#fff"/>')+'</svg>'}
function livesHtml(el){el.innerHTML='';for(let i=0;i<ESSAIS;i++){const d=document.createElement('span');d.className='life'+(i<ESSAIS-S.errors?'':' off');el.appendChild(d)}}
function renderLives(){const has=CPS.some(p=>p.question);$('livesBox').style.display=has?'':'none';livesHtml($('lives'));livesHtml($('cpLives'))}
const nextCp=()=>CPS.find(c=>!S.solved[c.id]);
const limit=()=>{const n=nextCp();return n?n.s:L};
function renderTicks(){const t=$('track');t.querySelectorAll('b').forEach(e=>e.remove());CPS.forEach(c=>{const b=document.createElement('b');b.style.left=(c.s/L*100)+'%';b.className=S.solved[c.id]?'done':'';t.appendChild(b)})}
function startGame(){
  S.s=0;S.walked=0;S.errors=0;S.solved={};S.elapsed=0;S.running=true;S.free=false;S.paused=false;S.done=false;S.dir=0;
  ['mCp','mInfo','mLose','mWin','mBoard'].forEach(hide);closeMenu();
  renderLives();renderTicks();
  $('start').style.display='none';$('game').classList.add('on');resize();
  $('whoName').textContent=S.name;$('avatar').innerHTML=avatarSvg(S.gender);
  try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}
  toast('Avancez le long du tracé');
}
function openCp(c){
  S.paused=true;S.curCp=c;buzz(25);
  const idx=CPS.indexOf(c)+1;
  $('cpTag').textContent=c.tag||('Point d\'analyse '+idx);$('cpStep').textContent='Point '+idx+' sur '+CPS.length;
  $('cpT').textContent=c.titre;$('cpCap').textContent=c.titre;$('cpP').textContent=c.texte||'';$('cpP').style.display=c.texte?'':'none';
  showImage($('cpImg'),c,c.titre);
  const box=$('cpOpts');box.innerHTML='';$('cpFb').textContent='';$('cpFb').className='fb';renderLives();
  const q=c.question&&c.choix&&c.choix.length;
  $('cpQBox').style.display=q?'':'none';$('cpLives').style.display=q?'':'none';$('cpNext').style.display=q?'none':'';
  if(q){$('cpQ').textContent=c.question;
    c.choix.map((t,i)=>({t,i})).sort(()=>Math.random()-.5).forEach(({t,i},n)=>{const b=document.createElement('button');b.className='opt';b.innerHTML='<span class="l"></span><span></span>';b.firstChild.textContent='ABCDEF'[n];b.lastChild.textContent=t;b.onclick=()=>answer(c,i,b);box.appendChild(b)})}
  show('mCp');$('mCp').querySelector('.sheet').scrollTop=0;
}
function answer(c,i,btn){
  if(i===(c.reponse||0)){buzz(15);btn.classList.add('right');[...$('cpOpts').children].forEach(x=>x.disabled=true);$('cpFb').className='fb ok';$('cpFb').textContent='Bonne réponse. '+(c.explication||'');$('cpNext').style.display='';$('cpNext').focus()}
  else{buzz([40,40,40]);S.errors++;renderLives();btn.classList.add('wrong');btn.disabled=true;const left=ESSAIS-S.errors;$('cpFb').className='fb bad';$('cpFb').textContent=left>0?'Mauvaise réponse. Essais restants : '+left+'.':'Mauvaise réponse.';
    if(left<=0){S.running=false;[...$('cpOpts').children].forEach(x=>x.disabled=true);setTimeout(()=>{hide('mCp');show('mLose');$('loseBtn').focus()},900)}}
}
async function win(){
  S.running=false;S.paused=true;S.done=true;buzz([60,40,60]);
  const row={name:S.name,gender:S.gender,time:Math.round(S.elapsed),distance:Math.round(S.walked*MPP),ts:Date.now()};S.lastRow=row;
  $('winT').textContent='Bravo '+S.name;$('wTime').textContent=fmt(row.time);$('wDist').textContent=fmtDist(row.distance);$('wRank').textContent='—';
  $('winMsg').textContent='Enregistrement du résultat…';show('mWin');$('winAgain').focus();
  const st=await saveScore(row);
  $('winMsg').textContent=st==='shared'?'Votre résultat est enregistré dans le classement partagé.':'Résultat enregistré sur cet appareil.';
  try{const list=await renderBoard();const i=list.findIndex(r=>r.name===row.name&&r.time===row.time);if(i>=0)$('wRank').textContent=(i+1)+' / '+list.length}catch(e){}
}

/* ----- lieu courant (rue / quartier) ----- */
let lastPlace=null;
function updateBanner(){
  let pl=null,bd=1e9;PLACES.forEach(p=>{const d=Math.abs(S.s-p.s);if(d<bd){bd=d;pl=p}});
  const z=ZONES.reduce((a,b)=>Math.abs(S.s-a.s)<Math.abs(S.s-b.s)?a:b);
  if(!pl)pl={rue:z.nom,quartier:''};
  if(pl!==lastPlace){lastPlace=pl;$('bRue').textContent=pl.rue;$('bQu').textContent=pl.quartier||'';$('bQu').style.display=pl.quartier?'':'none';const b=$('banner');b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse')}
  $('bSnd').textContent=A.ready&&S.sound?'♪ '+SNDLABEL[z.k]+' · '+z.nom:'';
}

/* ----- repères ----- */
let nearH=null;
function updateEye(){const p=posAt(S.s);let b=null,bd=1e9;HOTS.forEach(h=>{const d=Math.hypot(h.x-p[0],h.y-p[1]);if(d<(h.portee||75)&&d<bd){bd=d;b=h}});
  if(b!==nearH){nearH=b;$('eye').classList.toggle('on',!!b);if(b)$('eyeLabel').textContent=b.titre}}
function openInfo(h){S.paused=true;$('inT').textContent=h.titre;$('inCap').textContent=h.titre;$('inP').textContent=h.texte||'';showImage($('inImg'),h,h.titre);show('mInfo');$('inClose').focus()}
function closeInfo(){hide('mInfo');if(S.running||S.free)S.paused=false}
function closeBoard(){hide('mBoard');if((S.running||S.free)&&!$('mCp').classList.contains('on')&&!$('mWin').classList.contains('on')&&!$('mLose').classList.contains('on'))S.paused=false}

/* ----- menu ----- */
function closeMenu(){$('menu').hidden=true;$('btnMenu').setAttribute('aria-expanded','false')}
$('btnMenu').onclick=e=>{e.stopPropagation();const o=$('menu').hidden;$('menu').hidden=!o;$('btnMenu').setAttribute('aria-expanded',String(o))};
document.addEventListener('click',e=>{if(!$('menu').hidden&&!$('menu').contains(e.target))closeMenu()});
$('menu').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.act;closeMenu();
  if(a==='sound'){initAudio();setSound(!S.sound)}
  else if(a==='view'){S.full=!S.full;$('mView').textContent=S.full?'Suivre le joueur':'Voir le plan entier'}
  else if(a==='board')openBoard();
  else if(a==='full'){try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>toast('Plein écran indisponible'))}catch(e){}}
  else if(a==='restart')startGame();
  else if(a==='edit')toggleEdit()});
function setSound(v){S.sound=v;$('mSound').textContent=v?'activé':'coupé';if(A.ready)A.master.gain.setTargetAtTime(v?.9:0,A.ctx.currentTime,.1)}
function toggleEdit(){S.edit=!S.edit;$('editor').classList.toggle('on',S.edit);$('mEditTag').textContent=S.edit?'actif':'';S.paused=S.edit?true:!(S.done&&!S.free);if(S.edit)toast('Cliquez sur le plan pour lire x, y')}

/* ----- admin : ouvrir la page avec  #admin  ----- */
function checkAdmin(){const h=location.hash.replace('#','');const ok=h==='admin'+(C.codeAdmin?'-'+C.codeAdmin:'');S.admin=ok;$('mEdit').hidden=!ok;$('adminBar').hidden=!ok;
  document.querySelectorAll('.adm').forEach(e=>e.hidden=!ok);if(!ok&&S.edit)toggleEdit();if($('mBoard').classList.contains('on'))renderBoard()}
addEventListener('hashchange',checkAdmin);

/* ===== boucle ===== */
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(!S.paused&&(S.running||S.free)){
    if(S.running)S.elapsed+=dt;
    const d=(S.dir||0)+((keys.f?1:0)-(keys.b?1:0));
    if(d){const s0=S.s;S.s=Math.max(0,Math.min(S.running?limit():L,S.s+Math.sign(d)*C.vitesse*dt));S.walked+=Math.abs(S.s-s0);
      if(S.running){const n=nextCp();if(n&&S.s>=n.s-.5){S.s=n.s;S.dir=0;openCp(n)}else if(!n&&S.s>=L-.5&&!S.done)win()}}
  }
  if($('game').classList.contains('on')){
    $('clock').textContent=fmt(S.elapsed);$('dist').textContent=fmtDist(S.walked*MPP);$('prog').style.width=(S.s/L*100)+'%';
    updateAudio();updateBanner();updateEye();draw();
  }
  requestAnimationFrame(frame);
}

/* ===== événements ===== */
function hold(btn,dir){const on=e=>{e.preventDefault();S.dir=dir;btn.classList.add('held');initAudio()},off=()=>{if(S.dir===dir)S.dir=0;btn.classList.remove('held')};btn.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(t=>btn.addEventListener(t,off))}
hold($('btnFwd'),1);hold($('btnBack'),-1);
addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeMenu();if($('mInfo').classList.contains('on'))closeInfo();else if($('mBoard').classList.contains('on'))closeBoard();return}
  const t=document.activeElement.tagName;if(t==='INPUT'||t==='TEXTAREA')return;const k=e.key.toLowerCase();
  if(['arrowright','arrowdown','d','w'].includes(k)){keys.f=true;e.preventDefault()}else if(['arrowleft','arrowup','a','s'].includes(k)){keys.b=true;e.preventDefault()}});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(['arrowright','arrowdown','d','w'].includes(k))keys.f=false;if(['arrowleft','arrowup','a','s'].includes(k))keys.b=false});
addEventListener('blur',()=>{keys.f=keys.b=false;S.dir=0});
const setGender=g=>{S.gender=g;$('gM').setAttribute('aria-pressed',g==='M');$('gF').setAttribute('aria-pressed',g==='F')};
$('gM').onclick=()=>setGender('M');$('gF').onclick=()=>setGender('F');
try{const sv=store.get('urban-player');if(sv){$('pname').value=sv.name||'';setGender(sv.gender||'M')}}catch(e){}
$('startForm').addEventListener('submit',e=>{e.preventDefault();const n=$('pname').value.trim();if(!n){$('startErr').textContent='Entrez votre nom pour commencer.';$('pname').focus();return}$('startErr').textContent='';S.name=n;store.set('urban-player',{name:n,gender:S.gender});initAudio();startGame()});
$('startBoard').onclick=()=>show('mBoard')||renderBoard();
$('boardClose').onclick=closeBoard;$('boardX').onclick=closeBoard;$('boardRefresh').onclick=()=>renderBoard();
$('cpNext').onclick=()=>{const n=nextCp();if(n&&Math.abs(n.s-S.s)<1)S.solved[n.id]=true;hide('mCp');S.paused=false;renderTicks();if(!nextCp())toast('Dernier tronçon : allez jusqu\'au bout')};
$('eye').onclick=()=>{if(nearH)openInfo(nearH)};
$('inClose').onclick=closeInfo;$('inX').onclick=closeInfo;
$('loseBtn').onclick=startGame;
$('winBack').onclick=()=>{hide('mWin');S.free=true;S.paused=false;toast('Mode libre : revenez sur vos pas, le chrono est arrêté')};
$('winAgain').onclick=startGame;
$('winBoard').onclick=()=>{hide('mWin');openBoard()};
/* éditeur */
cv.addEventListener('click',e=>{if(!S.edit)return;const r=cv.getBoundingClientRect(),v=view(),x=Math.round((e.clientX-r.left-v.ox)/v.k),y=Math.round((e.clientY-r.top-v.oy)/v.k);edPts.push([x,y]);edOut();toast('x: '+x+'  y: '+y)});
const edOut=()=>{$('edOut').value=edPts.map(p=>'['+p[0]+','+p[1]+']').join(',')};
$('edUndo').onclick=()=>{edPts.pop();edOut()};$('edClear').onclick=()=>{edPts=[];edOut()};$('edClose').onclick=()=>{if(S.edit)toggleEdit()};
$('edCopy').onclick=()=>{const t=$('edOut');t.select();try{navigator.clipboard.writeText(t.value).then(()=>toast('Copié')).catch(()=>{})}catch(e){}};
document.addEventListener('visibilitychange',()=>{if(A.ctx)document.hidden?A.ctx.suspend():A.ctx.resume()});
/* application installable (hors Claude) */
try{if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{})}catch(e){}
checkAdmin();lbInit();requestAnimationFrame(frame);
