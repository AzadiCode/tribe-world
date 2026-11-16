// ═══ ضبط رابط روی موبایل ═══ همان عنصرهای واقعی صفحه (منابع، مرحله، هدف، مکالمه، اسم و حرف شهروندان) را روی هر فریم ضبط می‌کشد.
// ساده و بدون کتابخانه: پس‌زمینه، دورخط، متن و آیکن SVG. (بدون محو شیشه‌ای و سایه.) برای ضبط عنصر جدید فقط سلکتورش را به ROOTS در index.html اضافه کن.
export function createHudCapture(src,roots){
const cv=document.createElement('canvas'),x=cv.getContext('2d'),imgs=new Map(),P=v=>parseFloat(v)||0;
cv.width=src.width;cv.height=src.height;let last=0;
const alpha=c=>{if(!c||c==='transparent')return 0;const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return 1;const p=m[1].split(/[ ,\/]+/);return p.length>3?+p[3]:1};
function rr(l,t,w,h,r){r=Math.min(r,w/2,h/2);x.beginPath();x.roundRect?x.roundRect(l,t,w,h,r):x.rect(l,t,w,h)}
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
if(ba>0){x.fillStyle=cs.backgroundColor;rr(r.left,r.top,r.width,r.height,R);x.fill()}
if(bw>0&&alpha(cs.borderTopColor)>0&&cs.borderTopStyle!=='none'){x.strokeStyle=cs.borderTopColor;x.lineWidth=bw;rr(r.left,r.top,r.width,r.height,R);x.stroke()}
const sc=el.offsetWidth?r.width/el.offsetWidth:1;
for(const n of el.childNodes){if(n.nodeType===3)text(n,el,cs,sc);else if(n.nodeType===1)walk(n,op)}x.globalAlpha=al}
function frame(){const n=performance.now();if(n-last<28)return;last=n;
x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.drawImage(src,0,0);x.setTransform(cv.width/innerWidth,0,0,cv.height/innerHeight,0,0);
try{roots.forEach(s=>document.querySelectorAll(s).forEach(e=>walk(e,1)))}catch(e){}x.globalAlpha=1}
return{canvas:cv,frame}}
