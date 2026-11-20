// ═══ موتور هندسی مشترک ساخت‌وساز (v2) ═══
// هندسهٔ خالص و مستقل از رندر: مسیر (نقاط کنترل + منحنی)، Stroke با Miter/Bevel/Round،
// Hub تقاطع‌ها، باند آفست دقیق (پیاده‌روی کنار جاده)، مثلث‌بندی Earcut، Snap و شبکه Node/Edge.
// همین توابع در 01-server-infra.py به پایتون ترجمه شده‌اند؛ هر تغییری باید دوطرفه باشد.
// این فایل فقط ریاضیات است (بدون THREE/DOM) تا در Node هم تست شود.
'use strict';
// ── ثابت‌های دنیا (باید با 01-server-config.py یکی باشد)
const GEO_SIZE=20,GEO_CELL=2,GEO_LO=-GEO_SIZE*GEO_CELL-1,GEO_HI=GEO_SIZE*GEO_CELL-1,GEO_EPS=1e-3;
const GEO_MAP=[[GEO_LO,GEO_HI],[GEO_LO,GEO_HI]]; // [x0,x1],[z0,z1]
const GEO_RIVER=[[-146,22],[-96,22],[-96,6],[-40,6],[-40,24],[16,24],[16,4],[72,4],[72,18],[146,18]]; // مسیر شکستهٔ رود — هماهنگ با RIVER_PTS در 06-world-scenery.js
const GEO_POND=(x,z)=>{for(let i=1;i<GEO_RIVER.length;i++){const a=GEO_RIVER[i-1],b=GEO_RIVER[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));if(Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz)<4.1)return true}return false};
// انواع مسیر: road=آسفالت (ماشین) · walk=پیاده‌رو · dirt=مسیر خاکی
const GEO_KINDS=['road','walk','dirt'];
const GEO_DEF={road:{w:2,total:2,asphalt:1.3,y:.075,cost:3.5},walk:{w:.6,y:.062,cost:.5},dirt:{w:.6,y:.05,cost:.8}};
// ── بردار
const gLen=(x,z)=>Math.hypot(x,z),gNorm=(x,z)=>{const l=Math.hypot(x,z)||1;return[x/l,z/l]};
const gDot=(ax,az,bx,bz)=>ax*bx+az*bz;
const gDist=(ax,az,bx,bz)=>Math.hypot(bx-ax,bz-az);
const gR4=v=>Math.round(v*1e4)/1e4; // دقت ذخیره‌سازی (مثل ساختمان‌ها)
// ── نمونه‌برداری مسیر: خروجی [{x,z,dx,dz,s(طول از ابتدا)}] با گام ~step
function geoCatmull(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;
return[.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]}
function geoSamplePath(pts,style,step=.4){
  const P=pts.map(p=>[+p[0],+p[1]]);if(P.length===0)return[];if(P.length===1)return[{x:P[0][0],z:P[0][1],dx:1,dz:0,s:0}];
  const out=[];let s=0,prev=null;
  const push=(x,z)=>{const dx=x-prev[0],dz=z-prev[1],l=Math.hypot(dx,dz);if(l<1e-9)return;s+=l;out.push({x,z,dx:dx/l,dz:dz/l,s});prev=[x,z]};
  if(style==='curve'&&P.length>=3){
    prev=[P[0][0],P[0][1]];out.push({x:P[0][0],z:P[0][1],dx:0,dz:0,s:0});
    for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];
      const seg=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),n=Math.max(2,Math.ceil(seg/step));
      for(let k=1;k<=n;k++)push(...geoCatmull(p0,p1,p2,p3,k/n))}
  }else{prev=[P[0][0],P[0][1]];out.push({x:P[0][0],z:P[0][1],dx:0,dz:0,s:0});
    for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(l/step));
      for(let k=1;k<=n;k++)push(a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n)}}
  // مماس‌ها: میانگین جهت قبلی/بعدی؛ سر و ته = جهت پاره‌خط
  for(let i=0;i<out.length;i++){const a=out[Math.max(0,i-1)],b=out[Math.min(out.length-1,i+1)];
    const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);if(l>1e-9){out[i].dx=dx/l;out[i].dz=dz/l}}
  if(out.length===1){out[0].dx=1;out[0].dz=0}
  return out}
// جهت به‌رو (در امتداد مسیر) و نرمال چپ
const geoDirL=(a,b)=>gNorm(b.x-a.x,b.z-a.z);
// ── نقطهٔ گوشهٔ Miter دو خط (از نقطه pA با جهت nA، از نقطه pB با جهت nB). null = موازی
function geoMiterPt(pA,nA,pB,nB){
  const dX=pB[0]-pA[0],dZ=pB[1]-pA[1],rX=nA[0],rZ=nA[1],sX=nB[0],sZ=nB[1];
  const den=rX*sZ-rZ*sX;if(Math.abs(den)<1e-9)return null;
  const t=(dX*sZ-dZ*sX)/den;return[pA[0]+rX*t,pA[1]+rZ*t]}
// ── Stroke: مسیر نمونه‌شده ← ضلع چپ/راست (آفست ±w/2) با Join هوشمند و MiterLimit.
// join: 'round' | 'miter' | 'bevel' ؛ خروجی {left:[],right:[]} (right معکوس نیست؛ هر دو از ابتدا تا انتهای مسیر)
function geoStrokeSides(S,w,join='round',miterLimit=2.5){
  const h=w/2,L=[],R=[];
  for(let i=0;i<S.length;i++){const p=S[i];
    const nx=-p.dz,nz=p.dx;              // نرمال چپ
    L.push([p.x+nx*h,p.z+nz*h]);R.push([p.x-nx*h,p.z-nz*h])}
  if(join==='miter'||join==='bevel'){    // گوشه‌ها با miter/bevel جایگزین نقطهٔ سادهٔ آفست می‌شوند؟
    // نقطهٔ آفست با مماس میانگین خودش miter نرم است؛ برای miter/bevel تیز، جهت هر پاره‌خط را جدا می‌گیریم:
    const L2=[],R2=[];
    for(let i=0;i<S.length;i++){
      if(i===0||i===S.length-1){L2.push(L[i]);R2.push(R[i]);continue}
      const a=S[i-1],b=S[i],c=S[i+1];
      const d1=geoDirL(a,b),d2=geoDirL(b,c),n1=[-d1[1],d1[0]],n2=[-d2[1],d2[0]];
      const mL=geoMiterPt([a.x+n1[0]*h,a.z+n1[1]*h],n1,[b.x+n2[0]*h,b.z+n2[1]*h],n2);
      const mR=geoMiterPt([a.x-n1[0]*h,a.z-n1[1]*h],[-n1[0],-n1[1]],[b.x-n2[0]*h,b.z-n2[1]*h],[-n2[0],-n2[1]]);
      const far=m=>m&&gDist(b.x,b.z,m[0],m[1])>miterLimit*h;
      // سمت بیرونِ چرخش = سمت مثبت (چپ اگر چپ‌گرد)
      const cross=d1[0]*d2[1]-d1[1]*d2[0];
      if(join==='miter'){
        if(!far(mL)&&mL)L2.push(mL);else L2.push(L[i]);
        if(!far(mR)&&mR)R2.push(mR);else R2.push(R[i])}
      else{ // bevel: دو نقطهٔ مجزا (آفست با جهت هر پاره‌خط) — فقط در سمتِ بیرون
        if(cross>1e-6){L2.push([b.x+n1[0]*h,b.z+n1[1]*h],[b.x+n2[0]*h,b.z+n2[1]*h]);R2.push(far(mR)?R[i]:mR||R[i])}
        else if(cross<-1e-6){R2.push([b.x-n1[0]*h,b.z-n1[1]*h],[b.x-n2[0]*h,b.z-n2[1]*h]);L2.push(far(mL)?L[i]:mL||L[i])}
        else{L2.push(L[i]);R2.push(R[i])}}}
    return{left:L2,right:R2}}
  return{left:L,right:R}}
// کلاهک انتهایی گرد (نیم‌دایره) — برای سر/ته بی‌همسایه
function geoCapArc(cx,cz,dirx,dirz,h,n=6){
  const pts=[],a0=Math.atan2(dirz,dirx);
  for(let i=0;i<=n;i++){const a=a0+Math.PI*i/n;pts.push([cx+Math.cos(a)*h,cz+Math.sin(a)*h])}
  return pts}
// مسیر ← چندضلعی بستهٔ کامل (بدنه + join + کلاهک‌ها). capStart/capEnd: 'butt'|'round'
// ترتیب رأس‌ها: left از ابتدا تا انتها ← کلاهک انتهایی ← right از انتها به ابتدا ← کلاهک ابتدایی (دور تا دور، CCW یا CW مهم نیست)
function geoStrokePoly(S,w,join='round',capStart='butt',capEnd='butt',miterLimit=2.5){
  if(S.length<2)return[];
  const{left,right}=geoStrokeSides(S,w,join,miterLimit);
  const out=[...left];
  if(capEnd==='round')out.push(...geoCapArc(S[S.length-1].x,S[S.length-1].z,S[S.length-1].dx,S[S.length-1].dz,w/2));
  out.push(...right.slice().reverse());
  if(capStart==='round')out.push(...geoCapArc(S[0].x,S[0].z,-S[0].dx,-S[0].dz,w/2));
  return out}
// ── باند آفست دقیق: ناحیهٔ بین آفست d1 و d2 در سمت side (+1 چپ / -1 راست).
// رأس‌های لبهٔ داخلی «دقیقاً» همان رأس‌های لبهٔ بیرونی Stroke با عرض 2*d1 هستند ⇒ مرز مشترک بی‌گپ.
function geoOffsetBand(S,d1,d2,side=1){
  const fwd=[],bwd=[];
  for(const p of S){const nx=-p.dz*side,nz=p.dx*side;
    fwd.push([p.x+nx*d2,p.z+nz*d2]);bwd.push([p.x+nx*d1,p.z+nz*d1])}
  return[...fwd,...bwd.reverse()]}
// ── Hub گره: پوشش پیوستهٔ تقاطع. incid=[{dir:[dx,dz],w}] (dir = جهت خروج از گره)
// زوایا CCW مرتب. گپ بین A و B (B بعد از A): اگر بازهٔ زاویه‌ای‌اش < π باشد، از «چپِ A» تا «راستِ B»
// می‌گذرد؛ اگر > π باشد (بیشتر نیم‌دایره خالی است)، از «راستِ A» تا «چپِ B» می‌گذرد.
// گوشهٔ گپ = miter تلاقی خطوط لبهٔ کامل (از مرکز)؛ اگر نامعتبر/دور بود → bevel خط صاف.
function geoHubPoly(cx,cz,incid,miterLimit=2.5){
  if(!incid.length)return[];
  if(incid.length===1){ // انتهای بن‌بست: کلاهک گرد
    const e=incid[0],d=gNorm(e.dir[0],e.dir[1]);
    return geoCapArc(cx,cz,d[0],d[1],e.w/2,8)}
  const E=incid.map(e=>{const d=gNorm(e.dir[0],e.dir[1]);return{dx:d[0],dz:d[1],h:e.w/2,r:e.w/2}})
    .sort((a,b)=>Math.atan2(a.dz,a.dx)-Math.atan2(b.dz,b.dx));
  const out=[];const n=E.length;
  for(let i=0;i<n;i++){const A=E[i],B=E[(i+1)%n];
    const aA=Math.atan2(A.dz,A.dx),aB=Math.atan2(B.dz,B.dx);
    let gap=aB-aA;while(gap<=0)gap+=Math.PI*2;         // بازهٔ زاویه‌ای CCW از A تا B
    const wide=gap>Math.PI;                            // گپ بزرگ: لبه‌های سمت مقابل
    // نرمال واحد سمتِ گپ برای جهت X: گپ کوچک → چپِ A و راستِ B؛ گپ بزرگ → راستِ A و چپِ B
    const nA=wide?[A.dz,-A.dx]:[-A.dz,A.dx];
    const nB=wide?[-B.dz,B.dx]:[B.dz,-B.dx];
    const a=[cx+A.dx*A.r+nA[0]*A.h,cz+A.dz*A.r+nA[1]*A.h];
    const b=[cx+B.dx*B.r+nB[0]*B.h,cz+B.dz*B.r+nB[1]*B.h];
    out.push(a);
    if(wide){out.push([cx,cz]);out.push(b);continue}   // گپ بزرگ: a → مرکز → b (بدون miter)
    // miter = تلاقی خطوط لبهٔ کامل (از مرکز، با آفست همان سمت گپ)
    const lineA_p=[cx+nA[0]*A.h,cz+nA[1]*A.h],lineB_p=[cx+nB[0]*B.h,cz+nB[1]*B.h];
    const m=geoMiterPtT(lineA_p,[A.dx,A.dz],lineB_p,[B.dx,B.dz]);
    const maxR=Math.max(A.r,B.r);
    if(m&&gDist(cx,cz,m[0],m[1])<=miterLimit*maxR+1e-6)out.push(m);
    out.push(b)}
  return out.filter((p,i)=>{if(i===0)return true;
    const q=out[i-1];return Math.abs(p[0]-q[0])>1e-9||Math.abs(p[1]-q[1])>1e-9})}
// miter با کنترل جهت: نقطهٔ تلاقی باید در جهت مثبتِ هر دو خط باشد
function geoMiterPtT(pA,nA,pB,nB){
  const dX=pB[0]-pA[0],dZ=pB[1]-pA[1],rX=nA[0],rZ=nA[1],sX=nB[0],sZ=nB[1];
  const den=rX*sZ-rZ*sX;if(Math.abs(den)<1e-9)return null;
  const t=(dX*sZ-dZ*sX)/den,u=(dX*rZ-dZ*rX)/den;
  if(t<-1e-9||u<-1e-9)return null;                  // تلاقی پشت یکی از خطوط → نامعتبر
  return[pA[0]+rX*t,pA[1]+rZ*t]}
// ── چندضلعی: مساحت (مثبت=CCW)، حداقل کادر، نقطه-در-چندضلعی
function geoPolyArea(P){let a=0;for(let i=0,n=P.length;i<n;i++){const p=P[i],q=P[(i+1)%n];a+=p[0]*q[1]-q[0]*p[1]}return a/2}
function geoPolyBBox(P){let x0=1/0,x1=-1/0,z0=1/0,z1=-1/0;for(const p of P){if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<z0)z0=p[1];if(p[1]>z1)z1=p[1]}return[x0,x1,z0,z1]}
function geoPip(P,x,z){let inn=false;for(let i=0,n=P.length,j=n-1;i<n;j=i++){
  if((P[i][1]>z)!==(P[j][1]>z)&&x<(P[j][0]-P[i][0])*(z-P[i][1])/(P[j][1]-P[i][1])+P[i][0])inn=!inn}return inn}
// برخورد/تماس پاره‌خط‌ها (با EPS): خروجی true فقط اگر هم‌پوشانی واقعی باشد
function geoSegIsect(ax0,az0,ax1,az1,bx0,bz0,bx1,bz1){
  const d1x=ax1-ax0,d1z=az1-az0,d2x=bx1-bx0,d2z=bz1-bz0,den=d1x*d2z-d1z*d2x;
  if(Math.abs(den)<1e-12)return false;
  const t=((bx0-ax0)*d2z-(bz0-az0)*d2x)/den,u=((bx0-ax0)*d1z-(bz0-az0)*d1x)/den;
  return t>GEO_EPS&&t<1-GEO_EPS&&u>GEO_EPS&&u<1-GEO_EPS}
// چندضلعی خودمتقاطع؟ (تست جفت پاره‌خط‌های غیرمجاور)
function geoPolySelfIsect(P){const n=P.length;if(n<3)return true;
  for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;
    if(geoSegIsect(P[i][0],P[i][1],P[(i+1)%n][0],P[(i+1)%n][1],P[j][0],P[j][1],P[(j+1)%n][0],P[(j+1)%n][1]))return true}
  return false}
// فاصلهٔ نقطه تا پاره‌خط + نزدیک‌ترین نقطه
function geoPtSeg(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz;
  let t=l2>1e-12?((px-ax)*dx+(pz-az)*dz)/l2:0;t=Math.max(0,Math.min(1,t));
  return{d:Math.hypot(ax+dx*t-px,az+dz*t-pz),x:ax+dx*t,z:az+dz*t,t}}
function geoPtPolyline(px,pz,pts){let best={d:1/0};for(let i=0;i<pts.length-1;i++){
  const r=geoPtSeg(px,pz,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]);if(r.d<best.d)best=r}return best}
// چندضلعی × مستطیل [x0,x1,z0,z1]: true = هم‌پوشانی واقعی (تماس لبه‌به‌لبه نیست)
function geoPolyVsRect(P,R){
  if(geoPip(P,(R[0]+R[1])/2,(R[2]+R[3])/2))return true;
  for(const p of P)if(p[0]>R[0]+GEO_EPS&&p[0]<R[1]-GEO_EPS&&p[1]>R[2]+GEO_EPS&&p[1]<R[3]-GEO_EPS)return true;
  const corners=[[R[0],R[2]],[R[1],R[2]],[R[1],R[3]],[R[0],R[3]]];
  for(const c of corners)if(geoPip(P,c[0],c[1]))return true;
  const n=P.length;
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];
    for(let j=0;j<4;j++){const c=corners[j],d=corners[(j+1)%4];
      if(geoSegIsect(a[0],a[1],b[0],b[1],c[0],c[1],d[0],d[1]))return true}}
  return false}
// چندضلعی × چندضلعی (تماس لبه‌به‌لبه مجاز): رأس‌داخل با حاشیهٔ EPS از مرز + پاره‌خط×پاره‌خط واقعی
function geoPolyVsPoly(A,B){
  const bbA=geoPolyBBox(A),bbB=geoPolyBBox(B);
  if(bbA[0]>bbB[1]+GEO_EPS||bbB[0]>bbA[1]+GEO_EPS||bbA[2]>bbB[3]+GEO_EPS||bbB[2]>bbA[3]+GEO_EPS)return false;
  // رأس A داخل B (فقط اگر «عمیق» داخل باشد، نه روی مرز): نقطهٔ امن = خود رأس؛
  // برای حاشیه، رأسی که فاصله‌اش از همهٔ لبه‌های دیگری > EPS است
  const deepIn=(P,x,z)=>{if(!geoPip(P,x,z))return false;
    for(let i=0,n=P.length;i<n;i++){const r=geoPtSeg(x,z,P[i][0],P[i][1],P[(i+1)%n][0],P[(i+1)%n][1]);
      if(r.d<=GEO_EPS*10)return false} // روی/چسبیده به مرز → تماس، نه هم‌پوشانی
    return true};
  for(const p of A)if(deepIn(B,p[0],p[1]))return true;
  for(const p of B)if(deepIn(A,p[0],p[1]))return true;
  const na=A.length,nb=B.length;
  for(let i=0;i<na;i++)for(let j=0;j<nb;j++)
    if(geoSegIsect(A[i][0],A[i][1],A[(i+1)%na][0],A[(i+1)%na][1],B[j][0],B[j][1],B[(j+1)%nb][0],B[(j+1)%nb][1]))return true;
  return false}
// ── گوشه‌گردکردن چندضلعی: radii[i] = شعاع نرم‌شدن رأس i (0 = تیز). خروجی رأس‌های جدید
function geoRoundCorners(P,radii){
  const out=[],n=P.length;
  for(let i=0;i<n;i++){const r=Math.min(radii[i]||0);
    if(r<=GEO_EPS){out.push(P[i]);continue}
    const A=P[(i-1+n)%n],B=P[i],C=P[(i+1)%n];
    const l1=gDist(A[0],A[1],B[0],B[1]),l2=gDist(B[0],B[1],C[0],C[1]);
    const rr=Math.min(r,l1/2.1,l2/2.1);
    const d1=gNorm(B[0]-A[0],B[1]-A[1]),d2=gNorm(C[0]-B[0],C[1]-B[1]);
    const p1=[B[0]-d1[0]*rr,B[1]-d1[1]*rr],p2=[B[0]+d2[0]*rr,B[1]+d2[1]*rr];
    // مرکز کمان = تقاطع خطوط «عمود بر لبه‌ها» از p1 و p2 (داخل چندضلعی، در فاصلهٔ rr از هر دو لبه)
    const cc=geoMiterPt(p1,[-d1[1],d1[0]],p2,[-d2[1],d2[0]]);
    let CR,ccx,ccz;
    if(cc&&isFinite(cc[0])&&isFinite(cc[1])&&Math.hypot(cc[0]-p1[0],cc[1]-p1[1])<rr*4){
      ccx=cc[0];ccz=cc[1];CR=Math.hypot(p1[0]-ccx,p1[1]-ccz)}
    else{ccx=B[0];ccz=B[1];CR=rr}
    const a1=Math.atan2(p1[1]-ccz,p1[0]-ccx),a2=Math.atan2(p2[1]-ccz,p2[0]-ccx);
    let da=a2-a1;while(da<=-Math.PI)da+=Math.PI*2;while(da>Math.PI)da-=Math.PI*2;
    const steps=Math.max(2,Math.ceil(Math.abs(da)/(Math.PI/16)));
    out.push(p1);
    for(let k=1;k<steps;k++){const a=a1+da*k/steps;out.push([ccx+Math.cos(a)*CR,ccz+Math.sin(a)*CR])}
    out.push(p2)}
  return out}
// ── مثلث‌بندی پایدار چندضلعی ساده (بدون حفره). برای چندضلعی‌های star-shaped نسبت به مرکز:
// fan قطبی؛ وگرنه ear-clipping کلاسیک روی آرایه (معتبر برای هر چندضلعی ساده).
function geoEarcut(data,holeIndices=null){
  if(holeIndices&&holeIndices.length)return null; // حفره در نسخهٔ فعلی نداریم
  const n=data.length/2;if(n<3)return[];
  const X=i=>data[i*2],Z=i=>data[i*2+1];
  // آیا star-shaped نسبت به مرکز جرم است؟ (هر رأس از مرکز دیده شود ⇒ fan امن)
  let cx=0,cz=0;for(let i=0;i<n;i++){cx+=X(i);cz+=Z(i)}cx/=n;cz/=n;
  let star=true;
  for(let i=0;i<n&&star;i++){const a=[X(i),Z(i)],b=[X((i+1)%n),Z((i+1)%n)];
    // پاره‌خط مرکز→وسط پاره‌خط نباید از هیچ لبهٔ دیگر رد شود (تست سبک: فقط علامت چرخش)
    const s=(b[0]-a[0])*(cz-a[1])-(b[1]-a[1])*(cx-a[0]);
    if(s>1e-9)star=false} // مرکز سمت راست لبه ⇒ چندضلعی CW یا غیرستاره‌ای ⇒ ear clipping
  if(star){const idx=Array.from({length:n},(_,i)=>i);
    idx.sort((a,b)=>Math.atan2(Z(a)-cz,X(a)-cx)-Math.atan2(Z(b)-cz,X(b)-cx));
    const tris=[];for(let i=1;i<n-1;i++)tris.push(idx[0],idx[i],idx[i+1]);return tris}
  // ear clipping کلاسیک
  let area=0;for(let i=0;i<n;i++){const j=(i+1)%n;area+=X(i)*Z(j)-X(j)*Z(i)}area/=2;
  let idx=Array.from({length:n},(_,i)=>i);if(area<0)idx.reverse(); // CCW
  const pt=i=>[X(idx[i]),Z(idx[i])];
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const inTri=(p,a,b,c)=>{const s1=cross(a,b,p),s2=cross(b,c,p),s3=cross(c,a,p);return(s1>=0&&s2>=0&&s3>=0)};
  const tris=[];
  let guard=n*n*2;
  while(idx.length>3&&guard-->0){
    let ear=-1;
    const mm=idx.length;
    for(let i=0;i<mm;i++){const a=pt((i-1+mm)%mm),b=pt(i),c=pt((i+1)%mm);
      if(cross(a,b,c)<=GEO_EPS)continue;
      let ok=true;
      for(let j=0;j<mm;j++){if(j===(i-1+mm)%mm||j===i||j===(i+1)%mm)continue;
        if(inTri(pt(j),a,b,c)){ok=false;break}}
      if(ok){ear=i;break}}
    if(ear<0)break; // چندضلعی غیرساده — fallback fan
    const a=(ear-1+mm)%mm,c=(ear+1)%mm;
    tris.push(idx[a],idx[ear],idx[c]);idx.splice(ear,1)}
  if(idx.length===3)tris.push(idx[0],idx[1],idx[2]);
  return tris}

// ═══ شبکهٔ زیرساخت: Node (گره) + Edge (مسیر) + Surface (سطح چندضلعی) ═══
// infrastructure v2 = {v:2, nodes:{id:{x,z}}, edges:{id:{a,b,kind,style,w,ref?}}, surfaces:{id:{pts,mat,r?}}, next_id}
// nodes/edges/surfaces = Map در حافظه؛ سریال/دسریال با infraPack/infraLoad.
const GEO_EMPTY_INFRA=()=>({v:2,nodes:new Map(),edges:new Map(),surfaces:new Map(),next_id:1});
function infraPack(inf){return{v:2,next_id:inf.next_id,
  nodes:Object.fromEntries([...inf.nodes].map(([id,n])=>[id,{x:gR4(n.x),z:gR4(n.z)}])),
  edges:Object.fromEntries([...inf.edges].map(([id,e])=>[id,{a:e.a,b:e.b,kind:e.kind,style:e.style||'poly',w:+(e.w||GEO_DEF[e.kind].w).toFixed(3),ref:e.ref??null}])),
  surfaces:Object.fromEntries([...inf.surfaces].map(([id,s])=>[id,{pts:s.pts.map(p=>[gR4(p[0]),gR4(p[1])]),mat:s.mat||'dirt'}]))}}
function infraLoad(d){ // d = بخش infrastructure سند main (هر نسخه‌ای)؛ خروجی همیشه v2
  if(!d||typeof d!=='object')return GEO_EMPTY_INFRA();
  if(d.v===2&&d.nodes instanceof Object){ // از قبل v2 (بعد از اولین save)
    const inf=GEO_EMPTY_INFRA();
    for(const[id,n]of Object.entries(d.nodes))inf.nodes.set(+id,{x:+n.x,z:+n.z});
    for(const[id,e]of Object.entries(d.edges))inf.edges.set(+id,{a:+e.a,b:+e.b,kind:e.kind,style:e.style||'poly',w:+e.w||GEO_DEF[e.kind]?.w||.6,ref:e.ref??null});
    for(const[id,s]of Object.entries(d.surfaces||{}))inf.surfaces.set(+id,{pts:(s.pts||[]).map(p=>[+p[0],+p[1]]),mat:s.mat||'dirt'});
    inf.next_id=+d.next_id||inf.nodes.size+inf.edges.size+1;return inf}
  // v1 قدیمی (مجموعه‌ای flat از مسیرها) یا نامعتبر → ساختار خالی (مهاجرت با infraMigrate جدا انجام می‌شود)
  return GEO_EMPTY_INFRA()}
// مهاجرت جاده/پیاده‌روهای قدیمی (کاشی‌های گرید در buildings) ← مسیرهای هندسی v2.
// شناسه‌ها از ۱٫۰۰۰٫۰۰۰ شروع می‌شوند تا با id ساختمان‌ها تضاد نکنند و «حفظ شناسه» معنا داشته باشد.
function infraMigrateTiles(buildings){
  const inf=GEO_EMPTY_INFRA();if(!Array.isArray(buildings))return inf;
  const tiles=buildings.filter(b=>b&&(b.type==='road'||b.type==='path'));
  if(!tiles.length)return inf;
  const key=(x,z)=>x+'|'+z,cellMap=new Map();
  for(const t of tiles){const x=Math.round(t.x),z=Math.round(t.z);cellMap.set(key(x,z),t)}
  // هر جزء همبندی ← یک مسیر (از انتهاها؛ گرید ۴-جهته)؛ نقاط عطف = نقاط کنترل
  const seen=new Set(),runs=[];
  for(const t of tiles){const k=key(t.x,t.z);if(seen.has(k))continue;
    // BFS جزء همبندی
    const comp=[],q=[[t.x,t.z]];seen.add(k);
    while(q.length){const[x,z]=q.pop();comp.push([x,z]);
      for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nk=key(x+dx,z+dz);
        if(cellMap.has(nk)&&!seen.has(nk)){seen.add(nk);q.push([x+dx,z+dz])}}}
    // نقاط انتهایی/انشعاب = درجه≠۲
    const deg=new Map();for(const[x,z]of comp){let d=0;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]])if(cellMap.has(key(x+dx,z+dz)))d++;deg.set(key(x,z),d)}
    const ends=comp.filter(([x,z])=>deg.get(key(x,z))!==2);
    const visited=new Set();
    const starts=ends.length?ends:comp.slice(0,1);
    for(const st of starts){const sx=st[0],sz=st[1],sk=key(sx,sz);
      if(visited.has(sk))continue;
      for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nk=key(sx+dx,sz+dz);
        if(!cellMap.has(nk)||visited.has(nk))continue;
        // درگ از (sx,sz) در جهت (dx,dz)
        const pts=[[sx,sz]];let px=sx,pz=sz,lx=dx,lz=dz;
        for(;;){px+=lx;pz+=lz;pts.push([px,pz]);visited.add(key(px,pz));
          const nb=[[1,0],[-1,0],[0,1],[0,-1]].filter(([ax,az])=>(ax!==-lx||az!==-lz)&&cellMap.has(key(px+ax,pz+az)));
          if(nb.length===1&&deg.get(key(px,pz))===2){[lx,lz]=nb[0];continue}
          break}
        if(pts.length>=2)runs.push({pts,kind:cellMap.get(sk).type})}}}
  // تبدیل به nodes/edges (چند ضلع‌جهته ممکن است یک گره مشترک شود — خواستهٔ ماست: اتصال توپولوژیک)
  const nodeIdx=new Map(); // کلید «x,z» گردشده ← id
  const nodeAt=(inf,x,z)=>{const k=gR4(x)+','+gR4(z);
    if(nodeIdx.has(k))return nodeIdx.get(k);
    const id=inf.next_id++;inf.nodes.set(id,{x:gR4(x),z:gR4(z)});nodeIdx.set(k,id);return id};
  for(const r of runs){const kind=r.kind==='road'?'road':'walk';
    const ids=r.pts.map(p=>nodeAt(inf,p[0]*GEO_CELL,p[1]*GEO_CELL));
    for(let i=0;i<ids.length-1;i++){const id=inf.next_id++;
      inf.edges.set(id,{a:ids[i],b:ids[i+1],kind,style:'poly',w:GEO_DEF[kind].w,ref:null})}}
  return inf}
// خروجی «کاشی‌های معادل» برای سازگاری ناوبری/ماشین‌ها: هر سلول که بخشی از شبکهٔ v2 است
function infraOccupiedCells(inf){
  const cells=new Set();
  for(const e of inf.edges.values()){const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);if(!A||!B)continue;
    const S=geoSamplePath([[A.x,A.z],[B.x,B.z]],'poly',.5),h=(e.w||.6)/2;
    for(const p of S){const x0=Math.floor((p.x-h)/GEO_CELL),x1=Math.floor((p.x+h)/GEO_CELL),z0=Math.floor((p.z-h)/GEO_CELL),z1=Math.floor((p.z+h)/GEO_CELL);
      for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)cells.add(x+'|'+z)}}
  for(const s of inf.surfaces.values()){const bb=geoPolyBBox(s.pts);
    for(let x=Math.floor(bb[0]/GEO_CELL);x<=Math.floor(bb[1]/GEO_CELL);x++)
      for(let z=Math.floor(bb[2]/GEO_CELL);z<=Math.floor(bb[3]/GEO_CELL);z++)cells.add(x+'|'+z)}
  return cells}
// نمونه‌سازی کامل همهٔ مسیرهای یک kind برای جستجو/رندر: [{id,e,A,B,S}]
function infraEdgesSampled(inf,kind){const out=[];
  for(const[id,e]of inf.edges){if(kind&&e.kind!==kind)continue;
    const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);if(!A||!B)continue;
    const pts=[[A.x,A.z]];if(e.style==='curve'&&Array.isArray(e.mid))pts.push(e.mid[0]===undefined?null:null);
    out.push({id,e,A,B,S:geoSamplePath([[A.x,A.z],[B.x,B.z]],e.style==='curve'?'curve':'poly',.4)})}
  return out}
// حذف ایمن: edge + nodeهای بی‌استفاده
function infraDelEdge(inf,id){const e=inf.edges.get(id);if(!e)return;inf.edges.delete(id);
  for(const nid of[e.a,e.b]){let used=false;for(const x of inf.edges.values())if(x.a===nid||x.b===nid){used=true;break}
    if(!used)inf.nodes.delete(nid)}}
// ── Snap: حالت‌های آزاد/گرید/لبه/گره/مسیر. p=[wx,wz]؛ خروجی {p,mode,extra}
function geoSnap(p,inf,mode,ctx){
  // ctx={edgesS:نمونه‌شده‌ها, rects:مستطیل‌های ساختمان [x0,x1,z0,z1], gridCell, snapR}
  const R=ctx&&ctx.snapR!=null?ctx.snapR:.5,G=ctx&&ctx.gridCell!=null?ctx.gridCell:1;
  if(mode==='grid')return{p:[Math.round(p[0]/G)*G,Math.round(p[1]/G)*G],mode};
  if(mode==='node'){let best=null;
    for(const[id,n]of inf.nodes){const d=gDist(p[0],p[1],n.x,n.z);if(d<=R&&(!best||d<best.d))best={d,p:[n.x,n.z]}}
    if(best)return{p:best.p,mode}}
  if(mode==='path'&&ctx&&ctx.edgesS){let best=null;
    for(const es of ctx.edgesS){const r=geoPtPolyline(p[0],p[1],es.S.map(q=>[q.x,q.z]));
      if(r.d<=R&&(!best||r.d<best.d))best={d:r.d,p:[r.x,r.z],edge:es.id}}
    if(best)return{p:best.p,mode,edge:best.edge}}
  if(mode==='edge'&&ctx&&ctx.rects){let best=null;
    for(const r of ctx.rects){ // نزدیک‌ترین نقطهٔ مرز مستطیل
      const cx=Math.max(r[0],Math.min(p[0],r[1])),cz=Math.max(r[2],Math.min(p[1],r[3]));
      const qx=p[0]<r[0]?r[0]:p[0]>r[1]?r[1]:p[0],qz=p[1]<r[2]?r[2]:p[1]>r[3]?r[3]:p[1];
      const d=Math.min(gDist(p[0],p[1],cx,cz),gDist(p[0],p[1],qx,qz));
      if(d<=R&&(!best||d<best.d)){best={d,p:[d===gDist(p[0],p[1],qx,qz)?qx:cx,d===gDist(p[0],p[1],qx,qz)?qz:cz]}}}
    if(best)return{p:best.p,mode}}
  return{p:[p[0],p[1]],mode:'free'}}
// فاصلهٔ نقطه تا شبکهٔ مسیر (برای «چسبیدن به مسیرهای موجود» در پیش‌نمایش)
function geoDistToEdges(p,edgesS){let best=1/0;for(const es of edgesS){const d=geoPtPolyline(p[0],p[1],es.S.map(q=>[q.x,q.z])).d;if(d<best)best=d}return best}

// ═══ اعتبارسنجی مشترک (فرانت/سرور یکسان) ═══
// edge جدید/ویرایش‌شده: پرچم‌های خطا. bRects = مستطیل‌های واقعی ساختمان‌ها (بدون جاده/پیاده‌رو قدیمی).
function geoEdgePolys(e,A,B){const S=geoSamplePath([[A.x,A.z],[B.x,B.z]],e.style==='curve'?'curve':'poly',.4);
  const join=e.style==='curve'?'round':'miter';
  return{S,poly:geoStrokePoly(S,e.w||GEO_DEF[e.kind].w,join,'round','round')}}
function geoValidateEdge(inf,eid,bRects,pond=GEO_POND,lo=GEO_LO,hi=GEO_HI){
  const errs=[],e=inf.edges.get(eid);if(!e)return['مسیر نامعتبر'];
  const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);if(!A||!B)return['گره نامعتبر'];
  if(gDist(A.x,A.z,B.x,B.z)<.05)return['مسیر خیلی کوتاه'];
  if(!GEO_KINDS.includes(e.kind))errs.push('نوع مسیر نامعتبر');
  const{poly}=geoEdgePolys(e,A,B);
  if(poly.length<3)errs.push('هندسهٔ مسیر نامعتبر');
  if(geoPolySelfIsect(poly))errs.push('مسیر خودمتقاطع');
  const bb=geoPolyBBox(poly);
  if(bb[0]<lo-GEO_EPS||bb[1]>hi+GEO_EPS||bb[2]<lo-GEO_EPS||bb[3]>hi+GEO_EPS)errs.push('خارج از نقشه');
  // برکه: نمونه‌گیری روی مسیر مرکزی
  for(const p of geoSamplePath([[A.x,A.z],[B.x,B.z]],'poly',.5))if(pond(p.x,p.z)){errs.push('روی حریم رودخانه');break}
  // برخورد با ساختمان‌ها (تماس لبه‌به‌لبه مجاز)
  for(const r of bRects)if(geoPolyVsRect(poly,r)){errs.push('برخورد با ساختمان');break}
  // برخورد با مسیرهای دیگر (roads می‌توانند هم‌پوشانی توپولوژیک در گره داشته باشند؛ سطوح مجزا باید فقط در گره/تقاطع تماس داشته باشند)
  for(const[id,o]of inf.edges){if(+id===+eid)continue;if(o.kind===e.kind)continue;
    const OA=inf.nodes.get(o.a),OB=inf.nodes.get(o.b);if(!OA||!OB)continue;
    const op=geoEdgePolys(o,OA,OB).poly;
    if(geoPolyVsPoly(poly,op)){errs.push('برخورد با مسیر دیگر');break}}
  return errs}
function geoValidateSurface(inf,sid,pond=GEO_POND,lo=GEO_LO,hi=GEO_HI){
  const errs=[],s=inf.surfaces.get(sid);if(!s)return['سطح نامعتبر'];
  const P=s.pts;
  if(P.length<3)return['سطح باید حداقل ۳ نقطه داشته باشد'];
  if(geoPolySelfIsect(P))errs.push('چندضلعی خودمتقاطع');
  if(Math.abs(geoPolyArea(P))<.05)errs.push('مساحت خیلی کم');
  const bb=geoPolyBBox(P);
  if(bb[0]<lo-GEO_EPS||bb[1]>hi+GEO_EPS||bb[2]<lo-GEO_EPS||bb[3]>hi+GEO_EPS)errs.push('خارج از نقشه');
  for(const p of P)if(pond(p[0],p[1])){errs.push('روی حریم رودخانه');break}
  return errs}
// امضای پایدار برای کش رندر
function geoSigEdge(e,A,B){return e.kind+'|'+e.style+'|'+e.w+'|'+gR4(A.x)+','+gR4(A.z)+';'+gR4(B.x)+','+gR4(B.z)+'|'+(e.ref??'')}

