/* iitabi service worker — 앱 파일만 캐시(오프라인 열기). 데이터 요청은 건드리지 않음.
   VER는 iitabi.html의 iitabi.js?v= 값, iitabi.js의 VER와 반드시 같이 올린다. */
var VER='2026.10.06-58';
var CACHE='iitabi-'+VER;
var SHELL=['./iitabi.html','./iitabi.js?v='+VER,'./manifest.webmanifest'];
var TABLER=['https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css','https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/fonts/tabler-icons.woff2?v3.31.0'];
var ICONS=['./icon-180.png','./icon-192.png'];
var FONTS=['../fonts/HakgyoansimBareonbatangR.woff2','../fonts/HakgyoansimBareonbatangB.woff2'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL).then(function(){return Promise.all(FONTS.concat(TABLER).concat(ICONS).map(function(f){return c.add(f).catch(function(){})}))})}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return (k.indexOf('iitabi-')===0||k.indexOf('triplog-')===0)&&k!==CACHE}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var u=new URL(req.url);
  var name=u.pathname.split('/').pop();
  var tabler=u.hostname==='cdn.jsdelivr.net'&&u.pathname.indexOf('@tabler/icons-webfont')>=0;
  // 폰트·아이콘·아이콘 이미지는 캐시 우선(바뀌지 않는 정적 파일)
  if(tabler||(u.origin===location.origin&&(/\.woff2$/.test(name)||/^icon-\d+\.png$/.test(name)))){
    e.respondWith(caches.match(req).then(function(r){return r||fetch(req).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)})}return res})}));
    return;
  }
  if(u.origin!==location.origin)return;
  if(name!=='iitabi.html'&&name!=='iitabi.js'&&name!=='manifest.webmanifest'&&name!=='')return;
  // 네트워크 우선(온라인이면 항상 최신) → 실패 시 캐시
  e.respondWith(fetch(req).then(function(res){
    if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy)})}
    return res;
  }).catch(function(){return caches.match(req,{ignoreSearch:name==='iitabi.js'}).then(function(r){return r||caches.match('./iitabi.html')})}));
});
