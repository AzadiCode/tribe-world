// ═══ متریال‌ها و ابزار ساخت سریع (جعبه، توپ، هاله، نور فانوس) که ساختمان‌ها و آدم‌ها مشترکاً استفاده می‌کنند. ═══
'use strict';
const mats={};const M=(c,r=.8)=>mats[c+'_'+r]||(mats[c+'_'+r]=new THREE.MeshStandardMaterial({color:c,roughness:r}));
const add=(g,m)=>{m.castShadow=m.receiveShadow=true;g.add(m);return m};
const GRADT=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const q=c.getContext('2d'),r=q.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.55)');r.addColorStop(.6,'rgba(255,255,255,.15)');r.addColorStop(1,'rgba(255,255,255,0)');q.fillStyle=r;q.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})(),
NORAY=o=>{o.raycast=()=>{};return o},
LHALO=new THREE.SpriteMaterial({map:GRADT,color:0xffc873,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),
LNHALO=new THREE.SpriteMaterial({map:GRADT,color:0xffc873,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}),
LANT=new THREE.MeshStandardMaterial({color:0xfff0c0,emissive:0xffb84d,emissiveIntensity:2.6}),
HPG=new THREE.PlaneGeometry(2.4,1.9),HP=new THREE.MeshBasicMaterial({map:GRADT,color:0xffbf66,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
const bx=(g,w,h,d,c,px=0,py=0,pz=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.position.set(px,py+h/2,pz);return add(g,m)};
