import './style.css';
import { openCinemaPlayer } from './cinema-player.js';
const KEY=import.meta.env.VITE_TMDB_API_KEY;
const TOKEN=import.meta.env.VITE_TMDB_READ_TOKEN;
const OMDB_KEY=import.meta.env.VITE_OMDB_API_KEY;
const base='https://api.themoviedb.org/3';
const playerImdbCache=new Map();
async function playerImdbId(type,id){
 const key=type+':'+id;
 if(!playerImdbCache.has(key))playerImdbCache.set(key,api('/'+type+'/'+encodeURIComponent(id)+'/external_ids').then(data=>data?.imdb_id||'').catch(()=>''));
 return playerImdbCache.get(key);
}
const img=(p,size='w500')=>p?`https://image.tmdb.org/t/p/${size}${p}`:'';
const demo=[{id:1,title:'رحلة إلى المجهول',original_title:'The Unknown Journey',overview:'مغامرة مشوقة في عالم من الأسرار والاكتشافات.',vote_average:8.6,release_date:'2025-03-10',genre_ids:[12],media_type:'movie',poster_path:null,backdrop_path:null},{id:2,title:'المدينة الأخيرة',overview:'حين تتغير المدينة، تبدأ حكاية جديدة.',vote_average:8.2,release_date:'2024-09-11',genre_ids:[18],media_type:'tv'},{id:3,title:'ما وراء النجوم',overview:'رحلة خيال علمي عبر حدود الكون.',vote_average:7.9,release_date:'2025-01-02',genre_ids:[878],media_type:'movie'},{id:4,title:'الظل',overview:'لغز يختبئ خلف كل باب.',vote_average:8.1,release_date:'2023-11-10',genre_ids:[9648],media_type:'tv'},{id:5,title:'ليلة في البحر',overview:'حكاية إنسانية عن الشجاعة والأمل.',vote_average:7.8,release_date:'2025-05-14',genre_ids:[18],media_type:'movie'},{id:6,title:'الطريق',overview:'أصدقاء يجتمعون في رحلة تغير حياتهم.',vote_average:8.0,release_date:'2024-02-22',genre_ids:[12],media_type:'movie'}];
let stored=[];
try { stored=JSON.parse(localStorage.getItem('cinema_watchlist_v2')||'[]'); if(!Array.isArray(stored))stored=[]; } catch {}
const PROGRESS_KEY='cinema_episode_progress_v1';
let episodeProgress={};
try{const data=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}');if(data&&typeof data==='object'&&!Array.isArray(data))episodeProgress=data}catch{}
const progressList=()=>Object.values(episodeProgress).filter(p=>p&&p.id&&p.season>0&&p.episode>0).sort((a,b)=>(b.updated||0)-(a.updated||0));
function rememberEpisode(item,season,episode){
 const id=Number(item.id),s=Number(season),e=Number(episode);
 if(!id||!s||!e)return;
 episodeProgress['tv:'+id]={id,media_type:'tv',title:title(item),poster_path:item.poster_path||'',backdrop_path:item.backdrop_path||'',season:s,episode:e,updated:Date.now()};
 try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(episodeProgress))}catch(err){console.warn('Progress storage unavailable',err)}
}
function continueMarkup(){
 const entries=progressList();if(!entries.length)return '';
 return `<section class="editorial-shelf continue-shelf" id="continue-watching"><div class="shelf-head"><h2>▶ أكمل المتابعة</h2><small>ارجع لآخر حلقة اخترتها</small></div><div class="shelf-scroll">${entries.map(p=>`<button type="button" class="shelf-card continue-card" data-resume="${p.id}"><span class="continue-poster">${p.poster_path?`<img src="${img(p.poster_path,'w342')}" loading="lazy" decoding="async" alt="">`:'<span class="continue-fallback">▶</span>'}<span class="continue-play">▶</span><span class="continue-progress-track"><span></span></span></span><span>${escapeHTML(p.title)}</span><small>الموسم ${p.season} · الحلقة ${p.episode}</small><span class="continue-action">متابعة ←</span></button>`).join('')}</div></section>`;
}
const WATCH_STATUS={plan:'أريد مشاهدته',watching:'أتابعه',done:'شاهدته'};
const watchStatus=x=>WATCH_STATUS[x.watch_status]?x.watch_status:'plan';
let savedFilter='all';
let state={items:[],view:'trending',query:'',selected:null,watchlist:stored,page:1,totalPages:1,loading:false,error:'',request:0,genre:'',year:'',sort:'popularity.desc',minRating:'',country:''};
const genres={28:'أكشن',12:'مغامرة',16:'أنيميشن',35:'كوميديا',80:'جريمة',99:'وثائقي',18:'دراما',10751:'عائلي',14:'فانتازيا',36:'تاريخ',27:'رعب',10402:'موسيقى',9648:'غموض',10749:'رومانسي',878:'خيال علمي',53:'إثارة',10752:'حرب',37:'غربي'};
const typeOf=x=>x.media_type||(x.first_air_date||x.name?'tv':'movie');
const saveEntry=x=>({id:x.id,media_type:typeOf(x),title:title(x),name:x.name,poster_path:x.poster_path,backdrop_path:x.backdrop_path,overview:x.overview,vote_average:x.vote_average,release_date:x.release_date,first_air_date:x.first_air_date,genre_ids:x.genre_ids});

const metadataCache=new Map();
const metadataPending=new Map();
async function api(path){
 if(!KEY&&!TOKEN)return null;
 const cached=metadataCache.get(path);
 if(cached&&Date.now()-cached.time<300000)return cached.data;
 // Reuse season lists across navigation and page reloads in this browser session.
 const seasonRequest=/^\/tv\/\d+\/season\/\d+\?/.test(path);
 const storageKey='cinema_tmdb_'+path;
 if(seasonRequest){
  try{const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');
   if(saved&&Date.now()-saved.time<30*60*1000){metadataCache.set(path,saved);return saved.data}
  }catch{}
 }
 if(metadataPending.has(path))return metadataPending.get(path);
 const request=(async()=>{
  const url=new URL(base+path);
  url.searchParams.set('language',url.searchParams.get('language')||'en-US');
  if(KEY)url.searchParams.set('api_key',KEY);
  const r=await fetch(url,{headers:TOKEN?{Authorization:`Bearer ${TOKEN}`}:{}});
  if(!r.ok)throw Error('TMDB '+r.status);
  const data=await r.json();
  if(metadataCache.size>=120)metadataCache.delete(metadataCache.keys().next().value);
  metadataCache.set(path,{time:Date.now(),data});
  if(seasonRequest){try{sessionStorage.setItem(storageKey,JSON.stringify({time:Date.now(),data}))}catch{}}
  return data;
 })();
 metadataPending.set(path,request);
 try{return await request}finally{metadataPending.delete(path)}
}
const year=x=>(x.release_date||x.first_air_date||'').slice(0,4)||'—';
const isAnime=x=>x.original_language==='ja'&&((x.genre_ids||[]).includes(16)||(x.genres||[]).some(g=>g.id===16));
const englishAnimeTitle=x=>{
 const candidates=[x.english_title,x.english_name,x.title,x.name,x.original_title,x.original_name];
 return candidates.find(v=>typeof v==='string'&&/[a-z]/i.test(v)&&!/[\u0600-\u06ff]/.test(v))||'Untitled Anime';
};
const title=x=>isAnime(x)?englishAnimeTitle(x):(x.original_title||x.original_name||x.title||x.name||'بدون عنوان');
const card=x=>`<article class="movie" data-id="${x.id}" data-type="${x.media_type|| (x.first_air_date?'tv':'movie')}"><div class="poster">${x.poster_path?`<img loading="lazy" decoding="async" src="${img(x.poster_path)}" alt=""/>`:`<div class="placeholder">🎬</div>`}<span class="rating">★ ${(x.vote_average||0).toFixed(1)}</span></div><h3>${escapeHTML(title(x))}</h3><p>${year(x)} · ${x.media_type==='tv'||x.first_air_date?'مسلسل':'فيلم'}</p></article>`;
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let renderedView=null;
function render(){const oldMain=document.querySelector('#app>main');const previousScroll=oldMain?.scrollTop??0;const previousView=renderedView;const restoreScroll=previousView===state.view;const oldSearch=document.querySelector('#search');const keepSearchFocus=document.activeElement===oldSearch;const cursor=keepSearchFocus?oldSearch.selectionStart:null;if(keepSearchFocus)oldSearch.remove();let items=state.view==='saved'?state.watchlist.filter(x=>(savedFilter==='all'||watchStatus(x)===savedFilter)).filter(x=>(!state.genre||(x.genre_ids||[]).includes(Number(state.genre)))&&(!state.year||year(x)===state.year)):state.items;items=items.filter(x=>(!state.minRating||(x.vote_average||0)>=Number(state.minRating))&&(!state.country||(x.origin_country||[]).includes(state.country)||(x.production_countries||[]).some(c=>c.iso_3166_1===state.country)));const hero=items[0]||demo[0];document.querySelector('#app').innerHTML=`<header><div class="header-brand-search"><a class="brand" href="#">CINEMA<span>+</span></a><div class="search header-search"><span>⌕</span><input id="search" type="search" placeholder="ابحث عن فيلم أو مسلسل أو أنمي..." value="${escapeHTML(state.query)}" aria-label="بحث" autocomplete="off" /></div></div><nav aria-label="التنقل الرئيسي"><div class="sidebar-brand">CINEMA<span>+</span><small>مكتبتك السينمائية</small></div><div class="sidebar-label">تصفح المحتوى</div><button data-view="trending" class="${state.view==='trending'?'active':''}">الرئيسية</button><button data-view="movie" class="${state.view==='movie'?'active':''}">أفلام</button><button data-view="tv" class="${state.view==='tv'?'active':''}">مسلسلات</button><button data-view="anime" class="${state.view==='anime'?'active':''}">أنمي</button><button data-view="saved" class="${state.view==='saved'?'active':''}">قائمتي</button></nav><button id="menu" aria-label="القائمة">☰</button></header><div class="mobile-bottom-nav" aria-label="التنقل السريع"><button data-view="trending" class="${state.view==='trending'?'active':''}"><span>⌂</span>الرئيسية</button><button data-view="movie" class="${state.view==='movie'?'active':''}"><span>▦</span>الأفلام</button><button data-view="tv" class="${state.view==='tv'?'active':''}"><span>▣</span>المسلسلات</button><button data-view="anime" class="${state.view==='anime'?'active':''}"><span>✦</span>الأنمي</button><button data-view="saved" class="${state.view==='saved'?'active':''}"><span>♡</span>قائمتي</button></div><main><section class="hero" style="${hero.backdrop_path?`background-image:linear-gradient(90deg,rgba(9,11,18,.8),rgba(9,11,18,.25)),linear-gradient(0deg,#090b12,transparent),url('${img(hero.backdrop_path,'original')}')`:''}"><div class="hero-content"><div class="eyebrow">✦ اكتشف عالم الترفيه</div><h1>قصص تستحق<br><em>المشاهدة</em></h1><p>اكتشف أحدث الأفلام والمسلسلات وتفاصيلها وتقييماتها في مكان واحد.</p><button class="primary" id="explore">استكشف الآن ←</button></div></section>${state.view==='trending'?'<div class="home-quick-filters"><button data-view="tv" type="button">المسلسلات</button><button data-view="movie" type="button">الأفلام</button><button data-view="anime" type="button">الأنمي</button><button data-view="saved" type="button">قائمتي</button></div>'+continueMarkup()+discoveryMarkup()+editorialMarkup():''}${state.view==='trending'?'':`<section class="catalog" id="catalog"><div class="section-head"><div><small>مكتبتك السينمائية</small><h2>${({trending:'الأكثر رواجًا',movie:'أحدث الأفلام',tv:'المسلسلات الرائجة',anime:'عالم الأنمي',saved:'قائمتي المفضلة',search:'نتائج البحث',collection:state.collectionLabel||'المجموعة'})[state.view]}</h2></div></div>${state.error?`<p class="notice">${escapeHTML(state.error)}</p>`:''}${state.view==='saved'?`<div class="watch-filters"><button data-watch-filter="all" class="${savedFilter==='all'?'active':''}">الكل</button>${Object.entries(WATCH_STATUS).map(([k,v])=>`<button data-watch-filter="${k}" class="${savedFilter===k?'active':''}">${v}</button>`).join('')}</div>`:''}<div class="filters"><label>التصنيف <select id="genre"><option value="">الكل</option>${Object.entries(genres).map(([id,label])=>`<option value="${id}" ${state.genre===id?'selected':''}>${label}</option>`).join('')}</select></label><label>السنة <select id="year"><option value="">كل السنوات</option>${Array.from({length:25},(_,i)=>String(new Date().getFullYear()-i)).map(y=>`<option value="${y}" ${state.year===y?'selected':''}>${y}</option>`).join('')}</select></label><label>الترتيب <select id="sort"><option value="popularity.desc" ${state.sort==='popularity.desc'?'selected':''}>الأكثر شعبية</option><option value="vote_average.desc" ${state.sort==='vote_average.desc'?'selected':''}>الأعلى تقييمًا</option><option value="primary_release_date.desc" ${state.sort==='primary_release_date.desc'?'selected':''}>الأحدث</option></select></label><label>التقييم <select id="minRating"><option value="">الكل</option>${[5,6,7,8,9].map(v=>`<option value="${v}" ${String(state.minRating)===String(v)?'selected':''}>${v}+ ★</option>`).join('')}</select></label><label>الدولة <select id="country"><option value="">كل الدول</option>${[['SA','السعودية'],['KW','الكويت'],['AE','الإمارات'],['US','الولايات المتحدة'],['JP','اليابان'],['KR','كوريا']].map(([v,n])=>`<option value="${v}" ${state.country===v?'selected':''}>${n}</option>`).join('')}</select></label></div><div class="grid">${items.length?items.map(card).join(''):state.loading?'<p class="empty">جاري تحميل النتائج...</p>':'<p class="empty">لا توجد نتائج حاليًا.</p>'}</div>${!state.loading&&state.view!=='saved'&&state.page<state.totalPages?'<div class="auto-more" id="more" role="status" aria-live="polite">اسحب للأسفل لتحميل المزيد...</div>':''}</section>`}</main><footer>© ${new Date().getFullYear()} CINEMA+ · بيانات الأفلام مقدمة من TMDB · هذا الموقع غير تابع لـ TMDB</footer><div id="modal-root"></div>`;document.body.querySelector(":scope > #modal-root")?.remove();document.body.appendChild(document.querySelector("#app #modal-root"));renderedView=state.view;if(restoreScroll){const newMain=document.querySelector("#app>main");if(newMain)newMain.scrollTop=previousScroll;}if(keepSearchFocus){const replacement=document.querySelector('#search');replacement?.replaceWith(oldSearch);oldSearch.value=state.query;oldSearch.focus({preventScroll:true});if(cursor!==null)oldSearch.setSelectionRange(cursor,cursor);}bind();}
function bind(){document.querySelectorAll('[data-resume]').forEach(el=>el.onclick=async()=>{const p=episodeProgress['tv:'+el.dataset.resume];if(!p)return;const item={...p,name:p.title,first_air_date:'',media_type:'tv'};if(!state.items.some(x=>String(x.id)===String(p.id)&&typeOf(x)==='tv'))state.items.push(item);await show(p.id,'tv');const picker=document.querySelector('#season-picker');if(picker){picker.value=String(p.season);picker.dispatchEvent(new Event('change'));document.querySelector('.seasons')?.scrollIntoView({behavior:'smooth',block:'start'});}});document.querySelectorAll("[data-watch-filter]").forEach(b=>b.onclick=()=>{savedFilter=b.dataset.watchFilter;render()});document.querySelectorAll(".shelf-card:not([data-resume])").forEach(el=>el.onclick=()=>show(el.dataset.id,el.dataset.type));document.querySelectorAll("[data-shelf]").forEach(el=>el.onclick=()=>openShelf(el.dataset.shelf));document.querySelectorAll("[data-collection]").forEach(el=>el.onclick=()=>openCollection(el.dataset.collection));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>load(b.dataset.view));document.querySelector('#explore').onclick=()=>document.querySelector('#editorial-shelves')?.scrollIntoView({behavior:'smooth'});document.querySelector('#search').oninput=e=>{const q=e.target.value;state.query=q;clearTimeout(window.searchTimer);window.searchTimer=setTimeout(()=>{if(q.trim())load('search',q);else load('trending')},450)};document.querySelectorAll('.movie').forEach(el=>el.onclick=()=>show(el.dataset.id,el.dataset.type));document.querySelector('#menu').onclick=()=>document.querySelector('nav').classList.toggle('open');document.querySelectorAll('#genre,#year,#sort,#minRating,#country').forEach(el=>el.onchange=e=>{state[e.target.id]=e.target.value;if(['minRating','country'].includes(e.target.id)){render();return;}load(state.view==='collection'?'trending':state.view,state.query)});const more=document.querySelector('#more');if(more){more.onclick=()=>triggerAutoMore();setupAutoMore(more)}}
async function load(view='trending',q='',append=false){
 const request=++state.request;
 if(!append){activeShelf=null;state.view=view;state.query=q;state.page=1;state.items=[];}
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
   // Anime includes both Japanese animation TV series and movies, page by page.
   // Use TMDB identifiers and media types to avoid duplicates.
   if(view==='anime'){
     const sort=state.sort==='primary_release_date.desc'?'popularity.desc':state.sort;
     const query=new URLSearchParams({with_original_language:'ja',with_genres:'16',sort_by:sort,page:String(state.page)});
     if(state.sort==='vote_average.desc')query.set('vote_count.gte','50');
     const [tv,movies]=await Promise.all([
       api('/discover/tv?'+query.toString()),
       api('/discover/movie?'+query.toString())
     ]);
     if(request!==state.request)return;
     const combined=[...(tv?.results||[]).map(x=>({...x,media_type:'tv'})),...(movies?.results||[]).map(x=>({...x,media_type:'movie'}))];
     const filtered=combined.filter(x=>(!state.genre||(x.genre_ids||[]).includes(Number(state.genre)))&&(!state.year||year(x)===state.year));
     filtered.sort((a,b)=>(state.sort==='vote_average.desc'?(b.vote_average||0)-(a.vote_average||0):(b.popularity||0)-(a.popularity||0)));
     const seen=new Set(append?state.items.map(x=>typeOf(x)+':'+x.id):[]);
     const fresh=filtered.filter(x=>{const k=typeOf(x)+':'+x.id;if(seen.has(k))return false;seen.add(k);return true});
     state.items=append?[...state.items,...fresh]:fresh;
     state.totalPages=Math.min(Math.max(tv?.total_pages||1,movies?.total_pages||1),500);
     state.loading=false;render();return;
   }
   const data=await api(path+(path.includes('?')?'&':'?')+'page='+state.page);
   if(request!==state.request)return;
   let results=(data?.results||[]).filter(x=>x.media_type!=='person');
   if(view==='trending'||view==='search')results=results.filter(x=>(!state.genre||(x.genre_ids||[]).includes(Number(state.genre)))&&(!state.year||year(x)===state.year));
   if((view==='trending'||view==='search')&&state.sort==='vote_average.desc')results.sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
   state.items=append?[...state.items,...results.filter(x=>!state.items.some(y=>y.id===x.id&&typeOf(y)===typeOf(x)))]:results;
   state.totalPages=Math.min(data?.total_pages||1,500);
 }catch(e){
   if(request!==state.request)return;
   state.error='تعذّر الاتصال بـ TMDB. تحقق من المفتاح والاتصال بالإنترنت.';
   if(!append)state.items=[];
   if(append)state.page=Math.max(1,state.page-1);
   console.error(e);
 }
 state.loading=false;render();
}

// Optional public metadata enrichment. No Wikipedia/Wikidata and no playback links.
// Anime metadata and translation are best-effort; never associate titles without an exact match.
const animeCache=new Map();
const normalizedAnimeTitle=t=>String(t||'').toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]/g,'');
async function animeMetadata(item){
 const key=item.id;
 if(animeCache.has(key))return animeCache.get(key);
 const result={};
 const names=[item.original_name,item.name,item.english_name,item.english_title].filter(Boolean);
 const normalized=names.map(normalizedAnimeTitle).filter(Boolean);
 if(normalized.includes('onepiece')||normalized.includes('ワンピース')){result.anilistId=21;animeCache.set(key,result);return result}
 if(normalized.includes('bleach')&&!normalized.some(n=>n.includes('thousandyearbloodwar')||n.includes('sennenkessenhen'))){result.anilistId=269;animeCache.set(key,result);return result}
 const year=Number(String(item.first_air_date||item.release_date||'').slice(0,4));
 const modern=year>=2020;
 const query='query($search:String){Page(page:1,perPage:12){media(search:$search,type:ANIME){id idMal description(asHtml:false) startDate{year} title{romaji english native} synonyms}}}';
 const searches=[...new Set(names)].filter(Boolean).slice(0,modern?4:1);
 let best=null,bestScore=-1;
 try{
  for(const search of searches){
   const r=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,variables:{search}})});
   if(!r.ok)continue;
   const data=await r.json();
   for(const m of data.data?.Page?.media||[]){
    const aliases=[m.title?.romaji,m.title?.english,m.title?.native,...(m.synonyms||[])].map(normalizedAnimeTitle).filter(Boolean);
    const exact=aliases.some(n=>normalized.includes(n));
    if(!exact)continue;
    const delta=year&&m.startDate?.year?Math.abs(year-m.startDate.year):null;
    // Modern titles often have separate AniList entries for sequels; avoid mixing distant releases.
    if(modern&&delta!==null&&delta>2)continue;
    const score=100+(delta===null?0:Math.max(0,12-delta*5))+(aliases.includes(normalizedAnimeTitle(item.original_name))?4:0);
    if(score>bestScore){best=m;bestScore=score}
   }
   if(best&&(!modern||bestScore>=112))break;
  }
  if(best){
   result.anilistId=best.id;
   result.description=best.description?.replace(/<[^>]*>/g,' ').trim()||'';
   // Episode playback must not wait for Jikan, which may be slow or rate-limited.
  }
 }catch(e){console.info('Anime metadata unavailable',e)}
 animeCache.set(key,result);return result;
}
const translationCache=new Map();
async function arabicDescription(text){
 text=String(text||'').trim();
 if(!text||/[\u0600-\u06ff]/.test(text))return text;
 if(translationCache.has(text))return translationCache.get(text);
 // Public MyMemory translation has length/rate limits; keep the original on failure.
 let translated=text;
 try{
  const chunks=text.match(/[\s\S]{1,450}/g)||[];
  if(chunks.length>4)return text;
  const out=[];
  for(const chunk of chunks){
   const u=new URL('https://api.mymemory.translated.net/get');
   u.searchParams.set('q',chunk);u.searchParams.set('langpair','en|ar');
   const r=await fetch(u);
   if(!r.ok)throw Error('translation unavailable');
   const d=await r.json(),value=d.responseData?.translatedText;
   if(d.responseStatus!==200||!value||!/[\u0600-\u06ff]/.test(value))throw Error('translation missing');
   out.push(value);
  }
  translated=out.join(' ');
 }catch(e){console.info('Arabic translation unavailable',e)}
 translationCache.set(text,translated);return translated;
}

async function enrichDetails(type,id,item){
 const parts=[];
 try{
  const ids=await api(`/${type}/${id}/external_ids`);
  if(OMDB_KEY&&ids?.imdb_id){
   const r=await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(OMDB_KEY)}&i=${encodeURIComponent(ids.imdb_id)}`);
   if(r.ok){const d=await r.json();if(d.Response==='True'&&d.imdbRating&&d.imdbRating!=='N/A')parts.push(`تقييم IMDb: ${escapeHTML(d.imdbRating)}/10`)}
  }
  if(type==='tv'&&ids?.tvdb_id){
   // TVmaze uses TVDB IDs to avoid inaccurate title-only matching.
   const r=await fetch(`https://api.tvmaze.com/lookup/shows?thetvdb=${encodeURIComponent(ids.tvdb_id)}`);
   if(r.ok){const d=await r.json();if(d.status)parts.push(`حالة المسلسل: ${escapeHTML(d.status)}`);if(d.network?.name)parts.push(`الشبكة: ${escapeHTML(d.network.name)}`)}
  }
 }catch(e){console.info('Additional metadata unavailable',e)}
 if(type==='tv'&&item.original_language==='ja'){
  try{
   const query='query ($search:String){Media(search:$search,type:ANIME){title{romaji english native}episodes status studios{nodes{name}}}}';
   const r=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables:{search:item.original_name||item.name}})});
   if(r.ok){const a=(await r.json()).data?.Media;
    // Only add data for a close title match to prevent misattribution.
    const norm=t=>String(t||'').toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]/g,'');
    const target=norm(item.original_name||item.name);
    if(a&&target&&[a.title?.romaji,a.title?.english,a.title?.native].some(t=>norm(t)===target)){
     if(a.episodes)parts.push(`حلقات الأنمي: ${a.episodes}`);
     if(a.studios?.nodes?.length)parts.push(`الاستوديو: ${escapeHTML(a.studios.nodes.map(n=>n.name).slice(0,2).join('، '))}`);
    }
   }
  }catch(e){console.info('AniList unavailable',e)}
 }
 return {html:parts.length?`<div class="metadata-extra"><h3>معلومات إضافية</h3><p>${parts.join(' · ')}</p></div>`:''};
}

// Verified third-party description fallback. Never use a title-only guess for TVmaze.
async function fallbackSynopsis(type,id,item){
 let ids;
 try{ids=await api(`/${type}/${encodeURIComponent(id)}/external_ids`)}catch{return ''}
 if(OMDB_KEY&&ids?.imdb_id){
  try{
   const url=new URL('https://www.omdbapi.com/');
   url.searchParams.set('apikey',OMDB_KEY);
   url.searchParams.set('i',ids.imdb_id);
   url.searchParams.set('plot','full');
   const response=await fetch(url);
   if(response.ok){
    const data=await response.json();
    if(data.Response==='True'&&data.Plot&&data.Plot!=='N/A')return data.Plot.trim();
   }
  }catch(e){console.info('OMDb description unavailable',e)}
 }
 if(type==='tv'&&ids?.tvdb_id){
  try{
   const response=await fetch('https://api.tvmaze.com/lookup/shows?thetvdb='+encodeURIComponent(ids.tvdb_id));
   if(response.ok){
    const data=await response.json();
    if(data.summary){
     const plain=data.summary.replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').trim();
     if(plain)return plain;
    }
   }
  }catch(e){console.info('TVmaze description unavailable',e)}
 }
 return '';
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
 let x=[...state.items,...Object.values(shelfData).flat(),...state.watchlist].find(a=>String(a.id)===String(id)&&typeOf(a)===type);
 if(!x)return;
 const modal=document.querySelector('#modal-root');
 if(!modal)return;
 modal.innerHTML='<div class="overlay" id="overlay"><div class="dialog trailer-loading" role="status">جاري تحميل التفاصيل...</div></div>';
 // Load the primary details and English title concurrently; trailer discovery must not block the dialog.
 const listingEnglishTitle=isAnime(x)?englishAnimeTitle(x):'';
 const [details,englishDisplay]=await Promise.all([
  api(`/${type}/${encodeURIComponent(id)}?language=ar-SA`).catch(()=>null),
  isAnime(x)?api(`/${type}/${encodeURIComponent(id)}?language=en-US`).catch(()=>null):Promise.resolve(null)
 ]);
 const trailer=null;
 if(request!==modalRequest||!document.querySelector('#overlay'))return;
 if(details)x={...x,...details};
 if(isAnime(x)){
  const englishName=englishDisplay?.name||englishDisplay?.title||listingEnglishTitle;
  x.english_name=englishName;
  x.english_title=englishName;
 }
 // Prefer the officially published original-language title, including Arabic Gulf/Saudi titles.
 if(x.original_title&&type==='movie')x.title=x.original_title;
 if(x.original_name&&type==='tv')x.name=x.original_name;
 // Keep English display titles and English-language poster art, while retaining Arabic details.
 if(englishDisplay){
  if(isAnime(x)){x.english_title=englishDisplay.title||'';x.english_name=englishDisplay.name||'';}
  x={...x,
   title:type==='movie'?(x.original_title||englishDisplay.original_title||englishDisplay.title||x.title):x.title,
   name:type==='tv'?(x.original_name||englishDisplay.original_name||englishDisplay.name||x.name):x.name,
   poster_path:x.poster_path||englishDisplay.poster_path,
   backdrop_path:x.backdrop_path||englishDisplay.backdrop_path
  };
 }
 // Keep details responsive: external synopsis enrichment/translation is not on the critical path.
 if(!String(x.overview||'').trim())x.overview=englishDisplay?.overview||'';
 if(request!==modalRequest)return;
 const key=`${type}:${id}`,existing=state.watchlist.find(v=>`${v.media_type}:${v.id}`===key),saved=!!existing;
 const genresText=(x.genres||[]).map(g=>escapeHTML(g.name)).join(' · ');
 const runtime=type==='movie'&&x.runtime?`${x.runtime} دقيقة`:type==='tv'&&x.number_of_seasons?`${x.number_of_seasons} موسم`:'';
 const resume=type==='tv'?episodeProgress['tv:'+id]:null;
 const seasons=type==='tv'?(x.seasons||[]).filter(v=>v.season_number>0):[];
 const director=null;
 modal.innerHTML=`<div class="overlay" id="overlay"><div class="dialog cinematic-dialog ${type==='tv'?'series-landscape-dialog':''}" role="dialog" aria-modal="true" aria-label="تفاصيل ${escapeHTML(title(x))}"><button class="close" id="close" aria-label="إغلاق">×</button><div class="cinematic-backdrop" ${x.backdrop_path?`style="background-image:linear-gradient(0deg,#121520 1%,transparent 90%),linear-gradient(90deg,#121520cc,transparent),url('${img(x.backdrop_path,'w1280')}')"`:''}></div><div class="cinematic-intro"><div class="cinematic-poster">${x.poster_path?`<img src="${img(x.poster_path,'w342')}" alt="ملصق ${escapeHTML(title(x))}" loading="lazy" decoding="async">`:''}</div><div class="cinematic-summary"><span class="cinematic-eyebrow">CINEMA+ · ${type==='tv'?'مسلسل':'فيلم'}</span><h2>${escapeHTML(title(x))}</h2>${x.tagline?`<p class="cinematic-tagline">${escapeHTML(x.tagline)}</p>`:''}<div class="cinematic-meta"><span>★ ${(x.vote_average||0).toFixed(1)}</span><span>${year(x)||'—'}</span>${runtime?`<span>${runtime}</span>`:''}</div>${genresText?`<div class="cinematic-genres">${genresText}</div>`:''}<p class="cinematic-overview">${escapeHTML(x.overview||'لا يوجد وصف متاح لهذا العمل.')}</p>${director?`<p class="cinematic-credit">إخراج: ${escapeHTML(director.name)}</p>`:''}<div class="actions">${type==='movie'?'<button class="primary" id="open-movie-player" type="button">▶ مشاهدة الفيلم</button>':seasons.length?'<button class="primary" id="resume-series" type="button">▶ '+(resume?'أكمل المتابعة · م'+resume.season+' ح'+resume.episode:'ابدأ المشاهدة')+'</button>':''}<button class="primary" id="save">${saved?'✓ تمت الإضافة إلى قائمتي':'+ أضف إلى قائمتي'}</button><label class="watch-status-label">حالة المتابعة <select id="watch-status"><option value="none" ${!saved?'selected':''}>غير محفوظ</option>${Object.entries(WATCH_STATUS).map(([k,v])=>`<option value="${k}" ${saved&&watchStatus(existing)===k?'selected':''}>${v}</option>`).join('')}</select></label><a class="secondary" target="_blank" rel="noopener noreferrer" href="https://www.themoviedb.org/${type}/${encodeURIComponent(id)}">تفاصيل TMDB ↗</a></div></div></div><div class="cinematic-sections"><section class="cinematic-section trailer-section"><h3>الإعلان الرسمي</h3>${trailer?`<div class="trailer-placeholder" id="trailer-placeholder"><button class="primary" id="play-trailer" type="button">▶ شاهد الإعلان الرسمي</button><span>من YouTube عبر TMDB</span></div>`:'<p class="trailer-empty">لا يتوفر إعلان رسمي لهذا العنوان حاليًا.</p>'}</section>${type==='tv'&&x.seasons?.length?`<section class="cinematic-section seasons netflix-seasons"><div class="netflix-episodes-head"><div><small>استكشف الحلقات</small><h3>الحلقات</h3></div><label class="netflix-season-picker">الموسم <select id="season-picker">${seasons.map(v=>`<option value="${v.season_number}">${'الموسم '+v.season_number} · ${v.episode_count||0} حلقة</option>`).join('')}</select></label></div><div id="episode-results" aria-live="polite"></div></section>`:''}<p class="disclaimer">الموقع يعرض معلومات الأعمال وإعلاناتها الرسمية فقط، ولا يوفر حلقات أو أفلامًا كاملة.</p></div></div></div>`;

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
 const seasonPicker=document.querySelector('#season-picker');
 let seasonRequest=0;
 async function loadEpisodes(season){
  const currentSeasonRequest=++seasonRequest;
  const target=document.querySelector('#episode-results');if(!target)return;
  season=String(season);
  target.innerHTML='<p class="trailer-empty">جاري تحميل الحلقات...</p>';
  try{const data=await api(`/tv/${encodeURIComponent(id)}/season/${encodeURIComponent(season)}?language=ar-SA`);
   // Show the episode list immediately after TMDB responds. Enrichment must not block navigation.
   // Optional descriptions and translations can be fetched separately in future.
   if(request!==modalRequest||currentSeasonRequest!==seasonRequest||!target.isConnected)return;
   const allEpisodes=data?.episodes||[];
   const episodeGrid=document.createElement('div');
   episodeGrid.className='episode-grid';
   target.replaceChildren(episodeGrid);
   if(!allEpisodes.length){target.innerHTML='<p class="trailer-empty">لا تتوفر تفاصيل الحلقات حاليًا.</p>';return}
   // Only create the first 30 cards initially; append more on demand.
   let rendered=0;
   const appendEpisodes=()=>{
    if(request!==modalRequest||currentSeasonRequest!==seasonRequest||!episodeGrid.isConnected)return;
    const batch=allEpisodes.slice(rendered,rendered+30);
    if(!batch.length)return;
    episodeGrid.insertAdjacentHTML('beforeend',batch.map(ep=>`<button type="button" class="episode-card ${episodeProgress['tv:'+id]?.season===Number(season)&&episodeProgress['tv:'+id]?.episode===ep.episode_number?'episode-current':''}" data-episode="${ep.episode_number}"><span class="episode-thumbnail">${ep.still_path?`<img src="${img(ep.still_path,'w300')}" loading="lazy" decoding="async" alt="">`:'<span class="episode-thumbnail-fallback">▶</span>'}<span class="episode-play-icon">▶</span></span><div class="episode-copy"><strong>الحلقة ${ep.episode_number}</strong><span>${escapeHTML(/^episode\\s*\\d+$/i.test(ep.name||'')?'الحلقة '+ep.episode_number:(ep.name||'الحلقة '+ep.episode_number))}</span>${ep.runtime?`<small>${ep.runtime} دقيقة</small>`:''}</div></button>`).join(''));
    rendered+=batch.length;
    episodeGrid.querySelectorAll('[data-episode]:not([data-bound])').forEach(el=>{
     el.dataset.bound='1';
     el.onclick=async()=>{rememberEpisode(x,season,el.dataset.episode);const anime=isAnime(x);const [imdbId,metadata]=await Promise.all([anime?Promise.resolve(''):playerImdbId('tv',id),anime?animeMetadata(x):Promise.resolve({})]);openCinemaPlayer({type:'tv',id,imdbId,isAnime:anime,anilistId:metadata.anilistId||0,title:title(x),season:Number(season),episode:Number(el.dataset.episode),poster_path:x.backdrop_path||x.poster_path,episodes:allEpisodes.map(ep=>({number:ep.episode_number,name:ep.name,still_path:ep.still_path})),seasons:seasons.map(v=>({number:v.season_number,name:'الموسم '+v.season_number})),loadSeasonEpisodes:async(nextSeason)=>{const seasonData=await api(`/tv/${encodeURIComponent(id)}/season/${encodeURIComponent(nextSeason)}?language=ar-SA`);return(seasonData?.episodes||[]).map(ep=>({number:ep.episode_number,name:ep.name,still_path:ep.still_path}))}});};
    });
    if(rendered<allEpisodes.length){
     moreEpisodes.textContent='عرض المزيد من الحلقات ('+(allEpisodes.length-rendered)+')';
     episodeGrid.after(moreEpisodes);
    }else moreEpisodes.remove();
   };
   const moreEpisodes=document.createElement('button');
   moreEpisodes.type='button';moreEpisodes.className='episode-load-more';
   moreEpisodes.style.cssText='display:block;margin:16px auto;padding:12px 24px;border-radius:10px';
   moreEpisodes.onclick=appendEpisodes;
   appendEpisodes();

  }catch{if(currentSeasonRequest===seasonRequest&&target.isConnected)target.innerHTML='<p class="trailer-empty">تعذر تحميل الحلقات، حاول مرة أخرى.</p>'}
 }
 if(seasonPicker){seasonPicker.onchange=()=>loadEpisodes(seasonPicker.value);const initial=seasons.some(v=>v.season_number===resume?.season)?resume.season:seasons[0]?.season_number;if(initial){seasonPicker.value=String(initial);loadEpisodes(initial)}}
 document.querySelector('#resume-series')?.addEventListener('click',async()=>{if(!seasonPicker)return;const season=seasons.some(v=>v.season_number===resume?.season)?resume.season:seasons[0]?.season_number;seasonPicker.value=String(season);await loadEpisodes(season);const ep=document.querySelector('[data-episode="'+(resume?.episode||1)+'"]')||document.querySelector('[data-episode]');ep?.click();});
 document.querySelectorAll('[data-person]').forEach(el=>{el.onclick=()=>showPerson(el.dataset.person);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showPerson(el.dataset.person)}}});
 document.querySelectorAll('[data-related]').forEach(button=>button.onclick=()=>{
  const related=similar.find(v=>String(v.id)===button.dataset.related);
  if(related){state.items=[...state.items,{...related,media_type:type}];show(related.id,type)}
 });
 const setWatchStatus=status=>{
  state.watchlist=state.watchlist.filter(v=>`${v.media_type}:${v.id}`!==key);
  if(status!=='none')state.watchlist.push({...saveEntry(x),watch_status:status});
  try{localStorage.setItem('cinema_watchlist_v2',JSON.stringify(state.watchlist))}catch(e){console.warn('Unable to save watchlist',e)}
  close();render();show(id,type);
 };
 if(type==='movie'){document.querySelector('#open-movie-player').onclick=async()=>openCinemaPlayer({type:'movie',id,imdbId:await playerImdbId('movie',id),anilistId:isAnime(x)?(await animeMetadata(x)).anilistId:0,title:title(x),poster_path:x.backdrop_path||x.poster_path});}
 document.querySelector('#save').onclick=()=>setWatchStatus(saved?'none':'plan');
 document.querySelector('#watch-status').onchange=e=>setWatchStatus(e.target.value);
}


// CINEMA+ v18 — actor profiles with TMDB credits; no Wikipedia sources.
async function showPerson(id){
 const modal=document.querySelector('#modal-root');if(!modal)return;
 const ticket=++modalRequest;
 modal.innerHTML='<div class="overlay" id="overlay"><div class="dialog trailer-loading">جاري تحميل صفحة الممثل...</div></div>';
 try{
  const [person,credits]=await Promise.all([api(`/person/${encodeURIComponent(id)}`),api(`/person/${encodeURIComponent(id)}/combined_credits`)]);
  if(ticket!==modalRequest)return;
  if(!person)throw Error('missing person');
  const works=(credits?.cast||[]).filter(x=>x.poster_path&&(x.media_type==='tv'||x.media_type==='movie')).sort((a,b)=>(b.popularity||0)-(a.popularity||0)).slice(0,36);
  modal.innerHTML=`<div class="overlay" id="overlay"><div class="dialog cinematic-dialog actor-dialog" role="dialog" aria-modal="true" aria-label="${escapeHTML(person.name)}"><button class="close" id="close" aria-label="إغلاق">×</button><div class="actor-header">${person.profile_path?`<img src="${img(person.profile_path,'w342')}" alt="${escapeHTML(person.name)}">`:''}<div><small>ملف الممثل · TMDB</small><h2>${escapeHTML(person.name)}</h2>${person.place_of_birth?`<p>${escapeHTML(person.place_of_birth)}</p>`:''}${person.birthday?`<p>تاريخ الميلاد: ${escapeHTML(person.birthday)}</p>`:''}<p class="actor-bio">${escapeHTML(person.biography||'لا تتوفر سيرة ذاتية حاليًا.')}</p></div></div><section class="cinematic-section actor-works"><h3>أعمال شارك فيها</h3><div class="grid">${works.map(card).join('')||'<p>لا توجد أعمال متاحة.</p>'}</div></section></div></div>`;
  const close=()=>{modalRequest++;modal.innerHTML=''};
  modal.querySelector('#close').onclick=close;
  modal.querySelector('#overlay').onclick=e=>{if(e.target.id==='overlay')close()};
  modal.querySelectorAll('.movie').forEach(el=>el.onclick=()=>{const item=works.find(x=>String(x.id)===el.dataset.id&&x.media_type===el.dataset.type);if(item){state.items.push(item);show(item.id,item.media_type)}});
 }catch(e){if(ticket===modalRequest)modal.innerHTML='<div class="overlay" id="overlay"><div class="dialog trailer-loading"><button id="close">×</button><p>تعذر تحميل معلومات الممثل.</p></div></div>',modal.querySelector('#close').onclick=()=>modal.innerHTML='';}
}

// CINEMA+ Explore collections — powered by TMDB discovery and watch-provider metadata.
const collectionGroups=[
 {name:'منصات البث',items:[['NETFLIX','نتفليكس','provider:8'],['prime video','أمازون برايم','provider:119'],['Apple TV+','آبل تي في','provider:350'],['Disney+','ديزني بلس','provider:337'],['Hulu','هولو','provider:15'],['Max','ماكس','provider:1899'],['Paramount+','باراماونت بلس','provider:531']]},
 {name:'التصنيفات',items:[['⚔️','أكشن','genre:28'],['👻','رعب','genre:27'],['😂','كوميديا','genre:35'],['🚀','خيال علمي','genre:878'],['🎭','دراما','genre:18'],['🕵️','جريمة','genre:80'],['🧩','غموض','genre:9648'],['🎨','أنيميشن','genre:16'],['💞','رومانسي','genre:10749']]},
];
function discoveryMarkup(){return `<section class="discovery" id="discovery">${collectionGroups.map(group=>`<div class="collection-group"><div class="collection-heading"><h3>${group.name}</h3><span>اسحب للمزيد ←</span></div><div class="collection-scroll">${group.items.map(([symbol,label,key])=>`<button type="button" class="collection-tile" data-collection="${key}"><span class="collection-symbol">${escapeHTML(symbol)}</span><span class="collection-label">${escapeHTML(label)}</span></button>`).join('')}</div></div>`).join('')}</section>`}

// CINEMA+ v7: curated, mobile-first shelves powered by TMDB. No streaming links.
const editorialShelves=[
 {id:'saudi',title:'أعمال سعودية',paths:['/discover/tv?with_origin_country=SA&sort_by=popularity.desc','/discover/movie?with_origin_country=SA&sort_by=popularity.desc']},
 {id:'gulf',title:'دراما خليجية',paths:['/discover/tv?with_origin_country=KW|AE|BH|QA|OM&with_genres=18&sort_by=popularity.desc','/discover/movie?with_origin_country=KW|AE|BH|QA|OM&with_genres=18&sort_by=popularity.desc']},
 {id:'anime',title:'عالم الأنمي',paths:['/discover/tv?with_original_language=ja&with_genres=16&sort_by=popularity.desc','/discover/movie?with_original_language=ja&with_genres=16&sort_by=popularity.desc']},
 {id:'usdrama',title:'دراما أمريكية',paths:['/discover/tv?with_origin_country=US&with_genres=18&sort_by=popularity.desc','/discover/movie?with_origin_country=US&with_genres=18&sort_by=popularity.desc']},
 {id:'action',title:'أكشن وإثارة',paths:['/discover/movie?with_genres=28,53&sort_by=popularity.desc','/discover/tv?with_genres=10759&sort_by=popularity.desc']},
 {id:'crime',title:'جريمة وغموض',paths:['/discover/tv?with_genres=80|9648&sort_by=popularity.desc','/discover/movie?with_genres=80|9648&sort_by=popularity.desc']}
];
let shelfData={},shelfLoaded=false,shelfLoading=false;
function editorialMarkup(){return `<div class="editorial-shelves" id="editorial-shelves">${editorialShelves.map(sh=>`<section class="editorial-shelf"><div class="shelf-head"><h2>${sh.title}</h2><button data-shelf="${sh.id}" type="button">عرض الكل ‹</button></div><div class="shelf-scroll">${(shelfData[sh.id]||[]).length?(shelfData[sh.id]||[]).slice(0,10).map(x=>`<button class="shelf-card" data-id="${x.id}" data-type="${typeOf(x)}" type="button"><img src="${img(x.poster_path,'w342')}" loading="lazy" decoding="async" alt="${escapeHTML(title(x))}"><span>${escapeHTML(title(x))}</span><small>${typeOf(x)==='tv'?'مسلسل':'فيلم'} · ${year(x)||''}</small></button>`).join(''):'<p class="shelf-wait">'+(shelfLoading?'جاري تحميل الأعمال...':'ستظهر الأعمال هنا عند توفر بيانات TMDB')+'</p>'}</div></section>`).join('')}</div>`}
async function fetchShelves(){
 if(shelfLoading||shelfLoaded||(!KEY&&!TOKEN))return;
 shelfLoading=true;
 await Promise.all(editorialShelves.map(async sh=>{
  try{
   const pages=await Promise.all(sh.paths.map(path=>api(path)));
   const items=pages.flatMap(r=>r?.results||[]).filter(x=>x.poster_path).map(x=>({...x,media_type:typeOf(x)}));
   shelfData[sh.id]=[...new Map(items.map(x=>[x.media_type+':'+x.id,x])).values()].sort((a,b)=>(b.popularity||0)-(a.popularity||0));
  }catch(e){console.warn('Shelf load failed',sh.id,e);shelfData[sh.id]=[]}
 }));
 shelfLoading=false;shelfLoaded=true;if(state.view==='trending')render();
}
let activeShelf=null,shelfPages={},shelfMaxPages={},shelfExhausted=false,shelfBusy=false;
// Automatically load the next page when the visitor approaches the end of the catalog.
let autoMoreObserver=null;
let autoMorePending=false;
function triggerAutoMore(){
 if(autoMorePending||state.loading)return;
 if(state.view==='collection'&&(activeShelf?shelfBusy||shelfExhausted:state.page>=state.totalPages))return;
 if(state.view!=='collection'&&state.page>=state.totalPages)return;
 autoMorePending=true;
 const work=state.view==='collection'?(activeShelf?loadShelfMore():loadCollectionMore()):load(state.view,state.view==='search'?state.query:'',true);
 Promise.resolve(work).finally(()=>{autoMorePending=false;});
}
function setupAutoMore(target){
 if(autoMoreObserver){autoMoreObserver.disconnect();autoMoreObserver=null;}
 if(!('IntersectionObserver' in window)){target.textContent='اضغط لتحميل المزيد';target.style.cursor='pointer';return;}
 autoMoreObserver=new IntersectionObserver(entries=>{
  if(entries.some(entry=>entry.isIntersecting))triggerAutoMore();
 },{rootMargin:'0px 0px 500px 0px',threshold:0});
 autoMoreObserver.observe(target);
}
async function openShelf(id){
 const sh=editorialShelves.find(x=>x.id===id);if(!sh)return;
 ++state.request;activeShelf=id;shelfPages={};shelfMaxPages={};shelfExhausted=false;shelfBusy=false;
 state.view='collection';state.collectionLabel=sh.title;state.items=[...(shelfData[id]||[])];
 state.query='';state.genre='';state.year='';state.loading=false;state.page=1;
 state.totalPages=2;state.error='';render();
 document.querySelector('#catalog')?.scrollIntoView({behavior:'smooth'});
 if(!state.items.length)await loadShelfMore();
}
async function loadShelfMore(){
 const sh=editorialShelves.find(x=>x.id===activeShelf);
 if(!sh||shelfBusy||shelfExhausted)return;
 shelfBusy=true;const token=state.request;
 const next=[];let remaining=false;
 try{
  // Load subsequent TMDB pages from every source; retain all available titles.
  for(const path of sh.paths){
   const page=(shelfPages[path]??(shelfData[sh.id]?.length?1:0))+1;
   if(shelfMaxPages[path]!==undefined&&page>shelfMaxPages[path])continue;
   const data=await api(path+(path.includes('?')?'&':'?')+'page='+page);
   if(token!==state.request)return;
   shelfPages[path]=page;shelfMaxPages[path]=Math.min(data?.total_pages||1,500);
   next.push(...(data?.results||[]).filter(x=>x.poster_path).map(x=>({...x,media_type:typeOf(x)})));
   if(page<shelfMaxPages[path])remaining=true;
  }
  const seen=new Set(state.items.map(x=>typeOf(x)+':'+x.id));
  state.items.push(...next.filter(x=>{const k=typeOf(x)+':'+x.id;if(seen.has(k))return false;seen.add(k);return true}));
  shelfExhausted=!remaining;state.totalPages=shelfExhausted?1:2;
  state.page=1;state.error=state.items.length?'':'لا توجد نتائج متاحة لهذا القسم.';
 }catch(e){state.error='تعذر تحميل المزيد، حاول مجددًا.';console.warn(e)}
 finally{shelfBusy=false;if(token===state.request)render()}
}

let currentCollectionKey='';
let collectionPage=0;
let collectionMoviePages=0;
let collectionTvPages=0;
function collectionPaths(key){
 if(key==='trending')return ['/trending/all/week'];
 if(key==='latest-movies')return ['/discover/movie?sort_by=primary_release_date.desc&vote_count.gte=10'];
 if(key==='latest-tv')return ['/discover/tv?sort_by=first_air_date.desc&vote_count.gte=10'];
 if(key==='popular-movies')return ['/movie/popular'];
 if(key==='popular-tv')return ['/tv/popular'];
 if(key==='top-rated')return ['/movie/top_rated'];
 if(key.startsWith('network:'))return ['/discover/tv?with_networks='+encodeURIComponent(key.split(':')[1])];
 if(key.startsWith('genre:'))return ['/discover/movie?with_genres='+encodeURIComponent(key.split(':')[1]),'/discover/tv?with_genres='+encodeURIComponent(key.split(':')[1])];
 if(key.startsWith('provider:')){
  const provider=encodeURIComponent(key.split(':')[1]);
  return ['/discover/movie?with_watch_providers='+provider+'&watch_region=US','/discover/tv?with_watch_providers='+provider+'&watch_region=US'];
 }
 return [];
}
async function fetchCollectionPage(key,page){
 const paths=collectionPaths(key);
 const data=await Promise.all(paths.map(async path=>{
  const result=await api(path+(path.includes('?')?'&':'?')+'page='+page);
  return {results:(result?.results||[]).map(x=>({...x,media_type:path.includes('/tv')?'tv':path.includes('/movie')?'movie':typeOf(x)})),pages:Math.min(result?.total_pages||0,500)};
 }));
 return {items:data.flatMap(d=>d.results).filter(x=>x.media_type!=='person'),totalPages:Math.max(1,...data.map(d=>d.pages))};
}
async function openCollection(key){
 const request=++state.request;activeShelf=null;currentCollectionKey=key;collectionPage=1;
 state.view='collection';state.query='';state.genre='';state.year='';state.page=1;state.totalPages=2;state.loading=true;state.items=[];state.error='';
 const found=collectionGroups.flatMap(g=>g.items).find(item=>item[2]===key);
 state.collectionLabel=found?.[1]||'المجموعة';
 render();document.querySelector('#catalog')?.scrollIntoView({behavior:'smooth'});
 try{
  const data=await fetchCollectionPage(key,1);if(request!==state.request)return;
  state.items=[...new Map(data.items.map(x=>[typeOf(x)+':'+x.id,x])).values()];state.totalPages=data.totalPages;
  if(!state.items.length)state.error='لا توجد أعمال متاحة لهذا القسم حاليًا.';
 }catch(e){if(request!==state.request)return;state.error='تعذر تحميل المجموعة. تحقق من إعدادات TMDB.';console.error(e)}
 state.loading=false;render();document.querySelector('#catalog')?.scrollIntoView({behavior:'smooth'});
}
async function loadCollectionMore(){
 if(state.loading||state.page>=state.totalPages||!currentCollectionKey)return;
 const request=++state.request;const nextPage=state.page+1;state.loading=true;
 const button=document.querySelector('#more');if(button){button.disabled=true;button.textContent='جاري تحميل المزيد...'}
 try{
  const data=await fetchCollectionPage(currentCollectionKey,nextPage);if(request!==state.request)return;
  const seen=new Set(state.items.map(x=>typeOf(x)+':'+x.id));
  state.items.push(...data.items.filter(x=>{const id=typeOf(x)+':'+x.id;if(seen.has(id))return false;seen.add(id);return true}));
  state.page=nextPage;state.totalPages=data.totalPages;
 }catch(e){if(request!==state.request)return;state.error='تعذر تحميل المزيد. حاول مرة أخرى.';console.error(e)}
 state.loading=false;render();
}

load();
fetchShelves();
