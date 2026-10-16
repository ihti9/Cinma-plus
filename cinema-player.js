import { playbackSources } from './playback-sources.js';
const PLAYER_POSITION_KEY='cinema_playback_positions_v1';
const EPISODE_PROGRESS_KEY='cinema_episode_progress_v1';
const safeRead=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return {}}};
const safeWrite=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const safeSource=(source)=>{
 if(!source||!['mp4','hls','embed'].includes(source.kind))return false;
 try{const u=new URL(source.url);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password}catch{return false}
};
const mediaKey=({type,id,season,episode})=>type==='tv'?`tv:${id}:s${season}:e${episode}`:`movie:${id}`;
const htmlEscape=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let playerRoot=null;
export function openCinemaPlayer({type,id,title,season,episode,poster_path}){
 closeCinemaPlayer();
 const key=mediaKey({type,id,season,episode});
 const sources=(playbackSources[key]||[]).filter(safeSource);
 const positions=safeRead(PLAYER_POSITION_KEY);
 const heading=type==='tv'?`${title} · الموسم ${season} الحلقة ${episode}`:title;
 playerRoot=document.createElement('div');
 playerRoot.className='cinema-player-overlay';
 playerRoot.setAttribute('role','dialog');playerRoot.setAttribute('aria-modal','true');
 playerRoot.setAttribute('aria-label','مشغّل '+heading);
 playerRoot.innerHTML=`<div class="cinema-player-shell"><div class="cinema-player-top"><div><small>CINEMA+ PLAYER</small><h2>${htmlEscape(heading)}</h2></div><button type="button" class="cinema-player-close" aria-label="إغلاق المشغّل">×</button></div><div class="cinema-player-screen" id="cinema-player-screen"></div><div class="cinema-player-controls"><h3>سيرفرات المشاهدة</h3><div class="cinema-server-list" id="cinema-server-list"></div><p class="cinema-player-note">تُضاف مصادر العرض المرخّصة لاحقًا. لا يوفر CINEMA+ حاليًا روابط لمشاهدة الأفلام أو الحلقات.</p></div></div>`;
 document.body.appendChild(playerRoot);
 document.body.classList.add('cinema-player-open');
 const screen=playerRoot.querySelector('#cinema-player-screen');
 const list=playerRoot.querySelector('#cinema-server-list');
 const closeButton=playerRoot.querySelector('.cinema-player-close');
 closeButton.onclick=closeCinemaPlayer;
 playerRoot.onclick=e=>{if(e.target===playerRoot)closeCinemaPlayer()};
 const onKey=e=>{if(e.key==='Escape')closeCinemaPlayer()};
 playerRoot._onKey=onKey;document.addEventListener('keydown',onKey);
 closeButton.focus();
 if(!sources.length){
  screen.innerHTML=`<div class="cinema-player-empty"><span>▶</span><h3>المشغّل جاهز</h3><p>لم تتم إضافة سيرفر مشاهدة لهذا العنوان بعد.</p></div>`;
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
  video.src=source.url;video.className='cinema-native-video';
  let lastSaved=0;
  const saved=positions[key]?.[source.id];
  video.addEventListener('loadedmetadata',()=>{if(saved?.time>5&&Number.isFinite(video.duration)&&saved.time<video.duration-5)video.currentTime=saved.time});
  video.addEventListener('timeupdate',()=>{if(video.currentTime-lastSaved>=5){lastSaved=video.currentTime;savePosition(video)}});
  video.addEventListener('pause',()=>savePosition(video));
  video.addEventListener('ended',()=>{const data=safeRead(PLAYER_POSITION_KEY);if(data[key])delete data[key][source.id];safeWrite(PLAYER_POSITION_KEY,data)});
  video.addEventListener('error',()=>{const note=document.createElement('p');note.className='cinema-player-error';note.textContent='تعذر تشغيل هذا المصدر. جرّب سيرفرًا آخر.';screen.appendChild(note)});
  video.dataset.server=source.id;screen.appendChild(video);
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
