// ═══ مسیریابی شهروندان (شبکهٔ هزینه‌دار + A*) و مالکیت خانه‌ها. ═══
'use strict';
// ═══ ناوبری v5: شبکهٔ ۰٫۵ واحدی با «هزینه» (جاده ارزان، چمن گران) + A* ⇒ آدم‌ها کنار جاده‌ها راه می‌روند و وارد آب/ساختمان نمی‌شوند
const NS=.5,NN=180,NO=-45,nav=new Uint8Array(NN*NN),cost=new Float32Array(NN*NN),gs=new Float32Array(NN*NN),prv=new Int32Array(NN*NN);
let regH=[],hqH=null,homes=[],mkts=[],farms=[],treeSp=[],roadC=[],pathC=[],ctr=[0,0],RAD=10;const roadSet=new Set(),pathSet=new Set(),homeById=new Map();
const ci=v=>Math.floor((v-NO)/NS),cw=i=>NO+(i+.5)*NS,walk=(x,z)=>{const i=ci(x),j=ci(z);return i>=0&&j>=0&&i<NN&&j<NN&&!nav[j*NN+i]};
const pondM=(x,z)=>((x+17)/9.2)**2+((z+17)/6.6)**2<1; // برکه + حاشیهٔ امن ~۱ واحد
function blk(x0,x1,z0,z1){for(let j=Math.max(0,ci(z0));j<=Math.min(NN-1,ci(z1));j++)for(let i=Math.max(0,ci(x0));i<=Math.min(NN-1,ci(x1));i++)nav[j*NN+i]=1}
const PW=1,ROADC=3.5,D4=[[0,-1],[1,0],[0,1],[-1,0]],dry=(x,z)=>cost[ci(z)*NN+ci(x)]<3;
function setCost(X,Z,hx,hz,v,force){for(let j=ci(Z-hz);j<=ci(Z+hz);j++)for(let i=ci(X-hx);i<=ci(X+hx);i++){if(i<0||j<0||i>=NN||j>=NN)continue;if(Math.abs(cw(i)-X)>hx||Math.abs(cw(j)-Z)>hz)continue;const k=j*NN+i;cost[k]=force?v:Math.min(cost[k],v)}}
function rebuildNav(w){nav.fill(0);cost.fill(1.5);homes=[];mkts=[];farms=[];treeSp=[];roadC=[];roadSet.clear();pathC=[];pathSet.clear();homeById.clear();occ.clear();
for(let j=0;j<NN;j++)for(let i=0;i<NN;i++){const x=cw(i),z=cw(j);if(Math.abs(x)>38.5||Math.abs(z)>38.5||pondM(x,z))nav[j*NN+i]=1}
const trees=[];let sx=0,sz=0,n=0;
for(const b of w.buildings){const X=b.x*CELL,Z=b.z*CELL,a=b.rot*Math.PI/180,q=b.rot%180?1:0,fx=Math.sin(a),fz=Math.cos(a);occ.add(b.x+','+b.z);
if(b.type==='house'||b.type==='hq'){const hx=q?.9:1,hz=q?1:.9;blk(X-hx,X+hx,Z-hz,Z+hz);const h={id:b.id,x:X,z:Z,fx,fz,hq:b.type==='hq'};homes.push(h);homeById.set(b.id,h)}
else if(b.type==='market'){const hx=q?.5:1.1,hz=q?1.1:.5;blk(X-hx,X+hx,Z-hz,Z+hz);mkts.push({x:X+fx*1.25,z:Z+fz*1.25,cx:X,cz:Z})}
else if(b.type==='tree'){blk(X-.4,X+.4,Z-.4,Z+.4);trees.push([X,Z])}
else if(b.type==='farm')farms.push({x:X,z:Z});
else if(b.type==='road'){roadC.push({x:X,z:Z});roadSet.add(b.x+','+b.z)}
else if(b.type==='path'){pathC.push({x:X,z:Z});pathSet.add(b.x+','+b.z)}
if(b.type!=='tree'){sx+=X;sz+=Z;n++}}
regH=homes.filter(h=>!h.hq).sort((a,b)=>a.id-b.id);hqH=homes.find(h=>h.hq)||null;ctr=n?[sx/n,sz/n]:[0,0];let E=0;for(const b of w.buildings)if(b.type!=='tree')E=Math.max(E,Math.hypot(b.x*CELL-ctr[0],b.z*CELL-ctr[1]));
RAD=Math.min(34,Math.max(8+2.6*Math.log2(1+((w.stats&&w.stats.pop)||1)),E+5)); // با رشد جمعیت، محدودهٔ حرکت بزرگ‌تر می‌شود
for(const{x:X,z:Z}of roadC)setCost(X,Z,1,1,ROADC,1); // آسفالت: گران، برای ماشین‌هاست
for(const{x:X,z:Z}of pathC){const cx=Math.round(X/CELL),cz=Math.round(Z/CELL),hw=PW/2,ln=1-hw;setCost(X,Z,hw,hw,.5);
for(const[dx,dz]of D4){const k=(cx+dx)+','+(cz+dz);if(pathSet.has(k)||roadSet.has(k))setCost(X+dx*(hw+ln/2),Z+dz*(hw+ln/2),dx?ln/2:hw,dz?ln/2:hw,.5)}}
for(const{x:X,z:Z}of roadC){const cx=Math.round(X/CELL),cz=Math.round(Z/CELL);for(const[dx,dz]of D4)if(pathSet.has((cx+dx)+','+(cz+dz)))setCost(X,Z,dx?1:PW/2,dz?1:PW/2,.7)} // محل رد شدن از خیابان
for(const[X,Z]of trees)for(const[a,b]of[[.8,0],[-.8,0],[0,.8],[0,-.8]])if(walk(X+a,Z+b)){treeSp.push({x:X+a,z:Z+b,tx:X,tz:Z});break}
refreshDeco()}
function freeNear(cx,cz,R){for(let t=0;t<40;t++){const x=cx+(Math.random()-.5)*2*R,z=cz+(Math.random()-.5)*2*R;if(walk(x,z)&&dry(x,z))return[x,z]}for(let r=1;r<80;r++)for(let a=0;a<12;a++){const x=cx+Math.cos(a/12*6.283)*r*.5,z=cz+Math.sin(a/12*6.283)*r*.5;if(walk(x,z))return[x,z]}return[0,0]}
const D8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],hp=[],hf=[];
function hpush(f,n){let i=hp.length;hp.push(n);hf.push(f);while(i){const p=(i-1)>>1;if(hf[p]<=f)break;hp[i]=hp[p];hf[i]=hf[p];i=p}hp[i]=n;hf[i]=f}
function hpop(){const n=hp[0],ln=hp.pop(),lf=hf.pop();if(hp.length){let i=0;for(;;){let c=2*i+1;if(c>=hp.length)break;if(c+1<hp.length&&hf[c+1]<hf[c])c++;if(hf[c]>=lf)break;hp[i]=hp[c];hf[i]=hf[c];i=c}hp[i]=ln;hf[i]=lf}return n}
function findPath(sx,sz,tx,tz){const s=ci(sz)*NN+ci(sx),t=ci(tz)*NN+ci(tx);if(nav[t]||nav[s])return null;if(s===t)return[];gs.fill(1e9);prv.fill(-1);hp.length=hf.length=0;gs[s]=0;prv[s]=s;
const tX=t%NN,tZ=(t/NN)|0,H=(x,z)=>{const a=Math.abs(x-tX),b=Math.abs(z-tZ);return(Math.max(a,b)+.414*Math.min(a,b))*.5};hpush(H(s%NN,(s/NN)|0),s);let it=0;
while(hp.length&&it++<14000){const c=hpop();if(c===t)break;const x=c%NN,z=(c/NN)|0,gc=gs[c];
for(const[dx,dz]of D8){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=NN||nz>=NN)continue;const n=nz*NN+nx;if(nav[n])continue;if(dx&&dz&&(nav[z*NN+nx]||nav[nz*NN+x]))continue;const ng=gc+cost[n]*(dx&&dz?1.414:1);if(ng<gs[n]){gs[n]=ng;prv[n]=c;hpush(ng+H(nx,nz),n)}}}
if(prv[t]<0)return null;const raw=[];for(let c=t;c!==s;c=prv[c])raw.push([cw(c%NN),cw((c/NN)|0)]);raw.reverse();
const out=[];for(let i=0;i<raw.length;i++){const a=raw[i-1]||[sx,sz],b=raw[i],n=raw[i+1];if(n&&Math.abs((b[0]-a[0])*(n[1]-b[1])-(b[1]-a[1])*(n[0]-b[0]))<1e-6)continue;out.push(b)}return out}
// ═══ مالکیت خانه‌ها: دفتر مدیرعامل = بنیان‌گذار؛ بقیه به ترتیب یک خانه برای هر نفر (اگر خانه کم باشد، چند نفر مشترک)
const homeFor=i=>i===0&&hqH?hqH:regH.length?regH[(i-(hqH?1:0))%regH.length]:null;
const ownersIdx=h=>{const r=[];for(let i=0;i<cits.length;i++)if(homeFor(i)===h)r.push(i);return r};
function bInfo(b){const h=homeById.get(b.id);if(!h)return W.catalog[b.type]||'';const o=ownersIdx(h);
if(h.hq)return(W.catalog.hq||'دفتر مدیرعامل')+' · '+nameOf(0);
if(!o.length)return'خانهٔ خالی (هنوز صاحبی ندارد)';const nm=o.slice(0,3).map(nameOf).join('، ');return'خانهٔ '+nm+(o.length>3?' و '+fa(o.length-3)+' نفر دیگر':'')}
function ownerHi(b){const h=homeById.get(b.id);if(!h)return;ownersIdx(h).slice(0,2).forEach(i=>{const c=cits[i];if(c&&!c.hid)dgSay(c,[h.hq?'ownq':'own'],2800,'o')})}
