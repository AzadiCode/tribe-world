// ═══ موسیقی زمینه با WebAudio (بدون فایل صوتی). ═══
'use strict';
// ── موسیقی زمینه: کاملاً ساخته‌شده با وب‌اودیو (بدون فایل صوتی، بدون کپی‌رایت). مقام شور روی ر، ۸۴ ضرب، آرام و کم‌صدا
/*MUS-START*/
const MU=(()=>{const E=60/84/2,SC=[0,1,3,5,7,8,10,12],F=q=>293.66*Math.pow(2,q/12),
MEL='0 - 2 3 4 - - -  3 - 2 1 2 - 0 -  4 - 5 4 3 - 2 3  2 - 1 - 0 - - -  4 - 6 7 6 - 5 4  5 - 4 3 4 - 2 -  3 - 2 1 2 3 4 -  3 - 1 - 0 - - -'.split(/\s+/),
BS=[0,0,-4,-2,0,3,-4,0],CH=[[0,3,7],[-4,0,3],[0,3,7],[-4,0,3]],NZ=new WeakMap();
const env=(c,t,a,d,pk)=>{const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d);return g};
function pluck(c,o,t,f,L,v){const d=Math.max(.7,L*1.4),g=env(c,t,.012,d,v),lp=c.createBiquadFilter(),a=c.createOscillator(),b=c.createOscillator(),gb=c.createGain();lp.type='lowpass';lp.frequency.value=2400;lp.Q.value=.3;a.type='triangle';b.type='sine';a.frequency.value=f;b.frequency.value=f*2;a.detune.value=(Math.random()-.5)*8;gb.gain.value=.25;
a.connect(g);b.connect(gb);gb.connect(g);g.connect(lp);lp.connect(o);const e=t+.07+d;a.start(t);b.start(t);a.stop(e);b.stop(e)}
function bass(c,o,t,f,v){const g=env(c,t,.015,1.1,v),a=c.createOscillator();a.type='sine';a.frequency.value=f;a.connect(g);g.connect(o);a.start(t);a.stop(t+1.2)}
function pad(c,o,t,f,dur,v){const g=c.createGain(),lp=c.createBiquadFilter(),a=c.createOscillator();lp.type='lowpass';lp.frequency.value=800;a.type='triangle';a.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+1.5);g.gain.setValueAtTime(v,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+1.6);a.connect(g);g.connect(lp);lp.connect(o);a.start(t);a.stop(t+dur+1.7)}
function thump(c,o,t,v){const g=env(c,t,.004,.32,v),a=c.createOscillator();a.type='sine';a.frequency.setValueAtTime(150,t);a.frequency.exponentialRampToValueAtTime(52,t+.16);a.connect(g);g.connect(o);a.start(t);a.stop(t+.4)}
function tap(c,o,t,v){let b=NZ.get(c);if(!b){b=c.createBuffer(1,c.sampleRate*.2|0,c.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;NZ.set(c,b)}
const n=c.createBufferSource(),f=c.createBiquadFilter(),g=env(c,t,.002,.07,v);n.buffer=b;f.type='bandpass';f.frequency.value=1900;f.Q.value=1.1;n.connect(f);f.connect(g);g.connect(o);n.start(t);n.stop(t+.12)}
function step(c,o,t,n){const k=n%64,tok=MEL[k],bar=k>>3,j=k&7;
if(tok!=='-'){let L=1;while(MEL[(k+L)%64]==='-'&&L<8)L++;pluck(c,o,t,F(SC[+tok]),L*E,.34)}
if(j===0)bass(c,o,t,F(BS[bar]-24),.5);if(j===4)bass(c,o,t,F(BS[bar]-24),.26);
if(k%16===0)CH[k>>4].forEach(q=>pad(c,o,t,F(q-12),16*E,.05));
if(j===0)thump(c,o,t,.55);else if(j===4)thump(c,o,t,.3);else if(j===3||j===6)tap(c,o,t,.16);else if(j===7)tap(c,o,t,.09)}
function chain(c,dest){const m=c.createGain(),bus=c.createGain(),cp=c.createDynamicsCompressor(),cv=c.createConvolver(),wet=c.createGain(),len=c.sampleRate*1.8|0,ir=c.createBuffer(2,len,c.sampleRate);
for(let h=0;h<2;h++){const d=ir.getChannelData(h);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}
cv.buffer=ir;wet.gain.value=.3;bus.connect(m);bus.connect(cv);cv.connect(wet);wet.connect(m);cp.threshold.value=-14;cp.ratio.value=4;m.connect(cp);cp.connect(dest);return{bus,m}}
return{E,V:.24,N:MEL.length,step,chain}})();
/*MUS-END*/
(()=>{let ac=null,o=null,nt=0,sn=0,muted=localStorage.mute==='1';window.__tribeAudio=()=>({ac,out:o&&o.m});const bm=$('bm'),S='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
I1=S+'<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.5 7.5 0 0 1 0 10.4"/></svg>',I0=S+'<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
paint=()=>{bm.innerHTML=muted?I0:I1;bm.title=muted?'پخش موسیقی':'قطع صدا'};
function boot(){if(ac)return true;const A=window.AudioContext||window.webkitAudioContext;if(!A)return false;ac=new A();o=MU.chain(ac,ac.destination);o.m.gain.value=0;nt=ac.currentTime+.15;
setInterval(()=>{if(ac.state!=='running')return;if(nt<ac.currentTime-.1)nt=ac.currentTime+.05;while(nt<ac.currentTime+1.2){MU.step(ac,o.bus,nt,sn++);nt+=MU.E}},120);return true}
function on(){if(muted||!boot())return;ac.resume().then(()=>{o.m.gain.cancelScheduledValues(ac.currentTime);o.m.gain.setTargetAtTime(MU.V,ac.currentTime,.9)}).catch(()=>0)}
function off(){if(!ac)return;o.m.gain.cancelScheduledValues(ac.currentTime);o.m.gain.setTargetAtTime(0,ac.currentTime,.12);setTimeout(()=>{if(muted)ac.suspend()},700)}
const EV=['pointerup','touchend','keydown'],un=()=>{if(muted)return;on();if(ac&&ac.state==='running')EV.forEach(e=>removeEventListener(e,un,true))};EV.forEach(e=>addEventListener(e,un,true));
bm.onclick=()=>{muted=!muted;localStorage.mute=muted?'1':'';paint();muted?off():on();toast(muted?'صدا قطع شد':'موسیقی روشن شد')};
document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden)ac.suspend();else if(!muted)ac.resume()});paint()})();
