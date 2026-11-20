// ═══ مدل سه‌بعدی ساختمان‌ها (خانه، مزرعه، بازار، جاده، پیاده‌رو، دفتر مدیرعامل، درخت) و addB.
// ساختمان جدید: یک تابع به شیٔ build اضافه کن + نوعش را در 01-server-config.py (CATALOG و COST) ثبت کن. ═══
'use strict';
// مدل‌ها
function gable(g,w,h,d,c,y){const sh=new THREE.Shape();sh.moveTo(-w/2,0);sh.lineTo(w/2,0);sh.lineTo(0,h);const m=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:false}),M(c,.6));m.position.set(0,y,-d/2);return add(g,m)}
const GLOW=new THREE.MeshStandardMaterial({color:0xffe0a0,emissive:0xffb84d,emissiveIntensity:.5,roughness:.4}),FM={},F=c=>FM[c]||(FM[c]=new THREE.MeshStandardMaterial({color:c,roughness:.9,flatShading:true}));
// ── تابلوی عابر پیاده: صفحهٔ آبی با پیکان‌گرِ عابر (بافت Canvas مشترک؛ شب بازتاب‌نده می‌شود ← applyEnv) ──
const CROSSM=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 x.fillStyle='#1d5fbf';x.fillRect(0,0,128,128);
 x.strokeStyle='#eef3ff';x.lineWidth=6;x.strokeRect(5,5,118,118);
 x.fillStyle='#fff';x.strokeStyle='#fff';x.lineWidth=11;x.lineCap='round';x.lineJoin='round';
 x.beginPath();x.arc(63,34,11,0,6.284);x.fill();
 x.beginPath();x.moveTo(64,48);x.lineTo(59,76);x.stroke();
 x.beginPath();x.moveTo(62,55);x.lineTo(43,66);x.moveTo(62,55);x.lineTo(81,62);x.stroke();
 x.beginPath();x.moveTo(59,76);x.lineTo(47,103);x.moveTo(59,76);x.lineTo(72,99);x.moveTo(72,99);x.lineTo(78,110);x.stroke();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t})();
const CROSSSGN=new THREE.MeshStandardMaterial({map:CROSSM,roughness:.45,emissive:0x3f7fd0,emissiveIntensity:.12});
const WALL=[0xe8dfca,0xdccfb2,0xeee4cf,0xd9c8a8],ROOF=[0xa3452f,0x8a3b2b,0x5f7482,0xb0683b],AWN=[0xc8553a,0xe0a43a,0x3f7f99,0x7a9a4a];
const cyl=(g,rt,rb,h,c,px,py,pz,sg=8)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,sg),M(c));m.position.set(px,py+h/2,pz);return add(g,m)};
const ball=(g,r,c,px,py,pz,d=1)=>{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,d),F(c));m.position.set(px,py,pz);return add(g,m)};
// ── دفتر مدیرعامل: با الهام از ظاهر بنیان‌گذار (کت تیره، دورخط و چشم‌های سبز نئونی)
const HQD=M(0x16231e,.7),HQW=new THREE.MeshStandardMaterial({color:0x2a3d35,roughness:.8,emissive:0x0b2a1a,emissiveIntensity:.5}),GLm=new THREE.MeshBasicMaterial({color:0x39ff88}),OLm=new THREE.MeshBasicMaterial({color:0x2fd67a,side:THREE.BackSide}),GDm=new THREE.MeshBasicMaterial({color:0x0a5a30}),
HQG=new THREE.MeshBasicMaterial({map:GRADT,color:0xffd9a0,transparent:true,opacity:.1,depthWrite:false,blending:THREE.AdditiveBlending}),HQGG=new THREE.PlaneGeometry(4.6,4.2);let hqDish=null;const HQWIN=new THREE.MeshStandardMaterial({color:0xbfffd9,emissive:0x39ff88,emissiveIntensity:.7,roughness:.4});
const hb=(g,w,h,d,m,px,py,pz,ol)=>{const e=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);e.position.set(px,py+h/2,pz);if(ol){const o=new THREE.Mesh(e.geometry,OLm);o.scale.setScalar(1.04);e.add(o)}return add(g,e)};
const HQGL=new THREE.MeshStandardMaterial({color:0x8cc4dc,roughness:.12,metalness:.1,emissive:0xffc977,emissiveIntensity:.06});
// ادغام مش‌های هم‌متریالِ یک گروه در یک مش (تعداد draw call کم می‌شود؛ جزئیات بیشتر بدون کندی)
function bake(g){const by=new Map();for(const c of g.children.filter(c=>c.isMesh)){c.updateMatrix();let ge=c.geometry.clone();ge.applyMatrix4(c.matrix);if(ge.index)ge=ge.toNonIndexed();for(const k of Object.keys(ge.attributes))if(!['position','normal','uv'].includes(k))ge.deleteAttribute(k);if(!by.has(c.material))by.set(c.material,[]);by.get(c.material).push(ge);g.remove(c);c.geometry.dispose()}
for(const[m,a]of by){const me=new THREE.Mesh(mergeGeometries(a),m);me.castShadow=me.receiveShadow=true;g.add(me)}}
// تختهٔ کج (شیب سقف): طول، ضخامت، عمق، رنگ، موقعیت x و y، چرخش حول z
const slab=(g,L,t,D,c,x,y,rz)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(L,t,D),M(c,.7));m.position.set(x,y,0);m.rotation.z=rz;return add(g,m)};
// ── پلاک شمارهٔ خانه: تابلوی چوبی بالای در، با CanvasTexture شمارهٔ فارسی ──
// وقتی روی خونه زوم کنیم خواناست. متن = «خانه» + شمارهٔ خونه (fa). بوم با وضوح بالا + عدد درشت.
const _PLQ=new Map();
function plaqueTex(num){
  if(_PLQ.has(num))return _PLQ.get(num);
  const c=document.createElement('canvas');c.width=420;c.height=180;const x=c.getContext('2d');
  x.fillStyle='#5a3a22';x.fillRect(0,0,420,180);                 // قاب چوبی تیره
  x.fillStyle='#f7eedb';x.fillRect(14,14,392,152);               // صفحهٔ کرمِ روشن
  x.strokeStyle='#c9a85a';x.lineWidth=3;x.strokeRect(26,26,368,128); // خطِ قاب داخلی
  x.fillStyle='#000000';x.font='800 32px Vazirmatn,Tahoma,sans-serif';x.textAlign='center';x.textBaseline='middle';
  x.fillText('خانه',210,50);                                     // برچسب «خانه» (سیاهِ خالص)
  x.fillStyle='#000000';x.font='800 106px Vazirmatn,Tahoma,sans-serif';
  x.fillText(num,210,120);                                       // شمارهٔ فارسی (سیاهِ خالص، درشت)
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;_PLQ.set(num,t);return t;
}
// ساخت پلاک روی گروه خونه: قاب چوبی + صفحهٔ متنی، بالای در (محور +z = جلوی خونه)
function plaque(g,num){
  const tx=plaqueTex(num);
  const fr=new THREE.Mesh(new THREE.BoxGeometry(.66,.26,.035),M(0x5a3a22));fr.position.set(0,.80,.51);fr.castShadow=true;fr.receiveShadow=true;g.add(fr);
  const fc=new THREE.Mesh(new THREE.PlaneGeometry(.60,.21),new THREE.MeshStandardMaterial({map:tx,roughness:.6}));fc.position.set(0,.80,.531);g.add(fc);
}
const build={
house(g,b){const k=b.id,wc=WALL[k%4],rc=ROOF[(k>>2)%4],rd=new THREE.Color(rc).multiplyScalar(.78).getHex(),TB=0x6b4326,TD=0x4a3022,SH=AWN[k%4];
// پایه، کف چوبی (از بالا دیده می‌شود وقتی سقف باز است) و پله
bx(g,1.5,.14,1.3,0x8d877b);bx(g,1.14,.03,.94,0xb98a5a,0,.14);bx(g,.46,.04,.18,0xa59d8c,0,.14,.58);
// دیوارهای توخالی (گروه جدا: در نمای داخل کوتاه می‌شود) + ستون‌های گوشه، در، پنجره با کرکره و گلدان
const wl=new THREE.Group();wl.position.y=.14;g.add(wl);
bx(wl,1.2,.8,.07,wc,0,0,-.465);bx(wl,1.2,.8,.07,wc,0,0,.465);bx(wl,.07,.8,.86,wc,-.565,0,0);bx(wl,.07,.8,.86,wc,.565,0,0);
for(const a of[-1,1])for(const c of[-1,1])bx(wl,.08,.82,.08,TB,a*.58,0,c*.48);
bx(wl,.3,.52,.05,TB,0,0,.52);bx(wl,.4,.05,.09,TD,0,.52,.52);bx(wl,.05,.52,.08,TD,-.19,0,.52);bx(wl,.05,.52,.08,TD,.19,0,.52);ball(wl,.022,0xd9b45a,.1,.26,.55,0);
for(const sx of[-.4,.4]){const w=new THREE.Mesh(new THREE.BoxGeometry(.24,.24,.05),GLOW);w.position.set(sx,.42,.52);wl.add(w);
bx(wl,.32,.04,.07,TB,sx,.56,.52);bx(wl,.06,.26,.04,SH,sx-.17,.29,.52);bx(wl,.06,.26,.04,SH,sx+.17,.29,.52);bx(wl,.28,.06,.07,0x6b4a2b,sx,.2,.55);
[[-.08,0xe8a3b8],[0,0xf3e9a6],[.08,0xd94f3a]].forEach(([fx,fc])=>ball(wl,.032,fc,sx+fx,.3,.555,0))}
for(const sx of[-.6,.6]){const w=new THREE.Mesh(new THREE.BoxGeometry(.05,.24,.24),GLOW);w.position.set(sx,.42,0);wl.add(w)}
// سقف (گروه جدا: در نمای داخل بالا می‌رود): دو شیب ۴۵ درجه با خط‌های سفال، خرپشته، دیوار شیروانی و دودکش
const ro=new THREE.Group();ro.position.y=.94;g.add(ro);
for(const s of[-1,1]){slab(ro,1.25,.05,1.5,rc,s*.46,.18,-s*Math.PI/4);for(const d of[.4,.78,1.1])slab(ro,.07,.025,1.52,rd,s*(d*.707+.028),.6-d*.707+.028,-s*Math.PI/4)}
bx(ro,.12,.06,1.54,rd,0,.57,0);gable(ro,1.2,.6,.06,wc,0).position.z=.44;gable(ro,1.2,.6,.06,wc,0).position.z=-.5;
bx(ro,.16,.66,.16,0x8b8378,.42,-.1,-.2);bx(ro,.22,.05,.22,0x5f5a52,.42,.56,-.2);
Object.assign(g.userData,{roof:ro,walls:wl,ry:.94,rl:1.7});bake(ro);bake(wl);bake(g);
const hg=NORAY(new THREE.Mesh(HPG,HP));hg.rotation.x=-Math.PI/2;hg.position.set(0,.16,.95);g.add(hg);plaque(g,fa(b.id))},
farm(g){bx(g,1.9,.06,1.9,0x6e4a30);for(let i=-2;i<=2;i++){bx(g,1.6,.1,.2,0x5a3d28,0,.06,i*.34);for(let j=-3;j<=3;j++)ball(g,.1,[0x86b84e,0xa6c24a,0x6fa648][(i+j+9)%3],j*.24,.2,i*.34,0)}
cyl(g,.03,.03,.6,0x6b4a2b,.8,.06,.8,5);bx(g,.4,.04,.04,0x6b4a2b,.8,.5,.8);ball(g,.07,0xe3c78a,.8,.7,.8,0);cyl(g,.1,.1,.03,0x8a6a45,.8,.74,.8,8);bakeVC(g)},
market(g){bx(g,2,.06,1.4,0xb9ae96);for(let i=-1;i<=1;i++){const x=i*.66;bx(g,.55,.4,.45,0x9a6b3f,x,.06);
bx(g,.32,.06,.6,AWN[i+1],x-.16,.62);bx(g,.32,.06,.6,0xf2ead6,x+.16,.62);[-.26,.26].forEach(a=>[-.22,.22].forEach(c=>bx(g,.04,.56,.04,0x6b4a2b,x+a,.06,c)));
for(let j=-1;j<=1;j++)ball(g,.07,[0xd94f3a,0xf0b13a,0x7cb342][(i+j+3)%3],x+j*.14,.53,0,0)}bakeVC(g)},
road(g){roadMesh(g,0,0)},
path(g,b){pathMesh(g,0,b.id,b.style==='dirt'?'dirt':b.style==='stone'?'stone':LEGACY_PATH_STYLE)},
hq(g){
const ST=M(0xcfc9ba,.95),WL=M(0xe9e3d4,.85),DK=M(0x2c323a,.55),WD=M(0x8a5a35,.7),RF=M(0xf3efe6,.6),LW=M(0x7fa46a,1),PL=M(0x2f7a4a,.9),GO=M(0xd9b45a,.35),PT=M(0xe9e2cf,.95);
hb(g,1.9,.08,1.84,ST,0,0,.05);hb(g,1.76,.02,1.7,LW,0,.08,.05);
hb(g,1.54,.06,1.04,DK,0,.1,-.25);hb(g,1.44,.02,.94,M(0x6f7b86,.9),0,.16,-.25);
// طبقهٔ همکف توخالی (گروه W0: در نمای داخل کوتاه می‌شود) + شیشه‌ها و در
const W0=new THREE.Group();W0.position.y=.16;g.add(W0);
hb(W0,1.5,.6,.06,WL,0,0,-.72);hb(W0,1.5,.6,.06,WL,0,0,.22);hb(W0,.06,.6,.88,WL,-.72,0,-.25);hb(W0,.06,.6,.88,WL,.72,0,-.25);
[-.56,-.3,.3,.56].forEach(x=>hb(W0,.22,.38,.03,HQGL,x,.04,.25));
hb(W0,.34,.5,.03,DK,0,0,.245);hb(W0,.26,.44,.04,WD,0,0,.26);hb(W0,.025,.12,.03,GO,.09,.14,.285);
[-.77,.77].forEach(x=>hb(W0,.03,.3,.5,HQGL,x,.08,-.25));
// طبقهٔ بالا + بام + تراس (گروه U: مثل سقف خانه‌ها بالا می‌رود؛ y محلی = y قبلی − ۰٫۷۶)
const U=new THREE.Group();U.position.y=.76;g.add(U);
hb(U,1.72,.56,1.1,DK,0,0,-.2);
hb(U,1.52,.38,.03,HQGL,0,.09,.35);[-.5,-.25,0,.25,.5].forEach(x=>hb(U,.025,.38,.04,DK,x,.09,.355));
[-.87,.87].forEach(x=>hb(U,.03,.3,.7,HQGL,x,.12,-.2));
hb(U,1.86,.06,1.26,RF,0,.56,-.2);hb(U,1.86,.022,.022,GLm,0,.538,.44);
hb(U,1.5,.15,.02,HQGL,0,.62,.3);hb(U,.02,.15,.5,HQGL,-.75,.62,.05);hb(U,.02,.15,.5,HQGL,.75,.62,.05);
[-.5,.5].forEach(x=>{hb(U,.3,.09,.14,WD,x,.62,.16);ball(U,.09,0x5f9f55,x-.07,.76,.16);ball(U,.07,0x4f8f4a,x+.07,.74,.16)});
[[-.6,-.55],[.6,-.55],[-.6,-.1],[.6,-.1]].forEach(([x,z])=>cyl(U,.014,.014,.36,0x2c323a,x,.62,z,5));hb(U,1.3,.025,.5,WD,0,.98,-.33);
hb(U,.4,.28,.32,DK,.55,.62,-.55);
Object.assign(g.userData,{roof:U,walls:W0,ry:.76,rl:2.1});
const em=new THREE.Group();em.position.set(0,.86,-.15);const rg=new THREE.Mesh(new THREE.TorusGeometry(.14,.025,8,20),GLm);rg.position.y=.14;em.add(rg);const dc=new THREE.Mesh(new THREE.CircleGeometry(.115,16),GDm);dc.position.y=.14;em.add(dc);const dc2=dc.clone();dc2.rotation.y=Math.PI;em.add(dc2);hb(em,.05,.14,.05,DK,0,0,0);U.add(em);hqDish=em;
hb(g,.82,.04,.4,WL,0,.66,.42);[-.36,.36].forEach(x=>cyl(g,.025,.025,.5,0xf1ece0,x,.1,.6,8));
[-.18,.18].forEach(x=>{const lb=new THREE.Mesh(new THREE.SphereGeometry(.03,8,6),LAMP);lb.position.set(x,.64,.5);g.add(lb)});
hb(g,.76,.03,.44,ST,0,.08,.5);hb(g,.6,.03,.3,PT,0,.11,.46);hb(g,.22,.012,.32,PT,0,.08,.82);
hb(g,.46,.16,.14,PL,-.58,.08,.58);hb(g,.46,.16,.14,PL,.58,.08,.58);ball(g,.1,0x4f8f4a,-.82,.2,.75);ball(g,.1,0x5f9f55,.82,.2,.75);ball(g,.08,0xe8a3b8,-.35,.2,.74,0);ball(g,.08,0xf3e9a6,.35,.2,.74,0);
cyl(g,.012,.012,1.15,0xcfd3d6,-.78,.08,.55,6);hb(g,.28,.16,.012,M(0x23a05c,.7),-.64,1.04,.55);
hb(g,.07,.36,.07,DK,.72,.08,.8);const sr=new THREE.Mesh(new THREE.TorusGeometry(.075,.015,8,16),GLm);sr.position.set(.72,.58,.8);g.add(sr);
[-.2,.2].forEach(x=>{cyl(g,.012,.012,.26,0x2c323a,x,.08,.84,5);const lb=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),LAMP);lb.position.set(x,.37,.84);g.add(lb)});
const gl=NORAY(new THREE.Mesh(HQGG,HQG));gl.rotation.x=-Math.PI/2;gl.position.set(0,.14,.5);g.add(gl)},

tree(g,b){const k=b.id,sr=((k*9301+49297)%233280)/233280,s=.9+sr*.7,v=k%3;g.userData.sw=sr*6;cyl(g,.09*s,.13*s,.7*s,0x6e4c32,0,0,0,6);
if(v===1)[[.8,.62],[1.25,.46],[1.62,.3]].forEach(([y,r])=>{const m=new THREE.Mesh(new THREE.ConeGeometry(r*s,.62*s,7),F(0x3f7a4a));m.position.y=y*s;add(g,m)});
else[[0,1.05,0,.62],[.25,.85,.1,.42],[-.22,.9,-.1,.4]].forEach(([a,y,c,r],i)=>ball(g,r*s,v?[0x6a9f4f,0x7aae55,0x5e9448][i]:[0x4f8f4a,0x5f9f55,0x3f7d45][i],a*s,y*s,c*s));bakeVC(g)},
// تابلوی عابر پیاده: تیرک + صفحهٔ آبی دوروطن که محکم روی تیرک سوار است — دو صفحهٔ جلو/پشت تیرک را
// می‌گیرند و سر تابلو با هم‌پوشانی روی بدنه می‌نشیند تا از هیچ زاویه‌ای جدا/بیرون‌زده دیده نشود.
// جهت‌گیری مدل رو به جاده در roads() انجام می‌شود (صفحهٔ اصلی رو به +z).
crossing(g){cyl(g,.03,.045,.56,0x3a3f44,0,0,0,6);bx(g,.075,.045,.075,0x3a3f44,0,.56,0);
const pl=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),CROSSSGN);pl.position.set(0,.62,.04);add(g,pl);
const bk=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),M(0x1d5fbf,.5));bk.position.set(0,.62,-.04);bk.rotation.y=Math.PI;add(g,bk)},
// ── تابلو بنری جلوی دفتر مدیرعامل: دو تیرک با گل‌سر فلزی، میلهٔ بالا و پارچهٔ بنری با متن شهر.
// سلسله‌مراتب فونت: اسم شهر درشت‌ترین و بولد، بعد مدیرعامل، بعد تاریخ، بعد متن اضافه (هرکدام ریزتر).
// متن در فیلد bn با | جدا می‌شود؛ تغییرش امضای sync را عوض می‌کند و مش با بافت تازه بازسازی می‌شود (12-net-sync).
banner(g,b){const[v1,v2,v3,v4]=(b.bn||'شهر من|||').split('|');
const cv=document.createElement('canvas');cv.width=512;cv.height=288;
const draw=()=>{const x=cv.getContext('2d');
 const gr=x.createLinearGradient(0,0,0,288);gr.addColorStop(0,'#14402f');gr.addColorStop(1,'#0b271d');x.fillStyle=gr;x.fillRect(0,0,512,288);
 x.strokeStyle='#e9c877';x.lineWidth=5;x.strokeRect(9,9,494,270);
 x.strokeStyle='#39ff8c';x.lineWidth=2;x.strokeRect(17,17,478,254);
 x.fillStyle='rgba(233,200,119,.9)';[[9,9],[503,9],[9,279],[503,279]].forEach(([px,py])=>{x.beginPath();x.arc(px,py,7,0,6.284);x.fill()});
 // زبانه‌های پایین پارچه (شکل بنر پارچه‌ای)
 x.fillStyle='#0b271d';for(let i=0;i<8;i++){const px=17+i*59.75;x.beginPath();x.moveTo(px,271);x.lineTo(px+59.75,271);x.lineTo(px+29.875,286);x.closePath();x.fill()}
 x.textAlign='center';x.textBaseline='middle';x.direction='rtl';
 x.fillStyle='#ffe9a8';x.font='800 64px Vazirmatn,sans-serif';x.fillText(v1||'شهر من',256,86);
 x.fillStyle='#d8ecd0';x.font='700 31px Vazirmatn,sans-serif';x.fillText(v2?'مدیرعامل: '+v2:'مدیرعامل: —',256,152);
 x.fillStyle='#a9ccb6';x.font='500 26px Vazirmatn,sans-serif';if(v3)x.fillText(v3,256,196);
 x.fillStyle='#8fb39f';x.font='500 22px Vazirmatn,sans-serif';if(v4)x.fillText(v4,256,234)};
draw();const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{draw();tex.needsUpdate=true});
const cloth=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.9),new THREE.MeshStandardMaterial({map:tex,roughness:.78,emissive:0x123a2b,emissiveIntensity:.25}));
cloth.position.set(0,.72,.008);add(g,cloth);
const back=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.9),M(0x0e2c22,.8));back.position.set(0,.72,-.008);back.rotation.y=Math.PI;add(g,back);
[-1,1].forEach(q=>{cyl(g,.028,.04,1.2,0x3a3f44,q*.72,0,0,6);ball(g,.042,0xd9b45a,q*.72,1.22,0)});
bx(g,1.5,.03,.03,0x2c3134,0,1.2,0);
g.userData.sw=((b.id*9301+49297)%233280)/233280*6}};   // تپش نرم باد (همان سیستم تاب درخت‌ها؛ sw در building-animation مصرف می‌شود)
function addB(b,delay=0){const g=new THREE.Group();build[b.type]?.(g,b);
 // نشستن روی زمینِ واقعی (fpBaseY در 07-buildings-footprint.js): کنار رود سازه روی جالیِ بلندشدهٔ ساحل می‌نشیند،
 // نه دفن زیرِ آن (باگ «محو شدن کنار آب»)؛ در مرکزِ شهرِ هموار خروجی ۰ است ⇒ هیچ چیزِ موجود جابه‌جا نمی‌شود.
 g.position.set(b.x*U,fpBaseY(b.type,b.x,b.z,b.rot),b.z*U);g.rotation.y=(b.type==='road'||b.type==='path')?0:b.rot*Math.PI/180;g.scale.setScalar(delay>0?0:.01);Object.assign(g.userData,{b,t:delay>0?-delay:0});scene.add(g);objs.set(b.id,g)}
