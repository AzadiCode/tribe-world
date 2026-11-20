// ═══ ضبط رابط روی موبایل ═══ همان عنصرهای واقعی صفحه (منابع، مرحله، هدف، مکالمه، اسم و حرف شهروندان) را روی هر فریم ضبط می‌کشد.
// ساده و بدون کتابخانه: پس‌زمینه، دورخط، متن و آیکن SVG. برای ضبط عنصر جدید فقط سلکتورش را به لیست ROOTS در 11-features-recorder.js اضافه کن.
export function createHudCapture(src,roots){
const cv=document.createElement('canvas'),x=cv.getContext('2d'),imgs=new Map(),P=v=>parseFloat(v)||0;
cv.width=src.width;cv.height=src.height;let last=0,K=1;
const alpha=c=>{if(!c||c==='transparent')return 0;const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return 1;const p=m[1].split(/[ ,\/]+/);return p.length>3?+p[3]:1};
function rr(l,t,w,h,r,keep){r=Math.min(r,w/2,h/2);if(!keep)x.beginPath();x.roundRect?x.roundRect(l,t,w,h,r):x.rect(l,t,w,h)}
function svg(el,r,cs){const c=el.cloneNode(true);c.setAttribute('xmlns','http://www.w3.org/2000/svg');c.setAttribute('width',r.width);c.setAttribute('height',r.height);
// استایل‌های CSS (fill/stroke…) داخل تصویر SVG اعمال نمی‌شوند؛ مقدار نهایی‌شان را روی خود SVG می‌نویسیم تا آیکن‌ها سیاه و توپر نشوند
[['fill','fill'],['stroke','stroke'],['stroke-width','strokeWidth'],['stroke-linecap','strokeLinecap'],['stroke-linejoin','strokeLinejoin']].forEach(([a,b])=>{if(cs[b])c.setAttribute(a,cs[b])});
let s=c.outerHTML.replace(/currentColor/g,cs.color);
let i=imgs.get(s);if(!i){i=new Image();i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);imgs.set(s,i);if(imgs.size>200)imgs.delete(imgs.keys().next().value)}if(i.complete&&i.naturalWidth)x.drawImage(i,r.left,r.top,r.width,r.height)}
function text(node,el,cs,sc){const t=node.nodeValue.replace(/\s+/g,' ').trim();if(!t)return;const rg=document.createRange();rg.selectNodeContents(node);const rs=[...rg.getClientRects()].filter(q=>q.width>0);if(!rs.length)return;
x.font=`${cs.fontStyle} ${cs.fontWeight} ${P(cs.fontSize)*sc}px ${cs.fontFamily}`;x.fillStyle=cs.color;x.textBaseline='middle';const rtl=cs.direction==='rtl';x.direction=rtl?'rtl':'ltr';x.textAlign=rtl?'right':'left';
const put=(s,q)=>x.fillText(s,rtl?q.right:q.left,(q.top+q.bottom)/2);
if(rs.length===1)return put(t,rs[0]);
const v=node.nodeValue;let cur='',ct=null,cq=null;for(let i=0;i<v.length;i++){rg.setStart(node,i);rg.setEnd(node,i+1);const q=rg.getClientRects()[0];if(!q)continue;if(ct!==null&&Math.abs(q.top-ct)>3){put(cur.trim(),cq);cur=''}if(ct===null||Math.abs(q.top-ct)>3){ct=q.top;cq={left:q.left,right:q.right,top:q.top,bottom:q.bottom}}else{cq.left=Math.min(cq.left,q.left);cq.right=Math.max(cq.right,q.right)}cur+=v[i]}if(cur.trim())put(cur.trim(),cq)}
function walk(el,al){if(el.style&&el.style.display==='none')return;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return;const op=al*(+cs.opacity);if(op<=.01)return;const r=el.getBoundingClientRect();
if(r.width<1||r.height<1||r.right<0||r.bottom<0||r.left>innerWidth||r.top>innerHeight)return;x.globalAlpha=op;
if(el.tagName&&el.tagName.toLowerCase()==='svg')return svg(el,r,cs);
const ba=alpha(cs.backgroundColor),bw=P(cs.borderTopWidth),rad=cs.borderTopLeftRadius,R=rad.includes('%')?Math.min(r.width,r.height)*P(rad)/100:P(rad);
// سایه‌ی بیرونی (box-shadow) مثل خود بازی: فقط بیرون کادر کشیده می‌شود
const shs=(cs.boxShadow&&cs.boxShadow!=='none'?cs.boxShadow.split(/,(?![^(]*\))/):[]).map(q=>q.trim()).filter(q=>!/inset/.test(q));
if(shs.length&&ba>0){x.save();x.beginPath();x.rect(-1e4,-1e4,2e4,2e4);rr(r.left,r.top,r.width,r.height,R,1);x.clip('evenodd');
for(const q of shs){const m=q.match(/(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+(-?[\d.]+)px)?/);if(!m)continue;const sp=+(m[5]||0);x.shadowColor=m[1];x.shadowOffsetX=(+m[2]+1e4)*K;x.shadowOffsetY=+m[3]*K;x.shadowBlur=+m[4]*K;x.fillStyle='#000';rr(r.left-sp-1e4,r.top-sp,r.width+sp*2,r.height+sp*2,R+sp);x.fill()}x.restore();x.globalAlpha=op}
// محو شیشه‌ای پشت پنل (backdrop-filter) مثل خود بازی
const bf=cs.backdropFilter||cs.webkitBackdropFilter||'',bl=bf.match(/blur\(([\d.]+)px\)/);
if(bl&&ba>0&&'filter' in x){const b=+bl[1],pd=b*3,sa=bf.match(/saturate\(([\d.]+)\)/);x.save();rr(r.left,r.top,r.width,r.height,R);x.clip();x.filter='blur('+b*K+'px)'+(sa?' saturate('+sa[1]+')':'');
const l0=r.left-pd,t0=r.top-pd,w0=r.width+pd*2,h0=r.height+pd*2;x.globalAlpha=1;x.drawImage(src,l0*K,t0*K,w0*K,h0*K,l0,t0,w0,h0);x.restore();x.globalAlpha=op}
if(ba>0){x.fillStyle=cs.backgroundColor;rr(r.left,r.top,r.width,r.height,R);x.fill()}
// پس‌زمینه‌ی گرادیانی (مثل نوار پیشرفت هدف)
const gm=(cs.backgroundImage||'').match(/linear-gradient\((?:(-?[\d.]+)deg,\s*)?(.+)\)$/);
if(gm){const cols=gm[2].match(/rgba?\([^)]+\)/g)||[];if(cols.length>1){const an=(gm[1]!==undefined?+gm[1]:180)*Math.PI/180,cx=r.left+r.width/2,cy=r.top+r.height/2,hl=(Math.abs(r.width*Math.sin(an))+Math.abs(r.height*Math.cos(an)))/2,dx=Math.sin(an)*hl,dy=-Math.cos(an)*hl,gr=x.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);cols.forEach((c,i)=>gr.addColorStop(i/(cols.length-1),c));x.fillStyle=gr;rr(r.left,r.top,r.width,r.height,R);x.fill()}}
if(bw>0&&alpha(cs.borderTopColor)>0&&cs.borderTopStyle!=='none'){x.strokeStyle=cs.borderTopColor;x.lineWidth=bw;rr(r.left,r.top,r.width,r.height,R);x.stroke()}
const sc=el.offsetWidth?r.width/el.offsetWidth:1;
const ov=cs.overflowX==='hidden';if(ov){x.save();rr(r.left,r.top,r.width,r.height,R);x.clip()}
for(const n of el.childNodes){if(n.nodeType===3)text(n,el,cs,sc);else if(n.nodeType===1)walk(n,op)}if(ov)x.restore();
// دم حباب گفتگو (::after مثلثی)
for(const pe of ['::after']){const pc=getComputedStyle(el,pe);if(!pc||pc.content==='none'||pc.content==='normal')continue;const bt=P(pc.borderTopWidth),bl=P(pc.borderLeftWidth),br=P(pc.borderRightWidth),bb=P(pc.borderBottomWidth),w=P(pc.width)+bl+br,h=P(pc.height)+bt+bb;if(!(w>0&&h>0)||alpha(pc.borderTopColor)===0&&alpha(pc.borderBottomColor)===0)continue;
let L,T;if(pc.position==='absolute'){L=r.left+P(pc.left)+P(pc.marginLeft);T=r.bottom-P(pc.bottom)-h}else{L=r.left+(r.width-w)/2;T=r.bottom-h+P(pc.marginTop)}
x.globalAlpha=op;x.beginPath();if(bt>0&&alpha(pc.borderTopColor)>0){x.fillStyle=pc.borderTopColor;x.moveTo(L,T);x.lineTo(L+w,T);x.lineTo(L+w/2,T+bt)}else{x.fillStyle=pc.borderBottomColor;x.moveTo(L,T+h);x.lineTo(L+w,T+h);x.lineTo(L+w/2,T+h-bb)}x.fill()}
x.globalAlpha=al}
function frame(){const n=performance.now();if(n-last<28)return;last=n;
x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.drawImage(src,0,0);K=cv.width/innerWidth;x.setTransform(cv.width/innerWidth,0,0,cv.height/innerHeight,0,0);
try{roots.forEach(s=>document.querySelectorAll(s).forEach(e=>walk(e,1)))}catch(e){}x.globalAlpha=1}
return{canvas:cv,frame}}
