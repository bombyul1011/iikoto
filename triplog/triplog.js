(function(){
'use strict';
var VER='2026.10.05-1';
var SUPA_URL='https://vqvpzrxmtpryzhontlxc.supabase.co';
var SUPA_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdnB6cnhtdHByeXpob250bHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNTgxMjksImV4cCI6MjA5NjYzNDEyOX0.pbtq1UMPC7ylYM1H2xVa19C1TFlceLmEfEtkz3WK2VI';
var LSP='triplog:';
function lget(k,d){try{var v=localStorage.getItem(LSP+k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function lset(k,v){try{localStorage.setItem(LSP+k,JSON.stringify(v))}catch(e){}}
var CITYC=[['#a3281f','#ffe0db','#e5604f'],['#0b6580','#d6eff8','#2aa7c9'],['#6e2f78','#f1e0f3','#a65ab0'],['#7a5200','#fff0c2','#d9a21b'],['#2f6e2c','#e2f0d2','#6fb04c']];
var CH=['#b6d98f','#6fb04c','#f0c85a','#e8b58d'];
var CAT={meal:'식사',cafe:'카페',sight:'명소',snack:'간식'};
var STATE=[['cand','후보'],['go','갈 곳'],['done','다녀옴']];
var SLOTL={am:'오전',noon:'점심',pm:'오후',eve:'저녁'};
var ECAT={food:'식사',move:'교통',shop:'쇼핑',etc:'기타'};
var IC={
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
chk:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
wal:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
nav:'<path d="M3 11l19-9-9 19-2-8-8-2z"/>',
chevd:'<path d="M6 9l6 6 6-6"/>',chevr:'<path d="M9 18l6-6-6-6"/>',plus:'<path d="M12 5v14M5 12h14"/>',
pen:'<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
x:'<path d="M18 6L6 18M6 6l12 12"/>',check:'<path d="M5 12l5 5 9-10"/>',
cloud:'<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>',
cloudok:'<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/><path d="M9.5 13.5l2 2 4-4"/>',
cloudoff:'<path d="M22 22L2 2M17.5 19H9a7 7 0 0 1-3.9-12.8M12.6 5.1A7 7 0 0 1 15.7 10h1.8a4.5 4.5 0 0 1 2.6 8.2"/>',
refresh:'<path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6"/>',
ext:'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>',
plane:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
bed:'<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
sim:'<path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M9 12h6M9 16h6"/>',
bus:'<rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16M8 21v-4M16 21v-4"/>',
tag:'<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.2"/>',
checkc:'<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/>',
trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
dl:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
ul:'<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>'
};
function ic(n,s,c,w){return '<svg width="'+(s||20)+'" height="'+(s||20)+'" viewBox="0 0 24 24" fill="none" stroke="'+(c||'currentColor')+'" stroke-width="'+(w||1.8)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none">'+IC[n]+'</svg>'}
function esc(t){return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function ea(t){return esc(t).replace(/"/g,'&quot;')}
function pad(n){return n<10?'0'+n:''+n}
function ds(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parse(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2])}
function addDays(s,n){var d=parse(s);d.setDate(d.getDate()+n);return ds(d)}
var WD=['일','월','화','수','목','금','토'];
function wd(s){return WD[parse(s).getDay()]}
function md(s){var p=s.split('-');return (+p[1])+'/'+(+p[2])}
function today(){return ds(new Date())}
function nowHM(){var d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())}
function genCid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function won(n){return Math.round(n).toLocaleString('ko-KR')}
function enc(s){return encodeURIComponent(s)}
function mapUrl(q){return 'https://www.google.com/maps/search/?api=1&query='+enc(q)}
function navUrl(q){return 'https://www.google.com/maps/dir/?api=1&destination='+enc(q)+'&travelmode=transit'}

/* ---------- state ---------- */
var cfg=lget('cfg',{key:'',tripId:''});
var UI={tab:lget('tab','today'),sched:null,clFilter:'all',spCity:null,spCat:'all',cond:{},sheet:null,edit:null,status:'',keyBad:false,addExp:false,addSpot:false};
var M=null,CL={items:[]},MEMOS=[],WX=lget('wx',{}),Q=lget('q',[]),TRIPS=lget('trips',[]);
function saveQ(){lset('q',Q)}
function loadTrip(){
  if(!cfg.tripId){M=null;CL={items:[]};MEMOS=[];return}
  var rows=lget('rows:'+cfg.tripId,null);
  M=rows?buildModel(rows):null;
  CL=lget('cl:'+cfg.tripId,{items:[]});
  MEMOS=lget('memos:'+cfg.tripId,[]);
}
function buildModel(rows){
  var m={trip:null,stays:[],events:{},plans:{},choices:{},spots:[],expenses:[]};
  rows=rows.slice().sort(function(a,b){return (a.sort_order||0)-(b.sort_order||0)});
  rows.forEach(function(r){
    var o={cid:r.client_id,date:r.date_key||null,sort:r.sort_order||0,d:r.data||{}};
    switch(r.kind){
      case 'trip':m.trip=o;break;
      case 'stay':m.stays.push(o);break;
      case 'event':(m.events[r.date_key]=m.events[r.date_key]||[]).push(o);break;
      case 'plan':m.plans[o.d.id]=o;break;
      case 'choice':m.choices[r.date_key+'|'+o.d.slot]=o;break;
      case 'spot':m.spots.push(o);break;
      case 'expense':m.expenses.push(o);break;
    }
  });
  return m;
}
function modelRows(){
  var r=[];
  function p(k,o){r.push({client_id:o.cid,kind:k,date_key:o.date,sort_order:o.sort,data:o.d})}
  if(M.trip)p('trip',M.trip);
  M.stays.forEach(function(o){p('stay',o)});
  Object.keys(M.events).forEach(function(d){M.events[d].forEach(function(o){p('event',o)})});
  Object.keys(M.plans).forEach(function(k){p('plan',M.plans[k])});
  Object.keys(M.choices).forEach(function(k){p('choice',M.choices[k])});
  M.spots.forEach(function(o){p('spot',o)});
  M.expenses.forEach(function(o){p('expense',o)});
  return r;
}
function saveRows(){if(M&&cfg.tripId)lset('rows:'+cfg.tripId,modelRows())}
function saveCL(){if(cfg.tripId)lset('cl:'+cfg.tripId,CL)}
function trip(){return M&&M.trip?M.trip.d:null}
function tripDates(){
  var t=trip();if(!t)return [];var a=[],d=t.start,n=0;
  while(d<=t.end&&n<60){a.push(d);d=addDays(d,1);n++}
  return a;
}
function cityIdx(id){var t=trip();if(!t)return 0;for(var i=0;i<t.cities.length;i++){if(t.cities[i].id===id)return i}return 0}
function cityCol(id){return CITYC[cityIdx(id)%CITYC.length]}
function cityName(id){var t=trip();if(!t)return '';for(var i=0;i<t.cities.length;i++){if(t.cities[i].id===id)return t.cities[i].name}return ''}
function stayOf(d){
  if(!M||!M.stays.length)return null;
  var s=M.stays.slice().sort(function(a,b){return a.d.checkin<b.d.checkin?-1:1});
  for(var i=0;i<s.length;i++){if(s[i].d.checkin<=d&&d<s[i].d.checkout)return s[i]}
  if(d>=s[s.length-1].d.checkout)return s[s.length-1];
  return s[0];
}
function cityOfDate(d){var s=stayOf(d);return s?s.d.city:(trip()&&trip().cities[0]?trip().cities[0].id:'')}
function clampDate(d){var t=trip();if(!t)return d;if(d<t.start)return t.start;if(d>t.end)return t.end;return d}

/* ---------- api ---------- */
function sf(path,method,body,prefer){
  var h={'apikey':SUPA_ANON,'Authorization':'Bearer '+SUPA_ANON,'Content-Type':'application/json','x-client-info':'triplog|'+(cfg.key||'')};
  if(prefer)h['Prefer']=prefer;
  return fetch(SUPA_URL+'/rest/v1/'+path,{method:method||'GET',headers:h,body:body?JSON.stringify(body):undefined}).then(function(r){
    if(!r.ok)return r.text().then(function(t){console.warn('triplog supa',r.status,path,t);return null});
    if(method&&method!=='GET')return true;
    return r.json();
  }).catch(function(){return null});
}
function qHas(t,cid,op){return Q.some(function(o){return o.t===t&&o.cid===cid&&(!op||o.op===op)})}
function tiUp(kind,o){
  Q=Q.filter(function(x){return !(x.t==='ti'&&x.op==='up'&&x.cid===o.cid)});
  Q.push({t:'ti',op:'up',trip:cfg.tripId,kind:kind,cid:o.cid,date:o.date||null,sort:o.sort||0,data:o.d});
  saveQ();saveRows();flush();
}
function tiDel(o){
  Q=Q.filter(function(x){return !(x.t==='ti'&&x.cid===o.cid)});
  Q.push({t:'ti',op:'del',trip:cfg.tripId,cid:o.cid});
  saveQ();saveRows();flush();
}
function prefix(){var t=trip();return (t&&t.cl_prefix)||('triplog_'+cfg.tripId+'_')}
function clKey(it){return it.pre?'pre':it.date}
function preDate(){var t=trip();return (t&&t.pre_date)||(t&&t.start)||today()}
function clDate(key){return key==='pre'?preDate():key}
function newClId(key){return prefix()+(key==='pre'?'pre_':'d'+key.replace(/-/g,'').slice(4)+'_')+genCid()}
function tdAdd(it){Q.push({t:'td',op:'add',cid:it.id});saveQ();saveCL();flush()}
function tdUpd(it,f){if(qHas('td',it.id,'add')){saveCL();return}Q.push({t:'td',op:'upd',cid:it.id,date:it.date,f:f});saveQ();saveCL();flush()}
function tdDel(it){
  var had=qHas('td',it.id,'add');
  Q=Q.filter(function(x){return !(x.t==='td'&&x.cid===it.id)});
  if(!had)Q.push({t:'td',op:'del',cid:it.id,date:it.date});
  saveQ();saveCL();flush();
}
var flushing=false;
function flush(){
  if(flushing)return Promise.resolve();
  flushing=true;
  function next(){
    if(!Q.length)return Promise.resolve();
    var op=Q[0],p;
    if(op.t==='ti'&&op.op==='up'){
      p=sf('trip_items?on_conflict=trip_id,client_id','POST',[{trip_id:op.trip,kind:op.kind,client_id:op.cid,date_key:op.date,sort_order:op.sort,data:op.data}],'resolution=merge-duplicates,return=minimal');
    }else if(op.t==='ti'&&op.op==='del'){
      p=sf('trip_items?trip_id=eq.'+enc(op.trip)+'&client_id=eq.'+enc(op.cid),'PATCH',{deleted_at:new Date().toISOString()},'return=minimal');
    }else if(op.t==='td'&&op.op==='add'){
      var it=null;CL.items.forEach(function(x){if(x.id===op.cid)it=x});
      if(!it)p=Promise.resolve(true);
      else p=sf('todos?on_conflict=date_key,client_id','POST',[{date_key:clDate(clKey(it)),text:it.t,done:!!it.done,created:it.created,client_id:it.id,time_section:'none',cat:'todo',completed_at:it.done?(it.completedAt||Date.now()):null,is_event:false}],'resolution=ignore-duplicates,return=minimal');
    }else if(op.t==='td'&&op.op==='upd'){
      p=sf('todos?client_id=eq.'+enc(op.cid)+'&date_key=eq.'+op.date,'PATCH',op.f,'return=minimal');
    }else if(op.t==='td'&&op.op==='del'){
      p=sf('todos?client_id=eq.'+enc(op.cid)+'&date_key=eq.'+op.date,'DELETE');
    }else p=Promise.resolve(true);
    return p.then(function(ok){if(!ok)return;Q.shift();saveQ();return next()});
  }
  return next().then(function(){flushing=false;setStatus()},function(){flushing=false;setStatus()});
}
function setStatus(m){UI.status=m||'';var el=document.getElementById('sync');if(el)el.innerHTML=syncHtml()}
function syncHtml(){
  var q=Q.length,t;
  if(UI.status==='sync')return ic('refresh',16,'#645d49')+'동기화 중';
  if(UI.status==='off'||q)return ic('cloudoff',16,'#645d49')+'오프라인'+(q?' · 대기 '+q+'건':'');
  if(UI.keyBad)return ic('cloudoff',16,'#a3281f')+'키 확인 필요';
  var d=new Date();return ic('cloudok',16,'#2f6e2c')+'iikoto 동기화됨 '+pad(d.getHours())+':'+pad(d.getMinutes());
}

/* ---------- pull ---------- */
function pull(force){
  if(!cfg.key||!cfg.tripId)return Promise.resolve();
  var ae=document.activeElement;
  if(!force&&ae&&((ae.tagName==='INPUT'&&ae.type!=='checkbox'&&ae.type!=='radio')||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'))return Promise.resolve();
  setStatus('sync');
  return flush().then(function(){
    if(Q.length){setStatus();return}
    return sf('trip_items?trip_id=eq.'+enc(cfg.tripId)+'&deleted_at=is.null&select=client_id,kind,date_key,sort_order,data&order=sort_order.asc').then(function(rows){
      if(!rows){setStatus('off');return}
      if(!rows.length){UI.keyBad=true;setStatus();render();return}
      UI.keyBad=false;
      M=buildModel(rows);saveRows();
      return pullTodos().then(function(){return pullMemos()}).then(function(){
        setStatus();render();pullWeather();
      });
    });
  });
}
function pullTodos(){
  return sf('todos?client_id=like.'+enc(prefix())+'*&select=client_id,date_key,text,done,created,completed_at&order=created').then(function(rows){
    if(!rows)return;
    var pre=prefix()+'pre_';
    CL.items=rows.map(function(r){var isPre=r.client_id.indexOf(pre)===0;return {id:r.client_id,date:r.date_key,pre:isPre,t:r.text,done:!!r.done,created:r.created,completedAt:r.completed_at}});
    saveCL();
    var t=trip();
    if(t&&!t.cl_seeded&&!rows.length)seedChecklist();
  });
}
function seedChecklist(){
  var t=trip(),n=0,t0=Date.now();
  (t.checklistSeed||[]).forEach(function(s){
    var key=s.date==='pre'?'pre':s.date;
    var it={id:newClId(key),date:key==='pre'?preDate():key,pre:key==='pre',t:s.text,done:false,created:t0+(n++)};
    CL.items.push(it);tdAdd(it);
  });
  t.cl_seeded=true;tiUp('trip',M.trip);
}
function pullMemos(){
  var t=trip();if(!t)return Promise.resolve();
  var ds_=tripDates().join(',');
  return sf('memos?date_key=in.('+ds_+')&select=client_id,date_key,memo_time,text,photo_url,question&order=created').then(function(rows){
    if(!rows)return;MEMOS=rows;lset('memos:'+cfg.tripId,MEMOS);
  });
}
function pullWeather(){
  var t=trip();if(!t)return;
  var last=lget('wxAt:'+cfg.tripId,0);
  if(Date.now()-last<3*3600*1000&&WX.d)return;
  var done=0;var out={};
  t.cities.forEach(function(c){
    var u='https://api.open-meteo.com/v1/forecast?latitude='+c.lat+'&longitude='+c.lng+'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunshine_duration,daylight_duration&timezone=Asia%2FTokyo&forecast_days=16';
    fetch(u).then(function(r){return r.ok?r.json():null}).then(function(j){
      if(j&&j.daily){j.daily.time.forEach(function(d,i){
        var sun=j.daily.sunshine_duration?j.daily.sunshine_duration[i]:null,dl=j.daily.daylight_duration?j.daily.daylight_duration[i]:null;
        var pp=j.daily.precipitation_probability_max?j.daily.precipitation_probability_max[i]:null;
        var ratio=(sun!=null&&dl)?sun/dl:null;
        var good=(pp==null||pp<=40)&&(ratio==null||ratio>=0.5);
        (out[c.id]=out[c.id]||{})[d]={tmax:j.daily.temperature_2m_max[i],tmin:j.daily.temperature_2m_min[i],pp:pp,ratio:ratio,sun:good};
      })}
    }).catch(function(){}).then(function(){
      done++;if(done===t.cities.length){WX={d:out};lset('wx',WX);lset('wxAt:'+cfg.tripId,Date.now());render()}
    });
  });
}
function wxOf(d){var c=cityOfDate(d);return WX.d&&WX.d[c]&&WX.d[c][d]||null}
function loadTrips(){
  return sf('trip_items?kind=eq.trip&deleted_at=is.null&select=trip_id,data&order=created_at.desc').then(function(rows){
    if(!rows)return;TRIPS=rows;lset('trips',TRIPS);
    if(!cfg.tripId&&rows.length){cfg.tripId=rows[0].trip_id;lset('cfg',cfg);loadTrip()}
    else if(!rows.length&&cfg.key){UI.keyBad=true}
  });
}

/* ---------- ui helpers ---------- */
function chip(t,cls,style){return '<span class="chip '+(cls||'')+'"'+(style?' style="'+style+'"':'')+'>'+t+'</span>'}
function cityChip(id){var c=cityCol(id);return chip(esc(cityName(id)),'','color:'+c[0]+';background:'+c[1])}
function mapBtn(q){return q?'<a class="ibtn" aria-label="지도에서 열기" href="'+ea(mapUrl(q))+'" target="_blank" rel="noopener">'+ic('pin',20)+'</a>':''}
function navBtn(q){return q?'<a class="ibtn" aria-label="길찾기(대중교통)" href="'+ea(navUrl(q))+'" target="_blank" rel="noopener">'+ic('nav',20)+'</a>':''}
function seg(act,items,sel,extra){
  var h='<div class="seg">';
  items.forEach(function(it){h+='<button data-act="'+act+'" data-v="'+ea(it[0])+'"'+(extra?' '+extra:'')+' aria-pressed="'+(sel===it[0])+'" class="'+(sel===it[0]?'on':'')+'">'+(it[2]?ic(it[2],18):'')+esc(it[1])+'</button>'}); 
  return h+'</div>';
}
function card(inner,cls){return '<div class="card '+(cls||'')+'">'+inner+'</div>'}
function titleBar(t,sub,right){return '<div class="titlebar"><div><h1>'+esc(t)+'</h1>'+(sub?'<div class="sub">'+esc(sub)+'</div>':'')+'</div>'+(right||'')+'</div>'}
function syncBtn(){return '<button class="syncst" data-act="sync" id="sync" aria-label="지금 동기화">'+syncHtml()+'</button>'}
function bar(p){return '<div class="bar"><i style="width:'+Math.max(0,Math.min(100,p))+'%"></i></div>'}
function memosOf(d){return MEMOS.filter(function(m){return m.date_key===d})}
function memoHtml(list){
  if(!list.length)return '<div class="small muted">iikoto에서 쓴 메모가 여기에 읽기 전용으로 보여요.</div>';
  return list.map(function(m){
    var img=m.photo_url&&/^https?:/.test(m.photo_url)?'<img loading="lazy" alt="메모 사진" src="'+ea(m.photo_url)+'">':'';
    return '<div class="memo"><div class="small muted">'+esc(m.memo_time||'')+(m.question?' · '+esc(m.question):'')+'</div>'+esc(m.text||'').replace(/\n/g,'<br>')+img+'</div>';
  }).join('');
}
function toast(t){var el=document.getElementById('toast');el.innerHTML='<div class="toast">'+esc(t)+'</div>';setTimeout(function(){el.innerHTML=''},2200)}

/* ---------- checklist helpers ---------- */
function clItems(key){return CL.items.filter(function(it){return clKey(it)===key})}
function clRow(it){
  if(UI.edit===it.id)return '<div class="ck"><input type="checkbox" disabled><input class="edit" data-id="'+ea(it.id)+'" value="'+ea(it.t)+'"><button class="mini" data-act="edit-ok" data-id="'+ea(it.id)+'" aria-label="저장">'+ic('check',18)+'</button></div>';
  return '<div class="ck'+(it.done?' done':'')+'"><input type="checkbox" data-act="ck" data-id="'+ea(it.id)+'" '+(it.done?'checked':'')+' aria-label="'+ea(it.t)+'"><span class="tx">'+esc(it.t)+'</span><button class="mini" data-act="edit" data-id="'+ea(it.id)+'" aria-label="수정">'+ic('pen',16)+'</button><button class="mini" data-act="del" data-id="'+ea(it.id)+'" aria-label="삭제">'+ic('x',16)+'</button></div>';
}
function clAddRow(key){return '<div class="addrow"><input data-add="'+ea(key)+'" placeholder="+ 항목 추가" aria-label="항목 추가"><button class="btn" data-act="add" data-key="'+ea(key)+'">추가</button></div>'}
function clGroup(label,key,chp){
  var items=clItems(key);
  return card('<div class="row between" style="margin-bottom:4px"><b style="font-size:14px">'+esc(label)+'</b>'+(chp||'')+'</div>'+items.map(clRow).join('')+clAddRow(key));
}

/* ---------- screens ---------- */
function eventsOf(d){return (M&&M.events[d])||[]}
function slotsOf(d){var t=trip();return (t&&t.planSlots&&t.planSlots[d])||[]}
function choiceOf(d,slot){return M&&M.choices[d+'|'+slot]||null}
function planOf(id){return M&&M.plans[id]||null}
function evCard(e,col){
  var d=e.d;
  var tags=(d.tags||[]).map(function(t){return chip(esc(t),'pn')}).join(' ');
  var link=d.link?'<a class="small" style="display:inline-flex;align-items:center;gap:4px;min-height:44px;font-weight:700" href="'+ea(d.link.url)+'" target="_blank" rel="noopener">'+ic('ext',14,'#3a7a2a')+esc(d.link.label)+'</a>':'';
  return '<div class="card sm"><div class="row"><div class="grow"><h3 style="margin:0;font-size:15px">'+esc(d.title)+'</h3>'+(d.desc?'<p style="margin:3px 0 0;font-size:13px;color:#645d49;line-height:1.45">'+esc(d.desc)+'</p>':'')+(tags?'<div class="chips" style="margin-top:8px">'+tags+'</div>':'')+(d.alt?'<p style="margin:6px 0 0;font-size:12px;color:#645d49">'+esc(d.alt)+'</p>':'')+link+'</div>'+(d.map?mapBtn(d.map):'')+(d.nav&&d.map?navBtn(d.map):'')+'</div></div>';
}
function timeline(d){
  var ev=eventsOf(d);if(!ev.length)return '';
  var c=cityCol(cityOfDate(d));
  var h='<div class="tl">';
  ev.forEach(function(e){
    var lab=e.d.time||SLOTL[e.d.slot]||'';
    h+='<div class="ev"><div class="t">'+esc(lab)+'</div><div class="dot"><span style="border-color:'+c[2]+'"></span></div><div class="c">'+evCard(e,c)+'</div></div>';
  });
  return h+'</div>';
}
function planDetail(pid){
  var p=planOf(pid);if(!p)return '';
  var pd=p.d;
  var steps=(pd.steps||[]).map(function(s){return '<li><span class="grow">'+esc(s.t)+'</span>'+(s.map?mapBtn(s.map):'')+'</li>'}).join('');
  return '<div class="pl"><b>'+esc(pd.title)+'</b><div class="small muted">'+esc(pd.summary||'')+'</div><ul>'+steps+'</ul>'+(pd.note?'<div class="small" style="margin-top:6px;color:#6b4a00">'+esc(pd.note)+'</div>':'')+'</div>';
}
function slotUi(d,sl){
  var ch=choiceOf(d,sl.key),sel=ch?ch.d.plan:null;
  var h='<div><div class="lbl">'+esc(sl.label)+'</div><div class="row" style="align-items:stretch">';
  sl.opts.forEach(function(pid){
    var p=planOf(pid);if(!p)return;
    h+='<button class="plan'+(sel===pid?' on':'')+'" data-act="plan" data-date="'+d+'" data-slot="'+sl.key+'" data-v="'+pid+'" aria-pressed="'+(sel===pid)+'"><span class="row between" style="color:#2b2a1e"><b>'+esc(p.d.n)+'</b>'+(sel===pid?ic('checkc',20,'#2f6e2c'):'')+'</span><span>'+esc(p.d.title)+'</span></button>';
  });
  h+='</div><div class="row" style="margin-top:8px"><button class="btn sm'+(sel==='custom'?' on':'')+'" data-act="plan" data-date="'+d+'" data-slot="'+sl.key+'" data-v="custom">'+ic('pen',16)+'직접 입력</button><button class="btn sm'+(!sel||sel==='none'?' on':'')+'" data-act="plan" data-date="'+d+'" data-slot="'+sl.key+'" data-v="none">선택 안 함</button></div>';
  if(sel==='custom')h+='<div class="pl"><textarea class="fld" data-cust="'+d+'|'+sl.key+'" placeholder="자유롭게 적어두세요 (장소, 메모)" aria-label="직접 입력">'+esc(ch.d.text||'')+'</textarea></div>';
  else if(sel&&sel!=='none')h+=planDetail(sel);
  return h+'</div>';
}
function screenToday(){
  var t=trip();if(!t)return empty();
  var td=today(),vd=clampDate(td),before=td<t.start,after=td>t.end;
  var dates=tripDates(),idx=dates.indexOf(vd)+1;
  var s=stayOf(vd),cid=cityOfDate(vd);
  var dayLabel=before?'D-'+Math.round((parse(t.start)-parse(td))/86400000):(after?'여행 종료':'DAY '+idx+' / '+dates.length);
  var h='<div class="row between"><button class="btn" style="border:0;background:transparent;padding:0;font-weight:700;font-size:14px" data-act="sheet" data-v="trips">'+esc(t.title)+' '+ic('chevd',16)+'</button>'+syncBtn()+'</div>';
  h+='<div class="row between" style="align-items:flex-end"><div><div style="font-family:var(--serif);font-size:38px;font-weight:700;line-height:1.1">'+md(vd)+' <span style="font-size:20px;font-weight:600;color:#645d49">'+wd(vd)+'</span></div><div class="row" style="margin-top:10px">'+cityChip(cid)+(s?'<span class="small muted">'+esc(s.d.name)+'</span>':'')+'</div></div>'+chip(dayLabel,'ln')+'</div>';
  if(UI.keyBad)h+=card('<b>데이터를 불러오지 못했어요</b><div class="small muted" style="margin-top:4px">접근 키가 맞지 않을 수 있어요.</div><button class="btn" style="margin-top:10px" data-act="sheet" data-v="key">키 다시 입력</button>');
  var note=(t.dayNotes||{})[vd];if(note)h+='<div>'+chip(esc(note),'pn')+'</div>';
  // next event
  var ev=eventsOf(vd),next=null;
  if(ev.length){
    if(vd===td){var p=-1;ev.forEach(function(e,i){if(e.d.time&&e.d.time<=nowHM())p=i});next=ev[p+1]||ev[0]}else next=ev[0];
  }
  if(next){
    var d=next.d;
    h+=card('<div class="row between"><span class="small" style="font-weight:700;color:#3a7a2a;letter-spacing:.04em">다음 일정</span>'+(d.time?chip(esc(d.time),'pn'):chip(esc(SLOTL[d.slot]||''),'ln'))+'</div><div style="font-family:var(--serif);font-size:23px;font-weight:700;margin-top:8px">'+esc(d.title)+'</div>'+(d.desc?'<div style="font-size:14px;color:#645d49;margin-top:6px;line-height:1.5">'+esc(d.desc)+'</div>':'')+'<div class="row" style="margin-top:14px">'+(d.map?'<a class="btn pri" style="text-decoration:none" href="'+ea(mapUrl(d.map))+'" target="_blank" rel="noopener">'+ic('pin',18)+'지도에서 열기</a>':'')+(d.nav&&d.map?'<a class="ibtn" style="width:48px;height:48px" aria-label="길찾기(대중교통)" href="'+ea(navUrl(d.map))+'" target="_blank" rel="noopener">'+ic('nav',20)+'</a>':'')+'</div>');
  }
  // weather + branch
  var w=wxOf(vd),conds=ev.filter(function(e){return e.d.cond});
  if(w||conds.length){
    var rec=w?(w.sun?'sun':'cloud'):null,sel=UI.cond[vd]||rec||'sun';
    var inner='<div class="lbl">날씨'+(w?' · '+Math.round(w.tmax)+'°/'+Math.round(w.tmin)+'°'+(w.pp!=null?' · 강수 '+w.pp+'%':''):'')+'</div>';
    if(conds.length){
      inner+=seg('cond',[['sun','맑음','sun'],['cloud','흐림','cloud']],sel,'data-date="'+vd+'"');
      if(rec)inner+='<div class="small muted" style="margin-top:8px">예보 기준 추천: '+(rec==='sun'?'맑음':'흐림')+'</div>';
      conds.filter(function(e){return e.d.cond===sel}).forEach(function(e){inner+='<div style="margin-top:10px;font-size:14px;line-height:1.55"><b>'+esc(e.d.time||'')+' '+esc(e.d.title)+'</b><br><span class="muted">'+esc(e.d.desc||'')+'</span>'+(e.d.link?' <a href="'+ea(e.d.link.url)+'" target="_blank" rel="noopener">'+esc(e.d.link.label)+'</a>':'')+'</div>'});
    }
    h+=card(inner);
  }
  // plans of the day
  var sl=slotsOf(vd);
  if(sl.length){
    var ph='<div class="lbl">오늘의 플랜</div>';
    sl.forEach(function(s){var ch=choiceOf(vd,s.key);var sel=ch&&ch.d.plan;
      if(sel==='custom')ph+='<div style="margin-bottom:8px"><b>'+esc(s.label)+'</b><div class="small">'+esc(ch.d.text||'(비어 있음)')+'</div></div>';
      else if(sel&&sel!=='none')ph+='<div style="margin-bottom:8px"><div class="small muted">'+esc(s.label)+'</div>'+planDetail(sel)+'</div>';
    });
    h+=card(ph);
  }
  // checklist
  var keys=[vd];var items=clItems(vd);if(before)items=items.concat(clItems('pre'));
  var done=items.filter(function(i){return i.done}).length;
  h+=card('<div class="row between" style="margin-bottom:10px"><b style="font-size:15px">'+(before?'출발 전 체크':'오늘 체크리스트')+'</b><span class="small muted">'+done+' / '+items.length+'</span></div>'+bar(items.length?done/items.length*100:0)+'<div style="margin-top:6px">'+items.map(clRow).join('')+'</div>'+clAddRow(before?'pre':vd));
  h+=card('<div class="lbl">이날의 기록 · iikoto 메모</div>'+memoHtml(memosOf(vd)));
  return h;
}
function screenSched(){
  var t=trip();if(!t)return empty();
  var dates=tripDates();
  var d=UI.sched&&dates.indexOf(UI.sched)>=0?UI.sched:clampDate(today());
  UI.sched=d;
  var h=titleBar('일정',md(t.start)+' – '+md(t.end)+' · '+(dates.length-1)+'박 '+dates.length+'일');
  h+='<div class="strip" id="strip">';
  dates.forEach(function(x){
    var ev=eventsOf(x),cs=[cityOfDate(x)];
    var bars=cs.map(function(c){return '<span style="background:'+cityCol(c)[2]+'"></span>'}).join('');
    h+='<button data-act="date" data-v="'+x+'" aria-pressed="'+(x===d)+'" class="'+(x===d?'on':'')+'"><span class="w">'+wd(x)+'</span><span class="d">'+(+x.slice(8))+'</span><span class="b">'+bars+'</span></button>';
  });
  h+='</div>';
  var s=stayOf(d),cid=cityOfDate(d);
  h+='<div class="row" style="min-height:44px">'+cityChip(cid)+(s?'<span class="grow small muted">'+esc(s.d.name)+' · '+md(s.d.checkin)+' – '+md(s.d.checkout)+'</span>':'<span class="grow"></span>')+(s?mapBtn(s.d.map||s.d.name):'')+'</div>';
  var note=(t.dayNotes||{})[d];if(note)h+='<div>'+chip(esc(note),'pn')+'</div>';
  var w=wxOf(d);if(w)h+='<div class="small muted">'+(w.sun?'맑음 예상':'흐림 예상')+' · '+Math.round(w.tmax)+'°/'+Math.round(w.tmin)+'°'+(w.pp!=null?' · 강수 '+w.pp+'%':'')+'</div>';
  h+=timeline(d);
  slotsOf(d).forEach(function(sl){h+=slotUi(d,sl)});
  var ms=memosOf(d);
  h+=card('<div class="lbl">이날의 기록 · iikoto 메모</div>'+memoHtml(ms));
  return h;
}
function screenCheck(){
  var t=trip();if(!t)return empty();
  var all=CL.items,done=all.filter(function(i){return i.done}).length,left=all.length-done;
  var td=today();var tl=all.filter(function(i){return !i.done&&!i.pre&&i.date===td}).length;
  var circ=2*Math.PI*31,off=circ*(all.length?done/all.length:0);
  var ring='<svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="31" fill="none" stroke="#e9e3cf" stroke-width="8"/><circle cx="38" cy="38" r="31" fill="none" stroke="#2f6e2c" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+off.toFixed(1)+' '+circ.toFixed(1)+'" transform="rotate(-90 38 38)"/><text x="38" y="44" text-anchor="middle" font-size="17" font-weight="700" fill="#2b2a1e">'+done+'/'+all.length+'</text></svg>';
  var h=titleBar('체크리스트',null,syncBtn());
  h+=card('<div class="row" style="gap:16px">'+ring+'<div class="grow"><b style="font-size:15px">남은 항목 '+left+'개</b><div class="small muted" style="margin-top:4px">오늘 '+tl+'개 · iikoto 오늘탭 투두와 동기화</div></div></div>');
  h+=seg('clf',[['all','전체'],['today','오늘'],['left','남은 것']],UI.clFilter);
  var f=UI.clFilter;
  function visible(key){var it=clItems(key);if(f==='left')it=it.filter(function(x){return !x.done});return it}
  var pre=visible('pre');
  if(f!=='today'&&(pre.length||f==='all'))h+=clGroup('여행 전','pre',chip(md(preDate())+' · iikoto','ln'));
  tripDates().forEach(function(d){
    if(f==='today'&&d!==td)return;
    var it=visible(d);if(f==='left'&&!it.length)return;
    h+=clGroup(md(d)+' '+wd(d),d,cityChip(cityOfDate(d)));
  });
  return h;
}
function fx(){var t=trip();return (t&&t.fx&&t.fx.JPY)||9}
function amtHtml(e){
  var d=e.d;
  if(d.currency==='JPY')return '<div style="font-size:15px;font-weight:700">¥'+won(d.amount)+'</div><div class="small muted">≈ '+won(d.amount*fx())+'원</div>';
  return '<div style="font-size:15px;font-weight:700">'+won(d.amount)+'원</div>';
}
function screenBudget(){
  var t=trip();if(!t)return empty();
  var krwPaid=0,krwPlan=0,air=0,stay=0,etc=0,jpyPaid=0,jpyPlan=0;
  var items=[];
  M.stays.forEach(function(s){items.push({k:'stay',o:s})});
  M.expenses.forEach(function(e){items.push({k:'exp',o:e})});
  items.forEach(function(x){
    var d=x.o.d;
    if(d.currency==='JPY'){if(d.paid)jpyPaid+=d.amount;else jpyPlan+=d.amount;return}
    if(d.paid){krwPaid+=d.amount;if(x.k==='stay')stay+=d.amount;else if(d.cat==='air')air+=d.amount;else etc+=d.amount}else krwPlan+=d.amount;
  });
  var jpyKrw=jpyPaid*fx();
  var total=air+stay+etc+jpyKrw||1;
  var paidN=items.filter(function(x){return x.o.d.paid}).length;
  var h=titleBar('경비','결제 '+paidN+' / '+items.length+'건');
  h+=card('<div class="lbl" style="margin-bottom:4px">결제 완료 (원화)</div><div style="font-family:var(--serif);font-size:36px;font-weight:700">'+won(krwPaid)+'<span style="font-size:18px;color:#645d49">원</span></div>'+
    '<div class="gantt"><span style="flex:'+air+';background:'+CH[0]+'"></span><span style="flex:'+stay+';background:'+CH[1]+'"></span><span style="flex:'+(etc||0.001)+';background:'+CH[2]+'"></span><span style="flex:'+(jpyKrw||0.001)+';background:'+CH[3]+'"></span></div>'+
    '<div class="legend"><span><i style="background:'+CH[0]+'"></i>항공 '+won(air)+'</span><span><i style="background:'+CH[1]+'"></i>숙소 '+won(stay)+'</span><span><i style="background:'+CH[2]+'"></i>기타 '+won(etc)+'</span><span><i style="background:'+CH[3]+'"></i>현지 ≈'+won(jpyKrw)+'</span></div>'+
    '<div class="row between" style="margin-top:12px;font-size:13px"><span class="muted">현지 지출 (엔화)</span><b>¥'+won(jpyPaid)+' <span class="muted" style="font-weight:400">≈ '+won(jpyKrw)+'원</span></b></div>'+
    (krwPlan||jpyPlan?'<div class="row between" style="margin-top:6px;font-size:13px"><span class="muted">예정</span><b>'+(krwPlan?won(krwPlan)+'원 ':'')+(jpyPlan?'¥'+won(jpyPlan)+' (≈'+won(jpyPlan*fx())+'원)':'')+'</b></div>':'')+
    '<div class="row between" style="margin-top:10px;font-size:13px"><span class="muted">환율 (1엔 = ?원)</span><input class="fld" style="flex:none;width:90px;height:40px;text-align:right" inputmode="decimal" data-fx="1" value="'+fx()+'" aria-label="환율"></div>');
  function iconOf(x){var d=x.o.d;return x.k==='stay'?'bed':(d.cat==='air'?'plane':(d.cat==='sim'?'sim':(d.cat==='transport'?'bus':'tag')))}
  var fixed=items.filter(function(x){return !(x.o.d.currency==='JPY'&&x.o.d.local)});
  fixed.sort(function(a,b){return (a.o.d.currency==='JPY'?1:0)-(b.o.d.currency==='JPY'?1:0)});
  fixed.forEach(function(x){
    var d=x.o.d,c=x.k==='stay'?cityCol(d.city)[2]:null;
    h+=card('<div class="row" style="gap:12px"><span class="ibtn" style="color:#3a7a2a">'+ic(iconOf(x),22)+'</span><div class="grow"><div class="row" style="gap:6px">'+(c?'<i style="width:10px;height:10px;border-radius:50%;background:'+c+';display:inline-block"></i>':'')+'<b style="font-size:15px">'+esc(d.name)+'</b></div><div class="small muted" style="margin-top:3px;line-height:1.45">'+esc(x.k==='stay'?(d.nights+'박 · '+md(d.checkin)+' – '+md(d.checkout)+(d.note?' · '+d.note:'')):(d.note||''))+'</div></div><div style="text-align:right">'+amtHtml(x.o)+'<button class="chip '+(d.paid?'ok':'pn')+'" style="border:0;margin-top:4px" data-act="paid" data-k="'+x.k+'" data-id="'+ea(x.o.cid)+'">'+(d.paid?'결제완료':'예정')+'</button></div></div>','sm');
  });
  return h+localExpenses();
}
function localExpenses(){
  var list=M.expenses.filter(function(e){return e.d.local});
  var byDay={};list.forEach(function(e){(byDay[e.d.date]=byDay[e.d.date]||[]).push(e)});
  var h='<div class="lbl" style="margin:6px 0 0">현지 지출 · 엔화 기준 (추정 원)</div>';
  Object.keys(byDay).sort().forEach(function(d){
    var sum=byDay[d].reduce(function(a,e){return a+e.d.amount},0);
    h+=card('<div class="row between"><b>'+md(d)+' '+wd(d)+'</b><span class="small muted">¥'+won(sum)+' ≈ '+won(sum*fx())+'원</span></div>'+byDay[d].map(function(e){
      return '<div class="ck"><span class="tx">'+esc(e.d.name)+' <span class="small muted">'+esc(ECAT[e.d.ecat]||'')+'</span></span><span>¥'+won(e.d.amount)+'</span><button class="mini" data-act="expdel" data-id="'+ea(e.cid)+'" aria-label="삭제">'+ic('x',16)+'</button></div>';
    }).join(''),'sm');
  });
  if(UI.addExp){
    var t=trip(),dd=clampDate(today());
    h+=card('<div class="lbl">지출 추가 (엔)</div><div class="row"><input class="fld" id="e_amt" inputmode="numeric" placeholder="금액 ¥" aria-label="금액"><input class="fld" id="e_name" placeholder="내용" aria-label="내용"></div><div class="row" style="margin-top:8px"><input class="fld" id="e_date" type="date" value="'+dd+'" aria-label="날짜"><select class="fld" id="e_cat" aria-label="분류">'+Object.keys(ECAT).map(function(k){return '<option value="'+k+'">'+ECAT[k]+'</option>'}).join('')+'</select></div><div class="row" style="margin-top:10px"><button class="btn pri" style="width:auto;flex:1" data-act="exp-save">저장</button><button class="btn" data-act="exp-cancel">취소</button></div>');
  }else h+='<button class="btn" data-act="exp-new">'+ic('plus',16)+'지출 추가</button>';
  return h;
}
function screenSpots(){
  var t=trip();if(!t)return empty();
  var city=UI.spCity||(t.cities[0]&&t.cities[0].id);UI.spCity=city;
  var h=titleBar('스팟','가고 싶은 곳 · 먹을 곳 · 쉴 곳');
  h+=seg('spc',t.cities.map(function(c){return [c.id,c.name]}),city);
  h+='<div class="chips">'+[['all','전체'],['meal','식사'],['cafe','카페'],['sight','명소'],['snack','간식']].map(function(c){return '<button class="btn sm'+(UI.spCat===c[0]?' on':'')+'" data-act="spcat" data-v="'+c[0]+'" aria-pressed="'+(UI.spCat===c[0])+'">'+c[1]+'</button>'}).join('')+'</div>';
  var list=M.spots.filter(function(s){return s.d.city===city&&(UI.spCat==='all'||s.d.cat===UI.spCat)});
  list.forEach(function(s){
    var d=s.d,memo=MEMOS.filter(function(m){return m.text&&m.text.indexOf(d.name)>=0})[0];
    h+=card('<div class="row" style="align-items:flex-start"><div class="grow"><div class="row" style="flex-wrap:wrap"><b style="font-size:16px">'+esc(d.name)+'</b>'+chip(esc(CAT[d.cat]||''),'ln')+(d.tags||[]).map(function(x){return chip(esc(x),'pn')}).join('')+'</div><div class="small muted" style="margin-top:4px;line-height:1.45">'+esc(d.desc||'')+'</div></div>'+mapBtn(d.map||d.name)+navBtn(d.map||d.name)+'</div>'+(memo?'<div class="small" style="margin-top:8px">iikoto 메모 · '+esc(memo.date_key.slice(5))+' · '+esc((memo.text||'').slice(0,60))+'</div>':'')+
      '<div class="seg" style="margin-top:10px">'+STATE.map(function(st){return '<button data-act="sp-state" data-id="'+ea(s.cid)+'" data-v="'+st[0]+'" aria-pressed="'+(d.state===st[0])+'" class="'+(d.state===st[0]?'on':'')+'">'+st[1]+'</button>'}).join('')+'</div>'+
      '<div class="row" style="justify-content:flex-end"><button class="btn" style="border:0;background:transparent;color:#645d49;font-size:12px" data-act="sp-del" data-id="'+ea(s.cid)+'">삭제</button></div>');
  });
  if(!list.length)h+='<div class="muted small" style="text-align:center;padding:10px">이 분류에는 아직 없어요</div>';
  if(UI.addSpot){
    h+=card('<div class="lbl">스팟 추가</div><input class="fld" id="s_name" placeholder="이름" aria-label="이름" style="width:100%"><div class="row" style="margin-top:8px"><select class="fld" id="s_cat" aria-label="분류">'+Object.keys(CAT).map(function(k){return '<option value="'+k+'">'+CAT[k]+'</option>'}).join('')+'</select></div><input class="fld" id="s_desc" placeholder="한 줄 설명 (선택)" aria-label="설명" style="width:100%;margin-top:8px"><div class="row" style="margin-top:10px"><button class="btn pri" style="width:auto;flex:1" data-act="sp-save">저장</button><button class="btn" data-act="sp-cancel">취소</button></div>');
  }else h+='<button class="btn" data-act="sp-new">'+ic('plus',16)+'스팟 추가</button>';
  return h;
}
function empty(){
  return card('<b>여행 데이터가 없어요</b><div class="small muted" style="margin-top:6px">접근 키를 입력하거나 동기화를 눌러보세요.</div><div class="row" style="margin-top:12px"><button class="btn" data-act="sheet" data-v="key">키 입력</button><button class="btn" data-act="sync">동기화</button></div>');
}

/* ---------- sheets ---------- */
function sheetHtml(){
  var v=UI.sheet;if(!v)return '';
  var body='';
  if(v==='key'){
    body='<h1 style="font-size:22px">접근 키</h1><div class="small muted">처음 한 번만 입력하면 이 기기에 저장돼요.</div><input class="fld" id="k_in" type="password" autocomplete="off" placeholder="접근 키" aria-label="접근 키" value="'+ea(cfg.key||'')+'"><div class="row"><button class="btn pri" style="flex:1" data-act="key-save">저장하고 불러오기</button><button class="btn" data-act="sheet-close">닫기</button></div>';
  }else if(v==='trips'){
    var cur=cfg.tripId;
    body='<div class="row between"><h1 style="font-size:22px">내 여행</h1><button class="btn" style="border:0;background:transparent" data-act="sheet-close" aria-label="닫기">'+ic('x',20)+'</button></div>';
    TRIPS.forEach(function(r){var d=r.data||{};body+=card('<div class="row between">'+chip(d.status==='active'?'진행 중':(d.status==='done'?'완료':'계획'),d.status==='active'?'ok':'ln')+(r.trip_id===cur?'<span class="small muted">현재</span>':'')+'</div><div style="font-family:var(--serif);font-size:22px;font-weight:700;margin-top:8px">'+esc(d.title||r.trip_id)+'</div><div class="small muted" style="margin-top:4px">'+esc((d.start||'')+' – '+(d.end||''))+'</div>'+(r.trip_id===cur?'':'<button class="btn pri" style="margin-top:12px" data-act="trip-open" data-id="'+ea(r.trip_id)+'">열기</button>'))});
    body+=card('<b style="font-size:15px">새 여행 만들기</b><div class="small muted" style="margin-top:4px">템플릿·복제는 다녀온 뒤 추가할 예정이에요. 지금은 가져오기로 만들 수 있어요.</div>');
    body+=card('<div class="lbl">백업 · 복원</div><div class="row"><button class="btn" data-act="export">'+ic('dl',16)+'백업 내보내기</button><label class="btn" style="cursor:pointer">'+ic('ul',16)+'가져오기<input type="file" id="imp" accept="application/json,.json" style="display:none"></label></div>');
    body+=card('<div class="row between"><span class="small muted">앱 버전 '+VER+'</span><button class="btn" data-act="sheet" data-v="key">키 변경</button></div>');
  }
  return '<div class="sheetwrap" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true">'+body+'</div></div>';
}

/* ---------- render ---------- */
var TABS=[['today','오늘','sun'],['sched','일정','cal'],['check','체크','chk'],['budget','경비','wal'],['spots','스팟','pin']];
function render(){
  var sc=document.getElementById('screen'),y=window.scrollY;
  var h='';
  try{
    if(!M)h=empty();
    else if(UI.tab==='today')h=screenToday();
    else if(UI.tab==='sched')h=screenSched();
    else if(UI.tab==='check')h=screenCheck();
    else if(UI.tab==='budget')h=screenBudget();
    else h=screenSpots();
  }catch(e){console.error(e);h=card('<b>화면을 그리지 못했어요</b><div class="small muted">'+esc(e.message)+'</div>')}
  sc.innerHTML=h;
  document.getElementById('tabbar').innerHTML=TABS.map(function(t){return '<button data-act="tab" data-v="'+t[0]+'" class="'+(UI.tab===t[0]?'on':'')+'" aria-current="'+(UI.tab===t[0]?'page':'false')+'"><span class="pill">'+ic(t[2],22,UI.tab===t[0]?'#2f6e2c':'#645d49',UI.tab===t[0]?2:1.7)+'</span>'+t[1]+'</button>'}).join('');
  document.getElementById('sheet').innerHTML=sheetHtml();
  if(UI.edit){var ei=document.querySelector('input.edit');if(ei&&document.activeElement!==ei){ei.focus();ei.select()}}
  window.scrollTo(0,y);
}

/* ---------- actions ---------- */
function findCl(id){for(var i=0;i<CL.items.length;i++){if(CL.items[i].id===id)return CL.items[i]}return null}
function commitEdit(id,val){
  if(UI.edit!==id)return;
  val=(val||'').trim();var it=findCl(id);
  if(it&&val&&val!==it.t){it.t=val;tdUpd(it,{text:val})}
  UI.edit=null;render();
}
function addCl(key,val){
  val=(val||'').trim();if(!val)return;
  var it={id:newClId(key),date:clDate(key),pre:key==='pre',t:val,done:false,created:Date.now()};
  CL.items.push(it);tdAdd(it);render();
  var ni=document.querySelector('input[data-add="'+key+'"]');if(ni)ni.focus();
}
function setChoice(d,slot,v){
  var k=d+'|'+slot,ch=M.choices[k];
  if(!ch){ch={cid:'choice_'+d+'_'+slot,date:d,sort:0,d:{slot:slot,plan:v,text:''}};M.choices[k]=ch}
  else ch.d.plan=v;
  tiUp('choice',ch);render();
}
function onClick(e){
  var el=e.target.closest('[data-act]');if(!el)return;
  var a=el.getAttribute('data-act'),v=el.getAttribute('data-v'),id=el.getAttribute('data-id');
  if(a==='sheet-bg'){if(e.target===el){UI.sheet=null;render()}return}
  switch(a){
    case 'tab':UI.tab=v;lset('tab',v);render();window.scrollTo(0,0);break;
    case 'sheet':UI.sheet=v;render();break;
    case 'sheet-close':UI.sheet=null;render();break;
    case 'sync':pull(true).then(function(){toast('동기화했어요')});break;
    case 'date':UI.sched=v;render();break;
    case 'cond':UI.cond[el.getAttribute('data-date')]=v;render();break;
    case 'plan':setChoice(el.getAttribute('data-date'),el.getAttribute('data-slot'),v);break;
    case 'clf':UI.clFilter=v;render();break;
    case 'ck':{var it=findCl(id);if(it){it.done=el.checked;it.completedAt=it.done?Date.now():null;tdUpd(it,{done:it.done,completed_at:it.completedAt});render()}break}
    case 'edit':UI.edit=id;render();break;
    case 'edit-ok':{var inp=document.querySelector('input.edit');commitEdit(id,inp?inp.value:'');break}
    case 'del':{var it2=findCl(id);if(it2){CL.items=CL.items.filter(function(x){return x.id!==id});tdDel(it2);render()}break}
    case 'add':{var key=el.getAttribute('data-key'),ai=document.querySelector('input[data-add="'+key+'"]');addCl(key,ai?ai.value:'');break}
    case 'paid':{var arr=el.getAttribute('data-k')==='stay'?M.stays:M.expenses;arr.forEach(function(o){if(o.cid===id){o.d.paid=!o.d.paid;tiUp(el.getAttribute('data-k')==='stay'?'stay':'expense',o)}});render();break}
    case 'exp-new':UI.addExp=true;render();break;
    case 'exp-cancel':UI.addExp=false;render();break;
    case 'exp-save':{
      var amt=parseInt((document.getElementById('e_amt').value||'').replace(/[^0-9]/g,''),10),nm=(document.getElementById('e_name').value||'').trim();
      if(!amt){toast('금액을 입력해 주세요');break}
      var o={cid:'exp_'+genCid(),date:document.getElementById('e_date').value||today(),sort:Date.now()%100000000,d:{cat:'local',name:nm||'지출',amount:amt,currency:'JPY',paid:true,local:true,date:document.getElementById('e_date').value||today(),ecat:document.getElementById('e_cat').value}};
      M.expenses.push(o);tiUp('expense',o);UI.addExp=false;render();break}
    case 'expdel':{var ex=M.expenses.filter(function(x){return x.cid===id})[0];if(ex){M.expenses=M.expenses.filter(function(x){return x.cid!==id});tiDel(ex);render()}break}
    case 'spc':UI.spCity=v;render();break;
    case 'spcat':UI.spCat=v;render();break;
    case 'sp-state':M.spots.forEach(function(s){if(s.cid===id){s.d.state=v;tiUp('spot',s)}});render();break;
    case 'sp-del':{var sp=M.spots.filter(function(x){return x.cid===id})[0];if(sp){M.spots=M.spots.filter(function(x){return x.cid!==id});tiDel(sp);render()}break}
    case 'sp-new':UI.addSpot=true;render();break;
    case 'sp-cancel':UI.addSpot=false;render();break;
    case 'sp-save':{
      var nm2=(document.getElementById('s_name').value||'').trim();if(!nm2){toast('이름을 입력해 주세요');break}
      var so={cid:'spot_'+genCid(),date:null,sort:Date.now()%100000000,d:{city:UI.spCity,cat:document.getElementById('s_cat').value,name:nm2,desc:(document.getElementById('s_desc').value||'').trim(),state:'cand',map:nm2}};
      M.spots.push(so);tiUp('spot',so);UI.addSpot=false;render();break}
    case 'key-save':{
      var k=(document.getElementById('k_in').value||'').trim();if(!k){toast('키를 입력해 주세요');break}
      cfg.key=k;lset('cfg',cfg);UI.sheet=null;UI.keyBad=false;
      loadTrips().then(function(){loadTrip();return pull(true)}).then(function(){render();toast(M?'불러왔어요':'데이터를 찾지 못했어요')});break}
    case 'trip-open':{cfg.tripId=id;lset('cfg',cfg);UI.sheet=null;loadTrip();render();pull(true);break}
    case 'export':doExport();break;
  }
}
function onChange(e){
  var el=e.target;
  if(el.matches&&el.matches('input[data-act="ck"]'))return onClick({target:el});
  if(el.id==='imp'){doImport(el.files&&el.files[0]);return}
  if(el.hasAttribute('data-cust')){
    var p=el.getAttribute('data-cust').split('|'),ch=M.choices[p[0]+'|'+p[1]];
    if(ch){ch.d.text=el.value;tiUp('choice',ch)}return;
  }
  if(el.hasAttribute('data-fx')){
    var f=parseFloat(String(el.value).replace(',','.'));
    if(f>0){trip().fx=trip().fx||{};trip().fx.JPY=f;tiUp('trip',M.trip);render()}else toast('환율을 숫자로 입력해 주세요');
  }
}
function onKey(e){
  var el=e.target;
  if(e.key==='Enter'&&!e.isComposing){
    if(el.hasAttribute&&el.hasAttribute('data-add')){e.preventDefault();addCl(el.getAttribute('data-add'),el.value)}
    else if(el.classList&&el.classList.contains('edit')){e.preventDefault();commitEdit(el.getAttribute('data-id'),el.value)}
  }else if(e.key==='Escape'&&el.classList&&el.classList.contains('edit')){UI.edit=null;render()}
}
function onBlur(e){var el=e.target;if(el.classList&&el.classList.contains('edit'))commitEdit(el.getAttribute('data-id'),el.value)}

/* ---------- backup ---------- */
function doExport(){
  if(!M){toast('내보낼 데이터가 없어요');return}
  var data={format:'triplog-backup',version:1,exportedAt:new Date().toISOString(),trip_id:cfg.tripId,rows:modelRows(),checklist:CL.items,memos_note:'memos는 iikoto 원본이라 포함하지 않아요'};
  var txt=JSON.stringify(data,null,1),name='triplog-'+cfg.tripId+'-'+today()+'.json';
  try{
    var blob=new Blob([txt],{type:'application/json'});var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){document.body.removeChild(a)},500);
    toast('백업 파일을 만들었어요');
  }catch(e){toast('내보내기에 실패했어요')}
}
function doImport(file){
  if(!file)return;
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var j=JSON.parse(rd.result);
      if(j.format!=='triplog-backup'||!j.rows||!j.trip_id)throw new Error('형식이 달라요');
      var rows=j.rows.map(function(r){return {trip_id:j.trip_id,kind:r.kind,client_id:r.client_id,date_key:r.date_key||null,sort_order:r.sort_order||0,data:r.data||{}}});
      sf('trip_items?on_conflict=trip_id,client_id','POST',rows,'resolution=merge-duplicates,return=minimal').then(function(ok){
        if(!ok){toast('가져오기에 실패했어요');return}
        var td=(j.checklist||[]).map(function(it){return {date_key:it.date,text:it.t,done:!!it.done,created:it.created,client_id:it.id,time_section:'none',cat:'todo',completed_at:it.completedAt||null,is_event:false}});
        var p=td.length?sf('todos?on_conflict=date_key,client_id','POST',td,'resolution=ignore-duplicates,return=minimal'):Promise.resolve(true);
        return p.then(function(){cfg.tripId=j.trip_id;lset('cfg',cfg);loadTrips().then(function(){loadTrip();return pull(true)}).then(function(){UI.sheet=null;render();toast('가져왔어요')})});
      });
    }catch(e){toast('가져오기 실패: '+e.message)}
  };
  rd.readAsText(file);
}

/* ---------- boot ---------- */
function boot(){
  var app=document.getElementById('app');
  document.addEventListener('click',onClick);
  document.addEventListener('change',onChange);
  document.addEventListener('keydown',onKey);
  document.addEventListener('focusout',onBlur);
  loadTrip();
  render();
  if(!cfg.key){UI.sheet='key';render()}
  else{
    loadTrips().then(function(){if(!M)loadTrip();render();return pull(true)});
  }
  document.addEventListener('visibilitychange',function(){if(!document.hidden)pull()});
  window.addEventListener('online',function(){pull(true)});
  setInterval(function(){if(!document.hidden)pull()},90000);
  if('serviceWorker' in navigator&&/\/triplog\//.test(location.pathname)){
    navigator.serviceWorker.register('triplog-sw.js?v='+VER,{scope:'./'}).catch(function(){});
  }
}
window.__triplog={pull:pull,flush:flush,state:function(){return {UI:UI,M:M,CL:CL,Q:Q,cfg:cfg}},render:render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
