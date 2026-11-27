// ═══ مدل سه‌بعدی ساختمان‌ها (خانه، مزرعه، بازار، جاده، پیاده‌رو، دفتر مدیرعامل، درخت، دیوار شهر، برج نگهبانی، دروازهٔ شهر، کاخ شهری، پل رودخانه) و addB.
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
// ── پلاک شمارهٔ خانه (فاز ۲): قاب چوبی + رَستة «خانه + شمارهٔ فارسی» از یک اطلس مشترک حروف.
// قبلاً به‌ازای هر خانه یک CanvasTexture اختصاصی ۴۲۰×۱۸۰ ساخته می‌شد — در مقیاس هزاران خانه بمب حافظهٔ GPU
// بود و مانعِ ادغام پلاک‌ها در چانک (متریال یکتا = یک درا-کال برای هر خانه). حالا همه از یک اطلس می‌خوانند؛
// در چانک همهٔ پلاک‌ها «یک مش» می‌شوند و حافظهٔ GPU از ~۳۰۰KB به ~۴۰KB برای کل شهر می‌رسد.
// رَستة حروف = چندکوادک‌های دقیقاً هم‌اندازه/هم‌جای متن قدیمی (همان فونت/اندازه/میانه‌چینی).
const PLAQUE_MAT=new THREE.MeshStandardMaterial({roughness:.6});
const _PLQC={canvas:null,x:null,gl:new Map(),tex:null};
function plqDraw(){ // رسم اطلس (بار اول + بعد از رسیدن فونت واقعی — متریک‌ها ممکن است عوض شوند)
 try{
  if(!_PLQC.canvas){const c=document.createElement('canvas');c.width=1024;c.height=176;_PLQC.canvas=c;_PLQC.x=c.getContext('2d');
   const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;_PLQC.tex=t;PLAQUE_MAT.map=t;PLAQUE_MAT.needsUpdate=true}
  const x=_PLQC.x,A=1024;x.clearRect(0,0,A,176);x.textAlign='left';x.textBaseline='alphabetic';x.fillStyle='#000';
  const GL=_PLQC.gl;GL.clear();let cx=3;
  const put=(ch,font,y0,y1,base)=>{x.font=font;const w=Math.ceil(x.measureText(ch).width);x.fillText(ch,cx,base);GL.set(ch,{x:cx,w,y0,y1});cx+=w+3};
  put('خانه','800 32px Vazirmatn,Tahoma,sans-serif',6,46,38);
  const df='800 106px Vazirmatn,Tahoma,sans-serif';
  for(const ch of '۰۱۲۳۴۵۶۷۸۹٬')put(ch,df,58,168,150);
  _PLQC.tex.needsUpdate=true;return true
 }catch(e){return false}
}
plqDraw();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{ // فونت واقعی رسید: اطلس تازه + پلاکِ همهٔ خانه‌های زنده دوباره
 if(!plqDraw())return;
 if(typeof CH!=='undefined'&&CH.plaqueChanged)CH.plaqueChanged();
 for(const g of objs.values())if(g.userData.b&&g.userData.b.type==='house'&&g.userData.plq&&g.userData.m!==1){
  for(const c of[...g.children])if(c.userData&&c.userData.plq){g.remove(c);if(c.geometry&&!SHGEO.has(c.geometry))c.geometry.dispose()}
  plaque(g,fa(g.userData.b.id))}});
// ساخت پلاک روی گروه خانه: قاب چوبی (بستهٔ متریال معمولی → در سطل VC ادغام می‌شود) + رَستة حروف با متریال اطلس مشترک
function plaque(g,num){
 const fr=new THREE.Mesh(new THREE.BoxGeometry(.66,.26,.035),M(0x5a3a22));fr.position.set(0,.80,.51);fr.castShadow=true;fr.receiveShadow=true;fr.userData.plq=1;g.add(fr);
 const A=_PLQC;if(!A.tex)return;
 const sx=.60/420,sy=.21/180,yW=v=>.105-v*sy,z=0;
 const pos=[],uv=[],nrm=[],idx=[];let vi=0;
 const quad=(G,x0,x1,top,bot)=>{pos.push(x0,top,z, x1,top,z, x1,bot,z, x0,bot,z);
  const u0=G.x/A.canvas.width,u1=(G.x+G.w)/A.canvas.width,v0=1-G.y0/A.canvas.height,v1=1-G.y1/A.canvas.height;
  uv.push(u0,v0, u1,v0, u1,v1, u0,v1);
  for(let i=0;i<4;i++)nrm.push(0,0,1);
  idx.push(vi,vi+1,vi+2, vi,vi+2,vi+3);vi+=4};
 {const G=A.gl.get('خانه');if(G){const w=G.w*sx,cx0=-w/2;quad(G,cx0,cx0+w,yW(38)+(38-G.y0)*sy,yW(38)-(G.y1-38)*sy)}}
 {const s=String(num),qs=[];let tot=0;for(const ch of s){const G=A.gl.get(ch);if(G){qs.push(G);tot+=G.w*sx}}
  let cx0=-tot/2;for(const G of qs){const w=G.w*sx;quad(G,cx0,cx0+w,yW(150)+(150-G.y0)*sy,yW(150)-(G.y1-150)*sy);cx0+=w}}
 const ge=new THREE.BufferGeometry();
 ge.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 ge.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));
 ge.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 ge.setIndex(idx);
 const q=new THREE.Mesh(ge,PLAQUE_MAT);q.position.set(0,.80,.531);q.userData.plq=1;g.add(q);
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
g.userData.sw=((b.id*9301+49297)%233280)/233280*6},   // تپش نرم باد (همان سیستم تاب درخت‌ها؛ sw در building-animation مصرف می‌شود)
// ═══ مجموعهٔ دفاعی «مدرن‌شده» (فاز گسترش ساخت‌وساز؛ الهام ساختاری از قلعه‌های Kingdoms and Castles،
// متریال از دنیای خود بازی: بتنی روشنِ هم‌خانوادهٔ پیاده‌رو/HQ + سقف از پالت ROOF خانه‌ها + پرچم سبز شهر.
// مرجع بصری: download/reference-comparison.html — مرجع A (بازی) ظاهر را تعیین می‌کند، مرجع B فقط فرم/ساختار را.) ═══
wall(g,b,m){wallMesh(g,m||0)},
tower(g,b){towerMesh(g,b)},
gate(g,b){gateMesh(g,b)},
palace1(g,b){palaceMesh(g,b,1)},palace2(g,b){palaceMesh(g,b,2)},palace3(g,b){palaceMesh(g,b,3)},
bridge(g,b){bridgeMesh(g,b)},
// فاز ۳ — ساختمان‌های کاربردی: همه با همان پالت بتنی روشن/شیشهٔ HQ/پالت سقف و سایه‌بان خانه‌ها.
warehouse(g,b){wareMesh(g,b)},
workshop(g,b){workMesh(g,b)},
mill(g,b){millMesh(g,b)},
school(g,b){schoolMesh(g,b)},
clinic(g,b){clinicMesh(g,b)},
park(g,b){parkMesh(g,b)},
store(g,b){storeMesh(g,b)}};
// پالت مجموعهٔ دفاعی: بین سنگ‌فرش پیاده‌رو (#b9b8aa) و دیوار HQ (#e9e3d4) + درزهای بتنی + کلاهک روشن
const WALL_ST=0xe7e0cd,WALL_ST2=0xd8d0ba,WALL_BASE=0xb0a999,WALL_JNT=0x9d9689,WALL_CAP=0xf1ebdb,
FLAGC=0x2f7a4a,FLAGG=0xd9b45a;   // پرچم: سبز شهر (هم‌خانوادهٔ بنر/دفتر) + نوک طلایی
const FLAG_M=new THREE.MeshStandardMaterial({color:FLAGC,roughness:.85,side:THREE.DoubleSide}),   // پارچهٔ پرچم (مشترک)
FLAG_T=new THREE.MeshStandardMaterial({color:FLAGG,roughness:.5,side:THREE.DoubleSide}),          // نوک طلایی دورو
FLAG_H=new THREE.MeshStandardMaterial({color:FLAGG,roughness:.5});                                // گوی سر میله
const _wg=(w,h,d,x,y,z)=>new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z);   // جعبهٔ آمادهٔ ادغام برای پنجره‌های GLOW
function mkFlag(g,y,h,ph,px=0,pz=0){ // پرچم تاب‌خور روی میله (px/pz = جای میله، پیش‌فرض مرکز). هر سازه می‌تواند چند پرچم داشته
 cyl(g,.014,.014,h,0x2c3134,px,y,pz,5);                                                            // باشد — building-animation (05-core-main.js) آرایهٔ flgs را می‌چرخاند
 const p=new THREE.Group();p.position.set(px,y+h-.06,pz);p.userData.ph=ph;g.add(p);
 const f=new THREE.Mesh(new THREE.PlaneGeometry(.42,.22),FLAG_M);f.position.set(.23,.11,0);p.add(f);
 const tip=new THREE.Mesh(new THREE.BoxGeometry(.055,.22,.012),FLAG_T);tip.position.set(.47,.11,0);p.add(tip);
 const hem=new THREE.Mesh(new THREE.SphereGeometry(.03,8,6),FLAG_H);hem.position.set(px,y+h,pz);g.add(hem);
 (g.userData.flgs=g.userData.flgs||[]).push(p);return p}
const glowMesh=L=>new THREE.Mesh(mergeGeometries(L,false),GLOW);   // پنجره‌های گرم شب (همان GLOW خانه‌ها)
// ── دیوار شهر: کشیدنی/زنجیره‌ای مثل جاده؛ هر کاشی ۱×۱ واحد با ماسک اتصال (۱=شمال ۲=شرق ۴=جنوب ۸=غرب).
// بدنهٔ بتنی روشن با بندکشی افقی مثل پیاده‌رو، پایلستر مرکزی (ریتم)، کلاهک پیوستهٔ مسیر گشت‌زنی و کنگرهٔ سادهٔ مدرن.
// ساختاری که از مرجع B آمده: «کنگره + دیوار پیوسته که به برج/دروازه می‌چسبد»؛ ظاهر کاملاً از پالت خود بازی.
function wallMesh(g,m){clearKids(g);
 const A=[],q=(w,h,d,x,y,z,c)=>A.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z),c));
 const T=FOOT.wall[0]*U,TH=.44,PH=.07,BH=.82,CAP=.045,CT=.14,CTOP=PH+BH+CAP;   // ضخامت تیغه، پایه، بدنه، کلاهک، کنگره
 q(T,PH,T,0,0,0,WALL_BASE);                                       // پایهٔ بتنی (خاک‌گیری)
 let n=0;for(let i=0;i<4;i++)if(m&(1<<i))n++;
 if(n){                                                            // بازوها از مرکز تا لبهٔ کاشی — دیوار پیوسته
  for(const[bit,ux,uz]of[[1,0,-1],[2,1,0],[4,0,1],[8,-1,0]]){if(!(m&bit))continue;
   const ax=!!ux;
   if(ax){q(.5,BH,TH,ux*.25,PH,0,WALL_ST);q(.5,.018,.018,ux*.25,.56,.205,WALL_JNT);q(.5,.018,.018,ux*.25,.56,-.205,WALL_JNT)}
   else{q(TH,BH,.5,0,PH,uz*.25,WALL_ST);q(.018,.018,.5,.205,.56,uz*.25,WALL_JNT);q(.018,.018,.5,-.205,.56,uz*.25,WALL_JNT)}   // بدنه + بندکشی افقی روی دو روی تیغه
   for(const o of[.28,.42])for(const s of[-1,1])                   // کنگره: دندانه‌های دو طرف مسیر گشت‌زنی
    if(ax)q(.12,CT,.09,ux*o,CTOP,s*.45,WALL_ST2);else q(.09,CT,.12,s*.45,CTOP,uz*o,WALL_ST2)}
  q(T,CAP,T,0,PH+BH,0,WALL_CAP);                                  // کلاهک پیوستهٔ مسیر گشت‌زنی
  q(.52,BH+CAP+.06,.52,0,PH,0,WALL_ST2);q(.6,.05,.6,0,PH+BH+CAP+.06,0,WALL_CAP);   // پایلستر مرکزی (ریتم بندکشی) + سرستون
 }else{                                                            // پایهٔ تنها (شروع/پایان دیوار): پایهٔ پرچنگرهٔ مستقل
  q(.68,BH+.13,.68,0,PH,0,WALL_ST);q(.78,.06,.78,0,PH+BH+.13,0,WALL_CAP);
  for(const[dx,dz]of[[0,.31],[0,-.31],[.31,0],[-.31,0]])q(Math.abs(dx)?.13:.09,CT,Math.abs(dz)?.13:.09,dx,PH+BH+.19,dz,WALL_ST2);
 }
 g.add(vcMesh(A,VCM,true,true));
 // شکاف گرم کوچک روی پایلستر — شب مثل پنجرهٔ خانه‌ها روشن می‌شود (GLOW با applyEnv)
 g.add(glowMesh([_wg(.09,.11,.02,0,.5,.27),_wg(.09,.11,.02,0,.5,-.27)]));
}
// ── برج نگهبانی: برج گوشه/اتصال دیوار — پایهٔ عریض تقریباً به‌اندازهٔ کل کاشی (دیوارها صاف به بدنه می‌چسبند)،
// کمربند شکاف (زبان معماری برج قلعه)، طبقهٔ بالایی با کنگره، سقف هرمی از پالت سقف خانه‌ها + پرچم تاب‌خور و فانوس شب.
function towerMesh(g,b){clearKids(g);
 const RC=ROOF[(b.id>>2)%4],A=[],q=(w,h,d,x,y,z,c)=>A.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z),c));
 const S=FOOT.tower[0]*U;                                          // 1.5
 q(S,.08,S,0,0,0,WALL_BASE);q(S-.16,.04,S-.16,0,.08,0,WALL_JNT);   // پایهٔ دوبل
 q(1.42,1.1,1.42,0,.12,0,WALL_ST);                                 // بدنهٔ اصلی (تا ۱٫۲۲)
 for(const a of[-1,1])for(const c of[-1,1])q(.12,1.1,.12,a*.65,.12,c*.65,WALL_ST2);   // پایلسترهای گوشه
 q(1.46,.025,1.46,0,.66,0,WALL_JNT);                               // بندکشی افقی
 q(.3,.44,.05,.2,.12,.72,WALL_JNT);q(.36,.05,.18,.2,.08,.78,WALL_CAP);               // در تیره + آستانه
 q(S,.1,S,0,1.22,0,WALL_ST2);                                       // کمربند شکاف (لبهٔ تمام‌قد کاشی — نقطهٔ چسبیدن دیوار)
 q(1.04,.5,1.04,0,1.32,0,WALL_ST);                                  // طبقهٔ بالا (تا ۱٫۸۲)
 for(const a of[-1,1])for(const c of[-1,1])q(.09,.5,.09,a*.48,1.32,c*.48,WALL_ST2);
 for(const[dx,dz]of[[0,.62],[0,-.62],[.62,0],[-.62,0]])for(const s of[-.3,.3])       // کنگرهٔ دور طبقهٔ بالا
  q(Math.abs(dx)?.12:.09,.15,Math.abs(dz)?.12:.09,dx+(dx?0:s),1.32,dz+(dz?0:s),WALL_ST2);
 q(.16,.2,.05,-.26,1.45,.53,WALL_JNT);q(.16,.2,.05,.26,1.45,.53,WALL_JNT);           // پنجرهٔ قوس‌دار (فرورفتگی تیره)
 q(.16,.2,.05,0,1.5,-.53,WALL_JNT);
 A.push(vcGeo(new THREE.ConeGeometry(.8,.62,4).rotateY(Math.PI/4).translate(0,2.13,0),RC));   // سقف هرمی هم‌رنگ خانه‌ها
 q(.06,.08,.06,0,1.82,0,WALL_CAP);
 g.add(vcMesh(A,VCM,true,true));
 // پنجره‌های گرم شب: دو پنجرهٔ بدنه + دو شکاف طبقهٔ بالا (همان GLOW خانه‌ها؛ شب از applyEnv روشن می‌شود)
 g.add(glowMesh([_wg(.14,.16,.03,-.26,.56,.715),_wg(.14,.16,.03,.26,.56,.715),_wg(.14,.16,.03,0,.56,-.715),_wg(.12,.14,.03,-.26,1.44,.525),_wg(.12,.14,.03,.26,1.44,.525)]));
 // فانوس زیر شیروانی + هالهٔ شب (LHALO با applyEnv محو/ظاهر می‌شود) — نقطهٔ نور واقعی در roads() به lampPts می‌رود
 const lb=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),LAMP);lb.position.set(0,1.95,.42);g.add(lb);
 const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(.9,.9,1);hl.position.set(0,1.95,.42);g.add(hl);
 mkFlag(g,2.28,.62,((b.id*9301+49297)%233280)/233280*6);           // پرچم تاب‌خور بالای سقف
}
// ── دروازهٔ شهر: دو پایهٔ کناری (footprint واقعی = فقط همین دو پایه) + تیر افقی و قوس نیم‌دایره روی دهانهٔ ۸ خرده‌سلولی
// (عرض دقیق جاده) — خودرو و شهروند روی همان کاشی جاده از زیر قوس رد می‌شوند؛ برجک و پرچم بالای تیر، فانوس زیر تیر.
function gateMesh(g,b){clearKids(g);
 const RC=ROOF[(b.id>>2)%4],A=[],q=(w,h,d,x,y,z,c)=>A.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z),c));
 const GD=FOOT.gate[1]*U;                                          // عمق ۱٫۵ (راستای عبور)
 for(const s of[-1,1]){const fx=s*1.375;                           // مرکز پایه‌ها: دو سر دهانه (۳ خرده‌سلولی)
  q(.8,.06,GD,fx,0,0,WALL_BASE);
  q(.68,1.34,1.34,fx,.06,0,WALL_ST);
  q(.72,.025,1.38,fx,.72,0,WALL_JNT);
  for(const a of[-1,1])for(const c of[-1,1])q(.07,1.34,.07,fx+a*.305,.06,c*.635,WALL_ST2);
  q(.78,.05,1.42,fx,1.4,0,WALL_CAP);
  for(const dz of[-.5,-.17,.17,.5])q(.15,.13,.1,fx,1.45,dz,WALL_ST2)}    // کنگرهٔ سر پایه
 q(2.3,.26,.6,0,1.06,0,WALL_ST);q(2.36,.03,.64,0,1.03,0,WALL_JNT);        // تیر افقی روی دهانه (زیرش تا ۱٫۰۶ باز است — خودرو رد می‌شود)
 q(2.3,.04,.66,0,1.32,0,WALL_CAP);
 for(const dx of[-.78,-.47,-.16,.16,.47,.78]){q(.12,.12,.11,dx,1.36,.26,WALL_ST2);q(.12,.12,.11,dx,1.36,-.26,WALL_ST2)}   // کنگرهٔ تیر
 A.push(vcGeo(new THREE.TorusGeometry(1.0,.07,8,22,Math.PI).translate(0,.05,0),WALL_JNT));   // قوس نیم‌دایرهٔ دهانه (پاهای قوس روی لبهٔ آسفالت)
 q(.16,.16,.5,.98,.9,0,WALL_ST2);q(.16,.16,.5,-.98,.9,0,WALL_ST2);        // تکیه‌گاه‌های تیر
 q(.58,.34,.5,0,1.36,0,WALL_ST2);q(.62,.03,.54,0,1.7,0,WALL_CAP);         // برجک مرکزی روی تیر
 A.push(vcGeo(new THREE.ConeGeometry(.42,.42,4).rotateY(Math.PI/4).translate(0,2.12,0),RC));
 g.add(vcMesh(A,VCM,true,true));
 g.add(glowMesh([_wg(.13,.16,.03,-.19,.5,.68),_wg(.13,.16,.03,.19,.5,.68),_wg(.13,.16,.03,-.19,.5,-.68),_wg(.13,.16,.03,.19,.5,-.68),_wg(.15,.12,.03,0,1.42,.26),_wg(.15,.12,.03,0,1.42,-.26)]));
 for(const s of[-1,1]){const lb=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),LAMP);lb.position.set(s*.82,1.0,.18);g.add(lb);
  const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(.8,.8,1);hl.position.set(s*.82,1.0,.18);g.add(hl)}   // فانوس‌های زیر تیر
 mkFlag(g,2.16,.5,((b.id*9301+49297)%233280)/233280*6);
}
// ── کاخ شهری (فاز ۲ — قلعه/کاخ مرکزی): بنای نمادین چندحجمی «مدرن‌شده» — سکوی بتنی دوبل، حصار کنگره‌دار،
// چهار برج گوشه با سقف هرمی از پالت خانه‌ها و بنگاه (keep) مرکزی با پرچم شهر. سه سطح ظاهری (همه بلافاصله
// قابل ساخت، بدون قفل/دوران): ۱=پایه، ۲=سرای ورودی + بالکن + نوار طلایی + پنجره‌های بیشتر، ۳=سلطنتی:
// نوار شیشه‌ای تاج (هم‌شیشهٔ دفتر مدیرعامل) + نشان طلایی-سبز شهر + پرچم‌داران. هم‌خانوادهٔ دفتر مدیرعامل،
// نه جایگزین آن — منطق بنیان‌گذار/خانه‌داری دست‌نخورده می‌ماند. ورودی رو به +z (مثل خانه‌ها؛ auto-rot به جاده).
function palaceMesh(g,b,tier){clearKids(g);
 const RC=ROOF[(b.id>>2)%4],A=[],W=[],q=(w,h,d,x,y,z,c)=>A.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z),c)),
 win=(w,h,d,x,y,z)=>W.push(_wg(w,h,d,x,y,z));   // پنجره‌های گرم شب
 const TH=[1.05,1.3,1.55][tier-1],KH=[1.25,1.75,2.3][tier-1],CW=[.5,.62,.78][tier-1],KS=[1.55,1.7,1.8][tier-1],PY=.14,TW=.62;
 const ph=((b.id*9301+49297)%233280)/233280*6;
 // سکوی دوبل (الگوی پایهٔ برج) + پلهٔ جلویی
 q(3.8,.09,3.8,0,0,0,WALL_BASE);q(3.64,.05,3.64,0,.09,0,WALL_JNT);q(1.3,.07,.2,0,0,1.92,WALL_BASE);
 // حصار دور تا دور + کلاهدار + کنگره — ضلع جلو دو تکه (دهانهٔ ورود ۱ واحدی)
 const cur=(x,z,w,d)=>{q(w,CW,d,x,PY,z,WALL_ST);q(w,.04,d+.06,x,PY+CW,z,WALL_CAP)};
 cur(0,-1.42,2.22,.2);for(let i=-2;i<=2;i++)q(.1,.11,.26,i*.48,PY+CW+.04,-1.42,WALL_ST2);
 for(const s of[-1,1]){cur(s*1.42,0,.2,2.22);for(let i=-2;i<=2;i++)q(.26,.11,.1,s*1.42,PY+CW+.04,i*.48,WALL_ST2);
  cur(s*.805,1.42,.61,.2);for(const x of[-1,-.62,.62,1])q(.1,.11,.26,x,PY+CW+.04,1.42,WALL_ST2)}
 // سرای ورودی (سطح ۲+): بدنه روی دهانهٔ حصار + گذر تیره با قوس + کنگره + سقف هرمی کوچک
 if(tier>=2){const GH=[.68,.82][tier-2];
  q(1.06,GH,.26,0,PY,1.42,WALL_ST);q(1.14,.05,.3,0,PY+GH,1.42,WALL_ST2);
  for(const x of[-.35,.35])q(.12,.12,.24,x,PY+GH+.05,1.42,WALL_ST2);
  A.push(vcGeo(new THREE.TorusGeometry(.24,.045,8,16,Math.PI).translate(0,PY+.03,1.56),WALL_JNT));
  q(.48,.3,.06,0,PY+.02,1.53,WALL_JNT);
  A.push(vcGeo(new THREE.ConeGeometry(.34,.24,4).rotateY(Math.PI/4).translate(0,PY+GH+.05+.12,1.42),RC));
  if(tier>=3){mkFlag(g,PY+GH+.34,.3,ph,-.42,1.42);mkFlag(g,PY+GH+.34,.3,ph+2.1,.42,1.42);win(.14,.12,.03,0,PY+GH-.16,1.56)}}
 // برج‌های گوشه (×۴): پایه + بدنه + پایلستر + بند + کمربند + کنگره + سقف هرمی هم‌رنگ خانه‌ها (+گل‌سر طلایی از ۲)
 for(const sx of[-1,1])for(const sz of[-1,1]){const tx=sx*1.42,tz=sz*1.42,ty=PY+.06;
  q(TW+.1,.06,TW+.1,tx,PY,tz,WALL_JNT);q(TW,TH,TW,tx,ty,tz,WALL_ST);
  for(const a of[-1,1])for(const c of[-1,1])q(.09,TH,.09,tx+a*(TW/2-.045),ty,tz+c*(TW/2-.045),WALL_ST2);
  q(TW+.06,.025,TW+.06,tx,ty+TH*.55,tz,WALL_JNT);q(TW+.12,.06,TW+.12,tx,ty+TH,tz,WALL_ST2);
  for(const[dx,dz]of[[0,.37],[0,-.37],[.37,0],[-.37,0],[.24,.24],[-.24,.24],[.24,-.24],[-.24,-.24]])q(.1,.13,.1,tx+dx,ty+TH+.06,tz+dz,WALL_ST2);
  A.push(vcGeo(new THREE.ConeGeometry(TW*.88,.36,4).rotateY(Math.PI/4).translate(tx,ty+TH+.06+.18,tz),RC));
  if(tier>=2){cyl(g,.014,.014,.12,FLAGG,tx,ty+TH+.4,tz,5);ball(g,.03,FLAGG,tx,ty+TH+.52,tz,0)}
  win(.03,.14,.06,tx+sx*(TW/2+.01),ty+TH*.45,tz);   // شکاف گرم روی نمای بیرونی هر برج
  if(tier>=3&&sz>0)mkFlag(g,ty+TH+.5,.3,ph+sx,tx,tz)}
 // بنگاه مرکزی (keep): بدنه + پایلستر + بندها + کمربند بالکن/طلایی (۲+) + کمربند سر + کنگره + سقف هرمی + پرچم
 const KY=PY+.07;
 q(KS+.06,.07,KS+.06,0,PY,0,WALL_JNT);q(KS,KH,KS,0,KY,0,WALL_ST);
 for(const a of[-1,1])for(const c of[-1,1])q(.11,KH,.11,a*(KS/2-.055),KY,c*(KS/2-.055),WALL_ST2);
 for(const f of[tier>=2?.32:.38,.62])q(KS+.04,.025,KS+.04,0,KY+KH*f,0,WALL_JNT);
 if(tier>=2){q(KS+.14,.05,KS+.14,0,KY+KH*.8,0,WALL_CAP);q(KS+.16,.018,KS+.16,0,KY+KH*.8+.05,0,FLAGG)}
 q(KS+.1,.07,KS+.1,0,KY+KH,0,WALL_ST2);
 for(let i=-1;i<=1;i++){q(.13,.14,.13,i*KS*.42,KY+KH+.07,KS/2+.02,WALL_ST2);q(.13,.14,.13,i*KS*.42,KY+KH+.07,-KS/2-.02,WALL_ST2);
  q(.13,.14,.13,KS/2+.02,KY+KH+.07,i*KS*.42,WALL_ST2);q(.13,.14,.13,-KS/2-.02,KY+KH+.07,i*KS*.42,WALL_ST2)}
 const RH=.5+tier*.1;
 A.push(vcGeo(new THREE.ConeGeometry(KS*.72,RH,4).rotateY(Math.PI/4).translate(0,KY+KH+.07+RH/2,0),RC));
 cyl(g,.016,.016,.16,FLAGG,0,KY+KH+.07+RH-.04,0,5);ball(g,.04,FLAGG,0,KY+KH+.07+RH+.13,0,0);
 if(tier>=3){mkFlag(g,KY+KH+RH-.06,.5,ph,-.24,0);mkFlag(g,KY+KH+RH-.06,.5,ph+3.1,.24,0)}   // پرچم‌داران دوقلو
 else mkFlag(g,KY+KH+RH-.06,.5,ph,0,0);
 // تاج شیشه‌ای سطح ۳: نوار چهارضلعی هم‌شیشهٔ دفتر مدیرعامل (HQGL) زیر کمربند سر — پیوند بصری با خانوادهٔ HQ
 if(tier>=3){const gb=(w,h,d,x,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),HQGL);m.position.set(x,KY+KH-.26+h/2,z);m.castShadow=true;g.add(m)};
  gb(KS+.02,.17,.05,0,KS/2-.015);gb(KS+.02,.17,.05,0,-KS/2+.015);gb(.05,.17,KS+.02,KS/2-.015,0);gb(.05,.17,KS+.02,-KS/2+.015,0)}
 // ورودی: در تیره + آستانه + قوس (۲+) + نشان شهر طلایی-سبز (۳) + فانوس‌ها
 const DH=tier===1?.5:.64;
 q(.42,DH,.06,0,KY,KS/2-.02,WALL_JNT);q(.54,.07,.1,0,KY+DH,KS/2,WALL_CAP);
 if(tier>=2)A.push(vcGeo(new THREE.TorusGeometry(.25,.05,8,16,Math.PI).translate(0,KY+DH,KS/2+.01),WALL_JNT));
 if(tier>=3){const em=new THREE.Mesh(new THREE.TorusGeometry(.13,.02,8,20),FLAG_T);em.position.set(0,KY+DH+.3,KS/2+.03);g.add(em);
  const dc=new THREE.Mesh(new THREE.CircleGeometry(.1,16),M(FLAGC));dc.position.set(0,KY+DH+.3,KS/2+.028);g.add(dc)}
 const lp=tier>=2?[[-.62,KS/2+.24],[.62,KS/2+.24],[-1.02,.92],[1.02,.92]]:[[-.62,KS/2+.24],[.62,KS/2+.24]];
 for(const[lx,lz]of lp){cyl(g,.014,.014,.5,0x2c3134,lx,PY,lz,5);
  const lb=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),LAMP);lb.position.set(lx,PY+.55,lz);g.add(lb);
  const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(.8,.8,1);hl.position.set(lx,PY+.55,lz);g.add(hl)}
 // پنجره‌های گرم: ردیف پایین/بالا روی هر چهار نمای بنگاه (ردیف‌ها با سطح بیشتر می‌شوند) — وسطِ نمای ورودی = در
 const rows=tier>=2?[.3,.58]:[.42];
 for(const f of rows){
  for(const x of[-.45,.45])win(.16,.2,.03,x,KY+KH*f,KS/2+.01);
  if(tier>=3&&f!==rows[0])win(.16,.2,.03,0,KY+KH*f,KS/2+.01);
  for(const x of[-.45,0,.45])win(.16,.2,.03,x,KY+KH*f,-KS/2-.01);
  for(const z of[-.45,0,.45]){win(.03,.2,.16,KS/2+.01,KY+KH*f,z);win(.03,.2,.16,-KS/2-.01,KY+KH*f,z)}}
 g.add(vcMesh(A,VCM,true,true));g.add(glowMesh(W));
}
// ── پل رودخانه (فاز ۲): عرشهٔ قوسی بتنی روشن به عرض دقیق جاده (۲ واحد) روی کل حریم رود + فرود دو ساحل؛
// آسفالت و خط‌چین مثل جادهٔ شهر، جانپناه بتنی + نرده + چراغ‌های واقعی شب، پایه‌های جفتی داخل آب، ستون‌های
// ورودی با پرچم شهر. ارتفاع عرشه از پروفیل مشترک BRIDGE_Y (07-buildings-footprint.js) — همان که خودرو/شهروند
// روی آن راه می‌رود (groundY). مدل در فضای محلی: راستای عبور = x (rot 90 گروه، کل را به z می‌چرخاند).
function bridgeMesh(g,b){clearKids(g);
 const L=FOOT.bridge[0]*U,A=[],W=[],q=(geo,c)=>A.push(vcGeo(geo,c)),
 ASP=0x4a4d52,N=11,ph=((b.id*9301+49297)%233280)/233280*6;
 for(let i=0;i<N;i++){const x0=i-L/2,x1=x0+1,y0=BRIDGE_Y(x0),y1=BRIDGE_Y(x1),ym=(y0+y1)/2,
  ang=Math.atan2(y1-y0,1),len=Math.hypot(1,y1-y0)+.02,xm=(x0+x1)/2,
  B=(w,h,dy,d,z,c)=>q(new THREE.BoxGeometry(w,h,d).rotateZ(ang).translate(xm,ym+dy,z),c);
  B(len,.1,-.085,2,0,WALL_ST);              // دال بتنی عرشه (زیرِ آسفالت)
  B(len,.035,-.0175,1.3,0,ASP);            // آسفالت هم‌عرض جاده (سطح = BRIDGE_Y — جای پای خودرو/شهروند)
  if(!(i%2))B(.34,.014,.012,.06,0,0xf1e7b8);   // خط‌چین وسط
  for(const s of[-1,1]){B(len,.05,-.01,.14,s*.86,WALL_ST2);   // جدول بتنی کنار آسفالت
   B(len,.13,.065,.07,s*.925,WALL_ST);                        // جانپناه
   B(len,.035,.147,.09,s*.925,WALL_CAP);                      // نردهٔ روی جانپناه
   B(len,.06,-.165,.08,s*.93,WALL_JNT)}                       // تیر لبهٔ زیر عرشه (هم‌سطح زیر دال)
 }
 for(let i=0;i<=N;i++){const x=i-L/2,y=BRIDGE_Y(x);          // پایه‌های نرده در درز قطعات + چراغ‌خور شب روی درزهای زوج
  for(const s of[-1,1]){q(new THREE.BoxGeometry(.055,.3,.055).translate(x,y+.15,s*.925),WALL_JNT);
   if(i%2===0)W.push(_wg(.03,.03,.03,x,y+.245,s*.925))}}
 // پایه‌های جفتی داخل آب (زیر عرشه، روی بستر رود) + تیر عرضی هم‌سطح زیر دال
 const hp=BRIDGE_Y(1.7)-.225;
 for(const sx of[-1,1]){for(const sz of[-1,1])q(new THREE.BoxGeometry(.32,hp,.32).translate(sx*1.7,hp/2,sz*.62),WALL_ST2);
  q(new THREE.BoxGeometry(.42,.09,1.5).translate(sx*1.7,hp,0),WALL_JNT)}
 // ستون‌های ورودی دو سر + پرچم شهر (قطری) — لنگرگاه بصری پل به ساحل
 for(const sx of[-1,1])for(const sz of[-1,1]){const px=sx*(L/2-.3),pz=sz*.9,y=BRIDGE_Y(sx*(L/2-.3));
  q(new THREE.BoxGeometry(.18,.44,.18).translate(px,y-.03,pz),WALL_ST2);q(new THREE.BoxGeometry(.22,.04,.22).translate(px,y+.43,pz),WALL_CAP)}
 mkFlag(g,BRIDGE_Y(-(L/2-.3))+.4,.42,ph,-(L/2-.3),-.9);mkFlag(g,BRIDGE_Y(L/2-.3)+.4,.42,ph+2.4,L/2-.3,.9);
 // چراغ‌های واقعی شب: پایه‌های یک‌طرفهٔ یک‌درمیان (الگوی چراغ جاده) — نقطهٔ نور در roads() به lampPts می‌رود
 for(const[x,z]of[[-3.4,.74],[-1.2,-.74],[1.2,.74],[3.4,-.74]]){const y=BRIDGE_Y(x);
  cyl(g,.022,.032,1.05,0x2f3338,x,y,z,6);
  const lb=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),LAMP);lb.position.set(x,y+1.1,z);g.add(lb);
  const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(.85,.85,1);hl.position.set(x,y+1.1,z);g.add(hl)}
 g.add(vcMesh(A,VCM,true,true));g.add(glowMesh(W));
}
// ═══ فاز ۳ — ساختمان‌های کاربردی (انبار/کارگاه/توربین بادی/مدرسه/درمانگاه/پارک/فروشگاه بزرگ) ═══
// همان قواعد مجموعهٔ دفاعی: الهام کارکردی، ظاهر از پالت خود بازی — بتنی روشنِ هم‌خانوادهٔ پیاده‌رو/کاخ،
// شیشهٔ HQGL دفتر مدیرعامل، پنجره‌های GLOW گرم شب، رنگ تأکیدی از پالت سایه‌بان (AWN) خانه‌ها/بازار.
// هیچ بافت/رنگ تازه‌ای معرفی نمی‌شود؛ ورودی همه رو به +z (چرخش خودکار رو به جاده؛ توربین متقارن است).
// متریال‌های اختصاصی: صلیب سبز درمانگاه (سبز شهر با درخشش ملایم شبانه‌روزی) + چراغ خطر هوانوردی توربین.
const CLXG=new THREE.MeshStandardMaterial({color:0x2f7a4a,roughness:.5,emissive:0x1d5a38,emissiveIntensity:.35}),
      REDL=new THREE.MeshStandardMaterial({color:0xd94f3a,roughness:.5,emissive:0xa02818,emissiveIntensity:.6});
const _q3=(A,w,h,d,x,y,z,c)=>A.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z),c)),
      _win3=(W,w,h,d,x,y,z)=>W.push(_wg(w,h,d,x,y,z)),
      _cyl3=(A,rt,rb,h,x,y,z,c,sg=8)=>A.push(vcGeo(new THREE.CylinderGeometry(rt,rb,h,sg).translate(x,y+h/2,z),c));
// ── انبار: یارد بتنی + بدنهٔ اصلی با ۳ در کرکره‌ای، بندکشی/پیلستر، باند اداری شیشه‌ای، واحد تهویهٔ بام،
// جعبه‌های بار و گلوله‌های مهار — کارکرد لجستیک بدون هیچ ظاهر «کارخانهٔ قدیمی».
function wareMesh(g,b){const A=[],W=[];
 _q3(A,3.0,.05,2.5,0,0,0,WALL_BASE);                                   // یارد بتنی
 _q3(A,3.0,.022,.62,0,0,.62,ASP);                                      // نوار آسفالت بارگیری جلو
 _q3(A,2.7,1.15,1.7,0,0,-.3,WALL_ST);                                  // بدنهٔ اصلی
 _q3(A,2.78,.09,1.78,0,1.15,-.3,WALL_CAP);                             // جان‌پناه بام
 for(const x of[-1.35,-.45,.45,1.35])_q3(A,.12,1.15,.1,x,0,.55,WALL_ST2);   // پیلسترهای ریتمیک نمای جلو
 for(const cx of[-.9,0,.9]){_q3(A,.74,.8,.05,cx,0,.555,0x3a4046);      // درهای کرکره‌ای تیره
  for(const yy of[.2,.4,.6])_q3(A,.74,.018,.02,cx,yy,.585,WALL_JNT);   // مقاطع افقی در
  _q3(A,.8,.06,.09,cx,.8,.56,WALL_CAP)}                                // سرستوان در
 _q3(A,.9,.14,.4,0,0,.72,WALL_JNT);_q3(A,.94,.03,.44,0,.14,.72,WALL_CAP);   // رمپ تخلیه درِ وسط
 _q3(A,.82,.4,.05,-.95,.58,.56,0x2c323a);                              // قاب باند اداری (چپ)
 _win3(W,.7,.3,.04,-.95,.62,.575);                                     // شیشهٔ اداری — شب گرم می‌سوزد
 _q3(A,2.7,.07,.03,0,.98,.56,AWN[b.id%4]);                             // باند تأکیدی بالای درها                                     // شیشهٔ اداری — شب گرم می‌سوزد
 _q3(A,.5,.22,.4,-.6,1.24,-.5,WALL_JNT);_q3(A,.34,.16,.3,.5,1.24,-.35,WALL_JNT);   // واحدهای تهویهٔ بام
 _cyl3(A,.06,.06,.28,-1.0,1.24,-.85,WALL_ST2,6);                       // دودکش تهویه
 _q3(A,.34,.3,.34,1.05,0,.95,0x8a5a35);_q3(A,.3,.26,.3,1.08,.3,.92,0x6b4a2b);   // جعبه‌های بار چوبی
 _q3(A,.26,.22,.26,.72,0,.98,0x5a3a22);
 for(const cx of[-1.0,0,1.0])_cyl3(A,.045,.05,.34,cx,.05,1.15,0x2c323a,6);   // گلوله‌های مهار لبهٔ یارد
 _win3(W,.03,.22,.4,1.36,.5,-.25);_win3(W,.03,.22,.4,-1.36,.5,-.25);   // پنجره‌های جانبی بدنه
 g.add(vcMesh(A,VCM,true));g.add(glowMesh(W));
}
// ── کارگاه: سولهٔ مدرن با نوار شیشه‌ای ارتفاعی (کلارستوری)، در کرکره + در آدم، دو ردیف پنل خورشیدی روی بام،
// دپوی پالت/جعبه و بشکهٔ سایه‌بان‌رنگ — صناعت کوچکِ تمیزِ هم‌خانوادهٔ شهر.
function workMesh(g,b){const A=[],W=[];
 _q3(A,2.5,.05,2.0,0,0,0,WALL_BASE);                                   // سکو
 _q3(A,2.5,.022,.5,0,0,.75,ASP);                                       // نوار آسفالت جلو
 _q3(A,2.2,.9,1.5,0,0,-.2,WALL_ST);                                    // بدنهٔ سوله
 _q3(A,2.26,.07,1.56,0,.9,-.2,WALL_CAP);                               // جان‌پناه
 _q3(A,1.9,.24,.05,0,.62,-.93,0x2c323a);                               // قاب نورگیر ارتفاعی (پشت)
 _win3(W,1.8,.2,.02,0,.64,-.965);                                      // شب: نوار گرم پشت سوله
 _q3(A,.62,.72,.05,-.55,0,.555,0x3a4046);                              // در کرکره‌ای
 for(const yy of[.18,.36,.54])_q3(A,.62,.018,.02,-.55,yy,.585,WALL_JNT);
 _q3(A,.68,.06,.09,-.55,.72,.56,WALL_CAP);                             // سرستوان در
 _q3(A,.3,.75,.05,.45,0,.555,0x3a4046);                                // در آدم
 _q3(A,.38,.83,.06,.45,0,.548,WALL_ST2);                               // قاب در آدم
 A.push(vcGeo(new THREE.SphereGeometry(.025,6,5).translate(.56,.4,.585),FLAGG));   // دستگیرهٔ طلایی
 _win3(W,2.0,.14,.03,0,.63,.575);                                      // نورگیر نما جلو
 A.push(vcGeo(new THREE.BoxGeometry(.92,.025,.44).rotateX(.32).translate(0,1.05,-.42),0x2c323a));   // پنل خورشیدی ۱
 A.push(vcGeo(new THREE.BoxGeometry(.92,.025,.44).rotateX(.32).translate(0,1.05,.32),0x2c323a));    // پنل خورشیدی ۲
 _cyl3(A,.05,.05,.2,-.95,.97,-.2,WALL_JNT,6);_cyl3(A,.05,.05,.16,.95,.97,-.55,WALL_JNT,6);   // ونت‌های بام
 _q3(A,.5,.06,.42,.9,0,.78,0x6b4a2b);_q3(A,.34,.3,.34,.9,.06,.76,0x8a5a35);   // پالت + جعبه
 _cyl3(A,.13,.13,.36,-1.0,.05,.78,AWN[2],10);                          // بشکهٔ تأکیدی (فیروزه‌ای سایه‌بان)
 _win3(W,.03,.2,.4,1.11,.5,-.2);_win3(W,.03,.2,.4,-1.11,.5,-.2);       // پنجره‌های جانبی
 g.add(vcMesh(A,VCM,true));g.add(glowMesh(W));
}
// ── توربین بادی: دک بتنی + بدنهٔ سفیدِ نیشه‌ای، گوندو تیره، پروانهٔ سه‌پرهٔ «زنده» (هرگز چانک نمی‌شود —
// چرخشش در building-animation با userData.rotors) + چراغ خطر هوانوردی + کابین برق کنار دک.
function millMesh(g,b){const A=[];
 _q3(A,1.3,.04,1.3,0,0,0,WALL_JNT);_q3(A,1.2,.08,1.2,0,0,0,WALL_CAP);  // دک دوبل
 _cyl3(A,.14,.17,.08,0,.08,0,WALL_ST2,10);                             // فلنج مهار
 _cyl3(A,.055,.1,2.5,0,.1,0,0xf1ece0,10);                              // برج نیشه‌ای تا ۲٫۶
 _q3(A,.36,.16,.16,0,2.58,.02,0x2c323a);                               // گوندو
 const rot=new THREE.Group();rot.position.set(0,2.66,.14);g.add(rot);  // پروانهٔ زنده (چرخش حول z)
 const hub=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),M(0xf1ece0));rot.add(hub);
 for(let i=0;i<3;i++){const p=new THREE.Group();p.rotation.z=i*2.094;rot.add(p);
  const bl=new THREE.Mesh(new THREE.BoxGeometry(.07,.85,.025),M(0xf1ece0));bl.position.y=.46;bl.rotation.y=.12;p.add(bl)}
 (g.userData.rotors=g.userData.rotors||[]).push(rot);
 const rd=new THREE.Mesh(new THREE.SphereGeometry(.028,6,5),REDL);rd.position.set(0,2.77,.02);g.add(rd);   // چراغ هوانوردی
 _q3(A,.34,.4,.24,.62,0,-.55,WALL_ST2);                                // کابین برق
 _q3(A,.26,.3,.02,.62,.06,-.42,0x2c323a);                              // در کابین
 _q3(A,.4,.04,.1,.3,0,0,WALL_JNT);                                     // کانال کابل
 g.add(vcMesh(A,VCM,true));
}
// ── مدرسه: بدنهٔ دوطبقهٔ متقارن با باند تأکیدی هم‌رنگ سایه‌بان خانه‌ها، سرای ورودی با سایه‌بان و نشان
// طلایی-سبز شهر، ردیف پنجره‌های GLOW دو طبقه، گل‌دان‌های سبز ورودی — هم‌خانوادهٔ HQ.
function schoolMesh(g,b){const A=[],W=[],AC=AWN[b.id%4];
 _q3(A,3.5,.05,2.5,0,0,0,WALL_BASE);                                   // حیاط بتنی
 _q3(A,1.4,.03,.75,0,0,.8,WALL_CAP);                                   // مسیر ورودی روشن
 _q3(A,3.2,1.25,1.5,0,0,-.4,WALL_ST);                                  // بدنهٔ اصلی دو طبقه
 _q3(A,3.26,.09,1.56,0,.66,-.4,AC);                                    // باند تأکیدی بین طبقات
 _q3(A,3.28,.08,1.58,0,1.25,-.4,WALL_CAP);                             // جان‌پناه
 for(const sx of[-1,1])for(const sz of[-1,1])_q3(A,.14,1.25,.14,sx*1.53,0,-.4+sz*.68,WALL_ST2);   // پیلسترهای گوشه
 _q3(A,1.0,1.42,.9,0,0,.62,WALL_ST2);                                  // سرای ورودی
 _q3(A,1.06,.07,.96,0,1.42,.62,WALL_CAP);
 _q3(A,1.3,.05,.4,0,1.02,.98,WALL_CAP);                                // سایه‌بان
 _cyl3(A,.028,.028,1.03,-.52,.05,1.12,0x2c323a,6);_cyl3(A,.028,.028,1.03,.52,.05,1.12,0x2c323a,6);   // پایه‌های سایه‌بان
 _q3(A,.5,.85,.04,0,0,1.075,0x2c323a);_q3(A,.03,.85,.02,0,0,1.1,WALL_JNT);   // در دوبل + لچکی
 ball(g,.05,FLAGG,.14,.45,1.11,0);ball(g,.05,FLAGG,-.14,.45,1.11,0);   // دستگیره‌های طلایی
 const em=new THREE.Mesh(new THREE.CircleGeometry(.09,16),M(FLAGC));em.position.set(0,1.24,1.085);g.add(em);
 const emr=new THREE.Mesh(new THREE.TorusGeometry(.1,.018,8,18),FLAG_T);emr.position.set(0,1.24,1.088);g.add(emr);   // نشان شهر
 _q3(A,1.2,.06,.18,0,0,1.16,WALL_JNT);                                 // پلهٔ ورودی
 _q3(A,.5,.3,.35,-1.3,0,.95,0x2f7a4a);_q3(A,.5,.3,.35,1.3,0,.95,0x2f7a4a);   // گل‌دان‌های ورودی
 ball(g,.12,0x4f8f4a,-1.3,.4,.95,0);ball(g,.1,0x5f9f55,-1.22,.38,1.02,0);
 ball(g,.12,0x4f8f4a,1.3,.4,.95,0);ball(g,.1,0x3f7a4a,1.38,.38,1.02,0);
 for(const x of[-1.18,-.62,.62,1.18]){_win3(W,.4,.3,.03,x,.28,.352);_win3(W,.4,.3,.03,x,.84,.352)}   // نمای جلو دو طبقه
 for(const x of[-1.2,-.4,.4,1.2])for(const yy of[.28,.84])_win3(W,.44,.3,.03,x,yy,-1.162);            // پشت
 for(const sx of[-1,1])for(const z of[-.15,-.65]){_win3(W,.03,.3,.44,sx*1.61,.28,z);_win3(W,.03,.3,.44,sx*1.61,.84,z)}   // جانبی
 _win3(W,.18,.3,.03,-.36,.3,1.072);_win3(W,.18,.3,.03,.36,.3,1.072);   // پنجره‌های سرای ورودی
 _q3(A,.5,.2,.4,-1.0,1.33,-.6,WALL_JNT);                               // واحد تهویهٔ بام
 g.add(vcMesh(A,VCM,true));g.add(glowMesh(W));
}
// ── درمانگاه: بدنهٔ سفیدِ روشن‌ترینِ پالت (کلاهک)، پیش‌فضای شیشه‌ای HQGL با سایه‌بان، صلیب سبز شبانه‌روزِ
// سبزِ شهر با درخشش ملایم، نوار تأکیدی قرمز سایه‌بان، نیمکت و گل‌دان — خدمات شبانه‌روزی.
function clinicMesh(g,b){const A=[],W=[];
 _q3(A,2.5,.05,2.0,0,0,0,WALL_BASE);
 _q3(A,1.2,.03,.6,0,0,.82,WALL_CAP);
 _q3(A,2.3,.95,1.4,0,0,-.25,WALL_CAP);                                 // بدنهٔ سفید
 for(const x of[-1.15,0,1.15])_q3(A,.12,.95,.12,x,0,.42,WALL_ST2);     // پیلسترهای نما
 _q3(A,.12,.95,.12,-1.12,0,-.25,WALL_ST2);_q3(A,.12,.95,.12,1.12,0,-.25,WALL_ST2);
 _q3(A,2.36,.07,1.46,0,.95,-.25,WALL_ST2);                             // جان‌پناه
 _q3(A,2.3,.05,.04,0,.82,.455,AWN[0]);                                 // نوار قرمز زیر بام
 _q3(A,.84,.06,.34,0,0,.62,WALL_JNT);                                  // سکوی پیش‌فضا
 const vg=new THREE.Mesh(new THREE.BoxGeometry(.8,.78,.28),HQGL);vg.position.set(0,.48,.62);vg.castShadow=true;g.add(vg);   // پیش‌فضای شیشه‌ای
 _q3(A,.04,.78,.02,-.12,.1,.775,0x2c323a);_q3(A,.04,.78,.02,.12,.1,.775,0x2c323a);   // مولیون‌های در
 _q3(A,1.0,.05,.4,0,.92,.62,WALL_ST2);                                 // سایه‌بان
 _cyl3(A,.026,.026,.87,-.42,.05,.78,0x2c323a,6);_cyl3(A,.026,.026,.87,.42,.05,.78,0x2c323a,6);
 _q3(A,.42,.36,.07,0,1.0,.45,WALL_ST);                                 // تختهٔ صلیب
 _q3(A,.08,.26,.05,0,1.05,.49,CLXG);_q3(A,.26,.08,.05,0,1.14,.49,CLXG);   // صلیب سبز درخشان
 for(const sx of[-1,1]){_win3(W,.44,.26,.03,sx*.78,.28,.455);_win3(W,.44,.22,.03,sx*.78,.62,.455)}   // نمای جلو
 for(const x of[-.7,0,.7]){_win3(W,.5,.26,.03,x,.28,-.955);_win3(W,.5,.22,.03,x,.62,-.955)}          // پشت
 for(const sx of[-1,1]){_win3(W,.03,.26,.5,sx*1.152,.28,-.25);_win3(W,.03,.22,.5,sx*1.152,.62,-.25)} // جانبی
 _q3(A,.06,.25,.24,-1.14,.05,.72,0x2c323a);_q3(A,.06,.25,.24,-.66,.05,.72,0x2c323a);   // پایه‌های نیمکت
 _q3(A,.6,.05,.24,-.9,.3,.72,0x8a5a35);_q3(A,.6,.2,.04,-.9,.35,.84,0x8a5a35);           // نیمکت
 _q3(A,.44,.28,.32,.9,.05,.72,0x2f7a4a);ball(g,.11,0x4f8f4a,.9,.4,.72,0);ball(g,.09,0x5f9f55,.98,.38,.64,0);   // گل‌دان
 _cyl3(A,.045,.05,.3,-.55,.05,1.1,0x2c323a,6);_cyl3(A,.045,.05,.3,.55,.05,1.1,0x2c323a,6);              // گلوله‌ها
 g.add(vcMesh(A,VCM,true));g.add(glowMesh(W));
}
// ── پارک شهری: جدول بتنی + سنگ‌فرش روشن با مسیرهای صلبتی، فوارهٔ هشت‌ضلعی مرکزی با آبِ شیشه‌ای HQGL و
// گوی طلایی، چهار درخت + چهار باغچهٔ گل، نیمکت‌ها و دو چراغ — «کف پارک قابل عبور است» (ناوبری بخش ۸).
function parkMesh(g,b){const A=[];
 for(const z of[-1.44,1.44])_q3(A,3.0,.1,.12,0,0,z,WALL_JNT);          // جدول شمال/جنوب
 for(const sx of[-1,1])_q3(A,.12,.1,2.76,sx*1.44,0,0,WALL_JNT);        // جدول شرق/غرب
 _q3(A,2.76,.05,2.76,0,0,0,0xcfc9ba);                                  // سنگ‌فرش داخلی
 _q3(A,2.76,.012,.5,0,.05,0,WALL_CAP);_q3(A,.5,.012,2.76,0,.05,0,WALL_CAP);   // مسیرهای صلبتی
 for(const z of[-1.32,1.32])_q3(A,2.7,.012,.03,0,.06,z,WALL_JNT);
 for(const sx of[-1,1])_q3(A,.03,.012,2.7,sx*1.32,.06,0,WALL_JNT);
 A.push(vcGeo(new THREE.CylinderGeometry(.5,.56,.24,8).translate(0,.05+.12,0),WALL_ST));   // حوض فواره
 const wt=new THREE.Mesh(new THREE.CylinderGeometry(.44,.44,.05,8),HQGL);wt.position.set(0,.24,0);g.add(wt);   // آب شیشه‌ای
 _cyl3(A,.06,.08,.4,0,.29,0,WALL_JNT,8);ball(g,.1,FLAGG,0,.72,0,0);    // ستون + گوی طلایی
 for(const sx of[-1,1])for(const sz of[-1,1]){const tx=sx*1.05,tz=sz*1.05;   // چهار درخت گوشه
  _cyl3(A,.05,.08,.55,tx,.05,tz,0x6e4c32,6);
  ball(g,.26,[0x4f8f4a,0x5f9f55,0x3f7a4a][(sx+sz+4)%3],tx,.82,tz,0);
  ball(g,.18,0x5f9f55,tx+.14,.95,tz+.1,0);ball(g,.15,0x3f7a4a,tx-.13,.92,tz-.08,0)}
 for(const[bx,bz]of[[-.55,-1.25],[.55,-1.25],[-.55,1.25],[.55,1.25]]){  // باغچه‌های گل
  _q3(A,.5,.14,.26,bx,.05,bz,WALL_JNT);
  [[-.15,0xe8a3b8],[0,0xf3e9a6],[.15,0xd94f3a],[-.07,0xe8a3b8],[.07,0xf3e9a6]].forEach(([fx,fc],i)=>ball(g,.045,fc,bx+fx,.24,bz+(i%2?.06:-.06),0))}
 for(const[px,pz]of[[-.95,0],[.95,0],[0,-.95],[0,.95]]){               // نیمکت‌ها رو به فواره (پشتی سمت بیرون)
  const ax=px!==0,sx=ax?Math.sign(px):0,sz=ax?0:Math.sign(pz);
  _q3(A,ax?.16:.44,.05,ax?.44:.16,px,.3,pz,0x8a5a35);                  // نشیمن
  _q3(A,ax?.05:.44,.2,ax?.44:.05,px+sx*.07,.35,pz+sz*.07,0x8a5a35);    // پشتی
  for(const o of[-.09,.09])_q3(A,.05,.25,.05,px+(ax?sx*.05:o),.05,pz+(ax?o:sz*.05),0x2c323a)}   // دو پایه
 for(const[lx,lz]of[[1.0,-1.0],[-1.0,1.0]]){_cyl3(A,.018,.028,.85,lx,.05,lz,0x2c3134,6);   // دو چراغ پارک
  const lb=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),LAMP);lb.position.set(lx,.95,lz);g.add(lb)}
 g.add(vcMesh(A,VCM,true));
}
// ── فروشگاه بزرگ: حجم بزرگ بتنی با نمای تمام‌شیشهٔ HQGL و مولیون‌های تیره، باند سایه‌بان رنگی، نورگیر
// شب جلو، تابلوی پایلون دوطرف، پارکینگ خط‌کشی‌شده و واحدهای بام — تجارت بزرگِ هم‌مقیاس شهر.
function storeMesh(g,b){const A=[],W=[],AC=AWN[b.id%4];
 _q3(A,3.5,.05,3.0,0,0,0,WALL_BASE);                                   // پیش‌فضای بتنی
 _q3(A,3.5,.024,.85,0,0,1.05,ASP);                                     // پارکینگ آسفالت
 for(const x of[-1.3,-.45,.45,1.3])_q3(A,.035,.01,.62,x,.074,1.08,0xf1e7b8);   // خط‌های پارک
 _q3(A,3.5,.028,.28,0,0,.62,WALL_CAP);                                 // پیاده‌راه جلوی فروشگاه
 _q3(A,3.2,1.5,2.0,0,0,-.4,WALL_ST);                                   // حجم اصلی
 _q3(A,3.26,.08,2.06,0,1.5,-.4,WALL_ST2);                              // جان‌پناه
 const gl=new THREE.Mesh(new THREE.BoxGeometry(2.7,.85,.06),HQGL);gl.position.set(0,.545,.585);gl.castShadow=true;g.add(gl);   // نمای تمام‌شیشه
 for(const x of[-1.0,-.5,.5,1.0])_q3(A,.05,.85,.03,x,.12,.62,0x2c323a);   // مولیون‌ها
 _q3(A,2.7,.07,.04,0,.97,.615,0x2c323a);_q3(A,2.7,.1,.05,0,.02,.615,WALL_JNT);   // سرستوان + زیرساز
 _q3(A,2.9,.12,.22,0,1.02,.66,AC);                                     // باند سایه‌بان رنگی
 _q3(A,.8,.78,.03,0,.12,.625,0x2c323a);_q3(A,.03,.78,.02,0,.12,.65,FLAGG);   // در دوبل + لچکی طلایی
 _win3(W,2.6,.18,.03,0,1.22,.615);                                     // نورگیر شب بالای نما
 _q3(A,.4,.1,.3,1.35,0,1.15,WALL_JNT);_q3(A,.16,1.5,.14,1.35,.1,1.15,0x2c323a);   // پایهٔ پایلون
 _q3(A,.7,.42,.08,1.35,1.3,1.15,WALL_CAP);_q3(A,.7,.12,.09,1.35,1.72,1.15,0x2f7a4a);   // تابلو + باند سبز شهر
 _q3(A,.74,.04,.12,1.35,1.84,1.15,FLAGG);                              // کلاهک طلایی
 const sk=new THREE.Mesh(new THREE.BoxGeometry(1.6,.04,.5),HQGL);sk.position.set(-.5,1.56,-.4);g.add(sk);   // نورگیر بام
 _q3(A,.5,.22,.4,.9,1.58,-.8,WALL_JNT);_q3(A,.4,.18,.34,1.1,1.58,.1,WALL_JNT);   // واحدهای بام
 for(const x of[-.5,.5])_cyl3(A,.04,.05,.3,x,.05,.8,0x2c323a,6);       // گلوله‌های جلوی در
 g.add(vcMesh(A,VCM,true));g.add(glowMesh(W));
}
// ساخت مدل سازه روی گروه (بدون ثبت در صحنه) — مشترک میان addB و demote چانک (فاز ۲)
function fillB(g,b){build[b.type]?.(g,b);
 // نشستن روی زمینِ واقعی (fpBaseY در 07-buildings-footprint.js): کنار رود سازه روی جالیِ بلندشدهٔ ساحل می‌نشیند،
 // نه دفن زیرِ آن (باگ «محو شدن کنار آب»)؛ در مرکزِ شهرِ هموار خروجی ۰ است ⇒ هیچ چیزِ موجود جابه‌جا نمی‌شود.
 g.position.set(b.x*U,fpBaseY(b.type,b.x,b.z,b.rot),b.z*U);g.rotation.y=(b.type==='road'||b.type==='path')?0:b.rot*Math.PI/180}
function addB(b,delay=0){const g=new THREE.Group();fillB(g,b);
 g.scale.setScalar(delay>0?0:.01);Object.assign(g.userData,{b,t:delay>0?-delay:0});scene.add(g);objs.set(b.id,g)}
