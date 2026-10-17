const CACHE='cinema-shell-v1';
const SHELL=['/','/index.html','/manifest.webmanifest','/icons/cinema-icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key.startsWith('cinema-shell-')).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match('/index.html')));return}
 const url=new URL(request.url);
 if(url.pathname.startsWith('/assets/')||url.pathname==='/manifest.webmanifest'||url.pathname.startsWith('/icons/')){
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}return response})));
 }
});
