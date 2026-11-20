// ═══ بدن شهروندان: قطعه‌ها (Parts)، رندر انبوه (Instancing)، تنظیم خودکار کیفیت (tune)، ساخت شهروند (mkCit) و ظاهر بنیان‌گذار. ═══
'use strict';
// شهروندان (اولی = بنیان‌گذار)
const cits=[],skin=[0xf1c9a0,0xd9a577,0xb67d54,0x8d5a3b],cloth=[0xe0643a,0x3f8fb5,0xf0b73a,0xb0507f,0x5fae5a,0x7f6fd0,0xe8e0cf,0xd94f6a],hairC=[0x2b1d14,0x4a3020,0x1c1c1c,0x8a6a3a,0x6b3a1f],pants=[0x3b4a6b,0x4a3f35,0x6b6a5a,0x2f3a4a,0x5a4a3a,0x7a6a52],shoes=[0x2b2b2b,0x5a3a26,0xe8e8e8,0x8a3a2a],rr=a=>a[Math.random()*a.length|0];
const CMAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72});
const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_v=new THREE.Vector3(),_s=new THREE.Vector3(),_c=new THREE.Color();
function Parts(){const a=[];return{p(geo,col,x=0,y=0,z=0,rx=0,rz=0,sx=1,sy=1,sz=1){_e.set(rx,0,rz);_q.setFromEuler(_e);_m4.compose(_v.set(x,y,z),_q,_s.set(sx,sy,sz));const gm=geo.index?geo:geo;gm.applyMatrix4(_m4);_c.setHex(col);const n=gm.attributes.position.count,ca=new Float32Array(n*3);for(let i=0;i<n;i++){ca[i*3]=_c.r;ca[i*3+1]=_c.g;ca[i*3+2]=_c.b}gm.setAttribute('color',new THREE.BufferAttribute(ca,3));a.push(gm)},
geo(){return mergeGeometries(a,false)},
mesh(){const m=new THREE.Mesh(mergeGeometries(a,false),CMAT);m.castShadow=true;m.receiveShadow=true;return m}}}
const SG=(r,w=8,h=6,...x)=>new THREE.SphereGeometry(r,w,h,...x),BG=(w,h,d)=>new THREE.BoxGeometry(w,h,d);

// ═══ رندر انبوه (Instancing): هزاران شهروند با چند ده درخواست رسم ثابت ═══
let INST=null;
const HBG=new THREE.SphereGeometry(.5,6,5),HBM=new THREE.MeshBasicMaterial({visible:false}),_lin=new Map(),lin=h=>{let r=_lin.get(h);if(!r){_c.setHex(h);r=[_c.r,_c.g,_c.b];_lin.set(h,r)}return r};
function initInst(){
const CAP=(MOB?320:640)+4,MAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72}),P={},W1=0xffffff;
const pool=(name,geo,pal,mul=1,mat=MAT)=>{const m=new THREE.InstancedMesh(geo,mat,CAP*mul);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);if(pal){m.setColorAt(0,_c.setHex(W1));m.instanceColor.setUsage(THREE.DynamicDrawUsage)}m.count=0;m.frustumCulled=false;m.castShadow=m.receiveShadow=true;scene.add(m);return P[name]={m,n:0,pal}};
const bo=Parts();bo.p(new THREE.CapsuleGeometry(.125,.25,4,10),W1);pool('body',bo.geo(),1);
const hs=Parts();hs.p(SG(.14,16,12),W1,0,.82,0);hs.p(SG(.018),W1,0,.805,.14);[-.14,.14].forEach(x=>hs.p(SG(.03),W1,x,.82,0,0,0,1,1,.7));pool('hskin',hs.geo(),1);
const hf=Parts();[-.05,.05].forEach(x=>{hf.p(SG(.03,10,6),0xffffff,x,.835,.128,0,0,1,1,.6);hf.p(SG(.017,8,6),0x1a1410,x,.833,.142,0,0,1,1,.6);hf.p(SG(.024,8,6),0xf29a8f,x*1.7,.79,.105,0,0,1,1,.5)});hf.p(new THREE.TorusGeometry(.03,.006,6,12,Math.PI),0x7a2f2f,0,.795,.131,0,Math.PI);pool('hfix',hf.geo(),0);
const brows=h=>[-.05,.05].forEach(x=>h.p(BG(.05,.011,.012),W1,x,.878,.128,0,x>0?-.12:.12)),cap=h=>h.p(SG(.15,16,10,0,6.3,0,1.4),W1,0,.835,0,-.28),beard=h=>h.p(SG(.146,14,8,0,Math.PI,2.0,.85),W1,0,.82,0);
const HV=[h=>cap(h),h=>{cap(h);h.p(SG(.06),W1,0,.85,-.15);h.p(new THREE.CapsuleGeometry(.03,.12,3,6),W1,0,.74,-.19,.3)},h=>{cap(h);h.p(SG(.06,10,6),W1,0,.985,-.07)},h=>{cap(h);h.p(new THREE.CapsuleGeometry(.1,.16,3,8),W1,0,.74,-.08,0,0,1,1,.6)},h=>{},h=>{cap(h);beard(h)},h=>beard(h)];
HV.forEach((fn,k)=>{const h=Parts();brows(h);fn(h);pool('hair'+k,h.geo(),1)});
const ht=Parts();ht.p(SG(.155,16,10,0,6.3,0,1.3),W1,0,.845,0,-.12);ht.p(BG(.17,.02,.1),W1,0,.875,.15,.15);pool('hat',ht.geo(),1);
const lg=Parts();lg.p(BG(.085,.28,.085),W1,0,-.14,0);pool('leg',lg.geo(),1,2);
const sg=Parts();sg.p(BG(.095,.06,.15),W1,0,-.255,.025);pool('shoe',sg.geo(),1,2);
const ag=Parts();ag.p(BG(.065,.26,.065),W1,0,-.13,0);pool('arm',ag.geo(),1,2);
const hg=Parts();hg.p(SG(.036),W1,0,-.26,0);pool('hand',hg.geo(),1,2);
pool('lan',new THREE.SphereGeometry(.05,8,6),0,1,LANT);P.lan.m.castShadow=false;
const HN=MOB?24:48,HALO=[];for(let i=0;i<HN;i++){const s=NORAY(new THREE.Sprite(LNHALO));s.scale.set(.48,.48,1);s.visible=false;scene.add(s);HALO.push(s)}
return{P,HALO,CAP,fr:new THREE.Frustum(),pm:new THREE.Matrix4(),sph:new THREE.Sphere(new THREE.Vector3(),5),L:new THREE.Matrix4(),A:new THREE.Matrix4(),X:new THREE.Matrix4(),lx:new Float32Array(CAP*3),ld:new Float32Array(CAP),tmp:new Float32Array(CAP)}}
function fillInst(dt){
const I=INST,P=I.P,L=I.L,A=I.A,X=I.X,cp=cam.position;cam.updateMatrixWorld();I.pm.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);I.fr.setFromProjectionMatrix(I.pm);
for(const k in P)P[k].n=0;
let G=null,nl=0;
const put=(p,m,c)=>{const i=p.n++;m.toArray(p.m.instanceMatrix.array,i*16);if(c){const q=p.m.instanceColor.array;q[i*3]=c[0];q[i*3+1]=c[1];q[i*3+2]=c[2]}};
const lm=(o,px,py)=>{const a=o.rotation.x,cs=Math.cos(a),sn=Math.sin(a);L.set(1,0,0,px,0,cs,-sn,py,0,sn,cs,0,0,0,0,1);return X.multiplyMatrices(G,L)};
for(const c of cits){
if(!c.lite||c.hid||!c.g.visible)continue;
const g=c.g;
if(c.pop<1){c.pop=Math.min(1,c.pop+dt*2.2);const u=c.pop-1;g.scale.setScalar(.8*Math.max(.01,1+2.70158*u*u*u+1.70158*u*u))}
g.updateMatrix();G=g.matrix;const ge=G.elements;
I.sph.center.set(ge[12],ge[13]+.5,ge[14]);if(!I.fr.intersectsSphere(I.sph))continue;
const pl=c.pal;
L.set(1,0,0,0,0,c.body.scale.y,0,.46,0,0,1,0,0,0,0,1);X.multiplyMatrices(G,L);put(P.body,X,pl.cl);
put(P.hskin,G,pl.sk);put(P.hfix,G);put(P['hair'+pl.hv],G,pl.hc);if(pl.hs===4)put(P.hat,G,pl.hat);
lm(c.lL,-.06,.3);put(P.leg,X,pl.pn);put(P.shoe,X,pl.sh);
lm(c.lR,.06,.3);put(P.leg,X,pl.pn);put(P.shoe,X,pl.sh);
lm(c.aL,-.17,.62);put(P.arm,X,pl.cl);put(P.hand,X,pl.sk);
lm(c.aR,.17,.62);put(P.arm,X,pl.cl);put(P.hand,X,pl.sk);
if(c.lan&&c.lan.visible&&nl<I.CAP){A.makeTranslation(0,-.33,.05);L.multiplyMatrices(X,A);put(P.lan,L);const e=L.elements,dx=e[12]-cp.x,dy=e[13]-cp.y,dz=e[14]-cp.z;I.lx[nl*3]=e[12];I.lx[nl*3+1]=e[13];I.lx[nl*3+2]=e[14];I.ld[nl]=dx*dx+dy*dy+dz*dz;nl++}}
for(const k in P){const p=P[k],m=p.m;m.count=p.n;m.instanceMatrix.needsUpdate=true;if(p.pal)m.instanceColor.needsUpdate=true}
const H=I.HALO,K=Math.min(H.length,Q.halo());let thr=1e18,u=0;if(nl>K){I.tmp.set(I.ld.subarray(0,nl));thr=I.tmp.subarray(0,nl).sort()[K-1]}
for(let j=0;j<nl&&u<K;j++)if(I.ld[j]<=thr){const s=H[u++];s.position.set(I.lx[j*3],I.lx[j*3+1],I.lx[j*3+2]);s.visible=true}
for(;u<H.length;u++)H[u].visible=false}
function killInst(){const I=INST;if(!I)return;INST=null;for(const k in I.P){scene.remove(I.P[k].m);I.P[k].m.dispose();I.P[k].m.geometry.dispose()}I.HALO.forEach(s=>scene.remove(s));HARD=140;VIS=Math.min(VIS,MOB?40:70);while(cits.length){const c=cits.pop();scene.remove(c.g);disposeObj(c.g);if(c._el)c._el.remove()}fitCits()}
function mkCitLite(i){
const g=new THREE.Group();g.rotation.order='YXZ';
const hs=Math.random()*5|0,bd=(hs===0||hs===4)&&Math.random()<.4,lb=()=>({rotation:{x:0}});
const pal={cl:lin(rr(cloth)),sk:lin(rr(skin)),hc:lin(rr(hairC)),pn:lin(rr(pants)),sh:lin(rr(shoes)),hat:lin(rr(cloth)),hs,hv:hs===0?(bd?5:0):hs===4?(bd?6:4):hs};
const c={g,lite:1,pal,pop:0,body:{scale:{y:1}},lL:lb(),lR:lb(),aL:lb(),aR:lb(),path:[],ph:Math.random()*6,wait:Math.random()*2,sp:(.8+Math.random()*.5)*.85,act:'',st:'stay',tm:Math.random()*2.5,hid:0,by:0,chain:0,lk:0,ct:0,talk:0,fa:null,pt:null,ty:null,tr:{f:Math.random(),s:Math.random(),so:Math.random()}};
g.scale.setScalar(.008);if(Math.random()<.35)c.lan={visible:false};
const hb=new THREE.Mesh(HBG,HBM);hb.position.y=.5;g.add(hb);c.i=i;g.userData.cit=c;
lazyEl(c,0);
const p=freeNear(ctr[0],ctr[1],Math.min(RAD*.85,5+i*.5));g.position.set(p[0],0,p[1]);scene.add(g);return c}
try{if(!/classic/.test(location.search)){INST=initInst();HARD=MOB?320:640;VIS=MOB?90:180}}catch(e){console.error('instancing off',e);INST=null}
// تنظیم تعداد شهروندان نمایش‌داده‌شده (VIS). کاهش کیفیت کلی را Q (05-core-perf.js) انجام می‌دهد؛ اینجا فقط «رشد تدریجی» و «سقف پله‌ها» اعمال می‌شود
function tune(){if(RC.on||rec){fpsUp=0;return} // هنگام ضبط، کاهش خودکار شهروندان خاموش است تا کسی از بازی ناپدید نشود
const mx=Math.max(1,Math.min(POP,HARD,Q.citCap())),MIN=MOB?24:36;vcT+=1.5;if(vcT>=8){vcT=0;if(VCAP<1e9)VCAP=Math.ceil(VCAP*1.12)+3}
if(VIS>mx){VIS=mx;VCAP=Math.min(VCAP,VIS+4);fitCits();fpsUp=0}
else if(fpsA<27&&Q.lv()>=9&&VIS>MIN){VIS=Math.max(MIN,Math.floor(VIS*.85));VCAP=VIS+4;fitCits();fpsUp=0} // آخرین پله: کاهش ریز شهروندان
else if(fpsA>50&&VIS<mx&&VIS<VCAP){if(++fpsUp>=2){VIS=Math.min(mx,VCAP,Math.ceil(VIS*1.1)+3);fitCits();fpsUp=0}}
else fpsUp=0}
function mkCit(i){if(i>0&&INST)return mkCitLite(i);const g=new THREE.Group(),f=i===0,cl=f?0x12161d:rr(cloth),sk=f?0x0a0e13:rr(skin),hc=f?0x0d1117:rr(hairC),pn=f?0x0e1218:rr(pants),hs=f?0:(Math.random()*5|0);g.rotation.order='YXZ';
const bp=Parts();bp.p(new THREE.CapsuleGeometry(.125,.25,4,10),cl);const body=bp.mesh();body.position.y=.46;g.add(body);
const H=Parts();H.p(SG(.14,16,12),sk,0,.82,0);
if(!f){
[-.05,.05].forEach(x=>{H.p(SG(.03,10,6),0xffffff,x,.835,.128,0,0,1,1,.6);H.p(SG(.017,8,6),0x1a1410,x,.833,.142,0,0,1,1,.6);H.p(BG(.05,.011,.012),hc,x,.878,.128,0,x>0?-.12:.12);H.p(SG(.024,8,6),0xf29a8f,x*1.7,.79,.105,0,0,1,1,.5)});
H.p(SG(.018),sk,0,.805,.14);[-.14,.14].forEach(x=>H.p(SG(.03),sk,x,.82,0,0,0,1,1,.7));
H.p(new THREE.TorusGeometry(.03,.006,6,12,Math.PI),0x7a2f2f,0,.795,.131,0,Math.PI);
}
if(hs===4){const hat=rr(cloth);H.p(SG(.155,16,10,0,6.3,0,1.3),hat,0,.845,0,-.12);H.p(BG(.17,.02,.1),hat,0,.875,.15,.15)}else H.p(SG(.15,16,10,0,6.3,0,1.4),hc,0,.835,0,-.28);
if(hs===1){H.p(SG(.06),hc,0,.85,-.15);H.p(new THREE.CapsuleGeometry(.03,.12,3,6),hc,0,.74,-.19,.3)}
if(hs===2)H.p(SG(.06,10,6),hc,0,.985,-.07);
if(hs===3)H.p(new THREE.CapsuleGeometry(.1,.16,3,8),hc,0,.74,-.08,0,0,1,1,.6);
if(!f&&(hs===0||hs===4)&&Math.random()<.4)H.p(SG(.146,14,8,0,Math.PI,2.0,.85),hc,0,.82,0);
g.add(H.mesh());
const sh=f?0x10141a:rr(shoes);
const limb=(w,h,c,px,py,shc)=>{const P=Parts();P.p(BG(w,h,w),c,0,-h/2,0);if(shc)P.p(BG(.095,.06,.15),shc,0,-h+.025,.025);else P.p(SG(.036),sk,0,-h,0);const p=new THREE.Group();p.add(P.mesh());p.position.set(px,py,0);g.add(p);return p};
const c={g,body,lL:limb(.085,.28,pn,-.06,.3,sh),lR:limb(.085,.28,pn,.06,.3,sh),aL:limb(.065,.26,cl,-.17,.62),aR:limb(.065,.26,cl,.17,.62),path:[],ph:Math.random()*6,wait:Math.random()*2,sp:(.8+Math.random()*.5)*.85,act:'',st:'stay',tm:Math.random()*2.5,hid:0,by:0,chain:0,lk:0,ct:0,talk:0,fa:null,pt:null,ty:null,tr:{f:Math.random(),s:Math.random(),so:Math.random()}};
g.scale.setScalar(f?.9:.8);c.hm=M(hc,.85);if(f)founderLook(c);
if(!f&&Math.random()<.35){const ln=new THREE.Group(),lb=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),LANT);ln.add(lb);const lh=NORAY(new THREE.Sprite(LNHALO));lh.scale.set(.6,.6,1);ln.add(lh);ln.position.set(0,-.33,.05);ln.visible=false;c.aR.add(ln);c.lan=ln}
const hb=new THREE.Mesh(new THREE.SphereGeometry(.5,6,5),new THREE.MeshBasicMaterial({visible:false}));hb.position.y=.5;g.add(hb);c.i=i;g.userData.cit=c;lazyEl(c,f);
const p=freeNear(ctr[0],ctr[1],Math.min(RAD*.85,5+i*.5));g.position.set(p[0],0,p[1]);scene.add(g);return c}
// ── ظاهر بنیان‌گذار: «هکر ماتریکس» (بازطراحی کامل مطابق کاراکتر مرجع) — بدنِ سایه‌مانند، هودی با نوک و
// گاگل پیشانی، صورتِ تاریک با دو چشم سبزِ درخشان و هاله، پالتوی بلندِ باز با یقهٔ ایستاده و خطوط نئونی،
// کمربند با سگک نورانی، دستکش تیره + دستبند نئونی، بوت سنگین با نور پاشنه و نور محیطی سبز.
let fL=null;
const FO_COAT=M(0x12161d,.85),FO_HOOD=M(0x0d1117,.9),FO_INK=M(0x05080c,.95),FO_BOOT=M(0x10141a,.5),
FO_EYE=new THREE.MeshBasicMaterial({color:0x8bffaf}),
FO_GLASS=new THREE.MeshBasicMaterial({color:0x39e56f,transparent:true,opacity:.45}),
FO_TRIM=new THREE.MeshStandardMaterial({color:0x06140a,emissive:0x2be56f,emissiveIntensity:1.4,roughness:.45}),
FO_GHALO=new THREE.SpriteMaterial({map:GRADT,color:0x39ff7c,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending});
function founderLook(c){const g=c.g,put=(geo,m,x,y,z,rx=0,ry=0,rz=0,sz=1)=>{const e=new THREE.Mesh(geo,m);e.position.set(x,y,z);e.rotation.set(rx,ry,rz);e.scale.z=sz;e.castShadow=true;g.add(e);return e};
// پالتوی بلند: دامن گشادتر، خط نئونی لبهٔ جلو، شنل پشتی، یقهٔ ایستاده و سرشانه
put(new THREE.CylinderGeometry(.13,.215,.36,10),FO_COAT,0,.40,0);
put(new THREE.TorusGeometry(.2,.006,6,22),FO_TRIM,0,.228,0,Math.PI/2);
put(new THREE.BoxGeometry(.22,.30,.035),FO_COAT,0,.46,-.14,.22);
put(new THREE.BoxGeometry(.012,.2,.012),FO_TRIM,-.075,.47,.183,0,0,-.06);
put(new THREE.BoxGeometry(.012,.2,.012),FO_TRIM,.075,.47,.183,0,0,.06);
[-1,1].forEach(q=>{put(new THREE.BoxGeometry(.075,.105,.028),FO_COAT,q*.048,.605,.088,-.5,0,q*.3);
put(new THREE.BoxGeometry(.075,.012,.012),FO_TRIM,q*.052,.657,.072,0,0,q*.3);
put(new THREE.SphereGeometry(.048,8,6),FO_COAT,q*.17,.625,0);
// گاگل روی پیشانی: استوانهٔ تیره + حلقهٔ نئونی + شیشهٔ سبز
put(new THREE.CylinderGeometry(.024,.03,.05,10),FO_COAT,q*.05,.885,.058,1.15);
put(new THREE.TorusGeometry(.03,.007,6,14),FO_TRIM,q*.05,.885,.062,1.15);
put(new THREE.CylinderGeometry(.02,.02,.012,10),FO_GLASS,q*.05,.888,.075,1.15)});
// کمربند تیره با سگک نئونی
put(new THREE.TorusGeometry(.148,.011,6,18),FO_INK,0,.565,0,Math.PI/2);
put(new THREE.BoxGeometry(.03,.026,.014),FO_TRIM,0,.565,.147);
// هودی: کلاه پهن (کمی فشرده در محور z)، نوک عقب، قاب دور صورت و سایهٔ تاریک درون صورت
put(new THREE.SphereGeometry(.16,14,10),FO_HOOD,0,.825,-.012,0,0,0,.82);
put(new THREE.ConeGeometry(.05,.09,8),FO_HOOD,0,.945,-.115,-.55);
put(new THREE.TorusGeometry(.104,.02,8,16),FO_HOOD,0,.818,.07,1.25);
put(new THREE.SphereGeometry(.107,12,9),FO_INK,0,.815,.028,0,0,0,.78);
// بند گاگل دور سر
put(new THREE.TorusGeometry(.152,.007,6,20),FO_INK,0,.872,-.01,1.05);
// چشم‌های سبز درخشان (دو چشم گرد و جدا، هالهٔ کوچک تا در هم ادغام نشوند)
[-1,1].forEach(q=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.033,10,8),FO_EYE);e.position.set(q*.051,.824,.116);g.add(e);
const s=new THREE.Sprite(FO_GHALO);s.scale.set(.075,.075,1);s.position.set(q*.051,.824,.124);g.add(s)});
// دستبند نئونی مچ (دستکش = رنگ تیرهٔ دست)، بند زانو و بوت سنگین با نور پاشنه
[c.aL,c.aR].forEach(a=>{const w=new THREE.Mesh(new THREE.TorusGeometry(.039,.006,6,12),FO_TRIM);w.rotation.x=Math.PI/2;w.position.y=-.20;w.castShadow=true;a.add(w)});
[c.lL,c.lR].forEach(l=>{const k=new THREE.Mesh(new THREE.TorusGeometry(.052,.006,6,12),FO_TRIM);k.rotation.x=Math.PI/2;k.position.y=-.13;k.castShadow=true;l.add(k);
const b=new THREE.Mesh(new THREE.BoxGeometry(.10,.075,.165),FO_BOOT);b.position.set(0,-.27,.03);b.castShadow=true;l.add(b);
const s2=new THREE.Mesh(new THREE.BoxGeometry(.105,.018,.175),FO_INK);s2.position.set(0,-.302,.03);s2.castShadow=true;l.add(s2);
const h=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,.014),FO_TRIM);h.position.set(0,-.268,-.052);l.add(h)});
fL=new THREE.PointLight(0x46ff7d,.4,3.5);fL.position.set(0,.9,.28);g.add(fL)}
