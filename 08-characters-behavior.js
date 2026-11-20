// ═══ مغز شهروندان: حالت‌ها (راه رفتن، خانه، مزرعه، بازار، گپ، نشستن…)، حرکت، جاخالی دادن و سلام‌وعلیک. ═══
'use strict';
// ═══ مغز شهروندان v5: حالت‌ها = راه رفتن، رفتن به خانه (ورود/خروج از در)، مزرعه، بازار، گپ، نشستن زیر درخت، قدم‌زدن کنار رودخانه، قدم زدن روی جاده، استراحت ═══

const inR=p=>Math.hypot(p.x-ctr[0],p.z-ctr[1])<RAD,rp=a=>{const f=a.filter(inR);return f.length?f[Math.random()*f.length|0]:null};
function pk(o){let s=0;for(const a of o)s+=a[0];let r=Math.random()*s;for(const a of o)if((r-=a[0])<=0)return a;return o[o.length-1]}
function turn(c,ang,k){const g=c.g;let da=ang-g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));g.rotation.y+=da*Math.min(1,k)}
function moveTo(c,x,z,sp,dt,chk){const g=c.g,dx=x-g.position.x,dz=z-g.position.z,d=Math.hypot(dx,dz),st=sp*dt;if(d<=st){g.position.x=x;g.position.z=z;return 1}
const nx=g.position.x+dx/d*st,nz=g.position.z+dz/d*st;if(chk&&!walk(nx,nz))return-1;g.position.x=nx;g.position.z=nz;turn(c,Math.atan2(dx,dz),dt*9);
c.ph+=dt*sp*8;const w=Math.sin(c.ph)*.65,k=Math.min(1,dt*14);c.lL.rotation.x+=(w-c.lL.rotation.x)*k;c.lR.rotation.x+=(-w-c.lR.rotation.x)*k;c.aL.rotation.x+=(-w*.8-c.aL.rotation.x)*k;c.aR.rotation.x+=(w*.8-c.aR.rotation.x)*k;
c.by+=(Math.abs(Math.sin(c.ph))*.03-c.by)*Math.min(1,dt*10);g.rotation.x*=.8;return 0}
function goTo(c,x,z,act=''){const g=c.g;if(PB--<=0){c.act='';c.st='stay';c.tm=.15+Math.random()*.4;return}if(!walk(x,z)||!dry(x,z)){const f=freeNear(x,z,2);x=f[0];z=f[1]}const p=findPath(g.position.x,g.position.z,x,z);c.act=act;
if(!p){c.act='';c.st='stay';c.tm=1+Math.random()*2;return}c.path=p;if(p.length)c.st='walk';else arrive(c)}
function pathGoal(c,far){if(!pathC.length)return;let pl=pathC.filter(inR);if(!pl.length)pl=pathC;
if(far!==false){const px=c.g.position.x,pz=c.g.position.z,nr=pl.filter(p=>{const d=Math.hypot(p.x-px,p.z-pz);return d>2&&d<14});if(nr.length)pl=nr}
const t=rr(pl);goTo(c,t.x+(Math.random()-.5)*.5,t.z+(Math.random()-.5)*.5,'path')}
function newGoal(c){const g=c.g,px=g.position.x,pz=g.position.z,nt=NT>.55,dk=NT>.2,tr=c.tr,o=[];c.pt=null;c.cv=null;c.fa=null;c.act='';
if(Math.hypot(px-ctr[0],pz-ctr[1])>RAD*1.05){if(pathC.length&&Math.random()<.6)return pathGoal(c,false);const f=freeNear(ctr[0],ctr[1],4);return goTo(c,f[0],f[1])} // افسار: از مرکز دور نشو
if(crowd(px,pz)>=5&&Math.random()<.85){const an=Math.random()*6.283,r2=RAD*.85*Math.sqrt(Math.random()),f=freeNear(ctr[0]+Math.cos(an)*r2,ctr[1]+Math.sin(an)*r2,3);return goTo(c,f[0],f[1])}
const h=homeFor(c.i);
if(h)o.push([nt?9:dk?2.5:.4+.7*(1-tr.so),'home']);
if(!nt&&farms.length)o.push([2.4*(.3+1.4*tr.f),'farm']);
if(!nt&&mkts.length)o.push([2*(.3+1.4*tr.s),'shop']);
if(pathC.length)o.push([nt?.7:2.8,'path']);
o.push([(nt?.45:.8)*(.3+tr.so),'chat'],[nt?.6:.9,'sit'],[1.2,'free'],[1,'idle']);if(!nt)o.push([.6,'view']);
const k=pk(o)[1];
if(k==='home'){c.hs=h;return goTo(c,h.x+h.fx*1.25,h.z+h.fz*1.25,'enter')}
if(k==='farm'){const f=rp(farms);if(f)return goTo(c,f.x+(Math.random()-.5)*.7,f.z+(Math.random()-.5)*.7,'farm')}
else if(k==='shop'){const m=rp(mkts);if(m){c.fa=[m.cx,m.cz];return goTo(c,m.x+(Math.random()-.5)*.8,m.z,'shop')}}
else if(k==='path')return pathGoal(c);
else if(k==='chat'&&dgNow()-DG.gC>9){const L=cits.filter(p=>p!==c&&!p.hid&&p.st==='stay'&&!p.act&&Math.hypot(p.g.position.x-px,p.g.position.z-pz)<16);
if(L.length){const p=rr(L),dx=px-p.g.position.x,dz=pz-p.g.position.z,d=Math.hypot(dx,dz)||1;c.pt=p;return goTo(c,p.g.position.x+dx/d*.75,p.g.position.z+dz/d*.75,'chat')}}
else if(k==='sit'){const s=rp(treeSp);if(s){c.fa=[s.tx,s.tz];return goTo(c,s.x,s.z,'sit')}}
else if(k==='view'){for(let t=0;t<14;t++){const a=Math.random()*6.283,x=-17+Math.cos(a)*9.9,z=-17+Math.sin(a)*7.3;if(walk(x,z)&&inR({x,z})){c.fa=[-17,-17];return goTo(c,x,z,'view')}}}
else if(k==='free'){const b=Math.hypot(px-ctr[0],pz-ctr[1])>RAD*.6?ctr:[px,pz],f=freeNear(b[0],b[1],5);return goTo(c,f[0],f[1])}
c.st='stay';c.tm=2+Math.random()*4}
function arrive(c){const a=c.act;c.st='stay';c.tm=2+Math.random()*4;c.ty=null;c.lk=0;
if(a==='enter'){const h=c.hs;if(h&&homeById.has(h.id)){c.st='enter';c.dp=[h.x+h.fx*.55,h.z+h.fz*.55]}else c.act='';return}
if(a==='farm'){c.tm=7+Math.random()*9;if(Math.random()<.25)dgSay(c,['farmw'],3000,'s')}
else if(a==='shop'){c.tm=3.5+Math.random()*4;if(Math.random()<.4)dgSay(c,['shop'],2400,'s')}
else if(a==='sit'){c.tm=9+Math.random()*9;if(Math.random()<.2)dgSay(c,['sitl'],3000,'s')}
else if(a==='view'){c.tm=6+Math.random()*6;if(Math.random()<.25)dgSay(c,['viewl'],3000,'s')}
else if(a==='chat'){const p=c.pt;if(p&&p.st==='stay'&&!p.act&&!p.hid){p.act='chat';p.pt=c;p.fa=c.fa=null;c.talk=p.talk=0;const ok=dgConv(c,p);c.tm=p.tm=ok?c.cv.L.length*3.4+2+Math.random()*2:3+Math.random()*3}else{c.act='';c.tm=1}}
else if(a==='path'){if(c.chain<3&&Math.random()<.6){c.chain++;return pathGoal(c)}c.chain=0}}
function leave(c){const g=c.g,h=c.hs&&homeById.get(c.hs.id);c.hid=0;g.visible=true;
if(!h){const p=freeNear(g.position.x,g.position.z,3);g.position.set(p[0],0,p[1]);c.st='stay';c.act='';c.tm=.5;return}
g.position.set(h.x+h.fx*.55,0,h.z+h.fz*.55);g.rotation.y=Math.atan2(h.fx,h.fz);c.st='exit';c.dp=[h.x+h.fx*1.25,h.z+h.fz*1.25];c.act=''}
function pose(c,t){const s=Math.sin(t*1.6+c.ph)*.05;switch(c.act){
case'farm':return[0,0,-.9,-.9,0,.35+.12*Math.sin(t*4+c.ph)];
case'sit':return[-1.45,-1.45,-.5,-.5,-.14,0];
case'chat':return[0,0,-.15,-.9+Math.sin(t*5+c.ph)*.5*(c.talk>0?1:.2),0,0];
case'shop':return[0,0,-.2,-.6+s*2,0,0];
default:return[0,0,s,-s,0,0]}}
const GR=new Map();const crowd=(x,z)=>{const kx=Math.floor(x/1.2),kz=Math.floor(z/1.2);let n=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=GR.get((kx+a)*4096+kz+b);if(l)n+=l.length}return n};
// ═══ حرکت هوشمند: جاخالی‌دادن (سمت راست رد می‌شوند)، سلام‌وعلیک وقتی به هم می‌رسند، و بعد جدا شدن ═══

function steer(c,dt){const g=c.g,ax=g.position.x,az=g.position.z,hx=Math.sin(g.rotation.y),hz=Math.cos(g.rotation.y),kx=Math.floor(ax/1.2),kz=Math.floor(az/1.2);let sx=0,sz=0;
for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=GR.get((kx+a)*4096+kz+b);if(!l)continue;for(const B of l){if(B===c||B.hid)continue;const dx=B.g.position.x-ax,dz=B.g.position.z-az,d=Math.hypot(dx,dz);if(d<1e-3||d>1.15)continue;const f=(dx*hx+dz*hz)/d;if(f<.25)continue;const cr=hx*dz-hz*dx,s=Math.abs(cr)<.08?1:(cr>0?1:-1),w=(1.15-d)*f;sx+=hz*s*w;sz+=-hx*s*w}}
if(sx||sz){const m=Math.min(1,dt*1.6)*.9,nx=ax+sx*m,nz=az+sz*m;if(walk(nx,nz)){g.position.x=nx;g.position.z=nz}}}
function meet(A,B,dx,dz,d){if(d<.2||A.mc>0||B.mc>0||crowd(A.g.position.x,A.g.position.z)>5)return;const wa=A.st==='walk',wb=B.st==='walk';if(!wa&&!wb)return;
const fA=(dx*Math.sin(A.g.rotation.y)+dz*Math.cos(A.g.rotation.y))/d,fB=-(dx*Math.sin(B.g.rotation.y)+dz*Math.cos(B.g.rotation.y))/d;
if(wa&&wb){if(fA<.5||fB<.5)return}else{const S=wa?B:A,f=wa?fA:fB;if(f<.5||S.act||S.hid||S.rx>0||S.st!=='stay')return}
{const ax=A.g.position.x,az=A.g.position.z,px=Math.cos(A.g.rotation.y)*.8,pz=-Math.sin(A.g.rotation.y)*.8;if(!walk(ax+px,az+pz)||!walk(ax-px,az-pz))return}
const p=.12+.3*(((A.tr&&A.tr.so)||.5)+((B.tr&&B.tr.so)||.5))/2;A.mc=B.mc=16+Math.random()*20;if(Math.random()>p)return;
const gt=1.3+Math.random()*1.2;for(const [X,Y] of [[A,B],[B,A]])if(X.st==='walk'){X.st='greet';X.gt=gt;X.gp=Y}
dgGreet(wa?A:B,wa?B:A)}
function stepCits(dt,t){
// A* روی شبکهٔ U پرهزینه‌تر از شبکهٔ قدیمی است؛ تعداد شروع مسیر در هر فریم محدود می‌شود.
PB=MOB?1:2;for(const c of cits){const g=c.g,S=c.st;
if(S==='inside'){if(!c.hs||!homeById.has(c.hs.id))leave(c);else if((c.tm-=dt)<=0){if(NT>.6&&Math.random()<.75)c.tm=15+Math.random()*30;else leave(c)}continue}
if(S!=='enter'&&S!=='exit'&&!walk(g.position.x,g.position.z)){const p=freeNear(g.position.x,g.position.z,3);g.position.set(p[0],0,p[1]);c.path=[];c.st='stay';c.act='';c.tm=.3}
if(S==='enter'){if(moveTo(c,c.dp[0],c.dp[1],c.sp*.85,dt,0)===1){c.hid=1;g.visible=false;c.st='inside';c.tm=NT>.55?25+Math.random()*50:5+Math.random()*14}}
else if(S==='exit'){if(moveTo(c,c.dp[0],c.dp[1],c.sp*.85,dt,0)===1){c.st='stay';c.tm=.5+Math.random()*1.5;c.ty=null}}
else if(S==='greet'){const q=c.gp;if(q&&!q.hid)turn(c,Math.atan2(q.g.position.x-g.position.x,q.g.position.z-g.position.z),dt*8);
const k=Math.min(1,dt*8);c.lL.rotation.x+=(0-c.lL.rotation.x)*k;c.lR.rotation.x+=(0-c.lR.rotation.x)*k;c.aL.rotation.x+=(0-c.aL.rotation.x)*k;c.aR.rotation.x+=((c.gt>.6?-2.4+Math.sin(t*14)*.45:0)-c.aR.rotation.x)*k;c.by+=(0-c.by)*k;
if((c.gt-=dt)<=0){c.st=c.path&&c.path.length?'walk':'stay';c.gp=null;if(c.st==='stay')c.tm=.3}}
else if(S==='walk'){const p=c.path[0];if(!p)arrive(c);else{const r=moveTo(c,p[0],p[1],c.sp*(c.act==='path'?.9:1),dt,1);if(r===0)steer(c,dt);if(r===1){c.path.shift();if(!c.path.length)arrive(c)}else if(r<0){c.path=[];c.st='stay';c.act='';c.tm=.4}}}
else{const T=pose(c,t),k=Math.min(1,dt*7);c.lL.rotation.x+=(T[0]-c.lL.rotation.x)*k;c.lR.rotation.x+=(T[1]-c.lR.rotation.x)*k;c.aL.rotation.x+=(T[2]-c.aL.rotation.x)*k;c.aR.rotation.x+=(T[3]-c.aR.rotation.x)*k;c.by+=(T[4]-c.by)*k;g.rotation.x+=(T[5]-g.rotation.x)*k;c.body.scale.y=1+Math.sin(t*2+c.ph)*.015;
const p=c.pt;
if(c.act==='chat'&&p&&p.pt===c){turn(c,Math.atan2(p.g.position.x-g.position.x,p.g.position.z-g.position.z),dt*5);c.talk-=dt;const v=c.cv;if(v&&(v.t-=dt)<=0)dgTurn(c,p)}
else if(c.fa)turn(c,Math.atan2(c.fa[0]-g.position.x,c.fa[1]-g.position.z),dt*4);
else{if(c.ty==null)c.ty=g.rotation.y;if((c.lk-=dt)<=0){c.lk=1.5+Math.random()*3;c.ty=g.rotation.y+(Math.random()-.5)*2}turn(c,c.ty,dt*3)}
if((c.dc=(c.dc||0)-dt)<=0){c.dc=1+Math.random();if(S==='stay'&&c.act!=='chat'&&c.tm>.8&&crowd(g.position.x,g.position.z)>=6)c.tm=.2+Math.random()}
if((c.tm-=dt)<=0){if(c.act==='chat'&&p&&p.pt===c)p.tm=0;newGoal(c)}}
if(c.hid)continue;g.position.y=hgt(g.position.x,g.position.z)+c.by;   // پایه = زمینِ واقعی (کنار رود روی جالیِ ساحل) + تپشِ قدم؛ در مرکزِ شهر زمین ۰ است ⇒ بدون تغییر
if(c.rx>0){c.rx-=dt;const u=1.2-c.rx;g.position.y+=Math.max(0,Math.sin(u*Math.PI*3))*.28;c.aR.rotation.x=-2.7+Math.sin(u*22)*.5;c.aL.rotation.x=-2.7+Math.cos(u*22)*.5}}
// فاصله‌گیری نرم با شبکهٔ فضایی (سریع حتی با صدها نفر) + ثبت تراکم
GR.clear();for(const A of cits){if(A.hid||A.st==='enter'||A.st==='exit')continue;const k=Math.floor(A.g.position.x/1.2)*4096+Math.floor(A.g.position.z/1.2),l=GR.get(k);l?l.push(A):GR.set(k,[A])}
for(const A of cits){if(A.hid||A.st==='enter'||A.st==='exit')continue;if(A.mc>0)A.mc-=dt;const ax=A.g.position.x,az=A.g.position.z,kx=Math.floor(ax/1.2),kz=Math.floor(az/1.2);
for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=GR.get((kx+a)*4096+kz+b);if(!l)continue;for(const B of l){if(B.i<=A.i)continue;let dx=B.g.position.x-A.g.position.x,dz=B.g.position.z-A.g.position.z,d=Math.hypot(dx,dz);if(d<1e-4){dx=Math.random()-.5;dz=Math.random()-.5;d=Math.hypot(dx,dz)||1}
if(d<.95)meet(A,B,dx,dz,d);if(d<.55){const q=(.55-d)*Math.min(1,dt*7)*.5/d,ox=dx*q,oz=dz*q;if(walk(A.g.position.x-ox,A.g.position.z-oz)){A.g.position.x-=ox;A.g.position.z-=oz}if(walk(B.g.position.x+ox,B.g.position.z+oz)){B.g.position.x+=ox;B.g.position.z+=oz}}}}}}
