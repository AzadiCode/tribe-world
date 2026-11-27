// ═══ ضبط ویدیو از بازی + اتصال استودیوی سینمایی (cinema.js) و ضبط رابط (hudcap.js). ═══
'use strict';
// ── ضبط ویدیوی بازی (فقط پنل مدیر): تصویر سه‌بعدی + موسیقی بازی، با کیفیت بالا؛ در پایان فایل کامل ذخیره می‌شود
const RC={on:0};let rec=null,rch=[],rbytes=0,rt0=0,racc=0,rtick=0,rAud=null,rUrl='';const RCAP=150*1048576,RFPS=30,
RMT=['video/mp4;codecs=avc1.640033,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'],RMAXPX=8294400;
// سطح H.264 بر اساس اندازهٔ فریم (سطح ۵٫۱ برای فریم‌های کوچک بعضی ادیتورها را به مشکل می‌اندازد): ≤۸۱۹۲ ماکروبلاک ⇒ ۴٫۰، ≤۸۷۰۴ ⇒ ۴٫۲، ≤۲۲۰۸۰ ⇒ ۵٫۰، بیشتر ⇒ ۵٫۱
const rmts=(w,h)=>{const mb=Math.ceil(w/16)*Math.ceil(h/16),lv=mb<=8192?'28':mb<=8704?'2a':mb<=22080?'32':'33';return['video/mp4;codecs=avc1.6400'+lv+',mp4a.40.2'].concat(RMT)};
// حالت ضبط 🎥: clean = تمام‌صفحهٔ بازی بدون نوار بالا/پایین (فقط اسم و حباب بالای سر شهروندها) · hud = همراه منابع/مرحله/هدف/زیرنویس (مثل قبل)
const RMODES={clean:['#nts'],hud:['#res','#tier','#quest','#cap','#nts']},recMode=()=>{let m='hud';try{m=localStorage.rec_mode}catch(e){}return RMODES[m]?m:'hud'};
let MFX=null;
// فاز ۰ — محافظ غیربصری ضبط: اگر حین ضبط زمینهٔ WebGL از دست برود یا heap مرورگر از آستانه بگذرد،
// ضبط «تمیز» متوقف و فایل تا همین لحظه ذخیره می‌شود (به‌جای کرش/از دست رفتن همهٔ ویدیو).
// آستانهٔ heap: ۸۵٪ سقف مرورگر و حداکثر ۱٫۲GB (حدود ۴برابر مصرف عادی بازی) — فقط Chromium performance.memory دارد؛ جاهای دیگر محافظ بی‌اثر و بی‌هزینه است.
const rHeapOK=()=>{try{const m=performance.memory;if(!m||!m.jsHeapSizeLimit)return true;return m.usedJSHeapSize<Math.min(m.jsHeapSizeLimit*.85,1.2e9)}catch(e){return true}};
R.domElement.addEventListener('webglcontextlost',()=>{if(rec&&rec.state!=='inactive'){try{toast('حافظهٔ گرافیک از دست رفت؛ ویدیوی ضبط‌شده ذخیره می‌شود')}catch(e){}recStop()}},false);
document.body.insertAdjacentHTML('beforeend','<div id="rect" class="g">● <span></span></div>');
const rsec=()=>Math.floor((racc+(rt0?performance.now()-rt0:0))/1000),r2=n=>String(n).padStart(2,'0');
function recStart(mode){mode=RMODES[mode]?mode:recMode();
if(!window.MediaRecorder||!R.domElement.captureStream)return toast('این مرورگر از ضبط ویدیو پشتیبانی نمی‌کند');
if(!RMT.some(t=>MediaRecorder.isTypeSupported(t)))return toast('قالب ویدیو در این مرورگر پشتیبانی نمی‌شود');
if(rUrl){URL.revokeObjectURL(rUrl);rUrl=''}
let pr=LOW?1:MOB0?1.5:Math.min(Math.max(devicePixelRatio||1,1.5),2.5);const k0=innerWidth*innerHeight*pr*pr;if(k0>RMAXPX)pr*=Math.sqrt(RMAXPX/k0); // سقف ۴K برای ادیتورها
const w=Math.floor(innerWidth*pr)&~1,h=Math.floor(innerHeight*pr)&~1,mt=rmts(w,h).find(t=>MediaRecorder.isTypeSupported(t)); // فاز ۰: موبایل حداکثر ۱٫۵ (پایداری ضبط)؛ دسکتاپ مثل قبل تا ۲٫۵؛ ابعاد زوج برای انکودر
RC.on=1;R.setPixelRatio(1);R.setSize(w,h,false);
let st,hc=null;try{hc=HUDM&&HUDM.createHudCapture(R.domElement,RMODES[mode])}catch(e){hc=null}
st=hc?hc.canvas.captureStream(RFPS):R.domElement.captureStream(RFPS);RCOMP=hc?hc.frame:null;const vt=st.getVideoTracks();rAud=null;
try{const a=window.__tribeAudio&&window.__tribeAudio();if(a&&a.ac&&a.out&&a.ac.state==='running'){const d=a.ac.createMediaStreamDestination();a.out.connect(d);rAud={d,out:a.out};st=new MediaStream([...vt,...d.stream.getAudioTracks()])}}catch(e){rAud=null}
rgo(st,mt,w,h)}
let rDS=null;
function rgo(st,mt,w,h,ui){try{rec=new MediaRecorder(st,{mimeType:mt,videoBitsPerSecond:Math.round(Math.max(8e6,Math.min(12e6,w*h*RFPS*.2))),audioBitsPerSecond:192000})}catch(e){recEnd();return toast('شروع ضبط ممکن نشد')}
rch=[];rbytes=0;
rec.ondataavailable=e=>{if(e.data&&e.data.size){rch.push(e.data);rbytes+=e.data.size;if(rbytes>RCAP&&rec&&rec.state!=='inactive'){toast('به سقف حجم رسید؛ ویدیو ذخیره می‌شود');recStop()}}};
rec.onerror=()=>{toast('خطا در ضبط؛ آنچه ضبط شده ذخیره می‌شود');recStop()};
rec.onstop=()=>recSave(mt);if(ui)document.body.classList.add('rch');
rec.start(1000);racc=0;rt0=performance.now();
(ui?$('brec2'):$('brec')).classList.add('rec');const el=$('rect');el.classList.add('on');el.lastChild.textContent='۰۰:۰۰';
rtick=setInterval(()=>{const s=rsec();el.lastChild.textContent=fa(r2(s/60|0))+':'+fa(r2(s%60));
 if(rec&&rec.state==='recording'&&!rHeapOK()){toast('حافظهٔ مرورگر رو به پرشدن است؛ ضبط ذخیره می‌شود');recStop()}},500); // محافظ heap (فاز ۰) — غیربصری، فقط حین ضبط فعال است
if(!ui)toast('ضبط شروع شد؛ برای پایان دوباره روی 🎥 بزن')}
async function recStartUI(){if(rec)return;
if(!window.MediaRecorder||!(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia))return toast('ضبط با رابط فقط روی کامپیوتر (کروم/اج) کار می‌کند');
if(!RMT.some(t=>MediaRecorder.isTypeSupported(t)))return toast('قالب ویدیو در این مرورگر پشتیبانی نمی‌شود');
try{rDS=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:RFPS,cursor:'never'},audio:false,preferCurrentTab:true,selfBrowserSurface:'include'})}catch(e){rDS=null;return toast('ضبط لغو شد')}
if(rUrl){URL.revokeObjectURL(rUrl);rUrl=''}
const vt=rDS.getVideoTracks(),ss=vt[0].getSettings(),w=ss.width||innerWidth,h=ss.height||innerHeight,mt=rmts(w,h).find(t=>MediaRecorder.isTypeSupported(t));let st=new MediaStream(vt);rAud=null;
try{const a=window.__tribeAudio&&window.__tribeAudio();if(a&&a.ac&&a.out&&a.ac.state==='running'){const d=a.ac.createMediaStreamDestination();a.out.connect(d);rAud={d,out:a.out};st=new MediaStream([...vt,...d.stream.getAudioTracks()])}}catch(e){rAud=null}
vt[0].onended=()=>recStop();rgo(st,mt,w,h,1)}
function recStop(){if(rec&&rec.state!=='inactive'){try{if(rec.state==='paused')rec.resume();rec.stop()}catch(e){recSave('')}}}
function recEnd(){RCOMP=null;clearInterval(rtick);$('brec').classList.remove('rec');$('brec2').classList.remove('rec');document.body.classList.remove('rch');if(rDS){rDS.getTracks().forEach(t=>t.stop());rDS=null}$('rect').classList.remove('on');
if(rAud){try{rAud.out.disconnect(rAud.d)}catch(e){}rAud=null}
if(RC.on){RC.on=0;R.setPixelRatio(PRX);R.setSize(innerWidth,innerHeight);onRes()}}
async function recSave(mt){recEnd();const parts=rch;rch=[];rec=null;if(!parts.length)return toast('چیزی ضبط نشد');
const type=(mt||'video/webm').split(';')[0];let blob=new Blob(parts,{type});
// MP4 مرورگر «تکه‌تکه» است و بعضی ادیتورها نمی‌پذیرند؛ به MP4 معمولی (با مدت‌زمان و جدول فریم) تبدیل می‌شود — هر خطایی ⇒ فایل اصلی
if(type.includes('mp4')){toast('در حال آماده‌سازی فایل…');try{MFX=MFX||await import('/11-features-mp4fix.js');blob=await MFX.fixMp4(blob)}catch(e){console.warn('mp4fix',e)}}
const d=new Date(),n='tribe-world-'+d.getFullYear()+r2(d.getMonth()+1)+r2(d.getDate())+'-'+r2(d.getHours())+r2(d.getMinutes())+r2(d.getSeconds())+(type.includes('mp4')?'.mp4':'.webm');
rUrl=URL.createObjectURL(blob);const a=document.createElement('a');a.href=rUrl;a.download=n;document.body.appendChild(a);a.click();a.remove();
toast('✅ ویدیو ذخیره شد · '+fa(blob.size/1048576,0)+' مگابایت')}
document.addEventListener('visibilitychange',()=>{if(!rec||rec.state==='inactive')return; // وقتی صفحه پنهان شد، ضبط مکث می‌کند تا فریم‌های یخ‌زده ذخیره نشود
if(document.hidden){if(rec.state==='recording'){rec.pause();racc+=performance.now()-rt0;rt0=0}}else if(rec.state==='paused'){rec.resume();rt0=performance.now()}});
addEventListener('beforeunload',e=>{if(rec&&rec.state!=='inactive'){e.preventDefault();e.returnValue=''}});
document.body.insertAdjacentHTML('beforeend','<div id="recm" class="g"><div data-m="clean"><b>🖥️ تمام‌صفحه</b><small>فقط تصویر بازی؛ بدون نوار بالا و پایین</small></div><div data-m="hud"><b>📊 با نوارها</b><small>همراه منابع، مرحله و زیرنویس (مثل قبل)</small></div></div>');
const rmenu=$('recm'),rmClose=()=>rmenu.classList.remove('on');
function rmOpen(){const q=$('brec').getBoundingClientRect(),m=recMode();rmenu.querySelectorAll('[data-m]').forEach(e=>e.classList.toggle('on',e.dataset.m===m));rmenu.classList.add('on');
const w=rmenu.offsetWidth,hh=rmenu.offsetHeight;let l=q.left>innerWidth/2?q.left-w-8:q.right+8;l=Math.max(6,Math.min(innerWidth-w-6,l));rmenu.style.left=l+'px';rmenu.style.top=Math.max(6,Math.min(innerHeight-hh-6,q.top+q.height/2-hh/2))+'px'}
rmenu.onclick=e=>{const t=e.target.closest('[data-m]');if(!t)return;try{localStorage.rec_mode=t.dataset.m}catch(x){}rmClose();recStart(t.dataset.m)};
document.addEventListener('pointerdown',e=>{if(rmenu.classList.contains('on')&&!e.target.closest('#recm,#brec'))rmClose()},true);
$('brec').onclick=()=>{if(RC.on)return recStop();rmenu.classList.contains('on')?rmClose():rmOpen()};
$('brec2').onclick=()=>rec?recStop():CIN?CIN.toggle():recStartUI();
import('/11-features-hudcap.js').then(m=>HUDM=m).catch(e=>console.warn('hudcap',e));
import('/11-features-cinema.js').then(m=>{CIN=m.initCinema({cam,ctl,toast,dom:R.domElement,low:LOW,center:()=>ctr,radius:()=>RAD,hq:()=>hqH,rec:{start:()=>(MOB0||!(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia))?recStart():recStartUI(),stop:recStop,on:()=>!!rec}})}).catch(e=>console.warn('cinema',e));
addEventListener('keydown',e=>{if(e.key==='F8'){e.preventDefault();rec?recStop():recStartUI()}});
