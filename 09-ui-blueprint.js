// ═══ مود نقشهٔ ساخت حرفه‌ای: شبحِ شفافِ «همان مدل واقعی» زیر انگشت ← چیدن/درگ/چرخش/انتخاب ← تیک = ساخت دسته‌ای با انیمیشن پله‌ای.
// معماری: BP (وضعیت مود) · bpTemplate (کش مدل شبح به‌ازای نوع+ماسک) · bpVal (اعتبارسنجی لایه‌دار) · bpRemesh (اتصال زندهٔ کاشی‌ها)
// · bpStroke (ردیف پیوستهٔ بدون گپ) · bpCommit (تأیید اتمیک + زمان‌بندی stagger ← 05-core-main.js).
// سرور: POST /api/admin/buildings/batch (اتمیک) ← 01-server-admin.py ═══
'use strict';
const BP={on:false,manualRot:false,items:[],type:'house',rot:0,sel:null,dragIt:null,down:null,ghost:null,line:null,busy:false,_batch:false,_tpl:new Map(),_stag:new Map()};
const BP_OK=0x3ddc97,BP_BAD=0xff5a4c,BP_GOLD=0xffc247;
const BP_GEO=new THREE.RingGeometry(.74,.94,4,1,Math.PI/4),BP_PGEO=new THREE.PlaneGeometry(1,1);
// شبح = مدل واقعیِ ادغام‌شده در یک متریال شفاف مشترک؛ عمق‌نویسی خاموش تا از هم پشت هم هم دیده شوند
const BP_HOL=new THREE.MeshStandardMaterial({color:0xaee9ff,transparent:true,opacity:.34,roughness:.5,metalness:0,depthWrite:false});
const BP_EDGE=new THREE.LineBasicMaterial({color:0xeaffff,transparent:true,opacity:.5});
const BP_TILE=new THREE.MeshBasicMaterial({color:BP_OK,transparent:true,opacity:.5,depthWrite:false});
// ── لایه‌ها: خانه/مزرعه/بازار/درخت/hq = لایهٔ ساختمان؛ جاده = لایهٔ خودش؛ پیاده‌رو روی زمینِ باز قابل‌همزیست با لایهٔ جاده نیست
const bpCompat=(a,b)=>a!==b;                                    // لایه‌های متفاوت همزیست؛ هم‌لایه = تداخل
const BP_RIVER=[[-146,22],[-96,22],[-96,6],[-40,6],[-40,24],[16,24],[16,4],[72,4],[72,18],[146,18]]; // مسیر شکستهٔ رود — هماهنگ با RIVER_PTS در 06-world-scenery.js (برای مستندات؛ اندازه‌گیری از filletDist)
// حریم رود = فاصله تا مسیر «فِلِت‌شده» (filletDist در 06-world-scenery.js) — همان مرجعی که آب/ساحل رندر می‌شوند؛
// هم‌بعد بودن گارد با رندر یعنی هیچ پیش‌نمایش سبزی داخل آب/ساحل پیچ‌ها تولید نمی‌شود (هم‌ساز با fpPondW).
const bpInPond=(x,z)=>filletDist(x*U,z*U)<4.4;   // دقیقاً هم‌مرزِ fpPondW در 07-buildings-footprint.js (تا لبهٔ چمن ساحل)
const inMap=(x,z)=>x>=-20*GRID&&x<20*GRID&&z>=-20*GRID&&z<20*GRID;
// ── اعتبارسنجی لایه‌دار: خروجی true یا دلیل خطا (رشته). مجاورت هرگز خطا نیست؛ فقط همپوشانیِ هم‌لایه، برکه و خارج نقشه.
let bpHit=null;
function bpVal(type,x,z,skip,rot){bpHit=null;if(rot==null)rot=(type==='road'||type==='path')?0:BP.rot;
  const r=fpCheck(type,x,z,rot,W.buildings.concat(BP.items.filter(i=>i!==skip)));
  if(r==='برخورد'){bpHit=fpHit;return BP.items.includes(fpHit)?'تداخل با پیش‌نمایش':'اشغال است'}
  if(r!==true)return r;
  if(type==='hq'&&[...W.buildings,...BP.items.filter(i=>i!==skip)].some(b=>b.type==='hq'))return'دفتر فقط یکی است';
  if(type==='crossing'){const cand={type,x,z,gx:x,gz:z,rot:0};
   if(![...W.buildings,...BP.items.filter(i=>i!==skip)].some(o=>o.type==='road'&&fpTouchDir(cand,o)>=0))return'تابلو باید کنار خیابان باشد'}
  if(type==='banner'){const cand={type,x,z,gx:x,gz:z,rot:rot||0};
   if(![...W.buildings,...BP.items.filter(i=>i!==skip)].some(o=>o.type==='hq'&&fpTouchDir(cand,o)>=0))return'بنر باید به دفتر مدیرعامل بچسبد'}
  return true}
const bpFree=(x,z,skip)=>bpVal(BP.type,x,z,skip,BP.rot)===true;
// ── شبحِ مدل واقعی: مدل کامل ساخته می‌شود، همهٔ مش‌ها در یک مش ادغام و با متریال شبح رندر می‌شوند (۱ دراکال)
const BP_DIR=[[0,-1],[1,0],[0,1],[-1,0]],BP_ROTD=[0,Math.PI/2,Math.PI,Math.PI*1.5];
// ماسک اتصال برای یک سلولِ نوع t: همسایه‌های واقعی (W) + همسایه‌های صف (BP.items)
// ماسک اتصال مثل roads.js: جاده و پیاده‌رو هر دو «مسیر»اند و به هم وصل می‌شوند
function bpMask(t,x,z){let m=0;const candidate={type:t,x,z,gx:x,gz:z,rot:0},all=W.buildings.concat(BP.items);
  for(const b of all){if(t==='road'?b.type!=='road':(b.type!=='road'&&b.type!=='path'))continue;
    const d=fpTouchDir(candidate,b);if(d>=0)m|=1<<d}
  return m}
// چرخش خودکار خانه/دفتر؛ فاصله تا مستطیل مسیر با محاسبهٔ بازه‌ها، بدون ساختن آرایهٔ همهٔ سلول‌ها.
function bpAutoRot(type,x,z,rot,others){if(type!=='house'&&type!=='hq')return rot;
 const dirs=[[0,1,0],[1,0,90],[0,-1,180],[-1,0,270]],gap=(v,a,b)=>v<a?a-v:v>b?v-b:0,span=(a0,a1,b0,b1)=>Math.max(0,b0-a1,a0-b1);let best=Infinity,angle=rot;
 for(const[dx,dz,turn]of dirs){const B=fpBounds({type,gx:x,gz:z,x,z,rot:turn});let edge,dist=Infinity;
  if(dz>0)edge=['z',B.z1+1];else if(dz<0)edge=['z',B.z0-1];else if(dx>0)edge=['x',B.x1+1];else edge=['x',B.x0-1];
  for(const o of others){if(o.type!=='road'&&o.type!=='path')continue;const R=fpBounds(o);let d;
   if(edge[0]==='z')d=gap(edge[1],R.z0,R.z1)+span(B.x0,B.x1,R.x0,R.x1);
   else d=gap(edge[1],R.x0,R.x1)+span(B.z0,B.z1,R.z0,R.z1);
   if(d<dist)dist=d;if(dist===0)break}
  if(dist<best){best=dist;angle=turn}}
 return best<Infinity?angle:rot}
// ماسک پیاده‌رو از تماس واقعیِ مسیرها + ضلعِ ورودیِ ساختمان به دست می‌آید.
function bpPathMask(x,z){const candidate={type:'path',x,z,gx:x,gz:z,rot:0},all=W.buildings.concat(BP.items);return{m:bpMask('path',x,z)|fpDoorMaskForPath(candidate,all)}}
// ماسک گذرگاه برای یک کاشی جاده: از تابلوی عابر پیادهٔ واقعی و پیش‌نمایشِ صف (مثل roads.js).
function bpCrossMask(x,z,skip){const road={type:'road',x,z,gx:x,gz:z,rot:0},signs=[...W.buildings,...BP.items].filter(b=>b.type==='crossing'&&b!==skip);
 return signs.length?roadCrossingMask(road,signs):0}
// قالب شبح: type/rot/mask + ماسک اتصال واقعی؛ هندسهٔ پیاده‌رو داخل footprint خودش محدود می‌ماند.
// lamp (فقط جاده): پریتیِ چراغِ همان سلول — تا شبح دقیقاً مثل جادهٔ نهایی چراغ‌دار/بی‌چراغ باشد.
function bpTemplate(type,rot,mask,links,lamp=0,pathStyle=PATH_STYLE,cr=0){const key=type+'|'+rot+'|'+mask+'|'+lamp+(type==='path'?'|'+pathStyle:'')+(type==='road'?'|'+cr:'');
  if(BP._tpl.has(key))return BP._tpl.get(key);
  const g=new THREE.Group();
  if(type==='road'){roadMesh(g,mask,lamp,cr);g.userData.tile=1}
  else if(type==='path'){const lk=links||{m:mask};pathMesh(g,lk.m,1234,pathStyle);g.userData.tile=1}
  else{build[type]?.(g,{id:type==='tree'||type==='hq'?7:1234+(rot/90|0),x:0,z:0,rot});if(type!=='tree'&&type!=='hq')plaqueless(g)}
  // ادغام کل مدل به یک مش شفاف + ذخیرهٔ bbox برای خط دور
  g.updateMatrixWorld(true);   // گروه در صحنه نیست؛ بدون این، ماتریس‌های فرزندان stale می‌مانند و هندسه جای غلط ادغام می‌شود
  // نرمال‌سازی صفات هندسه‌ها قبل از ادغام: همه باید position+normal+color داشته باشند و uv نداشته باشند
  // (قطعات vcGeo رنگ رأس دارند؛ قطعات خام مثل صفحهٔ هالهٔ چراغ فقط position/normal/uv) — وگرنه mergeGeometries null برمی‌گرداند.
  const geos=[];g.traverse(c=>{if(c.isMesh&&c.geometry){let ge=c.geometry.clone();ge.applyMatrix4(c.matrixWorld);if(ge.index)ge=ge.toNonIndexed();
    for(const a of Object.keys(ge.attributes))if(a!=='position'&&a!=='normal')ge.deleteAttribute(a);
    if(!ge.attributes.color){const n=ge.attributes.position.count,ca=new Float32Array(n*3);ge.setAttribute('color',new THREE.BufferAttribute(ca,3))}
    geos.push(ge)}});
  const out=new THREE.Group();
  if(geos.length){const me=new THREE.Mesh(mergeGeometries(geos,false),BP_HOL);me.renderOrder=5;out.add(me);
    const box=new THREE.Box3().setFromObject(me),sz=box.getSize(new THREE.Vector3()),ct=box.getCenter(new THREE.Vector3());
    const eg=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sz.x,Math.max(sz.y,.02),sz.z)),BP_EDGE);
    eg.position.copy(ct);out.add(eg);out.userData.box={sz,ct}}
  geos.forEach(x=>x.dispose());
  // کاشی زمینی (اعتبار سبز/قرمز): اندازه‌اش باید اندازهٔ طرح واقعیِ آیتم باشد، نه یک خانهٔ کامل.
  // جاده واقعاً کل خانه (۲×۲) را پر می‌کند ⇒ کاشی هم ۲×۲. پیاده‌رو فقط یک ردِ خاکیِ باریک است (مرکز+بازو)
  // ⇒ باید مثل بقیهٔ آیتم‌های آزاد از روی bbox واقعیِ مدلِ ادغام‌شده اندازه بگیرد، وگرنه کاشیِ ۲×۲ خیلی
  // بزرگ‌تر از طرحِ واقعیِ پیاده‌رو دیده می‌شود و روی ساختمان‌های کناری می‌افتد (گزارش کاربر).
  const tile=new THREE.Mesh(BP_PGEO,BP_TILE.clone());tile.rotation.x=-Math.PI/2;tile.position.y=.02;
  const fd=FOOT[type]||FOOT.tree,sw=(rot%180&&type!=='road'&&type!=='path')?fd[1]:fd[0],sh=(rot%180&&type!=='road'&&type!=='path')?fd[0]:fd[1];
  tile.scale.set(sw*U,sh*U,1)
  out.add(tile);out.userData.tileMesh=tile;
  const ring=new THREE.Mesh(BP_GEO,new THREE.MeshBasicMaterial({color:BP_OK,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.06;out.add(ring);out.userData.ring=ring;
  BP._tpl.set(key,out);return out}
// حذف پلاک شمارهٔ خانه از شبح (عنصر نامربوط به پیش‌نمایش).
// فقط صفحهٔ پلاک (texture کشِ _PLQ) حذف می‌شود؛ هالهٔ نورِ در (GRADT) جزو ظاهر واقعی ساختمان است و می‌ماند
// تا ابعاد شبح با ساختمان نهایی یکسان بماند.
function plaqueless(g){for(const c of[...g.children])if(c.isMesh&&c.material&&c.material.map&&_PLQ.has(c.material.map))g.remove(c)}
// کلون امن قالب شبح: ring و کاشی اعتبار را از روی هندسهٔ مشخص پیدا می‌کند (clone در three.js userData را کپی سطحی می‌دهد)
function bpClone(type,rot,mask,links,lamp=0,pathStyle=PATH_STYLE,cr=0){const src=bpTemplate(type,rot,mask,links,lamp,pathStyle,cr),g=src.clone(true);
  const ring=g.children.find(c=>c.geometry===BP_GEO),tile=g.children.find(c=>c.geometry===BP_PGEO);
  if(ring)ring.material=ring.material.clone();if(tile)tile.material=tile.material.clone();   // متریال جدا تا رنگ هر شبح مستقل باشد
  g.userData={ring,tileMesh:tile,k:mask+'|'+lamp+(type==='path'?'|'+pathStyle:'')+(type==='road'?'|'+cr:'')};return g}

// ── ساخت/به‌روزرسانی یک آیتم صف: مدل شبح + حلقه + کاشی اعتبار
function bpMake(it,paint=true){const links=it.type==='path'&&!BP._batch?bpPathMask(it.x,it.z):null;
  const lamp=it.type==='road'?(((it.x+it.z)%2+2)%2===0?1:0):0;   // چراغ جاده = پریتی سلول، مثل roads()
  const cr=it.type==='road'?bpCrossMask(it.x,it.z):0;            // خط‌کشی گذرگاه از تابلوی عابر پیادهٔ مجاور
  const mask=links?links.m:(it.type==='road'?bpMask(it.type,it.x,it.z):0);
  const g=bpClone(it.type,it.rot,mask,links,lamp,PATH_STYLE,cr);
  g.userData.it=it;
  g.position.set(it.x*U,fpBaseY(it.type,it.x,it.z,it.rot),it.z*U);   // نشستن روی زمین واقعی (کنار رود روی جالیِ ساحل)
  if(it.type!=='road'&&it.type!=='path')g.rotation.y=it.rot*Math.PI/180;
  scene.add(g);it.g=g;if(paint)bpPaint(it);return g}
// رنگ حالت: سبز=معتبر · قرمز=نامعتبر · طلایی=انتخاب‌شده
function bpPaint(it){if(!it.g)return;const val=bpVal(it.type,it.x,it.z,it,it.rot),ring=it.g.userData.ring;
  it.ok=val===true;it.err=val===true?'':val;
  ring.material.color.setHex(it===BP.sel?BP_GOLD:it.ok?BP_OK:BP_BAD);
  it.g.userData.tileMesh.material.color.setHex(it.ok?BP_OK:BP_BAD);
  it.g.userData.tileMesh.material.opacity=it.ok?.5:.65;
  // اشغالِ سلول توسط ساختمان واقعی: هندسهٔ شبح داخل ساختمان می‌رود و بریدگی می‌سازد → فقط حلقه بماند
  const occupied=val==='اشغال است';
  it.g.children.forEach(ch=>{if(ch!==ring)ch.visible=!occupied})}
// چیدن/حذف/جابه‌جایی
function bpAdd(x,z){if(BP.items.length>=400)return toast('حداکثر ۴۰۰ مورد در یک نقشه');
  const ar=(BP.type==='house'||BP.type==='hq')&&!BP.manualRot,others=W.buildings.concat(BP.items),rot=(BP.type==='road'||BP.type==='path')?0:ar?bpAutoRot(BP.type,x,z,BP.rot,others):BP.rot;
  if(bpVal(BP.type,x,z,null,rot)!==true)return false;
  const it={type:BP.type,x,z,rot,ar,...(BP.type==='path'?{style:PATH_STYLE}:{})};
  bpMake(it,!BP._batch);BP.items.push(it);if(!BP._batch){bpRemesh(it);bpAfterChange()}return true}
function bpRemove(it){if(!it)return;if(it.g){scene.remove(it.g);disposeObj(it.g);it.g=null}
  BP.items.splice(BP.items.indexOf(it),1);if(BP.sel===it)BP.sel=null;
  bpRemesh(it);bpAfterChange()}
function bpMove(it,x,z){const old={...it},others=W.buildings.concat(BP.items.filter(o=>o!==it)),rot=it.ar?bpAutoRot(it.type,x,z,it.rot,others):it.rot;
  if(it.x===x&&it.z===z&&it.rot===rot){bpPaint(it);return true}
  const val=bpVal(it.type,x,z,it,rot);if(val!==true){bpPaint(it);return false}
  it.x=x;it.z=z;it.rot=rot;it.g.position.set(x*U,fpBaseY(it.type,x,z,rot),z*U);it.g.rotation.y=rot*Math.PI/180;bpRemesh(it,old);bpPaint(it);bpAfterChange();return true}
function bpRot(it){if(it.type==='road'||it.type==='path')return;
  const old={...it};it.rot=(it.rot+90)%360;it.ar=false;it.g.rotation.y=it.rot*Math.PI/180;bpRemesh(it,old);bpPaint(it)}
function bpAfterChange(){const all=W.buildings.concat(BP.items);let reoriented=false;
  for(const it of BP.items){if(it.ar){const rot=bpAutoRot(it.type,it.x,it.z,it.rot,all.filter(o=>o!==it));if(rot!==it.rot){it.rot=rot;reoriented=true;if(it.g)it.g.rotation.y=rot*Math.PI/180}}}
  if(reoriented)bpRemeshAll();
  // اعتبار آیتم‌ها فقط یک‌بار پس از هر عملیات/دسته بازبینی می‌شود؛ نه بعد از تک‌تک قطعات stroke.
  for(const it of BP.items)bpPaint(it);bpBar()}
// ── اتصال زندهٔ کاشی‌ها: با هر تغییر، ماسک همسایگیِ همهٔ کاشی‌های مجاور دوباره ساخته می‌شود (مسیر پیوسته همیشه درست)
function bpRemesh(changed,old=changed){
  const tiles=BP.items.filter(it=>it.type==='road'||it.type==='path'),near=new Set();
  if(tiles.includes(changed))near.add(changed);
  for(const it of tiles){if(it===changed)continue;if(fpTouchDir(it,changed)>=0||fpTouchDir(it,old)>=0)near.add(it)}
  for(const it of near){
    const links=it.type==='path'?bpPathMask(it.x,it.z):null;
    const lamp=it.type==='road'?(((it.x+it.z)%2+2)%2===0?1:0):0;
    const cr=it.type==='road'?bpCrossMask(it.x,it.z):0;
    const m=links?links.m:bpMask(it.type,it.x,it.z),style=it.style==='dirt'?'dirt':'stone',sig=m+'|'+lamp+(it.type==='path'?'|'+style:'')+(it.type==='road'?'|'+cr:'');
    if(it.g&&it.g.userData.k!==sig){scene.remove(it.g);disposeObj(it.g);
      const g=bpClone(it.type,it.rot,m,links,lamp,it.style||'stone',cr);g.userData.it=it;
      g.position.set(it.x*U,fpBaseY(it.type,it.x,it.z,it.rot),it.z*U);scene.add(g);it.g=g;bpPaint(it)}}}
// بازسازی دسته‌ای ماسک مسیرها؛ از اسکن تکراریِ صف برای هر قطعه جلوگیری می‌کند.
function bpRemeshAll(){for(const it of BP.items){if(it.type!=='road'&&it.type!=='path')continue;const links=it.type==='path'?bpPathMask(it.x,it.z):null,lamp=it.type==='road'?(((it.x+it.z)%2+2)%2===0?1:0):0,cr=it.type==='road'?bpCrossMask(it.x,it.z):0,m=links?links.m:bpMask(it.type,it.x,it.z),style=it.style==='dirt'?'dirt':'stone',sig=m+'|'+lamp+(it.type==='path'?'|'+style:'')+(it.type==='road'?'|'+cr:'');
  if(it.g&&it.g.userData.k!==sig){scene.remove(it.g);disposeObj(it.g);const g=bpClone(it.type,it.rot,m,links,lamp,it.style||'stone',cr);g.userData.it=it;g.position.set(it.x*U,fpBaseY(it.type,it.x,it.z,it.rot),it.z*U);scene.add(g);it.g=g}}}
// ── ردیف پیوستهٔ جاده/پیاده‌رو: افزودن دسته‌ای و فقط یک بازسازی اتصال/اعتبارسنجی در پایان.
function bpStroke(x0,z0,x1,z1){const pts=[[x0,z0]],step=BP.type==='path'?FOOT.path[0]:GRID;let nx=Math.round((x1-x0)/step),nz=Math.round((z1-z0)/step),x=x0,z=z0;
  while(nx||nz){if(Math.abs(nx)>=Math.abs(nz)&&nx){x+=Math.sign(nx)*step;nx-=Math.sign(nx)}else if(nz){z+=Math.sign(nz)*step;nz-=Math.sign(nz)}pts.push([x,z])}
  let added=0;BP._batch=true;try{for(const[xp,zp]of pts)if(bpAdd(xp,zp))added++}finally{BP._batch=false}
  if(added){bpRemeshAll();bpAfterChange()}return added}
// ── خط راهنمای کشیدن
function bpLine(c){if(!c){if(BP.line){scene.remove(BP.line);disposeObj(BP.line);BP.line=null}return}
  if(!BP.line){BP.line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffe0a0,transparent:true,opacity:.8}));BP.line.position.y=.1;scene.add(BP.line)}
  BP.line.geometry.setFromPoints([new THREE.Vector3(BP.down.c[0]*U,0,BP.down.c[1]*U),new THREE.Vector3(c[0]*U,0,c[1]*U)])}
// ── شبحِ شناور زیر انگشت (مدل واقعی؛ فقط وقتی درگِ جدید روی زمین است)
function bpFloat(c){const isTile=BP.type==='road'||BP.type==='path';
  const rot=isTile?0:((BP.type==='house'||BP.type==='hq')&&!BP.manualRot?bpAutoRot(BP.type,c[0],c[1],BP.rot,W.buildings.concat(BP.items)):BP.rot);
  const links=BP.type==='path'?bpPathMask(c[0],c[1]):null;
  const lamp=BP.type==='road'?(((c[0]+c[1])%2+2)%2===0?1:0):0;
  const cr=BP.type==='road'?bpCrossMask(c[0],c[1]):0;
  const mask=links?links.m:(isTile?bpMask(BP.type,c[0],c[1]):0);
  const sig=BP.type+'|'+rot+'|'+mask+'|'+lamp+(BP.type==='path'?'|'+PATH_STYLE:'')+(BP.type==='road'?'|'+cr:'');
  if(!BP.ghost||BP.ghost.userData.sig!==sig){
    if(BP.ghost){scene.remove(BP.ghost);disposeObj(BP.ghost)}
    BP.ghost=bpClone(BP.type,rot,mask,links,lamp,PATH_STYLE,cr);BP.ghost.userData.sig=sig;scene.add(BP.ghost)}
  const val=bpVal(BP.type,c[0],c[1],null,rot),ok=val===true;
  BP.ghost.position.set(c[0]*U,fpBaseY(BP.type,c[0],c[1],rot),c[1]*U);   // شبح هم دقیقاً در ارتفاعِ نهایی بنشیند (پیش‌نمایش = نتیجه)
  if(!isTile)BP.ghost.rotation.y=rot*Math.PI/180;
  BP.ghost.userData.ring.material.color.setHex(ok?BP_OK:BP_BAD);
  BP.ghost.userData.tileMesh.material.color.setHex(ok?BP_OK:BP_BAD);
  const occupied=val==='اشغال است'||val==='تداخل با پیش‌نمایش';
  const occ=occupied&&bpHit&&W.buildings.includes(bpHit)?bpHit:null;
  const top=occ&&objs.get(occ.id)?(()=>{const bx=new THREE.Box3().setFromObject(objs.get(occ.id));return Math.max(.12,bx.max.y+.25)})():.06;
  BP.ghost.userData.ring.position.y=top;
  BP.ghost.children.forEach(ch=>{if(ch!==BP.ghost.userData.ring)ch.visible=!occupied});
  BP.ghost.visible=true;BP.ok=ok}
function bpGhostType(){if(!BP.ghost)return;
  scene.remove(BP.ghost);disposeObj(BP.ghost);BP.ghost=null}
// ── نوار پایین و راهنما
function bpBar(){const b=$('bpb');if(!b)return;b.style.display=BP.on?'flex':'none';if(!BP.on)return;
  const n=BP.items.length,bad=BP.items.filter(i=>!i.ok).length;
  const cost=W.cost?BP.items.reduce((s,i)=>s+(W.cost[i.type]||0),0):0;
  $('bpn').innerHTML='نقشهٔ ساخت: '+cpx(n)+' مورد'+(bad?' · <b style="color:#ff8d80">'+cpx(bad)+' نامعتبر</b>':'')+(cost&&!$('fr').checked?' · '+fa(cost/1e6,1)+' م':'');
  $('bpi').textContent=BP.sel?'انتخاب: '+cpx(BP.items.indexOf(BP.sel)+1)+' · '+(W.catalog?.[BP.sel.type]||BP.sel.type):'';
  $('bpok').style.opacity=n&&!bad&&!BP.busy?1:.35}
function bpStart(){if(!T)return;BP.on=true;BP.rot=0;BP.manualRot=false;BP.sel=null;BP.pid=null;bpBar();
  $('bph').style.display='block';$('adm').style.display='none';$('pal').style.display='flex'}
function bpEnd(){ctl.enabled=true;BP.on=false;BP.sel=null;BP.dragIt=null;BP.down=null;BP.pid=null;
  for(const it of BP.items)if(it.g){scene.remove(it.g);disposeObj(it.g);it.g=null}
  BP.items=[];bpGhostType();bpLine(null);bpBar();
  $('bph').style.display='none';$('bpq').style.display='none';if(admOn)$('adm').style.display='flex';
  // همگام‌سازی مود: اگر همچنان مود build روشن است خاموشش کن (پالت، هایلایت دکمه) — وگرنه دفعهٔ بعد
  // دکمهٔ 🏗️ toggle می‌کند و هیچ اتفاقی نمی‌افتد (ورود دوباره به ساخت از کار می‌افتد).
  if(mode==='build')setMode('')}
// ── تیک: ساخت همه (اتمیک سمت سرور) — stagger زمان انیمیشن هر ساختمان را BP._stag می‌دهد ← sync.js/main.js
async function bpCommit(){const n=BP.items.length;if(!n||BP.busy)return;
  const bad=BP.items.filter(i=>!i.ok);if(bad.length){toast(cpx(bad.length)+' مورد نامعتبر است — سبز شود یا حذفش کن');
    BP.sel=bad[0];bpAfterChange();return}
  BP.busy=true;bpBar();
  try{const res=await api('/api/admin/buildings/batch','POST',{items:BP.items.map(i=>({type:i.type,x:i.x,z:i.z,rot:i.rot,ar:!!i.ar,...(i.type==='path'?{style:i.style||'stone'}:{})})),free:$('fr').checked});
    const made=res.buildings||[];BP._stag.clear();
    made.forEach((b,i)=>BP._stag.set(b.id,i*.12));        // پله‌ای: هر ساختمان ۱۲۰ms بعد از قبلی
    toast('✅ '+cpx(n)+' ساختمان ساخته شد');
    for(const it of BP.items)if(it.g){scene.remove(it.g);disposeObj(it.g);it.g=null}
    BP.items=[];bpGhostType();   // شبحِ شناورِ زیر انگشت هم پاک شود؛ وگرنه نسخهٔ نیمه‌شفافش روی ساختمان واقعیِ تازه می‌ماند و «محو/روی‌هم‌افتاده» دیده می‌شود
    bpBar()}
  catch(e){/* api خودش توست خطا می‌زند */}
  BP.busy=false;bpBar()}
// زمان شروع انیمیشنِ پاپ برای ساختمان تازه (۰ = همین حالا؛ stagger ← bpCommit)
const bpDelay=id=>BP._stag.get(id)||0;
document.body.insertAdjacentHTML('beforeend',
 `<div id="bph" class="g">🏗️ انگشت بگذار و بکش: شبح دنبال انگشت می‌آید، رها کن = بنشیند · روی پیش‌نمایش بکش = جابه‌جایی · تپ = انتخاب · R چرخش · ⇧ دوتایی حذف</div>
  <div id="bpb" class="g"><span id="bpn"></span><button id="bpr" title="چرخش انتخاب‌شده (R)">🔄</button><button id="bpq2" title="صف ساخت">📋</button><button id="bpx" title="کنسل (Esc)">✕</button><button id="bpok" title="ساخت (Enter)">✓</button></div>
  <div id="bpq" class="g"><div id="bpi"></div><ol id="bql"></ol></div>`);
$('bpx').onclick=()=>{bpEnd();toast('نقشهٔ ساخت کنسل شد — هیچی ساخته نشد')};
$('bpok').onclick=bpCommit;
$('bpr').onclick=()=>{if(BP.sel)bpRot(BP.sel);else toast('اول یک پیش‌نمایش را انتخاب کن')};
$('bpq2').onclick=()=>{const q=$('bpq');const on=q.style.display==='flex';q.style.display=on?'none':'flex';if(!on)bpQList()};
function bpQList(){const l=$('bql');if(!l)return;l.innerHTML=BP.items.map((it,i)=>
  `<li data-i="${i}" class="${it===BP.sel?'on':''} ${it.ok?'':'bad'}">${cpx(i+1)}. ${W.catalog?.[it.type]||it.type} <i>(${it.x},${it.z})</i><span data-del="${i}">✕</span></li>`).join('')||'<li style="opacity:.6">خالی</li>';
  l.querySelectorAll('[data-del]').forEach(s=>s.onclick=ev=>{ev.stopPropagation();const it=BP.items[+s.dataset.del];bpRemove(it);bpQList()});
  l.querySelectorAll('li[data-i]').forEach(li=>li.onclick=()=>{BP.sel=BP.items[+li.dataset.i]||null;bpAfterChange();bpQList()})}
addEventListener('keydown',e=>{if(!BP.on)return;
  if(e.key==='Escape'){bpEnd();toast('کنسل شد')}
  else if(e.key==='Enter'){e.preventDefault();bpCommit()}
  else if(e.key==='r'||e.key==='R'){if(BP.sel)bpRot(BP.sel);else{BP.rot=(BP.rot+90)%360;BP.manualRot=true;bpGhostType()}}
  else if(e.key==='Delete'||e.key==='Backspace'){if(BP.sel){bpRemove(BP.sel)}}});
