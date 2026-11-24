const CACHE='pogoda-lokalna-v33';
const ASSETS=['./index.html','./weather.css?v=3.3','./forecast-core.js?v=3.3','./weather.js?v=3.3','./favicon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pogoda-lokalna-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
  if(r.mode==='navigate'){
    e.respondWith((async()=>{const c=await caches.open(CACHE);try{const res=await fetch(r);if(!res.ok)throw Error();if(u.pathname===new URL('./',self.registration.scope).pathname||u.pathname===new URL('./index.html',self.registration.scope).pathname){try{await c.put('./index.html',res.clone());}catch{}}return res;}catch{return await c.match('./index.html')||Response.error();}})());return;
  }
  if(ASSETS.some(p=>new URL(p,self.registration.scope).href===u.href))e.respondWith(caches.open(CACHE).then(async c=>(await c.match(r))||fetch(r)));
});
