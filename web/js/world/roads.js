// ═══ جاده‌ها و پیاده‌روهای به‌هم‌پیوسته + چراغ خیابان. ═══
'use strict';
// ── جاده‌های متصل + چراغ خیابان
const LAMP=new THREE.MeshStandardMaterial({color:0xfff1c0,emissive:0xffd98a,emissiveIntensity:.1}),LP=new THREE.MeshBasicMaterial({map:GRADT,color:0xffc873,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),LPG=new THREE.PlaneGeometry(4.6,4.6),ASP=0x4a4d52;
function roadMesh(g,m,lamp,cr=0){[...g.children].forEach(c=>g.remove(c));
const q=(w,d,x,z,c,h=.08)=>{const e=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,.95));e.position.set(x,h/2,z);e.receiveShadow=true;g.add(e)};
q(2,2,0,0,0xb9b3a4,.06);q(1.3,1.3,0,0,ASP);
[[1,0,-.825,1.3,.35],[2,.825,0,.35,1.3],[4,0,.825,1.3,.35],[8,-.825,0,.35,1.3]].forEach(([bit,x,z,w,d])=>{if(m&bit){q(w,d,x,z,ASP);q(bit&5?.06:.3,bit&5?.3:.06,x*.9,z*.9,0xf1e7b8,.09)}});
if(cr){const zb=(w,d,x,z)=>q(w,d,x,z,0xefe9d6,.095);for(let i=-2;i<=2;i++){if(cr&1)zb(.09,1,i*.2,0);if(cr&2)zb(1,.09,0,i*.2)}}
if(lamp){const p=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,1.1,5),M(0x2f3338));p.position.set(.82,.55,.82);p.castShadow=true;g.add(p);const bl=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),LAMP);bl.position.set(.82,1.12,.82);g.add(bl);const pl=NORAY(new THREE.Mesh(LPG,LP));pl.rotation.x=-Math.PI/2;pl.position.set(.55,.12,.55);g.add(pl);const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(1,1,1);hl.position.set(.82,1.12,.82);g.add(hl)}}
// ── پیاده‌رو: مسیر خاکیِ باریکِ «رد پایی»؛ از مرکز خانه به‌صورت یک نوار موج‌دار تا خانه/جاده/پیاده‌روی بعدی می‌رود (نه سطح پهن).
// عرض مسیر: PTW. هر نوار از چند دیسک هم‌پوشان با انحرافِ ملایم ساخته می‌شود؛ دو سرِ نوار بدون انحراف‌اند تا به خانهٔ بعدی بی‌درز وصل شوند.
const PTW=.5,PT_DIRT=[0xb09366,0xaa8f63,0xb59a6c],PT_EDGE=0x8d8c55,PT_WORN=0x9b8058,PT_FOOT=0x8f744c,PT_PBG=new THREE.IcosahedronGeometry(.03,0),PT_PBC=[0x8f8a80,0x7d786e,0xa39d90],PT_CYL=new THREE.CylinderGeometry(1,1,1,10,1),PT_M=new THREE.Matrix4(),PT_Q=new THREE.Quaternion(),PT_P=new THREE.Vector3(),PT_S=new THREE.Vector3(),PT_E=new THREE.Euler();
function pathMesh(g,m,id,L,bl=0,gx=0,gz=0){[...g.children].forEach(c=>{g.remove(c);if(c.userData.own)c.geometry.dispose()});
const hw=PW/2,base=[],edge=[],worn=[],foot=[];let sd=(id*9301+49297)%233280;const r=()=>(sd=(sd*9301+49297)%233280)/233280;
// دیسکِ تخت (بیضی با شعاع‌های rx/rz و چرخش ry) ← به لیست مربوط اضافه می‌شود تا بعد ادغام شود
const disc=(arr,x,z,rx,rz,top,ry=0)=>{PT_P.set(x,top/2,z);PT_S.set(rx,top,rz);PT_Q.setFromEuler(PT_E.set(0,ry,0));PT_M.compose(PT_P,PT_Q,PT_S);arr.push(PT_CYL.clone().applyMatrix4(PT_M))};
const B=[1,2,4,8],DX=[0,1,0,-1],DZ=[-1,0,1,0],any=B.some(b=>m&b);
const cr=any?PTW/2+.03:.4;disc(edge,0,0,cr+.06,cr+.06,.015);disc(base,0,0,cr,cr,.03);
B.forEach((bit,i)=>{if(!(m&bit))return;const l=hw+L[i],n=Math.max(2,Math.ceil(l/.2)),ax=DX[i]!==0;let ft=0;
for(let k=1;k<=n;k++){const t=k/n,d=t*l,j=(r()-.5)*.11*Math.sin(Math.PI*t),rad=PTW/2*(.92+r()*.22),px=ax?DX[i]*d:j,pz=ax?j:DZ[i]*d;disc(edge,px,pz,rad+.06,rad+.06,.015);disc(base,px,pz,rad,rad,.03);
if(r()<.55)disc(worn,px+(ax?0:(r()-.5)*.2),pz+(ax?(r()-.5)*.2:0),.07+r()*.07,.05+r()*.06,.034,r()*3)}
if(bl&bit){disc(edge,DX[i]*(l-.06),DZ[i]*(l-.06),.44,.44,.015);disc(base,DX[i]*(l-.06),DZ[i]*(l-.06),.38,.38,.03)}   // جلوی در ساختمان کمی گشادتر
// رد پاها: جفت‌بیضی‌های کم‌رنگ، یکی چپ و یکی راست، در امتداد مسیر
for(let d=.35,s=1;d<l-.1;d+=.34,s=-s){const px=ax?DX[i]*d:s*.07,pz=ax?s*.07:DZ[i]*d;disc(foot,px,pz,ax?.085:.045,ax?.045:.085,.038,(r()-.5)*.4)}});
const mk=(arr,c,sh)=>{if(!arr.length)return;const e=new THREE.Mesh(mergeGeometries(arr,false),M(c,1));arr.forEach(x=>x.dispose());e.userData.own=1;e.receiveShadow=true;g.add(e)};
mk(edge,PT_EDGE);mk(base,PT_DIRT[((id%3)+3)%3]);mk(worn,PT_WORN);mk(foot,PT_FOOT);
for(let i=0;i<2;i++){const e=new THREE.Mesh(PT_PBG,M(PT_PBC[i%3],1));e.position.set((r()-.5)*.6,.034,(r()-.5)*.6);e.scale.set(1,.5,1);e.rotation.y=r()*3;g.add(e)}}
function roads(w){const rs=new Set(),ps=new Set();for(const b of w.buildings){if(b.type==='road')rs.add(b.x+','+b.z);else if(b.type==='path')ps.add(b.x+','+b.z)}
const hr=(x,z)=>rs.has(x+','+z),hq=(x,z)=>ps.has(x+','+z),hc=(x,z)=>hr(x,z)||hq(x,z);
const LN=1-PW/2,lk=new Map(),di=(dx,dz)=>dz<0?0:dx>0?1:dz>0?2:3,link=(cx,cz,d,len)=>{const k=cx+','+cz;if(!ps.has(k))return;let e=lk.get(k);if(!e){e={m:0,bl:0,L:[LN,LN,LN,LN]};lk.set(k,e)}e.m|=1<<d;e.bl|=1<<d;e.L[d]=len};
for(const b of w.buildings){const t=b.type,th=(b.rot||0)*Math.PI/180;
if(t==='house'||t==='hq'){const dx=Math.round(Math.sin(th)),dz=Math.round(Math.cos(th));if(dx||dz)link(b.x+dx,b.z+dz,di(-dx,-dz),t==='house'?.85:.53)}
else if(t==='farm'||t==='market'){for(const[nx,nz]of[[0,-1],[1,0],[0,1],[-1,0]]){const ex=t==='farm'?.95:(((nx!==0)===((Math.round((b.rot||0)/90)%2+2)%2===0))?1:.7);link(b.x+nx,b.z+nz,di(-nx,-nz),Math.max(.3,1.5-ex))}}}
for(const b of w.buildings){if(b.type!=='road'&&b.type!=='path')continue;const g=objs.get(b.id);if(!g)continue;
if(b.type==='road'){const m=(hr(b.x,b.z-1)?1:0)|(hr(b.x+1,b.z)?2:0)|(hr(b.x,b.z+1)?4:0)|(hr(b.x-1,b.z)?8:0),l=((b.x+b.z)%2+2)%2===0?1:0,cr=(hq(b.x,b.z-1)&&hq(b.x,b.z+1)?1:0)|(hq(b.x+1,b.z)&&hq(b.x-1,b.z)?2:0),k=m+l*16+cr*32;if(g.userData.k!==k){g.userData.k=k;roadMesh(g,m,l,cr)}}
else{const e=lk.get(b.x+','+b.z),m=(hc(b.x,b.z-1)?1:0)|(hc(b.x+1,b.z)?2:0)|(hc(b.x,b.z+1)?4:0)|(hc(b.x-1,b.z)?8:0)|(e?e.m:0),L=e?e.L:[LN,LN,LN,LN],bl=e?e.bl:0,k=m+'|'+L.join(',')+'|'+bl;if(g.userData.k!==k){g.userData.k=k;pathMesh(g,m,b.id,L,bl,b.x,b.z)}}}}
