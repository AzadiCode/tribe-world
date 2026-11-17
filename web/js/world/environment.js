// ═══ آسمان زنده: چرخهٔ شب‌وروز، ستاره، ماه، کرم شب‌تاب، توربین بادی، ساعت زنده، و envStep (به‌روزرسانی محیط در هر فریم). ═══
'use strict';
// ── آسمان زنده: ستاره، ماه، توربین بادی
const KF=[[0,0x0e1a48,0x2f4b8c,0xaec4ff,0,.95,1.12],[5,0x14236a,0x3e5aa0,0xaec4ff,0,.95,1.1],[6.2,0x3a5a9a,0xf2a77a,0xffa066,1,.6,.95],[8,0x5f93cc,0xd5e0d0,0xffe2b8,1.7,.65,.92],[12,0x4f8fd0,0xc9dcd0,0xfff2dc,2.1,.8,.95],[16.5,0x5a8fc8,0xd9d6bf,0xffe0b0,1.8,.7,.93],[18.3,0x4a5a9a,0xf08a5a,0xff7f3f,1.1,.6,.95],[19.5,0x1c2d72,0x6a5a92,0xaec4ff,0,.95,1.08],[24,0x0e1a48,0x2f4b8c,0xaec4ff,0,.95,1.12]],_b=new THREE.Color(),cloudC=new THREE.Color(),cloudN=new THREE.Color(0x7380b0);
const stars=new THREE.Points((()=>{const g=new THREE.BufferGeometry(),p=[];for(let i=0;i<450;i++){const a=rnd()*6.283,e=.08+rnd()*1.2,r=235;p.push(Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,Math.sin(a)*Math.cos(e)*r)}g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));return g})(),new THREE.PointsMaterial({size:2.2,sizeAttenuation:false,color:0xffffff,transparent:true,opacity:0,depthWrite:false,fog:false}));scene.add(stars);
const moonM=new THREE.Mesh(new THREE.SphereGeometry(5,16,12),new THREE.MeshBasicMaterial({color:0xf3f0e0,transparent:true,opacity:0,fog:false,depthWrite:false}));scene.add(moonM);
const moonH=new THREE.Sprite(new THREE.SpriteMaterial({map:GRADT,color:0xbcd0ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));moonH.scale.set(60,60,1);scene.add(moonH);
// کرم‌های شب‌تاب
const FFN=80,ffg=new THREE.BufferGeometry(),ffa=new Float32Array(FFN*3),ffs=[];for(let i=0;i<FFN;i++){ffs.push([(rnd()-.5)*64,.4+rnd()*1.4,(rnd()-.5)*64,rnd()*6.28,.3+rnd()*.5]);}
ffg.setAttribute('position',new THREE.BufferAttribute(ffa,3));const ffm=new THREE.PointsMaterial({map:GRADT,color:0xd8ff8a,size:.55,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),ffp=new THREE.Points(ffg,ffm);ffp.frustumCulled=false;scene.add(ffp);
function ffStep(t){ffm.opacity=Math.max(0,NT-.35)*1.4;ffp.visible=ffm.opacity>.02;if(!ffp.visible)return;for(let i=0;i<FFN;i++){const f=ffs[i];ffa[i*3]=f[0]+Math.sin(t*f[4]+f[3])*1.3;ffa[i*3+1]=f[1]+Math.sin(t*f[4]*1.7+f[3])*.35;ffa[i*3+2]=f[2]+Math.cos(t*f[4]*.8+f[3])*1.3}ffg.attributes.position.needsUpdate=true}
for(let i=0;i<6;i++){const an=.35+i*.62,r=80+rnd()*9,X=Math.cos(an)*r,Z=Math.sin(an)*r,tw=new THREE.Group(),ro=new THREE.Group();cyl(tw,.12,.22,8,0xf1f1ee,0,0,0,8);ro.position.set(0,8.1,.35);for(let j=0;j<3;j++){const pv=new THREE.Group();pv.rotation.z=j*2.0944;bx(pv,.16,3.6,.05,0xffffff);ro.add(pv)}tw.add(ro);tw.position.set(X,hgt(X,Z)-.2,Z);tw.rotation.y=Math.atan2(-X,-Z);scene.add(tw);turbs.push(ro)}
function kf(h){let i=0;while(i<KF.length-2&&h>=KF[i+1][0])i++;const A=KF[i],B=KF[i+1],f=(h-A[0])/(B[0]-A[0]),cc=k=>new THREE.Color(A[k]).lerp(_b.setHex(B[k]),f),n=k=>A[k]+(B[k]-A[k])*f;return{top:cc(1),hor:cc(2),sun:cc(3),si:n(4),hi:n(5),ex:n(6)}}
function applyEnv(h){const k=kf(h);NT=Math.max(0,Math.min(1,1-k.si/1.4));const a=(h-6)/12*Math.PI,el=Math.abs(Math.sin(a)),u=sky.material.uniforms;
sun.color.copy(k.sun);sun.intensity=k.si;sun.position.set(Math.cos(a)*38,Math.max(5,el*34),18-Math.sin(a)*10);
u.s.value.set(Math.cos(a),Math.max(.04,el*.9),.3).normalize();u.gc.value.copy(k.sun);u.g.value=Math.min(1,k.si);u.a.value.copy(k.top);u.b.value.copy(k.hor);
moonM.position.set(-Math.cos(a)*170,55+el*70,-60);moon.intensity=1.25*NT;moon.color.setHex(0xb8ccff);moonH.position.copy(moonM.position);moonH.material.opacity=.6*NT;moon.position.copy(moonM.position).multiplyScalar(.25);moonM.material.opacity=NT;stars.material.opacity=NT;
hemi.intensity=k.hi;hemi.color.setHex(0xdfeaff).lerp(_b.setHex(0x8fa6f0),NT);hemi.groundColor.setHex(0x6f8a55).lerp(_b.setHex(0x3b5282),NT);scene.fog.color.copy(k.hor);R.toneMappingExposure=k.ex;
GLOW.emissiveIntensity=.2+1.9*NT;LAMP.emissiveIntensity=.1+2.8*NT;LP.opacity=.95*NT;LHALO.opacity=.9*NT;HP.opacity=.75*NT;
cloudC.setHex(0xf4f1ea).lerp(cloudN,NT);clouds.forEach(c=>c.children.forEach(m=>m.material.color.copy(cloudC)))}
function realHour(){try{const p=new Intl.DateTimeFormat('en-GB',{timeZone:(W&&W.tz)||'Asia/Tehran',hour:'numeric',minute:'numeric',hour12:false}).formatToParts(new Date());return(+p.find(x=>x.type==='hour').value%24)+ +p.find(x=>x.type==='minute').value/60}catch(e){const d=new Date();return d.getHours()+d.getMinutes()/60}}
const CI={n:'<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',d:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>',r:'<svg viewBox="0 0 24 24"><path d="M6.5 17a5.5 5.5 0 0 1 11 0M3 20h18M12 3v5M9.5 5.5L12 3l2.5 2.5"/></svg>',s:'<svg viewBox="0 0 24 24"><path d="M6.5 17a5.5 5.5 0 0 1 11 0M3 20h18M12 3v5M9.5 5.5L12 8l2.5-2.5"/></svg>'};
function envStep(dt){const e=W&&W.env||{mode:'live'};
if(QH!==null)H=+QH;else if(e.mode==='fixed')H=+e.hour;else if(e.mode==='lapse')H=((+e.hour||0)+performance.now()/2500)%24;else if((hT-=dt)<=0){hT=1;H=realHour()}
if(Math.abs(H-eh)>.002){eh=H;applyEnv(H);const hh=Math.floor(H),mm=Math.floor((H-hh)*60),s=cpx((hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm),ic=H<5||H>=19.5?'n':H<7.5?'r':H<17?'d':'s';if(s+ic!==clkTxt){clkTxt=s+ic;$('clk').innerHTML=CI[ic]+'<span>'+s+'</span>'}}
for(const r of turbs)r.rotation.z-=dt*1.1;
if(fL)fL.intensity=.35+1.6*NT;
{const c0=cits[0];if(c0&&c0.gl>0){c0.gl-=dt;c0.g.scale.set(.84+(Math.random()-.5)*.16,.84+(Math.random()-.5)*.1,.84);c0.g.visible=Math.random()>.12;if(c0.gl<=0){c0.g.scale.setScalar(.84);c0.g.visible=true}}}
if((tk-=dt)<=0){tk=(MOB?15:11)+Math.random()*13;dgAmb()}
tags()}
