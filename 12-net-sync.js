// ═══ دریافت وضعیت دنیا از سرور (poll هر ۳ ثانیه) و اعمالش روی صحنه: ساختمان‌ها، آمار، مرحله، هدف، شهروندان. ═══
'use strict';
let bSig='';
// سرور با هر tick اقتصادی rev را بالا می‌برد حتی وقتی ساختمانی عوض نشده؛ ناوبری (A*) و جاده‌ها فقط وقتی ساختمان‌ها یا جمعیت واقعاً عوض شدند بازسازی می‌شوند
function sync(w){W=w;rev=w.rev;const ids=new Set(w.buildings.map(b=>b.id));
for(const[id,g]of objs)if(!ids.has(id)){scene.remove(g);disposeObj(g);objs.delete(id)}
for(const b of w.buildings){const g=objs.get(b.id);if(!g)addB(b,bpDelay(b.id));
 else if(b.type==='banner'&&g.userData.b.bn!==b.bn){scene.remove(g);disposeObj(g);objs.delete(b.id);addB(b,0)}   // متن بنر عوض شد ← مش با بافت تازه
 else if(g.userData.b.x!==b.x||g.userData.b.z!==b.z||g.userData.b.rot!==b.rot){g.position.set(b.x*U,0,b.z*U);if(b.type!=='road'&&b.type!=='path')g.rotation.y=b.rot*Math.PI/180;g.userData.b=b}}
plan.visible=!w.buildings.some(b=>b.type==='hq');
// امضای ناوبری باید وضعیت چراغ راهنمایی (tl) و متن بنر (bn) را هم بگیرد وگرنه تغییر آن‌ها rebuildNav/roads را
// زود می‌زند و چراغ‌های تازه اعمال‌شده تا رفرش کامل رسم نمی‌شوند (باگ گزارش‌شده).
{const sig=w.buildings.length+'|'+((w.stats&&w.stats.pop)||0)+'|'+w.buildings.map(b=>b.id+b.type+b.x+','+b.z+','+b.rot+(b.tl?'T':'')+(b.bn||'')).join(';');if(sig!==bSig){bSig=sig;rebuildNav(w);roads(w)}}
const s=w.stats;tgt.pop=s.pop;tgt.money=s.money/1e6;tgt.food=s.food;
const ti=w.tiers.indexOf(w.tier);$('tn').textContent=w.tier;$('path').innerHTML=w.tiers.map((t,i)=>`<i class="${i<ti?'past':i===ti?'on':''}"></i>`).join('<u></u>');
const g=w.goals.find(g=>s.subs<g.at),pend=w.goals.find(g=>s.subs>=g.at&&!g.value);
$('quest').innerHTML=`<div class="fl">${IC.flag}</div><div class="tx">${pend?`<strong>${pend.title}</strong><small>رأی‌گیری در جریان است</small>`:g?`<div class="qh"><strong>${fa(g.at)} نفر ← ${g.title}</strong><small>${fa(s.subs)} از ${fa(g.at)}</small></div><div id="bar"><u style="width:${Math.min(100,s.subs/g.at*100)}%"></u></div>`:'<strong>همه هدف‌ها انجام شد</strong>'}</div>`;
$('ev').innerHTML=w.events.map(e=>`<div><time>${new Date(e.t).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})}</time>${noEm(e.text).replace(/</g,'&lt;')}</div>`).join('');
if(seenEv&&w.events[0]&&w.events[0].t+w.events[0].text!==seenEv){toast(noEm(w.events[0].text));dgEvent(noEm(w.events[0].text))}seenEv=w.events[0]?w.events[0].t+w.events[0].text:'';
POP=s.pop;fitCits();names();chatSync(w);
if(typeof wxSync==='function')wxSync(w.weather)}   // وضعیت آب‌وهوا از سرور ← گذار نرم در 06-world-weather.js
function fitCits(){const n=Math.max(POP?1:0,Math.min(POP,VIS,HARD));let ch=0;while(cits.length<n){cits.push(mkCit(cits.length));ch=1}while(cits.length>n){const c=cits.pop();scene.remove(c.g);disposeObj(c.g);if(c._el)c._el.remove();ch=1}applyMe();if(ch)names()}
function applyMe(){for(const c of cits)if(c.me){c.me=0;c.i=cits.indexOf(c);if(c._el)c._el.classList.remove('me')}
if(MY<1||cits.length<2){if(meRing&&meRing.parent)meRing.parent.remove(meRing);return}
const c=MY<cits.length?cits[MY]:cits[cits.length-1];c.me=1;c.i=MY;c.el.classList.add('me');c.nb.textContent=nameOf(MY);
if(!meRing){meRing=new THREE.Mesh(new THREE.RingGeometry(.4,.53,28),new THREE.MeshBasicMaterial({color:0x3ddc97,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));meRing.rotation.x=-Math.PI/2;meRing.position.y=.03}
c.g.add(meRing)}
async function poll(){try{const w=await(await fetch('/api/world?since='+rev,{cache:'no-store'})).json();if(!w.same)sync(w);$('dot').className=''}catch(e){$('dot').className='off'}}
