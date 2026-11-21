// ═══ جاده‌ها و پیاده‌روهای به‌هم‌پیوسته + چراغ خیابان. ═══
'use strict';
// ── جاده‌های متصل + چراغ خیابان
const LAMP=new THREE.MeshStandardMaterial({color:0xfff1c0,emissive:0xffd98a,emissiveIntensity:.1}),LP=new THREE.MeshBasicMaterial({map:GRADT,color:0xffc873,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),LPG=new THREE.PlaneGeometry(4.6,4.6),ASP=0x4a4d52;
const LBG=keepGeo(new THREE.SphereGeometry(.09,8,6));
// ── نور واقعی چراغ‌های خیابان: استخر کوچک و ثابتی از PointLight که هر شب روی نزدیک‌ترین چراغ‌ها به دوربین می‌نشیند.
// تعداد نورها هنگام بازی ثابت می‌ماند (بدون recompile شیدر)، روز با intensity=0 خاموش است و
// کیفیت پایین (fx=0) آن‌ها را کامل از صحنه برمی‌دارد ⇒ بدون افت عملکرد.
let LAMPS_FX=true,lampT=0;
const LAMP_LIGHTS=[];for(let i=0;i<(MOB?4:8);i++){const l=new THREE.PointLight(0xffd28a,0,9,2);l.castShadow=false;l.position.set(0,-60,0);scene.add(l);LAMP_LIGHTS.push(l)}
const lampPts=[];                                    // موقعیت جهانی سرِ چراغ‌ها ← در roads() به‌روز می‌شود
function lampStep(dt){const tgt=LAMPS_FX?3.0*NT:0;
 if((lampT-=dt)<=0){lampT=.5;const tx=ctl.target.x,tz=ctl.target.z,near=[];
  for(const p of lampPts){const dx=p.x-tx,dz=p.z-tz;near.push({d:dx*dx+dz*dz,p})}
  near.sort((a,b)=>a.d-b.d);
  for(let i=0;i<LAMP_LIGHTS.length;i++){const l=LAMP_LIGHTS[i],p=near[i]?near[i].p:null;
   if(p&&(!l.userData.p||l.userData.p.x!==p.x||l.userData.p.z!==p.z)){l.position.set(p.x,p.y,p.z);l.intensity=0}   // جابه‌جایی با محو شدن شروع شود
   l.userData.p=p;l.userData.on=!!p}}
 for(const l of LAMP_LIGHTS){const t=l.userData.on?tgt:0;l.intensity+=(t-l.intensity)*Math.min(1,dt*5)}}
// هر کاشی جاده = یک مش ادغام‌شده (رنگ در رأس‌ها) + فقط برای چراغ‌دار: لامپ/هاله. قبلاً ۵ تا ۱۵ مش جدا بود.
function roadMesh(g,m,lamp,cr=0){clearKids(g);
const A=[],q=(w,d,x,z,c,h=.08)=>A.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,h/2,z),c));
q(ROAD_WIDTH,ROAD_WIDTH,0,0,0xb9b3a4,.06);q(ROAD_WIDTH*.65,ROAD_WIDTH*.65,0,0,ASP);
[[1,0,-.825,1.3,.6],[2,.825,0,.6,1.3],[4,0,.825,1.3,.6],[8,-.825,0,.6,1.3]].forEach(([bit,x,z,w,d])=>{if(m&bit){q(w,d,x,z,ASP);q(bit&5?.06:.3,bit&5?.3:.06,x*.9,z*.9,0xf1e7b8,.09)}});
if(cr){
 // گذرگاه عابر: زیگزاگ کامل عرض جاده روی ضلعِ تابلوی عابر پیاده (همان سبک همیشگی).
 // ماسک هر تابلو فقط «یک» ضلع را فعال می‌کند (roadCrossingMask)؛ بنابراین تابلوی گوشهٔ تقاطع
 // دیگر دو مجموعهٔ عمود بر هم (شبکه‌ای) نمی‌سازد و فقط زیگزاگ جادهٔ خودش رسم می‌شود.
 const zb=(w,d,x,z)=>q(w,d,x,z,0xefe9d6,.095);
 for(let i=0;i<7;i++){const o=-.72+i*.24;
  if(cr&5)zb(1.4,.115,0,o);
  if(cr&10)zb(.115,1.4,o,0);
 }
}
// خط توقف سفید در ورودی تقاطع‌های سه‌راه/چهارراه؛ یک خط برای هر شاخهٔ متصل
const degree=((m&1)?1:0)+((m&2)?1:0)+((m&4)?1:0)+((m&8)?1:0);
if(degree>=3){const stop=(w,d,x,z)=>q(w,d,x,z,0xe5e2d8,.098);if(m&1)stop(1.18,.075,0,-.88);if(m&2)stop(.075,1.18,.88,0);if(m&4)stop(1.18,.075,0,.88);if(m&8)stop(.075,1.18,-.88,0)}
if(lamp)A.push(vcGeo(new THREE.CylinderGeometry(.025,.035,1.1,5).translate(.82,.55,.82),0x2f3338));
g.add(vcMesh(A,VCM,!!lamp,true));
if(lamp){const bl=new THREE.Mesh(LBG,LAMP);bl.position.set(.82,1.12,.82);g.add(bl);const pl=NORAY(new THREE.Mesh(LPG,LP));pl.rotation.x=-Math.PI/2;pl.position.set(.55,.12,.55);g.add(pl);const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(1,1,1);hl.position.set(.82,1.12,.82);g.add(hl)}}
// ── پیاده‌رو سلولی: کف و حاشیهٔ برجسته دقیقاً داخل footprint دو×دو سلول می‌مانند.
// هر ضلعِ متصل، حاشیهٔ همان ضلع را باز می‌کند؛ بنابراین اتصال به مسیر/جاده/ورودی ساختمان
// بدون بازوی شناور، بیرون‌زدگی یا هم‌پوشانیِ هندسی انجام می‌شود.
const ROAD_WIDTH=FOOT.road[0]*U,PTW=ROAD_WIDTH*PATH_WIDTH_RATIO;
// پیاده‌رو مدرن و هم‌سطح: سنگ‌فرش بتنی روشن، درزهای باریک و لبهٔ کوتاه.
// ضخامت کل فقط ۳٫۲ سانتی‌متر است؛ کف از y=0 شروع می‌شود و هیچ پایهٔ معلقی ندارد.
let PATH_STYLE=(()=>{try{return localStorage.getItem('tw_path_style')==='dirt'?'dirt':'stone'}catch(_){return'stone'}})();
// مسیرهای قدیمی که هنوز فیلد style ندارند، سبک زمان ورود به نسخهٔ جدید را حفظ می‌کنند.
const LEGACY_PATH_STYLE=(()=>{try{let v=localStorage.getItem('tw_path_legacy_style');if(v!=='dirt'&&v!=='stone'){v=PATH_STYLE;localStorage.setItem('tw_path_legacy_style',v)}return v}catch(_){return PATH_STYLE}})();
const PT_BASE=0x77776c,PT_TOP=[0xb9b8aa,0xc2c0b2,0xb4b4a7,0xc7c4b6],PT_JOINT=0x969589;
function pathMesh(g,m,id,style=PATH_STYLE){clearKids(g);
 const all=[],box=(w,h,d,x,y,z,color)=>all.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,y,z),color));
 if(style==='dirt'){
  // مسیر خاکی فشرده، کمی تیره‌تر از زمین اطراف؛ بدون جدول و سکوی برجسته
  const soil=[0x8c7650,0x947d55,0x88724c,0x9a8258][((id*7)%4+4)%4];
  box(PTW,.014,PTW,0,.007,0,soil);
  // دانه‌های ریز و پراکندهٔ خاک/ریگ؛ کاملاً درون footprint
  const seed=((id*9301+49297)%233280+233280)%233280;
  for(let i=0;i<7;i++){
   const x=(((seed*(i+3)*17)%997)/997-.5)*PTW*.78;
   const z=(((seed*(i+5)*29)%991)/991-.5)*PTW*.78;
   box(.018,.002,.012,x,.015,z,i%2?0x66583e:0xb19a6d);
  }
 }else{
  const c=((id*9301+49297)%233280+233280)%233280,top=PT_TOP[c%PT_TOP.length];
  box(PTW,.024,PTW,0,.012,0,PT_BASE);
  box(PTW-.012,.008,PTW-.012,0,.028,0,top);
  const seam=.006,span=PTW-.055;
  box(span,.0015,seam,0,.0325,0,PT_JOINT);
  box(seam,.0015,span,0,.0325,0,PT_JOINT);
  // جدول فقط در لبه‌های آزاد؛ در اتصال مستقیم، گوشه، سه‌راه و چهارراه جدول قطع می‌شود.
  const lip=.006,lh=.006;
  if(!(m&4))box(PTW,lh,lip,0,.003,PTW/2-lip/2,PT_BASE);
  if(!(m&1))box(PTW,lh,lip,0,.003,-PTW/2+lip/2,PT_BASE);
  if(!(m&2))box(lip,lh,PTW,PTW/2-lip/2,.003,0,PT_BASE);
  if(!(m&8))box(lip,lh,PTW,-PTW/2+lip/2,.003,0,PT_BASE);
 }
 g.add(vcMesh(all,VCP,false,true));
}
function setPathStyle(style){
 PATH_STYLE=style==='dirt'?'dirt':'stone';
 try{localStorage.setItem('tw_path_style',PATH_STYLE)}catch(_){}
 // سبک انتخابی فقط پیش‌فرضِ مسیرهای بعدی است؛ مسیرهای ساخته‌شده دوباره‌رندر نمی‌شوند.
 if(typeof BP!=='undefined'&&BP){
  BP._tpl.clear();
  if(typeof bpRemeshAll==='function')bpRemeshAll();
  if(typeof bpGhostType==='function'&&BP.on)bpGhostType();
 }
}
// تماس واقعیِ مستطیل‌های سلولی؛ تماس لبه‌ای مجاز است و گوشه‌تماس اتصال نمی‌سازد.
// تشخیص ضلع گذرگاه فقط از «تماس دقیق لبه‌به‌لبه» footprint تابلو با کاشی جاده (همان قاعدهٔ fpTouchDir که
// خودِ چیدمان تابلو با آن اعتبارسنجی می‌شود؛ snap همه‌چیز را روی شبکه می‌نشیند پس تماس همیشه دقیق است).
// تلورانسِ قبلی حذف شد: تلورانس ±۱ خرده‌سلول باعث می‌شد تابلوی گوشهٔ تقاطع علاوه بر ضلع جادهٔ خودش،
// ضلع جادهٔ عمودِ مجاور را هم روشن کند و دو مجموعه زیگزاگ عمود بر هم (شبکه‌ای) روی هم بیفتد.
// نگاشت جهت تماس (از تابلو به جاده) به ضلعِ رو به تابلو: جاده شرقِ تابلو→ضلع غربی(8)، غرب→شرقی(2)،
// جنوبِ تابلو→ضلع شمالی(1)، شمال→جنوبی(4).
function roadCrossingMask(road,signs){
 let mask=0;
 for(const sign of signs){const d=fpTouchDir(sign,road);if(d>=0)mask|=[4,8,1,2][d]}
 return mask;
}
function roads(w){const blds=w.buildings,rs=[],ps=[],cs=[];
 for(const b of blds){if(b.type==='road')rs.push(b);else if(b.type==='path')ps.push(b);else if(b.type==='crossing')cs.push(b)}
 fpIndexEnsure(blds); // ایندکس مجاورت (فاز ۰): یک‌بار به‌ازای هر تغییر دنیا؛ ماسک‌ها/در/گذرگاه بدون حلقهٔ درجه‌دو و بدون کلید رشته‌ای
 const doorMask=fpDoorMask(blds); // عددی: کلید مرکز پیاده‌رو ← بیت‌های ضلعِ متصل به درِ سازه‌ها (همان مجموعهٔ fpDoorLinks)
lampPts.length=0;
// خط‌کشی گذرگاه فقط با «تابلوی عابر پیاده» ساخته می‌شود؛ پیاده‌رو دیگر خط‌کشی خودکار جاده را تغییر نمی‌دهد.
for(const b of rs){const g=objs.get(b.id);if(!g)continue;const m=fpMaskFor(b,['road']),cr=fpCrossMaskFor(b);const lamp=((b.x+b.z)%2+2)%2===0?1:0;if(lamp)lampPts.push({x:b.x*U+.82,y:1.12+fpBaseY('road',b.x,b.z,0),z:b.z*U+.82});const k=m+'|'+cr+'|'+lamp;if(g.userData.k!==k){g.userData.k=k;if(typeof CH!=='undefined')CH.preRefresh(g);roadMesh(g,m,lamp,cr);if(typeof CH!=='undefined')CH.refresh(g)}}   // y چراغ = ارتفاع واقعی گروه جاده (fpBaseY — کنار رود هم دقیق); فاز ۲: تایل چانک‌شده ← ورودی‌های تازه
for(const b of ps){const g=objs.get(b.id);if(!g)continue;const k=fpIdxKey(b.gx??b.x,b.gz??b.z),m=fpMaskFor(b,['path','road'])|(doorMask.get(k)||0),style=b.style==='dirt'?'dirt':b.style==='stone'?'stone':LEGACY_PATH_STYLE,sig=m+'|'+style;if(g.userData.k!==sig){g.userData.k=sig;if(typeof CH!=='undefined')CH.preRefresh(g);pathMesh(g,m,b.id,style);if(typeof CH!=='undefined')CH.refresh(g)}}
// تابلوی عابر پیاده رو به جادهٔ مجاورش می‌ایستد (صفحهٔ تابلو عمود بر مسیر عابر)؛ تشخیص با همان fpTouchDir.
for(const c of cs){const g=objs.get(c.id);if(!g)continue;let fx=0,fz=0;
 const r=fpFirstTouchRoad(c); // اولین جادهٔ چسبیده به ترتیب فهرست — همان رفتار «اولین rs» قبل
 if(r){const d=fpTouchDir(c,r);fx=[0,1,0,-1][d];fz=[-1,0,1,0][d]}
 if(fx||fz)g.rotation.y=Math.atan2(fx,fz)}}
