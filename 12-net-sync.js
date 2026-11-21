// ═══ دریافت وضعیت دنیا از سرور (poll هر ۳ ثانیه) و اعمالش روی صحنه: ساختمان‌ها، آمار، مرحله، هدف، شهروندان. ═══
// Engine 2.0: اعمالِ ساختمان‌های تازه با «زمان‌بندِ بودجه‌ای TWE» انجام می‌شود (نقشهٔ ساختِ دسته‌ایِ بزرگ
// تکه‌تکه و در چند فریم ⇒ صفر فریز)، رویدادهای دقیق دنیا از TWE.events عبور می‌کنند و
// زمانِ بازسازی ناوبری/جاده اندازه‌گیری و گزارش می‌شود (داشبورد ?perf=1 / Q.snapshot()).
'use strict';
let firstSync=true;
// ── فاز ۰ — diff عددی دنیا (جایگزین امضای رشته‌ای O(N) در هر poll) ──
// خروجی: لیست add/remove/move «با ID و ناحیهٔ تغییر» (WDIFF) تا فاز ۱ (بازسازی چانکی) مستقیم روی آن سوار شود.
// coalesce: تغییرات چند poll در همان فرازِ هر sync در یک diff جمع می‌شوند و rebuildNav+roads فقط یک‌بار اجرا می‌شود.
// ترتیبِ اجرا (اعمال ساختمان‌ها ← یک‌بار ناوبری/جاده) و شرطِ اجرا (هر تغییری که امضای قدیمی را عوض می‌کرد) عیناً حفظ شده است.
// مقیاس: هیچ فرض «صدها» وجود ندارد — کلیدها عددی، بدون ساخت رشته برای کل دنیا.
let bSnap=new Map(),lastPop=null,WDIFF=null; // bSnap: id ← {t,x,z,r,tl,bn,st} از آخرین rebuild
function diffWorld(w){
 const adds=[],removes=[],moves=[];let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;
 const grow=(gx,gz,rot,type)=>{const bd=fpBounds({type,gx,gz,rot:rot||0}); // ±۱ سلول: ماسک همسایه‌های مجاور هم عوض می‌شود
  if(bd.x0-1<x0)x0=bd.x0-1;if(bd.x1+1>x1)x1=bd.x1+1;if(bd.z0-1<z0)z0=bd.z0-1;if(bd.z1+1>z1)z1=bd.z1+1};
 const seen=new Set();
 for(const b of w.buildings){const id=b.id;seen.add(id);
  const gx=b.gx??b.x,gz=b.gz??b.z,cur={t:b.type,x:gx,z:gz,r:b.rot||0,tl:b.tl?1:0,bn:b.bn||'',st:b.style||''};
  const o=bSnap.get(id);
  if(!o){adds.push({id,type:cur.t,gx,gz,rot:cur.r,tl:cur.tl,bn:cur.bn,style:cur.st});bSnap.set(id,cur);grow(gx,gz,cur.r,cur.t)}
  else if(o.x!==cur.x||o.z!==cur.z||o.r!==cur.r||o.t!==cur.t||o.tl!==cur.tl||o.bn!==cur.bn||o.st!==cur.st){
   if(o.t===cur.t&&o.tl===cur.tl&&o.bn===cur.bn&&o.st===cur.st)moves.push({id,type:cur.t,from:{gx:o.x,gz:o.z,rot:o.r},to:{gx:cur.x,gz:cur.z,rot:cur.r}});
   else{removes.push({id,type:o.t,gx:o.x,gz:o.z,rot:o.r});adds.push({id,type:cur.t,gx,gz,rot:cur.r,tl:cur.tl,bn:cur.bn,style:cur.st})} // تغییر نوع/چراغ/متن = حذف+افزودن (همان‌طور که امضای قدیمی rebuild را می‌زد)
   bSnap.set(id,cur);grow(o.x,o.z,o.r,o.t);grow(gx,gz,cur.r,cur.t)}}
 for(const[id,o]of bSnap)if(!seen.has(id)){removes.push({id,type:o.t,gx:o.x,gz:o.z,rot:o.r});bSnap.delete(id);grow(o.x,o.z,o.r,o.t)}
 const pop=(w.stats&&w.stats.pop)||0,popChanged=pop!==lastPop;lastPop=pop; // pop هم روی RAD اثر دارد (مثل امضای قدیمی)
 return{adds,removes,moves,popChanged,area:x0<=x1?{x0,x1,z0,z1}:null,
  changed:adds.length+removes.length+moves.length>0||popChanged}}
// سرور با هر tick اقتصادی rev را بالا می‌برد حتی وقتی ساختمانی عوض نشده؛ ناوبری (A*) و جاده‌ها فقط وقتی ساختمان‌ها یا جمعیت واقعاً عوض شدند بازسازی می‌شوند
function sync(w){W=w;rev=w.rev;const ids=new Set(w.buildings.map(b=>b.id));
let removed=0;
for(const[id,g]of objs)if(!ids.has(id)){scene.remove(g);disposeObj(g);if(typeof CH!=='undefined')CH.drop(id);objs.delete(id);removed++}
// اعمالِ ساختمان‌های تازه: کوچک = فوری (مثل قبل)؛ بزرگ (نقشهٔ ساخت دسته‌ای) = تکه‌تکه با بودجهٔ ۶ms در فریم،
// نزدیک‌ترین به دوربین اول؛ پس از اتمام، ماسک جاده/پیاده‌روها یک‌بار کامل بازسازی می‌شود.
// فاز ۰: جست‌وجوی رکورد در تکه‌ها با Map عددی (قبلاً find خطی در هر تکه ← درجه‌دو برای دسته‌های چند هزارتایی).
const adds=w.buildings.filter(b=>!objs.has(b.id));
if(adds.length>12){
 if(typeof CH!=='undefined')CH.buildHold=1;                              // فاز ۲: در طول batch کارِ چانک تعلیق — سازه‌ها زنده دیده می‌شوند (مثل قبل)، پس از پایان موجِ ادغام
 const byId=new Map();for(const b of w.buildings)byId.set(b.id,b);
 const tg=ctl.target,items=adds.map(b=>{const wx=b.x*U,wz=b.z*U;return{b,d2:(wx-tg.x)*(wx-tg.x)+(wz-tg.z)*(wz-tg.z)}}).sort((a,c)=>a.d2-c.d2);
 TWE.Sched.slice('sync-build',items,it=>{const cur=W===w?byId.get(it.b.id):(W&&W.buildings.find(x=>x.id===it.b.id)); // اگر وسط کار poll جدیدی رسید، مثل قبل رکورد تازه خوانده می‌شود
  if(cur&&!objs.has(cur.id)){addB(cur,bpDelay(cur.id));return 1}return 0},
  {budget:6,done:n=>{if(W)roads(W);if(typeof CH!=='undefined'){CH.buildHold=0;for(const g of objs.values())if(!g.userData.m&&g.userData.b&&g.userData.t>=1&&CH.mergeable(g.userData.b.type)&&!g.userData.q){g.userData.q=1;CH.queue(g)}}TWE.emit('buildings:changed',{added:n,removed:removed,diff:WDIFF});TWE.Mem.checkpoint('batch-build')}});
}else{
 for(const b of adds)addB(b,bpDelay(b.id));
 if(adds.length||removed){TWE.emit('buildings:changed',{added:adds.length,removed:removed,diff:WDIFF?{adds:WDIFF.adds,removes:WDIFF.removes,moves:WDIFF.moves}:null});if(adds.length>4)TWE.Mem.checkpoint('sync-build')}}
// تغییر ظاهریِ رکوردهای موجود (متن بنر / جابه‌جایی / چرخش) — همان قواعد قبلی
for(const b of w.buildings){const g=objs.get(b.id);if(!g)continue;
 if(b.type==='banner'&&g.userData.b.bn!==b.bn){scene.remove(g);disposeObj(g);objs.delete(b.id);addB(b,0)}   // متن بنر عوض شد ← مش با بافت تازه
 else if(g.userData.b.x!==b.x||g.userData.b.z!==b.z||g.userData.b.rot!==b.rot){if(g.userData.m&&typeof CH!=='undefined')CH.demote(b.id);g.position.set(b.x*U,fpBaseY(b.type,b.x,b.z,b.rot),b.z*U);if(b.type!=='road'&&b.type!=='path')g.rotation.y=b.rot*Math.PI/180;g.userData.b=b;if(typeof CH!=='undefined'&&CH.mergeable(b.type))CH.queue(g)}}   // هم‌ترازی با زمینِ واقعی (کنار رود) مثل addB؛ فاز ۲: سازهٔ چانک‌شده ← زنده، اعمال، دوباره به صفِ ادغام
plan.visible=!w.buildings.some(b=>b.type==='hq');
// امضای ناوبری باید وضعیت چراغ راهنمایی (tl) و متن بنر (bn) را هم بگیرد وگرنه تغییر آن‌ها rebuildNav/roads را
// زود می‌زند و چراغ‌های تازه اعمال‌شده تا رفرش کامل رسم نمی‌شوند (باگ گزارش‌شده).
// فاز ۰: diff عددی (add/remove/move + pop) همان مجموعه‌شرط‌های امضای قدیمی را پوشش می‌دهد؛ خروجی در WDIFF برای فاز ۱.
{const d=diffWorld(w);WDIFF=d;
 // فاز ۱: WDIFF مستقیم به rebuildNav می‌رود — بازسازی ناحیه‌ای سلول/ایندکس روی همان ناحیه‌های مدخل‌ها؛ بدون diff مسیر کامل
 if(d.changed){fpWorldVer++;const t0=performance.now();rebuildNav(w,d);roads(w);TWE.emit('nav:rebuilt',{ms:performance.now()-t0,buildings:w.buildings.length,diff:{adds:d.adds.length,removes:d.removes.length,moves:d.moves.length,area:d.area}})}}
const s=w.stats;tgt.pop=s.pop;tgt.money=s.money/1e6;tgt.food=s.food;
const ti=w.tiers.indexOf(w.tier);$('tn').textContent=w.tier;$('path').innerHTML=w.tiers.map((t,i)=>`<i class="${i<ti?'past':i===ti?'on':''}"></i>`).join('<u></u>');
const g=w.goals.find(g=>s.subs<g.at),pend=w.goals.find(g=>s.subs>=g.at&&!g.value);
$('quest').innerHTML=`<div class="fl">${IC.flag}</div><div class="tx">${pend?`<strong>${pend.title}</strong><small>رأی‌گیری در جریان است</small>`:g?`<div class="qh"><strong>${fa(g.at)} نفر ← ${g.title}</strong><small>${fa(s.subs)} از ${fa(g.at)}</small></div><div id="bar"><u style="width:${Math.min(100,s.subs/g.at*100)}%"></u></div>`:'<strong>همه هدف‌ها انجام شد</strong>'}</div>`;
$('ev').innerHTML=w.events.map(e=>`<div><time>${new Date(e.t).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})}</time>${noEm(e.text).replace(/</g,'&lt;')}</div>`).join('');
if(seenEv&&w.events[0]&&w.events[0].t+w.events[0].text!==seenEv){toast(noEm(w.events[0].text));dgEvent(noEm(w.events[0].text))}seenEv=w.events[0]?w.events[0].t+w.events[0].text:'';
POP=s.pop;fitCits();names();chatSync(w);
if(firstSync){firstSync=false;TWE.Mem.checkpoint('first-sync')}
if(typeof wxSync==='function')wxSync(w.weather)}   // وضعیت آب‌وهوا از سرور ← گذار نرم در 06-world-weather.js
function fitCits(){const n=Math.max(POP?1:0,Math.min(POP,VIS,HARD));let ch=0;while(cits.length<n){cits.push(mkCit(cits.length));ch=1}while(cits.length>n){const c=cits.pop();scene.remove(c.g);disposeObj(c.g);if(c._el)c._el.remove();ch=1}applyMe();if(ch)names()}
function applyMe(){for(const c of cits)if(c.me){c.me=0;c.i=cits.indexOf(c);if(c._el)c._el.classList.remove('me')}
if(MY<1||cits.length<2){if(meRing&&meRing.parent)meRing.parent.remove(meRing);return}
const c=MY<cits.length?cits[MY]:cits[cits.length-1];c.me=1;c.i=MY;c.el.classList.add('me');c.nb.textContent=nameOf(MY);
if(!meRing){meRing=new THREE.Mesh(new THREE.RingGeometry(.4,.53,28),new THREE.MeshBasicMaterial({color:0x3ddc97,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));meRing.rotation.x=-Math.PI/2;meRing.position.y=.03}
c.g.add(meRing)}
async function poll(){try{const w=await(await fetch('/api/world?since='+rev,{cache:'no-store'})).json();if(!w.same)sync(w);$('dot').className=''}catch(e){$('dot').className='off'}}
