// ═══ اتصال به ربات تلگرام (مینی‌اپ): ورود، پینگ، خروج و «کارکتر من». سمت سرور ← 01-server-telegram.py و 01-server-players.py ═══
'use strict';
const TGW=window.Telegram&&Telegram.WebApp,INIT=(TGW&&TGW.initData)||'';try{if(INIT){TGW.ready();TGW.expand()}}catch(e){}
const PJ=(x={})=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({init:INIT,...x})});
function tgAlert(){const bot=W&&W.bot;if(!bot||sessionStorage.twa)return;sessionStorage.twa=1;document.body.insertAdjacentHTML('beforeend','<div id="tgw"><div class="g"><b>به قبیله بپیوند 🌍</b><div>برای پیوستن به قبیله و دریافت کارکتر اختصاصی، از طریق تلگرام وارد شو.</div><a href="https://t.me/'+bot+'?start=play" target="_blank" rel="noopener">ورود از طریق تلگرام</a><span id="tgx">فعلاً فقط تماشا</span></div></div>');$('tgx').onclick=()=>$('tgw').remove()}
async function joinMe(){if(!INIT)return tgAlert();try{const j=await(await fetch('/api/join',PJ())).json();if(j.cid>0){MY=j.cid;if(j.new)toast('تو هم یکی از شهروندان قبیله شدی؛ علامت سبز بالای سر کارکتر توئه — برای تغییر اسم روش بزن');applyMe();names();poll()}}catch(e){}}
const pingMe=()=>{if(INIT&&MY>0&&!document.hidden)fetch('/api/ping',PJ()).catch(()=>0)};setInterval(pingMe,40000);document.addEventListener('visibilitychange',pingMe);
addEventListener('pagehide',()=>{if(INIT&&MY>0&&navigator.sendBeacon)navigator.sendBeacon('/api/leave',new Blob([JSON.stringify({init:INIT})],{type:'application/json'}))});
