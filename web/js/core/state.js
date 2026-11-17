// ═══ متغیرهای مشترک بازی: ساختمان‌ها (objs)، وضعیت دنیا (W)، حالت مدیر، ساعت و … که همهٔ فایل‌ها استفاده می‌کنند. ═══
'use strict';
const objs=new Map();let W=null;
// ═══ ارتقا: محیط زنده، جاده‌ها، نام‌ها، حباب‌ها، ابزار مدیر ═══
let HARD=140;const MOB=innerWidth<820||matchMedia('(pointer:coarse)').matches;let POP=0,VIS=MOB?40:70,PB=0,fpsA=60,fpsT=0,fpsUp=0,VCAP=1e9,vcT=0,warm=6;
let MY=-1,meRing=null;let mode='',bt='house',admOn=0,namesOn=0,lastChat=-1,T=localStorage.tk||'',drag=null,dn=null,painted=new Set(),NT=0,eh=-1,hT=0,H=12,clkTxt='',tk=9;
const QH=new URLSearchParams(location.search).get('h'),turbs=[],pickR=a=>a[Math.random()*a.length|0],cpx=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]),noEm=t=>String(t).replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]/gu,'').trim();
