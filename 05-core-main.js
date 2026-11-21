// ═══ شروع بازی و ثبت زیرسیستم‌ها روی هستهٔ TWE (Tribe World Engine 2.0) ═══
// حلقهٔ انیمیشن دیگر اینجا ساخته نمی‌شود؛ TWE (05-core-twengine.js) مالکِ زمان و ترتیب است:
//   • «tick» = منطق شبیه‌سازی با گام ثابت ۳۰Hz (مستقل از فریم‌نرخ — سرعتِ واقعی حرکت‌ها روی هر دستگاهی یکی است)
//   • «frame» = کارهای نمایشی هر فریم رندر
// ترتیبِ ثبت = ترتیب اجرا (دقیقاً مثل حلقهٔ قبلی)؛ نام‌ها همان نام‌های قدیمی‌اند تا مستندات معتبر بماند.
'use strict';
const onRes=()=>{if(RC.on)return;cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();R.setSize(innerWidth,innerHeight)};addEventListener('resize',onRes);

async function startGame(){
// فونت‌ها در پس‌زمینه آماده می‌شوند؛ شروع رندر منتظر دانلود فونت نمی‌ماند.
if(document.fonts&&document.fonts.load)Promise.all([document.fonts.load('800 104px Vazirmatn'),document.fonts.load('800 32px Vazirmatn')]).catch(()=>{});
joinMe();setInterval(poll,3000);localStorage.seen?$('cap').style.display='none':say(0);
const START=new THREE.Vector3(46,52,56);let intro=0,ldDone=0,ldF=0;ctl.enabled=false;
// ── زیرسیستم‌های نمایشی (هر فریم رندر) ──
TWE.sys('environment',{frame:d=>envStep(d)});
TWE.sys('weather',{frame:(d,t)=>weatherStep(d,t)});   // موتور آب‌وهوا — بعد از محیط، قبل از رندر؛ در 06-world-weather.js
TWE.sys('hud-counters',{frame:d=>{for(const k in disp){disp[k]+=(tgt[k]-disp[k])*Math.min(1,d*5);const v=Math.abs(tgt[k]-disp[k])<.05?tgt[k]:disp[k],txt=fa(v,k==='money'?1:0);if(last[k]!==txt){last[k]=txt;$('v_'+k).textContent=txt}}}});
TWE.sys('intro-camera',{frame:d=>{if(intro<1&&W){intro=Math.min(1,intro+d/3.2);const e=1-Math.pow(1-intro,3);cam.position.lerpVectors(START,HOME,e);cam.lookAt(0,0,0);if(intro>=1){ctl.enabled=true;ctl.update()}}}});
TWE.sys('world-ambient',{frame:(d,t)=>{{// نوار sheen حذف شد (آب بلوکی خودش جریان را نشان می‌دهد)؛ زبری سطح و اسکرول بافت، جریان آرام رود را می‌سازند.
 riverWaterMat.roughness=.2+.03*Math.sin(t*.5);riverTex.offset.x=(t*.008)%1;riverTex.offset.y=(t*.0035)%1;
 if(riverWaterMat.userData.sh)riverWaterMat.userData.sh.uniforms.uTime.value=t} // تپش زندهٔ کاشی‌ها (فاز/دامنه در 06-world-scenery.js)
for(const c of clouds){c.position.x+=d*WCD;if(c.position.x>90)c.position.x=-90}}});   // WCD = سرعت رانش ابر از باد (06-world-weather.js)
// SWAY = دامنهٔ تاب باد (از 06-world-weather.js)
// تاب بادی آیتم‌های sw-دار (درخت‌های کاشته‌شده/بنر): دو محور با فاز جدا = تکانِ طبیعی؛ دامنه از SWAY (با گوست باد — توفان = تابِ محسوس)
TWE.sys('building-animation',{frame:(d,t)=>{const wxAmp=.026*SWAY;for(const g of objs.values())if(g.userData.sw!==undefined&&!g.userData.m){const ph=g.userData.sw;g.rotation.z=Math.sin(t*1.3+ph)*wxAmp;g.rotation.x=Math.cos(t*.83+ph*1.31)*wxAmp*.62}for(const g of objs.values()){const u=g.userData;if(u.t<1){u.t=Math.min(1,u.t+d*1.8);if(u.t<=0)continue;const e=1-Math.pow(1-u.t,3);g.scale.setScalar(Math.max(.01,e*(1+.12*Math.sin(u.t*Math.PI))));if(u.t>=1&&!u.q&&typeof CH!=='undefined'&&CH.mergeable(u.b.type)){u.q=1;CH.queue(g)}}}}});
TWE.sys('world-chunks',{frame:(d,t)=>CH.frame(d,t)});   // فاز ۲ — ارتقا/بازسازی بودجه‌ای چانک‌های دنیای ایستا (قبل از کنترل کیفیت و رندر)
TWE.sys('quality-controller',{frame:d=>Q.frame(d)});
// ── زیرسیستم‌های شبیه‌سازی (گام ثابت ۳۰Hz — مستقل از فریم‌نرخ) ──
TWE.sys('citizen-simulation',{tick:(d,t)=>stepCits(d,t)});
TWE.sys('cars-simulation',{tick:(d,t)=>stepCars(d,t)});
TWE.sys('house-interior',{frame:d=>stepHouse(d)});
TWE.sys('cinema',{frame:d=>{if(CIN)CIN.step(d)}});
TWE.sys('camera-controls',{frame:()=>{ctl.target.x=Math.max(-34,Math.min(34,ctl.target.x));ctl.target.z=Math.max(-34,Math.min(34,ctl.target.z));ctl.update()}});
TWE.sys('citizen-instancing',{frame:d=>{if(INST)fillInst(d)}});
TWE.sys('webgl-render',{frame:()=>R.render(scene,cam)});
TWE.sys('recorder-compositor',{frame:()=>{if(RCOMP)RCOMP()}});
TWE.sys('loading-indicator',{frame:()=>{if(W&&!ldDone&&++ldF>2){ldDone=1;const l=$('ld');if(l){l.classList.add('out');setTimeout(()=>l.remove(),900)}}}});
// ── شمارش موجودیت‌ها برای داشبورد عملکرد (مالکیتِ داده دستِ سیستم‌های صاحبش می‌ماند) ──
TWE.Entities.provider('buildings',()=>objs.size);
TWE.Entities.provider('citizens',()=>cits.length);
TWE.Entities.provider('cars',()=>cars.length);
TWE.Entities.provider('visible-citizens',()=>VIS);
// حلقهٔ رندر: زمان‌بندی، شبیه‌سازیِ گام‌ثابت، ایزوله‌سازی خطا و اندازه‌گیری — همه داخل هستهٔ TWE
R.setAnimationLoop(()=>TWE.loop());
// درخواست اولیهٔ دنیا پس از راه‌اندازی حلقهٔ رندر؛ رابط و صحنه هنگام بیدارشدن سرور فریز نمی‌مانند.
poll();
}
startGame();
