// ═══ نمای داخل خانه: در نزدیک‌ترین زوم روی خانه بزن ← دوربین می‌رود روی خانه، سقف بالا می‌رود، دیوارها کوتاه می‌شوند،
// کارت مشخصات پایین صفحه می‌آید. بستن: دکمهٔ ✕ ، زدن روی زمین، یا زوم‌اوت. (مبلمان فقط بار اول باز شدن ساخته می‌شود.) ═══
'use strict';
const HOV={g:null,act:new Set(),fly:0,t:0,html:'',goal:new THREE.Vector3(),D:6,PH:.6},HOV_NEAR=12;   // HOV_NEAR: فاصلهٔ دوربین تا هدف که «زوم نزدیک» حساب می‌شود
document.body.insertAdjacentHTML('beforeend','<div id="hv" class="g"></div>');
$('hv').addEventListener('pointerup',e=>e.stopPropagation());                       // تاچ روی کارت، به صحنه نرسد
R.domElement.addEventListener('pointerdown',()=>{HOV.fly=0},true);addEventListener('wheel',()=>{HOV.fly=0},{passive:true});   // کاربر خودش چرخاند ← پرواز خودکار قطع
const hvEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]),hvRow=(a,v)=>`<div class="rw"><span>${a}</span><b>${v}</b></div>`;
// ── مبلمان داخل خانه (تخت، میز، کمد، فرش، گلدان، چراغ)؛ تخت و میز با زوج/فرد بودن شمارهٔ خانه جابه‌جا می‌شوند
function mkInterior(g){const k=g.userData.b.id,m=k%2?1:-1,I=new THREE.Group();I.position.y=.17;g.add(I);
bx(I,.56,.012,.4,[0x3f7f99,0xc8553a,0x7a9a4a,0xe0a43a][k%4],0,0,.08);
bx(I,.34,.07,.62,0x6b4326,-.34*m,0,-.1);bx(I,.3,.05,.56,0xf2ead6,-.34*m,.07,-.1);bx(I,.3,.055,.34,AWN[k%4],-.34*m,.075,.03);bx(I,.22,.05,.12,0xfaf6ea,-.34*m,.12,-.33);
cyl(I,.03,.05,.17,0x6b4326,.22*m,0,.1,6);bx(I,.34,.03,.28,0xa9794a,.22*m,.17,.1);cyl(I,.015,.015,.1,0x3a2a1c,.22*m,.2,.1,5);
const lb=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),GLOW);lb.position.set(.22*m,.33,.1);I.add(lb);   // چراغ روی میز (شب روشن‌تر می‌شود)
cyl(I,.07,.07,.12,0x8a5a35,.22*m,0,-.16,8);cyl(I,.07,.07,.12,0x8a5a35,.22*m,0,.34,8);
bx(I,.28,.34,.12,0x8a5a35,.36*m,0,-.35);bx(I,.08,.08,.08,0xd94f3a,.3*m,.34,-.35);bx(I,.08,.06,.08,0x3f7f99,.42*m,.34,-.35);
cyl(I,.05,.04,.08,0xb0683b,-.42*m,0,.33,7);ball(I,.09,0x4f8f4a,-.42*m,.17,.33);bake(I)}
// ── کارت مشخصات (فقط چیزهایی که بازی واقعاً می‌داند)
function hvFill(){const g=HOV.g;if(!g)return;const b=g.userData.b,h=homeById.get(b.id),o=h?ownersIdx(h):[],ins=o.filter(i=>{const c=cits[i];return c&&c.hid&&c.hs&&c.hs.id===b.id}).length,cost=W&&W.cost&&W.cost.house;
const html=`<button id="hvx" aria-label="بستن">✕</button><h3>${hvEsc(bInfo(b))}</h3>`+hvRow('تعداد ساکنان',fa(o.length)+' نفر')+hvRow('الان داخل خانه',fa(ins)+' نفر')+(cost?hvRow('ارزش ساخت',fa(cost/1e6,1)+' میلیون تومان'):'')+hvRow('شمارهٔ خانه',fa(b.id));
if(html!==HOV.html){HOV.html=html;$('hv').innerHTML=html;$('hvx').onclick=closeHouse}}
// ── باز و بسته کردن؛ openHouse فقط وقتی true می‌دهد که کار را انجام داده (دور از خانه false ← رفتار قبلی: نمایش اسم)
function openHouse(g){if(g.userData.b.type!=='house')return false;if(!HOV.g&&cam.position.distanceTo(ctl.target)>HOV_NEAR)return false;
if(!g.userData.inn){mkInterior(g);g.userData.inn=1}g.userData.ok=g.userData.ok||0;
HOV.g=g;HOV.act.add(g);HOV.goal.set(g.position.x,.35,g.position.z);HOV.fly=1;HOV.html='';hvFill();$('hv').classList.add('on');return true}
function closeHouse(){HOV.g=null;HOV.fly=0;$('hv').classList.remove('on')}
function stepHouse(dt){
if(HOV.g){const g=HOV.g;if(objs.get(g.userData.b.id)!==g||cam.position.distanceTo(ctl.target)>HOV_NEAR*1.7)closeHouse();else if((HOV.t-=dt)<=0){HOV.t=1.5;hvFill()}}
for(const g of HOV.act){const u=g.userData,to=g===HOV.g?1:0;u.ok+=(to-u.ok)*Math.min(1,dt*5);if(Math.abs(to-u.ok)<.01){u.ok=to;if(!to)HOV.act.delete(g)}
const e=u.ok*u.ok*(3-2*u.ok);u.roof.position.y=.94+e*1.7;u.roof.rotation.y=e*.5;u.roof.visible=u.ok<.97;u.walls.scale.y=1-.6*e}
if(HOV.fly){const k=Math.min(1,dt*3.5);ctl.target.lerp(HOV.goal,k);const off=cam.position.clone().sub(ctl.target),sp=new THREE.Spherical().setFromVector3(off);sp.radius+=(HOV.D-sp.radius)*k;sp.phi+=(HOV.PH-sp.phi)*k;sp.makeSafe();
off.setFromSpherical(sp);cam.position.copy(ctl.target).add(off);if(ctl.target.distanceTo(HOV.goal)<.02&&Math.abs(sp.radius-HOV.D)<.05)HOV.fly=0}}
