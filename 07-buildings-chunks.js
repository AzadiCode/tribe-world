// ═══ فاز ۲ — رندر چانکی دنیای ایستا: ادغام ساختمان‌های ثابت در مش‌های چانک ═══
// مشکل در مقیاس هزاران ساختمان: هر خانه ۱۵-۱۷ مش جدا (bake به‌ازای هر متریال) ⇒ هزاران درا-کال —
// بودجهٔ موبایل (≤۲۵۰) با چند صد خانه هم منفجر می‌شود. راه‌حل: هر ساختمانِ «ادغام‌پذیر» پس از پایان
// انیمیشن ورود، در چانک ۱۶×۱۶ واحدِ خودش ادغام می‌شود: متریال‌های سادهٔ رنگی ← سطل‌های vertex-color
// مشترک (کلید = صافی/زبری)، متریال خاص (GLOW/پلاک اطلسی/هالهٔ شیشه) ← ادغام به‌ازای هر متریال.
// نتیجه: به‌جای ~۱۵ درا-کال برای هر خانه، ~۱۳ مش برای «کل چانک» (شکل هندسه/رنگ/زبری/سایهٔ هر قطعه
// عیناً همان است — فقط بافرها در هم ادغام شده‌اند).
// معماری:
//  • CH_GC: برای هر سازهٔ ادغام‌شده، ورودی‌های {هندسهٔ پایه، ماتریس چانک-محل، متریال/سطل} + باکس جهانی
//    (برای انتخاب/پیش‌نمایش) + گروه مبلمانِ داخل خانه (هرگز در چانک نمی‌رود؛ سقفِ بسته‌اش را می‌پوشاند).
//  • چانک = ریشهٔ گروه در صحنه + مش‌های ادغام‌شده + اسپرایت‌های هالهٔ چراغ (اسپرایت قابل ادغام نیست).
//  • بازسازی چانک فقط clone+apply+concat روی ورودی‌های کش‌شده است — مدل‌ها از نو ساخته نمی‌شوند (هیچ فریزی).
//  • demote (کلیک/جابه‌جا/چرخش/نمای داخل) = همگام: سازه همان فریم زنده می‌شود و چانک بدون آن بازسازی
//    می‌شود تا هیچ فریمی دوبار یا غیب دیده نشود. promote/بازسازی کثیف‌ها بودجه‌ای و نزدیک‌به‌دوربین‌اول.
//  • تاب باد درخت‌های ادغام‌شده شیدری است (همان الگوی wxBendMat جنگل: aPhase/aOrg) — صفر هزینهٔ CPU.
//  • انتخاب (raycast) روی ادغام‌شده‌ها با AABBهای کش‌شده انجام می‌شود — دقیق در سطح ساختمان و سبک.
//  • واپس‌زنی امن: نوع ادغام‌نشدنی (hq/بنر)، خانهٔ باز، یا هر خطای ادغام ← همان مسیر زندهٔ قبلی.
'use strict';
const CHU=16;                                     // ضلع چانک (واحد دنیا) — نقشهٔ ±۴۰ ⇒ ۶×۶ چانک
const CH_MERGE={road:1,path:1,crossing:1,tree:1,farm:1,market:1,house:1};
// ── سطل‌های متریال VC: کلید «S|F + زبری» ← متریال مشترک (رنگ در رأس‌ها؛ ظاهر عین متریال اصلی)
const CH_BUCKETS=new Map();
function chBucketMat(k){let m=CH_BUCKETS.get(k);if(!m){m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:+k.slice(1),flatShading:k[0]==='F'});CH_BUCKETS.set(k,m)}return m}
function chBucketKey(m){ // فقط متریال استانداردِ سادهٔ رو‌به‌جلو بدون بافت/شفافیت/فلز/نورِ خود — بقیه «مال خودش»
 if(!m.isMeshStandardMaterial||m.map||m.transparent||m.side!==THREE.FrontSide||(m.metalness>0)||(m.emissive&&m.emissive.getHex()!==0))return null;
 return(m.flatShading?'F':'S')+Math.round((m.roughness==null?1:m.roughness)*100)/100}
// ── تاب باد درخت ادغام‌شده — شیدری روی همان VCF؛ عین فرمول building-animation (دامنه از SWAY آب‌وهوا)
const CH_WXF={t:{value:0},amp:{value:.026}};
const VCFW=(()=>{const m=VCF.clone();m.onBeforeCompile=sh=>{sh.uniforms.uChT=CH_WXF.t;sh.uniforms.uChA=CH_WXF.amp;
 sh.vertexShader=sh.vertexShader
  .replace('#include <common>','#include <common>\nuniform float uChT;uniform float uChA;attribute float aPhase;attribute vec3 aOrg;')
  .replace('#include <begin_vertex>','#include <begin_vertex>\n{float chz=sin(uChT*1.3+aPhase)*uChA,chx=cos(uChT*.83+aPhase*1.31)*uChA*.62;vec3 chr=transformed-aOrg;transformed.x-=chz*chr.y;transformed.z-=chx*chr.y;transformed.y+=chz*chr.x+chx*chr.z;}')};
 return m})();
// ── وضعیت
const CH_MAP=new Map(),CH_GC=new Map(),CH_DIRTY=new Set(),CH_Q=[];
function chNew(ck,ox,oz){const root=new THREE.Group();root.position.set(ox,0,oz);scene.add(root);
 const c={key:ck,ox,oz,root,members:new Set(),meshes:[],sprites:[],far:false};CH_MAP.set(ck,c);CH_DIRTY.add(ck);return c}
function chFar(c){c.far=false;for(const id of c.members){const d=CH_GC.get(id);if(d&&(d.ty==='house'||d.ty==='market')){c.far=true;break}}}
function chMarkDirty(ck){CH_DIRTY.add(ck)}
// لخت‌کردن گروه زنده بدون dispose — مالکیت هندسه‌ها به ورودی‌های چانک منتقل شده است
function chStrip(g){for(const c of[...g.children])g.remove(c)}
// آزادی هندسه‌های ورودی — کَنونیکال‌ها (CH_CANON) و مشترک‌های keepGeo هرگز: همچنان از CH_NORMED سرویس می‌شوند
function chGCDispose(d){for(const e of d.en)if(e.ge&&!SHGEO.has(e.ge)&&!CH_CANON.has(e.ge))e.ge.dispose();d.en.length=0;d.sp.length=0}
// ── اسنپ‌شات: ورودی‌های {هندسه، متریال/سطل، ماتریس جهانی، سایه} + اسپرایت‌ها از وضعیت زندهٔ گروه
function chSnap(g){g.updateMatrixWorld(true);
 const en=[],sp=[];
 g.traverse(o=>{
  if(o.isSprite){sp.push({mat:o.material,p:o.getWorldPosition(new THREE.Vector3()),s:o.scale.clone()});return}
  if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;
  const m=o.material;
  en.push({ge:o.geometry,mat:m,bk:chBucketKey(m)||m,cast:!!o.castShadow,recv:!!o.receiveShadow,m4:o.matrixWorld.clone()})});
 return{en,sp}}
// هم‌سازی «یک‌بار برای هر هندسهٔ یکتا» (کش WeakMap): خروجی همیشه بدون ایندکس + مجموعهٔ صفت یکنواخت در هر سطل.
// سطل VC ← فقط position/normal/color؛ متریال «خودش» ← صفت‌هایش دست‌نخورده (رنگِ رأس‌دارِ درخت‌ها حفظ می‌شود).
// هندسه‌های اصلیِ غیرمشترک بعد از ساخت نسخهٔ کَنونیکال آزاد می‌شوند؛ اصلِ مشترک‌های keepGeo هرگز dispose نمی‌شود —
// همهٔ مدخل‌های یک هندسهٔ مشترک به «همان» نسخهٔ کَنونیکال می‌رسند تا mergeGeometries هرگز ناهماهنگ نماند.
const CH_NORMED=new WeakMap(),CH_CANON=new WeakSet();const _chC=new THREE.Color();
function chCanonical(e){const ge=e.ge;let n=CH_NORMED.get(ge);
 if(n){e.ge=n;return}
 n=ge.index?ge.toNonIndexed():ge.clone();
 if(typeof e.bk==='string'){
  // سطل VC: فقط position/normal/color — رنگِ موجود حفظ می‌شود (دوباره رنگ نمی‌شود)، نبودِ آن از رنگ متریال
  for(const k of Object.keys(n.attributes))if(k!=='position'&&k!=='normal'&&k!=='color')n.deleteAttribute(k);
  if(!n.attributes.color){const cnt=n.attributes.position.count,ca=new Float32Array(cnt*3);_chC.setHex(e.mat.color.getHex());for(let i=0;i<cnt;i++){ca[i*3]=_chC.r;ca[i*3+1]=_chC.g;ca[i*3+2]=_chC.b}n.setAttribute('color',new THREE.BufferAttribute(ca,3))}
 }
 // متریال «خودش»: هیچ صفتی حذف نمی‌شود — رنگ رأس‌دارِ درخت‌ها (VCFW) باید بماند؛ صفت‌های هر سطل از یک سازنده‌اند و یکنواخت‌اند
 CH_NORMED.set(ge,n);CH_CANON.add(n);
 if(!SHGEO.has(ge))ge.dispose();
 e.ge=n}
function chNormalize(d){for(const e of d.en)chCanonical(e)}
// ماتریس‌ها/اسپرایت‌ها را نسبت به مبدأ چانک چانک-محل می‌کند
function chLocalize(d,sn,ox,oz){const M=new THREE.Matrix4().makeTranslation(-ox,0,-oz);
 for(const e of sn.en)e.m4.premultiply(M);
 for(const s of sn.sp){s.p.x-=ox;s.p.z-=oz}}
// ── ارتقا: سازهٔ زندهٔ تمام‌شده ← چانک
function chPromote(g){const b=g.userData.b;
 if(!b||g.userData.m||!CH_MERGE[b.type])return false;
 if((g.userData.t||0)<1)return false;                                  // هنوز در انیمیشن ورود
 if(typeof HOV!=='undefined'&&HOV&&HOV.g===g)return false;             // خانهٔ باز ادغام نمی‌شود
 const x=g.position.x,z=g.position.z,ox=Math.floor(x/CHU)*CHU,oz=Math.floor(z/CHU)*CHU,ck=ox+','+oz;
 const bb=new THREE.Box3().setFromObject(g);                            // باکس جهانی — انتخاب/پیش‌نمایش چانک‌شده‌ها
 const inn=g.userData.inn;if(inn)g.remove(inn);                        // مبلمان داخل هرگز در چانک نمی‌رود
 const sn=chSnap(g);
 if(inn)g.add(inn);
 chLocalize(null,sn,ox,oz);
 const d={id:b.id,ty:b.type,ck,en:sn.en,sp:sn.sp,bb,inn:inn||null,sw:0,ph:0,ox:0,oy:0,oz:0};
 if(b.type==='tree'){d.sw=1;d.ph=((b.id*9301+49297)%233280)/233280*6;   // همان فرمول فاز تابِ درخت قدیم
  d.ox=g.position.x-ox;d.oy=g.position.y;d.oz=g.position.z-oz;
  for(const e of d.en){e.bk=VCFW;e.sw=1;e.ph=d.ph;e.ox=d.ox;e.oy=d.oy;e.oz=d.oz}}
 chNormalize(d);
 CH_GC.set(b.id,d);
 g.userData.m=1;g.userData.bb=bb;
 chStrip(g);scene.remove(g);
 let c=CH_MAP.get(ck);if(!c)c=chNew(ck,ox,oz);
 c.members.add(b.id);chFar(c);
 chMarkDirty(ck);
 return true}
// ── demote همگام: سازه ادغام‌شده ← زنده (کلیک/جابه‌جا/چرخش/نمای داخل) — هیچ فریمی دوبار/غیب نمی‌شود
function chDemote(id){const g=objs.get(id),d=CH_GC.get(id);
 if(!g||!d)return g;
 const c=CH_MAP.get(d.ck);
 if(c){c.members.delete(id);chFar(c)}
 CH_GC.delete(id);
 if(d.inn)g.add(d.inn);                                                 // مبلمان داخل حفظ می‌شود
 g.userData.m=0;                                                        // پرچم ادغام زودتر پاک شود — انتخاب/انیمیشن/cull از همین فریم مسیر زنده
 fillB(g,g.userData.b);                                                 // مدل تازه با هندسهٔ نو
 g.scale.setScalar(1);if((g.userData.t||0)<1)g.userData.t=1;
 g.userData.bb=null;
 chGCDispose(d);
 scene.add(g);
 if(c)chRebuild(d.ck);                                                  // همگام
 g.userData.q=0;
 return g}
// ── حذف از دنیا: عضویت چانک + کش هندسه آزاد می‌شود (بازسازی بودجه‌ای — سازه همین حالا از صحنه رفته)
function chDrop(id){const d=CH_GC.get(id);if(!d)return;
 const c=CH_MAP.get(d.ck);
 if(c){c.members.delete(id);chFar(c);chMarkDirty(d.ck)}
 if(d.inn)disposeObj(d.inn);
 CH_GC.delete(id);chGCDispose(d)}
// ── پیش/پس از بازسازیِ تایل توسط roads(): ورودی کهنه زنده می‌ماند تا roadMesh بچه‌ها را dispose نکند
function chPreRefresh(g){if(g.userData.m)chStrip(g)}
function chRefresh(g){const b=g.userData.b;if(!b||!g.userData.m)return;
 const d=CH_GC.get(b.id);if(!d)return;
 const c=CH_MAP.get(d.ck);
 chGCDispose(d);
 const inn=g.userData.inn;if(inn)g.remove(inn);
 const bb=new THREE.Box3().setFromObject(g);
 const sn=chSnap(g);
 if(inn)g.add(inn);
 chLocalize(d,sn,c?c.ox:Math.floor(g.position.x/CHU)*CHU,c?c.oz:Math.floor(g.position.z/CHU)*CHU);
 d.en=sn.en;d.sp=sn.sp;d.bb=bb;g.userData.bb=bb;
 chNormalize(d);                                                        // عین promote — روی مدخل‌های «تازه» (بعد از جای‌گذاری)
 chStrip(g);
 chMarkDirty(d.ck)}
// ── بازسازی چانک: concat ورودی‌های کش‌شده به‌ازای هر سطل/متریال + اسپرایت‌ها
function chRebuild(ck){const c=CH_MAP.get(ck);if(!c)return;CH_DIRTY.delete(ck);
 for(const m of c.meshes){c.root.remove(m);if(m.geometry&&!SHGEO.has(m.geometry))m.geometry.dispose()}
 c.meshes.length=0;
 for(const s of c.sprites)c.root.remove(s);
 c.sprites.length=0;
 const by=new Map(),spr=[];
 for(const id of c.members){const d=CH_GC.get(id);if(!d)continue;
  for(const e of d.en){let l=by.get(e.bk);if(!l)by.set(e.bk,l=[]);l.push(e)}
  for(const s of d.sp)spr.push(s)}
 for(const[bk,list]of by){
  const mat=typeof bk==='string'?chBucketMat(bk):bk;
  let cast=false,recv=false;const geos=[];
  for(const e of list){cast=cast||e.cast;recv=recv||e.recv;
   const ge=e.ge.clone();
   if(e.sw){ // صفت‌های تاب باد (فاز + مبدأ چانک-محل) — فقط درخت‌ها، فقط مش VCFW
    const n=ge.attributes.position.count,ph=new Float32Array(n),org=new Float32Array(n*3);
    for(let i=0;i<n;i++){ph[i]=e.ph;org[i*3]=e.ox;org[i*3+1]=e.oy;org[i*3+2]=e.oz}
    ge.setAttribute('aPhase',new THREE.BufferAttribute(ph,1));ge.setAttribute('aOrg',new THREE.BufferAttribute(org,3))}
   ge.applyMatrix4(e.m4);geos.push(ge)}
  try{const me=new THREE.Mesh(mergeGeometries(geos,false),mat);me.castShadow=cast;me.receiveShadow=recv;me.matrixAutoUpdate=false;me.updateMatrix();
   c.root.add(me);c.meshes.push(me)}
  catch(err){console.error('[CH] merge failed',ck,typeof bk==='string'?bk:bk.type,geos.map(g=>(g.index?'I':'N')+':'+Object.keys(g.attributes).join('+')).join(' | '),err)}  // واپس‌زنی امن + تشخیص دقیق
  for(const g of geos)g.dispose()}
 for(const s of spr){const sp=new THREE.Sprite(s.mat);sp.position.copy(s.p);sp.scale.copy(s.s);NORAY(sp);c.root.add(sp);c.sprites.push(sp)}}
// ── انتخاب: نزدیک‌ترین برخورد پرتوی ray با باکسِ سازه‌های ادغام‌شده (دقیق در سطح ساختمان و سبک)
const _chP=new THREE.Vector3();
function chPickHit(ray){const R=ray&&ray.isRay?ray:(ray&&ray.ray&&ray.ray.origin&&ray.ray.direction?ray.ray:ray); // هم Ray خام هم Raycaster — تشخیص duck-type (r160 پرچم isRaycaster/isRay روی همه نسخه‌ها ندارد)
 if(!R||!R.intersectBox||!R.origin||!R.direction)return null;
 let best=null;
 for(const[id,d]of CH_GC){const b=d.bb;if(!b)continue;
  const p=R.intersectBox(b,_chP);if(!p)continue;
  const t=R.origin.distanceTo(p);
  if(!best||t<best.t)best={id,t}}
 return best}
// ── culling فاصله‌ای سطح چانک — از cull() در 05-core-perf صدا زده می‌شود (همان vd و ضریب ۱٫۵۶ خانه/بازار)
function chCull(vd,tg){
 if(vd>=1e8){for(const c of CH_MAP.values())if(!c.root.visible)c.root.visible=true;return}
 const v2=vd*vd;
 for(const c of CH_MAP.values()){
  const cx=Math.max(c.ox,Math.min(c.ox+CHU,tg.x)),cz=Math.max(c.oz,Math.min(c.oz+CHU,tg.z));
  const dx=tg.x-cx,dz=tg.z-cz;
  c.root.visible=dx*dx+dz*dz<=v2*(c.far?2.4336:1)}}
// ── حلقهٔ فریم: ارتقاهای در انتظار + بازسازی کثیف‌ها (نزدیک‌به‌دوربین اول، با بودجهٔ فریم)
function chFrame(dt,t){
 if(CH.buildHold)return;                                                 // در طول batch دسته‌ای: کارِ چانک تعلیق (موجِ ادغام پس از batch)
 CH_WXF.t.value=t;CH_WXF.amp.value=.026*(typeof SWAY!=='undefined'&&SWAY?SWAY:1);
 let t0=performance.now();
 while(CH_Q.length&&performance.now()-t0<4){const g=CH_Q.shift();
  if(g.parent&&g.userData.b&&objs.get(g.userData.b.id)===g)chPromote(g)}  // فقط اگر هنوز زنده و در صحنه
 if(CH_DIRTY.size){t0=performance.now();
  const tg=ctl.target,arr=[];
  for(const ck of CH_DIRTY){const c=CH_MAP.get(ck);if(!c){CH_DIRTY.delete(ck);continue}
   const dx=c.ox+CHU/2-tg.x,dz=c.oz+CHU/2-tg.z;arr.push([dx*dx+dz*dz,ck])}
  arr.sort((a,b)=>a[0]-b[0]);
  for(const[,ck]of arr){if(performance.now()-t0>6)break;chRebuild(ck)}}}
// ── API عمومی (فقط همین‌ها از بیرون صدا زده می‌شود)
const CH={mergeable:t=>!!CH_MERGE[t],
 queue(g){if(CH_Q.indexOf(g)<0)CH_Q.push(g)},
 demote:id=>chDemote(id),
 drop:id=>chDrop(id),
 preRefresh:g=>chPreRefresh(g),
 refresh:g=>chRefresh(g),
 pickHit:r=>chPickHit(r),
 cull:(vd,tg)=>chCull(vd,tg),
 plaqueChanged(){for(const ck of CH_MAP.keys())CH_DIRTY.add(ck)},
 frame:chFrame,
 gc:CH_GC,map:CH_MAP,                                                   // ابزار تست/بنچ — ساختار داخلی برای ابزارهای تشخیصی
 stats(){let live=0;for(const g of objs.values())if(!g.userData.m)live++;
  return{chunks:CH_MAP.size,merged:CH_GC.size,live,dirty:CH_DIRTY.size,queue:CH_Q.length,buckets:CH_BUCKETS.size}}};
