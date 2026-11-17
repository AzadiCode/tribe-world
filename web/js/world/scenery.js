// ═══ منظرهٔ ثابت: زمین چمن، گنبد آسمان، برکه، گل، سنگ، کوه‌های دور، جنگل، ابرها و خط‌چین محل خانهٔ مدیرعامل. ═══
'use strict';
// زمین: تکسچر چمن (یک سطح، بدون هم‌پوشانی ⇒ بدون پرپر)
const cv=document.createElement('canvas');cv.width=cv.height=512;const x=cv.getContext('2d');x.fillStyle='#7d9f5b';x.fillRect(0,0,512,512);
for(let i=0;i<70;i++){const px=Math.random()*512,py=Math.random()*512,r=30+Math.random()*70,c=['120,160,88','140,172,98','104,142,78'][i%3];
for(const ox of[-512,0,512])for(const oy of[-512,0,512]){const gr=x.createRadialGradient(px+ox,py+oy,0,px+ox,py+oy,r);gr.addColorStop(0,`rgba(${c},.35)`);gr.addColorStop(1,`rgba(${c},0)`);x.fillStyle=gr;x.fillRect(px+ox-r,py+oy-r,2*r,2*r)}}
const tex=new THREE.CanvasTexture(cv);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(7,7);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
const hgt=(x,z)=>{const r=Math.hypot(x,z),k=Math.min(1,Math.max(0,(r-52)/50));return k*k*(3-2*k)*(7+5*Math.sin(x*.07)*Math.cos(z*.06)+3*Math.sin(x*.19+z*.13))};
const gg=new THREE.PlaneGeometry(300,300,110,110);gg.rotateX(-Math.PI/2);{const p=gg.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,hgt(p.getX(i),p.getZ(i)));gg.computeVertexNormals()}
const ground=new THREE.Mesh(gg,new THREE.MeshStandardMaterial({map:tex,roughness:1}));ground.receiveShadow=true;scene.add(ground);
const sky=new THREE.Mesh(new THREE.SphereGeometry(250,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{a:{value:new THREE.Color(0x6f9fc8)},b:{value:new THREE.Color(0xc9d6c4)},s:{value:new THREE.Vector3(0,1,0)},gc:{value:new THREE.Color(0xffe2b8)},g:{value:1}},vertexShader:'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 a,b,s,gc;uniform float g;varying vec3 p;void main(){vec3 c=mix(b,a,smoothstep(0.,.55,p.y));float d=max(dot(p,s),0.);c+=gc*(pow(d,6.)*.35+pow(d,90.)*1.2)*g;gl_FragColor=vec4(c,1.);}'}));scene.add(sky);
// دکور: برکه، سنگ، گل
const inPond=(x,z)=>((x+17)/8.6)**2+((z+17)/6)**2<1,occ=new Set();
const pond=new THREE.Mesh(new THREE.CircleGeometry(5.5,48),new THREE.MeshStandardMaterial({color:0x4a8da0,roughness:.12,metalness:.15}));pond.rotation.x=-Math.PI/2;pond.position.set(-17,.04,-17);pond.scale.set(1.3,1,.9);scene.add(pond);
const rip=new THREE.Mesh(new THREE.RingGeometry(3,3.4,48),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.18,depthWrite:false}));rip.rotation.x=-Math.PI/2;rip.position.set(-17,.06,-17);rip.scale.set(1.3,1,.9);scene.add(rip);
const rim=new THREE.Mesh(new THREE.RingGeometry(5.5,6.4,48),new THREE.MeshStandardMaterial({color:0xcfc29a,roughness:1}));rim.rotation.x=-Math.PI/2;rim.position.set(-17,.03,-17);rim.scale.copy(pond.scale);scene.add(rim);
let s=5;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
const dm=new THREE.Object3D(),FP=[],fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.08,6,5),new THREE.MeshStandardMaterial({roughness:.7}),260);
for(let i=0;i<260;i++){FP.push([(rnd()-.5)*78,(rnd()-.5)*78]);fl.setColorAt(i,new THREE.Color(['#f3e9a6','#f4efe4','#e8a3b8','#b9a4e6'][i%4]))}scene.add(fl);
const rocks=[];for(let i=0;i<22;i++){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.2+rnd()*.25,0),M(0x8c9088));r.position.set((rnd()-.5)*76,.14,(rnd()-.5)*76);r.scale.y=.7;r.castShadow=true;scene.add(r);rocks.push(r)}
const hid=(x,z)=>occ.has(Math.round(x/CELL)+','+Math.round(z/CELL))||inPond(x,z);
function refreshDeco(){FP.forEach(([x,z],i)=>{dm.position.set(x,.08,z);dm.scale.setScalar(hid(x,z)?0:1);dm.updateMatrix();fl.setMatrixAt(i,dm.matrix)});fl.instanceMatrix.needsUpdate=true;rocks.forEach(r=>r.visible=!hid(r.position.x,r.position.z))}
for(let i=0;i<18;i++){const an=i/18*6.283,r=112+rnd()*14,h=16+rnd()*22,w=20+rnd()*16;const m=new THREE.Mesh(new THREE.ConeGeometry(w,h,6),M(i%3?0x6b8796:0x7a9a88,1));m.position.set(Math.cos(an)*r,h/2-1,Math.sin(an)*r);m.rotation.y=rnd()*3;scene.add(m);const c=new THREE.Mesh(new THREE.ConeGeometry(w*.32,h*.3,6),M(0xeef2f4,.9));c.position.set(m.position.x,h*.85-1,m.position.z);scene.add(c)}
{const N=260,tr=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.18,1,6),M(0x6b4a30),N),cn=new THREE.InstancedMesh(new THREE.ConeGeometry(.9,1.8,7),new THREE.MeshStandardMaterial({roughness:.95}),N*2),o=new THREE.Object3D();let k=0;
for(let i=0;i<N;i++){let x,z;do{x=(rnd()-.5)*104;z=(rnd()-.5)*104}while(Math.abs(x)<42&&Math.abs(z)<42);
const sc=1+rnd()*1.3;o.rotation.set(0,rnd()*6,0);o.scale.setScalar(sc);o.position.set(x,.5*sc+hgt(x,z),z);o.updateMatrix();tr.setMatrixAt(i,o.matrix);
for(let j=0;j<2;j++){o.scale.set(sc*(1-j*.3),sc*(1-j*.2),sc*(1-j*.3));o.position.set(x,(1.2+j*.9)*sc+hgt(x,z),z);o.updateMatrix();cn.setMatrixAt(k,o.matrix);cn.setColorAt(k++,new THREE.Color([0x3f7a4a,0x4a8a52,0x356b44,0x5a9a58][(rnd()*4)|0]))}}
tr.castShadow=cn.castShadow=true;scene.add(tr,cn)}
const clouds=[];for(let i=0;i<8;i++){const g=new THREE.Group();for(let j=0;j<5;j++){const p=new THREE.Mesh(new THREE.IcosahedronGeometry(2.5+rnd()*2.5,1),new THREE.MeshStandardMaterial({color:0xf4f1ea,roughness:1,transparent:true,opacity:.85}));p.position.set(j*3.2-6,rnd()*1.5,rnd()*2);p.scale.y=.6;g.add(p)}g.position.set((rnd()-.5)*160,32+rnd()*14,(rnd()-.5)*120);scene.add(g);clouds.push(g)}
// محل خانهٔ رئیس (خط‌چین)
const pts=[[-1.1,-1.1],[1.1,-1.1],[1.1,1.1],[-1.1,1.1],[-1.1,-1.1]].map(p=>new THREE.Vector3(p[0],.06,p[1]));
const plan=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineDashedMaterial({color:0xffffff,dashSize:.25,gapSize:.15}));plan.computeLineDistances();scene.add(plan);
