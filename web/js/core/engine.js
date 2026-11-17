// ═══ موتور سه‌بعدی: ابزارهای کوچک ($ و fa)، تشخیص موبایل/کیفیت، رندرر، صحنه، دوربین، کنترل و نورها.
// تغییر کیفیت، دوربین یا نورپردازی کلی ← اینجا. ═══
'use strict';
const $=id=>document.getElementById(id),CELL=2,fa=(n,d=0)=>Number(n).toLocaleString('fa-IR',{maximumFractionDigits:d});
const MOB0=innerWidth<820||matchMedia('(pointer:coarse)').matches;const QS=new URLSearchParams(location.search).get('q'),QT=(()=>{try{return localStorage.tq}catch(e){return''}})(),SW=(()=>{try{const g=document.createElement('canvas').getContext('webgl'),x=g&&g.getExtension('WEBGL_debug_renderer_info'),r=x?String(g.getParameter(x.UNMASKED_RENDERER_WEBGL)):'';const l=g&&g.getExtension('WEBGL_lose_context');if(l)l.loseContext();return /swiftshader|llvmpipe|software|basic render/i.test(r)}catch(e){return false}})(),LOW=QS?QS==='low':QT?QT==='low':SW; // حالت سبک: ?q=low یا دکمه‌ی استودیو؛ خودکار فقط وقتی مرورگر رندر نرم‌افزاری دارد
if(SW)setTimeout(()=>{try{toast('شتاب سخت‌افزاری مرورگر خاموش است؛ در تنظیمات مرورگر روشنش کن تا بازی روان شود')}catch(e){}},5000);
let PRX=LOW?1:Math.min(devicePixelRatio,2);const R=new THREE.WebGLRenderer({antialias:!LOW,powerPreference:'high-performance'});R.setPixelRatio(PRX);R.setSize(innerWidth,innerHeight);
R.shadowMap.enabled=true;R.shadowMap.type=LOW?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=.92;document.body.prepend(R.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xc9d6c4,48,150);
const cam=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.5,300);const HOME=new THREE.Vector3(15,20,19);cam.position.set(46,52,56);
const ctl=new OrbitControls(cam,R.domElement);Object.assign(ctl,{enableDamping:true,maxPolarAngle:1.2,minPolarAngle:.35,minDistance:4.5,maxDistance:60,screenSpacePanning:false});let CIN=null,RCOMP=null,HUDM=null;
const hemi=new THREE.HemisphereLight(0xdfeaff,0x6f8a55,.7);scene.add(hemi);const moon=new THREE.DirectionalLight(0x9fb4ff,0);scene.add(moon);
const sun=new THREE.DirectionalLight(0xffe2b8,1.9);sun.position.set(-20,30,18);sun.castShadow=true;sun.shadow.mapSize.set(LOW?1024:MOB0?1536:2048,LOW?1024:MOB0?1536:2048);
Object.assign(sun.shadow.camera,{left:-43,right:43,top:43,bottom:-43,near:5,far:90});sun.shadow.bias=-.0004;sun.shadow.normalBias=.06;scene.add(sun);
