/* =====================================================================
   SONS.JS - ambiances sonores. Deux façons de modifier les sons :
   1) SIMPLE : dans config.js, section "fichiersSon", indiquez vos propres fichiers mp3
      (ex: marche:"sons/marche.mp3"). Ils remplacent le son synthétisé de la zone.
   2) AVANCÉ : modifiez ici les nombres des sons synthétisés (volumes = 3e/4e valeur,
      fréquences en Hz, délais rnd(min,max) en millisecondes).
   ===================================================================== */
/* ===== audio synthétisé ===== */
const A={ctx:null,z:{},lv:{market:0,police:0,school:0,mosque:0,traffic:0},ready:false};
const rnd=(a,b)=>a+Math.random()*(b-a);
function initAudio(){
  if(A.ctx){A.ctx.resume&&A.ctx.resume();return}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const c=A.ctx=new AC();A.master=c.createGain();A.master.gain.value=S.sound?0.9:0;A.master.connect(c.destination);
  const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const nz=()=>{const s=c.createBufferSource();s.buffer=nb;s.loop=true;s.start(c.currentTime+Math.random());return s};
  const flt=(t,f,q)=>{const x=c.createBiquadFilter();x.type=t;x.frequency.value=f;if(q)x.Q.value=q;return x};
  const gn=v=>{const g=c.createGain();g.gain.value=v;return g};
  const lfo=(f,depth,target)=>{const o=c.createOscillator();o.frequency.value=f;const g=gn(depth);o.connect(g);g.connect(target);o.start()};
  const zg=k=>{const g=gn(0);g.connect(A.master);A.z[k]=g;return g};
  const on=k=>A.lv[k]>0.06;
  const ext=(k,name)=>{const f=C.fichiersSon&&C.fichiersSon[name];if(!f)return false;const el=new Audio(f);el.loop=true;const src=c.createMediaElementSource(el);src.connect(zg(k));el.play().catch(()=>{});return true};
  const env=(g,t,a,dd,pk)=>{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dd)};
  const tone=(out,type,f,t,dur,pk,f2)=>{const o=c.createOscillator(),g=gn(0);o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.linearRampToValueAtTime(f2,t+dur);env(g,t,0.01,dur,pk);o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+0.1)};
  /* MARCHÉ */
  if(!ext('market','marche')){const out=zg('market');
   [[420,.6,.5],[900,.8,.4],[1500,1,.25]].forEach(([f,q,v],i)=>{const g=gn(v),b=flt('bandpass',f,q);nz().connect(b);b.connect(g);g.connect(out);lfo(.2+i*.17,v*.6,g.gain)});
   const voice=()=>{if(on('market')){const t=c.currentTime,o=c.createOscillator(),b=flt('bandpass',rnd(700,1200),3),g=gn(0);o.type='sawtooth';const f=rnd(95,230);o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*rnd(.85,1.25),t+.3);o.connect(b);b.connect(g);g.connect(out);const dur=rnd(.15,.5);env(g,t,.04,dur,rnd(.12,.3));o.start(t);o.stop(t+dur+.2)}setTimeout(voice,rnd(180,600))};voice()}
  /* POLICE (radio) */
  if(!ext('police','police')){const out=zg('police');
   const h=flt('highpass',2400),g=gn(.05);nz().connect(h);h.connect(g);g.connect(out);
   const radio=()=>{if(on('police')){const t=c.currentTime;tone(out,'sine',1100,t,.09,.14);
     const o=c.createOscillator(),b=flt('bandpass',1500,2.5),vg=gn(0),n=nz(),nb2=flt('bandpass',1800,1.5),ng=gn(.12);o.type='sawtooth';o.connect(b);b.connect(vg);vg.connect(out);n.connect(nb2);nb2.connect(ng);ng.connect(out);
     let tt=t+.2;const end=t+.2+rnd(1,2);vg.gain.setValueAtTime(0,tt);
     while(tt<end){const seg=rnd(.07,.22);o.frequency.setValueAtTime(rnd(95,190),tt);vg.gain.setValueAtTime(rnd(.05,.2),tt);tt+=seg;vg.gain.setValueAtTime(0.001,tt);tt+=rnd(.02,.08)}
     o.start(t);o.stop(end+.1);ng.gain.setValueAtTime(.1,t);ng.gain.setValueAtTime(0,end);n.stop(end+.2);tone(out,'square',900,end+.05,.06,.06)}
     setTimeout(radio,rnd(2500,5500))};radio()}
  /* ÉCOLE */
  if(!ext('school','ecole')){const out=zg('school');
   [[2600,1.2,.28],[1700,.8,.3]].forEach(([f,q,v],i)=>{const g=gn(v),b=flt('bandpass',f,q);nz().connect(b);b.connect(g);g.connect(out);lfo(5+i*3,v*.5,g.gain)});
   const kid=()=>{if(on('school')){const t=c.currentTime,f=rnd(650,1100);tone(out,'sine',f,t,.2,.07,f+rnd(150,400))}setTimeout(kid,rnd(150,550))};kid();
   const bell=()=>{if(on('school')){const t=c.currentTime;for(let k=0;k<5;k++)[880,1320,2210].forEach((f,i)=>tone(out,'sine',f,t+k*.38,1.3,.11/(i+1)))}setTimeout(bell,rnd(9000,13000))};setTimeout(bell,1500)}
  /* CALME */
  if(!ext('mosque','calme')){const out=zg('mosque');
   [98,147,196].forEach((f,i)=>{const o=c.createOscillator(),g=gn(.05);o.frequency.value=f;o.connect(g);g.connect(out);o.start();lfo(.07+i*.03,.03,g.gain)});
   const w=flt('lowpass',380),wg=gn(.06);nz().connect(w);w.connect(wg);wg.connect(out);lfo(.1,.04,wg.gain);
   const bird=()=>{if(on('mosque')){const t=c.currentTime,f=rnd(3000,4200);for(let k=0;k<3;k++)tone(out,'sine',f,t+k*.1,.07,.018,f+rnd(300,700))}setTimeout(bird,rnd(2500,6000))};bird()}
  /* CIRCULATION */
  if(!ext('traffic','circulation')){const out=zg('traffic');
   const l=flt('lowpass',260),g=gn(.55);nz().connect(l);l.connect(g);g.connect(out);lfo(.12,.15,g.gain);
   const m=flt('bandpass',700,.6),g2=gn(.1);nz().connect(m);m.connect(g2);g2.connect(out);lfo(.2,.06,g2.gain);
   const car=()=>{if(on('traffic')){const t=c.currentTime,b=flt('bandpass',250,2),cg=gn(0),n=nz();n.connect(b);b.connect(cg);cg.connect(out);b.frequency.setValueAtTime(250,t);b.frequency.linearRampToValueAtTime(rnd(700,1100),t+1.4);b.frequency.linearRampToValueAtTime(220,t+3);cg.gain.setValueAtTime(0,t);cg.gain.linearRampToValueAtTime(.5,t+1.4);cg.gain.linearRampToValueAtTime(0,t+3);n.stop(t+3.2)}setTimeout(car,rnd(2500,6000))};car();
   const horn=()=>{if(on('traffic')){const t=c.currentTime;tone(out,'square',420,t,.28,.03);tone(out,'square',520,t,.28,.03)}setTimeout(horn,rnd(14000,26000))};setTimeout(horn,6000)}
  A.ready=true;
}
function updateAudio(){
  const w={market:0,police:0,school:0,mosque:0,traffic:0};
  ZONES.forEach(z=>{const v=Math.pow(Math.max(0,1-Math.abs(S.s-z.s)/z.rayon),1.6);if(v>w[z.k])w[z.k]=v});
  for(const k in w){A.lv[k]=w[k];if(A.ready)A.z[k].gain.setTargetAtTime(w[k]*.9,A.ctx.currentTime,.45)}
}
function currentZone(){let b=ZONES[0],bd=1e9;ZONES.forEach(z=>{const d=Math.abs(S.s-z.s);if(d<bd){bd=d;b=z}});return b}
function setSound(v){S.sound=v;$('btnSound').setAttribute('aria-pressed',v);$('btnSound').textContent='Son : '+(v?'oui':'non');if(A.ready)A.master.gain.setTargetAtTime(v?.9:0,A.ctx.currentTime,.1)}

