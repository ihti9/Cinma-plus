import { playbackSources } from './playback-sources.js';

const DEMO_VIDEO={id:'demo-cc0',name:'▶ تجربة تشغيل فيديو MP4',kind:'mp4',url:'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'};
const ADDON_KEY='cinema_stremio_addon_v1';
const DEFAULT_ADDON='https://torrentio.strem.fun/manifest.json';
const getAddonBase=()=>{
 try{const value=localStorage.getItem(ADDON_KEY)||DEFAULT_ADDON;const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return '';return u.href.replace(/manifest[.]json\/?$/,'').replace(/\/$/,'')}catch{return ''}
};
async function getStremioSources(imdbId,type,season,episode){
 const base=getAddonBase();if(!base||!/^tt[0-9]+$/.test(imdbId||''))return [];
 const mediaId=type==='tv'?imdbId+':'+Number(season)+':'+Number(episode):imdbId;
 const endpoint=base+'/stream/'+(type==='tv'?'series':'movie')+'/'+encodeURIComponent(mediaId)+'.json';
 const response=await fetch(endpoint,{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('addon request failed');
 const json=await response.json();
 return (Array.isArray(json.streams)?json.streams:[]).slice(0,40).flatMap((stream,i)=>{
  try{
   const url=new URL(stream.url);if(url.protocol!=='https:'||url.username||url.password)return [];
   const path=url.pathname.toLowerCase();
   const kind=path.endsWith('.m3u8')?'hls':path.endsWith('.mp4')?'mp4':null;
   return kind?[{id:'stremio-'+i,name:String(stream.name||stream.title||'Stremio '+(i+1)).slice(0,90),kind,url:url.href}]:[];
  }catch{return []}
 });
}
const LIBRARY_KEY='cinema_video_library_v1';
const readLibrary=()=>{try{const value=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}};
const librarySource=key=>{const item=readLibrary()[key];return safeSource(item)?[item]:[]};
const PLAYER_POSITION_KEY='cinema_playback_positions_v1';
const EPISODE_PROGRESS_KEY='cinema_episode_progress_v1';
const safeRead=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return {}}};
const safeWrite=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const safeSource=(source)=>{
 if(!source||!['mp4','hls','embed','torrent'].includes(source.kind))return false;
 try{const u=new URL(source.url);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password&&(source.kind!=='torrent'||['hls','mp4'].includes(source.streamKind))}catch{return false}
};
const mediaKey=({type,id,season,episode})=>type==='tv'?`tv:${id}:s${season}:e${episode}`:`movie:${id}`;
const htmlEscape=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let playerRoot=null;
export function openCinemaPlayer({type,id,title,season,episode,poster_path,imdbId='',isAnime=false,anilistId=0,episodes=[],seasons=[],loadSeasonEpisodes}){
 closeCinemaPlayer();
 const key=mediaKey({type,id,season,episode});
 const sources=[...librarySource(key),...(playbackSources[key]||[]).filter(safeSource)];
 const positions=safeRead(PLAYER_POSITION_KEY);
 const heading=type==='tv'?`${title} · الموسم ${season} الحلقة ${episode}`:title;
 playerRoot=document.createElement('div');
 playerRoot.className='cinema-player-overlay';
 playerRoot.setAttribute('role','dialog');playerRoot.setAttribute('aria-modal','true');
 playerRoot.setAttribute('aria-label','مشغّل '+heading);
 playerRoot.innerHTML=`<div class="cinema-player-shell dexter-watch"><div class="cinema-player-top"><div class="dexter-watch-brand"><span>CINEMA<span class="dexter-watch-plus">+</span></span><small>صفحة المشاهدة</small></div><button type="button" class="cinema-player-close" aria-label="العودة للتفاصيل">✕ <span>رجوع</span></button></div><div class="dexter-watch-content"><div class="dexter-watch-main"><div class="dexter-watch-title"><small>${type==='tv'?'مسلسل · الموسم '+season+' · الحلقة '+episode:'فيلم'}</small><h2>${htmlEscape(heading)}</h2></div><div class="cinema-player-screen" id="cinema-player-screen"></div><div class="dexter-watch-toolbar"><span>▶ مشغّل CINEMA+</span>${isAnime?"":"<span>اختر سيرفرًا للمشاهدة</span>"}</div><section class="cinema-player-controls">${isAnime?"":`<div class="cinema-watch-meta"><span>سيرفرات المشاهدة</span><span>${sources.length} سيرفر متاح</span></div>`}<div class="cinema-server-list" id="cinema-server-list" ${isAnime?'style="display:none"':""}></div>${isAnime?'<div style="padding:12px;margin:10px 0;border:1px solid #555;border-radius:10px"><button type="button" id="cinema-anipm-play">▶ تشغيل عبر Ani.pm (أنمي)</button><small style="display:block;margin-top:6px">مشغل خارجي؛ قد يعرض إعلانات، وتوفر الحلقات حسب Ani.pm.</small></div>':''}${isAnime?"":"<div style=\"margin:12px 0;padding:12px;border:1px solid #555;border-radius:10px\"><button type=\"button\" id=\"cinema-demo-play\" style=\"padding:10px 14px;cursor:pointer\">▶ تشغيل فيديو تجريبي مجاني</button><p style=\"font-size:12px;margin:8px 0 0\">مقطع فيديو تجريبي مفتوح الاستخدام (CC0) من MDN لاختبار المشغل فقط، وليس الفيلم أو الحلقة المختارة.</p></div><details style=\"margin:12px 0;padding:12px;border:1px solid #555;border-radius:10px\"><summary style=\"cursor:pointer\">إدارة رابط الفيديو لهذا العنوان (على جهازك فقط)</summary><p style=\"font-size:12px\">أضف رابط فيديو HTTPS تملك حق بثه. يتم الحفظ في هذا المتصفح فقط، ولا يظهر لبقية الزوار.</p><label for=\"cinema-library-url\">رابط MP4 أو HLS</label><input id=\"cinema-library-url\" type=\"url\" dir=\"ltr\" placeholder=\"https://example.com/video.mp4\" style=\"width:100%;box-sizing:border-box;padding:10px;margin:6px 0\"><div style=\"display:flex;gap:8px;flex-wrap:wrap\"><button type=\"button\" id=\"cinema-library-save\">حفظ وتشغيل</button><button type=\"button\" id=\"cinema-library-remove\">حذف الرابط</button></div><p id=\"cinema-library-status\" role=\"status\" style=\"font-size:12px\"></p></details><div style=\"margin-top:12px\"><label for=\"cinema-addon-url\">رابط إضافة Stremio</label><div style=\"display:flex;gap:8px;flex-wrap:wrap\"><input id=\"cinema-addon-url\" type=\"url\" placeholder=\"https://addon.example/manifest.json\" dir=\"ltr\" style=\"flex:1;min-width:190px\"><button type=\"button\" id=\"cinema-addon-save\">حفظ الإضافة</button></div><small id=\"cinema-addon-status\">تُعرض مصادر MP4 وHLS المباشرة فقط.</small></div><p class=\"cinema-player-note\">تُربط مصادر الفيديو المرخّصة لاحقًا. السيرفرات غير المضافة لن تعمل.</p>"}</section><div class="dexter-watch-navigation">${type==='tv'&&episodes.length?'<button type="button" id="dexter-prev-episode">← الحلقة السابقة</button><button type="button" id="dexter-next-episode">الحلقة التالية ←</button>':''}</div></div>${type==='tv'?'<aside class="cinema-watch-episodes dexter-watch-sidebar"><div class="dexter-sidebar-head"><h3>قائمة الحلقات</h3><label class="dexter-season-label">الجزء <select id="dexter-season-select" aria-label="اختر الموسم">'+(seasons.length?seasons:[{number:season,name:'الموسم '+season}]).map(v=>'<option value="'+Number(v.number)+'" '+(Number(v.number)===Number(season)?'selected':'')+'>'+htmlEscape(v.name||'الموسم '+v.number)+'</option>').join('')+'</select></label></div><div class="cinema-watch-episode-list">'+episodes.map(ep=>'<button type="button" data-watch-episode="'+Number(ep.number)+'" class="'+(Number(ep.number)===Number(episode)?'active':'')+'">'+(ep.still_path?'<img src="https://image.tmdb.org/t/p/w300'+encodeURI(ep.still_path)+'" loading="lazy" alt="">':'<span class="dexter-episode-placeholder">▶</span>')+'<span><strong>الحلقة '+Number(ep.number)+'</strong><small>'+htmlEscape(ep.name||'')+'</small></span></button>').join('')+'</div></aside>':''}</div></div>`;
 document.body.appendChild(playerRoot);
 document.body.classList.add('cinema-player-open');
 const screen=playerRoot.querySelector('#cinema-player-screen');
 const list=playerRoot.querySelector('#cinema-server-list');
 const closeButton=playerRoot.querySelector('.cinema-player-close');
 closeButton.onclick=closeCinemaPlayer;
 const seasonSelect=playerRoot.querySelector('#dexter-season-select');
 if(seasonSelect&&typeof loadSeasonEpisodes==='function'){
  seasonSelect.onchange=async()=>{
   const nextSeason=Number(seasonSelect.value);
   seasonSelect.disabled=true;
   const episodeList=playerRoot.querySelector('.cinema-watch-episode-list');
   const original=episodeList.innerHTML;
   episodeList.innerHTML='<p class="dexter-season-loading">جاري تحميل حلقات الجزء...</p>';
   try{
    const nextEpisodes=await loadSeasonEpisodes(nextSeason);
    if(!seasonSelect.isConnected)return;
    if(!nextEpisodes.length){episodeList.innerHTML='<p class="dexter-season-loading">لا تتوفر حلقات لهذا الجزء.</p>';seasonSelect.disabled=false;return}
    openCinemaPlayer({type,id,title,season:nextSeason,episode:Number(nextEpisodes[0].number),poster_path,imdbId,isAnime,anilistId,episodes:nextEpisodes,seasons,loadSeasonEpisodes});
   }catch{
    if(seasonSelect.isConnected){episodeList.innerHTML=original;seasonSelect.disabled=false;seasonSelect.value=String(season)}
   }
  };
 }
 playerRoot.querySelectorAll('[data-watch-episode]').forEach(button=>button.onclick=()=>openCinemaPlayer({type,id,title,season,episode:Number(button.dataset.watchEpisode),poster_path,imdbId,isAnime,anilistId,episodes,seasons,loadSeasonEpisodes}));
 if(type==='tv'&&episodes.length){
  const index=episodes.findIndex(ep=>Number(ep.number)===Number(episode));
  const goTo=offset=>{const next=episodes[index+offset];if(next)openCinemaPlayer({type,id,title,season,episode:Number(next.number),poster_path,imdbId,isAnime,anilistId,episodes,seasons,loadSeasonEpisodes})};
  const prev=playerRoot.querySelector('#dexter-prev-episode'),next=playerRoot.querySelector('#dexter-next-episode');
  if(prev){prev.disabled=index<=0;prev.onclick=()=>goTo(-1)}
  if(next){next.disabled=index<0||index>=episodes.length-1;next.onclick=()=>goTo(1)}
 }
 playerRoot.onclick=e=>{if(e.target===playerRoot)closeCinemaPlayer()};
 const onKey=e=>{if(e.key==='Escape')closeCinemaPlayer()};
 playerRoot._onKey=onKey;document.addEventListener('keydown',onKey);
 closeButton.focus();

 const aniButton=playerRoot.querySelector('#cinema-anipm-play');
 if(aniButton&&!Number(anilistId)){
  aniButton.disabled=true;aniButton.textContent='Ani.pm — لم يُحدد معرّف AniList';
  const help=document.createElement('p');help.style.cssText='font-size:12px;margin:8px 0';help.textContent='لم يتم تأكيد تطابق عنوان الأنمي مع AniList. جرّب عنوانًا آخر أو أضف معرّف AniList الصحيح.';
  aniButton.parentElement.appendChild(help);
  const input=document.createElement('input');input.type='number';input.min='1';input.step='1';input.placeholder='معرّف AniList';input.style.cssText='width:160px;max-width:100%;padding:8px';aniButton.parentElement.appendChild(input);
  const manual=document.createElement('button');manual.type='button';manual.textContent='فتح المشغل';manual.onclick=()=>{const value=Number(input.value);if(Number.isSafeInteger(value)&&value>0){aniButton.disabled=false;anilistId=value;aniButton.click()}};aniButton.parentElement.appendChild(manual);
 }

 if(aniButton){
  screen.style.cursor='pointer';
  screen.setAttribute('role','button');
  screen.setAttribute('tabindex','0');
  screen.setAttribute('aria-label','اضغط لتشغيل الحلقة عبر Ani.pm');
  screen.onclick=event=>{if(event.target.closest('video, iframe, button, input'))return;if(!aniButton.disabled)aniButton.click()};
  screen.onkeydown=event=>{if((event.key==='Enter'||event.key===' ')&&!screen.querySelector('video, iframe')&&!aniButton.disabled){event.preventDefault();aniButton.click()}};
 }
 if(aniButton)aniButton.onclick=()=>{
  const aniId=Number(anilistId),ep=type==='tv'?Number(episode):1;
  if(!Number.isSafeInteger(aniId)||aniId<1||!Number.isSafeInteger(ep)||ep<1)return;
  const existing=screen.querySelector('video');if(existing)existing.pause();
  screen.replaceChildren();
  const iframe=document.createElement('iframe');iframe.src=`https://ani.pm/embed/ani/${aniId}/${ep}/sub`;
  iframe.title='Ani.pm — '+heading;iframe.dir='ltr';iframe.setAttribute('dir','ltr');iframe.style.cssText='width:100%;aspect-ratio:16/9;border:0;direction:ltr';iframe.allow='autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
  screen.appendChild(iframe);
  screen.style.cursor='auto';
  screen.removeAttribute('role');screen.removeAttribute('tabindex');screen.removeAttribute('aria-label');
 };
 if(!isAnime){
 const libraryInput=playerRoot.querySelector('#cinema-library-url');
 const libraryStatus=playerRoot.querySelector('#cinema-library-status');
 libraryInput.value=readLibrary()[key]?.url||'';
 playerRoot.querySelector('#cinema-library-save').onclick=()=>{
  try{
   const u=new URL(libraryInput.value.trim());
   if(u.protocol!=='https:'||u.username||u.password||!/[.](mp4|m3u8)$/i.test(u.pathname))throw Error('invalid');
   const kind=u.pathname.toLowerCase().endsWith('.m3u8')?'hls':'mp4';
   const item={id:'library-'+key,name:'فيديو مكتبتي',kind,url:u.href};
   const library=readLibrary();library[key]=item;localStorage.setItem(LIBRARY_KEY,JSON.stringify(library));
   libraryStatus.textContent='تم الحفظ على هذا الجهاز، وجاري التشغيل.';
   const old=list.querySelector('[data-server^="library-"]');if(old)old.remove();
   const btn=document.createElement('button');btn.type='button';btn.dataset.server=item.id;btn.textContent=item.name;btn.onclick=()=>selectSource(item);list.prepend(btn);
   selectSource(item);
  }catch{libraryStatus.textContent='استخدم رابط HTTPS مباشر ينتهي بـ .mp4 أو .m3u8.'}
 };
 playerRoot.querySelector('#cinema-library-remove').onclick=()=>{const library=readLibrary();delete library[key];localStorage.setItem(LIBRARY_KEY,JSON.stringify(library));libraryInput.value='';list.querySelector('[data-server^="library-"]')?.remove();libraryStatus.textContent='تم حذف الرابط من هذا الجهاز.'};
 const rootForAddon=playerRoot;
 playerRoot.querySelector('#cinema-demo-play').onclick=()=>selectSource(DEMO_VIDEO);
 const addonInput=playerRoot.querySelector('#cinema-addon-url');
 const addonStatus=playerRoot.querySelector('#cinema-addon-status');
 addonInput.value=localStorage.getItem(ADDON_KEY)||DEFAULT_ADDON;
 playerRoot.querySelector('#cinema-addon-save').onclick=()=>{
  try{const u=new URL(addonInput.value.trim());if(u.protocol!=='https:'||u.username||u.password)throw Error('invalid');localStorage.setItem(ADDON_KEY,u.href);loadAddon()}
  catch{addonStatus.textContent='أدخل رابط HTTPS صالحًا.'}
 };
 }
 const addonStatus=playerRoot.querySelector('#cinema-addon-status');
 const rootForAddon=playerRoot;
 async function loadAddon(){
  if(isAnime||!getAddonBase())return;
  if(!imdbId){addonStatus.textContent='لا يوجد معرّف IMDb لهذا العنوان.';return}
  try{
   addonStatus.textContent='جاري البحث عن مصدر تشغيل مباشر...';
   const items=(await getStremioSources(imdbId,type,season,episode)).filter(safeSource);
   if(!screen.isConnected||playerRoot!==rootForAddon)return;
   list.querySelectorAll('[data-server^="stremio-"]').forEach(el=>el.remove());
   items.forEach(source=>{
    const btn=document.createElement('button');btn.type='button';btn.dataset.server=source.id;btn.textContent=source.name;btn.onclick=()=>selectSource(source);list.appendChild(btn);
   });
   addonStatus.textContent=items.length?'مصادر مباشرة متاحة: '+items.length:'لم توفر الإضافة رابط MP4/HLS مباشرًا؛ روابط التورنت تحتاج خادم بث.';
   if(items.length&&!sources.length&&!screen.querySelector('video, iframe'))selectSource(items[0]);
   if(!items.length&&!sources.length&&!screen.querySelector('video, iframe')&&!aniButton)screen.innerHTML='<div class="cinema-player-empty"><span>▶</span><h3>لا يوجد رابط تشغيل مباشر</h3><p>لم توفر إضافة Stremio فيديو MP4/HLS متوافقًا. روابط التورنت تحتاج خادم بث.</p></div>';
  }catch{addonStatus.textContent='تعذر الاتصال بالإضافة؛ قد تكون CORS غير مفعّلة.'}
 }
 if(!isAnime)loadAddon();
 if(!sources.length){
  screen.innerHTML=aniButton?'<div class="cinema-player-empty"><span>▶</span><h3>اضغط على الشاشة لتشغيل الحلقة</h3><p>سيُفتح مشغل Ani.pm هنا مباشرة.</p></div>':'<div class="cinema-player-empty"><span>▶</span><h3>جاري البحث عن رابط تشغيل</h3><p>سيبدأ الفيديو تلقائيًا عند توفر مصدر مباشر متوافق.</p></div>';
  list.innerHTML='<span class="cinema-server-unavailable">لا توجد سيرفرات متاحة حاليًا</span>';
  return;
 }
 function selectSource(source){
  if(!playerRoot)return;
  const old=screen.querySelector('video');if(old){old.pause();savePosition(old)}
  screen.replaceChildren();
  list.querySelectorAll('button').forEach(btn=>btn.classList.toggle('active',btn.dataset.server===String(source.id)));
  if(source.kind==='embed'){
   const iframe=document.createElement('iframe');
   iframe.src=source.url;iframe.title='مشغّل '+heading;iframe.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-forms');
   screen.appendChild(iframe);
   return;
  }
  const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.poster=poster_path?`https://image.tmdb.org/t/p/w780${poster_path}`:'';
  // Torrent entries point to an authorized HTTPS streaming gateway, not a magnet URI.
  video.src=source.url;video.className='cinema-native-video';
  // Playback is initiated by an explicit user selection, preserving iOS gesture policy.
  video.autoplay=false;
  if(source.id==='demo-cc0')video.poster='';
  let lastSaved=0;
  const saved=positions[key]?.[source.id];
  video.addEventListener('loadedmetadata',()=>{if(saved?.time>5&&Number.isFinite(video.duration)&&saved.time<video.duration-5)video.currentTime=saved.time});
  video.addEventListener('timeupdate',()=>{if(video.currentTime-lastSaved>=5){lastSaved=video.currentTime;savePosition(video)}});
  video.addEventListener('pause',()=>savePosition(video));
  video.addEventListener('ended',()=>{
   const data=safeRead(PLAYER_POSITION_KEY);if(data[key])delete data[key][source.id];safeWrite(PLAYER_POSITION_KEY,data);
   if(type!=='tv'||source.id==='demo-cc0')return;
   const index=episodes.findIndex(ep=>Number(ep.number)===Number(episode));
   const next=episodes[index+1];if(index<0||!next)return;
   const nextKey=mediaKey({type,id,season,episode:Number(next.number)});
   if(!librarySource(nextKey).length&&!(playbackSources[nextKey]||[]).some(safeSource))return;
   const notice=document.createElement('button');notice.type='button';notice.className='cinema-next-episode';notice.textContent='▶ تشغيل الحلقة التالية: '+Number(next.number);
   notice.style.cssText='display:block;margin:12px auto;padding:12px 20px;border-radius:10px;cursor:pointer';
   notice.onclick=()=>openCinemaPlayer({type,id,title,season,episode:Number(next.number),poster_path,imdbId,episodes,seasons,loadSeasonEpisodes});screen.appendChild(notice);
  });
  if(source.kind==='torrent'&&source.streamKind==='hls'&&!video.canPlayType('application/vnd.apple.mpegurl')){
   const note=document.createElement('p');note.className='cinema-player-error';note.textContent='هذا المتصفح لا يدعم بث HLS مباشرة. استخدم Safari أو مصدر MP4.';screen.appendChild(note);
  }
  video.addEventListener('error',()=>{const note=document.createElement('p');note.className='cinema-player-error';note.textContent=source.id==='demo-bbb'?'تعذر تحميل فيديو التجربة. افتح الرابط مباشرة أو جرّب شبكة أخرى.':'تعذر تشغيل هذا المصدر. جرّب سيرفرًا آخر.';screen.appendChild(note)});
  video.dataset.server=source.id;screen.appendChild(video);
  if(source.kind==='hls'&&!video.canPlayType('application/vnd.apple.mpegurl')){
   const note=document.createElement('p');note.className='cinema-player-error';note.textContent='بث HLS يحتاج دعم المتصفح أو مكتبة HLS.js. جرّب Safari على الآيفون.';screen.appendChild(note);
  }
  if(source.id==='demo-cc0'){
   const note=document.createElement('p');note.style.cssText='font-size:12px;text-align:center;padding:6px';note.textContent='فيديو اختبار MDN — ليس '+heading;screen.appendChild(note);
  }
  video.play().catch(()=>{});
  if(type==='tv'){
   const progress=safeRead(EPISODE_PROGRESS_KEY);
   progress['tv:'+id]={...(progress['tv:'+id]||{}),id:Number(id),media_type:'tv',title,poster_path:poster_path||'',season:Number(season),episode:Number(episode),updated:Date.now()};
   safeWrite(EPISODE_PROGRESS_KEY,progress);
  }
 }
 function savePosition(video){
  if(!video||!Number.isFinite(video.currentTime)||video.currentTime<0)return;
  const data=safeRead(PLAYER_POSITION_KEY);
  data[key]??={};
  data[key][video.dataset.server]={time:video.currentTime,updated:Date.now()};
  safeWrite(PLAYER_POSITION_KEY,data);
 }
 sources.forEach((source,index)=>{
  const button=document.createElement('button');button.type='button';button.dataset.server=source.id;
  button.textContent=source.name||`سيرفر ${index+1}`;button.onclick=()=>selectSource(source);list.appendChild(button);
 });
 selectSource(sources[0]);
}
export function closeCinemaPlayer(){
 if(!playerRoot)return;
 const video=playerRoot.querySelector('video');if(video){video.pause()}
 if(playerRoot._onKey)document.removeEventListener('keydown',playerRoot._onKey);
 playerRoot.remove();playerRoot=null;document.body.classList.remove('cinema-player-open');
}
