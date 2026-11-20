// ═══ شروع بازی و حلقهٔ اصلی انیمیشن ═══
'use strict';
const onRes=()=>{if(RC.on)return;cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();R.setSize(innerWidth,innerHeight)};addEventListener('resize',onRes);

// خطای یک زیرسیستم نباید کل حلقهٔ سه‌بعدی را متوقف کند.
// خطاهای گذرا دوباره امتحان می‌شوند؛ خطای پایدار پس از ۳ فریم همان زیرسیستم را ایزوله می‌کند.
const FRAME_ERRORS=new Map(),FRAME_DISABLED=new Set(),FRAME_REPORTED=new Set();
function framePart(name,fn){
 if(FRAME_DISABLED.has(name))return;
 try{fn();FRAME_ERRORS.delete(name)}catch(e){
  const n=(FRAME_ERRORS.get(name)||0)+1;FRAME_ERRORS.set(name,n);
  console.error('[TribeWorld frame]',name,e);
  if(!FRAME_REPORTED.has(name)){FRAME_REPORTED.add(name);try{toast('خطای موقت در بخش سه‌بعدی «'+name+'»: '+String(e&&e.message||e).slice(0,90))}catch(_){}}
  if(n>=3){FRAME_DISABLED.add(name);console.error('[TribeWorld frame] subsystem isolated:',name);try{toast('بخش «'+name+'» متوقف شد تا کل دنیای بازی فریز نشود. لطفاً متن خطا را گزارش کن.')}catch(_){}}
 }
}

async function startGame(){
// فونت‌ها در پس‌زمینه آماده می‌شوند؛ شروع رندر منتظر دانلود فونت نمی‌ماند.
if(document.fonts&&document.fonts.load)Promise.all([document.fonts.load('800 104px Vazirmatn'),document.fonts.load('800 32px Vazirmatn')]).catch(()=>{});
joinMe();setInterval(poll,3000);localStorage.seen?$('cap').style.display='none':say(0);
const ck=new THREE.Clock(),START=new THREE.Vector3(46,52,56);let intro=0,ldDone=0,ldF=0;ctl.enabled=false;
R.setAnimationLoop(()=>{
 let dt=0,t=0;
 framePart('clock',()=>{dt=Math.min(ck.getDelta(),.1);t=ck.elapsedTime});
 framePart('environment',()=>envStep(dt));
 framePart('weather',()=>weatherStep(dt,t));   // موتور آب‌وهوا — بعد از محیط، قبل از رندر؛ در 06-world-weather.js
 framePart('hud-counters',()=>{for(const k in disp){disp[k]+=(tgt[k]-disp[k])*Math.min(1,dt*5);const v=Math.abs(tgt[k]-disp[k])<.05?tgt[k]:disp[k],txt=fa(v,k==='money'?1:0);if(last[k]!==txt){last[k]=txt;$('v_'+k).textContent=txt}}});
 framePart('intro-camera',()=>{if(intro<1&&W){intro=Math.min(1,intro+dt/3.2);const e=1-Math.pow(1-intro,3);cam.position.lerpVectors(START,HOME,e);cam.lookAt(0,0,0);if(intro>=1){ctl.enabled=true;ctl.update()}}});
 framePart('world-ambient',()=>{{// نوار sheen حذف شد (آب بلوکی خودش جریان را نشان می‌دهد)؛ زبری سطح و اسکرول بافت، جریان آرام رود را می‌سازند.
  riverWaterMat.roughness=.2+.03*Math.sin(t*.5);riverTex.offset.x=(t*.008)%1;riverTex.offset.y=(t*.0035)%1;
  if(riverWaterMat.userData.sh)riverWaterMat.userData.sh.uniforms.uTime.value=t} // تپش زندهٔ کاشی‌ها (فاز/دامنه در 06-world-scenery.js)
 for(const c of clouds){c.position.x+=dt*WCD;if(c.position.x>90)c.position.x=-90}});   // WCD = سرعت رانش ابر از باد (06-world-weather.js)
 // SWAY = دامنهٔ تاب باد (از 06-world-weather.js)
 // تاب بادی آیتم‌های sw-دار (درخت‌های کاشته‌شده/بنر): دو محور با فاز جدا = تکانِ طبیعی؛ دامنه از SWAY (حالا با گوست باد هم — توفان = تابِ محسوس)
 framePart('building-animation',()=>{const wxAmp=.026*SWAY;for(const g of objs.values())if(g.userData.sw!==undefined){const ph=g.userData.sw;g.rotation.z=Math.sin(t*1.3+ph)*wxAmp;g.rotation.x=Math.cos(t*.83+ph*1.31)*wxAmp*.62}for(const g of objs.values()){const u=g.userData;if(u.t<1){u.t=Math.min(1,u.t+dt*1.8);if(u.t<=0)continue;const e=1-Math.pow(1-u.t,3);g.scale.setScalar(Math.max(.01,e*(1+.12*Math.sin(u.t*Math.PI))))}}});
 framePart('quality-controller',()=>Q.frame(dt));
 framePart('citizen-simulation',()=>stepCits(dt,t));
 framePart('cars-simulation',()=>stepCars(dt,t));
 framePart('house-interior',()=>stepHouse(dt));
 framePart('cinema',()=>{if(CIN)CIN.step(dt)});
 framePart('camera-controls',()=>{ctl.target.x=Math.max(-34,Math.min(34,ctl.target.x));ctl.target.z=Math.max(-34,Math.min(34,ctl.target.z));ctl.update()});
 framePart('citizen-instancing',()=>{if(INST)fillInst(dt)});
 framePart('webgl-render',()=>R.render(scene,cam));
 framePart('recorder-compositor',()=>{if(RCOMP)RCOMP()});
 framePart('loading-indicator',()=>{if(W&&!ldDone&&++ldF>2){ldDone=1;const l=$('ld');if(l){l.classList.add('out');setTimeout(()=>l.remove(),900)}}});
});
 // درخواست اولیهٔ دنیا پس از راه‌اندازی حلقهٔ رندر؛ رابط و صحنه هنگام بیدارشدن سرور فریز نمی‌مانند.
 poll();
}
startGame();
