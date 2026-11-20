// ═══ نام بالای سر شهروندان، حباب حرف، دریافت پیام‌های مدیر (chat) و محاسبهٔ جای نام‌ها روی صفحه (tags). ═══
'use strict';
// ── نام‌ها و حباب‌ها
const tv=new THREE.Vector3();
const nameOf=i=>(W&&W.citizens&&W.citizens[i]&&W.citizens[i].name)||(i===0?'بنیان‌گذار':DEF[(i-1)%DEF.length]+(i>DEF.length?' '+fa(Math.ceil(i/DEF.length)):''));
// المان DOM اسم/حباب «تنبل» ساخته می‌شود: فقط وقتی شهروند واقعاً اسم یا حباب لازم دارد (قبلاً برای هر شهروند، حتی نمایش‌داده‌نشده‌ها، یک div ساخته می‌شد)
function lazyEl(c,f){c._el=null;c._nb=null;Object.defineProperties(c,{
 el:{configurable:true,get(){if(!c._el){const e=document.createElement('div');e.className='nt'+(f?' f':'')+(c.me?' me':'');e.innerHTML='<b></b>';e.style.display='none';$('nts').appendChild(e);c._el=e;c._nb=e.firstChild;c._nb.textContent=nameOf(c.i);c.sh=0}return c._el}},
 nb:{configurable:true,get(){return c.el&&c._nb}}})}
function names(){for(const c of cits)if(c._nb)c._nb.textContent=nameOf(c.i)}
function bubble(c,text,ms=5000,big){const o=c.el.querySelector('.bb');if(o)o.remove();const b=document.createElement('div');b.className='bb'+(big?' ms':'');b.textContent=text;c.el.prepend(b);clearTimeout(c.bt);c.bt=setTimeout(()=>{b.style.opacity=0;setTimeout(()=>b.remove(),450)},ms)}
function react(c){if(c.hid)return;c.rx=1.2;c.path=[];c.act='';c.st='stay';c.tm=2.6;c.fa=null;c.pt=null;c.cv=null;c.ty=null;c.lk=3;const g=c.g;g.rotation.y=Math.atan2(cam.position.x-g.position.x,cam.position.z-g.position.z);bubble(c,dgTap(c),2600)}
function chatSync(w){if(!w.chat)return;const mx=w.chat.reduce((a,m)=>Math.max(a,m.id),0);if(lastChat<0)lastChat=mx;else for(const m of w.chat)if(m.id>lastChat){const c=cits[m.cid>=0&&m.cid<cits.length?m.cid:Math.random()*cits.length|0];if(c)bubble(c,m.text,7000,1)}lastChat=Math.max(lastChat,mx)}
let TGM=MOB?22:40;const TGM0=TGM,TGA=new Float32Array(720),TGB=new Float32Array(720);
function tags(){if(meRing)meRing.material.opacity=.55+.3*Math.sin(performance.now()/380);const hw=innerWidth/2,hh=innerHeight/2;let thr=1e9;if(namesOn&&cits.length>TGM){let n=0;for(const c of cits)if(!c.hid)TGA[n++]=cam.position.distanceTo(c.g.position);if(n>TGM){TGB.set(TGA.subarray(0,n));thr=TGB.subarray(0,n).sort()[TGM-1]}}for(const c of cits){const el=c._el,hasB=!!el&&el.childElementCount>1;if(c.hid||(!namesOn&&!hasB&&!c.me)){if(c.sh!==0){if(el)el.style.display='none';c.sh=0}continue}tv.copy(c.g.position);tv.y+=c.g.scale.y*1.1;const d=cam.position.distanceTo(tv),nm=c.me||(namesOn&&d<44&&d<=thr+1.2);if(d>=75||!(hasB||nm)){if(c.sh!==0){if(el)el.style.display='none';c.sh=0}continue}tv.project(cam);if(!(tv.z<1&&Math.abs(tv.x)<1.15&&Math.abs(tv.y)<1.15)){if(c.sh!==0){if(el)el.style.display='none';c.sh=0}continue}const e2=c.el;if(c.sh!==1){e2.style.display='';c.sh=1}e2.style.transform=`translate(${(tv.x*hw+hw).toFixed(1)}px,${(hh-tv.y*hh).toFixed(1)}px) translate(-50%,-100%) scale(${Math.max(.62,Math.min(1.05,30/d)).toFixed(2)})`;const nd=nm?'':'none';if(c.nd!==nd){c._nb.style.display=nd;c.nd=nd}}}
