/* triplog service worker — 앱 파일만 캐시(오프라인 열기). 데이터 요청은 건드리지 않음.
   VER는 triplog.html의 triplog.js?v= 값, triplog.js의 VER와 반드시 같이 올린다. */
var VER='2026.10.05-1';
var CACHE='triplog-'+VER;
var SHELL=['./triplog.html','./triplog.js?v='+VER,'./manifest.webmanifest'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k.indexOf('triplog-')===0&&k!==CACHE}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var u=new URL(req.url);
  if(u.origin!==location.origin)return;
  var name=u.pathname.split('/').pop();
  if(name!=='triplog.html'&&name!=='triplog.js'&&name!=='manifest.webmanifest'&&name!=='')return;
  // 네트워크 우선(온라인이면 항상 최신) → 실패 시 캐시
  e.respondWith(fetch(req).then(function(res){
    if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy)})}
    return res;
  }).catch(function(){return caches.match(req,{ignoreSearch:name==='triplog.js'}).then(function(r){return r||caches.match('./triplog.html')})}));
});
