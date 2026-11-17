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
// ── پیاده‌رو: نیمِ عرض خیابان، ساده و خاکی (عرض ۱ در برابر ۲ خانهٔ جاده)
const PBG=new THREE.IcosahedronGeometry(.03,0),DIRT=[0xb09366,0xaa8f63,0xb59a6c],PBC=[0x8f8a80,0x7d786e,0xa39d90],RIM=[0x8b8f52,0x93915a,0x868a4f],RR=.05,RG={},RSG=new THREE.SphereGeometry(RR,8,6);
const rimG=l=>RG[l]||(RG[l]=new THREE.CylinderGeometry(RR,RR,l,8,1));
function pathMesh(g,m,id,L,bl=0){[...g.children].forEach(c=>g.remove(c));const H0=.03,hw=PW/2,q=(w,d,x,z,c,h=H0)=>{const e=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,1));e.position.set(x,h/2,z);e.receiveShadow=true;g.add(e)},base=DIRT[((id%3)+3)%3],rc=RIM[((id%3)+3)%3];
// خاکِ ساده؛ بازوها به پیاده‌رو/جاده و به ورودی ساختمان‌ها می‌رسند
q(PW,PW,0,0,base);
const B=[1,2,4,8],DX=[0,1,0,-1],DZ=[-1,0,1,0];
B.forEach((bit,i)=>{if(m&bit)q(DX[i]?L[i]:PW,DZ[i]?L[i]:PW,DX[i]*(hw+L[i]/2),DZ[i]*(hw+L[i]/2),base)});
// لبهٔ برجستهٔ نرم (بینِ خاک و چمن): نیم‌استوانهٔ خوابیده + گوی در گوشه‌ها
const rim=(len,x,z,alongX)=>{const e=new THREE.Mesh(rimG(len),M(rc,1));e.position.set(x,H0,z);if(alongX)e.rotation.z=Math.PI/2;else e.rotation.x=Math.PI/2;e.receiveShadow=true;g.add(e)},ball=(x,z)=>{const e=new THREE.Mesh(RSG,M(rc,1));e.position.set(x,H0,z);e.receiveShadow=true;g.add(e)};
const has=i=>!!(m&B[i]);
if(!has(0))rim(PW,0,-hw,1);if(!has(2))rim(PW,0,hw,1);if(!has(1))rim(PW,hw,0,0);if(!has(3))rim(PW,-hw,0,0);
if(has(0)){rim(L[0],-hw,-hw-L[0]/2,0);rim(L[0],hw,-hw-L[0]/2,0)}
if(has(2)){rim(L[2],-hw,hw+L[2]/2,0);rim(L[2],hw,hw+L[2]/2,0)}
if(has(1)){rim(L[1],hw+L[1]/2,-hw,1);rim(L[1],hw+L[1]/2,hw,1)}
if(has(3)){rim(L[3],-hw-L[3]/2,-hw,1);rim(L[3],-hw-L[3]/2,hw,1)}
[[-1,-1,0,3],[1,-1,0,1],[-1,1,2,3],[1,1,2,1]].forEach(([sx,sz,vz,hx])=>{const rz=!has(vz)||has(sx<0?3:1),rx=!has(hx)||has(sz<0?0:2);if(rz||rx)ball(sx*hw,sz*hw)});
// سرِ لبه‌ها کنار ساختمان گرد شود
for(let i=0;i<4;i++)if(bl&B[i]){const e=hw+L[i];if(DX[i]){ball(DX[i]*e,-hw);ball(DX[i]*e,hw)}else{ball(-hw,DZ[i]*e);ball(hw,DZ[i]*e)}}
let sd=(id*9301+49297)%233280;const r=()=>(sd=(sd*9301+49297)%233280)/233280;
for(let i=0;i<2;i++){const e=new THREE.Mesh(PBG,M(PBC[i%3],1));e.position.set((r()-.5)*.55,H0+.006,(r()-.5)*.55);e.scale.set(1,.5,1);e.rotation.y=r()*3;g.add(e)}}
function roads(w){const rs=new Set(),ps=new Set();for(const b of w.buildings){if(b.type==='road')rs.add(b.x+','+b.z);else if(b.type==='path')ps.add(b.x+','+b.z)}
const hr=(x,z)=>rs.has(x+','+z),hq=(x,z)=>ps.has(x+','+z),hc=(x,z)=>hr(x,z)||hq(x,z);
const LN=1-PW/2,lk=new Map(),di=(dx,dz)=>dz<0?0:dx>0?1:dz>0?2:3,link=(cx,cz,d,len)=>{const k=cx+','+cz;if(!ps.has(k))return;let e=lk.get(k);if(!e){e={m:0,bl:0,L:[LN,LN,LN,LN]};lk.set(k,e)}e.m|=1<<d;e.bl|=1<<d;e.L[d]=len};
for(const b of w.buildings){const t=b.type,th=(b.rot||0)*Math.PI/180;
if(t==='house'||t==='hq'){const dx=Math.round(Math.sin(th)),dz=Math.round(Math.cos(th));if(dx||dz)link(b.x+dx,b.z+dz,di(-dx,-dz),t==='house'?.85:.53)}
else if(t==='farm'||t==='market'){for(const[nx,nz]of[[0,-1],[1,0],[0,1],[-1,0]]){const ex=t==='farm'?.95:(((nx!==0)===((Math.round((b.rot||0)/90)%2+2)%2===0))?1:.7);link(b.x+nx,b.z+nz,di(-nx,-nz),Math.max(.3,1.5-ex))}}}
for(const b of w.buildings){if(b.type!=='road'&&b.type!=='path')continue;const g=objs.get(b.id);if(!g)continue;
if(b.type==='road'){const m=(hr(b.x,b.z-1)?1:0)|(hr(b.x+1,b.z)?2:0)|(hr(b.x,b.z+1)?4:0)|(hr(b.x-1,b.z)?8:0),l=((b.x+b.z)%2+2)%2===0?1:0,cr=(hq(b.x,b.z-1)&&hq(b.x,b.z+1)?1:0)|(hq(b.x+1,b.z)&&hq(b.x-1,b.z)?2:0),k=m+l*16+cr*32;if(g.userData.k!==k){g.userData.k=k;roadMesh(g,m,l,cr)}}
else{const e=lk.get(b.x+','+b.z),m=(hc(b.x,b.z-1)?1:0)|(hc(b.x+1,b.z)?2:0)|(hc(b.x,b.z+1)?4:0)|(hc(b.x-1,b.z)?8:0)|(e?e.m:0),L=e?e.L:[LN,LN,LN,LN],bl=e?e.bl:0,k=m+'|'+L.join(',')+'|'+bl;if(g.userData.k!==k){g.userData.k=k;pathMesh(g,m,b.id,L,bl)}}}}
