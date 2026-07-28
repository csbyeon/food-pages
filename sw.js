const CACHE_NAME="food-4c8687fcc280f64f";
const INDEX_URL=new URL('./index.html',self.registration.scope).href;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.add(INDEX_URL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('food-')&&key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(!event.data||event.data.type!=='warm'||!Array.isArray(event.data.urls))return;
  const urls=event.data.urls
    .map(value=>new URL(value,self.registration.scope))
    .filter(url=>url.origin===self.location.origin)
    .map(url=>url.href);
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(urls)).catch(()=>{}));
});

async function networkFirst(request){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request);
    if(response.ok)await cache.put(request,response.clone());
    return response;
  }catch{
    return (await cache.match(request))||(await cache.match(INDEX_URL))||Response.error();
  }
}

async function cacheFirst(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok)await cache.put(request,response.clone());
  return response;
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request));
    return;
  }
  if(url.pathname.includes('/assets/data/')||/\.(?:js|svg|webp)$/.test(url.pathname)){
    event.respondWith(cacheFirst(request));
  }
});
