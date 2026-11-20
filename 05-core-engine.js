// ═══ موتور سه‌بعدی: ابزارهای کوچک ($ و fa)، تشخیص موبایل/کیفیت، رندرر، صحنه، دوربین، کنترل و نورها.
// تغییر کیفیت، دوربین یا نورپردازی کلی ← اینجا. ═══
'use strict';
const $=id=>document.getElementById(id),CELL=2,fa=(n,d=0)=>Number(n).toLocaleString('fa-IR',{maximumFractionDigits:d});
const MOB0=QD.mob,SW=QD.sw,LOW=QD.start>=6; // حالت سبک: ?q=low یا دکمهٔ استودیو؛ پله‌های دقیق‌تر ← 05-core-quality.js
if(SW)setTimeout(()=>{try{toast('شتاب سخت‌افزاری مرورگر خاموش است؛ در تنظیمات مرورگر روشنش کن تا بازی روان شود')}catch(e){}},5000);
let PRX=QD.pr;const R=new THREE.WebGLRenderer({antialias:QD.aa,powerPreference:'high-performance'});R.setPixelRatio(PRX);R.setSize(innerWidth,innerHeight);
R.shadowMap.enabled=true;R.shadowMap.type=QLV[QD.start].sh==='soft'?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=.92;document.body.prepend(R.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xc9d6c4,48,150);
const cam=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.5,300);const HOME=new THREE.Vector3(15,20,19);cam.position.set(46,52,56);
// زاویهٔ قطبی (پایین‌کشیدنِ دوربین = دیدِ بیشترِ آسمان/زمین): ۱٫۴۴rad ≈ ۸۲٫۵° یعنی ~۲۰٪ بیشتر از قبل (۱٫۲) —
// کشیدن انگشت از پایین به بالا حالا تا نزدیکِ افق می‌رود و «از زمین تا آسمان» بازتر دیده می‌شود.
// زوم‌اوت: ۶۶ = ~۱۰٪ بیشتر از قبل (۶۰) — لایهٔ ابر در ارتفاع ۳۲..۴۶ است و بالای ۵۵+ کامل بالای ابرها می‌افتد.
const ctl=new OrbitControls(cam,R.domElement);Object.assign(ctl,{enableDamping:true,maxPolarAngle:1.44,minPolarAngle:.35,minDistance:4.5,maxDistance:66,screenSpacePanning:false});let CIN=null,RCOMP=null,HUDM=null;
const hemi=new THREE.HemisphereLight(0xdfeaff,0x6f8a55,.7);scene.add(hemi);const moon=new THREE.DirectionalLight(0x9fb4ff,0);scene.add(moon);
const sun=new THREE.DirectionalLight(0xffe2b8,1.9);sun.position.set(-20,30,18);sun.castShadow=true;{const z=QLV[QD.start].ss||QD.sbase;sun.shadow.mapSize.set(z,z)}sun.castShadow=QLV[QD.start].sh!=='off';
Object.assign(sun.shadow.camera,{left:-43,right:43,top:43,bottom:-43,near:5,far:90});sun.shadow.bias=-.0004;sun.shadow.normalBias=.06;scene.add(sun);
