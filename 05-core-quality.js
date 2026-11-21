// ═══ زیرساخت کیفیت (بخش ۱): تشخیص دستگاه، جدول پله‌های کیفیت، و ابزار آزادسازی حافظهٔ GPU.
// این فایل باید «قبل از engine» بارگذاری شود چون رندرر بر اساس QD ساخته می‌شود. کنترلر زنده (ladder/benchmark/overlay) ← 05-core-perf.js
// کیفیت دستی: ?q=0..9  یا  ?q=ultra|high|med|low|potato   (۰ = بهترین، ۹ = سبک‌ترین). ?perf=1 ← نمایش آمار روی صفحه ═══
'use strict';
const QNAMES=['Ultra','Ultra-','High','High-','Medium','Medium-','Low','Low-','Min','Potato'];
// جدول پله‌ها (هر پله یک گام ارزان‌تر از قبلی؛ ترتیب طبق اولویت: سایه نرم ← سایه ریز ← افکت‌ها ← فاصلهٔ دید ← pixelRatio)
//  sh: نوع سایه (soft/pcf/off)  ss: اندازهٔ نقشهٔ سایه (۰ = پایهٔ دستگاه)  se: هر چند فریم یک‌بار سایه آپدیت شود
//  cs: کدام شهروندها سایه بیندازند (2 همه، 1 فقط بدنه و سر، 0 هیچ)  fx: هاله/کرم شب‌تاب/نور فانوس  cl: تعداد ابرها
//  vd: فاصلهٔ دید (واحد صحنه)  cm: ضریب سقف شهروندان  nt: ضریب تعداد نام‌های همزمان  pr: ضریب pixelRatio
// ─── سیاستٔ Engine 2.0 (مأموریت §۹): هیچ محتوایی با ضعیف بودن دستگاه کم نمی‌شود —
// تعداد شهروندها (cm=1) و نام‌ها (nt=1) در همهٔ پله‌ها ثابت است؛ هزینه به‌جای حذفِ محتوا، با
// Instancing/گام ثابت شبیه‌سازی/Culling پایین می‌آید. ابرها هم کفِ ۲ تایی دارند (هویت بصری آسمان حفظ می‌شود).
// vd = Culling فاصله‌ای است (اشیای دور پنهان می‌شوند ولی موجودیت و رفتارشان باقی است — مجاز طبق مأموریت).
const QLV=[
 {sh:'soft',ss:0,  se:1,cs:2,fx:1,cl:8,vd:1e9,cm:1,nt:1,pr:1},
 {sh:'pcf', ss:0,  se:1,cs:2,fx:1,cl:8,vd:1e9,cm:1,nt:1,pr:1},
 {sh:'pcf', ss:1024,se:1,cs:2,fx:1,cl:8,vd:1e9,cm:1,nt:1,pr:1},
 {sh:'pcf', ss:768,se:2,cs:1,fx:1,cl:8,vd:1e9,cm:1,nt:1,pr:1},
 {sh:'pcf', ss:512,se:3,cs:1,fx:1,cl:6,vd:1e9,cm:1,nt:1,pr:1},
 {sh:'pcf', ss:512,se:3,cs:1,fx:0,cl:5,vd:1e9,cm:1,nt:1,pr:1},
 {sh:'pcf', ss:512,se:4,cs:0,fx:0,cl:4,vd:95, cm:1,nt:1,pr:1},
 {sh:'pcf', ss:512,se:4,cs:0,fx:0,cl:3,vd:80, cm:1,nt:1,pr:.9},
 {sh:'pcf', ss:512,se:6,cs:0,fx:0,cl:3,vd:65, cm:1,nt:1,pr:.8},
 {sh:'off',ss:512, se:1,cs:0,fx:0,cl:2,vd:50, cm:1,nt:1,pr:.7},
];
const QD=(()=>{
 const mob=innerWidth<820||matchMedia('(pointer:coarse)').matches;
 let sw=false;
 try{const g=document.createElement('canvas').getContext('webgl'),x=g&&g.getExtension('WEBGL_debug_renderer_info'),r=x?String(g.getParameter(x.UNMASKED_RENDERER_WEBGL)):'';const l=g&&g.getExtension('WEBGL_lose_context');if(l)l.loseContext();sw=/swiftshader|llvmpipe|software|basic render/i.test(r)}catch(e){}
 const mem=+navigator.deviceMemory||0,cores=+navigator.hardwareConcurrency||0,dpr=devicePixelRatio||1;
 const NM={ultra:0,high:2,med:4,medium:4,low:6,potato:9};
 const parse=s=>{if(s==null||s==='')return null;s=String(s).toLowerCase();if(s in NM)return NM[s];return /^\d$/.test(s)?+s:null};
 const qs=new URLSearchParams(location.search);let qt='';try{qt=localStorage.tq||''}catch(e){}
 const forced=parse(qs.get('q')),saved=qt==='high'?null:parse(qt); // «high» قدیمی یعنی خودکار
 let auto=0;
 if(sw)auto=9;
 else if(mob){auto=1;if(mem&&mem<=3)auto=5;else if(mem&&mem<=4)auto=3;else if(cores&&cores<=4)auto=3;else if(mem>=6&&cores>=8)auto=0}
 else{if(cores&&cores<=2)auto=4;else if(mem&&mem<=2)auto=4}
 const user=forced!=null?forced:saved,start=user!=null?user:auto;
 // pixelRatio پایه: فاز ۰ — موبایل حداکثر ۱٫۵ (لوشن اصلی پایداری موبایل؛ اهرم‌های Q رویش ضرب می‌شوند)، دسکتاپ ۲؛ حالت سبک ۱
 const pr=start>=6?1:Math.min(dpr,mob?1.5:2);
 return{mob,sw,mem,cores,dpr,start,user,forced,best:user!=null?user:0,aa:start<6,pr,sbase:mob?1536:2048,perf:qs.get('perf')==='1'||(()=>{try{return localStorage.tperf==='1'}catch(e){return false}})()}
})();

// ── ابزار آزادسازی حافظهٔ GPU: ژئومتری‌های مشترک (که چند شیء از آن‌ها استفاده می‌کنند) هرگز dispose نمی‌شوند
const SHGEO=new Set(),keepGeo=g=>{SHGEO.add(g);return g};
function disposeObj(o){o.traverse(c=>{if(c.geometry&&!SHGEO.has(c.geometry))c.geometry.dispose()})}
function clearKids(g){for(const c of[...g.children]){g.remove(c);disposeObj(c)}}

// ── مش‌های رنگی-ادغامی: چندین قطعه با رنگ‌های مختلف ← یک مش (یک draw call). رنگ داخل رأس‌ها (vertex color) ذخیره می‌شود.
const VCM=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}),VCP=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),VCF=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,flatShading:true}),_vcC=new THREE.Color();
function vcGeo(geo,hex){ // geo قبلاً جابه‌جا/چرخانده شده؛ خروجی: غیرایندکس‌دار با رنگ
 let ge=geo;if(geo.index){ge=geo.toNonIndexed();geo.dispose()}
 for(const k of Object.keys(ge.attributes))if(k!=='position'&&k!=='normal')ge.deleteAttribute(k);
 const n=ge.attributes.position.count,ca=new Float32Array(n*3);_vcC.setHex(hex);for(let i=0;i<n;i++){ca[i*3]=_vcC.r;ca[i*3+1]=_vcC.g;ca[i*3+2]=_vcC.b}
 ge.setAttribute('color',new THREE.BufferAttribute(ca,3));return ge}
function vcMesh(list,mat,cast,recv=true){const me=new THREE.Mesh(mergeGeometries(list,false),mat);list.forEach(x=>x.dispose());me.castShadow=!!cast;me.receiveShadow=recv;return me}
// همهٔ مش‌های فرزندِ g (با رنگ متریالشان) را در یک مش ادغام می‌کند؛ مناسب مزرعه، بازار، درخت (متریال تک‌رنگ ساده)
function bakeVC(g,mat=VCF){const a=[];for(const c of g.children.filter(c=>c.isMesh)){c.updateMatrix();const ge=c.geometry.clone();ge.applyMatrix4(c.matrix);a.push(vcGeo(ge,c.material.color.getHex()));g.remove(c);c.geometry.dispose()}
 if(a.length)g.add(vcMesh(a,mat,true,true))}
