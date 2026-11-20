// ═══ مسیریابی شهروندان (شبکهٔ هزینه‌دار + A*) و مالکیت خانه‌ها. ═══
'use strict';
// ═══ ناوبری v6: شبکهٔ دقیق U با «هزینه» (پیاده‌رو کم‌هزینه، جاده پرهزینه) + A*
const NS=U,NN=360,NO=-45,nav=new Uint8Array(NN*NN),cost=new Float32Array(NN*NN),gs=new Float32Array(NN*NN),prv=new Int32Array(NN*NN);
let regH=[],hqH=null,homes=[],mkts=[],farms=[],treeSp=[],roadC=[],pathC=[],ctr=[0,0],RAD=10;const roadSet=new Set(),pathSet=new Set(),homeById=new Map();
const ci=v=>Math.floor((v-NO)/NS),cw=i=>NO+(i+.5)*NS,walk=(x,z)=>{const i=ci(x),j=ci(z);return i>=0&&j>=0&&i<NN&&j<NN&&!nav[j*NN+i]};
const NAV_RIVER=[[-146,22],[-96,22],[-96,6],[-40,6],[-40,24],[16,24],[16,4],[72,4],[72,18],[146,18]]; // مسیر شکستهٔ رود — هماهنگ با RIVER_PTS در 06-world-scenery.js
const pondM=(x,z)=>{for(let i=1;i<NAV_RIVER.length;i++){const a=NAV_RIVER[i-1],b=NAV_RIVER[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));if(Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz)<4.1)return true}return false}; // حریم رودخانه برای جلوگیری از عبور شهروند از آب
function blk(x0,x1,z0,z1){for(let j=Math.max(0,ci(z0));j<=Math.min(NN-1,ci(z1));j++)for(let i=Math.max(0,ci(x0));i<=Math.min(NN-1,ci(x1));i++)nav[j*NN+i]=1}
const PW=FOOT.road[0]*U*PATH_WIDTH_RATIO,ROADC=3.5,dry=(x,z)=>cost[ci(z)*NN+ci(x)]<3;
function setCost(X,Z,hx,hz,v,force){for(let j=ci(Z-hz);j<=ci(Z+hz);j++)for(let i=ci(X-hx);i<=ci(X+hx);i++){if(i<0||j<0||i>=NN||j>=NN)continue;if(Math.abs(cw(i)-X)>hx||Math.abs(cw(j)-Z)>hz)continue;const k=j*NN+i;cost[k]=force?v:Math.min(cost[k],v)}}
function rebuildNav(w){nav.fill(0);cost.fill(1.5);homes=[];mkts=[];farms=[];treeSp=[];roadC=[];pathC=[];homeById.clear();occ.length=0;
for(let j=0;j<NN;j++)for(let i=0;i<NN;i++){const x=cw(i),z=cw(j);if(Math.abs(x)>38.5||Math.abs(z)>38.5||pondM(x,z))nav[j*NN+i]=1}
const trees=[],TL=fpTiles(w.buildings);let sx=0,sz=0,n=0;
for(const b of w.buildings){const X=b.x*U,Z=b.z*U,a=b.rot*Math.PI/180,q=b.rot%180?1:0,fx=Math.sin(a),fz=Math.cos(a);const RR=fpRects(b,TL);for(const r of RR)occ.push(r);const bk=r=>blk(r[0]+.001,r[1]-.001,r[2]+.001,r[3]-.001);
if(b.type==='house'||b.type==='hq'){bk(RR[0]);const h={id:b.id,x:X,z:Z,fx,fz,hq:b.type==='hq'};homes.push(h);homeById.set(b.id,h)}
else if(b.type==='market'){bk(RR[0]);mkts.push({x:X+fx*1.25,z:Z+fz*1.25,cx:X,cz:Z})}
else if(b.type==='tree'){bk(RR[0]);trees.push([X,Z])}
else if(b.type==='farm'){bk(RR[0]);farms.push({x:X,z:Z})}
else if(b.type==='road')roadC.push({x:X,z:Z,b});
else if(b.type==='path')pathC.push({x:X,z:Z,b})
if(b.type!=='tree'){sx+=X;sz+=Z;n++}}
// شاخص‌های سریعِ کاشی جاده/پیاده‌رو برای خودروها و تشخیص محل گفت‌وگوی شهروندان.
// کلیدها همان مختصات شبکه‌ای‌اند که مصرف‌کننده‌ها با round(world/CELL) می‌سازند.
roadSet.clear();for(const r of roadC)roadSet.add(Math.round(r.x/CELL)+','+Math.round(r.z/CELL));
pathSet.clear();for(const p of pathC)pathSet.add(Math.round(p.x/CELL)+','+Math.round(p.z/CELL));
regH=homes.filter(h=>!h.hq).sort((a,b)=>a.id-b.id);hqH=homes.find(h=>h.hq)||null;ctr=n?[sx/n,sz/n]:[0,0];let E=0;for(const b of w.buildings)if(b.type!=='tree')E=Math.max(E,Math.hypot(b.x*U-ctr[0],b.z*U-ctr[1]));
RAD=Math.min(34,Math.max(8+2.6*Math.log2(1+((w.stats&&w.stats.pop)||1)),E+5)); // با رشد جمعیت، محدودهٔ حرکت بزرگ‌تر می‌شود
for(const{x:X,z:Z}of roadC)setCost(X,Z,1,1,ROADC,1); // آسفالت: گران، برای ماشین‌هاست
for(const{x:X,z:Z,b}of pathC){const hw=PW/2;setCost(X,Z,hw,hw,.5);
 // مسیرهای مجاور از تماس واقعیِ footprint تشخیص داده می‌شوند؛ اتصال، سلول اضافه اشغال نمی‌کند.
 for(const r of roadC){const d=fpTouchDir(r.b,b);if(d<0)continue;const dx=[0,1,0,-1][d],dz=[-1,0,1,0][d],rx=r.x+dx*(1-hw),rz=r.z+dz*(1-hw),cx=dx?rx:X,cz=dz?rz:Z;setCost(cx,cz,hw,hw,.7)}}
for(const[X,Z]of trees)for(const[a,b]of[[.8,0],[-.8,0],[0,.8],[0,-.8]])if(walk(X+a,Z+b)){treeSp.push({x:X+a,z:Z+b,tx:X,tz:Z});break}
refreshDeco()}
function freeNear(cx,cz,R){for(let t=0;t<40;t++){const x=cx+(Math.random()-.5)*2*R,z=cz+(Math.random()-.5)*2*R;if(walk(x,z)&&dry(x,z))return[x,z]}for(let r=1;r<80;r++)for(let a=0;a<12;a++){const x=cx+Math.cos(a/12*6.283)*r*.5,z=cz+Math.sin(a/12*6.283)*r*.5;if(walk(x,z))return[x,z]}return[0,0]}
const D8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],hp=[],hf=[];
// با شبکهٔ U تعداد گره‌ها چهار برابر نسخهٔ قبلی است؛ فقط گره‌های لمس‌شده در هر جست‌وجو مقداردهی می‌شوند.
const pathSeen=new Uint32Array(NN*NN),PATH_NODE_BUDGET=MOB?2200:4800;let pathRun=0;
function hpush(f,n){let i=hp.length;hp.push(n);hf.push(f);while(i){const p=(i-1)>>1;if(hf[p]<=f)break;hp[i]=hp[p];hf[i]=hf[p];i=p}hp[i]=n;hf[i]=f}
function hpop(){const n=hp[0],ln=hp.pop(),lf=hf.pop();if(hp.length){let i=0;for(;;){let c=2*i+1;if(c>=hp.length)break;if(c+1<hp.length&&hf[c+1]<hf[c])c++;if(hf[c]>=lf)break;hp[i]=hp[c];hf[i]=hf[c];i=c}hp[i]=ln;hf[i]=lf}return n}
function findPath(sx,sz,tx,tz){
const si=ci(sx),sj=ci(sz),ti=ci(tx),tj=ci(tz);
if(si<0||sj<0||ti<0||tj<0||si>=NN||sj>=NN||ti>=NN||tj>=NN)return null;
const s=sj*NN+si,t=tj*NN+ti;if(nav[t]||nav[s])return null;if(s===t)return[];
pathRun=(pathRun+1)>>>0;if(!pathRun){pathSeen.fill(0);pathRun=1}const run=pathRun;
hp.length=hf.length=0;pathSeen[s]=run;gs[s]=0;prv[s]=s;
const tX=t%NN,tZ=(t/NN)|0,H=(x,z)=>{const a=Math.abs(x-tX),b=Math.abs(z-tZ);return(Math.max(a,b)+.414*Math.min(a,b))*NS};hpush(H(si,sj),s);let it=0;
while(hp.length&&it++<PATH_NODE_BUDGET){const c=hpop();if(c===t)break;const x=c%NN,z=(c/NN)|0,gc=gs[c];
for(const[dx,dz]of D8){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=NN||nz>=NN)continue;const n=nz*NN+nx;if(nav[n])continue;if(dx&&dz&&(nav[z*NN+nx]||nav[nz*NN+x]))continue;const ng=gc+cost[n]*(dx&&dz?1.414:1);if(pathSeen[n]!==run||ng<gs[n]){pathSeen[n]=run;gs[n]=ng;prv[n]=c;hpush(ng+H(nx,nz),n)}}}
if(pathSeen[t]!==run||prv[t]<0)return null;const raw=[];for(let c=t;c!==s;c=prv[c]){if(c<0||pathSeen[c]!==run)return null;raw.push([cw(c%NN),cw((c/NN)|0)])}raw.reverse();
const out=[];for(let i=0;i<raw.length;i++){const a=raw[i-1]||[sx,sz],b=raw[i],n=raw[i+1];if(n&&Math.abs((b[0]-a[0])*(n[1]-b[1])-(b[1]-a[1])*(n[0]-b[0]))<1e-6)continue;out.push(b)}return out}
// ═══ مالکیت خانه‌ها: دفتر مدیرعامل = بنیان‌گذار؛ بقیه به ترتیب یک خانه برای هر نفر (اگر خانه کم باشد، چند نفر مشترک)
const homeFor=i=>i===0&&hqH?hqH:regH.length?regH[(i-(hqH?1:0))%regH.length]:null;
const ownersIdx=h=>{const r=[];for(let i=0;i<cits.length;i++)if(homeFor(i)===h)r.push(i);return r};
function bInfo(b){const h=homeById.get(b.id);if(!h)return W.catalog[b.type]||'';const o=ownersIdx(h);
if(h.hq)return(W.catalog.hq||'دفتر مدیرعامل')+' · '+nameOf(0);
if(!o.length)return'خانهٔ خالی (هنوز صاحبی ندارد)';const nm=o.slice(0,3).map(nameOf).join('، ');return'خانهٔ '+nm+(o.length>3?' و '+fa(o.length-3)+' نفر دیگر':'')}
function ownerHi(b){const h=homeById.get(b.id);if(!h)return;ownersIdx(h).slice(0,2).forEach(i=>{const c=cits[i];if(c&&!c.hid)dgSay(c,[h.hq?'ownq':'own'],2800,'o')})}
