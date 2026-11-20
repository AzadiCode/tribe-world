// ═══ زیرساخت کیفیت (بخش ۲): کنترلر زنده — بنچمارک شروع، «نردبان» کاهش/افزایش خودکار کیفیت با hysteresis،
// بودجهٔ draw call، حذف اشیای دور، محافظ از دست رفتن WebGL و نمایشگر آمار (?perf=1).
// پله‌ها در 05-core-quality.js تعریف شده‌اند. API: Q.set(n) دستی، Q.snapshot() آمار، Q.perf(true) نمایشگر. ═══
'use strict';
[HPG,LPG,HQGG,WH,HBG].forEach(keepGeo); // ژئومتری‌های مشترک هرگز dispose نشوند
const Q=(()=>{
const S={lv:QD.start,best:QD.best,floor:0,lockUntil:0,t:0,age:0,bad:0,good:0,tCh:0,tUp:-99,chk:0,tc:0,benched:0,bn:0,bs:0,benchFps:0,lost:0,cT:0,cul:0,shN:0,shE:1,cmax:0,calls:0,tris:0,auto:QD.forced==null,log:[]};
const BUD={calls:QD.mob?250:600,tris:QD.mob?3e5:1.2e6};
let P=QLV[S.lv],showOv=QD.perf,ov=null,ovT=0;
function note(m){S.log.push(Math.round(S.t)+'s '+m);if(S.log.length>30)S.log.shift();try{console.info('[Q]',m)}catch(e){}}
function apply(lv,init){
 lv=Math.max(0,Math.min(9,lv|0));const p=QLV[lv];S.lv=lv;P=p;let dirty=false;
 // ۱) سایه: نوع، اندازه، نرخ آپدیت، روشن/خاموش
 sun.castShadow=p.sh!=='off';
 if(p.sh!=='off'){
  const ty=p.sh==='soft'?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;if(R.shadowMap.type!==ty){R.shadowMap.type=ty;dirty=true}
  const z=p.ss||QD.sbase;if(sun.shadow.mapSize.x!==z){sun.shadow.mapSize.set(z,z);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}}
 S.shE=p.se;S.shN=0;R.shadowMap.autoUpdate=p.se===1;if(p.se>1)R.shadowMap.needsUpdate=true;
 if(dirty&&!init)scene.traverse(o=>{const m=o.material;if(m){if(Array.isArray(m))m.forEach(x=>x.needsUpdate=true);else m.needsUpdate=true}});
 // ۲) افکت‌های نوری: هاله‌ها، نور فانوس/چراغ، کرم شب‌تاب، ابرها (متریال invisible ← اصلاً رسم نمی‌شود)
 const fx=!!p.fx;[LHALO,LNHALO,LP,HP,HQG].forEach(m=>m.visible=fx);ffm.visible=fx;clouds.forEach((c,i)=>c.visible=i<p.cl);
 // نور واقعی چراغ‌های خیابان هم زیر پرچم fx می‌آید؛ تعداد نورهای فعال در صحنه ثابت می‌ماند تا recompile رخ ندهد
 if(typeof LAMPS_FX!=='undefined'){LAMPS_FX=fx;for(const l of LAMP_LIGHTS)l.visible=fx}
 const an=fx?4:1;if(tex.anisotropy!==an){tex.anisotropy=an;tex.needsUpdate=true}
 // ۳) فاصلهٔ دید: مه نزدیک‌تر (حذف اشیای دور در cull())
 if(p.vd<1e8){scene.fog.near=Math.min(48,p.vd*.4);scene.fog.far=Math.min(150,p.vd*1.5)}else{scene.fog.near=48;scene.fog.far=150}
 S.cul=1;S.cT=0;
 // ۴) شهروندها: سقف ← tune() در models.js؛ سایهٔ شهروندان انبوه؛ تعداد نام‌های همزمان
 if(INST)for(const k in INST.P){const m=INST.P[k].m;m.castShadow=k!=='lan'&&(p.cs===2||(p.cs===1&&(k==='body'||k==='hskin'||k==='hat'||k.startsWith('hair'))))}
 TGM=Math.max(8,Math.round(TGM0*p.nt));
 // ۵) pixelRatio (آخرین اهرم، چون کیفیت تصویر را مستقیم کم می‌کند)
 const pr=Math.max(.75,Math.min(QD.pr,QD.pr*p.pr));if(Math.abs(pr-PRX)>.01||init){PRX=pr;if(init)R.setPixelRatio(PRX);else if(!RC.on){R.setPixelRatio(PRX);onRes()}}
}
function reset(){fpsA=40;S.bad=S.good=0;S.tCh=S.t}
function down(why,n=1){if(S.lv>=9)return;if(S.t-S.tUp<30){S.floor=Math.min(9,S.lv+n);S.lockUntil=S.t+180} // ارتقای اخیر شکست خورد ← تا ۳ دقیقه دوباره بالا نرو
 const from=S.lv,f0=Math.round(fpsA);apply(S.lv+n);VCAP=Math.min(VCAP,VIS+4);reset();note('↓ '+QNAMES[from]+'→'+QNAMES[S.lv]+' ('+why+', fps '+f0+')')}
function up(){const from=S.lv;apply(S.lv-1);S.tUp=S.t;reset();note('↑ '+QNAMES[from]+'→'+QNAMES[S.lv])}
function check(){
 const f=fpsA,over=S.cmax>BUD.calls&&f<40;S.calls=S.cmax;S.cmax=0;
 if(f<27||over){S.bad++;S.good=0}else if(f>52){S.good++;S.bad=0}else{S.bad=0;S.good=0}
 if(S.bad>=2&&S.lv<9&&S.t-S.tCh>3)down(over&&f>=27?'draw-calls':'fps');
 else if(S.good>=8&&S.t-S.tCh>12){const lim=S.t<S.lockUntil?Math.max(S.best,S.floor):S.best;if(S.lv>lim)up()}}
// حذف اشیای دورِ از نقطهٔ نگاه (فاصلهٔ افقی از ctl.target؛ دفتر مرکزی همیشه می‌ماند)
function cull(dt){if((S.cT-=dt)>0)return;S.cT=.5;const vd=P.vd;
 if(vd>=1e8){if(S.cul){for(const g of objs.values())if(g.userData.cv){g.userData.cv=0;g.visible=true}S.cul=0}return}
 S.cul=1;const tg=ctl.target,v2=vd*vd;
 for(const g of objs.values()){const u=g.userData,ty=u.b&&u.b.type;if(ty==='hq')continue;const dx=g.position.x-tg.x,dz=g.position.z-tg.z,far=dx*dx+dz*dz>v2*(ty==='house'||ty==='market'?1.56:1);if(far!==!!u.cv){u.cv=far?1:0;g.visible=!far}}}
function overlay(dt){if(!showOv){if(ov)ov.style.display='none';return}
 if(!ov){ov=document.createElement('div');ov.style.cssText='position:fixed;left:6px;top:6px;z-index:99998;font:11px/1.5 monospace;direction:ltr;white-space:pre;color:#bfffd0;background:rgba(0,0,0,.6);padding:4px 7px;border-radius:6px;pointer-events:none';document.body.appendChild(ov)}
 ov.style.display='';if((ovT-=dt)>0)return;ovT=.5;const I=R.info,m=I.memory;
 ov.textContent=Math.round(fpsA)+' fps · '+QNAMES[S.lv]+' ('+S.lv+')'+(S.auto?'':' · manual')+'\ncalls '+S.calls+'/'+BUD.calls+' · tris '+Math.round(I.render.triangles/1000)+'k\ngeo '+m.geometries+' · tex '+m.textures+' · prog '+(I.programs?I.programs.length:'-')+(performance.memory?' · heap '+Math.round(performance.memory.usedJSHeapSize/1048576)+'MB':'')+'\ncit '+cits.length+'/'+POP+' · dpr '+PRX.toFixed(2)+(S.benchFps?' · bench '+Math.round(S.benchFps):'')}
function frame(dt){S.t+=dt;S.age+=dt;
 if(!R.shadowMap.autoUpdate&&++S.shN>=S.shE){S.shN=0;R.shadowMap.needsUpdate=true}
 const I=R.info.render;if(I.calls>S.cmax)S.cmax=I.calls;S.tris=I.triangles;
 if(!document.hidden&&!S.lost){fpsA+=(Math.min(120,1/Math.max(dt,.001))-fpsA)*.05;const busy=RC.on||rec;
  // بنچمارک ۲ ثانیه‌ای (بعد از انیمیشن ورود و کامپایل شیدرها): اگر دستگاه ضعیف بود، چند پله یک‌جا پایین می‌آید
  if(!S.benched&&S.age>=3.5&&!busy){S.bn++;S.bs+=dt;if(S.bs>=2){S.benched=1;S.benchFps=S.bn/S.bs;const f=S.benchFps;if(S.auto){const d=f<22?3:f<30?2:f<42?1:0;if(d)down('bench '+Math.round(f)+'fps',d)}}}
  if(S.benched&&S.age>=6){if(!busy&&S.auto&&(S.chk-=dt)<=0){S.chk=1.5;check()}if((S.tc-=dt)<=0){S.tc=1.5;tune()}}}
 cull(dt);overlay(dt)}
// ── محافظ از دست رفتن زمینهٔ WebGL (کرش واقعی موبایل: پر شدن حافظهٔ GPU یا بک‌گراند شدن)
R.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();S.lost=1;note('webgl context lost');try{toast('حافظهٔ گرافیک پر شد؛ در حال بازیابی…')}catch(x){}},false);
R.domElement.addEventListener('webglcontextrestored',()=>{S.lost=0;sun.shadow.map=null;apply(Math.min(9,Math.max(S.lv+2,5)));S.floor=S.lv;S.lockUntil=S.t+300;reset();note('webgl context restored');try{toast('بازیابی شد؛ برای پایداری کیفیت کمی کم شد')}catch(x){}},false);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)reset()});
apply(S.lv,true);
const api={frame,names:QNAMES,state:S,lv:()=>S.lv,lost:()=>S.lost,
 citCap:()=>Math.max(1,Math.floor(HARD*P.cm)),halo:()=>P.fx?1e9:0,
 set(n){S.auto=false;apply(n);note('manual '+QNAMES[S.lv])},auto(){S.auto=true;reset()},
 perf(v=true){showOv=!!v;try{localStorage.tperf=v?'1':'0'}catch(e){}},
 snapshot(){const I=R.info;return{fps:Math.round(fpsA),level:S.lv,name:QNAMES[S.lv],calls:S.calls,tris:I.render.triangles,geometries:I.memory.geometries,textures:I.memory.textures,programs:I.programs?I.programs.length:0,citizens:cits.length,pop:POP,pixelRatio:PRX,bench:S.benchFps,log:S.log.slice()}}};
globalThis.Q=api;return api})();
