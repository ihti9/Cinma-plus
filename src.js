import './style.css';
const KEY=import.meta.env.VITE_TMDB_API_KEY;
const TOKEN=import.meta.env.VITE_TMDB_READ_TOKEN;
const base='https://api.themoviedb.org/3';
const img=(p,size='w500')=>p?`https://image.tmdb.org/t/p/${size}${p}`:'';
const demo=[{id:1,title:'رحلة إلى المجهول',original_title:'The Unknown Journey',overview:'مغامرة مشوقة في عالم من الأسرار والاكتشافات.',vote_average:8.6,release_date:'2025-03-10',genre_ids:[12],media_type:'movie',poster_path:null,backdrop_path:null},{id:2,title:'المدينة الأخيرة',overview:'حين تتغير المدينة، تبدأ حكاية جديدة.',vote_average:8.2,release_date:'2024-09-11',genre_ids:[18],media_type:'tv'},{id:3,title:'ما وراء النجوم',overview:'رحلة خيال علمي عبر حدود الكون.',vote_average:7.9,release_date:'2025-01-02',genre_ids:[878],media_type:'movie'},{id:4,title:'الظل',overview:'لغز يختبئ خلف كل باب.',vote_average:8.1,release_date:'2023-11-10',genre_ids:[9648],media_type:'tv'},{id:5,title:'ليلة في البحر',overview:'حكاية إنسانية عن الشجاعة والأمل.',vote_average:7.8,release_date:'2025-05-14',genre_ids:[18],media_type:'movie'},{id:6,title:'الطريق',overview:'أصدقاء يجتمعون في رحلة تغير حياتهم.',vote_average:8.0,release_date:'2024-02-22',genre_ids:[12],media_type:'movie'}];
let stored=[];
try { stored=JSON.parse(localStorage.getItem('cinema_watchlist_v2')||'[]'); if(!Array.isArray(stored))stored=[]; } catch {}
let state={items:[],view:'trending',query:'',selected:null,watchlist:stored,page:1,totalPages:1,loading:false,error:'',request:0};
const typeOf=x=>x.media_type||(x.first_air_date||x.name?'tv':'movie');
const saveEntry=x=>({id:x.id,media_type:typeOf(x),title:title(x),name:x.name,poster_path:x.poster_path,backdrop_path:x.backdrop_path,overview:x.overview,vote_average:x.vote_average,release_date:x.release_date,first_air_date:x.first_air_date});

async function api(path){if(!KEY&&!TOKEN)return null;const url=new URL(base+path);url.searchParams.set('language','ar-SA');if(KEY)url.searchParams.set('api_key',KEY);const r=await fetch(url,{headers:TOKEN?{Authorization:`Bearer ${TOKEN}`}:{}});if(!r.ok)throw Error('TMDB '+r.status);return r.json()}
const year=x=>(x.release_date||x.first_air_date||'').slice(0,4)||'—';
const title=x=>x.title||x.name||x.original_title||x.original_name||'بدون عنوان';
const card=x=>`<article class="movie" data-id="${x.id}" data-type="${x.media_type|| (x.first_air_date?'tv':'movie')}"><div class="poster">${x.poster_path?`<img loading="lazy" src="${img(x.poster_path)}" alt=""/>`:`<div class="placeholder">🎬</div>`}<span class="rating">★ ${(x.vote_average||0).toFixed(1)}</span></div><h3>${escapeHTML(title(x))}</h3><p>${year(x)} · ${x.media_type==='tv'||x.first_air_date?'مسلسل':'فيلم'}</p></article>`;
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){let items=state.view==='saved'?state.watchlist:state.items;const hero=items[0]||demo[0];document.querySelector('#app').innerHTML=`<header><a class="brand" href="#">CINEMA<span>+</span></a><nav><button data-view="trending" class="${state.view==='trending'?'active':''}">الرئيسية</button><button data-view="movie" class="${state.view==='movie'?'active':''}">أفلام</button><button data-view="tv" class="${state.view==='tv'?'active':''}">مسلسلات</button><button data-view="saved" class="${state.view==='saved'?'active':''}">قائمتي</button></nav><button id="menu" aria-label="القائمة">☰</button></header><main><section class="hero" style="${hero.backdrop_path?`background-image:linear-gradient(90deg,rgba(9,11,18,.8),rgba(9,11,18,.25)),linear-gradient(0deg,#090b12,transparent),url('${img(hero.backdrop_path,'original')}')`:''}"><div class="hero-content"><div class="eyebrow">✦ اكتشف عالم الترفيه</div><h1>قصص تستحق<br><em>المشاهدة</em></h1><p>اكتشف أحدث الأفلام والمسلسلات وتفاصيلها وتقييماتها في مكان واحد.</p><button class="primary" id="explore">استكشف الآن ←</button></div></section><section class="catalog" id="catalog"><div class="section-head"><div><small>مكتبتك السينمائية</small><h2>${({trending:'الأكثر رواجًا',movie:'أحدث الأفلام',tv:'المسلسلات الرائجة',saved:'قائمتي المفضلة',search:'نتائج البحث'})[state.view]}</h2></div><div class="search"><span>⌕</span><input id="search" placeholder="ابحث عن فيلم أو مسلسل..." value="${escapeHTML(state.query)}" aria-label="بحث" /></div></div>${state.error?`<p class="notice">${escapeHTML(state.error)}</p>`:''}<div class="grid">${state.loading?'<p class="empty">جاري تحميل النتائج...</p>':items.length?items.map(card).join(''):'<p class="empty">لا توجد نتائج حاليًا.</p>'}</div>${!state.loading&&state.view!=='saved'&&state.view!=='search'&&state.page<state.totalPages?'<button class="primary more" id="more">عرض المزيد</button>':''}</section></main><footer>© ${new Date().getFullYear()} CINEMA+ · بيانات الأفلام مقدمة من TMDB · هذا الموقع غير تابع لـ TMDB</footer><div id="modal-root"></div>`;bind();}
function bind(){document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>load(b.dataset.view));document.querySelector('#explore').onclick=()=>document.querySelector('#catalog').scrollIntoView({behavior:'smooth'});document.querySelector('#search').oninput=e=>{const q=e.target.value;state.query=q;clearTimeout(window.searchTimer);window.searchTimer=setTimeout(()=>{if(q.trim())load('search',q);else load('trending')},450)};document.querySelectorAll('.movie').forEach(el=>el.onclick=()=>show(el.dataset.id,el.dataset.type));document.querySelector('#menu').onclick=()=>document.querySelector('nav').classList.toggle('open');const more=document.querySelector('#more');if(more)more.onclick=()=>load(state.view,'',true)}
async function load(view='trending',q='',append=false){
 const request=++state.request;
 if(!append){state.view=view;state.query=q;state.page=1;state.items=[];}
 else state.page++;
 state.loading=true;state.error='';render();
 if(view==='saved'){state.loading=false;render();return;}
 if(view==='search'&&!q.trim()){state.loading=false;render();return;}
 const path=view==='movie'?'/discover/movie?sort_by=popularity.desc':view==='tv'?'/discover/tv?sort_by=popularity.desc':view==='search'?`/search/multi?query=${encodeURIComponent(q.trim())}`:'/trending/all/week';
 try {
   const data=await api(path+(path.includes('?')?'&':'?')+'page='+state.page);
   if(request!==state.request)return;
   const results=(data?.results||demo).filter(x=>x.media_type!=='person');
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
async function show(id,type){let x=[...state.items,...state.watchlist].find(a=>String(a.id)===String(id)&&typeOf(a)===type);if(!x)return;try{const details=await api(`/${type}/${id}`);if(details)x={...x,...details}}catch{}const key=`${type}:${id}`,saved=state.watchlist.some(v=>`${v.media_type}:${v.id}`===key);document.querySelector('#modal-root').innerHTML=`<div class="overlay" id="overlay"><div class="dialog"><button class="close" id="close" aria-label="إغلاق">×</button><div class="dialog-img">${x.backdrop_path?`<img src="${img(x.backdrop_path,'w1280')}" alt=""/>`:''}</div><div class="dialog-body"><small>★ ${(x.vote_average||0).toFixed(1)} · ${year(x)} · ${type==='tv'?'مسلسل':'فيلم'}</small><h2>${escapeHTML(title(x))}</h2><p>${escapeHTML(x.overview||'لا يوجد وصف متاح.')}</p><div class="actions"><button class="primary" id="save">${saved?'✓ تمت الإضافة إلى قائمتي':'+ أضف إلى قائمتي'}</button><a class="secondary" target="_blank" rel="noopener" href="https://www.themoviedb.org/${type}/${id}">تفاصيل TMDB ↗</a></div><p class="disclaimer">الموقع لعرض المعلومات والاكتشاف، ولا يوفر بثًا غير مرخّص.</p></div></div></div>`;document.querySelector('#close').onclick=()=>document.querySelector('#modal-root').innerHTML='';document.querySelector('#overlay').onclick=e=>{if(e.target.id==='overlay')document.querySelector('#modal-root').innerHTML=''};document.querySelector('#save').onclick=()=>{state.watchlist=saved?state.watchlist.filter(v=>`${v.media_type}:${v.id}`!==key):[...state.watchlist,saveEntry(x)];localStorage.setItem('cinema_watchlist_v2',JSON.stringify(state.watchlist));document.querySelector('#modal-root').innerHTML='';render();show(id,type)}}
load();
