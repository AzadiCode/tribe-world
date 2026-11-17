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
// ── پیاده‌رو: سنگ‌فرش مرتب با جدول (curb) سبک شهرسازی؛ بافتِ سنگ‌فرش روی مختصات محلی تنظیم شده و بین خانه‌ها بی‌درز ادامه پیدا می‌کند
const PW_H=.045,CURB_H=.085,CURB_T=.07,PAVT=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const q=c.getContext('2d');q.fillStyle='#8f8776';q.fillRect(0,0,128,128);
const tn=['#c7bfae','#bdb5a3','#cec6b4','#b8b09e','#c2baa8'];let s=11;const r=()=>(s=(s*16807)%2147483647)/2147483647;
for(let i=0;i<4;i++)for(let j=0;j<4;j++){q.fillStyle=tn[(r()*tn.length)|0];q.fillRect(i*32+1,j*32+1,30,30);q.fillStyle='rgba(255,255,255,.10)';q.fillRect(i*32+1,j*32+1,30,2)}
for(let k=0;k<220;k++){q.fillStyle=r()<.5?'rgba(0,0,0,.05)':'rgba(255,255,255,.07)';q.fillRect(r()*128,r()*128,2,2)}
const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t})(),
PAVM=new THREE.MeshStandardMaterial({map:PAVT,roughness:1}),CURBC=0xdcd6c8,CURBG={},LPG2=new THREE.CylinderGeometry(.022,.032,1.05,6),LBG=new THREE.SphereGeometry(.085,8,6),LBS=new THREE.BoxGeometry(.11,.07,.11);
function pathMesh(g,m,id,L,bl=0,gx=0,gz=0){[...g.children].forEach(c=>{g.remove(c);if(c.geometry&&c.userData.own)c.geometry.dispose()});
const hw=PW/2,SD=M(0xa59d8b,1);
// تکهٔ سنگ‌فرش: UV رویهٔ بالایی = مختصات محلی ⇒ الگو در همهٔ خانه‌ها یکپارچه است
const slab=(w,d,x,z)=>{const ge=new THREE.BoxGeometry(w,PW_H,d);ge.translate(x,PW_H/2,z);const p=ge.attributes.position,n=ge.attributes.normal,u=ge.attributes.uv;for(let i=0;i<p.count;i++)if(n.getY(i)>.5)u.setXY(i,p.getX(i),p.getZ(i));
const e=new THREE.Mesh(ge,[SD,SD,PAVM,SD,SD,SD]);e.userData.own=1;e.receiveShadow=true;g.add(e)};
const curb=(len,x,z,alongX)=>{const w=alongX?len+CURB_T:CURB_T,d=alongX?CURB_T:len+CURB_T,px=alongX?x:x-Math.sign(x)*CURB_T/2,pz=alongX?z-Math.sign(z)*CURB_T/2:z,k=w.toFixed(3)+'_'+d.toFixed(3);
const ge=CURBG[k]||(CURBG[k]=new THREE.BoxGeometry(w,CURB_H,d)),e=new THREE.Mesh(ge,M(CURBC,.9));e.position.set(px,CURB_H/2,pz);e.receiveShadow=true;g.add(e)};
slab(PW,PW,0,0);
const B=[1,2,4,8],DX=[0,1,0,-1],DZ=[-1,0,1,0];
// بازوها: به پیاده‌رو/جاده و به ورودی ساختمان‌ها؛ بازوی ساختمان به‌اندازهٔ کل خانه پهن است تا بین ردیف خانه‌ها چمنِ خالی نماند
B.forEach((bit,i)=>{if(!(m&bit))return;if(bl&bit){const l=hw+L[i];slab(DX[i]?l:CELL,DZ[i]?l:CELL,DX[i]*l/2,DZ[i]*l/2)}else slab(DX[i]?L[i]:PW,DZ[i]?L[i]:PW,DX[i]*(hw+L[i]/2),DZ[i]*(hw+L[i]/2))});
const has=i=>!!(m&B[i]),wd=i=>!!(bl&B[i]);
// جدول (لبهٔ برجستهٔ سنگی) فقط جایی که پیاده‌رو به چمن می‌رسد
if(!has(0))curb(PW,0,-hw,1);if(!has(2))curb(PW,0,hw,1);if(!has(1))curb(PW,hw,0,0);if(!has(3))curb(PW,-hw,0,0);
if(has(0)&&!wd(0)){if(!wd(3))curb(L[0],-hw,-hw-L[0]/2,0);if(!wd(1))curb(L[0],hw,-hw-L[0]/2,0)}
if(has(2)&&!wd(2)){if(!wd(3))curb(L[2],-hw,hw+L[2]/2,0);if(!wd(1))curb(L[2],hw,hw+L[2]/2,0)}
if(has(1)&&!wd(1)){if(!wd(0))curb(L[1],hw+L[1]/2,-hw,1);if(!wd(2))curb(L[1],hw+L[1]/2,hw,1)}
if(has(3)&&!wd(3)){if(!wd(0))curb(L[3],-hw-L[3]/2,-hw,1);if(!wd(2))curb(L[3],-hw-L[3]/2,hw,1)}
// گوشه‌های بیرونی: ستونک سنگی؛ در بعضی خانه‌ها به‌جایش چراغ خیابان (شب روشن می‌شود)
let lampDone=0;const wantLamp=(((gx+gz)%3)+3)%3===0;
[[-1,-1,0,3],[1,-1,0,1],[-1,1,2,3],[1,1,2,1]].forEach(([sx,sz,vz,hx])=>{if(wd(vz)||wd(hx))return;const rz=!has(vz)||has(sx<0?3:1),rx=!has(hx)||has(sz<0?0:2);if(!(rz||rx))return;
const cx=sx*(hw-.045),cz=sz*(hw-.045);
if(wantLamp&&!lampDone&&!has(vz)&&!has(hx)){lampDone=1;const bs=new THREE.Mesh(LBS,M(0x4a4f56,.7));bs.position.set(cx,PW_H+.035,cz);g.add(bs);
const p=new THREE.Mesh(LPG2,M(0x2f3338));p.position.set(cx,PW_H+.52,cz);p.castShadow=true;g.add(p);
const bl2=new THREE.Mesh(LBG,LAMP);bl2.position.set(cx,PW_H+1.07,cz);g.add(bl2);
const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(1,1,1);hl.position.copy(bl2.position);g.add(hl);return}
const e=new THREE.Mesh(LBS,M(0xe6e0d2,.85));e.position.set(sx*hw-sx*.045,CURB_H*.5+.01,sz*hw-sz*.045);e.scale.set(.8,1.3,.8);e.receiveShadow=true;g.add(e)})}
function roads(w){const rs=new Set(),ps=new Set();for(const b of w.buildings){if(b.type==='road')rs.add(b.x+','+b.z);else if(b.type==='path')ps.add(b.x+','+b.z)}
const hr=(x,z)=>rs.has(x+','+z),hq=(x,z)=>ps.has(x+','+z),hc=(x,z)=>hr(x,z)||hq(x,z);
const LN=1-PW/2,lk=new Map(),di=(dx,dz)=>dz<0?0:dx>0?1:dz>0?2:3,link=(cx,cz,d,len)=>{const k=cx+','+cz;if(!ps.has(k))return;let e=lk.get(k);if(!e){e={m:0,bl:0,L:[LN,LN,LN,LN]};lk.set(k,e)}e.m|=1<<d;e.bl|=1<<d;e.L[d]=len};
for(const b of w.buildings){const t=b.type,th=(b.rot||0)*Math.PI/180;
if(t==='house'||t==='hq'){const dx=Math.round(Math.sin(th)),dz=Math.round(Math.cos(th));if(dx||dz)link(b.x+dx,b.z+dz,di(-dx,-dz),t==='house'?.85:.53)}
else if(t==='farm'||t==='market'){for(const[nx,nz]of[[0,-1],[1,0],[0,1],[-1,0]]){const ex=t==='farm'?.95:(((nx!==0)===((Math.round((b.rot||0)/90)%2+2)%2===0))?1:.7);link(b.x+nx,b.z+nz,di(-nx,-nz),Math.max(.3,1.5-ex))}}}
for(const b of w.buildings){if(b.type!=='road'&&b.type!=='path')continue;const g=objs.get(b.id);if(!g)continue;
if(b.type==='road'){const m=(hr(b.x,b.z-1)?1:0)|(hr(b.x+1,b.z)?2:0)|(hr(b.x,b.z+1)?4:0)|(hr(b.x-1,b.z)?8:0),l=((b.x+b.z)%2+2)%2===0?1:0,cr=(hq(b.x,b.z-1)&&hq(b.x,b.z+1)?1:0)|(hq(b.x+1,b.z)&&hq(b.x-1,b.z)?2:0),k=m+l*16+cr*32;if(g.userData.k!==k){g.userData.k=k;roadMesh(g,m,l,cr)}}
else{const e=lk.get(b.x+','+b.z),m=(hc(b.x,b.z-1)?1:0)|(hc(b.x+1,b.z)?2:0)|(hc(b.x,b.z+1)?4:0)|(hc(b.x-1,b.z)?8:0)|(e?e.m:0),L=e?e.L:[LN,LN,LN,LN],bl=e?e.bl:0,k=m+'|'+L.join(',')+'|'+bl;if(g.userData.k!==k){g.userData.k=k;pathMesh(g,m,b.id,L,bl,b.x,b.z)}}}}
