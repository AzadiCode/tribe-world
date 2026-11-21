// ═══ موتور آب‌وهوای زنده: چرخهٔ طبیعی با گذار نرم (وضعیت از سرور ← wxSync)، باد مشترک،
// باران/برف ذره‌ای (BufferGeometry یک‌بار ساخته‌شده، پیچش دوربین-آگاه در شیدر — بدون هزینهٔ CPU در هر فریم)،
// رعدوبرق با صدای تأخیری روی زیرساخت صوتی موجود، زمین خیس/حوضچه، لایهٔ برف، ادغام با نور/آسمان/ابر/مه چرخهٔ شب‌وروز
// و چیپ HUD فارسی. همهٔ تنظیمات از پلهٔ کیفیت Q پیروی می‌کند؛ در هوای «صاف» خروجی عیناً همان نمای قبلی بازی است. ═══
'use strict';
// ─── ۱) وضعیت و پیکربندی ───────────────────────────────────────────
// پاکت هر هوا: cloud پوشش ابر، fog مه، rain/snow نرخ ذرات، wind باد، dark تیرگی، light رعدوبرق
const WXTYPES={
 clear:   {cloud:.06,fog:0,  rain:0,  snow:0,  wind:.14,dark:0,  light:0},
 partly:  {cloud:.42,fog:.04,rain:0,  snow:0,  wind:.3, dark:.12,light:0},
 overcast:{cloud:.92,fog:.1, rain:0,  snow:0,  wind:.42,dark:.48,light:0},
 fog:     {cloud:.5, fog:.72,rain:0,  snow:0,  wind:.08,dark:.22,light:0},
 drizzle: {cloud:.78,fog:.16,rain:.3, snow:0,  wind:.3, dark:.34,light:0},
 rain:    {cloud:.9, fog:.22,rain:.68,snow:0,  wind:.5, dark:.55,light:0},
 storm:   {cloud:1,  fog:.26,rain:1,  snow:0,  wind:.92,dark:.72,light:1},
 snow:    {cloud:.82,fog:.3, rain:0,  snow:.75,wind:.34,dark:.3, light:0}};
const WXFA={clear:'آفتابی',partly:'نیمه‌ابری',overcast:'ابری',fog:'مه',drizzle:'نم‌نم',rain:'باران',storm:'توفان',snow:'برف'};
const WXI={ // آیکون‌ها با همان سبک خطی CI ساعت (stroke) — «صاف» شب‌ها ماه می‌گیرد
 clear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>',
 night:'<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
 partly:'<svg viewBox="0 0 24 24"><circle cx="8" cy="7.5" r="2.6"/><path d="M8 2.8v1.4M3.3 7.5h1.4M4.6 4.1l1 1M11.4 4.1l-1 1M7 16.5a3.6 3.6 0 0 1 .5-7.16A4.7 4.7 0 0 1 16.6 9a3.2 3.2 0 0 1-.3 6.4z"/></svg>',
 overcast:'<svg viewBox="0 0 24 24"><path d="M6.8 15.5a4.2 4.2 0 0 1 .6-8.36A5.4 5.4 0 0 1 17.7 8.2a3.4 3.4 0 0 1-.4 7.3z"/></svg>',
 fog:'<svg viewBox="0 0 24 24"><path d="M6.8 13.5a4.2 4.2 0 0 1 .6-8.36A5.4 5.4 0 0 1 17.7 6.2a3.4 3.4 0 0 1-.4 7.3z"/><path d="M5 17h13M7.5 20h8"/></svg>',
 drizzle:'<svg viewBox="0 0 24 24"><path d="M6.8 13.5a4.2 4.2 0 0 1 .6-8.36A5.4 5.4 0 0 1 17.7 6.2a3.4 3.4 0 0 1-.4 7.3z"/><path d="M9 16.5v1.6M14.5 16.5v1.6M11.75 19.8v1.6"/></svg>',
 rain:'<svg viewBox="0 0 24 24"><path d="M6.8 13.5a4.2 4.2 0 0 1 .6-8.36A5.4 5.4 0 0 1 17.7 6.2a3.4 3.4 0 0 1-.4 7.3z"/><path d="M8.6 16.5l-1 3M12.6 16.5l-1 3M16.6 16.5l-1 3"/></svg>',
 storm:'<svg viewBox="0 0 24 24"><path d="M6.8 13.5a4.2 4.2 0 0 1 .6-8.36A5.4 5.4 0 0 1 17.7 6.2a3.4 3.4 0 0 1-.4 7.3z"/><path d="M12.8 14.5l-2.6 4h2.9l-2 3.6"/></svg>',
 snow:'<svg viewBox="0 0 24 24"><path d="M6.8 13.5a4.2 4.2 0 0 1 .6-8.36A5.4 5.4 0 0 1 17.7 6.2a3.4 3.4 0 0 1-.4 7.3z"/><path d="M9 17.2v3.2M7.6 18.8h2.8M14.6 17.2v3.2M13.2 18.8h2.8"/></svg>'};
const WXQ=[1,1,.9,.82,.72,.6,.5,.4,.32,.22]; // تراکم ذرات بر حسب پلهٔ کیفیت Q (۰=بهترین)
let WXtype='clear',WXint=.7,WXmode='auto',WXtemp=24,WXtempC=24,WXsig='',wxHud='';
const WXcur={cloud:.06,fog:0,rain:0,snow:0,wind:.14,dark:0,light:0};
let WXfrom=null,WXto=null,WXt0=0,WXsec=25,WET=0,SNOWG=0,FLASH=0,wxHudT=0;
const _strikeQ=[]; // ضربه‌های ثانویهٔ آذرخش (زمان‌دار، طول محدود)
// باد مشترک: جهت/سرعت/بوست با تغییر آرام — رانش ابر (WCD) و تپش درخت‌ها (SWAY) و ذرات از همین مدل تغذیه می‌شوند
const WIND={dir:2.3,speed:1,gust:0,x:0,z:0};
let SWAY=1,WCD=.8,gustV=0,gustT=7,gustOn=0; // SWAY/WCD در 05-core-main.js مصرف می‌شوند
// ─── ۲) میان‌یابی چرخهٔ شب‌وروز بدون تخصیص حافظه (آینهٔ kf در 06-world-environment.js) ───────────────────────────────────────────
const _wxT=new THREE.Color(),_wxH=new THREE.Color(),_wxS=new THREE.Color(),_wxA=new THREE.Color(),_wxB=new THREE.Color(),_wxV=new THREE.Vector3(),_wxQ=new THREE.Quaternion(),_kf={si:0,hi:0,ex:0};
function wxKF(h){let i=0;while(i<KF.length-2&&h>=KF[i+1][0])i++;
 const A=KF[i],B=KF[i+1],f=(h-A[0])/(B[0]-A[0]);
 _wxT.setHex(A[1]);_wxA.setHex(B[1]);_wxT.lerp(_wxA,f);
 _wxH.setHex(A[2]);_wxA.setHex(B[2]);_wxH.lerp(_wxA,f);
 _wxS.setHex(A[3]);_wxA.setHex(B[3]);_wxS.lerp(_wxA,f);
 _kf.si=A[4]+(B[4]-A[4])*f;_kf.hi=A[5]+(B[5]-A[5])*f;_kf.ex=A[6]+(B[6]-A[6])*f}
// ─── ۳) ذرات باران/برف: هندسهٔ یک‌بار‌ساخته + شیدر پیچش‌دار (mod در شیدر) ⇒ صفر تخصیص در هر فریم ───────────────────────────────────────────
const RAINN=MOB?840:1800,SNOWN=MOB?600:1200,WXB=38,WXH=30; // جعبهٔ پیچش: ۷۶×۳۰×۷۶ دور نقطهٔ نگاه
function wxPts(n){const g=new THREE.BufferGeometry(),p=new Float32Array(n*3),s=new Float32Array(n),sd=new Float32Array(n);
 for(let i=0;i<n;i++){p[i*3]=Math.random()*WXB*2;p[i*3+1]=Math.random()*WXH;p[i*3+2]=Math.random()*WXB*2;s[i]=.7+Math.random()*.6;sd[i]=Math.random()}
 g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('aS',new THREE.BufferAttribute(s,1));g.setAttribute('aSeed',new THREE.BufferAttribute(sd,1));return g}
const rainU={uT:{value:0},uC:{value:new THREE.Vector3()},uW:{value:new THREE.Vector2()},uFall:{value:17},uLen:{value:1.1},uPx:{value:900},uSlant:{value:0},uO:{value:0},uCol:{value:new THREE.Color(0xb6c6d4)},uFogC:{value:new THREE.Color(0xc9d6c4)},uFogN:{value:40},uFogF:{value:150}};
const rainPts=new THREE.Points(wxPts(RAINN),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:rainU,
 vertexShader:'uniform float uT,uFall,uLen,uPx;uniform vec3 uC;uniform vec2 uW;attribute float aS;varying float vA,vD;void main(){vec3 p;p.y=mod(position.y-uFall*uT*aS,'+WXH+'.0);p.x=mod(position.x-uC.x+uW.x*uT+'+WXB+'.0,'+WXB*2+'.0)-'+WXB+'.0+uC.x;p.z=mod(position.z-uC.z+uW.y*uT+'+WXB+'.0,'+WXB*2+'.0)-'+WXB+'.0+uC.z;vec4 mv=modelViewMatrix*vec4(p,1.);float d=max(1.,-mv.z);gl_PointSize=min(uLen*aS*uPx/d,170.);gl_Position=projectionMatrix*mv;vA=smoothstep(1.4,4.5,d)*clamp(1.-(d-46.)/24.,0.,1.);vD=d;}',
 fragmentShader:'uniform float uO,uSlant,uFogN,uFogF;uniform vec3 uCol,uFogC;varying float vA,vD;void main(){vec2 q=gl_PointCoord-vec2(.5);float cs=cos(uSlant),sn=sin(uSlant);vec2 r=vec2(q.x*cs-q.y*sn,q.x*sn+q.y*cs);float a=(1.-smoothstep(.012,.062,abs(r.x)))*(1.-smoothstep(.28,.5,abs(r.y)));if(a<.01)discard;float fg=clamp((vD-uFogN)/max(1.,uFogF-uFogN),0.,1.);gl_FragColor=vec4(mix(uCol,uFogC,fg*.85),a*uO*vA*(1.-fg*.55));}'}));
rainPts.frustumCulled=false;rainPts.renderOrder=6;rainPts.visible=false;scene.add(rainPts);
const snowU={uT:{value:0},uC:{value:new THREE.Vector3()},uW:{value:new THREE.Vector2()},uFall:{value:1.9},uPx:{value:900},uSway:{value:.9},uSize:{value:.13},uO:{value:0},uCol:{value:new THREE.Color(0xffffff)},uFogC:{value:new THREE.Color(0xc9d6c4)},uFogN:{value:40},uFogF:{value:150}};
const snowPts=new THREE.Points(wxPts(SNOWN),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:snowU,
 vertexShader:'uniform float uT,uFall,uPx,uSway,uSize;uniform vec3 uC;uniform vec2 uW;attribute float aS,aSeed;varying float vA,vD;void main(){vec3 p;float ph=aSeed*6.2832;p.y=mod(position.y-uFall*uT*(.75+aS*.5),'+WXH+'.0);p.x=mod(position.x-uC.x+uW.x*uT+sin(uT*.7+ph)*uSway+'+WXB+'.0,'+WXB*2+'.0)-'+WXB+'.0+uC.x;p.z=mod(position.z-uC.z+uW.y*uT*.8+cos(uT*.55+ph*1.3)*uSway*.8+'+WXB+'.0,'+WXB*2+'.0)-'+WXB+'.0+uC.z;vec4 mv=modelViewMatrix*vec4(p,1.);float d=max(1.,-mv.z);gl_PointSize=min(uSize*aS*uPx/d,24.);gl_Position=projectionMatrix*mv;vA=smoothstep(1.2,4.,d)*clamp(1.-(d-44.)/26.,0.,1.);vD=d;}',
 fragmentShader:'uniform float uO,uFogN,uFogF;uniform vec3 uCol,uFogC;varying float vA,vD;void main(){float a=1.-smoothstep(.16,.5,length(gl_PointCoord-vec2(.5)));if(a<.02)discard;float fg=clamp((vD-uFogN)/max(1.,uFogF-uFogN),0.,1.);gl_FragColor=vec4(mix(uCol,uFogC,fg*.85),a*uO*vA*(1.-fg*.5));}'}));
snowPts.frustumCulled=false;snowPts.renderOrder=6;snowPts.visible=false;scene.add(snowPts);
// ─── ۴) پوشش زمین: حوضچهٔ باران + لکهٔ برف (هرکدام یک مش ادغام‌شده = یک draw call) ───────────────────────────────────────────
// بافت برفِ هم‌بعد زمین (همان الگوی نویز نرم چمن، سفید-آبی) — با onBeforeCompile روی همان متریالِ زمین،
// کراس‌فید نرم چمن↔برف انجام می‌شود (الگوی riverWaterMat؛ بدون recompile در حین بازی).
const texSnow=(()=>{const c=document.createElement('canvas');c.width=c.height=512;const q=c.getContext('2d');
 q.fillStyle='#eef3f8';q.fillRect(0,0,512,512);
 for(let i=0;i<70;i++){const px=Math.random()*512,py=Math.random()*512,r=30+Math.random()*70,cc=['224,233,244','236,243,250','214,226,240'][i%3];
  for(const ox of[-512,0,512])for(const oy of[-512,0,512]){const gr=q.createRadialGradient(px+ox,py+oy,0,px+ox,py+oy,r);gr.addColorStop(0,`rgba(${cc},.5)`);gr.addColorStop(1,`rgba(${cc},0)`);q.fillStyle=gr;q.fillRect(px+ox-r,py+oy-r,2*r,2*r)}}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(7,7);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t})();
ground.material.onBeforeCompile=sh=>{sh.uniforms.uMap2={value:texSnow};sh.uniforms.uBlend={value:0};ground.material.userData.sh=sh;
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D uMap2;uniform float uBlend;')
  .replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,texture2D(uMap2,vMapUv).rgb,uBlend);')};
const pudMat=new THREE.MeshStandardMaterial({color:0x8fa4b8,roughness:.06,metalness:.45,transparent:true,opacity:0,depthWrite:false}),
 snowMat=new THREE.MeshStandardMaterial({color:0xf5f8fc,roughness:.92,transparent:true,opacity:0,depthWrite:false});
let pudM=null,snowPM=null;
{const pg=[],sg=[],disc=(x,z,r,y)=>new THREE.CircleGeometry(r,13).rotateX(-Math.PI/2).translate(x,y,z),pick=()=>{let x,z;do{x=(Math.random()-.5)*54;z=(Math.random()-.5)*54}while(inRiver(x,z));return[x,z]};   // فقط دشتِ مرکزیِ تخت (بدون دیسک شناور روی شیب)
 for(let i=0;i<26;i++){const[x,z]=pick();pg.push(disc(x,z,.45+Math.random()*.85,hgt(x,z)+.021))} // تراز ثابت؛ مرکز شهر هموار است
 for(let i=0;i<85;i++){const[x,z]=pick(),y=hgt(x,z)+.013,n=2+(Math.random()*3|0);for(let j=0;j<n;j++)sg.push(disc(x+(Math.random()-.5)*3,z+(Math.random()-.5)*3,.8+Math.random()*1.5,y))}
 for(let i=0;i<24;i++){const[x,z]=pick();sg.push(disc(x,z,3+Math.random()*3.2,hgt(x,z)+.011))}   // میدان‌های بازِ پهنی: پیوستگی پوشش برف
 pudM=new THREE.Mesh(mergeGeometries(pg,false),pudMat);pudM.receiveShadow=false;scene.add(pudM);
 snowPM=new THREE.Mesh(mergeGeometries(sg,false),snowMat);snowPM.receiveShadow=false;scene.add(snowPM);
 pg.forEach(g=>g.dispose());sg.forEach(g=>g.dispose());pudM.visible=snowPM.visible=false}
// ─── ۴٫۵) لایهٔ سطوح همهٔ سازه‌ها/آیتم‌ها: خِیس‌شدن، برف‌نشستن و ته‌رنگ دمایی — بدون draw call و بدون نور جدید ───────────────────────────────────────────
// هر MeshStandardMaterial دنیا یک‌بار (در لحظهٔ بارگذاری یا با گشت‌زنی دوره‌ای برای متریال‌های زمان-اجر) با این
// لایه patch می‌شود؛ همهٔ متریال‌ها به «همین یک مجموعهٔ uniform مشترک» وصل‌اند ⇒ هر فریم فقط چند عدد مقدار می‌گیرند.
//  uWxWet: تیرگی/براقیِ خیس   uWxSnow: سفیدشدن برفِ نشسته (فقط سطوح رو‌به‌بالا = بام‌ها)   uWxTint/uWxTintAmt: ته‌رنگ سرد/گرم
//  uWxRough: زبری هدف در خیس‌شدن   uWxUpV: بردار «بالا» در فضای دید (برف روی بام، نه روی دیوار)
// استثناها: شیدرهای اختصاصی (زمین/آب/ذرات — onBeforeCompile دارند)، متریال‌های شفاف (هاله/شبح/پوشش‌ها) و منابع نورِ
// قوی (لامپ/پنجرهٔ شب) — این‌ها یا خود موتور آب‌وهوا مستقیم مدیریت‌شان می‌کند یا نباید برف‌گیر/خیس شوند.
const WXU={wet:{value:0},snow:{value:0},tint:{value:new THREE.Color(1,1,1)},tintAmt:{value:0},rough:{value:.4},up:{value:new THREE.Vector3(0,1,0)}};
// فاز ۰ — کلید بنچمارک ALU: ?wxp=0 این لایه را کامل خاموش می‌کند (هیچ متریالی patch نمی‌شود و گشت‌زنی دوره‌ای هم نیست).
// فقط برای اندازه‌گیری «هزینهٔ روشن/خاموش» و مقایسهٔ عددی — پیش‌فرض روشن = رفتار و ظاهر همیشگی. تصمیم حذف/ساده‌سازی بعد از عدد.
const WXP_OFF=new URLSearchParams(location.search).get('wxp')==='0';
function wxPatchMat(m){
 if(WXP_OFF)return;
 if(!m||m.userData.wxP)return;m.userData.wxP=1;
 // توجه: onBeforeCompile روی Material.prototype یک تابعِ خالیِ پیش‌فرض است و همیشه truthy؛
 // «own property» بودنش یعنی شیدر اختصاصی (زمین/آب/جنگل) — آن‌ها نباید دوباره patch شوند.
 if(!m.isMeshStandardMaterial||Object.prototype.hasOwnProperty.call(m,'onBeforeCompile')||m.transparent||m.emissiveIntensity>1.2)return;
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{uWxWet:WXU.wet,uWxSnow:WXU.snow,uWxTint:WXU.tint,uWxTintAmt:WXU.tintAmt,uWxRough:WXU.rough,uWxUpV:WXU.up});
  sh.fragmentShader=sh.fragmentShader
   .replace('#include <common>','#include <common>\nuniform float uWxWet,uWxSnow,uWxTintAmt,uWxRough;uniform vec3 uWxTint,uWxUpV;')
   .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n{float wxSky=smoothstep(.18,.85,dot(normalize(normal),uWxUpV));diffuseColor.rgb*=mix(vec3(1.),uWxTint,uWxTintAmt);diffuseColor.rgb*=mix(vec3(1.),vec3(.62,.68,.74),uWxWet);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.94,.96,.99),uWxSnow*wxSky);roughnessFactor=mix(roughnessFactor,uWxRough,uWxWet);}')}
 m.needsUpdate=true;   // اجبارِ باز-کامپایل: متریال ممکن است پیش از patch (در فریم‌های نخستِ لود دنیا) کامپایل شده باشد؛ برای متریالِ ناکامپایل بی‌ضرر است
}
// ثبت اولیه: همهٔ متریال‌های موجود تا همین لحظهٔ بارگذاری (زمین/جاده/منظره/مدل‌ها + کشِ متریال‌های مشترک) —
// قبل از اولین رندر انجام می‌شود ⇒ صفر کامپایل مجدد شیدر در حین بازی.
{if(!WXP_OFF){const wxReg=o=>{if(!o)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(wxPatchMat)};
 scene.traverse(c=>{if(c.isMesh||c.isInstancedMesh||c.isPoints)wxReg(c)});
 for(const k in mats)wxPatchMat(mats[k])}}
let wxSweepT=.4,wxSweepN=15; // گشت‌زنی متریال‌های زمان-اجر (بنر، پایهٔ چراغ، شهروند، متریال‌های تازهٔ جاده…): در دوران ساخت دنیا هر ۰٫۴ثانیه، بعد هر ۲٫۵ثانیه — هر متریال فقط یک‌بار patch می‌شود
// ─── ۵) هدف پاکت + همگام‌سازی از سرور (از sync در 12-net-sync.js صدا زده می‌شود) ───────────────────────────────────────────
function wxTarget(t,i){const b=WXTYPES[t],k=.45+.55*i;return{
 cloud:Math.min(1,b.cloud*(.55+.45*i)),fog:Math.min(1,b.fog*k),rain:b.rain*(.4+.6*i),snow:b.snow*(.4+.6*i),
 wind:b.wind*(.7+.3*i),dark:Math.min(1,b.dark*(.6+.4*i)),light:b.light}}
function wxSync(w){const d=(w&&typeof w==='object')?w:{};
 const t=WXTYPES[d.type]?d.type:'clear',i=isFinite(+d.intensity)?Math.max(.1,Math.min(1,+d.intensity)):.7,
 tp=isFinite(+d.temp)?Math.max(-20,Math.min(50,+d.temp)):24,tr=isFinite(+d.transition)?Math.max(3,Math.min(180,+d.transition)):25;
 WXmode=d.mode==='manual'?'manual':'auto';
 const sig=t+'|'+i.toFixed(2)+'|'+Math.round(tp)+'|'+tr+'|'+WXmode;
 if(sig===WXsig)return;WXsig=sig;
 WXfrom={...WXcur};WXto=wxTarget(t,i);WXt0=performance.now()/1000;WXsec=tr; // گذار نرم با مدت قابل‌تنظیم
 WXtype=t;WXint=i;WXtemp=tp;wxHUD(true);TWE.emit('weather:changed',{type:t,intensity:i})}
// ─── ۶) رعدوبرق: فلش چندضربه‌ای روی نور/آسمان موجود (بدون افزودن نور ⇒ بدون recompile شیدر) + صدای تأخیری WebAudio ───────────────────────────────────────────
let boltT=9;
function wxStrike(){FLASH=1;_strikeQ.length=0;_strikeQ.push(.1+Math.random()*.07);if(Math.random()<.5)_strikeQ.push(.24+Math.random()*.12);
 setTimeout(wxThunder,(1.1+Math.random()*2.6)*1000)} // صدای رعد با تأخیر واقع‌گرایانه
function wxThunder(){try{const a=window.__tribeAudio&&window.__tribeAudio();if(!a||!a.ac||!a.out||a.ac.state!=='running')return; // احترام به خاموشی صدا
 const ac=a.ac,dur=2+Math.random()*1.6,t=ac.currentTime+.05,buf=ac.createBuffer(1,ac.sampleRate*dur|0,ac.sampleRate),dd=buf.getChannelData(0);
 let last=0;for(let i=0;i<dd.length;i++){last=(last+.02*(Math.random()*2-1))/1.02;dd[i]=last*3.2}
 const src=ac.createBufferSource();src.buffer=buf;const lp=ac.createBiquadFilter();lp.type='lowpass';
 lp.frequency.setValueAtTime(380+Math.random()*320,t);lp.frequency.exponentialRampToValueAtTime(55,t+dur*.75);
 const g=ac.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.55,t+.05);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 src.connect(lp);lp.connect(g);g.connect(a.out);src.start(t);src.stop(t+dur)}catch(_){}}
// ─── ۷) چیپ HUD (داخل #tier کنار ساعت؛ با ضبط HUD هم ثبت می‌شود) ───────────────────────────────────────────
$('tier').insertAdjacentHTML('beforeend','<span id="wchip"></span>');
const wxDiurnal=h=>4*Math.sin((h-9)*Math.PI/12);
function wxHUD(force){const nf=Math.max(0,Math.min(1,1-_kf.si/1.4));
 const ic=(WXtype==='clear'&&nf>.5)?WXI.night:WXI[WXtype],temp=Math.round(WXtempC+wxDiurnal(H)),
 windy=(WIND.speed+WIND.gust*3.4)>4.3,html=ic+'<span>'+WXFA[WXtype]+' · '+cpx(temp)+'°'+(windy?' · باد تند':'')+'</span>';
 if(force||html!==wxHud){wxHud=html;const el=$('wchip');if(el)el.innerHTML=html}}
// ─── ۸) باد: سرعت هدف از پاکت + گوست‌های تصادفی + چرخش آرام جهت ───────────────────────────────────────────
function windStep(dt,t){const tgt=.35+WXcur.wind*6.2;
 WIND.speed+=(tgt-WIND.speed)*Math.min(1,dt*.22);
 WIND.dir+=(Math.sin(t*.13+1.7)*.05+Math.sin(t*.041)*.03)*dt;
 if((gustT-=dt)<=0){gustT=4.5+Math.random()*11;gustOn=WXcur.wind>.25?(.45+Math.random()*.55)*Math.min(1,WXcur.wind*1.35):0}
 gustV+=((gustT>2.6?gustOn:0)-gustV)*Math.min(1,dt*(gustOn>gustV?1.7:.5));
 WIND.gust=gustV;const s=WIND.speed+WIND.gust*3.4;WIND.x=Math.cos(WIND.dir)*s;WIND.z=Math.sin(WIND.dir)*s}
// ─── ۹) گام هر فریم (framePart «weather» در 05-core-main.js، بعد از environment) ───────────────────────────────────────────
function weatherStep(dt,t){const P=QLV[Q.lv()],fxOn=!!P.fx,den=WXQ[Q.lv()];
 // ۱) گذار پاکت (smoothstep) — تغییرات ناگهانی نور/رنگ/ذرات وجود ندارد
 if(WXto){const e=Math.min(1,(performance.now()/1000-WXt0)/WXsec),s=e*e*(3-2*e);
  for(const k in WXto)WXcur[k]=WXfrom[k]+(WXto[k]-WXfrom[k])*s;
  if(e>=1){WXto=null;WXfrom=null}}
 // ۲) دما و باد
 WXtempC+=(WXtemp-WXtempC)*Math.min(1,dt*.25);
 windStep(dt,t);SWAY=.72+WXcur.wind*1.55+WIND.gust*1.15;WCD=.35+WIND.speed*.4; // SWAY حالا با گوستِ باد هم نفس می‌کشد ⇒ در توفان تابِ محسوس
 WXF.time.value=t;WXF.amp.value=Math.min(.42,(WIND.speed*.03+WIND.gust*.09)*(.55+WXcur.wind*.8)); // خم‌شدن جنگل (uniforms مشترک در 06-world-scenery.js)
 // ۳) تر شدن و برف زمین (فیزیکی: خشک‌شدن/ذوب تدریجی)
 const wTgt=WXcur.rain>.05?Math.min(1,WXcur.rain*1.1+.1):(WXcur.snow>.1?.12:0);
 WET+=(wTgt-WET)*Math.min(1,dt*(wTgt>WET?.09:.02));
 const sTgt=WXcur.snow>.04?Math.min(1,WXcur.snow*1.05):0;
 SNOWG+=(sTgt-SNOWG)*Math.min(1,dt*(sTgt>SNOWG?.05:(WXtempC>4?.05:.012)));
 // ۴) رعدوبرق فقط در توفانِ برقرار — فلش‌های کوتاه کنترل‌شده
 if(WXcur.light>.5&&WXcur.rain>.7){if((boltT-=dt)<=0){boltT=6+Math.random()*16;wxStrike()}}
 FLASH=Math.max(0,FLASH-dt*(FLASH>.45?6.5:3.4));
 for(let i=_strikeQ.length;i--;){if((_strikeQ[i]-=dt)<=0){FLASH=Math.max(FLASH,.5+Math.random()*.45);_strikeQ.splice(i,1)}}
 // ۵) بازمحاسبهٔ نور/آسمان/مه از پایهٔ ساعت (wxKF) + پاکت — هوای صاف = عیناً نمای قبلی
 wxKF(H);
 const nf=Math.max(0,Math.min(1,1-_kf.si/1.4)),cloud=WXcur.cloud,dark=WXcur.dark,fog=WXcur.fog,fl=FLASH*(fxOn?1:.35),
  cSun=Math.max(0,cloud-.1),snowA=WXcur.snow,coldT=Math.max(0,Math.min(1,(6-WXtempC)/12)),hotT=Math.max(0,Math.min(1,(WXtempC-30)/10));
 // ۴٫۶) لایهٔ سطوح: واکنش ظاهری «همهٔ سازه‌ها و آیتم‌ها» به آب‌وهوا — خیس‌شدن، برف‌نشستن روی بام‌ها، ته‌رنگ سرد/گرم؛
 // فقط مقدارِ uniformهای مشترکِ WXU به‌روز می‌شود (همهٔ متریال‌ها به همان‌ها وصل‌اند) ⇒ صفر هزینهٔ اضافه در هر فریم؛
 // + گشت‌زنی کوتاه برای متریال‌هایی که بعد از بارگذاری ساخته می‌شوند (هر متریال فقط یک‌بار patch؛ بدون recompile زنجیره‌ای)
 WXU.wet.value=WET;WXU.snow.value=SNOWG*.85;WXU.rough.value=.42-WET*.24;
 if(coldT>.001||hotT>.001){WXU.tint.value.setRGB(1+hotT*.05-coldT*.06,1-coldT*.03-hotT*.02,1+coldT*.09-hotT*.1);WXU.tintAmt.value=Math.max(coldT*.5,hotT*.42)}else WXU.tintAmt.value=0;
 _wxQ.copy(cam.quaternion).invert();WXU.up.value.set(0,1,0).applyQuaternion(_wxQ);
 if(!WXP_OFF&&(wxSweepT-=dt)<=0){wxSweepT=wxSweepN-->0?.4:2.5;
  scene.traverse(c=>{if(c.isMesh||c.isInstancedMesh||c.isPoints){const m=c.material;if(m)(Array.isArray(m)?m:[m]).forEach(wxPatchMat)}})}
 sun.intensity=_kf.si*(1-cSun*.55-dark*.26)+fl*Math.max(.15,_kf.si*.6);
 _wxA.copy(_wxS).lerp(_wxB.setHex(0x9fb2c4),Math.min(.85,cSun*.6+dark*.15));_wxA.lerp(_wxB.setHex(0xffd9a0),hotT*.35);sun.color.copy(_wxA);
 hemi.intensity=_kf.hi*(1+Math.max(0,cloud-.15)*.2-dark*.38+SNOWG*.18)+fl*1.5;
 _wxA.setHex(0xdfeaff).lerp(_wxB.setHex(0x8fa6f0),nf).lerp(_wxB.setHex(0xb4bcc6),Math.max(0,cloud-.2)*.55).lerp(_wxB.setHex(0xaac4e0),coldT*.3);
 hemi.color.copy(_wxA);
 _wxA.setHex(0x6f8a55).lerp(_wxB.setHex(0x3b5282),nf).lerp(_wxB.setHex(0x47544a),WET*.3).lerp(_wxB.setHex(0xdfe6ee),SNOWG*.55);
 hemi.groundColor.copy(_wxA);
 R.toneMappingExposure=_kf.ex*(1-dark*.16)*(1+hotT*.045)*(1-coldT*.03)+fl*.12;
 // آسمان: رنگ‌های شیدر موجود فقط مقدار می‌گیرند (ساختار شیدر دست نمی‌خورد)
 const u=sky.material.uniforms;
 _wxA.copy(_wxT).lerp(_wxB.setHex(0x8b97a6),cSun*.5).lerp(_wxB.setHex(0x5c646e),dark*.5).lerp(_wxB.setHex(0x9fb6d8),coldT*.22).lerp(_wxB.setHex(0xdfe8ff),fl*.75);
 u.a.value.copy(_wxA);
 _wxB.copy(_wxH).lerp(_wxA.setHex(0x9aa3ac),cSun*.42).lerp(_wxA.setHex(0x6a7078),dark*.4).lerp(_wxA.setHex(0xffcf9a),hotT*.28).lerp(_wxA.setHex(0xe6ecf4),snowA*.3+fl*.6);
 u.b.value.copy(_wxB);
 u.g.value=Math.min(1,_kf.si)*(1-Math.max(0,cloud-.15)*.55)+fl*.3;
 u.gc.value.copy(_wxS).lerp(_wxA.setHex(0xb8c2cc),cSun*.5);
 // مه: پایه از پلهٔ کیفیت (آینهٔ Q.apply) × ضریب هوای جاری
 let fn=48,ff=150;if(P.vd<1e8){fn=Math.min(48,P.vd*.4);ff=Math.min(150,P.vd*1.5)}
 ff=Math.max(14,ff*(1-fog*.88));fn=Math.max(2,fn*(1-fog*.5)+ff*.12*fog);
 scene.fog.near=fn;scene.fog.far=ff;
 _wxA.copy(_wxH).lerp(_wxB.setHex(fog>.55?0xb9c1bd:0x9aa6ae),fog*.8).lerp(_wxB.setHex(0xdde3ea),snowA*.45*fog).lerp(_wxB.setHex(0xdfe8ff),fl*.25);
 scene.fog.color.copy(_wxA);
 // ماه/ستاره زیر ابر محو می‌شوند (رفتار چراغ‌های خیابان دست‌نخورده می‌ماند)
 moon.intensity=.62*nf*(1-cloud*.7);moonM.material.opacity=nf*(1-Math.max(0,cloud-.12)*.85);
 moonH.material.opacity=.6*nf*(1-Math.max(0,cloud-.12)*.9);stars.material.opacity=nf*(1-Math.max(0,cloud-.12)*.85);
 // ابرها: رنگ/شفافیت/مقیاس (تعداد مرئی را Q کنترل می‌کند — c.visible)
 _wxA.setHex(0xf4f1ea).lerp(_wxB.setHex(0x7380b0),nf).lerp(_wxB.setHex(0x666d75),dark*.72+Math.max(0,cloud-.45)*.15).lerp(_wxB.setHex(0xe8edf3),snowA*.5);
 const cs=1+Math.max(0,cloud-.35)*.55,co=.85+Math.max(0,cloud-.5)*.15;
 for(const c of clouds){if(!c.visible)continue;c.scale.setScalar(cs);
  for(const m of c.children){m.material.color.copy(_wxA);m.material.opacity=co}}
 // ۶) ذرات باران — تراکم = نرخ × پلهٔ کیفیت؛ مکان/سرعت/باد/کجی همه در شیدر
 const rv=WXcur.rain;rainPts.visible=rv>.03;
 if(rainPts.visible){rainPts.geometry.setDrawRange(0,Math.floor(RAINN*rv*den));
  rainU.uT.value=t%1200;rainU.uC.value.set(ctl.target.x,0,ctl.target.z);
  rainU.uW.value.set(WIND.x*1.35,WIND.z*1.35);rainU.uFall.value=15+rv*7+WIND.speed*.25;
  rainU.uLen.value=.85+rv*.5+Math.min(.35,WIND.speed*.055);rainU.uO.value=Math.min(.48,.16+rv*.32);
  rainU.uPx.value=R.domElement.height*.5/Math.tan(cam.fov*.5*Math.PI/180);
  _wxV.set(1,0,0).applyQuaternion(cam.quaternion);
  rainU.uSlant.value=Math.max(-.7,Math.min(.7,Math.atan2((rainU.uW.value.x*_wxV.x+rainU.uW.value.y*_wxV.z)*1.15,rainU.uFall.value)));
  rainU.uCol.value.setRGB(.66,.74,.86).multiplyScalar(1-nf*.5);
  rainU.uFogC.value.copy(scene.fog.color);rainU.uFogN.value=fn;rainU.uFogF.value=ff}
 // ۷) ذرات برف — سقوط آرام + تاب‌خوردن باد
 const sv=WXcur.snow;snowPts.visible=sv>.03;
 if(snowPts.visible){snowPts.geometry.setDrawRange(0,Math.floor(SNOWN*sv*den));
  snowU.uT.value=t%1200;snowU.uC.value.set(ctl.target.x,0,ctl.target.z);
  snowU.uW.value.set(WIND.x*.7,WIND.z*.7);snowU.uFall.value=1.6+sv*.9;
  snowU.uSway.value=.5+WIND.speed*.22;snowU.uSize.value=.14+sv*.08;snowU.uO.value=Math.min(.95,.55+sv*.4);
  snowU.uPx.value=rainU.uPx.value;snowU.uCol.value.setRGB(1,1,1).multiplyScalar(1-nf*.42);
  snowU.uFogC.value.copy(scene.fog.color);snowU.uFogN.value=fn;snowU.uFogF.value=ff}
 // ۸) زمین خیس/برفی + رود (فقط متریال؛ هندسه و مسیر دست‌نخورده)
 ground.material.roughness=1-Math.max(WET*.45,SNOWG*.02);
 _wxA.setRGB(1,1,1).lerp(_wxB.setRGB(.76,.8,.78),WET*.42).lerp(_wxB.setRGB(1.32,1.3,1.5),Math.min(1,SNOWG*.9)).lerp(_wxB.setRGB(1.05,1.12,1.28),coldT*.5);   // برف: بافت برف کراس‌فید می‌شود + ضریبِ سردِ ملایم
 ground.material.color.copy(_wxA);
 if(ground.material.userData.sh)ground.material.userData.sh.uniforms.uBlend.value=Math.min(1,SNOWG*1.15);   // کراس‌فید نرم چمن→برف
 riverWaterMat.color.setRGB(1,1,1).lerp(_wxA.setRGB(.82,.86,.87),WET*.22).lerp(_wxA.setRGB(.88,.92,.95),SNOWG*.28);
 pudM.visible=WET>.04&&fxOn;pudMat.opacity=WET*.58*(.9+.1*Math.sin(t*2.1));
 pudMat.color.copy(scene.fog.color).lerp(_wxA.setRGB(1,1,1),.3);
 snowPM.visible=SNOWG>.03&&fxOn;snowMat.opacity=Math.min(.96,SNOWG*.95);
 // ۹) چیپ HUD (حداکثر هر ۱٫۵ ثانیه — دما/باد زنده اما بدون هزینه)
 if((wxHudT-=dt)<=0){wxHudT=1.5;wxHUD()}}
// ─── ۱۰) API کنسول/تست (مثل Q.set): WXENG.set('storm',1,12) — WXENG.auto() ───────────────────────────────────────────
globalThis.WXENG={set:(t,i=.8,temp)=>wxSync({mode:'manual',type:t,intensity:i,temp:temp==null?WXtemp:temp,transition:2}),
 auto:()=>wxSync({mode:'auto',type:WXtype,intensity:WXint,temp:WXtemp,transition:10}),
 state:()=>({type:WXtype,intensity:WXint,mode:WXmode,temp:WXtempC,env:{...WXcur},wet:WET,snowGround:SNOWG,wind:{...WIND}})};
// ─── ۱۱) رویدادمحور (Engine 2.0): ساختمانِ تازه = متریال‌های زمان‌اجرِ تازه ⇒ لایهٔ سطوح (خیس/برف/ته‌رنگ)
// بی‌درنگ رویشان بنشیند — به‌جای انتظار برای گشت‌زنیِ دوره‌ای؛ تغییر آب‌وهوا هم از EventBus عبور می‌کند.
TWE.on('buildings:changed',()=>{wxSweepT=.05;wxSweepN=Math.max(wxSweepN,2)});
