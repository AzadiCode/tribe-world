// ═══ استودیوی سینمایی «قبیله» ═══  (روی کامپیوتر و موبایل)
// افزودن افکت جدید: یک آیتم به EFFECTS اضافه کن. کلید هر مرحله: K(ثانیه, چرخش افقی, زاویه‌ی عمودی, فاصله, [x,y,z هدف])
//  • b = زاویه‌ی فعلی دوربین (برای شروع طبیعی)   • c = مرکز قبیله   • h = خانه‌ی مدیرعامل   • R = شعاع شهر
//  • زاویه‌ی عمودی: ۰ = از بالا، ۱٫۵ = هم‌سطح زمین  • حرکت بین کلیدها خودکار نرم (اسپلاین) است
export function initCinema(a){
const {cam,ctl,toast,rec}=a,$=i=>document.getElementById(i),sl=ms=>new Promise(r=>setTimeout(r,ms));
const K=(t,az,po,di,g)=>[t,az,po,di,g[0],g[1],g[2]],mix=(p,q,k)=>p.map((v,i)=>v+(q[i]-v)*k);
const EFFECTS=[
{id:'descend',ic:'🌤️',n:'فرود از ابرها',k:(b,c)=>[K(0,b,.1,160,c),K(4,b+1.1,.5,80,c),K(8,b+2.3,.9,30,c),K(10,b+2.9,.85,26,c)]},
{id:'ascend',ic:'🚀',n:'صعود به آسمان',k:(b,c)=>[K(0,b,.85,26,c),K(2,b+.6,.9,30,c),K(6,b+1.8,.5,80,c),K(10,b+3,.1,170,c)]},
{id:'hq',ic:'🏢',n:'سفر به خانه مدیرعامل',k:(b,c,h)=>[K(0,b,.9,55,c),K(3.5,b+1.2,.75,30,mix(c,h,.6)),K(7,b+2.5,.62,15,h),K(9,b+3.3,.55,11,h)]},
{id:'hqout',ic:'🔙',n:'خروج از خانه مدیرعامل',k:(b,c,h)=>[K(0,b,.55,11,h),K(2,b+.8,.62,15,h),K(5.5,b+2,.75,30,mix(c,h,.5)),K(9,b+3.2,.85,50,c)]},
{id:'orbit',ic:'🔄',n:'چرخش دور قبیله',k:(b,c)=>[K(0,b,.85,36,c),K(4,b+1.57,.7,32,c),K(8,b+3.14,.6,30,c),K(12,b+4.71,.7,32,c),K(16,b+6.28,.85,36,c)]},
{id:'top',ic:'🦅',n:'پرواز نمای بالا',k:(b,c)=>[K(0,b,.36,26,c),K(4,b+.9,.2,55,c),K(8,b+1.8,.1,100,c)]},
{id:'fly',ic:'🏙️',n:'عبور از میان شهر',k:(b,c,h,R)=>[K(0,b,1.1,16,[c[0]-R,1,c[2]+R*.3]),K(4,b+.5,1.05,14,[c[0]-R*.3,1,c[2]]),K(8,b+1,1.1,15,[c[0]+R*.3,1,c[2]-R*.2]),K(12,b+1.6,1,20,[c[0]+R,1,c[2]-R*.4])]},
{id:'full',ic:'✨',n:'سکانس کامل (ابرها ← خانه مدیرعامل ← چرخش)',w:1,k:(b,c,h)=>[K(0,b+.6,.1,160,c),K(5,b+1.7,.5,80,c),K(10,b+2.9,.9,32,c),K(15,b+3.9,.75,26,mix(c,h,.5)),K(20,b+5,.6,14,h),K(24,b+6.2,.55,11,h),K(30,b+7.4,.8,36,c)]}];
// ── موتور حرکت
let S=null,saved=null,busy=0,ab=0,recM=0,spd=1,zm=1,zt=1;
const g=k=>{try{return localStorage['cin_'+k]}catch(e){}},st=(k,v)=>{try{localStorage['cin_'+k]=v}catch(e){}};
recM=+g('rec')||0;spd=+g('sp')||1;
const cr=(p,q,r,s,u)=>.5*(2*q+(-p+r)*u+(2*p-5*q+4*r-s)*u*u+(-p+3*q-3*r+s)*u*u*u);
function at(ks,t){let i=0;while(i<ks.length-2&&t>ks[i+1][0])i++;const A=ks[Math.max(0,i-1)],B=ks[i],C=ks[i+1],D=ks[Math.min(ks.length-1,i+2)],u=Math.min(1,Math.max(0,(t-B[0])/((C[0]-B[0])||1)));
return[1,2,3,4,5,6].map(j=>{const f=j==3?Math.log:x=>x,v=cr(f(A[j]),f(B[j]),f(C[j]),f(D[j]),u);return j==3?Math.exp(v):v})}
function put(p){const[az,po,di0,x,y,z]=p,di=Math.min(400,Math.max(3,di0*zm));ctl.target.set(x,y,z);cam.position.set(x+di*Math.sin(po)*Math.sin(az),y+di*Math.cos(po),z+di*Math.sin(po)*Math.cos(az))}
function relax(){if(!saved)saved={a:ctl.minDistance,b:ctl.maxDistance,c:ctl.minPolarAngle,d:ctl.maxPolarAngle};Object.assign(ctl,{minDistance:3,maxDistance:400,minPolarAngle:.02,maxPolarAngle:1.5})}
function restore(){if(!saved)return;Object.assign(ctl,{minDistance:saved.a,maxDistance:saved.b,minPolarAngle:saved.c,maxPolarAngle:saved.d});saved=null}
function inLim(){if(!saved)return 1;const d=cam.position.distanceTo(ctl.target),p=Math.acos((cam.position.y-ctl.target.y)/d);return d>=saved.a&&d<=saved.b&&p>=saved.c&&p<=saved.d}
ctl.addEventListener('end',()=>{if(saved&&!busy&&inLim())restore()});
const play=ks=>new Promise(r=>{S={ks,D:ks[ks.length-1][0],t:0,fin:r}});
function step(dt){if(!S)return;zm+=(zt-zm)*Math.min(1,dt*9);S.t+=dt*spd;const p=Math.min(1,S.t/S.D),q=p*p*p*(p*(6*p-15)+10);put(at(S.ks,q*S.D));if(p>=1){const f=S.fin;S=null;f()}}
function stop(){if(!S)return;ab=1;const f=S.fin;S=null;f()}
async function go(e){if(busy)return;if(!ctl.enabled)return toast('صبر کن معرفی بازی تمام شود');
busy=1;ab=0;P.classList.remove('on');
const c=a.center(),h=a.hq(),C=[c[0],0,c[1]],H=h?[h.x,1.2,h.z]:C,b=Math.atan2(cam.position.x-ctl.target.x,cam.position.z-ctl.target.z),ks=e.k(b,C,H,Math.max(8,a.radius()||10));
// شروع افکت از همان نمای فعلی خودِ بازیکن (نه از یک نقطه‌ی ثابت)
{const T=ctl.target,d=cam.position.distanceTo(T),po=Math.acos(Math.max(-1,Math.min(1,(cam.position.y-T.y)/d)));ks[0]=K(0,b,po,d,[T.x,T.y,T.z])}
zm=zt=1;relax();ctl.enabled=false;ctl.enableDamping=false;put(at(ks,0));B.style.display='block';
let rc=0;const had=rec.on(); // ضبط از قبل روشن است؟ (بعد از توقف افکت، ضبط ادامه دارد)
if(recM||had){if(!had){try{await rec.start()}catch(x){}}rc=rec.on();if(!rc){fin();return}if(!had)await sl(900)}
await play(ks);const keep=rc&&(ab||had);if(rc&&!keep){await sl(1300);rec.stop()}fin(keep)}
function fin(keep){busy=0;S=null;B.style.display='none';ctl.enabled=true;ctl.enableDamping=true;if(inLim())restore();if(!keep)P.classList.add('on')} // با توقف دستی هنگام ضبط، ضبط ادامه دارد و پنل باز نمی‌شود
// ── رابط (پنل پایین صفحه؛ هنگام ضبط روی کامپیوتر پنهان می‌شود)
const css=document.createElement('style');css.textContent=`#cin{position:fixed;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:40;display:none;max-width:480px;margin:auto;padding:10px;border-radius:14px;background:var(--glass);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid var(--line);color:var(--cream);font:700 12px/1.4 inherit;direction:rtl}
#cin.on{display:block}#cin h4{margin:0 0 8px;font-size:13px;display:flex;justify-content:space-between}#cin h4 span{cursor:pointer;padding:0 6px}
.cs{display:flex;gap:6px;margin-bottom:6px}.cs b{flex:1;text-align:center;padding:7px 2px;border-radius:9px;border:1px solid var(--line);cursor:pointer}.cs b.on{background:var(--gold);color:#2b1a00;border-color:var(--gold)}
#cg{display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:34dvh;overflow:auto}#cg button{padding:11px 6px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.07);color:var(--cream);font:inherit;cursor:pointer}#cg button:active{background:var(--gold);color:#2b1a00}#cg .w{grid-column:1/-1;background:rgba(255,194,71,.18)}
#cst{position:fixed;left:50%;transform:translateX(-50%);bottom:max(14px,env(safe-area-inset-bottom));z-index:41;display:none;padding:10px 20px;border-radius:22px;background:rgba(255,77,61,.85);color:#fff;font:800 13px inherit;border:0;cursor:pointer}body.rch #cin,body.rch #cst,body.rch #toast,body.rch #ev{display:none!important}`;document.head.appendChild(css);
const P=document.createElement('div');P.id='cin';
P.innerHTML='<h4><b>🎬 استودیوی سینمایی</b><span data-x>✕</span></h4><div class="cs" id="cm"><b data-m="0">👁 پیش‌نمایش</b><b data-m="1">⏺ ضبط خودکار</b></div><div class="cs" id="cp"><b data-s=".75">آهسته</b><b data-s="1">عادی</b><b data-s="1.5">سریع</b></div><div class="cs" id="cq"><b data-q="">کیفیت کامل</b><b data-q="low">حالت سبک (لپتاپ ضعیف)</b></div><div id="cg">'+EFFECTS.map(e=>`<button data-e="${e.id}"${e.w?' class="w"':''}>${e.ic} ${e.n}</button>`).join('')+'</div>';
document.body.appendChild(P);
const B=document.createElement('button');B.id='cst';B.textContent='⏹ توقف';document.body.appendChild(B);B.onclick=stop;
const sync=()=>{P.querySelectorAll('[data-q]').forEach(x=>x.classList.toggle('on',(x.dataset.q==='low')===!!a.low));P.querySelectorAll('[data-m]').forEach(x=>x.classList.toggle('on',+x.dataset.m===recM));P.querySelectorAll('[data-s]').forEach(x=>x.classList.toggle('on',+x.dataset.s===spd))};sync();
P.onclick=e=>{const t=e.target.closest('[data-m],[data-s],[data-e],[data-x],[data-q]');if(!t)return;
if('x' in t.dataset)return P.classList.remove('on');
if(t.dataset.q!=null){try{t.dataset.q?localStorage.tq='low':localStorage.tq='high'}catch(x){}history.replaceState(null,'',location.pathname);return location.reload()}
if(t.dataset.m!=null){recM=+t.dataset.m;st('rec',recM);return sync()}
if(t.dataset.s!=null){spd=+t.dataset.s;st('sp',spd);return sync()}
go(EFFECTS.find(x=>x.id===t.dataset.e))};
addEventListener('keydown',e=>{if(e.key==='Escape'&&busy)stop()});
// زوم دستی نرم هنگام اجرای افکت (چرخ ماوس / دو انگشت)
const dm=a.dom||document,pts=new Map();let pd=0;const zc=v=>Math.min(4,Math.max(.25,v));
dm.addEventListener('wheel',e=>{if(!S)return;e.preventDefault();zt=zc(zt*Math.exp(e.deltaY*.0015))},{passive:false});
dm.addEventListener('pointerdown',e=>{pts.set(e.pointerId,[e.clientX,e.clientY]);pd=0});
dm.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.clientX,e.clientY]);if(!S||pts.size!==2)return;const[p,q]=[...pts.values()],d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(pd&&d)zt=zc(zt*pd/d);pd=d});
const pu=e=>{pts.delete(e.pointerId);pd=0};dm.addEventListener('pointerup',pu);dm.addEventListener('pointercancel',pu);
return{step,toggle:()=>P.classList.toggle('on'),open:()=>P.classList.add('on'),run:id=>go(EFFECTS.find(x=>x.id===id)),stop,EFFECTS}}
