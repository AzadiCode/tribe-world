// ═══ منظرهٔ ثابت: زمین چمن، گنبد آسمان، رودخانه، گل، سنگ، کوه‌های دور، جنگل، ابرها و خط‌چین محل خانهٔ مدیرعامل. ═══
'use strict';
// زمین: تکسچر چمن (یک سطح، بدون هم‌پوشانی ⇒ بدون پرپر)
const cv=document.createElement('canvas');cv.width=cv.height=512;const x=cv.getContext('2d');x.fillStyle='#7d9f5b';x.fillRect(0,0,512,512);
for(let i=0;i<70;i++){const px=Math.random()*512,py=Math.random()*512,r=30+Math.random()*70,c=['120,160,88','140,172,98','104,142,78'][i%3];
for(const ox of[-512,0,512])for(const oy of[-512,0,512]){const gr=x.createRadialGradient(px+ox,py+oy,0,px+ox,py+oy,r);gr.addColorStop(0,`rgba(${c},.35)`);gr.addColorStop(1,`rgba(${c},0)`);x.fillStyle=gr;x.fillRect(px+ox-r,py+oy-r,2*r,2*r)}}
const tex=new THREE.CanvasTexture(cv);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(7,7);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
// رودخانهٔ شکسته (هم‌راستا با گرید شهر): پلی‌لاین قطعه‌های مستقیم افقی/عمودی — مسیر منطقی (حریم/ساخت/ناوبری)
const RIVER_PTS=[[-146,22],[-96,22],[-96,6],[-40,6],[-40,24],[16,24],[16,4],[72,4],[72,18],[146,18]];
const inRiver=(x,z)=>{for(let i=1;i<RIVER_PTS.length;i++){const a=RIVER_PTS[i-1],b=RIVER_PTS[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz))),qx=a[0]+u*dx,qz=a[1]+u*dz;if(Math.hypot(x-qx,z-qz)<4.1)return true}return false};
// فاصله تا محور رود — مشترک بین رستر آب، گاردهای ساحل و گل‌ها (برش‌های مورب هم مثل بقیه قطعه‌ها حساب می‌شوند)
const riverDist=(x,z)=>{let d=1e9;for(let i=1;i<RIVER_PTS.length;i++){const a=RIVER_PTS[i-1],b=RIVER_PTS[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz))}return d};
// ─── مسیر «فِلِت‌شده» فقط برای رندر: هر گوشهٔ قائمهٔ ۹۰ درجه با کمان ۵-قطعه‌ای (ρ≤4.5) نرم می‌شود؛
// مسیر منطقی RIVER_PTS (حریم/فوت‌پرینت/ناوبری/سرور) دست‌نخورده می‌ماند.
const FILLET=(()=>{const poly=[];for(let i=0;i<RIVER_PTS.length;i++){
 const p=RIVER_PTS[i];
 if(i===0||i===RIVER_PTS.length-1){poly.push(p.slice());continue}
 const a=RIVER_PTS[i-1],b=p,c=RIVER_PTS[i+1];
 const d1x=b[0]-a[0],d1z=b[1]-a[1],L1=Math.hypot(d1x,d1z),u1x=d1x/L1,u1z=d1z/L1;
 const d2x=c[0]-b[0],d2z=c[1]-b[1],L2=Math.hypot(d2x,d2z),u2x=d2x/L2,u2z=d2z/L2;
 const dot=u1x*u2x+u1z*u2z,ang=Math.acos(Math.max(-1,Math.min(1,dot)));
 if(ang<.12){poly.push(p.slice());continue} // تقریباً مستقیم
 const r=Math.min(6,L1*.45,L2*.45); // قوس بزرگ‌تر ⇒ خمِ ادراکیِ واقعی؛ هنوز داخلِ گوشه (حریم منطقی سالم)
 const tIn=[b[0]-u1x*r,b[1]-u1z*r],tOut=[b[0]+u2x*r,b[1]+u2z*r];
 poly.push(tIn);
 // ─── کمانِ دایره‌ایِ واقعی: مرکز = tIn + عمودِ «به‌سمتِ-داخلِ زاویه» × r (دقیقاً هم‌فاصلهٔ r از هر دو مماس)؛
 // نقاط کمان = چرخشِ بردار (tIn−C) به سمت (tOut−C) ⇒ قوس محدب که از رأس دقیقاً r(1−cos θ/2) فاصله می‌گیرد.
 const inx=-(u1z),inz=(u1x); // عمودِ u1
 const sgn=(inx*(u2x-u1x)+inz*(u2z-u1z))>=0?1:-1; // سمتِ داخلِ چرخش
 const C=[tIn[0]+inx*sgn*r,tIn[1]+inz*sgn*r];
 const vIn=[tIn[0]-C[0],tIn[1]-C[1]],vOut=[tOut[0]-C[0],tOut[1]-C[1]];
 const aIn=Math.atan2(vIn[1],vIn[0]),aOut=Math.atan2(vOut[1],vOut[0]);
 let sweep=aOut-aIn;while(sweep>Math.PI)sweep-=2*Math.PI;while(sweep<-Math.PI)sweep+=2*Math.PI;
 const STEPS=8; // پله‌های ریزتر روی قوس
 for(let j=1;j<STEPS;j++){const t=j/STEPS,th=aIn+sweep*t;
  poly.push([C[0]+Math.cos(th)*r,C[1]+Math.sin(th)*r])}
 poly.push(tOut)}
 return poly})();
const filletDist=(x,z)=>{let d=1e9;for(let i=1;i<FILLET.length;i++){const a=FILLET[i-1],b=FILLET[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz))}return d};
// ─── جالی رود: زمین در حریم فِلِت (فاصلهٔ مرکز سلول <4.6) با لبهٔ نرمِ smoothstep به کف 0.06 فرو می‌رود ⇒
// رود تمامِ مسیر -146..146 حتی روی/پشت تپه‌ها در درهٔ واقعی جاری می‌ماند — پایان «قطع‌شدگی دو سر رود» (r≤53 قبلی).
// ساختارهای سازنده هم از همین hgt پیروی می‌کنند ⇒ سازه/چمن ساحل، پایه‌شان همیشه روی زمینِ هم‌تراز آب می‌نشیند.
const hgt=(x,z)=>{const r=Math.hypot(x,z),k=Math.min(1,Math.max(0,(r-52)/50));let h=k*k*(3-2*k)*(7+5*Math.sin(x*.07)*Math.cos(z*.06)+3*Math.sin(x*.19+z*.13));
 const fd=filletDist(x,z);if(fd<6.1){const t=Math.min(1,Math.max(0,(6.1-fd)/1.6)),s=t*t*(3-2*t);h+= (.06-h)*s}
 return h};
const gg=new THREE.PlaneGeometry(300,300,110,110);gg.rotateX(-Math.PI/2);{const p=gg.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,hgt(p.getX(i),p.getZ(i)));gg.computeVertexNormals()}
const ground=new THREE.Mesh(gg,new THREE.MeshStandardMaterial({map:tex,roughness:1}));ground.receiveShadow=true;scene.add(ground);
const sky=new THREE.Mesh(new THREE.SphereGeometry(250,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{a:{value:new THREE.Color(0x6f9fc8)},b:{value:new THREE.Color(0xc9d6c4)},s:{value:new THREE.Vector3(0,1,0)},gc:{value:new THREE.Color(0xffe2b8)},g:{value:1}},vertexShader:'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 a,b,s,gc;uniform float g;varying vec3 p;void main(){vec3 c=mix(b,a,smoothstep(0.,.55,p.y));float d=max(dot(p,s),0.);c+=gc*(pow(d,6.)*.35+pow(d,90.)*1.2)*g;gl_FragColor=vec4(c,1.);}'}));scene.add(sky);
let s=5;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
const riverWaterMat=new THREE.MeshStandardMaterial({roughness:.22,metalness:.08,side:THREE.DoubleSide});
// آب پیکسلی: بافت یکدستِ آبی-تیل (نویز per-tile حذف شد — منبع شطرنجی/پرپر در سکنس ویدیو)؛
// تنوع ظریف عمق فقط از رنگ رأس‌ها می‌آید (پیوسته، نه بلوکی)
const wcv=document.createElement('canvas');wcv.width=wcv.height=64;const wx=wcv.getContext('2d');
wx.fillStyle='#4fa3b3';wx.fillRect(0,0,64,64);
wx.fillStyle='#549fb0';wx.fillRect(0,0,32,32);wx.fillRect(32,32,32,32); // تُنِ جفتِ خانه‌ها فقط ۳٪ فرق دارد
const riverTex=new THREE.CanvasTexture(wcv);riverTex.wrapS=riverTex.wrapT=THREE.RepeatWrapping;riverTex.colorSpace=THREE.SRGBColorSpace;riverTex.magFilter=THREE.NearestFilter;
riverWaterMat.map=riverTex;
// سطح آب: رستر یک‌واحدی بر اساس فاصلهٔ مرکز سلول تا محورِ «فِلِت‌شده» (<۳) ⇒ بازوها تخت و پیچ‌ها کاملاً گرد؛
// دیگر هیچ کلیپ r≤53 نیست — آب تمام مسیر -146..146 داخل جالی رود (hgt فرو رفته) جاری است.
// رنگ رأس‌ها عمق می‌سازد (مرکز تیره، لبه روشن‌تر)؛ سطح ۰٫۰۴ زیر سرِ سنگ‌ها ⇒ لبهٔ خوانا. UV جهانی و اسکرول در core-main.
// آب زندهٔ «کم‌هزینه و بدون درز»: جابه‌جایی هر رأس تابعی خالص از موقعیت رأس (فاز=px*.6+pz*.35، دامنه از filletDist رأس)
// ⇒ رأس مشترک دو کاشی عیناً هم‌مقدار — سطح در همهٔ لحظه‌ها «جوش»؛ دامنه فقط قلب (k<.45) و فقط ۱٫۲cm؛ لبه‌ها صفر ⇒ چسبیده به سنگ‌چین.
{const pos=[],uv=[],col=[],phs=[],amps=[],idx=[];let n=0;
 const x0=Math.min(...RIVER_PTS.map(p=>p[0]))-3,x1=Math.max(...RIVER_PTS.map(p=>p[0]))+3,z0=Math.min(...RIVER_PTS.map(p=>p[1]))-3,z1=Math.max(...RIVER_PTS.map(p=>p[1]))+3;
 for(let gz=z0;gz<z1;gz++)for(let gx=x0;gx<x1;gx++){
  const cx=gx+.5,cz=gz+.5;
  const dc=filletDist(cx,cz);if(dc>=3)continue;
  const k=Math.min(1,Math.max(0,(dc-1.1)/1.9)); // k فقط برای رنگ عمق؛ بدون نویز رندوم (منبع شطرنجی‌شدن ساکن)
  const cr=.26+.30*k,cg=.58+.04*k,cb=.70+.17*k; // شیب آبی ≫ سبز ⇒ لبهٔ کم‌عمق آبی‌تر، نه سبزفام
  for(const[px,pz]of[[gx,gz],[gx+1,gz],[gx+1,gz+1],[gx,gz+1]]){
   const fd=filletDist(px,pz),vk=Math.min(1,Math.max(0,(fd-1.1)/1.9)),va=vk<.45?.012*(1-vk/.45):0; // دامنهٔ پیوسته از موقعیت رأس
   pos.push(px,hgt(px,pz)+.04,pz);uv.push(px/8,pz/8);col.push(cr,cg,cb);phs.push(px*.6+pz*.35);amps.push(va)}
  idx.push(n,n+1,n+2,n,n+2,n+3);n+=4}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('aPhase',new THREE.Float32BufferAttribute(phs,1));g.setAttribute('aAmp',new THREE.Float32BufferAttribute(amps,1));g.setIndex(idx);g.computeVertexNormals();
 riverWaterMat.vertexColors=true;
 riverWaterMat.onBeforeCompile=sh=>{sh.uniforms.uTime={value:0};riverWaterMat.userData.sh=sh;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;attribute float aPhase;attribute float aAmp;')
   .replace('#include <color_vertex>','#include <color_vertex>\nvColor.rgb*=1.0+0.03*sin(uTime*0.6+aPhase);')
   .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=sin(uTime*0.8+aPhase)*aAmp;')};
 const riverWater=new THREE.Mesh(g,riverWaterMat);riverWater.receiveShadow=true;scene.add(riverWater)}
// جریان آرام آب (اسکرول بافت) در framePart «world-ambient» در 05-core-main.js انجام می‌شود؛ t سراسری نیست.
// فاز آب موضعی است (نه per-tile) ⇒ موج پیوسته بدون درز بین کاشی‌ها — توضیح کامل در بلوک آب بالا.
// ── ساحل بلوکی روی مسیر «فِلِت‌شده»: قدم‌به‌قدم روی پلی‌لاین FILLET (پیش می‌رود، جهتِ بیرون = عمود بر هر قطعه)
// ⇒ ردیف‌ها در پیچ‌ها هم منحنی را دنبال می‌کنند — گوشهٔ سنگی تیز و چینش ضربدری دیگر وجود ندارد.
// ۱) سنگ‌چین روی لبهٔ آب (فاصلهٔ ۳٫۰ از مسیر فِلِت) — همه یک ارتفاعِ .2، دو خاکستریِ نزدیک با ریتم ۵تایی (بدون خاکی/کرم رندوم)
// ۲) چمن (۳٫۷۵) — یک تراز واحد، تک‌سبز با ریتم ۷تاییِ سبزِ کمی روشن‌تر (هیچ ماسه/خاک رندوم — گزارش ویدیو: «افتضاح و پرپر»)
// پهنا = گام (۰٫۵) ⇒ صفر هم‌پوشانی/z-fight؛ کف زیر زمینِ جالی‌شده؛ هیچ کلیپ r — ساحل تمام مسیر را می‌پوشاند.
{const CNT=2600,stoneMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.66,.2,.66),new THREE.MeshStandardMaterial({roughness:.95}),CNT),turfMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,.12,.5),new THREE.MeshStandardMaterial({roughness:1}),CNT);
 stoneMesh.receiveShadow=turfMesh.receiveShadow=true;const dm=new THREE.Object3D(),seen=new Set(),bc=new THREE.Color();let si=0,ti=0,beat=0;
 for(let i=1;i<FILLET.length;i++){const a=FILLET[i-1],b=FILLET[i],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<.05)continue;
  const tx=dx/L,tz=dz/L,ang=Math.atan2(tx,tz);
  for(let s=0;s<=L+.01;s+=.5){
   const px=a[0]+tx*s,pz=a[1]+tz*s;beat++;
   for(const side of[-1,1]){
    const nx=-tz*side,nz=tx*side;
    const sx=Math.round((px+nx*3)*2)/2,sz=Math.round((pz+nz*3)*2)/2;
    if(si<CNT&&filletDist(sx,sz)>2.6&&!seen.has('s'+sx+','+sz)){seen.add('s'+sx+','+sz);dm.position.set(sx,hgt(sx,sz)+.085,sz);dm.rotation.set(0,ang,0);dm.scale.set(1,1,1);dm.updateMatrix();stoneMesh.setMatrixAt(si,dm.matrix);stoneMesh.setColorAt(si++,bc.set(beat%5<2?'#8a8f8b':'#7f847f'))} // ریتم ۵تاییِ دو خاکستریِ نزدیک
    const fx=Math.round((px+nx*3.75)*2)/2,fz=Math.round((pz+nz*3.75)*2)/2;
    if(ti<CNT&&filletDist(fx,fz)>3.05&&!seen.has('t'+fx+','+fz)){seen.add('t'+fx+','+fz);dm.position.set(fx,hgt(fx,fz)+.045,fz);dm.rotation.set(0,ang,0);dm.scale.set(1,1,1);dm.updateMatrix();turfMesh.setMatrixAt(ti,dm.matrix);
     // بیت‌ریتم: هر ۷ بلوک یک سبزِ روشن‌تر ⇒ ریتم ملایم و منظم؛ هیچ ماسه/خاک رندوم
     turfMesh.setColorAt(ti++,bc.set(beat%7===3?'#77a058':'#6f9150'))}}}}
 stoneMesh.count=si;turfMesh.count=ti;stoneMesh.instanceMatrix.needsUpdate=true;turfMesh.instanceMatrix.needsUpdate=true;
 if(stoneMesh.instanceColor)stoneMesh.instanceColor.needsUpdate=true;if(turfMesh.instanceColor)turfMesh.instanceColor.needsUpdate=true;
 scene.add(stoneMesh);scene.add(turfMesh)}
// گل‌های ریز روی بلوک‌های چمن ساحل — نمونه‌گیری از مسیر فِلِت (۳٫۵۵-۳٫۹۵ از محور)؛ حذف کانون r≤50:
// گل‌ها حالا تمام مسیر را دنبال می‌کنند (داخل جالی، hgt ساحل را می‌گیرند)
const riverBloom=new THREE.InstancedMesh(new THREE.SphereGeometry(.09,7,5),new THREE.MeshStandardMaterial({roughness:.65}),110),bloomObj=new THREE.Object3D();
for(let i=0;i<110;i++){let bx=0,bz=0,tr=0;
 for(let n=0;n<5&&tr<3.15;n++){const k=1+((rnd()*(FILLET.length-1))|0),a=FILLET[k-1],b=FILLET[k],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz),side=rnd()<.5?-1:1,d=3.55+rnd()*.4,tt=rnd();bx=a[0]+dx*tt-dz/L*side*d;bz=a[1]+dz*tt+dx/L*side*d;tr=filletDist(bx,bz);if(L<.01)tr=0}
 bloomObj.position.set(bx,hgt(bx,bz)+.15,bz);
 if(tr>=3.15)bloomObj.scale.set(.8+rnd()*.6,.65+rnd()*.5,.8+rnd()*.6);else bloomObj.scale.setScalar(.0001);
 bloomObj.updateMatrix();riverBloom.setMatrixAt(i,bloomObj.matrix);riverBloom.setColorAt(i,new THREE.Color(['#f7f3e6','#ffeef2','#fdf6df','#ffffff'][i%4]))}scene.add(riverBloom);
const inPond=(x,z)=>inRiver(x,z),occ=[]; // مستطیل‌های واقعی آیتم‌ها [x0,x1,z0,z1]
const dm=new THREE.Object3D(),FP=[],fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.08,6,5),new THREE.MeshStandardMaterial({roughness:.7}),260);
for(let i=0;i<260;i++){FP.push([(rnd()-.5)*78,(rnd()-.5)*78]);fl.setColorAt(i,new THREE.Color(['#f3e9a6','#f4efe4','#e8a3b8','#b9a4e6'][i%4]))}scene.add(fl);
const rocks=[];for(let i=0;i<22;i++){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.2+rnd()*.25,0),M(0x8c9088));r.position.set((rnd()-.5)*76,.14,(rnd()-.5)*76);r.scale.y=.7;r.castShadow=true;scene.add(r);rocks.push(r)}
const hid=(x,z)=>inPond(x,z)||occ.some(r=>x>r[0]-.1&&x<r[1]+.1&&z>r[2]-.1&&z<r[3]+.1);
function refreshDeco(){FP.forEach(([x,z],i)=>{dm.position.set(x,.08,z);dm.scale.setScalar(hid(x,z)?0:1);dm.updateMatrix();fl.setMatrixAt(i,dm.matrix)});fl.instanceMatrix.needsUpdate=true;rocks.forEach(r=>r.visible=!hid(r.position.x,r.position.z))}
for(let i=0;i<18;i++){const an=i/18*6.283,r=112+rnd()*14,h=16+rnd()*22,w=20+rnd()*16;const m=new THREE.Mesh(new THREE.ConeGeometry(w,h,6),M(i%3?0x6b8796:0x7a9a88,1));m.position.set(Math.cos(an)*r,h/2-1,Math.sin(an)*r);m.rotation.y=rnd()*3;scene.add(m);const c=new THREE.Mesh(new THREE.ConeGeometry(w*.32,h*.3,6),M(0xeef2f4,.9));c.position.set(m.position.x,h*.85-1,m.position.z);scene.add(c)}
// ── تاب‌خوردن بادی جنگل (شیدری، بدون هزینهٔ CPU در هر فریم): uniforms مشترک WXF از موتور آب‌وهوا (06-world-weather.js)
// هر فریم مقدار می‌گیرند (uWxT=زمان، uWxA=شدت از سرعت باد+گوست). خم‌شدن در فضای شیء و بر پایهٔ ارتفاعِ هر نمونه
// (instanceMatrix[3]) است ⇒ تنه کم، تاج درخت زیاد؛ چرخش رندوم هر نمونه هم جهتِ تاب را در دنیا متنوع می‌کند.
// در هوای صاف amp≈۰٫۰۳ (لرزش حیات‌بخش چند سانتی‌متری) و در توفان تا ~۰٫۳ (تکانِ محسوس تاج‌ها).
const WXF={time:{value:0},amp:{value:0}};
const wxBendMat=m=>{m.onBeforeCompile=sh=>{sh.uniforms.uWxT=WXF.time;sh.uniforms.uWxA=WXF.amp;
 sh.vertexShader=sh.vertexShader
  .replace('#include <common>','#include <common>\nuniform float uWxT;uniform float uWxA;')
  .replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat wxPh=instanceMatrix[3][0]*1.7+instanceMatrix[3][2]*1.3;\nfloat wxH=clamp(instanceMatrix[3][1]/3.4+position.y*.16,0.,1.);\nfloat wxS=uWxA*wxH*wxH;\ntransformed.x+=(sin(uWxT*1.9+wxPh)*.62+sin(uWxT*.7+wxPh*2.1)*.38)*wxS;\ntransformed.z+=(cos(uWxT*1.5+wxPh*1.3)*.55+cos(uWxT*.53+wxPh*.7)*.45)*wxS;\n#endif')}};
{const N=260,tr=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.18,1,6),M(0x6b4a30),N),cn=new THREE.InstancedMesh(new THREE.ConeGeometry(.9,1.8,7),new THREE.MeshStandardMaterial({roughness:.95}),N*2),o=new THREE.Object3D();let k=0;
wxBendMat(tr.material);wxBendMat(cn.material);
for(let i=0;i<N;i++){let x,z;do{x=(rnd()-.5)*104;z=(rnd()-.5)*104}while((Math.abs(x)<42&&Math.abs(z)<42)||inRiver(x,z));
const sc=1+rnd()*1.3;o.rotation.set(0,rnd()*6,0);o.scale.setScalar(sc);o.position.set(x,.5*sc+hgt(x,z),z);o.updateMatrix();tr.setMatrixAt(i,o.matrix);
for(let j=0;j<2;j++){o.scale.set(sc*(1-j*.3),sc*(1-j*.2),sc*(1-j*.3));o.position.set(x,(1.2+j*.9)*sc+hgt(x,z),z);o.updateMatrix();cn.setMatrixAt(k,o.matrix);cn.setColorAt(k++,new THREE.Color([0x3f7a4a,0x4a8a52,0x356b44,0x5a9a58][(rnd()*4)|0]))}}
tr.castShadow=cn.castShadow=true;scene.add(tr,cn)}
const clouds=[];for(let i=0;i<8;i++){const g=new THREE.Group();for(let j=0;j<5;j++){const p=new THREE.Mesh(new THREE.IcosahedronGeometry(2.5+rnd()*2.5,1),new THREE.MeshStandardMaterial({color:0xf4f1ea,roughness:1,transparent:true,opacity:.85}));p.position.set(j*3.2-6,rnd()*1.5,rnd()*2);p.scale.y=.6;g.add(p)}g.position.set((rnd()-.5)*160,32+rnd()*14,(rnd()-.5)*120);scene.add(g);clouds.push(g)}
// محل خانهٔ رئیس (خط‌چین)
const pts=[[-1.1,-1.1],[1.1,-1.1],[1.1,1.1],[-1.1,1.1],[-1.1,-1.1]].map(p=>new THREE.Vector3(p[0],.06,p[1]));
const plan=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineDashedMaterial({color:0xffffff,dashSize:.25,gapSize:.15}));plan.computeLineDistances();scene.add(plan);
