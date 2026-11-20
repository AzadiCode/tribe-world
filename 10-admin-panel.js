// ═══ پنل مدیریت داخل بازی (با ?admin=1): تب‌های وضعیت، داستان، ساخت، آدم‌ها و زمان، آنلاین‌ها.
// فراخوانی‌های /api/admin/... از اینجا می‌رود؛ سمت سرور ← 01-server-admin.py ═══
'use strict';
// ── پنل ادمین داخل بازی: فقط با ?admin=1 دکمه دیده می‌شود و فقط بعد از ورود با ADMIN_KEY باز می‌شود (دسترسی واقعی را سرور با توکن کنترل می‌کند)
let APok=0,APtab='main',APP=null,APpt=0;
async function apPlayers(){try{APP=await api('/api/admin/players','GET',null,1)}catch(e){}if(APtab==='on'&&$('ap')&&$('ap').style.display==='flex')apRender()}
setInterval(()=>{if(APtab==='on'&&$('ap')&&$('ap').style.display==='flex'){APpt=Date.now();apPlayers()}},15000);
const apAgo=s=>s<60?'لحظاتی پیش':s<3600?apFd(Math.floor(s/60))+' دقیقه پیش':s<86400?apFd(Math.floor(s/3600))+' ساعت پیش':apFd(Math.floor(s/86400))+' روز پیش';
const apEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),apFd=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]),apV=id=>$('ap_'+id).value,apN=id=>+apV(id)||0;
function openAP(){if(!T)return;if(!APok){APok=1;document.body.insertAdjacentHTML('beforeend','<div id="ap" class="g"><div id="aph"><b>🛠️ پنل ادمین</b><span><span id="apo">خروج</span><span id="apx">✕</span></span></div><div id="apt"></div><div id="apb"></div></div>');
 $('apx').onclick=()=>{$('ap').style.display='none'};
 $('apo').onclick=()=>{T=localStorage.tk='';setAdm(0);$('ap').style.display='none';toast('از حالت مدیر خارج شدی')};
 $('apt').onclick=e=>{const t=e.target.closest('[data-t]');if(t){APtab=t.dataset.t;apRender()}};
 $('apb').onclick=apClick}
 const p=$('ap');p.style.display=p.style.display==='flex'?'none':'flex';apRender()}
async function apAct(fn,ok){try{await fn();toast(ok||'✅ انجام شد');await poll();apRender()}catch(e){if(!T&&$('ap'))$('ap').style.display='none'}}
function apRender(){const w=W;if(!w||!$('ap'))return;const s=w.stats,R={pop:'👥 جمعیت',money:'💰 خزانه',food:'🌾 غذا',subs:'▶️ مشترک'};
 $('apt').innerHTML=[['main','وضعیت'],['story','داستان'],['build','ساخت'],['cit','آدم‌ها و زمان'],['wx','🌦️ آب‌وهوا'],['on','🟢 آنلاین']].map(([k,n])=>`<span data-t="${k}" class="${APtab===k?'on':''}">${n}</span>`).join('');
 let h='';
 if(APtab==='on'){if(Date.now()-APpt>8000){APpt=Date.now();apPlayers()}
  if(!APP)h='<p>در حال بارگذاری…</p>';else{const P=APP.players,M=60;h=`<p>🟢 آنلاین الان: <b>${apFd(APP.online)}</b> از <b>${apFd(APP.total)}</b> بازیکن</p><div class="l">${P.slice(0,M).map(p=>`<div class="b"><span>${p.on?'🟢':'⚪'} ${apEsc(nameOf(p.cid))}</span><span>${p.on?'آنلاین':apAgo(APP.now-p.seen)}</span></div>`).join('')||'<p>هنوز کسی وارد نشده</p>'}${P.length>M?`<p>… و ${apFd(P.length-M)} نفر دیگر</p>`:''}</div>`}}
  else if(APtab==='main')h=`<p>${apEsc(w.country.name)} · ${Object.entries(R).map(([k,v])=>v+' <b>'+apFd(Math.round(s[k]))+'</b>').join(' · ')} · ظرفیت <b>${apFd(w.capacity)}</b></p>
 <h4>🎬 ثبت مشترک / مشارکت یوتیوب</h4><div class="r"><select id="ap_ck"><option value="subscriber">مشترک جدید</option><option value="contribution">مشارکت</option></select><input class="n" id="ap_cn" type="number" value="1" min="1"><input class="f" id="ap_cnote" placeholder="یادداشت (نام)"><button data-a="contrib">ثبت</button></div>
 <h4>⚖️ تغییر جمعیت و منابع (منفی = کاهش)</h4><div class="r">${Object.entries(R).map(([k,v])=>`<label>${v}<input class="n" id="ap_a_${k}" type="number" placeholder="±"></label>`).join('')}</div>
 <div class="r"><input class="f" id="ap_anote" placeholder="یادداشت (اختیاری)"><button data-a="adjust">اعمال</button></div>
 <div class="r"><input class="f" id="ap_name" placeholder="نام کشور"><button class="s" data-a="rename">تغییر نام</button></div>`;
 else if(APtab==='story')h=`<h4>📜 اتفاق داستانی</h4><input class="f" style="width:100%" id="ap_et" placeholder="مثلاً: سیل مزارع را خراب کرد"><div class="r"><input class="n" id="ap_ef" type="number" placeholder="غذا ±"><input class="n" id="ap_em" type="number" placeholder="پول ±"><input class="n" id="ap_ep" type="number" placeholder="جمعیت ±"><button data-a="story">اعمال</button></div>
 <h4>🗳️ نتیجه‌ی رأی‌گیری مراحل</h4>${w.goals.map(g=>`<div class="b"><span>${apFd(g.at)} نفر: ${apEsc(g.title)} ${g.value?'✅ '+apEsc(g.value):''}</span>${s.subs>=g.at?`<button data-a="ms" data-k="${apEsc(g.key)}">ثبت نتیجه</button>`:'<span style="opacity:.6">هنوز نرسیده</span>'}</div>`).join('')}`;
 else if(APtab==='build'){const bs=w.buildings,hv=b=>b.type!=='road'&&b.type!=='path'&&b.type!=='tree',L=bs.filter(hv).concat(bs.filter(b=>!hv(b))),M=60;
 h=`<h4>🏗️ ساخت ساختمان</h4><div class="r"><select id="ap_bt">${Object.entries(w.catalog).map(([k,v])=>`<option value="${apEsc(k)}">${apEsc(v)}</option>`).join('')}</select><input class="n" id="ap_bx" type="number" placeholder="x"><input class="n" id="ap_bz" type="number" placeholder="z"><label class="c"><input id="ap_free" type="checkbox">رایگان</label><button data-a="addb">بساز</button></div>
  <h4>🧱 ساختمان‌ها (${apFd(bs.length)})</h4><div class="l">${L.slice(0,M).map(b=>`<div class="b"><span>${apEsc(w.catalog[b.type]||b.type)} #${apFd(b.id)} (${apFd(b.x)}، ${apFd(b.z)})</span><span><button class="s" data-a="mvb" data-i="${b.id}">جابه‌جایی</button><button class="d" data-a="delb" data-i="${b.id}">حذف</button></span></div>`).join('')}${L.length>M?`<p>… و ${apFd(L.length-M)} مورد دیگر (با ابزارهای روی نقشه)</p>`:''}</div>`}
 else if(APtab==='wx'){const wx=w.weather||{},wm=wx.mode==='manual'?'manual':'auto',wt=WXTYPES[wx.type]?wx.type:'clear',
  wi=Math.round((isFinite(+wx.intensity)?+wx.intensity:.7)*100),wtr=Math.round(+wx.transition||25),wtp=Math.round(+wx.temp||24);
  h=`<h4>🌦️ آب‌وهوای دنیا</h4>
 <div class="r"><select id="ap_wm"><option value="auto"${wm==='auto'?' selected':''}>خودکار (تغییر طبیعی)</option><option value="manual"${wm==='manual'?' selected':''}>دستی (انتخاب مدیر)</option></select>
 <select id="ap_wt">${Object.keys(WXTYPES).map(k=>`<option value="${k}"${k===wt?' selected':''}>${WXFA[k]}</option>`).join('')}</select></div>
 <div class="r"><label>شدت (٪)<input class="n" id="ap_wi" type="number" min="10" max="100" value="${wi}"></label>
 <label>گذار (ثانیه)<input class="n" id="ap_wtr" type="number" min="3" max="180" value="${wtr}"></label>
 <label>دمای پایه (°)<input class="n" id="ap_wtp" type="number" min="-15" max="48" value="${wtp}"></label>
 <button data-a="wx">اعمال</button></div>
 <div class="r"><button class="s" data-a="wxa">بازگشت به چرخهٔ طبیعی</button></div>
 <p style="opacity:.7">حالت دستی: هوای انتخابی برای همهٔ بازیکن‌ها اعمال می‌شود؛ «شدت» تراکم بارش/مه و «گذار» سرعت نرم‌شدن تغییر را تعیین می‌کند. چرخهٔ خودکار با احتمال و ماندگاری طبیعی خودش ادامه می‌یابد.</p>`}
 else h=`<h4>🏷️ نام مستعار و پیام</h4><div class="r"><input class="n" style="width:84px" id="ap_ci" type="number" placeholder="شماره آدم"><input class="f" id="ap_cname" placeholder="نام مستعار (خالی = پیش‌فرض)"><button class="s" data-a="cit">ثبت نام</button></div>
 <div class="r"><input class="f" id="ap_ctx" placeholder="پیام بالای سر (شماره خالی = تصادفی)"><button data-a="say">ارسال</button></div>
 <h4>🕒 زمان دنیا</h4><div class="r">${(()=>{const m=(w.env||{}).mode||'live';return `<select id="ap_em2">${[['live','زنده'],['lapse','گذر سریع روز'],['fixed','ساعت ثابت']].map(([k,n])=>`<option value="${k}"${k===m?' selected':''}>${n}</option>`).join('')}</select>`})()}<input class="n" id="ap_eh" type="number" placeholder="ساعت" value="${apEsc(Math.round((w.env||{}).hour||12))}"><button data-a="env">اعمال</button></div>`;
 $('apb').innerHTML=h}
async function apClick(e){const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,w=W;
 if(a==='contrib')return apAct(()=>api('/api/admin/contribution','POST',{kind:apV('ck'),count:apN('cn')||1,note:apV('cnote')}),'ثبت شد ✅');
 if(a==='adjust'){const o={note:apV('anote')};['pop','money','food','subs'].forEach(k=>o[k]=apN('a_'+k));return apAct(()=>api('/api/admin/adjust','POST',o),'اعمال شد ✅')}
 if(a==='rename'){if(apV('name'))return apAct(()=>api('/api/admin/adjust','POST',{name:apV('name')}),'نام تغییر کرد ✅');return}
 if(a==='story')return apAct(()=>api('/api/admin/event','POST',{text:apV('et'),effects:{food:apN('ef'),money:apN('em'),pop:apN('ep')}}),'اتفاق ثبت شد ✅');
 if(a==='ms'){const k=b.dataset.k,v=await ask(k==='name'?'اسم انتخاب‌شده‌ی قبیله:':'نظام حکومت (پادشاهی / جمهوری):');if(v)apAct(()=>api('/api/admin/milestone','POST',{key:k,value:v}),'ثبت شد ✅');return}
 if(a==='addb')return apAct(()=>api('/api/admin/building','POST',{type:apV('bt'),x:apV('bx'),z:apV('bz'),free:$('ap_free').checked}),'ساخته شد ✅');
 if(a==='delb'){if(confirm('حذف شود؟'))apAct(()=>api('/api/admin/building/'+b.dataset.i,'DELETE'),'حذف شد');return}
 if(a==='mvb'){const bd=w.buildings.find(x=>x.id==b.dataset.i);if(!bd)return;const v=await ask('مختصات جدید (x,z)',bd.x+','+bd.z);if(!v)return;const [x,z]=v.split(',').map(Number);if(isNaN(x)||isNaN(z))return toast('مختصات نامعتبر');apAct(()=>api('/api/admin/building/'+bd.id,'PUT',{x,z,rot:bd.rot}),'جابه‌جا شد ✅');return}
 if(a==='cit')return apAct(()=>api('/api/admin/citizen/'+(apN('ci')),'PUT',{name:apV('cname')}),'نام ثبت شد ✅');
 if(a==='say')return apAct(()=>api('/api/admin/say','POST',{cid:apV('ci')===''?null:apN('ci'),text:apV('ctx')}),'پیام ارسال شد ✅');
 if(a==='env')return apAct(()=>api('/api/admin/env','POST',{mode:apV('em2'),hour:apN('eh')||12}),'زمان تنظیم شد ✅');
 if(a==='wx')return apAct(()=>api('/api/admin/weather','POST',{mode:'manual',type:apV('wt'),intensity:(apN('wi')||70)/100,transition:apN('wtr')||25,temp:apV('wtp')===''?undefined:apN('wtp')}),'آب‌وهوا تنظیم شد ✅');
 if(a==='wxa')return apAct(()=>api('/api/admin/weather','POST',{mode:'auto'}),'چرخهٔ طبیعی آب‌وهوا فعال شد ✅');
 if(a==='tools'){setAdm(!admOn);$('ap').style.display='none'}}
