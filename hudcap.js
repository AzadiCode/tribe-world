// Capture the real game canvas plus a lightweight DOM/HUD compositor.
// Browser chrome, Android status/navigation bars and OS notifications are never captured.
export function createHudCapture(src, roots){
  const cv=document.createElement('canvas'), x=cv.getContext('2d',{alpha:false}), imgs=new Map();
  const P=v=>parseFloat(v)||0;
  cv.width=src.width; cv.height=src.height;
  let last=0;
  const alpha=c=>{if(!c||c==='transparent')return 0;const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return 1;const p=m[1].split(/[ ,/]+/);return p.length>3?Number(p[3]):1};
  function rr(l,t,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));x.beginPath();if(x.roundRect)x.roundRect(l,t,w,h,r);else x.rect(l,t,w,h)}
  function paintBg(bg,r,rad){
    if(!bg||bg==='none')return;
    let g=bg.match(/linear-gradient\((.*)\)/i);
    if(g){const body=g[1].replace(/^\s*(?:[-+]?\d+(?:\.\d+)?deg|[-+]?\d+(?:\.\d+)?turn|to\s+\w+(?:\s+\w+)?)\s*,/i,'');const stops=[...body.matchAll(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/gi)].map(m=>m[1]);if(stops.length>1){const gr=x.createLinearGradient(r.left,r.top,r.right,r.bottom);stops.forEach((c,i)=>gr.addColorStop(i/(stops.length-1),c));x.fillStyle=gr;rr(r.left,r.top,r.width,r.height,rad);x.fill();return}}
    if(alpha(bg)>0){x.fillStyle=bg;rr(r.left,r.top,r.width,r.height,rad);x.fill()}
  }
  function shadow(cs,r,rad){const sh=cs.boxShadow;if(!sh||sh==='none')return;const m=sh.match(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+(-?[\d.]+)px)?\s+(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i);if(!m)return;x.save();x.shadowColor=m[5];x.shadowOffsetX=P(m[1]);x.shadowOffsetY=P(m[2]);x.shadowBlur=P(m[3]);x.fillStyle='rgba(0,0,0,0.01)';rr(r.left,r.top,r.width,r.height,rad);x.fill();x.restore()}
  function svg(el,r,cs){let s=el.outerHTML;if(!/xmlns=/.test(s))s=s.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"');s=s.replace(/currentColor/g,cs.color).replace(/^<svg/,`<svg width="${r.width}" height="${r.height}"`);let i=imgs.get(s);if(!i){i=new Image();i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);imgs.set(s,i);if(imgs.size>300)imgs.delete(imgs.keys().next().value)}if(i.complete&&i.naturalWidth)x.drawImage(i,r.left,r.top,r.width,r.height)}
  function text(node,cs){const raw=node.nodeValue;if(!raw||!raw.trim())return;const rg=document.createRange();rg.selectNodeContents(node);const rs=[...rg.getClientRects()].filter(q=>q.width>0&&q.height>0);if(!rs.length)return;
    x.font=`${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${P(cs.fontSize)}px ${cs.fontFamily}`;x.fillStyle=cs.color;x.textBaseline='middle';const rtl=cs.direction==='rtl';x.direction=rtl?'rtl':'ltr';x.textAlign=rtl?'right':'left';
    const ts=cs.textShadow;if(ts&&ts!=='none'){const m=ts.match(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(rgba?\([^)]*\)|#[0-9a-f]{3,8})/);if(m){x.shadowOffsetX=P(m[1]);x.shadowOffsetY=P(m[2]);x.shadowBlur=P(m[3]);x.shadowColor=m[4]}}
    if(rs.length===1){const q=rs[0];x.fillText(raw.replace(/\s+/g,' ').trim(),rtl?q.right:q.left,(q.top+q.bottom)/2,Math.max(1,q.width));}
    else {let cur='',top=null,q0=null;for(let i=0;i<raw.length;i++){rg.setStart(node,i);rg.setEnd(node,i+1);const q=rg.getBoundingClientRect();if(!q.width)continue;if(top!==null&&Math.abs(q.top-top)>3){if(cur.trim())x.fillText(cur.trim(),rtl?q0.right:q0.left,(q0.top+q0.bottom)/2);cur='';q0=null}if(!q0){q0={left:q.left,right:q.right,top:q.top,bottom:q.bottom};top=q.top}else{q0.left=Math.min(q0.left,q.left);q0.right=Math.max(q0.right,q.right)}cur+=raw[i]}if(cur.trim()&&q0)x.fillText(cur.trim(),rtl?q0.right:q0.left,(q0.top+q0.bottom)/2)}
    x.shadowColor='transparent';x.shadowBlur=x.shadowOffsetX=x.shadowOffsetY=0;
  }
  function walk(el,parentAlpha=1){const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return;const op=parentAlpha*(Number(cs.opacity)||0);if(op<=.01)return;const r=el.getBoundingClientRect();if(r.width<1||r.height<1||r.right<0||r.bottom<0||r.left>innerWidth||r.top>innerHeight)return;
    x.save();x.globalAlpha=op;
    if(el.tagName?.toLowerCase()==='svg'){svg(el,r,cs);x.restore();return}
    if(el.tagName?.toLowerCase()==='img'){try{x.drawImage(el,r.left,r.top,r.width,r.height)}catch(e){}x.restore();return}
    const rad=P(cs.borderTopLeftRadius);shadow(cs,r,rad);paintBg(cs.backgroundImage,r,rad);if(cs.backgroundColor&&alpha(cs.backgroundColor)>0){x.fillStyle=cs.backgroundColor;rr(r.left,r.top,r.width,r.height,rad);x.fill()}
    const bw=P(cs.borderTopWidth);if(bw>0&&alpha(cs.borderTopColor)>0&&cs.borderTopStyle!=='none'){x.strokeStyle=cs.borderTopColor;x.lineWidth=bw;rr(r.left+bw/2,r.top+bw/2,r.width-bw,r.height-bw,rad);x.stroke()}
    for(const n of el.childNodes){if(n.nodeType===3)text(n,cs);else if(n.nodeType===1)walk(n,op)}x.restore();
  }
  function frame(){const now=performance.now();if(now-last<15)return;last=now;x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.clearRect(0,0,cv.width,cv.height);x.drawImage(src,0,0,cv.width,cv.height);x.setTransform(cv.width/innerWidth,0,0,cv.height/innerHeight,0,0);try{roots.forEach(s=>document.querySelectorAll(s).forEach(e=>walk(e,1)))}catch(e){}x.setTransform(1,0,0,1,0,0);x.globalAlpha=1}
  return{canvas:cv,frame};
}
