// ═══════════════════════════════════════════════════════════════════════════════
//  Tribe World Engine 2.0 — هستهٔ مستقل موتور (05-core-twengine.js)
//  مالکِ: زمان‌بندی حلقه (Fixed Timestep + Accumulator)، ایزوله‌سازی خطای زیرسیستم‌ها،
//  EventBus رویدادمحور، زمان‌بندِ بودجه‌ای (Slice)، استخر اشیا (Pool)،
//  مدیریت حافظه (checkpoint/تشخیص نشت) و داشبورد اندازه‌گیری (TWE.stats).
//  قواعد: این فایل «فقط زیرساخت» است — هیچ منطق بازی اینجا ندارد؛ زیرسیستم‌ها بیرون
//  (05-core-main.js و بقیه) با TWE.sys(...) ثبت می‌شوند و ترتیبِ ثبت = ترتیب اجرا.
//  سازگاری: نام‌های قدیمی framePart / FRAME_ERRORS / FRAME_DISABLED همین‌جا با همان
//  رفتار تعریف شده‌اند تا مستندات و ابزارهای قبلی بدون تغییر معتبر بمانند.
// ═══════════════════════════════════════════════════════════════════════════════
'use strict';
// ── ایزوله‌سازی خطا (مثل قبل): خطای گذرا دوباره امتحان می‌شود؛ خطای پایدار پس از ۳ بار همان زیرسیستم ایزوله می‌شود
const FRAME_ERRORS=new Map(),FRAME_DISABLED=new Set(),FRAME_REPORTED=new Set();
function framePart(name,fn){ // نسخهٔ سازگاری برای فراخوانیِ محافظت‌شدهٔ تکی
 if(FRAME_DISABLED.has(name))return;
 try{fn();FRAME_ERRORS.delete(name)}catch(e){frameErr(name,e)}
}
function frameErr(name,e){const n=(FRAME_ERRORS.get(name)||0)+1;FRAME_ERRORS.set(name,n);
 console.error('[TribeWorld frame]',name,e);
 if(!FRAME_REPORTED.has(name)){FRAME_REPORTED.add(name);try{toast('خطای موقت در بخش سه‌بعدی «'+name+'»: '+String(e&&e.message||e).slice(0,90))}catch(_){}}
 if(n>=3){FRAME_DISABLED.add(name);console.error('[TribeWorld frame] subsystem isolated:',name);try{toast('بخش «'+name+'» متوقف شد تا کل دنیای بازی فریز نشود. لطفاً متن خطا را گزارش کن.')}catch(_){}}}
const TWE=(()=>{
const VERSION='2.0.0';
// ─── ۱) رجیستری زیرسیستم‌ها ────────────────────────────────────────────────────
// tick = منطق شبیه‌سازی (گام ثابت ۳۰Hz مستقل از فریم‌نرخ) · frame = کار هر فریم رندر
const SYS=[];
function sys(name,def){for(const s of SYS)if(s.name===name){console.error('[TWE] زیرسیستم تکراری:',name);return null}
 const s={name,tick:def.tick||null,frame:def.frame||null,err:0,simMs:0,frameMs:0};SYS.push(s);return s}
// ─── ۲) هستهٔ شبیه‌سازی: گام ثابت + انباشتگر ───────────────────────────────────
// TICK=۱/۳۰ ثانیه: منطق شهروند/خودرو با نرخ ثابت اجرا می‌شود ⇒ رفتارِ منطقی کاملاً مستقل از FPS
// (سرعت حرکت/توقف/چراغ‌ها روی دستگاهِ ضعیف و قوی دقیقاً یکی است) و هزینهٔ CPUِ منطق نصف می‌شود.
// MAX_TICKS=۳: با dt سقفِ ۰٫۱ ثانیه، تا ۱۰fps سرعت شبیه‌سازیِ واقعی حفظ می‌شود؛ پایین‌تر از آن
// زمانِ عقب‌افتاده دور ریخته می‌شود تا «حلقهٔ مرگ» (spiral of death) رخ ندهد.
const TICK=1/30,MAX_TICKS=3;
let acc=0,last=performance.now()/1000,simT=0,rt=0,tps=0,tpsN=0,tpsT=0;
// ─── ۳) EventBus: رویدادهای دقیق دنیا (ساخت‌وساز/ناوبری/آب‌وهوا) فقط مصرف‌کننده‌های واقعی را بیدار می‌کنند
const EV=new Map();const evStat={emitted:0,handled:0};
function on(n,f){let s=EV.get(n);if(!s){s=new Set();EV.set(n,s)}s.add(f);return()=>off(n,f)}
function off(n,f){const s=EV.get(n);if(s)s.delete(f)}
function emit(n,d){evStat.emitted++;const s=EV.get(n);if(!s)return;for(const f of s){evStat.handled++;try{f(d)}catch(e){console.error('[TWE event]',n,e)}}}
// ─── ۴) زمان‌بندِ بودجه‌ای: کارِ بزرگ (مثل اعمالِ ساختِ دسته‌ای چندصدهایتی) تکه‌تکه در چند فریم ⇒ صفر فریز
const slices=[];let sliceSeq=0;
function slice(label,items,visit,opts){opts=opts||{};if(!items.length){if(opts.done)try{opts.done(0)}catch(e){console.error('[TWE slice]',label,e)}return 0}
 const job={id:++sliceSeq,label,i:0,items,visit,budget:opts.budget||6,done:opts.done,added:0};slices.push(job);return job.id}
function sliceStep(){const job=slices[0],t0=performance.now();
 while(job.i<job.items.length&&performance.now()-t0<job.budget){const it=job.items[job.i++];try{if(it!=null&&job.visit(it))job.added++}catch(e){console.error('[TWE slice]',job.label,e)}}
 if(job.i>=job.items.length){slices.shift();if(job.done)try{job.done(job.added)}catch(e){console.error('[TWE slice]',job.label,e)}}}
// ─── ۵) استخر شیء: چرخهٔ ساخت/حذفِ مکرر بدون فشار GC (مصرفِ واقعی: خودروها) ────
const POOLS=new Map();
function pool(name,def){POOLS.set(name,{free:[],create:def.create,reset:def.reset||(()=>{}),dispose:def.dispose||null,created:0,reused:0});return POOLS.get(name)}
function poolGet(name){const p=POOLS.get(name);if(!p)return null;let o=p.free.pop();
 if(o){p.reused++;try{p.reset(o)}catch(e){console.error('[TWE pool]',name,e)}return o}
 p.created++;o=p.create();try{p.reset(o)}catch(e){console.error('[TWE pool]',name,e)}return o}
function poolPut(name,o){const p=POOLS.get(name);if(!p||o==null)return;
 if(p.free.length>=24){if(p.dispose)try{p.dispose(o)}catch(e){console.error('[TWE pool]',name,e)}return}  // سقف استخر: مازاد واقعاً آزاد می‌شود
 p.free.push(o)}
// ─── ۶) مدیریت حافظه: checkpoint + پایشِ رشدِ منابع GPU (تشخیص نشت، نه حدس) ────
const MEM={marks:[],win:[],leakFlag:0,t:0};
function checkpoint(label){try{const I=R.info.memory;MEM.marks.push({label,t:Math.round(rt),geo:I.geometries,tex:I.textures,prog:I.programs?I.programs.length:0});if(MEM.marks.length>12)MEM.marks.shift()}catch(e){}}
function memWatch(dt){if((MEM.t-=dt)>0)return;MEM.t=2;try{const I=R.info.memory;MEM.win.push({geo:I.geometries,tex:I.textures});if(MEM.win.length>30)MEM.win.shift();
 if(MEM.win.length===30){const a=MEM.win[0],b=MEM.win[MEM.win.length-1];
  const g=Math.max(b.geo/Math.max(1,a.geo),b.tex/Math.max(1,a.tex));
  if(g>1.3&&b.geo-a.geo>6){if(!MEM.leakFlag){MEM.leakFlag=1;console.warn('[TWE Mem] رشد پایدار منابع GPU در ۶۰ ثانیه: geo '+a.geo+'→'+b.geo+' tex '+a.tex+'→'+b.tex+' — احتمال نشت حافظه');try{toast('هشدار داخلی: مصرف حافظهٔ گرافیک به‌طور پیوسته بالا می‌رود (احتمال نشت). گزارش بده.')}catch(_){}}}
  else if(g<1.05)MEM.leakFlag=0}}catch(e){}}
// ─── ۷) موجودیت‌ها: شمارش واقعیِ هر گونه (مالکیتِ داده نزدِ سیستم‌های صاحبش می‌ماند) ─
const ENT=new Map();
function provider(name,fn){ENT.set(name,fn)}
function counts(){const o={};for(const[k,f]of ENT){try{o[k]=f()}catch(e){o[k]=-1}}return o}
// ─── ۸) اندازه‌گیری: زمان هر زیرسیستم، ۱٪ Low، تیک بر ثانیه ───────────────────
const FT=new Float32Array(600);let ftI=0,ftN=0,frameMs=0,frameMsE=0;
function ema(a,v,q=.06){return a+(v-a)*q}
function pctl(p){if(!ftN)return 0;const a=Array.from(FT.subarray(0,ftN)).sort((x,y)=>x-y);return a[Math.min(a.length-1,(a.length*p)|0)]}
function statsSnapshot(){const I=R.info;return{version:VERSION,tick:TICK,tps:Math.round(tps),frameMs:+frameMsE.toFixed(2),
 p1Low:+(pctl(.01)>0?1000/pctl(.99):0).toFixed(1),frameP99:+pctl(.99).toFixed(2),
 calls:I.render.calls,tris:I.render.triangles,geo:I.memory.geometries,tex:I.memory.textures,programs:I.programs?I.programs.length:0,
 subsystems:SYS.map(s=>({name:s.name,off:FRAME_DISABLED.has(s.name),sim:+s.simMs.toFixed(2),frame:+s.frameMs.toFixed(2)})),
 slices:slices.length,events:evStat,entities:counts(),memLeak:MEM.leakFlag,marks:MEM.marks.slice()}}
function statsLine(){let sim=0,fr=0;for(const s of SYS){sim+=s.simMs;fr+=s.frameMs}
 return'twe '+VERSION+' · tick '+Math.round(tps)+'/s · sim '+sim.toFixed(1)+'ms · sys '+fr.toFixed(1)+'ms · 1%low '+statsSnapshot().p1Low+(slices.length?' · slice '+slices.length:'')}
// ─── ۹) حلقهٔ اصلی موتور: Slice ← گام ثابت شبیه‌سازی ← کارهای فریم رندر ← اندازه‌گیری
function loop(){const now=performance.now()/1000;let dt=now-last;last=now;if(dt>.1)dt=.1;if(dt<0)dt=0;rt+=dt;
 const tf0=performance.now();
 // ۱) کارهای بودجه‌ایِ در انتظار (مثل اعمالِ ساخت‌وسازِ بزرگ) — پیش از همه؛ تا رندرِ همین فریم نتیجه را ببیند
 if(slices.length)sliceStep();
 // ۲) گام‌های ثابت شبیه‌سازی (۳۰Hz) — مستقل از فریم‌نرخ
 acc+=dt;let n=0;
 while(acc>=TICK&&n<MAX_TICKS){acc-=TICK;simT+=TICK;n++;tpsN++;
  for(const s of SYS){if(!s.tick||FRAME_DISABLED.has(s.name))continue;const t0=performance.now();
   try{s.tick(TICK,simT);s.err=0;FRAME_ERRORS.delete(s.name)}catch(e){frameErr(s.name,e)}
   s.simMs=ema(s.simMs,performance.now()-t0)}}
 if(acc>=TICK)acc=0;                       // دستگاه خیلی کند: زمانِ عقب‌مانده دور ریخته می‌شود تا قفلِ زنجیره‌ای نشود
 if((tpsT+=dt)>=1){tps=tpsN/tpsT;tpsN=0;tpsT=0}
 // ۳) کارهای هر فریم رندر (محیط/آب‌وهوا/دوربین/کیفیت/رندرِ سه‌بعدی)
 for(const s of SYS){if(!s.frame||FRAME_DISABLED.has(s.name))continue;const t0=performance.now();
  try{s.frame(dt,rt);s.err=0;FRAME_ERRORS.delete(s.name)}catch(e){frameErr(s.name,e)}
  s.frameMs=ema(s.frameMs,performance.now()-t0)}
 // ۴) اندازه‌گیری (حلقهٔ حلقویِ ۶۰۰ فریمِ آخر ≈ ۱۰ ثانیه — بدون تخصیص در فریم عادی)
 frameMs=performance.now()-tf0;frameMsE=ema(frameMsE,frameMs);
 if(ftN<FT.length)FT[ftN++]=frameMs;else{FT[ftI]=frameMs;ftI=(ftI+1)%FT.length}
 memWatch(dt)}
globalThis.TWE={version:VERSION,sys,loop,
 on,off,emit,events:{on,off,emit},Sched:{slice},Pools:{pool,get:poolGet,put:poolPut},
 Mem:{checkpoint,report:()=>({marks:MEM.marks.slice(),leak:MEM.leakFlag})},
 Entities:{provider,counts},
 stats:{snapshot:statsSnapshot,line:statsLine,frameMs:()=>frameMsE,p1Low:()=>statsSnapshot().p1Low,tps:()=>Math.round(tps)},
 state:{sys:SYS,disabled:FRAME_DISABLED,tick:TICK,get simT(){return simT},get rt(){return rt},get acc(){return acc}}};
return globalThis.TWE})();
