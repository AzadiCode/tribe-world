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
const H=I.HALO,K=H.length;let thr=1e18,u=0;if(nl>K){I.tmp.set(I.ld.subarray(0,nl));thr=I.tmp.subarray(0,nl).sort()[K-1]}
for(let j=0;j<nl&&u<K;j++)if(I.ld[j]<=thr){const s=H[u++];s.position.set(I.lx[j*3],I.lx[j*3+1],I.lx[j*3+2]);s.visible=true}
for(;u<K;u++)H[u].visible=false}
function killInst(){const I=INST;if(!I)return;INST=null;for(const k in I.P){scene.remove(I.P[k].m);I.P[k].m.dispose();I.P[k].m.geometry.dispose()}I.HALO.forEach(s=>scene.remove(s));HARD=140;VIS=Math.min(VIS,MOB?40:70);while(cits.length){const c=cits.pop();scene.remove(c.g);c.el.remove()}fitCits()}
function mkCitLite(i){
const g=new THREE.Group();g.rotation.order='YXZ';
const hs=Math.random()*5|0,bd=(hs===0||hs===4)&&Math.random()<.4,lb=()=>({rotation:{x:0}});
const pal={cl:lin(rr(cloth)),sk:lin(rr(skin)),hc:lin(rr(hairC)),pn:lin(rr(pants)),sh:lin(rr(shoes)),hat:lin(rr(cloth)),hs,hv:hs===0?(bd?5:0):hs===4?(bd?6:4):hs};
const c={g,lite:1,pal,pop:0,body:{scale:{y:1}},lL:lb(),lR:lb(),aL:lb(),aR:lb(),path:[],ph:Math.random()*6,wait:Math.random()*2,sp:(.8+Math.random()*.5)*.85,act:'',st:'stay',tm:Math.random()*2.5,hid:0,by:0,chain:0,lk:0,ct:0,talk:0,fa:null,pt:null,ty:null,tr:{f:Math.random(),s:Math.random(),so:Math.random()}};
g.scale.setScalar(.008);if(Math.random()<.35)c.lan={visible:false};
const hb=new THREE.Mesh(HBG,HBM);hb.position.y=.5;g.add(hb);c.i=i;g.userData.cit=c;
const el=document.createElement('div');el.className='nt';el.innerHTML='<b></b>';$('nts').appendChild(el);c.el=el;c.nb=el.firstChild;c.nb.textContent=nameOf(i);
const p=freeNear(ctr[0],ctr[1],Math.min(RAD*.85,5+i*.5));g.position.set(p[0],0,p[1]);scene.add(g);return c}
try{if(!/classic/.test(location.search)){INST=initInst();HARD=MOB?320:640;VIS=MOB?90:180}}catch(e){console.error('instancing off',e);INST=null}
function tune(){if(RC.on||rec){fpsUp=0;return} // هنگام ضبط، سیستم خودکار کاهش شهروندان خاموش است تا کسی از بازی ناپدید نشود
const mx=Math.min(POP,HARD),MIN=MOB?24:36;vcT+=1.5;if(vcT>=8){vcT=0;if(VCAP<1e9)VCAP=Math.ceil(VCAP*1.12)+3}
if(fpsA<27&&VIS>MIN){VIS=Math.max(MIN,Math.floor(VIS*.85));VCAP=VIS+4;fitCits();fpsUp=0}
else if(fpsA<24&&VIS<=MIN&&PRX>(LOW?.76:1.01)&&!RC.on){PRX=Math.max(LOW?.75:1,PRX-.25);R.setPixelRatio(PRX);onRes();fpsUp=0}
else if(fpsA>50&&VIS<mx&&VIS<VCAP){if(++fpsUp>=2){VIS=Math.min(mx,VCAP,Math.ceil(VIS*1.1)+3);fitCits();fpsUp=0}}
else fpsUp=0}
function mkCit(i){if(i>0&&INST)return mkCitLite(i);const g=new THREE.Group(),f=i===0,cl=f?0x1b2540:rr(cloth),sk=rr(skin),hc=f?0x1c1410:rr(hairC),pn=f?0x14182a:rr(pants),hs=f?0:(Math.random()*5|0);g.rotation.order='YXZ';
const bp=Parts();bp.p(new THREE.CapsuleGeometry(.125,.25,4,10),cl);const body=bp.mesh();body.position.y=.46;g.add(body);
const H=Parts();H.p(SG(.14,16,12),sk,0,.82,0);
[-.05,.05].forEach(x=>{H.p(SG(.03,10,6),0xffffff,x,.835,.128,0,0,1,1,.6);H.p(SG(.017,8,6),0x1a1410,x,.833,.142,0,0,1,1,.6);H.p(BG(.05,.011,.012),hc,x,.878,.128,0,x>0?-.12:.12);H.p(SG(.024,8,6),0xf29a8f,x*1.7,.79,.105,0,0,1,1,.5)});
H.p(SG(.018),sk,0,.805,.14);[-.14,.14].forEach(x=>H.p(SG(.03),sk,x,.82,0,0,0,1,1,.7));
H.p(new THREE.TorusGeometry(.03,.006,6,12,Math.PI),0x7a2f2f,0,.795,.131,0,Math.PI);
if(hs===4){const hat=rr(cloth);H.p(SG(.155,16,10,0,6.3,0,1.3),hat,0,.845,0,-.12);H.p(BG(.17,.02,.1),hat,0,.875,.15,.15)}else H.p(SG(.15,16,10,0,6.3,0,1.4),hc,0,.835,0,-.28);
if(hs===1){H.p(SG(.06),hc,0,.85,-.15);H.p(new THREE.CapsuleGeometry(.03,.12,3,6),hc,0,.74,-.19,.3)}
if(hs===2)H.p(SG(.06,10,6),hc,0,.985,-.07);
if(hs===3)H.p(new THREE.CapsuleGeometry(.1,.16,3,8),hc,0,.74,-.08,0,0,1,1,.6);
if(!f&&(hs===0||hs===4)&&Math.random()<.4)H.p(SG(.146,14,8,0,Math.PI,2.0,.85),hc,0,.82,0);
if(f)H.p(BG(.13,.05,.08),hc,0,.985,.07,-.25);
g.add(H.mesh());
const sh=f?0x0c0c10:rr(shoes);
const limb=(w,h,c,px,py,shc)=>{const P=Parts();P.p(BG(w,h,w),c,0,-h/2,0);if(shc)P.p(BG(.095,.06,.15),shc,0,-h+.025,.025);else P.p(SG(.036),sk,0,-h,0);const p=new THREE.Group();p.add(P.mesh());p.position.set(px,py,0);g.add(p);return p};
const c={g,body,lL:limb(.085,.28,pn,-.06,.3,sh),lR:limb(.085,.28,pn,.06,.3,sh),aL:limb(.065,.26,cl,-.17,.62),aR:limb(.065,.26,cl,.17,.62),path:[],ph:Math.random()*6,wait:Math.random()*2,sp:(.8+Math.random()*.5)*.85,act:'',st:'stay',tm:Math.random()*2.5,hid:0,by:0,chain:0,lk:0,ct:0,talk:0,fa:null,pt:null,ty:null,tr:{f:Math.random(),s:Math.random(),so:Math.random()}};
g.scale.setScalar(f?.9:.8);c.hm=M(hc,.85);if(f)founderLook(c);
if(!f&&Math.random()<.35){const ln=new THREE.Group(),lb=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),LANT);ln.add(lb);const lh=NORAY(new THREE.Sprite(LNHALO));lh.scale.set(.6,.6,1);ln.add(lh);ln.position.set(0,-.33,.05);ln.visible=false;c.aR.add(ln);c.lan=ln}
const hb=new THREE.Mesh(new THREE.SphereGeometry(.5,6,5),new THREE.MeshBasicMaterial({visible:false}));hb.position.y=.5;g.add(hb);c.i=i;g.userData.cit=c;const el=document.createElement('div');el.className='nt'+(f?' f':'');el.innerHTML='<b></b>';$('nts').appendChild(el);c.el=el;c.nb=el.firstChild;c.nb.textContent=nameOf(i);
const p=freeNear(ctr[0],ctr[1],Math.min(RAD*.85,5+i*.5));g.position.set(p[0],0,p[1]);scene.add(g);return c}
// ── ظاهر بنیان‌گذار: هکر نئونی (پالتوی تاریک، گاگل، چشم سبز، دورخط درخشان)
let fL=null;
function founderLook(c){const g=c.g,SU=M(0x1b2540,.65),WS=M(0xf4f1ea,.6),TI=M(0x2fd67a,.5),GO=M(0xd9b45a,.3),BK=new THREE.MeshStandardMaterial({color:0x10141c,roughness:.2,metalness:.25});
const put=(geo,m,x,y,z,rx=0,rz=0)=>{const e=new THREE.Mesh(geo,m);e.position.set(x,y,z);e.rotation.x=rx;e.rotation.z=rz;e.castShadow=true;g.add(e);return e};
put(new THREE.CylinderGeometry(.135,.2,.3,12),SU,0,.4,0);
put(new THREE.BoxGeometry(.075,.22,.02),WS,0,.55,.127);put(new THREE.BoxGeometry(.034,.19,.02),TI,0,.52,.135);
[-1,1].forEach(q=>put(new THREE.BoxGeometry(.05,.2,.02),SU,q*.065,.53,.13,0,q*.28));
put(new THREE.BoxGeometry(.028,.028,.012),GO,.085,.5,.14);
[-.05,.05].forEach(x=>put(new THREE.BoxGeometry(.075,.05,.012),BK,x,.838,.152));put(new THREE.BoxGeometry(.03,.012,.012),BK,0,.845,.152);
[-.105,.105].forEach(x=>put(new THREE.BoxGeometry(.01,.01,.14),BK,x,.84,.08));
const wt=new THREE.Mesh(new THREE.TorusGeometry(.036,.01,6,12),GO);wt.rotation.x=Math.PI/2;wt.position.y=-.2;c.aL.add(wt);
fL=new THREE.PointLight(0xffd9a0,.3,4);fL.position.set(0,.9,.3);g.add(fL)}
