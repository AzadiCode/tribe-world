// ═══ نقطهٔ شروع فرانت‌اند ═══
// ۱) سه‌بعدی (three.js) را می‌گیرد و سراسری می‌کند  ۲) فایل‌های بازی را به ترتیب لیست زیر بارگذاری می‌کند.
// فایل جدید؟ با قالب «شماره-دسته-نام.js» بساز (مثلاً 06-world-rain.js) و همان اسم را (بدون .js) به GAME_FILES اضافه کن. ترتیب مهم است: هر فایل می‌تواند از فایل‌های بالاتر از خودش استفاده کند.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
Object.assign(globalThis,{THREE,OrbitControls,mergeGeometries});

const GAME_FILES=[
  '05-core-quality',
  '05-core-engine',
  '05-core-state',
  '05-core-materials',
  '06-world-scenery',
  '07-buildings-models',
  '07-buildings-footprint',
  '08-characters-dialogue',
  '06-world-roads',
  '06-world-environment',
  '06-world-weather',
  '08-characters-nametags',
  '09-ui-blueprint',
  '09-ui-interaction',
  '10-admin-panel',
  '11-features-recorder',
  '08-characters-navigation',
  '08-characters-models',
  '08-characters-behavior',
  '06-world-cars',
  '09-ui-hud',
  '07-buildings-houseview',
  '12-net-sync',
  '12-net-telegram',
  '11-features-music',
  '05-core-perf',
  '05-core-main',
];

// دریافت موازی فایل‌ها، اجرای ترتیبی برای حفظ وابستگی‌های سراسری
try{
  const sources=await Promise.all(GAME_FILES.map(async name=>{
    const r=await fetch('/'+name+'.js',{cache:'no-store'});
    if(!r.ok)throw new Error('فایل بارگذاری نشد: '+name+' ('+r.status+')');
    return await r.text();
  }));
  for(let i=0;i<GAME_FILES.length;i++){
    const s=document.createElement('script');
    s.textContent=sources[i]+'\n//# sourceURL=/'+GAME_FILES[i]+'.js';
    s.onerror=()=>console.error('[TribeWorld script execution]',GAME_FILES[i]);
    document.head.appendChild(s);
  }
}catch(e){
  console.error('[TribeWorld boot]',e);
  const m=document.getElementById('ldm');
  if(m){m.textContent='خطا در بارگذاری: '+e.message;m.className='on'}
  throw e;
}
