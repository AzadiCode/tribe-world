// ═══ نقطهٔ شروع فرانت‌اند ═══
// ۱) سه‌بعدی (three.js) را می‌گیرد و سراسری می‌کند  ۲) فایل‌های بازی را به ترتیب لیست زیر بارگذاری می‌کند.
// فایل جدید؟ فقط اسمش را (بدون .js) به GAME_FILES اضافه کن. ترتیب مهم است: هر فایل می‌تواند از فایل‌های بالاتر از خودش استفاده کند.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
Object.assign(globalThis,{THREE,OrbitControls,mergeGeometries});

const GAME_FILES=[
  'core/engine',
  'core/state',
  'core/materials',
  'world/scenery',
  'buildings/models',
  'characters/dialogue',
  'world/roads',
  'world/environment',
  'characters/nametags',
  'ui/interaction',
  'admin/panel',
  'features/recorder',
  'characters/navigation',
  'characters/models',
  'characters/behavior',
  'world/cars',
  'ui/hud',
  'buildings/houseview',
  'net/sync',
  'net/telegram',
  'features/music',
  'core/main',
];

const load=name=>new Promise((ok,bad)=>{
  const s=document.createElement('script');
  s.src='/js/'+name+'.js';
  s.onload=ok;
  s.onerror=()=>bad(new Error('فایل بارگذاری نشد: '+name));
  document.head.appendChild(s);
});

try{for(const f of GAME_FILES) await load(f)}catch(e){const m=document.getElementById('ldm');if(m){m.textContent='خطا در بارگذاری: '+e.message+' — صفحه را رفرش کن';m.className='on'}throw e}
