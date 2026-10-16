import './style.css';
const KEY=import.meta.env.VITE_TMDB_API_KEY;
const TOKEN=import.meta.env.VITE_TMDB_READ_TOKEN;
const base='https://api.themoviedb.org/3';
const img=(p,size='w500')=>p?`https://image.tmdb.org/t/p/${size}${p}`:'';
const demo=[{id:1,title:'رحلة إلى المجهول',original_title:'The Unknown Journey',overview:'مغامرة مشوقة في عالم من الأسرار والاكتشافات.',vote_average:8.6,release_date:'2025-03-10',genre_ids:[12],media_type:'movie',poster_path:null,backdrop_path:null},{id:2,title:'المدينة الأخيرة',overview:'حين تتغير المدينة، تبدأ حكاية جديدة.',vote_average:8.2,release_date:'2024-09-11',genre_ids:[18],media_type:'tv'},{id:3,title:'ما وراء النجوم',overview:'رحلة خيال علمي عبر حدود الكون.',vote_average:7.9,release_date:'2025-01-02',genre_ids:[878],media_type:'movie'},{id:4,title:'الظل',overview:'لغز يختبئ خلف كل باب.',vote_average:8.1,release_date:'2023-11-10',genre_ids:[9648],media_type:'tv'},{id:5,title:'ليلة في البحر',overview:'حكاية إنسانية عن الشجاعة والأمل.',vote_average:7.8,release_date:'2025-05-14',genre_ids:[18],media_type:'movie'},{id:6,title:'الطريق',overview:'أصدقاء يجتمعون في رحلة تغير حياتهم.',vote_average:8.0,release_date:'2024-02-22',genre_ids:[12],media_type:'movie'}];
let stored=[];
try { stored=JSON.parse(localStorage.getItem('cinema_watchlist_v2')||'[]'); if(!Array.isArray(stored))stored=[]; } catch {}
let state={items:[],view:'trending',query:'',selected:null,watchlist:stored,page:1,totalPages:1,loading:false,error:'',request:0,genre:'',year:'',sort:'popularity.desc'};
const genres={28:'أكشن',12:'مغامرة',16:'أنيميشن',35:'كوميديا',80:'جريمة',99:'وثائقي',18:'دراما',10751:'عائلي',14:'فانتازيا',36:'تاريخ',27:'رعب',10402:'موسيقى',9648:'غموض',10749:'رومانسي',878:'خيال علمي',53:'إثارة',10752:'حرب',37:'غربي'};
const typeOf=x=>x.media_type||(x.first_air_date||x.name?'tv':'movie');
const saveEntry=x=>({id:x.id,media_type:typeOf(x),title:title(x),name:x.name,poster_path:x.poster_path,backdrop_path:x.backdrop_path,overview:x.overview,vote_average:x.vote_average,release_date:x.release_date,first_air_date:x.first_air_date,genre_ids:x.genre_ids});

async function api(path){if(!KEY&&!TOKEN)return null;const url=new URL(base+path);url.searchParams.set('language','ar-SA');if(KEY)url.searchParams.set('api_key',KEY);const r=await fetch(url,{headers:TOKEN?{Authorization:`Bearer ${TOKEN}`}:{}});if(!r.ok)throw Error('TMDB '+r.status);return r.json()}
const year=x=>(x.release_date||x.first_air_date||'').slice(0,4)||'—';
const title=x=>x.title||x.name||x.original_title||x.original_name||'بدون عنوان';
const card=x=>`<article class="movie" data-id="${x.id}" data-type="${x.media_type|| (x.first_air_date?'tv':'movie')}"><div class="poster">${x.poster_path?`<img loading="lazy" src="${img(x.poster_path)}" alt=""/>`:`<div class="placeholder">🎬</div>`}<span class="rating">★ ${(x.vote_average||0).toFixed(1)}</span></div><h3>${escapeHTML(title(x))}</h3><p>${year(x)} · ${x.media_type==='tv'||x.first_air_date?'مسلسل':'فيلم'}</p></article>`;
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){let items=state.view==='saved'?state.watchlist.filter(x=>(!state.genre||(x.genre_ids||[]).includes(Number(state.genre)))&&(!state.year||year(x)===state.year)):state.items;const hero=items[0]||demo[0];document.querySelector('#app').innerHTML=`<header><a class="brand" href="#">CINEMA<span>+</span></a><nav><button data-view="trending" class="${state.view==='trending'?'active':''}">الرئيسية</button><button data-view="movie" class="${state.view==='movie'?'active':''}">أفلام</button><button data-view="tv" class="${state.view==='tv'?'active':''}">مسلسلات</button><button data-view="saved" class="${state.view==='saved'?'active':''}">قائمتي</button></nav><button id="menu" aria-label="القائمة">☰</button></header><main><section class="hero" style="${hero.backdrop_path?`background-image:linear-gradient(90deg,rgba(9,11,18,.8),rgba(9,11,18,.25)),linear-gradient(0deg,#090b12,transparent),url('${img(hero.backdrop_path,'original')}')`:''}"><div class="hero-content"><div class="eyebrow">✦ اكتشف عالم الترفيه</div><h1>قصص تستحق<br><em>المشاهدة</em></h1><p>اكتشف أحدث الأفلام والمسلسلات وتفاصيلها وتقييماتها في مكان واحد.</p><button class="primary" id="explore">استكشف الآن ←</button></div></section>${state.view==='trending'?discoveryMarkup()+editorialMarkup():''}<section class="catalog" id="catalog"><div class="section-head"><div><small>مكتبتك السينمائية</small><h2>${({trending:'الأكثر رواجًا',movie:'أحدث الأفلام',tv:'المسلسلات الرائجة',saved:'قائمتي المفضلة',search:'نتائج البحث',collection:state.collectionLabel||'المجموعة'})[state.view]}</h2></div><div class="search"><span>⌕</span><input id="search" placeholder="ابحث عن فيلم أو مسلسل..." value="${escapeHTML(state.query)}" aria-label="بحث" /></div></div>${state.error?`<p class="notice">${escapeHTML(state.error)}</p>`:''}<div class="filters"><label>التصنيف <select id="genre"><option value="">الكل</option>${Object.entries(genres).map(([id,label])=>`<option value="${id}" ${state.genre===id?'selected':''}>${label}</option>`).join('')}</select></label><label>السنة <select id="year"><option value="">كل السنوات</option>${Array.from({length:25},(_,i)=>String(new Date().getFullYear()-i)).map(y=>`<option value="${y}" ${state.year===y?'selected':''}>${y}</option>`).join('')}</select></label><label>الترتيب <select id="sort"><option value="popularity.desc" ${state.sort==='popularity.desc'?'selected':''}>الأكثر شعبية</option><option value="vote_average.desc" ${state.sort==='vote_average.desc'?'selected':''}>الأعلى تقييمًا</option><option value="primary_release_date.desc" ${state.sort==='primary_release_date.desc'?'selected':''}>الأحدث</option></select></label></div><div class="grid">${state.loading?'<p class="empty">جاري تحميل النتائج...</p>':items.length?items.map(card).join(''):'<p class="empty">لا توجد نتائج حاليًا.</p>'}</div>${!state.loading&&state.view!=='saved'&&state.view!=='search'&&state.page<state.totalPages?'<button class="primary more" id="more">عرض المزيد</button>':''}</section></main><footer>© ${new Date().getFullYear()} CINEMA+ · بيانات الأفلام مقدمة من TMDB · هذا الموقع غير تابع لـ TMDB</footer><div id="modal-root"></div>`;bind();}
function bind(){document.querySelectorAll(".shelf-card").forEach(el=>el.onclick=()=>show(el.dataset.id,el.dataset.type));document.querySelectorAll("[data-shelf]").forEach(el=>el.onclick=()=>openShelf(el.dataset.shelf));document.querySelectorAll("[data-collection]").forEach(el=>el.onclick=()=>openCollection(el.dataset.collection));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>load(b.dataset.view));document.querySelector('#explore').onclick=()=>document.querySelector('#catalog').scrollIntoView({behavior:'smooth'});document.querySelector('#search').oninput=e=>{const q=e.target.value;state.query=q;clearTimeout(window.searchTimer);window.searchTimer=setTimeout(()=>{if(q.trim())load('search',q);else load('trending')},450)};document.querySelectorAll('.movie').forEach(el=>el.onclick=()=>show(el.dataset.id,el.dataset.type));document.querySelector('#menu').onclick=()=>document.querySelector('nav').classList.toggle('open');document.querySelectorAll('#genre,#year,#sort').forEach(el=>el.onchange=e=>{state[e.target.id]=e.target.value;load(state.view==='collection'?'trending':state.view,state.query)});const more=document.querySelector('#more');if(more)more.onclick=()=>load(state.view,'',true)}
async function load(view='trending',q='',append=false){
 const request=++state.request;
 if(!append){state.view=view;state.query=q;state.page=1;state.items=[];}
 else state.page++;
 state.loading=true;state.error='';render();
 if(view==='saved'){state.loading=false;render();return;}
 if(view==='search'&&!q.trim()){state.loading=false;render();return;}
 let path=view==='movie'?'/discover/movie':view==='tv'?'/discover/tv':view==='search'?`/search/multi?query=${encodeURIComponent(q.trim())}`:'/trending/all/week';
 if(view==='movie'||view==='tv'){
  const params=new URLSearchParams({sort_by:state.sort==='primary_release_date.desc'&&view==='tv'?'first_air_date.desc':state.sort});
  if(state.genre)params.set('with_genres',state.genre);
  if(state.year)params.set(view==='tv'?'first_air_date_year':'primary_release_year',state.year);
  if(state.sort==='vote_average.desc')params.set('vote_count.gte','100');
  path+='?'+params.toString();
 }
 try {
   const data=await api(path+(path.includes('?')?'&':'?')+'page='+state.page);
   if(request!==state.request)return;
   let results=(data?.results||demo).filter(x=>x.media_type!=='person');
   if(view==='trending'||view==='search')results=results.filter(x=>(!state.genre||(x.genre_ids||[]).includes(Number(state.genre)))&&(!state.year||year(x)===state.year));
   if((view==='trending'||view==='search')&&state.sort==='vote_average.desc')results.sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
   state.items=append?[...state.items,...results.filter(x=>!state.items.some(y=>y.id===x.id&&typeOf(y)===typeOf(x)))]:results;
   state.totalPages=data?.total_pages||1;
 }catch(e){
   if(request!==state.request)return;
   state.error='تعذّر الاتصال بـ TMDB. تحقق من المفتاح والاتصال بالإنترنت.';
   if(!append)state.items=[];
   console.error(e);
 }
 state.loading=false;render();
}
// TMDB video metadata is public; only trusted YouTube keys are embedded.
const validYoutubeKey=key=>typeof key==='string'&&/^[A-Za-z0-9_-]{11}$/.test(key);
function selectTrailer(videos){
 const eligible=(videos||[]).filter(v=>v.site==='YouTube'&&validYoutubeKey(v.key)&&v.official!==false&&['Trailer','Teaser'].includes(v.type));
 eligible.sort((a,b)=>Number(b.type==='Trailer')-Number(a.type==='Trailer')||Number(b.official===true)-Number(a.official===true));
 return eligible[0]||null;
}
async function getTrailer(type,id){
 if(!KEY&&!TOKEN)return null;
 for(const lang of ['ar-SA','en-US']){
  try{
   const response=await api(`/${type}/${encodeURIComponent(id)}/videos?language=${lang}`);
   const trailer=selectTrailer(response?.results);
   if(trailer)return trailer;
  }catch(e){console.warn('تعذّر جلب إعلانات TMDB',e)}
 }
 return null;
}
let modalRequest=0;
async function show(id,type){
 const request=++modalRequest;
 let x=[...state.items,...state.watchlist].find(a=>String(a.id)===String(id)&&typeOf(a)===type);
 if(!x)return;
 const modal=document.querySelector('#modal-root');
 if(!modal)return;
 modal.innerHTML='<div class="overlay" id="overlay"><div class="dialog trailer-loading" role="status">جاري تحميل التفاصيل والإعلان الرسمي...</div></div>';
 const [details,trailer]=await Promise.all([
  api(`/${type}/${encodeURIComponent(id)}`).catch(()=>null),
  getTrailer(type,id)
 ]);
 if(request!==modalRequest||!document.querySelector('#overlay'))return;
 if(details)x={...x,...details};
 const key=`${type}:${id}`,saved=state.watchlist.some(v=>`${v.media_type}:${v.id}`===key);
 modal.innerHTML=`<div class="overlay" id="overlay"><div class="dialog" role="dialog" aria-modal="true" aria-label="تفاصيل ${escapeHTML(title(x))}"><button class="close" id="close" aria-label="إغلاق">×</button><div class="dialog-img">${x.backdrop_path?`<img src="${img(x.backdrop_path,'w1280')}" alt=""/>`:''}</div><div class="dialog-body"><small>★ ${(x.vote_average||0).toFixed(1)} · ${year(x)} · ${type==='tv'?'مسلسل':'فيلم'}</small><h2>${escapeHTML(title(x))}</h2><p>${escapeHTML(x.overview||'لا يوجد وصف متاح.')}</p><div class="trailer-section"><h3>الإعلان الرسمي</h3>${trailer?`<div class="trailer-placeholder" id="trailer-placeholder"><button class="primary" id="play-trailer" type="button">▶ شاهد الإعلان الرسمي</button><span>من YouTube عبر TMDB</span></div>`:'<p class="trailer-empty">لا يتوفر إعلان رسمي لهذا العنوان حاليًا.</p>'}</div>${type==='tv'&&x.seasons?.length?`<div class="seasons"><h3>المواسم والحلقات</h3>${x.seasons.map(v=>`<div class="season"><strong>${escapeHTML(v.name)}</strong><span>${v.episode_count||0} حلقة · ${escapeHTML(v.air_date||'موعد غير محدد')}</span></div>`).join('')}</div>`:''}<div class="actions"><button class="primary" id="save">${saved?'✓ تمت الإضافة إلى قائمتي':'+ أضف إلى قائمتي'}</button><a class="secondary" target="_blank" rel="noopener noreferrer" href="https://www.themoviedb.org/${type}/${encodeURIComponent(id)}">تفاصيل TMDB ↗</a></div><p class="disclaimer">يعرض الموقع إعلانات YouTube الرسمية فقط، ولا يوفر الأفلام أو الحلقات كاملة.</p></div></div></div>`;
 const close=()=>{modalRequest++;modal.innerHTML='';document.removeEventListener('keydown',escapeClose)};
 const escapeClose=e=>{if(e.key==='Escape')close()};
 document.addEventListener('keydown',escapeClose,{once:false});
 document.querySelector('#close').onclick=close;
 document.querySelector('#overlay').onclick=e=>{if(e.target.id==='overlay')close()};
 if(trailer){document.querySelector('#play-trailer').onclick=()=>{
  const holder=document.querySelector('#trailer-placeholder');if(!holder)return;
  const iframe=document.createElement('iframe');
  iframe.src=`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0`;
  iframe.title='الإعلان الرسمي: '+title(x);
  iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
  holder.replaceWith(iframe);iframe.className='trailer-player';
 }};
 document.querySelector('#save').onclick=()=>{
  state.watchlist=saved?state.watchlist.filter(v=>`${v.media_type}:${v.id}`!==key):[...state.watchlist,saveEntry(x)];
  localStorage.setItem('cinema_watchlist_v2',JSON.stringify(state.watchlist));close();render();show(id,type);
 };
}


// CINEMA+ Explore collections — powered by TMDB discovery and watch-provider metadata.
const collectionGroups=[
 {name:'منصات البث',items:[['NETFLIX','نتفليكس','provider:8'],['prime video','أمازون برايم','provider:119'],['Apple TV+','آبل تي في','provider:350'],['Disney+','ديزني بلس','provider:337'],['Hulu','هولو','provider:15'],['Max','ماكس','provider:1899'],['Paramount+','باراماونت بلس','provider:531']]},
 {name:'التصنيفات',items:[['⚔️','أكشن','genre:28'],['👻','رعب','genre:27'],['😂','كوميديا','genre:35'],['🚀','خيال علمي','genre:878'],['🎭','دراما','genre:18'],['🕵️','جريمة','genre:80'],['🧩','غموض','genre:9648'],['🎨','أنيميشن','genre:16'],['💞','رومانسي','genre:10749']]},
];
function discoveryMarkup(){return `<section class="discovery" id="discovery">${collectionGroups.map(group=>`<div class="collection-group"><div class="collection-heading"><h3>${group.name}</h3><span>اسحب للمزيد ←</span></div><div class="collection-scroll">${group.items.map(([symbol,label,key])=>`<button type="button" class="collection-tile" data-collection="${key}"><span class="collection-symbol">${escapeHTML(symbol)}</span><span class="collection-label">${escapeHTML(label)}</span></button>`).join('')}</div></div>`).join('')}</section>`}

// CINEMA+ v7: curated, mobile-first shelves powered by TMDB. No streaming links.
const editorialShelves=[
 {id:'arabic',title:'أفلام وأعمال تلفزيونية عربية',paths:['/discover/tv?with_original_language=ar&sort_by=popularity.desc','/discover/movie?with_original_language=ar&sort_by=popularity.desc']},
 {id:'usdrama',title:'دراما أمريكية',paths:['/discover/tv?with_origin_country=US&with_genres=18&sort_by=popularity.desc']},
 {id:'drama',title:'حان وقت الدراما',paths:['/discover/tv?with_genres=18&sort_by=vote_count.desc']},
 {id:'action',title:'أفلام الأكشن والإثارة',paths:['/discover/movie?with_genres=28&sort_by=popularity.desc']},
 {id:'crime',title:'مسلسلات الجريمة والغموض',paths:['/discover/tv?with_genres=80,9648&sort_by=popularity.desc']},
 {id:'popular',title:'الأكثر مشاهدة حاليًا',paths:['/trending/all/week']},
 {id:'new',title:'أحدث الأفلام والمسلسلات',paths:['/movie/now_playing','/tv/on_the_air']}
];
let shelfData={},shelfLoaded=false,shelfLoading=false;
function editorialMarkup(){return `<div class="editorial-shelves" id="editorial-shelves">${editorialShelves.map(sh=>`<section class="editorial-shelf"><div class="shelf-head"><h2>${sh.title}</h2><button data-shelf="${sh.id}" type="button">عرض الكل ‹</button></div><div class="shelf-scroll">${(shelfData[sh.id]||[]).length?(shelfData[sh.id]||[]).slice(0,12).map(x=>`<button class="shelf-card" data-id="${x.id}" data-type="${typeOf(x)}" type="button"><img src="${img(x.poster_path,'w342')}" loading="lazy" alt="${escapeHTML(title(x))}"><span>${escapeHTML(title(x))}</span><small>${typeOf(x)==='tv'?'مسلسل':'فيلم'} · ${year(x)||''}</small></button>`).join(''):'<p class="shelf-wait">'+(shelfLoading?'جاري تحميل الأعمال...':'ستظهر الأعمال هنا عند توفر بيانات TMDB')+'</p>'}</div></section>`).join('')}</div>`}
async function fetchShelves(){if(shelfLoading||shelfLoaded||(!KEY&&!TOKEN))return;shelfLoading=true;const requests=editorialShelves.map(async sh=>{try{const responses=await Promise.all(sh.paths.map(path=>api(path)));const all=responses.flatMap(r=>r?.results||[]).filter(x=>x.poster_path);const unique=[...new Map(all.map(x=>[typeOf(x)+':'+x.id,{...x,media_type:typeOf(x)}])).values()];shelfData[sh.id]=unique.sort((a,b)=>(b.popularity||0)-(a.popularity||0)).slice(0,18)}catch(e){console.warn('Shelf load failed',sh.id,e);shelfData[sh.id]=[]}});await Promise.all(requests);shelfLoading=false;shelfLoaded=true;if(state.view==='trending')render()}
async function openShelf(id){const sh=editorialShelves.find(x=>x.id===id);if(!sh)return;state.view='collection';state.collectionLabel=sh.title;state.items=shelfData[id]||[];state.query='';state.genre='';state.year='';state.loading=false;state.page=1;state.totalPages=1;state.error=state.items.length?'':'لا توجد نتائج لهذا القسم حاليًا';render();document.querySelector('#catalog')?.scrollIntoView({behavior:'smooth'})}

async function openCollection(key){
 const request=++state.request;
 state.view='collection';state.query='';state.genre='';state.year='';state.page=1;state.loading=true;state.items=[];state.error='';
 const found=collectionGroups.flatMap(g=>g.items).find(item=>item[2]===key);
 const label=found?.[1]||'المجموعة';
 state.collectionLabel=label;
 render();document.querySelector('#catalog')?.scrollIntoView({behavior:'smooth'});
 let path='';
 if(key==='trending')path='/trending/all/week';
 else if(key==='latest-movies')path='/discover/movie?sort_by=primary_release_date.desc&vote_count.gte=10';
 else if(key==='latest-tv')path='/discover/tv?sort_by=first_air_date.desc&vote_count.gte=10';
 else if(key==='popular-movies')path='/movie/popular';
 else if(key==='popular-tv')path='/tv/popular';
 else if(key==='top-rated')path='/movie/top_rated';
 else if(key.startsWith('network:'))path='/discover/tv?with_networks='+encodeURIComponent(key.split(':')[1]);
 else if(key.startsWith('genre:'))path='/discover/movie?with_genres='+encodeURIComponent(key.split(':')[1]);
 else if(key.startsWith('provider:'))path='/discover/movie?with_watch_providers='+encodeURIComponent(key.split(':')[1])+'&watch_region=SA';
 try{const data=await api(path);if(request!==state.request)return;state.items=(data?.results||[]).filter(x=>x.media_type!=='person').map(x=>({...x,media_type:typeOf(x)}));state.totalPages=1;if(!state.items.length)state.error='لا توجد أعمال متاحة لهذا القسم حاليًا.'}
 catch(e){if(request!==state.request)return;state.error='تعذر تحميل المجموعة. تحقق من إعدادات TMDB.';console.error(e)}
 state.loading=false;render();document.querySelector('#catalog')?.scrollIntoView({behavior:'smooth'});
}

load();
fetchShelves();
