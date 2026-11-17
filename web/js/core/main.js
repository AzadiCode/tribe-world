// ═══ شروع بازی و حلقهٔ اصلی انیمیشن ═══
'use strict';
const onRes=()=>{if(RC.on)return;cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();R.setSize(innerWidth,innerHeight)};addEventListener('resize',onRes);
async function startGame(){
await poll();joinMe();setInterval(poll,3000);localStorage.seen?$('cap').style.display='none':say(0);
const ck=new THREE.Clock(),START=new THREE.Vector3(46,52,56);let intro=0,ldDone=0,ldF=0;ctl.enabled=false;
R.setAnimationLoop(()=>{const dt=Math.min(ck.getDelta(),.1),t=ck.elapsedTime;envStep(dt);
for(const k in disp){disp[k]+=(tgt[k]-disp[k])*Math.min(1,dt*5);const v=Math.abs(tgt[k]-disp[k])<.05?tgt[k]:disp[k],txt=fa(v,k==='money'?1:0);if(last[k]!==txt){last[k]=txt;$('v_'+k).textContent=txt}}
if(intro<1&&W){intro=Math.min(1,intro+dt/3.2);const e=1-Math.pow(1-intro,3);cam.position.lerpVectors(START,HOME,e);cam.lookAt(0,0,0);if(intro>=1){ctl.enabled=true;ctl.update()}}
{const k=1+.12*Math.sin(t*.8);rip.scale.set(1.3*k,1,.9*k);rip.material.opacity=.14+.06*Math.sin(t*.8)}for(const c of clouds){c.position.x+=dt*.8;if(c.position.x>90)c.position.x=-90}
for(const g of objs.values())if(g.userData.sw!==undefined)g.rotation.z=Math.sin(t*1.3+g.userData.sw)*.025;
for(const g of objs.values()){const u=g.userData;if(u.t<1){u.t=Math.min(1,u.t+dt*1.8);const e=1-Math.pow(1-u.t,3);g.scale.setScalar(Math.max(.01,e*(1+.12*Math.sin(u.t*Math.PI))))}}
if(!document.hidden){fpsA+=(Math.min(120,1/Math.max(dt,.001))-fpsA)*.05;if((warm-=dt)<=0&&(fpsT-=dt)<=0){fpsT=1.5;tune()}}
stepCits(dt,t);stepCars(dt,t);stepHouse(dt);
if(CIN)CIN.step(dt);ctl.target.x=Math.max(-34,Math.min(34,ctl.target.x));ctl.target.z=Math.max(-34,Math.min(34,ctl.target.z));ctl.update();if(INST){try{fillInst(dt)}catch(e){console.error(e);killInst()}}R.render(scene,cam);if(RCOMP)RCOMP();if(W&&!ldDone&&++ldF>2){ldDone=1;const l=$('ld');if(l){l.classList.add('out');setTimeout(()=>l.remove(),900)}}});
}
startGame();
