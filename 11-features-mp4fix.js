// ═══ اصلاح خروجی ضبط ═══ MediaRecorder کروم، MP4 «تکه‌تکه» (fragmented) و بدون مدت‌زمان می‌سازد که بعضی ادیتورهای ویدیو نمی‌پذیرند.
// این ماژول همان نمونه‌ها را بدون انکود دوباره در یک MP4 معمولی (moov کامل + مدت‌زمان + جدول فریم‌ها) بازبسته‌بندی می‌کند.
// داده‌ی ویدیو در حافظه کپی نمی‌شود (فقط slice از Blob)؛ هر خطایی ⇒ همان فایل اصلی برمی‌گردد.
const u32=(b,o)=>((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0,i32=(b,o)=>u32(b,o)|0,tp=(b,o)=>String.fromCharCode(b[o],b[o+1],b[o+2],b[o+3]);
const w32=n=>new Uint8Array([n>>>24&255,n>>>16&255,n>>>8&255,n&255]),arr=a=>{const o=new Uint8Array(a.length*4);a.forEach((v,i)=>o.set(w32(v),i*4));return o};
const cat=a=>{let n=0;a.forEach(x=>n+=x.length);const o=new Uint8Array(n);let p=0;a.forEach(x=>{o.set(x,p);p+=x.length});return o};
const mk=(t,...p)=>{const c=cat(p),o=new Uint8Array(8+c.length);o.set(w32(o.length),0);for(let i=0;i<4;i++)o[4+i]=t.charCodeAt(i);o.set(c,8);return o};
const full=(t,v,...p)=>mk(t,new Uint8Array([v,0,0,0]),...p);
function boxes(b,s,e){const r=[];while(s+8<=e){let z=u32(b,s),h=8;if(z===1){z=u32(b,s+8)*4294967296+u32(b,s+12);h=16}else if(z===0)z=e-s;if(z<h||s+z>e)break;r.push({t:tp(b,s+4),s,e:s+z,d:s+h});s+=z}return r}
const kids=(b,x)=>boxes(b,x.d,x.e),get=(b,x,t)=>kids(b,x).find(y=>y.t===t),cp=(b,x)=>b.slice(x.s,x.e);
const rd64=(b,o)=>u32(b,o)*4294967296+u32(b,o+4),wr64=(b,o,v)=>{b.set(w32(Math.floor(v/4294967296)),o);b.set(w32(v%4294967296),o+4)};
// خواندن/نوشتن فیلدهای نسخه‌دار: mvhd/mdhd (مقیاس، مدت) و tkhd (شناسه، مدت) — آفست‌ها نسبت به شروع بدنهٔ باکس
const TS=(b,x)=>u32(b,x.d+(b[x.d]?20:12)),TID=(b,x)=>u32(b,x.d+(b[x.d]?20:12));
const setDur=(c,t,v)=>{const o=8+(c[8]?(t==='tk'?28:24):(t==='tk'?20:16));c[8]?wr64(c,o,v):c.set(w32(v),o)};
// خواندن moof (آفست داده نسبت به شروع moof در فایل اصلی؛ default-base-is-moof)
function readFrag(b,fs,trex,T){
for(const traf of boxes(b,8,b.length).filter(x=>x.t==='traf')){
const tk=kids(b,traf),th=tk.find(x=>x.t==='tfhd');if(!th)continue;
const tf=u32(b,th.d)&0xffffff,id=u32(b,th.d+4);let p=th.d+8,bdo=null,dd=null,ds=null,df=null;
if(tf&1){bdo=rd64(b,p);p+=8}if(tf&2)p+=4;if(tf&8){dd=u32(b,p);p+=4}if(tf&16){ds=u32(b,p);p+=4}if(tf&32){df=u32(b,p);p+=4}
const t=T[id]||(T[id]={smp:[],chunks:[],start:null}),x=trex[id]||{};
if(dd===null)dd=x.dd||0;if(ds===null)ds=x.ds||0;if(df===null)df=x.df||0;
const base=bdo!==null?bdo:fs,td=tk.find(y=>y.t==='tfdt');
if(td&&t.start===null)t.start=b[td.d]?rd64(b,td.d+4):u32(b,td.d+4);
for(const tr of tk.filter(y=>y.t==='trun')){
const vv=b[tr.d],fl=u32(b,tr.d)&0xffffff,n=u32(b,tr.d+4);let q=tr.d+8,off=0,ff=null;
if(fl&1){off=i32(b,q);q+=4}if(fl&4){ff=u32(b,q);q+=4}
let pos=base+off;const cs=pos;
for(let i=0;i<n;i++){let d=dd,z=ds,f=df,co=0;
if(fl&0x100){d=u32(b,q);q+=4}if(fl&0x200){z=u32(b,q);q+=4}if(fl&0x400){f=u32(b,q);q+=4}else if(i===0&&ff!==null)f=ff;if(fl&0x800){co=vv?i32(b,q):u32(b,q);q+=4}
t.smp.push({d,z,f,co});pos+=z}
t.chunks.push({n,s:cs,l:pos-cs})}}}
const runs=(a)=>{const r=[];a.forEach(v=>{const l=r[r.length-1];if(l&&l[1]===v)l[0]++;else r.push([1,v])});return r};

export async function fixMp4(blob){
try{
const total=blob.size,T={},trex={};let pos=0,ftyp=null,moov=null,nf=0;const frs=[];
while(pos+8<=total){const hd=new Uint8Array(await blob.slice(pos,Math.min(total,pos+16)).arrayBuffer());let z=u32(hd,0),h=8;
if(z===1){z=u32(hd,8)*4294967296+u32(hd,12);h=16}else if(z===0)z=total-pos;if(z<h||pos+z>total)break;
const t=tp(hd,4);if(t==='ftyp'||t==='moov'||t==='moof'){const bx=new Uint8Array(await blob.slice(pos,pos+z).arrayBuffer());if(t==='ftyp')ftyp=bx;else if(t==='moov')moov=bx;else frs.push([bx,pos])}pos+=z}
if(!moov||!frs.length)return blob;
const mb=boxes(moov,0,moov.length)[0],mx=get(moov,mb,'mvex');if(!mx)return blob; // قبلاً غیرتکه‌ای است
kids(moov,mx).filter(x=>x.t==='trex').forEach(x=>{trex[u32(moov,x.d+4)]={dd:u32(moov,x.d+12),ds:u32(moov,x.d+16),df:u32(moov,x.d+20)}});
frs.forEach(([bx,s])=>readFrag(bx,s,trex,T));
const mvhd=get(moov,mb,'mvhd'),mts=u32(moov,mvhd.d+(moov[mvhd.d]?20:12)),info={};let minStart=Infinity,movDur=0;
const traks=kids(moov,mb).filter(x=>x.t==='trak');
for(const tk of traks){const th=get(moov,tk,'tkhd'),id=TID(moov,th),t=T[id];if(!t||!t.smp.length)continue;
const ts=TS(moov,get(moov,get(moov,tk,'mdia'),'mdhd')),L=t.smp[t.smp.length-1];if(!L.d&&t.smp.length>1)L.d=t.smp[t.smp.length-2].d;
let dur=0;t.smp.forEach(s=>dur+=s.d);info[id]={ts,dur,t};minStart=Math.min(minStart,(t.start||0)/ts)}
const ids=Object.keys(info);if(!ids.length)return blob;
ids.forEach(id=>{const o=info[id];o.delay=Math.max(0,(o.t.start||0)/o.ts-minStart);o.mdur=Math.round((o.dur/o.ts+o.delay)*mts);movDur=Math.max(movDur,o.mdur)});
const ft=ftyp||mk('ftyp',new Uint8Array([105,115,111,109,0,0,2,0,105,115,111,109,105,115,111,50,97,118,99,49,109,112,52,49]));
// ترتیب ذخیره در mdat = ترتیب فایل اصلی (درهم‌بافتگی صوت/تصویر حفظ می‌شود)
const all=[];ids.forEach(id=>info[id].t.chunks.forEach((c,i)=>all.push({id,i,c})));all.sort((a,b)=>a.c.s-b.c.s);
function build(co){const out=[];
for(const tk of traks){const th=get(moov,tk,'tkhd'),id=TID(moov,th),o=info[id];if(!o)continue;
const md=get(moov,tk,'mdia'),mh=get(moov,md,'mdhd'),mi=get(moov,md,'minf'),sb=get(moov,mi,'stbl'),smp=o.t.smp,N=smp.length,ch=o.t.chunks;
const vide=tp(moov,get(moov,md,'hdlr').d+8)==='vide';
const st=runs(smp.map(s=>s.d)).map(r=>r),stsc=[];ch.forEach((c,i)=>{const l=stsc[stsc.length-1];if(!l||l[1]!==c.n)stsc.push([i+1,c.n,1])});
const ex=[];if(vide){const ss=[];smp.forEach((s,i)=>{if(!(s.f&0x10000))ss.push(i+1)});if(ss.length&&ss.length<N)ex.push(full('stss',0,w32(ss.length),arr(ss)))}
if(smp.some(s=>s.co)){const ct=runs(smp.map(s=>s.co));ex.push(full('ctts',smp.some(s=>s.co<0)?1:0,w32(ct.length),arr(ct.flatMap(r=>[r[0],r[1]>>>0]))))}
const stbl=mk('stbl',cp(moov,get(moov,sb,'stsd')),full('stts',0,w32(st.length),arr(st.flat())),...ex,full('stsz',0,w32(0),w32(N),arr(smp.map(s=>s.z))),full('stsc',0,w32(stsc.length),arr(stsc.flat())),full('stco',0,w32(ch.length),arr(co?co[id]:ch.map(()=>0))));
const minf=mk('minf',...kids(moov,mi).filter(x=>x.t!=='stbl').map(x=>cp(moov,x)),stbl),mhd=cp(moov,mh);setDur(mhd,'md',o.dur);
const mdia=mk('mdia',...kids(moov,md).map(x=>x.t==='mdhd'?mhd:x.t==='minf'?minf:cp(moov,x)));
const tkh=cp(moov,th);setDur(tkh,'tk',o.mdur);
const ed=o.delay>.001?mk('edts',full('elst',0,w32(2),arr([Math.round(o.delay*mts),0xffffffff,0x10000,Math.round(o.dur/o.ts*mts),0,0x10000]))):null;
const parts=[];kids(moov,tk).forEach(x=>{if(x.t==='edts')return;parts.push(x.t==='tkhd'?tkh:x.t==='mdia'?mdia:cp(moov,x));if(x.t==='tkhd'&&ed)parts.push(ed)});
out.push(mk('trak',...parts))}
const mvh=cp(moov,mvhd);setDur(mvh,'md',movDur);
return mk('moov',mvh,...out,...kids(moov,mb).filter(x=>!['mvhd','trak','mvex'].includes(x.t)).map(x=>cp(moov,x)))}
const len=build(null).length;let off=ft.length+len+8;const co={},parts=[];
ids.forEach(id=>co[id]=[]);all.forEach(({id,i,c})=>{co[id][i]=off;parts.push(blob.slice(c.s,c.s+c.l));off+=c.l});
const msz=off-(ft.length+len);if(off>4294967290)return blob;
return new Blob([ft,build(co),w32(msz),new Uint8Array([109,100,97,116]),...parts],{type:'video/mp4'})
}catch(e){console.warn('mp4fix',e);return blob}}
