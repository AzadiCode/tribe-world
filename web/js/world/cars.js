// ═══ ماشین‌های ریز روی جاده‌ها. ═══
'use strict';
// ═══ ماشین‌های ریز: فقط وقتی جاده هست؛ تصادفی پیدا می‌شوند، می‌چرخند، جلوی آدم‌ها می‌ایستند، شب چراغ روشن می‌کنند ═══
const cars=[],CC=[0xd94f3a,0xf0b13a,0x3f7f99,0x7cb342,0xf2ead6,0x94527f],HL=new THREE.MeshStandardMaterial({color:0xfff3c4,emissive:0xffe08a,emissiveIntensity:.2}),WH=new THREE.CylinderGeometry(.07,.07,.05,10),DIRS=[[1,0],[-1,0],[0,1],[0,-1]],LANE=.32;let spT=3;
const hasR=(x,z)=>roadSet.has(x+','+z);
function mkCar(){const g=new THREE.Group(),col=rr(CC);bx(g,.62,.13,.3,col,0,.05);bx(g,.32,.12,.26,col,-.05,.18);bx(g,.3,.07,.275,0x9fc4d6,-.05,.2);
[[.2,.16],[.2,-.16],[-.2,.16],[-.2,-.16]].forEach(([x,z])=>{const w=new THREE.Mesh(WH,M(0x25282c));w.rotation.x=Math.PI/2;w.position.set(x,.07,z);g.add(w)});
[-.09,.09].forEach(z=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.03,.05,.07),HL);l.position.set(.32,.12,z);g.add(l)});return g}
function pickNext(c){const ds=DIRS.filter(([a,b])=>hasR(c.ix+a,c.iz+b)),nr=c.d?ds.filter(([a,b])=>a!==-c.d[0]||b!==-c.d[1]):ds,pool=nr.length?nr:ds;if(!pool.length)return 0;
let d=rr(pool);if(c.d&&Math.random()<.6){const s=pool.find(([a,b])=>a===c.d[0]&&b===c.d[1]);if(s)d=s}
c.d=d;c.ix+=d[0];c.iz+=d[1];c.tx=c.ix*CELL-d[1]*LANE;c.tz=c.iz*CELL+d[0]*LANE;return 1}
function spawnCar(){const cand=roadC.filter(r=>DIRS.some(([a,b])=>hasR(r.x/CELL+a,r.z/CELL+b)));if(!cand.length)return;const r=rr(cand),g=mkCar();g.scale.setScalar(.01);scene.add(g);
const c={g,ix:r.x/CELL,iz:r.z/CELL,d:null,tx:0,tz:0,hd:0,v:0,sp:1.5+Math.random()*.7,life:30+Math.random()*45,sc:0,stuck:0,out:0};if(!pickNext(c)){scene.remove(g);return}
g.position.set(c.tx-c.d[0]*CELL,.06,c.tz-c.d[1]*CELL);c.hd=Math.atan2(-c.d[1],c.d[0]);cars.push(c)}
function stepCars(dt,t){HL.emissiveIntensity=.15+2.2*NT;HQG.opacity=.04+.75*NT;HQGL.emissiveIntensity=.06+1.7*NT;ffStep(t);for(const c of cits)if(c.lan)c.lan.visible=NT>.4;if(hqDish)hqDish.rotation.y=t*.7;
const want=roadC.length>=3?Math.min(6,1+(roadC.length/5|0)):0,tg=Math.round(want*(1-NT*.75));
if((spT-=dt)<=0){spT=2+Math.random()*6;if(cars.length<tg)spawnCar()}
for(let i=cars.length-1;i>=0;i--){const c=cars[i],g=c.g;if((c.life-=dt)<=0||(cars.length>tg+1&&Math.random()<dt*.2))c.out=1;
c.sc=Math.max(0,Math.min(1,c.sc+(c.out?-dt*2:dt*2)));g.scale.setScalar(Math.max(.01,c.sc)*1.3);
if(c.out&&c.sc<=0){scene.remove(g);g.traverse(o=>{if(o.geometry&&o.geometry!==WH)o.geometry.dispose()});cars.splice(i,1);continue}
const px=g.position.x,pz=g.position.z;if(Math.hypot(c.tx-px,c.tz-pz)<.2&&!pickNext(c)){c.out=1;continue}
let da=Math.atan2(-(c.tz-pz),c.tx-px)-c.hd;da=Math.atan2(Math.sin(da),Math.cos(da));c.hd+=da*Math.min(1,dt*6);
const cs=Math.cos(c.hd),sn=Math.sin(c.hd),ck=(x,z,fw,lat)=>{const rx=x-px,rz=z-pz,f=rx*cs-rz*sn,l=Math.abs(rx*sn+rz*cs);return f>.05&&f<fw&&l<lat};let bl=0;
for(const p of cits)if(!p.hid&&ck(p.g.position.x,p.g.position.z,1.1,.4)){bl=1;break}
if(!bl)for(const o of cars)if(o!==c&&ck(o.g.position.x,o.g.position.z,.95,.38)){bl=1;break}
c.stuck=bl?c.stuck+dt:0;c.v+=((!bl||c.stuck>5?c.sp:0)-c.v)*Math.min(1,dt*4);
g.position.x+=cs*c.v*dt;g.position.z-=sn*c.v*dt;g.position.y=.06+(c.v>.2?Math.sin(t*18+i)*.004:0);g.rotation.y=c.hd}}
