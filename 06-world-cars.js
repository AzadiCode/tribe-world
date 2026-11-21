// ═══ خودروهای شهری: حرکت لاین‌محور با پیچ نرم و فاصله‌گذاری ایمن ═══
'use strict';
const cars=[],CC=[0xd94f3a,0xf0b13a,0x3f7f99,0x7cb342,0xf2ead6,0x94527f],HL=new THREE.MeshStandardMaterial({color:0xfff3c4,emissive:0xffe08a,emissiveIntensity:.2}),WH=new THREE.CylinderGeometry(.07,.07,.05,10),LANE=.38;
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
let spT=3,carRoadGraph=[],carSerial=0,carRoadVerSeen=-1;
const carSignals=new Map(); // فاز ۰: کلید عددی شبکه‌ای ← {g:ریشهٔ چراغ‌ها, n:گره} — بدون split/find در هر تیک
// ── Engine 2.0: گروهِ خودرو از استخرِ TWE می‌آید (چرخهٔ تولید/حذفِ طبیعی بدون ساخت/حذفِ هندسه و فشار GC)
TWE.Pools.pool('car',{
 create(){const g=new THREE.Group();
  const col=[bx(g,.62,.13,.3,0xffffff,0,.05),bx(g,.32,.12,.26,0xffffff,-.05,.18)];bx(g,.3,.07,.275,0x9fc4d6,-.05,.2);
  [[.2,.16],[.2,-.16],[-.2,.16],[-.2,-.16]].forEach(([x,z])=>{const w=new THREE.Mesh(WH,M(0x25282c));w.rotation.x=Math.PI/2;w.position.set(x,.07,z);g.add(w)});
  [-.09,.09].forEach(z=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.03,.05,.07),HL);l.position.set(.32,.12,z);g.add(l)});
  g.userData.col=col;return g},
 reset(g){const col=rr(CC);for(const m of g.userData.col)m.material=M(col)},   // رنگ تازه برای هر تولید
 dispose(g){g.traverse(o=>{if(o.geometry&&o.geometry!==WH)o.geometry.dispose()})}});
function mkCar(){return TWE.Pools.get('car')}
// گراف دقیقاً از همان کلید شبکه‌ای ناوبری ساخته می‌شود؛ مختصات واقعی قطعه برای حرکت حفظ می‌شود.
// فاز ۰: بازسازی فقط با carRoadVer (امضای عددی rebuildNav) — قبلاً در «هر تیک» رشتهٔ امضای O(N·logN) ساخته می‌شد؛
// با هزاران جاده فقط یک مقایسهٔ عددی در هر تیک هزینه می‌شود و ساختار گراف و رفتار خودروها دست‌نخورده است.
function rebuildCarRoadGraph(){
 if(carRoadVerSeen===carRoadVer)return false;
 carRoadVerSeen=carRoadVer;
 const src=Array.isArray(roadC)?roadC:[],nodes=[],byKey=new Map();
 for(const r of src){const ix=Math.round(r.x/CELL),iz=Math.round(r.z/CELL),key=ix+','+iz;
  const n={ix,iz,x:r.x,z:r.z,neighbors:[],b:r.b};nodes.push(n);byKey.set(key,n)}
 for(const n of nodes)for(const [dx,dz] of DIRS){const next=byKey.get((n.ix+dx)+','+(n.iz+dz));if(next)n.neighbors.push({node:next,dx,dz})}
 carRoadGraph=nodes.filter(n=>n.neighbors.length>0);
 // چراغ واقعی برای هر تقاطع سه‌راه/چهارراه فقط با اجازهٔ مدیر (فیلد tl روی رکورد کاشی)؛ هر ورودی سرِ چراغ مستقل دارد.
 // سرِ چراغ روی «گوشهٔ پیاده‌رو» می‌نشیند (فاصلهٔ جانبی ۰٫۸۴ بیرون از آسفالت جادهٔ عرضی) نه روی جاده،
 // و ارتفاع از ۱٫۵۵ به ۱٫۱۳ کوتاه‌تر شد تا با مقیاس بازی هماهنگ باشد.
 for(const g of carSignals.values()){scene.remove(g.g);g.g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}})}carSignals.clear();
 for(const n of carRoadGraph)if(n.neighbors.length>=3&&n.b&&n.b.tl){const root=new THREE.Group();root.position.set(n.x,fpBaseY('road',n.b.gx??n.b.x,n.b.gz??n.b.z,0),n.z);   // چراغ دقیقاً روی ارتفاعِ گروهِ جاده (fpBaseY — کنار رود هم هم‌تراز)
  for(const e of n.neighbors){const d=[-e.dx,-e.dz],side=[-d[1],d[0]],h=new THREE.Group();h.position.set(-d[0]*.80+side[0]*.84,0,-d[1]*.80+side[1]*.84);h.rotation.y=Math.atan2(-d[0],-d[1]);
   const pole=new THREE.Mesh(new THREE.CylinderGeometry(.022,.036,.9,6),new THREE.MeshStandardMaterial({color:0x34383a,roughness:.8}));pole.position.y=.45;h.add(pole);
   const box=new THREE.Mesh(new THREE.BoxGeometry(.17,.36,.14),new THREE.MeshStandardMaterial({color:0x202326,roughness:.65}));box.position.set(0,1.02,0);h.add(box);
   const bulbs=[];for(let j=0;j<3;j++){const colors=[0xff2929,0xffc928,0x36df69],mat=new THREE.MeshStandardMaterial({color:colors[j],emissive:colors[j],emissiveIntensity:.06,roughness:.3});const bulb=new THREE.Mesh(new THREE.SphereGeometry(.046,8,6),mat);bulb.position.set(0,1.13-j*.105,.078);h.add(bulb);bulbs.push(bulb)}
   h.userData={d,bulbs};root.add(h)
  }scene.add(root);carSignals.set((n.ix+512)*2048+(n.iz+512),{g:root,n})
 }
 for(const c of cars)c.out=1;
 return true;
}
function signalStatus(node,d,t){const phase=(t+(Math.abs(node.ix*7+node.iz*13)%14))%14,horizontal=Math.abs(d[0])>.5;if(horizontal){if(phase<5)return'green';if(phase<6)return'yellow';return'red'}if(phase>=7&&phase<12)return'green';if(phase>=12&&phase<13)return'yellow';return'red'}
function updateCarSignals(t){for(const s of carSignals.values())for(const h of s.g.children){const st=signalStatus(s.n,h.userData.d,t);h.userData.bulbs.forEach((b,i)=>{b.material.emissiveIntensity=(i===(st==='red'?0:st==='yellow'?1:2))?1.65:.035})}}
function carLanePoint(node,d){return{x:node.x-d[1]*LANE,z:node.z+d[0]*LANE}}
function pickNext(c,forced){
 const node=c.node,ns=node.neighbors;let e=null;
 if(forced){e=ns.find(v=>v.dx===c.d[0]&&v.dz===c.d[1])||null}   // پس از گردش راست: جهت قطعهٔ بعدی تحمیلی است
 else{const fwd=ns.filter(v=>!c.d||((v.dx!==-c.d[0]||v.dz!==-c.d[1])&&!(c.d[0]*v.dz-c.d[1]*v.dx>0))),pool=fwd.length?fwd:ns;
  if(!pool.length)return 0;
  // گردش راست اینجا انتخاب نمی‌شود؛ فقط از راهِ پیش‌برنامه (نیازمند آغاز قوس پیش از تقاطع است)
  e=c.d?null:rr(pool);
  if(!e){const straight=pool.find(v=>v.dx===c.d[0]&&v.dz===c.d[1]);const pStraight=(c.twist||0)===0?.93:.8;
   e=(straight&&Math.random()<pStraight)?straight:rr(pool)}}
 if(!e)return 0;
 if(forced)c.twist=0;else{const turned=!!c.d&&(e.dx!==c.d[0]||e.dz!==c.d[1]);c.twist=turned?0:(c.twist||0)+1}
 c.d=[e.dx,e.dz];c.next=e.node;
 // مانورِ تقاطعِ بعدی همین حالا برنامه‌ریزی می‌شود: در گردش راست، قوس باید «پیش از» مرکز تقاطع
 // آغاز شود (از لاین ورودیِ گره هیچ قوس یک‌تکه‌ای به لاین خروجیِ سمت راست وجود ندارد).
 c.plan=null;
 const C=e.node,fwd2=C.neighbors.filter(v=>v.dx!==-c.d[0]||v.dz!==-c.d[1]);
 if(fwd2.length){const st2=fwd2.find(v=>v.dx===c.d[0]&&v.dz===c.d[1]);const p2=(c.twist||0)<=1?.93:.8;
  const out=(st2&&Math.random()<p2)?st2:rr(fwd2);
  if(c.d[0]*out.dz-c.d[1]*out.dx>0){                       // گردش راست در C
   c.plan=[out.dx,out.dz];
   const Qx=C.x-c.d[1]*LANE-out.dz*LANE,Qz=C.z+c.d[0]*LANE+out.dx*LANE;   // برخورد دو خط لاین
   c.tx=Qx-c.d[0]*LANE;c.tz=Qz-c.d[1]*LANE;return 1}      // هدف = نقطهٔ آغاز قوس
 }
 const q=carLanePoint(e.node,c.d);c.tx=q.x;c.tz=q.z;return 1;
}
function carStartTurn(c,incoming,planRight){
 const d=c.d,p0={x:c.g.position.x,z:c.g.position.z},p3=carLanePoint(c.node,d);
 if(planRight){ // گردش راستِ پیش‌برنامه‌شده: ربع‌دایرهٔ تمیز از نقطهٔ شروعِ پیش از تقاطع تا لاین خروجی
  const C=c.node,dout=planRight,k=LANE*.55228475;
  const ex=C.x-incoming[1]*LANE-dout[1]*LANE+dout[0]*LANE,ez=C.z+incoming[0]*LANE+dout[0]*LANE+dout[1]*LANE;
  const p1={x:p0.x+incoming[0]*k,z:p0.z+incoming[1]*k},p2={x:ex-dout[0]*k,z:ez-dout[1]*k},E={x:ex,z:ez};
  let len=0,prev=p0;for(let i=1;i<=12;i++){const u=i/12,v=1-u,pt={x:v*v*v*p0.x+3*v*v*u*p1.x+3*v*u*u*p2.x+u*u*u*E.x,z:v*v*v*p0.z+3*v*v*u*p1.z+3*v*u*u*p2.z+u*u*u*E.z};len+=Math.hypot(pt.x-prev.x,pt.z-prev.z);prev=pt}
  c.turn={p0,p1,p2,p3:E,u:0,len:Math.max(.08,len)};return}
 if(incoming[0]===d[0]&&incoming[1]===d[1]){c.turn=null;return}
 // پیچ ۹۰ درجهٔ چپ: قوسِ ربع‌دایره با شعاع لاین (مرکز قوس = مرکز تقاطع). دوربرگردانِ بن‌بست:
 // قوس U واقعی با استفاده از طول کاشی جاده — نه موی کوچکی که مثل چرخش درجا دیده شود.
 const reverse=incoming[0]===-d[0]&&incoming[1]===-d[1],k=reverse?.8:LANE*.55228475;
 const p1={x:p0.x+incoming[0]*k,z:p0.z+incoming[1]*k},p2={x:p3.x-d[0]*k,z:p3.z-d[1]*k};
 let len=0,prev=p0;for(let i=1;i<=12;i++){const u=i/12,v=1-u,pt={x:v*v*v*p0.x+3*v*v*u*p1.x+3*v*u*u*p2.x+u*u*u*p3.x,z:v*v*v*p0.z+3*v*v*u*p1.z+3*v*u*u*p2.z+u*u*u*p3.z};len+=Math.hypot(pt.x-prev.x,pt.z-prev.z);prev=pt}
 c.turn={p0,p1,p2,p3,u:0,len:Math.max(.08,len)};
}
function carSpawnClear(x,z){for(const o of cars){if(o.out)continue;if(Math.hypot(o.g.position.x-x,o.g.position.z-z)<.92)return false}return true}
function spawnCar(){
 if(!carRoadGraph.length)return;
 for(let attempt=0;attempt<12;attempt++){
  const node=rr(carRoadGraph),g=mkCar(),c={id:++carSerial,g,node,next:null,d:null,tx:0,tz:0,hd:0,v:0,dx:0,dz:0,twist:0,sp:1.45+Math.random()*.55,life:38+Math.random()*42,sc:0,stuck:0,out:0,turn:null};
  if(!pickNext(c))continue;const pos=carLanePoint(node,c.d);if(!carSpawnClear(pos.x,pos.z))continue;
  c.dx=c.d[0];c.dz=c.d[1];g.scale.setScalar(.01);g.position.set(pos.x,hgt(pos.x,pos.z)+.06,pos.z);c.hd=Math.atan2(-c.d[1],c.d[0]);scene.add(g);cars.push(c);return;
 }
}
function carBezier(turn,u){const v=1-u,p=turn.p0,a=turn.p1,b=turn.p2,q=turn.p3;
 const x=v*v*v*p.x+3*v*v*u*a.x+3*v*u*u*b.x+u*u*u*q.x,z=v*v*v*p.z+3*v*v*u*a.z+3*v*u*u*b.z+u*u*u*q.z;
 const dx=3*v*v*(a.x-p.x)+6*v*u*(b.x-a.x)+3*u*u*(q.x-b.x),dz=3*v*v*(a.z-p.z)+6*v*u*(b.z-a.z)+3*u*u*(q.z-b.z);
 return{x,z,dx,dz}}
// سرعت تطبیقی: فاصلهٔ امن در همان لاین حفظ می‌شود؛ ترافیک لاین مقابل سد راه نیست.
// قفل متقابل (روبه‌رویی/تقاطع) با حق‌تقدم شناسه باز می‌شود: دقیقاً یک خودرو پیش می‌رود، دیگری اجازه می‌دهد.
function carSafeSpeed(c,dx,dz){
 let speed=c.sp;
 for(const o of cars){
  if(o===c||o.out)continue;
  const rx=o.g.position.x-c.g.position.x,rz=o.g.position.z-c.g.position.z,dist=Math.hypot(rx,rz);
  const ahead=rx*dx+rz*dz,lateral=Math.abs(rx*dz-rz*dx);
  // خودروی نزدیکِ روبه‌رو یا عبوری از عرض: اگر حق‌تقدم دارم، همین خودرو نباید من را متوقف کند.
  if(dist<.9&&o.id>c.id&&(c.dx*o.dx+c.dz*o.dz)<.5)continue;
  // تماس مستقیم: خودروی شناسهٔ بزرگ‌تر می‌ایستد تا دیگری مسیرش را باز کند.
  if(dist<.42&&o.id<c.id){speed=0;continue}
  // فاصلهٔ طولیِ کافی برای خودرو جلویی؛ خودروهای لاین مقابل مزاحم محسوب نمی‌شوند.
  if(ahead>.02&&ahead<2.35&&lateral<.32)speed=Math.min(speed,Math.max(0,(ahead-1.05)*2.6));
 }
 return speed;
}
function stepCars(dt,t){
 HL.emissiveIntensity=.15+2.2*NT;HQG.opacity=.04+.75*NT;HQGL.emissiveIntensity=.06+1.7*NT;ffStep(t);for(const p of cits)if(p.lan)p.lan.visible=NT>.4;if(hqDish)hqDish.rotation.y=t*.7;
 rebuildCarRoadGraph();updateCarSignals(t);
 const people=Math.max(0,POP||cits.length),roadsN=roadC.length;
 const base=roadsN>=3?Math.min(6,1+(roadsN/5|0)):0,activity=Math.min(1.8,.55+homesN*.12+people*.035),want=base?Math.min(8,Math.max(1,Math.round(base*activity))):0,tg=Math.round(want*(1-NT*.75));
 if((spT-=dt)<=0){spT=2+Math.random()*4;if(cars.filter(c=>!c.out).length<tg)spawnCar()}
 for(let i=cars.length-1;i>=0;i--){const c=cars[i],g=c.g;
  if((c.life-=dt)<=0)c.out=1;
  c.sc=Math.max(0,Math.min(1,c.sc+(c.out?-dt*2:dt*2)));g.scale.setScalar(Math.max(.01,c.sc)*1.3);
  if(c.out&&c.sc<=0){scene.remove(g);TWE.Pools.put('car',g);cars.splice(i,1);continue}   // بازگشت به استخر (بدون حذف هندسه)
  if(c.out)continue;
  let vx,vz,dist=0;
  if(c.turn){const q=carBezier(c.turn,c.turn.u),mag=Math.hypot(q.dx,q.dz)||1;vx=q.dx/mag;vz=q.dz/mag}
  else{const dx=c.tx-g.position.x,dz=c.tz-g.position.z;dist=Math.hypot(dx,dz)||1;vx=dx/dist;vz=dz/dist}
  c.dx=vx;c.dz=vz;                                  // جهت فعلی حرکت؛ مبنای تشخیص روبه‌رویی در فاصله‌گذاری
  let desired=carSafeSpeed(c,vx,vz),redStop=false,maxMove=Infinity;
  // توقف قرمز/زرد: حدود ۱٫۲۸ واحد پیش از «مرکز تقاطع» (نه هدف قطعه) تا دماغه پشت خط توقف بایستد.
  // فقط تقاطعِ چراغ‌دار (فیلد tl) قانون چراغ دارد؛ تقاطع بدون چراغ آزاد است (کنترل با مدیر).
  if(!c.turn&&c.next&&c.next.neighbors.length>=3&&c.next.b&&c.next.b.tl){
   const light=signalStatus(c.next,c.d,t);
   if(light!=='green'){redStop=true;desired=0;
    const nx=c.next.x-g.position.x,nz=c.next.z-g.position.z,dn=Math.hypot(nx,nz)||1;
    const app=Math.max(.25,(vx*nx+vz*nz)/dn);          // مؤلفهٔ پیشروی به‌سمت تقاطع
    maxMove=Math.max(0,(dn-1.28)/app)}
  }
  c.v+=(desired-c.v)*Math.min(1,dt*7);let move=Math.max(0,c.v)*dt;
  if(redStop){move=Math.min(move,maxMove);if(maxMove<=.002)c.v=0}
  if(c.turn){const tr=c.turn;tr.u=Math.min(1,tr.u+move/tr.len);const q=carBezier(tr,tr.u);g.position.x=q.x;g.position.z=q.z;
   if(tr.u>=1){g.position.x=tr.p3.x;g.position.z=tr.p3.z;c.turn=null;}
   // جهت خودرو = مماسِ دقیق مسیر؛ چون مماس بزیه پیوسته است، سرعت چرخش با سرعت خودرو هماهنگ می‌ماند
   // و نه لَگیِ پس از پیچ رخ می‌دهد نه چرخش ناگهانی در فریم‌های کم‌نرخ.
   c.hd=Math.atan2(-q.dz,q.dx);
  }else if(dist<=move+.025){
   g.position.x=c.tx;g.position.z=c.tz;const incoming=c.d.slice();c.node=c.next;
   const wasPlan=c.plan;c.plan=null;
   if(wasPlan){c.d=wasPlan;if(!pickNext(c,true)){c.out=1;continue}carStartTurn(c,incoming,wasPlan)}
   else{if(!pickNext(c)){c.out=1;continue}carStartTurn(c,incoming,null)}
  }else{
   g.position.x+=vx*move;g.position.z+=vz*move;c.hd=Math.atan2(-vz,vx);
  }
  g.position.y=.06+hgt(g.position.x,g.position.z)+(c.v>.2?Math.sin(t*18+c.id)*.004:0);g.rotation.y=c.hd;   // ارتفاع = زمینِ واقعی + ۰٫۰۶ ثابتِ قبل ⇒ روی جادهٔ بلندشدهٔ ساحل هم هم‌تراز می‌ماند
 }
}
