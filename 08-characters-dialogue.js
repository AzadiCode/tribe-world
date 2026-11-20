// ═══ حرف زدن شهروندان: جمله‌ها (DL)، گفتگوی دونفره (DC)، انتخاب جمله بر اساس ساعت/مکان/وضعیت قبیله، و نام‌های پیش‌فرض (DEF).
// جملهٔ جدید ← به DL یا DC اضافه کن. ═══
'use strict';
// ═══ گفتگوی هوشمند: کم، متنوع، و وابسته به ساعت / مکان / وضعیت قبیله ═══
const DG={r:{},cv:[],gG:0,gC:0,ev:0},dgNow=()=>performance.now()/1000;
const DL={
any:['هوا عالیه','چه روز قشنگیه!','اینجا آروم و قشنگه','یه چای می‌چسبه','همه‌چی خوب پیش می‌ره','چه قبیلهٔ خوبی داریم','کاش یه کم استراحت کنم','دلم یه قدم زدن می‌خواد'],
small:['هنوز کوچیکیم، ولی رشد می‌کنیم','کاش جمعیت بیشتر بشه','هر روز یه آشنای تازه!'],
mid:['روزبه‌روز شلوغ‌تر می‌شیم','داره شبیه روستا می‌شه'],
big:['چقدر شلوغ شده!','دیگه همه رو نمی‌شناسم!','شهر شده برای خودش'],
dawn:['چه سپیده‌دم قشنگی','هنوز هوا خنکه','نسیم صبح چه خوبه'],
morning:['امروز کلی کار دارم','صبح که می‌شه انرژی دارم','چه صبح خوبی'],
noon:['چه آفتابی!','وقت ناهاره','کاش یه سایه پیدا کنم'],
afternoon:['عصر قشنگیه','یه کم خسته شدم','روز خوبی بود'],
evening:['غروب چه رنگی داره','داره شب می‌شه','بوی شام میاد'],
night:['خوابم میاد','شب قشنگیه','ستاره‌ها رو ببین','کاش چراغ بیشتر بود'],
farm:['محصول امسال خوبه','خاک امروز نرمه','کاش بارون بیاد','سبزی‌ها دارن بزرگ می‌شن'],
market:['بازار امروز شلوغه','همه‌چی تازه‌ست','کاش بازار بزرگ‌تر بشه','قیمت‌ها بد نیست'],
home:['خونه‌م قشنگه','خونه بهترین جاست','کاش یه باغچه هم داشتم'],
river:['صدای رودخونه چقدر آرامش‌بخشه','آب رود از کنار شهر رد می‌شه','کنار رود چه منظرهٔ قشنگیه'],
tree:['زیر درخت خنکه','چه درخت بلندی','برگ‌ها چه قشنگ تکون می‌خورن'],
path:['پیاده‌روی خوبه','این مسیر خاکی دلنشینه','قدم زدن حال می‌ده'],
road:['ماشین میاد، مواظب باشم','باید زود از خیابون رد شم','خیابون شلوغه...'],
hungry:['غذا داره کم می‌شه...','کاش مزرعهٔ بیشتری داشتیم','گرسنمه...'],
plenty:['انبار پره، خیالم راحته','امسال غذا کم نیست'],
crowd:['اینجا شلوغه','برم یه جای خلوت'],
alone:['چه آرومه...','خلوت قشنگیه'],
morning_farm:['صبح زود مزرعه بهترینه','شبنم هنوز روی برگ‌هاست'],
morning_market:['بازار تازه باز شده'],
noon_tree:['ظهر زیر درخت می‌چسبه'],
evening_river:['غروب روی آب رودخونه قشنگه'],
night_path:['شب‌ها پیاده‌رو آرومه'],
night_home:['خونه شب‌ها گرمه'],
night_road:['شب با ماشین‌ها باید مواظب بود'],
gt:['سلام!','خوبی؟','سلام {n}!','چه خبر؟','ببخشید!','راه باز!'],
gt_dawn:['صبح بخیر!','چه صبح زودی!'],gt_morning:['صبح بخیر!','صبح بخیر {n}!'],gt_noon:['خسته نباشی!','چه گرمه!'],
gt_afternoon:['عصر بخیر!'],gt_evening:['عصر بخیر {n}!','داره شب می‌شه‌ها'],gt_night:['شب بخیر!','این وقت شب؟!'],
gr:['سلام!','مرسی، تو خوبی؟','خوبم!','هاها، سلام','سلام {n}!','قربونت'],
shop:['ممنون!','تازه‌ست','عالیه!','یکی از اینا لطفاً','قیمتش خوبه'],
farmw:['یه کم دیگه کار مونده','خاک امروز نرمه','کار مزرعه سخته ولی می‌چسبه'],
sitl:['چه آرامشی','اینجا خنکه','چه نسیمی'],
viewl:['چه منظره‌ای!','رودخونه چه قشنگه'],
own:['اینجا خونهٔ منه!','خونه‌م همینه','بفرمایید تو!'],
ownq:['دفتر منه','اینجا دفتر کاره'],
tap:['سلام!','خوش اومدی','من اینجام!','خوبی؟','به‌به!'],
tap_morning:['صبح بخیر!'],tap_dawn:['صبح بخیر!'],tap_noon:['خسته نباشی!'],tap_evening:['عصر بخیر!'],tap_night:['شب بخیر!','این وقت شب؟!'],
tap_farm:['دارم کار می‌کنم!'],tap_market:['بفرما، بازار اینجاست!'],tap_pond:['رودخونه رو دیدی؟'],
ev_build:['یه ساختمون جدید!','داره قشنگ‌تر می‌شه','چه کار خوبی'],
ev_house:['خونهٔ جدید! کاش مال من بود','جای بیشتر برای همه'],
ev_farm:['مزرعهٔ جدید یعنی غذای بیشتر!','عجب! مزرعه ساختن'],
ev_market:['بازار جدید! عالیه','حالا خرید راحت‌تره'],
ev_road:['جاده؟ ماشین هم میاد!','جاده‌ها شهر رو زنده می‌کنن'],
ev_path:['پیاده‌رو! دیگه از وسط خیابون نمی‌ریم','قدم زدن راحت‌تر شد'],
ev_join:['خوش اومدید!','یه عضو جدید!','قبیله داره بزرگ‌تر می‌شه'],
ev_goal:['به هدف رسیدیم!','هورا!']
};
const DC=[
{t:['any'],l:['{n}، چه خبر؟','هیچی، آروم و قشنگ.','خوش به حالت!']},
{t:['any'],l:['شنیدی قبیله داره بزرگ می‌شه؟','آره، ساختمون‌های تازه ساختن','کاش ما هم خونهٔ بزرگ‌تری داشتیم']},
{t:['any'],l:['امروز کار زیاد داری؟','نه خیلی، تو چی؟','منم یه کم. بعداً بیا یه چای بخوریم']},
{t:['farm','morning'],l:['محصول چطوره؟','شکر خدا، امسال خوبه','پس انبار پر می‌شه!']},
{t:['market'],l:['امروز چی خریدی؟','فقط یه کم میوه، تازه‌ست','پس منم برم یه سر بزنم']},
{t:['hungry'],l:['غذا داره کم می‌شه...','آره، باید مزرعهٔ بیشتری بسازیم','امیدوارم زودتر درست بشه']},
{t:['plenty'],l:['انبار پره!','آره، امسال غذا کم نیست','خدا رو شکر']},
{t:['evening','night'],l:['دیر وقته، نمی‌خوای بخوابی؟','چرا، همین الان می‌رم','شب بخیر {n}!']},
{t:['dawn','morning'],l:['صبح بخیر! امروز چه برنامه‌ای داری؟','می‌رم مزرعه، تو چی؟','منم میام یه کم کمکت کنم']},
{t:['noon'],l:['چقدر گرمه!','بیا بریم زیر سایه','آره، یه کم استراحت کنیم']},
{t:['river'],l:['رودخونه امروز چه آرومه','آره، دلم می‌خواد کنارش قدم بزنم','بیا بریم']},
{t:['path'],l:['این پیاده‌رو خاکی خوبه','آره، دیگه لازم نیست از خیابون رد شیم','راحت‌تر شده']},
{t:['road'],l:['مواظب ماشین‌ها باش','آره، یه لحظه صبر کن رد بشن','بفرما، رد شو']},
{t:['crowd'],l:['چقدر شلوغه!','آره، بریم یه جای خلوت‌تر','موافقم']},
{t:['mid','big'],l:['یادته اولش چند نفر بودیم؟','آره، خیلی کم بودیم','حالا ببین!']},
{t:['small'],l:['خوبه که هنوز همه همدیگه رو می‌شناسیم','آره، مثل یه خانواده‌ایم','امیدوارم همیشه همین‌طور بمونه']},
{t:['tree'],l:['اینجا چه خنکه','آره، سایهٔ درخت عالیه','بشینیم یه کم؟']},
{t:['evening'],l:['غروب چه قشنگه','آره، آسمون طلایی شده','کاش همیشه همین‌طور بود']},
{t:['home'],l:['خونه‌ت چطوره؟','خوبه، فقط کاش بزرگ‌تر بود','یه روز بزرگش می‌کنیم']}
];
function dgSlot(){return H<5?'night':H<7.5?'dawn':H<11.5?'morning':H<14.5?'noon':H<17.5?'afternoon':H<20?'evening':'night'}
function dgZone(c){const x=c.g.position.x,z=c.g.position.z,D=(a,b)=>Math.hypot(a-x,b-z);
if(farms.some(f=>D(f.x,f.z)<2.4))return'farm';if(mkts.some(m=>D(m.cx,m.cz)<3))return'market';if(homes.some(h=>D(h.x,h.z)<2.3))return'home';
const RP=[[-146,22],[-96,22],[-96,6],[-40,6],[-40,24],[16,24],[16,4],[72,4],[72,18],[146,18]];for(let i=1;i<RP.length;i++){const a=RP[i-1],b=RP[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));if(Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz)<6.2)return'river'}const k=Math.round(x/CELL)+','+Math.round(z/CELL);if(pathSet.has(k))return'path';if(roadSet.has(k))return'road';
if(treeSp.some(s=>D(s.x,s.z)<1.2))return'tree';return'open'}
function dgTags(c){const s=(W&&W.stats)||{},pop=s.pop||1,fd=s.food||0,sl=dgSlot(),z=dgZone(c),n=crowd(c.g.position.x,c.g.position.z),t=['any',sl,z,sl+'_'+z,pop<30?'small':pop<150?'mid':'big'];
t.push(n>=4?'crowd':n<=1?'alone':'any');if(fd<pop*.5)t.push('hungry');else if(fd>pop*6)t.push('plenty');return t}
function dgLine(tags,c,ring='a'){const R=DG.r[ring]||(DG.r[ring]=[]),mx=ring==='a'?20:ring==='g'?4:3,pool=[];
for(const t of tags){const a=DL[t];if(!a)continue;const ok=a.filter(s=>!R.includes(s)&&s!==c.ll);if(!ok.length)continue;const w=(t==='any'?2:t.includes('_')?5:3)/ok.length;for(const s of ok)pool.push([w,s])}
if(!pool.length)return null;const s=pk(pool)[1];R.push(s);if(R.length>mx)R.shift();c.ll=s;return s}
function dgSay(c,tags,ms=3200,ring='a'){const s=dgLine(tags,c,ring);if(!s)return;bubble(c,s,ms);c.ls=dgNow()}
const dgVis=c=>{tv.copy(c.g.position);tv.project(cam);return tv.z<1&&Math.abs(tv.x)<1.05&&Math.abs(tv.y)<1.05&&cam.position.distanceTo(c.g.position)<60};
// حرف زدن خودبه‌خودی: کم، فقط از بین آدم‌هایی که دیده می‌شوند، با ترجیح جاهای جالب (مزرعه، بازار، رودخانه...)
function dgAmb(){if(document.hidden)return;let on=0;for(const c of cits)if(c._el&&c._el.querySelector('.bb'))on++;if(on>=2||Math.random()<.35)return;
const now=dgNow(),WT={farm:3,market:3,river:2.5,tree:2.5,path:1.6,home:1.4,road:1.2},pool=[];
for(const c of cits){if(c.hid||c.act==='chat'||c.st==='enter'||c.st==='exit'||c.st==='greet'||(c._el&&c._el.querySelector('.bb'))||now-(c.ls||0)<50||!dgVis(c))continue;pool.push([WT[dgZone(c)]||.8,c])}
if(!pool.length)return;const c=pk(pool)[1];dgSay(c,dgTags(c),3400)}
// گفتگوی دو نفره: ۳ جملهٔ مرتبط با موقعیت، نه حرف بی‌پایان
function dgConv(c,p){const tg=dgTags(c),pz=dgZone(p);if(!tg.includes(pz))tg.push(pz);const pool=[];
DC.forEach((s,i)=>{if(DG.cv.includes(i))return;let w=0;for(const t of s.t)if(tg.includes(t))w=Math.max(w,t==='any'?1:3);if(w)pool.push([w,i])});
if(!pool.length)return 0;const i=pk(pool)[1];DG.cv.push(i);if(DG.cv.length>6)DG.cv.shift();c.cv={i:0,L:DC[i].l,t:.7+Math.random()*.6};DG.gC=dgNow();return 1}
function dgTurn(c,p){const v=c.cv,s=v.i%2?p:c,l=v.i%2?c:p;if(!s.hid){bubble(s,v.L[v.i].split('{n}').join(nameOf(l.i)),2900);s.talk=2.2}v.i++;
if(v.i>=v.L.length){c.cv=null;const e=2.6+Math.random()*2.4;c.tm=Math.min(c.tm,e);p.tm=Math.min(p.tm,e)}else v.t=3+Math.random()*1.3}
// سلام‌وعلیک: بیشتر بی‌صدا (فقط دست تکان دادن)، و وقتی حرف می‌زنند مطابق ساعت روز
function dgGreet(a,b){const n=dgNow();if(n-DG.gG<7||Math.random()<.4)return;DG.gG=n;const t=dgLine(['gt','gt_'+dgSlot()],a,'g');if(t)bubble(a,t.split('{n}').join(nameOf(b.i)),1800);
if(Math.random()<.55)setTimeout(()=>{if(b.hid)return;const r=dgLine(['gr'],b,'g');if(r)bubble(b,r.split('{n}').join(nameOf(a.i)),1700)},500+Math.random()*400)}
function dgTap(c){return dgLine(['tap','tap_'+dgSlot(),'tap_'+dgZone(c)],c,'t')||'سلام!'}
// واکنش به اتفاق‌های قبیله (ساخت‌وساز، عضو جدید، رسیدن به هدف)
function dgEvent(t){const n=dgNow();if(n-DG.ev<25)return;
const k=t.includes('ساخته شد')?(t.includes('پیاده‌رو')?'ev_path':t.includes('جاده')?'ev_road':t.includes('خانه')?'ev_house':t.includes('مزرعه')?'ev_farm':t.includes('بازار')?'ev_market':'ev_build'):t.includes('پیوست')?'ev_join':t.includes('رسیدیم')?'ev_goal':'';if(!k)return;DG.ev=n;
let v=cits.filter(c=>!c.hid&&dgVis(c));if(!v.length)v=cits.filter(c=>!c.hid);v.sort(()=>Math.random()-.5).slice(0,Math.random()<.5?2:1).forEach((c,i)=>setTimeout(()=>{if(!c.hid)dgSay(c,[k],3600,'e')},1200+i*1400+Math.random()*900))}
const DEF=['آرش','سارا','نیما','مینا','کیان','لیلا','پارسا','نگار','بهروز','ندا','سامان','هستی','امیر','مهسا','کاوه','الناز','رضا','پگاه','یاشار','آیدا','داریوش','شقایق','بابک','سیمین'];
