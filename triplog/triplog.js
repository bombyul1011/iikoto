(function(){
'use strict';
var VER='2026.10.06-10';
var SUPA_URL='https://vqvpzrxmtpryzhontlxc.supabase.co';
var SUPA_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdnB6cnhtdHByeXpob250bHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNTgxMjksImV4cCI6MjA5NjYzNDEyOX0.pbtq1UMPC7ylYM1H2xVa19C1TFlceLmEfEtkz3WK2VI';
var LSP='triplog:';
function lget(k,d){try{var v=localStorage.getItem(LSP+k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function lset(k,v){try{localStorage.setItem(LSP+k,JSON.stringify(v))}catch(e){}}
var CITYC=[['rgb(142,51,51)','rgba(230,126,126,.52)','rgba(205,95,95,.85)','rgba(205,95,95,.55)'],['rgb(41,97,130)','rgba(170,208,228,.55)','rgba(75,145,180,.85)','rgba(75,145,180,.55)'],['rgb(34,103,68)','rgba(145,210,175,.55)','rgba(70,155,110,.85)','rgba(70,155,110,.55)'],['rgb(147,71,14)','rgba(255,190,130,.58)','rgba(235,130,50,.85)','rgba(235,130,50,.55)'],['rgb(165,55,97)','rgba(255,175,200,.38)','rgba(214,90,140,.85)','rgba(214,90,140,.55)'],['rgb(81,103,29)','rgba(200,220,140,.55)','rgba(135,165,60,.85)','rgba(135,165,60,.55)']];
var CH=['rgba(75,145,180,.8)','rgba(160,105,180,.8)','rgba(235,130,50,.8)','rgba(235,180,20,.8)'];
var CAT={meal:'식사',cafe:'카페',sight:'명소',snack:'간식'};
var STATE=[['go','갈 곳'],['done','다녀옴']];
var SLOTL={am:'오전',noon:'점심',pm:'오후',eve:'저녁'};
var ECAT={food:'식사',cafe:'카페',move:'교통',shop:'쇼핑',entry:'입장',etc:'기타'};
var ECATI={food:'tools-kitchen-2',cafe:'coffee',move:'train',shop:'shopping-bag',entry:'ticket',etc:'dots'};
var PAY={cash:['현금','cash'],card:['카드','credit-card'],ic:['교통카드','nfc']};
var TI={sun:'sun',cal:'calendar',chk:'list-check',wal:'wallet',pin:'map-pin',nav:'navigation',chevd:'chevron-down',chevr:'chevron-right',chevl:'chevron-left',plus:'plus',pen:'pencil',x:'x',check:'check',cloud:'cloud',cloudok:'cloud-check',cloudoff:'cloud-off',refresh:'refresh',ext:'external-link',plane:'plane',bed:'bed',sim:'device-sim',bus:'bus',tag:'tag',checkc:'circle-check',trash:'trash',dl:'download',ul:'upload',clock:'clock',notes:'notes',calplus:'calendar-plus'};
function ic(n,s,c){return '<i class="ti ti-'+(TI[n]||n)+'" aria-hidden="true" style="font-size:'+(s||20)+'px;'+(c?'color:'+c+';':'')+'"></i>'}
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
var UI={tab:lget('tab','today'),sched:null,clFilter:'today',spCity:null,spCat:'all',cond:{},sheet:null,edit:null,status:'',keyBad:false,addExp:false,addSpot:false,vd:null,addTs:{},editVal:null,timeEdit:null,evTimeEdit:null,expDraft:null,evDraft:null,payDraft:null,spDraft:null,wkAnim:null,undoFn:null,toastT:null};
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
      else p=sf('todos?on_conflict=date_key,client_id','POST',[{date_key:clDate(clKey(it)),text:it.t,done:!!it.done,created:it.created,client_id:it.id,time_section:it.ts||'none',cat:'todo',completed_at:it.done?(it.completedAt||Date.now()):null,is_event:false}],'resolution=ignore-duplicates,return=minimal');
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
  if(UI.status==='sync')return ic('refresh',16,'var(--sub)')+'동기화 중';
  if(UI.status==='off'||q)return ic('cloudoff',16,'var(--sub)')+'오프라인'+(q?' · 대기 '+q+'건':'');
  if(UI.keyBad)return ic('cloudoff',16,'rgb(142,51,51)')+'키 확인 필요';
  var d=new Date();return ic('cloudok',16,'var(--sel-tx)')+'iikoto 동기화됨 '+pad(d.getHours())+':'+pad(d.getMinutes());
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
        setStatus();render();pullWeather();fetchFx();
      });
    });
  });
}
function pullTodos(){
  return sf('todos?client_id=like.'+enc(prefix())+'*&select=client_id,date_key,text,done,created,completed_at,time_section&order=created').then(function(rows){
    if(!rows)return;
    var pre=prefix()+'pre_';
    CL.items=rows.map(function(r){var isPre=r.client_id.indexOf(pre)===0;return {id:r.client_id,date:r.date_key,pre:isPre,t:r.text,ts:r.time_section||'none',done:!!r.done,created:r.created,completedAt:r.completed_at}});
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
function cityChip(id){var c=cityCol(id);return chip(esc(cityName(id)),'','color:'+c[0]+';background:'+c[1]+';border-color:'+c[3])}
function mapBtn(q){return q?'<a class="ibtn" aria-label="지도에서 열기" href="'+ea(mapUrl(q))+'" target="_blank" rel="noopener">'+ic('pin',20)+'</a>':''}
function icoMap(q){return q?'<a class="ico" aria-label="지도에서 열기" href="'+ea(mapUrl(q))+'" target="_blank" rel="noopener">'+ic('pin',17)+'</a>':''}
function icoNav(q){return q?'<a class="ico" aria-label="길찾기(대중교통)" href="'+ea(navUrl(q))+'" target="_blank" rel="noopener">'+ic('nav',17)+'</a>':''}
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
  if(!list.length)return '<div class="small muted">iikoto에서 쓴 메모가 여기에 시간순으로 보여요. (읽기 전용)</div>';
  return list.slice().sort(function(a,b){var x=String(a.memo_time||'99:99'),y=String(b.memo_time||'99:99');return x<y?-1:(x>y?1:0)}).map(function(m){
    var img=m.photo_url&&/^https?:/.test(m.photo_url)?'<img loading="lazy" alt="메모 사진" src="'+ea(m.photo_url)+'">':'';
    return '<div class="mrow"><div class="mt">'+esc(m.memo_time||'')+'</div><div class="mb">'+(m.question?'<div class="small muted" style="margin-bottom:2px">'+esc(m.question)+'</div>':'')+esc(m.text||'').replace(/\n/g,'<br>')+img+'</div></div>';
  }).join('');
}
function toast(t){var el=document.getElementById('toast');el.innerHTML='<div class="toast">'+esc(t)+'</div>';clearTimeout(UI.toastT);UI.toastT=setTimeout(function(){el.innerHTML=''},2200)}
function toastUndo(t,fn){var el=document.getElementById('toast');UI.undoFn=fn;el.innerHTML='<div class="toast"><span>'+esc(t)+'</span><button class="tundo" data-act="undo">되돌리기</button></div>';clearTimeout(UI.toastT);UI.toastT=setTimeout(function(){el.innerHTML='';UI.undoFn=null},5000)}

/* ---------- checklist helpers ---------- */
var TSO={morning:0,afternoon:1,night:2,none:3};
var TSL={morning:'오전',afternoon:'오후',night:'저녁',none:'미정'};
function clItems(key){return CL.items.filter(function(it){return clKey(it)===key})}
function hhmm(ms){var d=new Date(ms);return pad(d.getHours())+':'+pad(d.getMinutes())}
function setTimeOnly(baseMs,v){var d=new Date(baseMs),p=v.split(':');d.setHours(+p[0],+p[1],0,0);return d.getTime()}
function tsChips(act,key,sel,extra){
  return '<div class="tsc">'+['morning','afternoon','night','none'].map(function(v){
    return '<button class="tschip tsb ts-'+v+(sel===v?' on':'')+'" data-act="'+act+'" data-v="'+v+'"'+(key?' data-key="'+ea(key)+'"':'')+(extra||'')+' aria-pressed="'+(sel===v)+'">'+TSL[v]+'</button>';
  }).join('')+'</div>';
}
function clRow(it,ro){
  if(ro){
    var ctr=(it.done&&it.completedAt)?'<span class="ct">'+hhmm(it.completedAt)+'</span>':'';
    return '<div class="ck ro'+(it.done?' done':'')+'"><input type="checkbox" disabled '+(it.done?'checked':'')+' aria-label="'+ea(it.t)+'"><span class="tx">'+esc(it.t)+'</span>'+ctr+'</div>';
  }
  if(UI.edit===it.id){
    var val=UI.editVal!=null?UI.editVal:it.t;
    return '<div class="ckedit"><div class="ck" style="border-bottom:0"><input type="checkbox" disabled aria-hidden="true"><input class="edit" data-id="'+ea(it.id)+'" value="'+ea(val)+'" aria-label="항목 수정"><button class="mini" data-act="edit-ok" data-id="'+ea(it.id)+'" aria-label="저장">'+ic('check',18)+'</button></div>'+tsChips('edits',null,it.ts||'none',' data-id="'+ea(it.id)+'"')+'</div>';
  }
  var ct='';
  if(it.done&&it.completedAt){
    ct=UI.timeEdit===it.id
      ?'<input type="time" class="ctin" data-id="'+ea(it.id)+'" value="'+hhmm(it.completedAt)+'" aria-label="완료 시각">'
      :'<button class="ct" data-act="ctime" data-id="'+ea(it.id)+'" aria-label="완료 시각 수정">'+hhmm(it.completedAt)+'</button>';
  }
  return '<div class="ck'+(it.done?' done':'')+'"><input type="checkbox" data-act="ck" data-id="'+ea(it.id)+'" '+(it.done?'checked':'')+' aria-label="'+ea(it.t)+'"><span class="tx">'+esc(it.t)+'</span>'+ct+'<button class="mini" data-act="edit" data-id="'+ea(it.id)+'" aria-label="수정">'+ic('pen',16)+'</button><button class="mini" data-act="del" data-id="'+ea(it.id)+'" aria-label="삭제">'+ic('x',16)+'</button></div>';
}
function clList(items,ro){
  var und=items.filter(function(i){return !i.done}).sort(function(a,b){
    var d=TSO[a.ts||'none']-TSO[b.ts||'none'];return d||((a.created||0)-(b.created||0));
  });
  var dn=items.filter(function(i){return i.done}).sort(function(a,b){return (a.completedAt||Infinity)-(b.completedAt||Infinity)});
  var secs={};und.forEach(function(i){secs[i.ts||'none']=1});
  var ks=Object.keys(secs),multi=ks.length>1||(ks.length===1&&ks[0]!=='none');
  var h='',cur=null;
  und.forEach(function(i){var sc=i.ts||'none';if(multi&&sc!==cur){h+='<div class="tshead ts-'+sc+'">'+TSL[sc]+'</div>';cur=sc}h+=clRow(i,ro)});
  return h+dn.map(function(i){return clRow(i,ro)}).join('');
}
function clAddRow(key){
  var sel=UI.addTs[key]||'none';
  return '<div class="addrow"><input data-add="'+ea(key)+'" placeholder="+ 항목 추가" aria-label="항목 추가"><button class="btn" data-act="add" data-key="'+ea(key)+'">추가</button></div>'+tsChips('adds',key,sel);
}
function clGroup(label,key,chp){
  return card('<div class="row between" style="margin-bottom:4px"><b style="font-size:14px">'+esc(label)+'</b>'+(chp||'')+'</div>'+clList(clItems(key))+clAddRow(key));
}

/* ---------- screens ---------- */
function eventsOf(d){return (M&&M.events[d])||[]}
function slotsOf(d){var t=trip();return (t&&t.planSlots&&t.planSlots[d])||[]}
function choiceOf(d,slot){return M&&M.choices[d+'|'+slot]||null}
function planOf(id){return M&&M.plans[id]||null}
function findEvent(cid){var r=null;Object.keys(M.events).forEach(function(d){M.events[d].forEach(function(e){if(e.cid===cid)r=e})});return r}
function evBody(e){
  var d=e.d;
  var tags=(d.tags||[]).map(function(t){return chip(esc(t),'pn')}).join(' ');
  var link=d.link?'<a class="small" style="display:inline-flex;align-items:center;gap:4px;min-height:36px;font-weight:700" href="'+ea(d.link.url)+'" target="_blank" rel="noopener">'+ic('ext',14)+esc(d.link.label)+'</a>':'';
  var edit='';
  if(UI.evTimeEdit===e.cid&&d.doneAt)edit='<div class="row" style="margin-top:8px"><span class="small muted">완료 시각</span><input type="time" class="evtin" data-id="'+ea(e.cid)+'" value="'+hhmm(d.doneAt)+'" aria-label="완료 시각"></div>';
  return '<div class="row" style="align-items:flex-start;gap:4px"><div class="grow"><h3 style="margin:0;font-size:15px;line-height:1.35">'+esc(d.title)+'</h3>'+(d.desc?'<p style="margin:3px 0 0;font-size:13px;color:var(--sub);line-height:1.45">'+esc(d.desc)+'</p>':'')+(tags?'<div class="chips" style="margin-top:8px">'+tags+'</div>':'')+(d.alt?'<p style="margin:6px 0 0;font-size:12px;color:var(--sub)">'+esc(d.alt)+'</p>':'')+spentLine(e.cid)+link+edit+'</div><div class="icos"><button class="ico" data-act="evedit" data-id="'+ea(e.cid)+'" aria-label="일정 수정">'+ic('pen',16)+'</button>'+(d.map?icoMap(d.map):'')+(d.nav&&d.map?icoNav(d.map):'')+'</div></div>';
}
function evRow(e,cc){
  var d=e.d,done=!!d.done;
  var lab=done&&d.doneAt?hhmm(d.doneAt):(d.time||SLOTL[d.slot]||'');
  var tcol=(done&&d.doneAt)?'<button class="evt done" data-act="evtime" data-id="'+ea(e.cid)+'" aria-label="완료 시각 수정">'+esc(lab)+'</button>':'<button class="evt" disabled tabindex="-1" aria-hidden="true">'+esc(lab)+'</button>';
  return '<div class="ev" style="--cc:'+cc[2]+'">'+tcol+'<button class="evdot" data-act="evck" data-id="'+ea(e.cid)+'" aria-pressed="'+done+'" aria-label="'+ea(d.title)+' 완료"><span class="dotv"></span></button><div class="c"><div class="card sm'+(done?' evdone':'')+'">'+evBody(e)+'</div></div></div>';
}
function memoEv(m){
  var img=m.photo_url&&/^https?:/.test(m.photo_url)?'<img loading="lazy" alt="메모 사진" src="'+ea(m.photo_url)+'">':'';
  return '<div class="ev mev"><button class="evt" disabled tabindex="-1" aria-hidden="true">'+esc(m.memo_time||'')+'</button><span class="evdot memodot"><span class="mdot"></span></span><div class="c"><div class="memoc">'+ic('notes',14)+'<span>'+esc(m.text||'').replace(/\n/g,'<br>')+'</span>'+img+'</div></div></div>';
}
function effTimes(ev){
  var def={am:'09:00',noon:'12:00',pm:'15:00',eve:'19:00'},prev='00:00',out=[];
  ev.forEach(function(e){var t=e.d.time||def[e.d.slot]||prev;if(t<prev)t=prev;out.push(t);prev=t});
  return out;
}
function timelineHtml(d){
  var ev=eventsOf(d),ms=memosOf(d).slice().sort(function(a,b){var x=String(a.memo_time||'99:99'),y=String(b.memo_time||'99:99');return x<y?-1:(x>y?1:0)});
  if(!ev.length&&!ms.length)return '';
  var cc=cityCol(cityOfDate(d)),eff=effTimes(ev),mi=0,h='<div class="tl">';
  function pushMemos(limit){while(mi<ms.length&&(limit==null||String(ms[mi].memo_time||'99:99')<limit)){h+=memoEv(ms[mi]);mi++}}
  ev.forEach(function(e,i){pushMemos(eff[i]);h+=evRow(e,cc)});
  pushMemos(null);
  return h+'</div>';
}
function planDetail(pid){
  var p=planOf(pid);if(!p)return '';
  var pd=p.d;
  var steps=(pd.steps||[]).map(function(s){return '<li><span class="grow">'+esc(s.t)+'</span>'+(s.map?icoMap(s.map):'')+'</li>'}).join('');
  return '<div class="pl"><b>'+esc(pd.title)+'</b><div class="small muted">'+esc(pd.summary||'')+'</div><ul>'+steps+'</ul>'+(pd.note?'<div class="small" style="margin-top:6px;color:var(--yel-tx)">'+esc(pd.note)+'</div>':'')+'</div>';
}
function slotUi(d,sl){
  var ch=choiceOf(d,sl.key),sel=ch?ch.d.plan:null;
  var h='<div><div class="lbl">'+esc(sl.label)+'</div><div class="row" style="align-items:stretch">';
  sl.opts.forEach(function(pid){
    var p=planOf(pid);if(!p)return;
    h+='<button class="plan'+(sel===pid?' on':'')+'" data-act="plan" data-date="'+d+'" data-slot="'+sl.key+'" data-v="'+pid+'" aria-pressed="'+(sel===pid)+'"><span class="row between" style="color:var(--tx)"><b>'+esc(p.d.n)+'</b>'+(sel===pid?ic('checkc',20,'var(--sel-tx)'):'')+'</span><span>'+esc(p.d.title)+'</span></button>';
  });
  h+='</div><div class="row" style="margin-top:8px"><button class="btn sm'+(sel==='custom'?' on':'')+'" data-act="plan" data-date="'+d+'" data-slot="'+sl.key+'" data-v="custom">'+ic('pen',16)+'직접 입력</button><button class="btn sm'+(!sel||sel==='none'?' on':'')+'" data-act="plan" data-date="'+d+'" data-slot="'+sl.key+'" data-v="none">선택 안 함</button></div>';
  if(sel==='custom')h+='<div class="pl"><textarea class="fld" data-cust="'+d+'|'+sl.key+'" placeholder="자유롭게 적어두세요 (장소, 메모)" aria-label="직접 입력">'+esc(ch.d.text||'')+'</textarea></div>';
  else if(sel&&sel!=='none')h+=planDetail(sel);
  return h+'</div>';
}
function viewDate(){return clampDate(UI.vd||today())}
function periodOf(t){
  var m=String(t||'').match(/^(\d{1,2}):(\d{2})/);if(!m)return 'afternoon';
  var v=(+m[1])*60+(+m[2]);
  if(v>=7*60&&v<12*60)return 'morning';
  if(v>=12*60&&v<18*60)return 'afternoon';
  return 'night';
}
function wxLine(d){
  var w=wxOf(d);if(!w)return '';
  return '<div class="wxl">'+ic(w.sun?'sun':'cloud',14)+(w.sun?'맑음':'흐림')+' '+Math.round(w.tmax)+'°/'+Math.round(w.tmin)+'°'+(w.pp!=null?' · 강수 '+w.pp+'%':'')+'</div>';
}
function ctitle(t,right){return '<div class="ctitle"><b>'+t+'</b>'+(right?'<span class="cinfo">'+right+'</span>':'')+'</div>'}
function screenToday(){
  var t=trip();if(!t)return empty();
  var td=today(),vd=viewDate(),before=td<t.start,after=td>t.end;
  var dates=tripDates(),idx=dates.indexOf(vd)+1,N=dates.length;
  var s=stayOf(vd),cid=cityOfDate(vd);
  var dayLabel=(before&&vd===t.start)?'D-'+Math.round((parse(t.start)-parse(td))/86400000):(after&&vd===t.end?'여행 종료':'DAY '+idx+' / '+N);
  var h='<div class="row between"><button class="btn" style="border:0;background:transparent;padding:0;font-weight:700;font-size:14px" data-act="sheet" data-v="trips">'+esc(t.title)+' '+ic('chevd',16)+'</button>'+syncBtn()+'</div>';
  h+='<div class="row between" style="align-items:flex-start"><div><div class="dtitle"><button class="dnav'+(idx<=1?' off':'')+'" data-act="dprev" aria-label="전날">'+ic('chevl',18)+'</button><span class="dnum"><span class="dgr'+(vd===td?' on':'')+'">'+md(vd)+'</span> <span class="dwd">'+wd(vd)+'</span></span><button class="dnav'+(idx>=N?' off':'')+'" data-act="dnext" aria-label="다음날">'+ic('chevr',18)+'</button></div>'+
    '<div class="row" style="margin-top:4px">'+cityChip(cid)+(s?'<span class="small muted">'+esc(s.d.name)+'</span>':'')+'</div></div><div class="hdr-r">'+chip(dayLabel,'ln')+wxLine(vd)+'</div></div>';
  if(UI.keyBad)h+=card('<b>데이터를 불러오지 못했어요</b><div class="small muted" style="margin-top:4px">접근 키가 맞지 않을 수 있어요.</div><button class="btn" style="margin-top:10px" data-act="sheet" data-v="key">키 다시 입력</button>');
  var note=(t.dayNotes||{})[vd];if(note)h+='<div>'+chip(esc(note),'pn')+'</div>';
  var ev=eventsOf(vd),next=null;
  var pend=ev.filter(function(e){return !e.d.done});
  if(pend.length){
    if(vd===td){var p=-1;pend.forEach(function(e,i){if(e.d.time&&e.d.time<=nowHM())p=i});next=pend[p+1]||pend[0]}else next=pend[0];
  }else if(ev.length)next=ev[ev.length-1];
  if(next){
    var d=next.d;
    var tm=d.time?ic('clock',13)+' '+esc(d.time):esc(SLOTL[d.slot]||'');
    var per=periodOf(d.time||SLOTDEF[d.slot]||'12:00');
    h+='<div class="card bn bn-'+per+'">'+ctitle('다음 일정',tm)+'<div style="font-family:var(--serif);font-size:23px;font-weight:700;line-height:1.3;color:var(--bn-t)">'+esc(d.title)+'</div>'+(d.desc?'<div style="font-size:14px;color:var(--bn-s);margin-top:6px;line-height:1.5">'+esc(d.desc)+'</div>':'')+
      ((d.map)?'<div class="row" style="margin-top:14px"><a class="btn" style="flex:1;text-decoration:none" href="'+ea(mapUrl(d.map))+'" target="_blank" rel="noopener">'+ic('pin',17)+'지도에서 열기</a>'+(d.nav?'<a class="ibtn" aria-label="길찾기(대중교통)" href="'+ea(navUrl(d.map))+'" target="_blank" rel="noopener">'+ic('nav',20)+'</a>':'')+'</div>':'')+'</div>';
  }
  var w=wxOf(vd),conds=ev.filter(function(e){return e.d.cond});
  if(conds.length){
    var rec=w?(w.sun?'sun':'cloud'):null,sel=UI.cond[vd]||rec||'sun';
    var inner=ctitle('날씨에 따라',rec?'예보 추천 · '+(rec==='sun'?'맑음':'흐림'):'')+seg('cond',[['sun','맑음','sun'],['cloud','흐림','cloud']],sel,'data-date="'+vd+'"');
    conds.filter(function(e){return e.d.cond===sel}).forEach(function(e){inner+='<div style="margin-top:10px;font-size:14px;line-height:1.55"><b>'+esc(e.d.time||'')+' '+esc(e.d.title)+'</b><br><span class="muted">'+esc(e.d.desc||'')+'</span>'+(e.d.link?' <a href="'+ea(e.d.link.url)+'" target="_blank" rel="noopener">'+esc(e.d.link.label)+'</a>':'')+'</div>'});
    h+=card(inner);
  }
  var sl=slotsOf(vd);
  if(sl.length){
    var ph=ctitle('오늘의 플랜');
    sl.forEach(function(sx){var ch=choiceOf(vd,sx.key);var sel2=ch&&ch.d.plan;
      if(sel2==='custom')ph+='<div style="margin-bottom:8px"><b>'+esc(sx.label)+'</b><div class="small">'+esc(ch.d.text||'(비어 있음)')+'</div></div>';
      else if(sel2&&sel2!=='none')ph+='<div style="margin-bottom:8px"><div class="small muted">'+esc(sx.label)+'</div>'+planDetail(sel2)+'</div>';
    });
    h+=card(ph);
  }
  var items=clItems(vd).concat(vd===preDate()?clItems('pre'):[]);
  var done=items.filter(function(i){return i.done}).length;
  h+=card(ctitle('체크리스트',done+' / '+items.length)+(items.length?bar(done/items.length*100)+'<div style="margin-top:6px">'+clList(items,true)+'</div>':'<div class="small muted">등록된 항목이 없어요. 체크 탭에서 추가해요.</div>'));
  var exs=localList().filter(function(x){return x.d.date===vd}).sort(function(a,b){return String(b.d.time||'')<String(a.d.time||'')?-1:1});
  h+=card(ctitle(vd===td?'오늘 지출':md(vd)+' 지출',exs.length?sumLabel(sumInfo(exs)):'')+(exs.length?exs.slice(0,3).map(function(x){return expRow(x,true)}).join('')+(exs.length>3?'<div class="small muted" style="padding-top:6px">외 '+(exs.length-3)+'건 · 경비 탭에서 전체 보기</div>':''):'<div class="small muted">아직 지출 기록이 없어요.</div>'));
  h+=card(ctitle('이날의 메모 · iikoto')+memoHtml(memosOf(vd)));
  return h;
}
function weekStartOf(x){var d=parse(x);return addDays(x,-((d.getDay()+6)%7))}
function screenSched(){
  var t=trip();if(!t)return empty();
  var dates=tripDates();
  var d=UI.sched&&dates.indexOf(UI.sched)>=0?UI.sched:clampDate(today());
  UI.sched=d;
  var h=titleBar('일정',md(t.start)+' – '+md(t.end)+' · '+(dates.length-1)+'박 '+dates.length+'일');
  var ws=weekStartOf(d),we=addDays(ws,6);
  h+='<div class="wk'+(UI.wkAnim?' slide-'+UI.wkAnim:'')+'" id="strip">';UI.wkAnim=null;
  for(var k=0;k<7;k++){
    var x=addDays(ws,k),on=x>=t.start&&x<=t.end,col=on?cityCol(cityOfDate(x))[2]:'transparent';
    h+='<button class="day-btn'+(x===d?' sel':'')+(on?'':' off')+'" data-act="date" data-v="'+x+'" '+(on?'':'disabled ')+'aria-pressed="'+(x===d)+'" aria-label="'+md(x)+' '+wd(x)+'"><span class="dbar" style="background:'+col+'"></span><span class="dnumc'+(x===today()?' today-num':'')+'">'+(+x.slice(8))+'</span><span class="day-name">'+wd(x)+'</span></button>';
  }
  h+='</div>';
  var s=stayOf(d),cid=cityOfDate(d);
  h+='<div class="row" style="min-height:44px">'+cityChip(cid)+(s?'<span class="grow small muted">'+esc(s.d.name)+' · '+md(s.d.checkin)+' – '+md(s.d.checkout)+'</span>':'<span class="grow"></span>')+(s?icoMap(s.d.map||s.d.name):'')+'</div>';
  var note=(t.dayNotes||{})[d];if(note)h+='<div>'+chip(esc(note),'pn')+'</div>';
  var w=wxOf(d);if(w)h+='<div class="small muted">'+(w.sun?'맑음 예상':'흐림 예상')+' · '+Math.round(w.tmax)+'°/'+Math.round(w.tmin)+'°'+(w.pp!=null?' · 강수 '+w.pp+'%':'')+'</div>';
  h+=timelineHtml(d);
  h+='<button class="btn" style="width:100%" data-act="evnew" data-date="'+d+'">'+ic('plus',16)+'일정 추가</button>';
  slotsOf(d).forEach(function(sl){h+=slotUi(d,sl)});
  return h;
}
function checkGroups(){
  var td=today(),pd=preDate();
  var gs=[{key:'pre',date:pd,label:'여행 전',pre:true}].concat(tripDates().map(function(d){return {key:d,date:d,label:md(d)+' '+wd(d)}}));
  // 자정 기준 오늘 → 앞으로(가까운 순) → 지난 날(최근 순). 같은 날짜면 '여행 전'이 먼저.
  function rank(g){return g.date===td?0:(g.date>td?1:2)}
  gs.forEach(function(g,i){g.i=i});
  gs.sort(function(a,b){
    var ra=rank(a),rb=rank(b);if(ra!==rb)return ra-rb;
    if(a.date!==b.date)return ra===2?(a.date<b.date?1:-1):(a.date<b.date?-1:1);
    return a.i-b.i;
  });
  return gs;
}
function screenCheck(){
  var t=trip();if(!t)return empty();
  var all=CL.items,doneAll=all.filter(function(i){return i.done}).length;
  var td=today(),vd=viewDate();
  var dayItems=clItems(vd).concat(vd===preDate()?clItems('pre'):[]);
  var done=dayItems.filter(function(i){return i.done}).length,left=dayItems.length-done;
  var circ=2*Math.PI*31,off=circ*(dayItems.length?done/dayItems.length:0);
  var ring='<svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="31" fill="none" stroke="rgba(195,175,168,.3)" stroke-width="8"/><circle cx="38" cy="38" r="31" fill="none" stroke="rgb(160,105,180)" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+off.toFixed(1)+' '+circ.toFixed(1)+'" transform="rotate(-90 38 38)"/><text x="38" y="44" text-anchor="middle" font-size="17" font-weight="700" fill="rgb(92,86,80)">'+done+'/'+dayItems.length+'</text></svg>';
  var h=titleBar('체크리스트',null,syncBtn());
  h+=card('<div class="row" style="gap:16px">'+ring+'<div class="grow"><b style="font-size:15px">'+(vd===td?'오늘':md(vd))+' 남은 항목 '+left+'개</b><div class="small muted" style="margin-top:4px">전체 '+all.length+'개 중 '+doneAll+'개 완료 · iikoto 투두와 동기화</div></div></div>');
  h+=seg('clf',[['today','오늘'],['all','전체'],['left','남은 것']],UI.clFilter);
  var f=UI.clFilter;
  checkGroups().forEach(function(g){
    if(f==='today'&&g.date!==vd)return;
    var items=clItems(g.key);
    if(f==='left'&&!items.filter(function(x){return !x.done}).length)return;
    var chp=g.pre?chip(md(g.date)+' · iikoto','ln'):cityChip(cityOfDate(g.date));
    if(g.date===td)chp=chip('오늘','pn')+' '+chp;
    h+=card('<div class="row between" style="margin-bottom:4px"><b style="font-size:14px">'+esc(g.label)+'</b><span class="row" style="gap:6px">'+chp+'</span></div>'+clList(f==='left'?items.filter(function(x){return !x.done}):items)+clAddRow(g.key));
  });
  return h;
}
function fxGet(){var t=trip();if(!t)return {JPY:9};if(!t.fx)t.fx={JPY:9};return t.fx}
function fx(){var f=fxGet();return f.JPY>0?f.JPY:9}
function fetchFx(force){
  var t=trip();if(!t||!M)return;var f=fxGet();if(f.auto===false)return;
  var last=lget('fxAt:'+cfg.tripId,0);if(!force&&Date.now()-last<6*3600*1000)return;
  try{
    fetch('https://api.frankfurter.dev/v1/latest?base=JPY&symbols=KRW').then(function(r){return r.ok?r.json():null}).then(function(j){
      if(!j||!j.rates||!(j.rates.KRW>0))return;
      f.base=j.rates.KRW;f.date=j.date;f.auto=true;
      f.JPY=Math.round(f.base*(1+(f.adj||0)/100)*1000)/1000;
      lset('fxAt:'+cfg.tripId,Date.now());tiUp('trip',M.trip);render();
    }).catch(function(){});
  }catch(e){}
}
function rate2(){return (Math.round(fx()*100)/100).toString()}
function fxCardHtml(){
  var f=fxGet(),auto=f.auto!==false;
  var info=auto?(f.base?'기준일 '+md(f.date||today())+' · 유럽중앙은행 참고 환율 '+(Math.round(f.base*100)/100)+'원'+(f.adj?' + 보정 '+f.adj+'%':''):'자동 환율을 아직 가져오지 못했어요 · 임시값 사용 중'):'직접 입력한 환율이에요';
  return '<div class="row between"><b style="font-size:14px">환율 1엔</b><span class="row" style="gap:6px"><input class="fld" style="flex:none;width:84px;height:40px;text-align:right" inputmode="decimal" data-fx="1" value="'+rate2()+'" aria-label="환율"><span class="muted">원</span></span></div>'+
    '<div style="margin-top:10px">'+seg('fxmode',[['auto','자동'],['manual','수동']],auto?'auto':'manual')+'</div>'+
    (auto?'<div class="row between" style="margin-top:10px"><span class="small muted">카드·환전 수수료 보정</span><span class="row" style="gap:6px"><input class="fld" style="flex:none;width:64px;height:40px;text-align:right" inputmode="decimal" data-fxadj="1" value="'+(f.adj||0)+'" aria-label="보정 퍼센트"><span class="muted">%</span></span></div>':'')+
    '<div class="small muted" style="margin-top:8px;line-height:1.5">'+info+'<br>실제 환전·카드 결제 환율과 다를 수 있어요.</div>';
}
function amtHtml(e){
  var d=e.d;
  if(d.currency==='JPY')return '<div style="font-size:15px;font-weight:700">¥'+won(d.amount)+'</div><div class="small muted">≈ '+won(d.amount*fx())+'원</div>';
  return '<div style="font-size:15px;font-weight:700">'+won(d.amount)+'원</div>';
}
function xKrw(e){return e.d.currency==='KRW'?e.d.amount:e.d.amount*fx()}
function sumInfo(list){var j=0,k=0;list.forEach(function(e){if(e.d.currency==='KRW')k+=e.d.amount;else j+=e.d.amount});return {jpy:j,krw:k,est:j*fx()+k}}
function sumLabel(i){if(i.jpy&&i.krw)return '¥'+won(i.jpy)+' + '+won(i.krw)+'원 ≈ '+won(i.est)+'원';if(i.jpy)return '¥'+won(i.jpy)+' ≈ '+won(i.est)+'원';return won(i.krw)+'원'}
function localList(){return M.expenses.filter(function(e){return e.d.local})}
function refList(cid){return localList().filter(function(e){return e.d.ref&&e.d.ref.cid===cid})}
function spentLine(cid){var l=refList(cid);if(!l.length)return '';return '<div class="small" style="margin-top:6px;color:var(--sub)">'+ic('cash',14)+' 지출 '+sumLabel(sumInfo(l))+'</div>'}
function expRow(e,ro){
  var d=e.d,pay=PAY[d.pay],krw=d.currency==='KRW';
  var sub=[];if(d.ref&&d.ref.name&&d.ref.name!==d.name)sub.push(d.ref.name);if(pay)sub.push(pay[0]);if(krw)sub.push('원화 결제');
  var amt=krw?'<div style="font-size:14px;font-weight:700">'+won(d.amount)+'원</div>':'<div style="font-size:14px;font-weight:700">¥'+won(d.amount)+'</div><div class="small muted">≈'+won(d.amount*fx())+'원</div>';
  return '<div class="xrow"><span class="xt">'+esc(d.time||'')+'</span><span class="xi">'+ic(ECATI[d.ecat]||'dots',16)+'</span><div class="grow"><div style="font-size:14px;line-height:1.35">'+esc(d.name)+'</div>'+(sub.length?'<div class="small muted">'+esc(sub.join(' · '))+'</div>':'')+'</div><div style="text-align:right">'+amt+'</div>'+(ro?'':'<button class="ico" data-act="expedit" data-id="'+ea(e.cid)+'" aria-label="수정">'+ic('pen',16)+'</button>')+'</div>';
}
function screenBudget(){
  var t=trip();if(!t)return empty();
  var krwPaid=0,krwPlan=0,air=0,stay=0,etc=0,jpyPaid=0,jpyPlan=0;
  var items=[];
  M.stays.forEach(function(s){items.push({k:'stay',o:s})});
  M.expenses.forEach(function(e){items.push({k:'exp',o:e})});
  var li=sumInfo(localList());
  items.forEach(function(x){
    var d=x.o.d;if(d.local)return;
    if(d.currency==='JPY'){if(d.paid)jpyPaid+=d.amount;else jpyPlan+=d.amount;return}
    if(d.paid){krwPaid+=d.amount;if(x.k==='stay')stay+=d.amount;else if(d.cat==='air')air+=d.amount;else etc+=d.amount}else krwPlan+=d.amount;
  });
  jpyPaid+=li.jpy;
  var jpyKrw=jpyPaid*fx(),localKrw=li.krw,localEst=jpyKrw+localKrw;
  var fixedItems=items.filter(function(x){return !x.o.d.local});
  var paidN=fixedItems.filter(function(x){return x.o.d.paid}).length;
  var h=titleBar('경비','결제 '+paidN+' / '+fixedItems.length+'건 · 현지 '+localList().length+'건');
  h+=card('<div class="row between" style="margin-bottom:2px"><div class="lbl" style="margin-bottom:0">결제 완료 (원화)</div><button class="fxtap" data-act="sheet" data-v="fx" aria-label="환율 보기">1엔 = '+rate2()+'원 '+ic('chevd',14)+'</button></div><div style="font-family:var(--serif);font-size:36px;font-weight:700">'+won(krwPaid)+'<span style="font-size:18px;color:var(--sub)">원</span></div>'+
    '<div class="gantt"><span style="flex:'+(air||0.001)+';background:'+CH[0]+'"></span><span style="flex:'+(stay||0.001)+';background:'+CH[1]+'"></span><span style="flex:'+(etc||0.001)+';background:'+CH[2]+'"></span><span style="flex:'+(localEst||0.001)+';background:'+CH[3]+'"></span></div>'+
    '<div class="legend"><span><i style="background:'+CH[0]+'"></i>항공 '+won(air)+'</span><span><i style="background:'+CH[1]+'"></i>숙소 '+won(stay)+'</span><span><i style="background:'+CH[2]+'"></i>기타 '+won(etc)+'</span><span><i style="background:'+CH[3]+'"></i>현지 ≈'+won(localEst)+'</span></div>'+
    '<div class="row between" style="margin-top:12px;font-size:13px"><span class="muted">현지 지출 (엔화)</span><b>¥'+won(jpyPaid)+' <span class="muted" style="font-weight:400">≈ '+won(jpyKrw)+'원</span></b></div>'+(localKrw?'<div class="row between" style="margin-top:6px;font-size:13px"><span class="muted">현지 지출 (원화 결제)</span><b>'+won(localKrw)+'원</b></div>':'')+
    (krwPlan||jpyPlan?'<div class="row between" style="margin-top:6px;font-size:13px"><span class="muted">예정</span><b>'+(krwPlan?won(krwPlan)+'원 ':'')+(jpyPlan?'¥'+won(jpyPlan)+' (≈'+won(jpyPlan*fx())+'원)':'')+'</b></div>':'')+
    '<div class="row between" style="margin-top:6px;font-size:13px"><span class="muted">총 지출 추정</span><b>≈ '+won(krwPaid+localEst)+'원</b></div>');
  h+='<button class="btn pri" data-act="exp-new">'+ic('plus',18)+'지출 추가</button>';
  var cs={};localList().forEach(function(e){cs[e.d.ecat||'etc']=(cs[e.d.ecat||'etc']||0)+xKrw(e)});
  var ck=Object.keys(ECAT).filter(function(k){return cs[k]});
  if(ck.length)h+='<div class="chips">'+ck.map(function(k){return chip(ic(ECATI[k],14)+' '+ECAT[k]+' ≈'+won(cs[k])+'원','ln')}).join('')+'</div>';
  var byDay={};localList().forEach(function(e){(byDay[e.d.date]=byDay[e.d.date]||[]).push(e)});
  var days=Object.keys(byDay).sort().reverse();
  if(days.length){
    h+='<div class="lbl" style="margin:6px 0 0">현지 지출 · 엔화 기준 (추정 원)</div>';
    days.forEach(function(d){
      var sl=sumLabel(sumInfo(byDay[d]));
      var list=byDay[d].slice().sort(function(a,b){return String(b.d.time||'')<String(a.d.time||'')?-1:1});
      h+=card('<div class="row between" style="margin-bottom:2px"><b>'+md(d)+' '+wd(d)+'</b><span class="small muted">'+sl+'</span></div>'+list.map(function(e){return expRow(e)}).join(''),'sm');
    });
  }
  var iconOf=function(x){var d=x.o.d;return x.k==='stay'?'bed':(d.cat==='air'?'plane':(d.cat==='sim'?'sim':(d.cat==='transport'?'bus':'tag')))};
  var fixed=fixedItems.slice();
  fixed.sort(function(a,b){return (a.o.d.currency==='JPY'?1:0)-(b.o.d.currency==='JPY'?1:0)});
  if(fixed.length)h+='<div class="lbl" style="margin:6px 0 0">사전 결제 · 예정</div><div class="small muted" style="margin-top:-8px">예정 칩을 누르면 결제완료로 바뀌어요. 금액이 다르면 항목을 눌러 고쳐요.</div>';
  fixed.forEach(function(x){
    var d=x.o.d,c=x.k==='stay'?cityCol(d.city)[2]:null;
    h+=card('<div class="row" style="gap:12px"><span class="ibtn" style="color:var(--sel-tx)">'+ic(iconOf(x),22)+'</span><div class="grow"><div class="row" style="gap:6px">'+(c?'<i style="width:10px;height:10px;border-radius:50%;background:'+c+';display:inline-block"></i>':'')+'<b style="font-size:15px">'+esc(d.name)+'</b></div><div class="small muted" style="margin-top:3px;line-height:1.45">'+esc(x.k==='stay'?(d.nights+'박 · '+md(d.checkin)+' – '+md(d.checkout)+(d.note?' · '+d.note:'')):(d.note||''))+'</div></div><div style="text-align:right">'+amtHtml(x.o)+'<button class="chip '+(d.paid?'ok':'pn')+'" style="margin-top:4px" data-act="paid" data-k="'+x.k+'" data-id="'+ea(x.o.cid)+'">'+(d.paid?'결제완료':'예정')+'</button></div></div>','sm').replace('<div class="card sm">','<div class="card sm" style="cursor:pointer" data-act="payedit" data-k="'+x.k+'" data-id="'+ea(x.o.cid)+'">');
  });
  return h;
}
function screenSpots(){
  var t=trip();if(!t)return empty();
  var city=UI.spCity||(t.cities[0]&&t.cities[0].id);UI.spCity=city;
  var h=titleBar('스팟','가고 싶은 곳 · 먹을 곳 · 쉴 곳');
  h+=seg('spc',t.cities.map(function(c){return [c.id,c.name]}),city);
  h+='<div class="chips">'+[['all','전체'],['meal','식사'],['cafe','카페'],['sight','명소'],['snack','간식']].map(function(c){return '<button class="btn sm'+(UI.spCat===c[0]?' on':'')+'" data-act="spcat" data-v="'+c[0]+'" aria-pressed="'+(UI.spCat===c[0])+'">'+c[1]+'</button>'}).join('')+'</div>';
  var list=M.spots.filter(function(s){return s.d.city===city&&(UI.spCat==='all'||s.d.cat===UI.spCat)});
  list=list.slice().sort(function(a,b){var x=spotState(a.d)==='done'?1:0,y=spotState(b.d)==='done'?1:0;return x-y||((a.sort||0)-(b.sort||0))});
  list.forEach(function(s){
    var d=s.d,memo=MEMOS.filter(function(m){return m.text&&m.text.indexOf(d.name)>=0})[0];
    h+=card('<div class="row" style="align-items:flex-start"><div class="grow"><div class="row" style="flex-wrap:wrap"><b style="font-size:16px'+(spotState(d)==='done'?';color:var(--sub)':'')+'">'+esc(d.name)+'</b>'+chip(esc(CAT[d.cat]||''),'ln')+(d.tags||[]).map(function(x){return chip(esc(x),'pn')}).join('')+'</div><div class="small muted" style="margin-top:4px;line-height:1.45">'+esc(d.desc||'')+'</div>'+spentLine(s.cid)+'</div>'+mapBtn(d.map||d.name)+navBtn(d.map||d.name)+'</div>'+schedLine(s)+(memo?'<div class="small" style="margin-top:8px">iikoto 메모 · '+esc(memo.date_key.slice(5))+' · '+esc((memo.text||'').slice(0,60))+'</div>':'')+
      '<div class="seg" style="margin-top:10px">'+STATE.map(function(st){return '<button data-act="sp-state" data-id="'+ea(s.cid)+'" data-v="'+st[0]+'" aria-pressed="'+(spotState(d)===st[0])+'" class="'+(spotState(d)===st[0]?'on':'')+'">'+st[1]+'</button>'}).join('')+'</div>'+
      '<div class="row" style="justify-content:flex-end;gap:0;margin-top:2px"><button class="ico" data-act="spedit" data-id="'+ea(s.cid)+'" aria-label="수정">'+ic('pen',18)+'</button><button class="ico" data-act="spot2ev" data-id="'+ea(s.cid)+'" aria-label="일정에 넣기">'+ic('calplus',18)+'</button><button class="ico" style="color:var(--sub)" data-act="sp-del" data-id="'+ea(s.cid)+'" aria-label="삭제">'+ic('trash',18)+'</button></div>');
  });
  if(!list.length)h+='<div class="muted small" style="text-align:center;padding:10px">이 분류에는 아직 없어요</div>';
  if(UI.addSpot){
    h+=card('<div class="lbl">스팟 추가</div><input class="fld" id="s_name" placeholder="이름" aria-label="이름" style="width:100%"><div class="row" style="margin-top:8px"><select class="fld" id="s_cat" aria-label="분류">'+Object.keys(CAT).map(function(k){return '<option value="'+k+'">'+CAT[k]+'</option>'}).join('')+'</select></div><input class="fld" id="s_desc" placeholder="한 줄 설명 (선택)" aria-label="설명" style="width:100%;margin-top:8px"><input class="fld" id="s_map" placeholder="지도 검색어 (비우면 이름으로 검색)" aria-label="지도 검색어" style="width:100%;margin-top:8px"><div class="row" style="margin-top:10px"><button class="btn pri" style="width:auto;flex:1" data-act="sp-save">저장</button><button class="btn" data-act="sp-cancel">취소</button></div>');
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
    TRIPS.forEach(function(r){var d=r.data||{};body+=card('<div class="row between">'+chip(d.status==='active'?'진행 중':(d.status==='done'?'완료':'계획'),d.status==='active'?'ok':'ln')+(r.trip_id===cur?'<span class="small muted">현재</span>':'')+'</div><div style="font-family:var(--serif);font-size:22px;font-weight:700;margin-top:8px">'+esc(d.title||r.trip_id)+'</div><div class="small muted" style="margin-top:4px">'+esc((d.start||'')+' – '+(d.end||''))+'</div>'+(r.trip_id===cur?'<button class="btn" style="margin-top:12px;width:100%" data-act="sheet" data-v="tripedit">'+ic('pen',16)+'여행 정보 수정</button>':'<button class="btn pri" style="margin-top:12px" data-act="trip-open" data-id="'+ea(r.trip_id)+'">열기</button>'))});
    body+=card('<b style="font-size:15px">새 여행 만들기</b><div class="small muted" style="margin-top:4px">템플릿·복제는 다녀온 뒤 추가할 예정이에요. 지금은 가져오기로 만들 수 있어요.</div>');
    body+=card('<div class="lbl">백업 · 복원</div><div class="row"><button class="btn" data-act="export">'+ic('dl',16)+'백업 내보내기</button><label class="btn" style="cursor:pointer">'+ic('ul',16)+'가져오기<input type="file" id="imp" accept="application/json,.json" style="display:none"></label></div>');
    body+=card('<div class="row between"><span class="small muted">앱 버전 '+VER+'</span><button class="btn" data-act="sheet" data-v="key">키 변경</button></div>');
  }else if(v==='exp'){
    var dr=UI.expDraft||{};
    body='<div class="row between"><h1 style="font-size:22px">'+(dr.id?'지출 수정':'지출 추가')+'</h1><button class="btn" style="border:0;background:transparent" data-act="sheet-close" aria-label="닫기">'+ic('x',20)+'</button></div>'+
       '<div class="tsc" style="margin:0">'+[['JPY','¥ 엔화'],['KRW','₩ 원화']].map(function(c){return '<button class="chip tsb'+((dr.cur||'JPY')===c[0]?' on':'')+'" data-act="expcur" data-v="'+c[0]+'" aria-pressed="'+((dr.cur||'JPY')===c[0])+'">'+c[1]+'</button>'}).join('')+'</div>'+
      '<div class="amtbox"><span class="yen" id="x_sym">'+((dr.cur||'JPY')==='KRW'?'₩':'¥')+'</span><input id="x_amt" inputmode="numeric" autocomplete="off" placeholder="0" aria-label="금액" value="'+ea(dr.amt||'')+'"></div><div class="small muted" id="x_krw" style="margin-top:-6px">'+expLine(dr.cur||'JPY',dr.amt)+'</div>'+
      '<div><div class="lbl">분류</div><div class="tsc" style="margin-top:0">'+Object.keys(ECAT).map(function(k){return '<button class="chip tsb'+(dr.cat===k?' on':'')+'" data-act="expcat" data-v="'+k+'" aria-pressed="'+(dr.cat===k)+'">'+ic(ECATI[k],15)+ECAT[k]+'</button>'}).join('')+'</div></div>'+
      '<div><div class="lbl">결제수단</div><div class="tsc" style="margin-top:0">'+Object.keys(PAY).map(function(k){return '<button class="chip tsb'+(dr.pay===k?' on':'')+'" data-act="exppay" data-v="'+k+'" aria-pressed="'+(dr.pay===k)+'">'+ic(PAY[k][1],15)+PAY[k][0]+'</button>'}).join('')+'</div></div>'+
      '<div><div class="lbl">내용 · 장소 (선택)</div><input class="fld" id="x_name" style="width:100%" placeholder="이름을 치거나 아래에서 고르세요" autocomplete="off" aria-label="내용" value="'+ea(dr.name||'')+'"><div id="x_sug">'+xSugHtml(dr)+'</div></div>'+
      '<div class="dt2"><div><div class="lbl">날짜</div><input class="fld" id="x_date" type="date" style="width:100%" value="'+ea(dr.date||'')+'" aria-label="날짜"></div><div><div class="lbl">시간</div><input class="fld" id="x_time" type="time" style="width:100%" value="'+ea(dr.time||'')+'" aria-label="시간"></div></div>'+
      '<div class="row"><button class="btn pri" style="flex:1" data-act="exp-save">저장</button>'+(dr.id?'<button class="btn" data-act="exp-del" data-id="'+ea(dr.id)+'">삭제</button>':'')+'</div>';
  }else if(v==='ev'){
    var ed=UI.evDraft||{};
    body='<div class="row between"><h1 style="font-size:22px">'+(ed.id?'일정 수정':'일정 추가')+'</h1><button class="btn" style="border:0;background:transparent" data-act="sheet-close" aria-label="닫기">'+ic('x',20)+'</button></div>'+
      '<div><div class="lbl">제목</div><input class="fld" id="ev_title" style="width:100%" placeholder="이름을 치면 스팟이 떠요" aria-label="제목" autocomplete="off" value="'+ea(ed.title||'')+'"><div id="ev_sug">'+evSugHtml(ed)+'</div></div>'+
      '<div class="dt2"><div><div class="lbl">날짜</div><input class="fld" id="ev_date" type="date" style="width:100%" value="'+ea(ed.date||'')+'" aria-label="날짜"></div><div><div class="lbl">시간 (선택)</div><input class="fld" id="ev_time" data-evtime="1" type="time" style="width:100%" value="'+ea(ed.time||'')+'" aria-label="시간"></div></div>'+
      '<div><div class="lbl">시간대</div><div class="tsc" style="margin-top:0">'+['am','noon','pm','eve'].map(function(k){return '<button class="chip tsb'+(ed.slot===k?' on':'')+'" data-act="evslot" data-v="'+k+'" aria-pressed="'+(ed.slot===k)+'">'+SLOTL[k]+'</button>'}).join('')+'</div></div>'+
      '<div><div class="lbl">설명 (선택)</div><input class="fld" id="ev_desc" style="width:100%" placeholder="예: 오픈 시간에 방문" aria-label="설명" value="'+ea(ed.desc||'')+'"></div>'+
      '<div><div class="lbl">지도 연결</div><div class="tsc" style="margin-top:0">'+[[true,'지도·길찾기 버튼 표시'],[false,'표시 안 함']].map(function(c){return '<button class="chip tsb'+((ed.mapOn!==false)===c[0]?' on':'')+'" data-act="evmap" data-v="'+c[0]+'" aria-pressed="'+((ed.mapOn!==false)===c[0])+'">'+c[1]+'</button>'}).join('')+'</div><div class="lbl" style="margin-top:10px">검색어 (비우면 제목으로 검색)</div><div class="row"><input class="fld" id="ev_map" style="flex:1" placeholder="가게·장소 이름 또는 주소" aria-label="지도 검색어" value="'+ea(ed.map||'')+'"><a class="btn" data-mapcheck="1" href="#" target="_blank" rel="noopener" style="text-decoration:none">'+ic('pin',16)+'확인</a></div></div>'+
      '<div class="row"><button class="btn pri" style="flex:1" data-act="ev-save">저장</button>'+(ed.id?'<button class="btn" data-act="ev-del" data-id="'+ea(ed.id)+'">삭제</button>':'')+'</div>';
  }else if(v==='fx'){
    body='<div class="row between"><h1 style="font-size:22px">현재 환율</h1><button class="btn" style="border:0;background:transparent" data-act="sheet-close" aria-label="닫기">'+ic('x',20)+'</button></div>'+card(fxCardHtml(),'');
  }else if(v==='pay'){
    var pd=UI.payDraft||{};
    body='<div class="row between"><h1 style="font-size:22px">결제 항목 수정</h1><button class="btn" style="border:0;background:transparent" data-act="sheet-close" aria-label="닫기">'+ic('x',20)+'</button></div>'+
      '<div style="font-size:15px;font-weight:700">'+esc(pd.name||'')+'</div>'+
      '<div class="tsc" style="margin:0">'+[['KRW','₩ 원화'],['JPY','¥ 엔화']].map(function(c){return '<button class="chip tsb'+(pd.cur===c[0]?' on':'')+'" data-act="paycur" data-v="'+c[0]+'" aria-pressed="'+(pd.cur===c[0])+'">'+c[1]+'</button>'}).join('')+'</div>'+
      '<div class="amtbox"><span class="yen" id="p_sym">'+(pd.cur==='KRW'?'₩':'¥')+'</span><input id="p_amt" inputmode="numeric" autocomplete="off" placeholder="0" aria-label="금액" value="'+ea(pd.amt||'')+'"></div>'+
      '<div><div class="lbl">상태</div><div class="tsc" style="margin-top:0">'+[[false,'예정'],[true,'결제완료']].map(function(c){return '<button class="chip tsb'+((!!pd.paid)===c[0]?' on':'')+'" data-act="paystat" data-v="'+c[0]+'" aria-pressed="'+((!!pd.paid)===c[0])+'">'+c[1]+'</button>'}).join('')+'</div></div>'+
      '<div class="small muted">실제 결제 금액이 다르면 금액을 고치고 "결제완료"로 바꾸세요.</div>'+
      '<div class="row"><button class="btn pri" style="flex:1" data-act="pay-save">저장</button>'+(pd.k==='exp'?'<button class="btn" data-act="pay-del">삭제</button>':'')+'</div>';
  }else if(v==='spedit'){
    var sd=UI.spDraft||{};
    var sp0=M.spots.filter(function(x){return x.cid===sd.id})[0];
    if(!sp0)return '';
    body='<div class="row between"><h1 style="font-size:22px">스팟 수정</h1><button class="btn" style="border:0;background:transparent" data-act="sheet-close" aria-label="닫기">'+ic('x',20)+'</button></div>'+
      '<div><div class="lbl">이름</div><input class="fld" id="sp_name" style="width:100%" aria-label="이름" autocomplete="off" value="'+ea(sd.name||'')+'"></div>'+
      '<div><div class="lbl">분류</div><div class="tsc" style="margin-top:0">'+Object.keys(CAT).map(function(k){return '<button class="chip tsb'+(sd.cat===k?' on':'')+'" data-act="spcatpick" data-v="'+k+'" aria-pressed="'+(sd.cat===k)+'">'+CAT[k]+'</button>'}).join('')+'</div></div>'+
      '<div><div class="lbl">도시</div><div class="tsc" style="margin-top:0">'+(trip().cities||[]).map(function(c){return '<button class="chip tsb'+(sd.city===c.id?' on':'')+'" data-act="spcitypick" data-v="'+ea(c.id)+'" aria-pressed="'+(sd.city===c.id)+'">'+esc(c.name)+'</button>'}).join('')+'</div></div>'+
      '<div><div class="lbl">설명 (선택)</div><input class="fld" id="sp_desc" style="width:100%" aria-label="설명" value="'+ea(sd.desc||'')+'"></div>'+
      '<div><div class="lbl">지도 검색어 (비우면 이름으로 검색)</div><div class="row"><input class="fld" id="sp_map" style="flex:1" placeholder="가게·장소 이름 또는 주소" aria-label="지도 검색어" value="'+ea(sd.map||'')+'"><a class="btn" data-mapcheck="sp" href="#" target="_blank" rel="noopener" style="text-decoration:none">'+ic('pin',16)+'확인</a></div></div>'+
      '<div class="small muted">이름을 바꾸면 이 스팟과 연결된 일정의 제목도 같이 바뀌어요.</div>'+
      '<div class="row"><button class="btn pri" style="flex:1" data-act="spedit-save">저장</button></div>';
  }else if(v==='tripedit'){
    var t=trip();if(!t)return '';
    body='<div class="row between"><h1 style="font-size:22px">여행 정보 수정</h1><button class="btn" style="border:0;background:transparent" data-act="sheet" data-v="trips" aria-label="뒤로">'+ic('x',20)+'</button></div>'+
      '<div><div class="lbl">여행명</div><input class="fld" id="te_title" style="width:100%" value="'+ea(t.title||'')+'" aria-label="여행명"></div>'+
      '<div class="dt2"><div><div class="lbl">시작일</div><input class="fld" id="te_start" type="date" style="width:100%" value="'+ea(t.start||'')+'" aria-label="시작일"></div><div><div class="lbl">종료일</div><input class="fld" id="te_end" type="date" style="width:100%" value="'+ea(t.end||'')+'" aria-label="종료일"></div></div>'+
      '<div><div class="lbl">상태</div><select class="fld" id="te_status" style="width:100%" aria-label="상태">'+[['planned','계획'],['active','진행 중'],['done','완료']].map(function(o){return '<option value="'+o[0]+'"'+(t.status===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></div>'+
      '<div><div class="lbl">도시 이름</div>'+(t.cities||[]).map(function(c,i){return '<input class="fld te_city" data-i="'+i+'" style="width:100%;margin-bottom:6px" value="'+ea(c.name)+'" aria-label="도시 이름">'}).join('')+'</div>'+
      '<div class="small muted">기간을 바꿔도 이미 입력한 일정의 날짜는 그대로 남아요. 범위 밖 날짜는 화면에 나오지 않아요.</div>'+
      '<div class="row"><button class="btn pri" style="flex:1" data-act="trip-save">저장</button><button class="btn" data-act="sheet" data-v="trips">취소</button></div>';
  }
  return '<div class="sheetwrap" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true">'+body+'</div></div>';
}

/* ---------- render ---------- */
var TABS=[['today','오늘','sun'],['sched','일정','cal'],['check','체크','chk'],['budget','경비','wal'],['spots','스팟','pin']];
function render(){
  var sc=document.getElementById('screen'),y=sc.scrollTop;
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
  document.getElementById('tabbar').innerHTML=TABS.map(function(t){return '<button data-act="tab" data-v="'+t[0]+'" class="'+(UI.tab===t[0]?'on':'')+'" aria-current="'+(UI.tab===t[0]?'page':'false')+'">'+ic(t[2],24)+'<span>'+t[1]+'</span></button>'}).join('');
  document.getElementById('sheet').innerHTML=sheetHtml();
  if(UI.edit){var ei=document.querySelector('input.edit');if(ei&&document.activeElement!==ei){ei.focus();ei.select()}}
  sc.scrollTop=y;
}

/* ---------- actions ---------- */
function findCl(id){for(var i=0;i<CL.items.length;i++){if(CL.items[i].id===id)return CL.items[i]}return null}
function commitEdit(id,val){
  if(UI.edit!==id)return;
  val=(val||'').trim();var it=findCl(id);
  if(it&&val&&val!==it.t){it.t=val;tdUpd(it,{text:val})}
  UI.edit=null;UI.editVal=null;render();
}
function addCl(key,val){
  val=(val||'').trim();if(!val)return;
  var ts=UI.addTs[key]||'none';
  var it={id:newClId(key),date:clDate(key),pre:key==='pre',t:val,ts:ts,done:false,created:Date.now()};
  CL.items.push(it);tdAdd(it);UI.addTs[key]='none';render();
  var ni=document.querySelector('input[data-add="'+key+'"]');if(ni)ni.focus();
}
function setChoice(d,slot,v){
  var k=d+'|'+slot,ch=M.choices[k];
  if(!ch){ch={cid:'choice_'+d+'_'+slot,date:d,sort:0,d:{slot:slot,plan:v,text:''}};M.choices[k]=ch}
  else ch.d.plan=v;
  tiUp('choice',ch);render();
}
function expLine(cur,amt){var n=parseInt(String(amt==null?'0':amt).replace(/[^0-9]/g,''),10)||0;return cur==='KRW'?'원화로 결제한 금액이에요 · 환산 없이 그대로 합산돼요':'≈ '+won(n*fx())+'원 (1엔 = '+rate2()+'원)'}
function updateExpLine(){var a=document.getElementById('x_amt'),k=document.getElementById('x_krw');if(k)k.textContent=expLine((UI.expDraft&&UI.expDraft.cur)||'JPY',a?a.value:'0')}
function openExp(id){
  var base={id:null,cur:'JPY',cat:'food',pay:'card',amt:'',name:'',ref:'',date:today(),time:nowHM()};
  if(id){var ex=M.expenses.filter(function(x){return x.cid===id})[0];if(ex){var d=ex.d;base={id:ex.cid,cur:d.currency==='KRW'?'KRW':'JPY',cat:d.ecat||'etc',pay:d.pay||'card',amt:String(d.amount),name:d.name||'',ref:d.ref?d.ref.t+':'+d.ref.cid:'',date:d.date||today(),time:d.time||nowHM()}}}
  UI.expDraft=base;UI.sheet='exp';render();persistDraft();
  var a=document.getElementById('x_amt');if(a&&!id)a.focus();
}
function refInfo(val){
  if(!val)return null;var p=val.split(':'),t=p[0],cid=p.slice(1).join(':');
  if(t==='event'){var e=findEvent(cid);return e?{t:'event',cid:cid,name:e.d.title}:null}
  if(t==='spot'){var sp=M.spots.filter(function(x){return x.cid===cid})[0];return sp?{t:'spot',cid:cid,name:sp.d.name}:null}
  return null;
}
function saveExp(){
  var dr=UI.expDraft||{};
  var amt=parseInt((document.getElementById('x_amt').value||'').replace(/[^0-9]/g,''),10);
  if(!amt){toast('금액을 입력해 주세요');return}
  var ri=refInfo(dr.ref);
  var nm=(document.getElementById('x_name').value||'').trim()||(ri?ri.name:'')||ECAT[dr.cat||'etc'];
  var date=document.getElementById('x_date').value||today(),time=document.getElementById('x_time').value||nowHM();
  var data={cat:'local',name:nm,amount:amt,currency:(dr.cur==='KRW'?'KRW':'JPY'),paid:true,local:true,date:date,time:time,ecat:dr.cat||'etc',pay:dr.pay||'card'};
  if(ri)data.ref={t:ri.t,cid:ri.cid,name:ri.name};
  var o=dr.id?M.expenses.filter(function(x){return x.cid===dr.id})[0]:null;
  if(o){o.d=data;o.date=date}else{o={cid:'exp_'+genCid(),date:date,sort:Date.now()%100000000,d:data};M.expenses.push(o)}
  tiUp('expense',o);UI.sheet=null;UI.expDraft=null;clearDraft();render();toast('저장했어요');
}
var SLOTDEF={am:'09:00',noon:'12:00',pm:'15:00',eve:'19:00'};
function timeToSlot(t){var h=parseInt(String(t).split(':')[0],10);if(isNaN(h))return 'pm';return h<11?'am':(h<14?'noon':(h<18?'pm':'eve'))}
function spotState(d){return d.state==='done'?'done':'go'}
function spotOfEvent(e){
  if(!M)return null;
  if(e.d.spot){var s1=M.spots.filter(function(x){return x.cid===e.d.spot})[0];if(s1)return s1}
  var nm=(e.d.title||'').trim();
  return M.spots.filter(function(x){return x.d.name===nm})[0]||null;
}
function linkedEvents(sp){
  var out=[];Object.keys(M.events).sort().forEach(function(d){M.events[d].forEach(function(e){if(spotOfEvent(e)===sp)out.push(e)})});return out;
}
function schedLine(sp){
  var le=linkedEvents(sp);if(!le.length)return '';
  return '<div class="small" style="margin-top:6px;color:var(--sub)">'+ic('calendar',14)+' 일정 · '+le.map(function(e){return md(e.date)+' '+(e.d.time||SLOTL[e.d.slot]||'')}).join(', ')+'</div>';
}
function insertEvent(date,e){
  var list=(M.events[date]||[]).filter(function(x){return x.cid!==e.cid});
  var eff=effTimes(list),key=e.d.time||SLOTDEF[e.d.slot]||'15:00',at=list.length;
  for(var i=0;i<eff.length;i++){if(eff[i]>key){at=i;break}}
  list.splice(at,0,e);
  list.forEach(function(x,i){var sort=(i+1)*10;if(x.sort!==sort||x===e){x.sort=sort;tiUp('event',x)}});
  M.events[date]=list;
}
function removeEvent(e){
  var d=e.date,list=(M.events[d]||[]).filter(function(x){return x.cid!==e.cid});
  M.events[d]=list;
}
function openEv(id,date,spotCid){
  var base={id:null,date:date||UI.sched||clampDate(today()),slot:'pm',cond:'',spot:'',title:'',desc:'',map:'',time:'',mapOn:true};
  if(id){var e=findEvent(id);if(e){var d=e.d;base={id:e.cid,mapOn:!!d.map,date:e.date,slot:d.slot||'pm',cond:d.cond||'',spot:d.spot||(spotOfEvent(e)?spotOfEvent(e).cid:''),title:d.title||'',desc:d.desc||'',map:d.map||'',time:d.time||''}}}
  else if(spotCid){
    var sp=M.spots.filter(function(x){return x.cid===spotCid})[0];
    if(sp){var catSlot={meal:'noon',cafe:'pm',sight:'pm',snack:'pm'};base.spot=sp.cid;base.title=sp.d.name;base.desc=sp.d.desc||'';base.map=sp.d.map||sp.d.name;base.slot=catSlot[sp.d.cat]||'pm'}
  }
  UI.evDraft=base;UI.sheet='ev';render();persistDraft();
}
function saveEv(){
  var dr=UI.evDraft||{};
  var title=(document.getElementById('ev_title').value||'').trim();
  if(!title){toast('제목을 입력해 주세요');return}
  var date=document.getElementById('ev_date').value||dr.date||today();
  var time=document.getElementById('ev_time').value||'';
  var slot=dr.slot||(time?timeToSlot(time):'pm');
  var map=(document.getElementById('ev_map').value||'').trim();
  if(dr.mapOn===false)map='';else if(!map)map=title;
  var desc=(document.getElementById('ev_desc').value||'').trim();
  var old=dr.id?findEvent(dr.id):null;
  var d=old?JSON.parse(JSON.stringify(old.d)):{tags:[]};
  d.city=cityOfDate(date);d.title=title;d.desc=desc||undefined;d.time=time||undefined;d.slot=slot;
  d.map=map||undefined;d.nav=!!map;
  if(dr.spot)d.spot=dr.spot;else delete d.spot;
  Object.keys(d).forEach(function(k){if(d[k]===undefined)delete d[k]});
  var e=old;
  if(e){removeEvent(e);e.date=date;e.d=d}
  else e={cid:'ev_'+date+'_'+genCid(),date:date,sort:0,d:d};
  insertEvent(date,e);
  var t=trip();if(t&&(date<t.start||date>t.end))toast('여행 기간 밖의 날짜예요. 기간을 넓히면 보여요');
  UI.sched=date;UI.sheet=null;UI.evDraft=null;clearDraft();render();if(!(t&&(date<t.start||date>t.end)))toast('저장했어요');
}
function placedSpotCids(){var m={};Object.keys(M.events).forEach(function(d){M.events[d].forEach(function(e){var sp=spotOfEvent(e);if(sp)m[sp.cid]=1})});return m}
function normQ(t){return String(t||'').toLowerCase().replace(/\s+/g,'')}
function evSugHtml(ed){
  var q=normQ(ed.title),cc=cityOfDate(ed.date||today());
  var linked=ed.spot?M.spots.filter(function(x){return x.cid===ed.spot})[0]:null;
  var h='';
  if(linked)h+='<div class="tsc" style="margin-top:8px"><button class="tschip on" data-act="evunlink" aria-label="스팟 연결 해제">'+ic('pin',14)+' '+esc(linked.d.name)+' · 연결됨 ×</button></div>';
  var list,label;
  if(q){
    list=M.spots.filter(function(sp){
      if(linked&&sp.cid===linked.cid)return false;
      return normQ(sp.d.name+' '+(sp.d.desc||'')+' '+(sp.d.map||'')).indexOf(q)>=0;
    });label='스팟 후보';
  }else{
    var placed=placedSpotCids();
    list=M.spots.filter(function(sp){return sp.d.city===cc&&spotState(sp.d)==='go'&&!placed[sp.cid]});
    label='아직 일정에 안 넣은 갈 곳 · '+cityName(cc);
  }
  list=list.slice().sort(function(a,b){return (a.d.city===cc?0:1)-(b.d.city===cc?0:1)}).slice(0,5);
  if(list.length)h+='<div class="small muted" style="margin:10px 0 6px">'+esc(label)+'</div><div class="tsc" style="margin-top:0">'+list.map(function(sp){return '<button class="tschip" data-act="evpick" data-id="'+ea(sp.cid)+'">'+esc(sp.d.name)+'</button>'}).join('')+'</div>';
  else if(q&&!linked)h+='<div class="small muted" style="margin-top:8px">일치하는 스팟이 없어요 · 그대로 일정으로 저장돼요</div>';
  return h;
}
function refreshSug(){var sg=document.getElementById('ev_sug');if(sg&&UI.evDraft)sg.innerHTML=evSugHtml(UI.evDraft)}
function swipeWeek(dir){
  var t=trip();if(!t)return;
  var cur=UI.sched||clampDate(today()),tg=addDays(cur,dir*7);
  if(tg<t.start)tg=t.start;if(tg>t.end)tg=t.end;
  if(weekStartOf(tg)===weekStartOf(cur))return;
  UI.sched=tg;UI.wkAnim=dir>0?'l':'r';render();
}
var swipeX=null,swipeY=null;
function onTouchStart(e){var st=e.target.closest&&e.target.closest('#strip');if(!st){swipeX=null;return}var p=(e.touches&&e.touches[0])||e;swipeX=p.clientX;swipeY=p.clientY}
function onTouchEnd(e){
  if(swipeX==null)return;
  var p=(e.changedTouches&&e.changedTouches[0])||e,dx=p.clientX-swipeX,dy=p.clientY-swipeY;swipeX=null;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)swipeWeek(dx<0?1:-1);
}
function nowMin(){var d=new Date();return d.getHours()*60+d.getMinutes()}
function hmMin(t){var p=String(t).split(':');return (+p[0])*60+(+p[1]||0)}
function spotCatToEcat(c){return ({meal:'food',cafe:'cafe',sight:'entry',snack:'food'})[c]||null}
function xSugHtml(dr){
  var q=normQ(dr.name),date=dr.date||today(),cc=cityOfDate(date);
  var linked=refInfo(dr.ref);
  var h='';
  if(linked)h+='<div class="tsc" style="margin-top:8px"><button class="tschip on" data-act="xunlink" aria-label="장소 연결 해제">'+ic('pin',14)+' '+esc(linked.name)+' · 연결됨 ×</button></div>';
  var evs=eventsOf(date).filter(function(e){return e.d.title}),eff=effTimes(eventsOf(date)),list=[],label='';
  if(q){
    var seen={};
    evs.forEach(function(e){if(normQ(e.d.title+' '+(e.d.desc||'')).indexOf(q)>=0&&!(linked&&linked.cid===e.cid)){list.push({ref:'event:'+e.cid,name:e.d.title,tag:'일정'});var sp=spotOfEvent(e);if(sp)seen[sp.cid]=1}});
    M.spots.filter(function(sp){return !seen[sp.cid]&&!(linked&&linked.cid===sp.cid)&&normQ(sp.d.name+' '+(sp.d.desc||'')+' '+(sp.d.map||'')).indexOf(q)>=0}).sort(function(a,b){return (a.d.city===cc?0:1)-(b.d.city===cc?0:1)}).forEach(function(sp){list.push({ref:'spot:'+sp.cid,name:sp.d.name,tag:'스팟'})});
    label='일정·스팟 후보';
  }else{
    var all=eventsOf(date),idx={};all.forEach(function(e,i){idx[e.cid]=i});
    var withPlace=evs.filter(function(e){return !!e.d.map});
    var isToday=date===today(),nm=nowMin();
    withPlace.sort(function(a,b){
      if(isToday){var da=Math.abs(hmMin(eff[idx[a.cid]])-nm),db=Math.abs(hmMin(eff[idx[b.cid]])-nm);if(da!==db)return da-db}
      return idx[a.cid]-idx[b.cid];
    });
    withPlace.forEach(function(e){if(!(linked&&linked.cid===e.cid))list.push({ref:'event:'+e.cid,name:e.d.title,tag:''})});
    label=isToday?'지금 가까운 일정에서 고르기':md(date)+' 일정에서 고르기';
    if(!list.length){
      M.spots.filter(function(sp){return sp.d.city===cc&&spotState(sp.d)==='go'}).slice(0,5).forEach(function(sp){list.push({ref:'spot:'+sp.cid,name:sp.d.name,tag:'스팟'})});
      label='이 날짜엔 일정이 없어요 · '+cityName(cc)+' 갈 곳';
    }
  }
  list=list.slice(0,5);
  if(list.length)h+='<div class="small muted" style="margin:10px 0 6px">'+esc(label)+'</div><div class="tsc" style="margin-top:0">'+list.map(function(x){return '<button class="tschip" data-act="xpick" data-ref="'+ea(x.ref)+'" data-name="'+ea(x.name)+'">'+esc(x.name)+'</button>'}).join('')+'</div>';
  else if(q&&!linked)h+='<div class="small muted" style="margin-top:8px">일치하는 일정·스팟이 없어요 · 내용만 저장돼요</div>';
  return h;
}
function refreshXSug(){var sg=document.getElementById('x_sug');if(sg&&UI.expDraft)sg.innerHTML=xSugHtml(UI.expDraft)}
function persistDraft(){
  try{
    var g=function(id){var x=document.getElementById(id);return x?x.value:null};
    if(UI.sheet==='ev'&&UI.evDraft){var d=UI.evDraft;if(g('ev_title')!=null){d.title=g('ev_title');d.date=g('ev_date');d.time=g('ev_time');d.desc=g('ev_desc');d.map=g('ev_map');d.spot=g('ev_spot')||d.spot}lset('draft',{k:'ev',d:d,t:Date.now()})}
    else if(UI.sheet==='exp'&&UI.expDraft){var x=UI.expDraft;if(g('x_amt')!=null){x.amt=g('x_amt');x.name=g('x_name');x.date=g('x_date');x.time=g('x_time')}lset('draft',{k:'exp',d:x,t:Date.now()})}
  }catch(e){}
}
function clearDraft(){lset('draft',null)}
function restoreDraft(){
  var dft=lget('draft',null);
  if(!dft||!M||Date.now()-dft.t>2*3600*1000){clearDraft();return}
  if(dft.k==='ev'){UI.evDraft=dft.d;UI.sheet='ev'}else if(dft.k==='exp'){UI.expDraft=dft.d;UI.sheet='exp'}else return;
  render();
}
function onClick(e){
  var mc=e.target.closest&&e.target.closest('[data-mapcheck]');
  if(mc){
    var isSp=mc.getAttribute('data-mapcheck')==='sp';
    var q0=isSp?((document.getElementById('sp_map').value||'').trim()||(document.getElementById('sp_name').value||'').trim()):((document.getElementById('ev_map').value||'').trim()||(document.getElementById('ev_title').value||'').trim());
    if(!q0){e.preventDefault();toast('제목이나 검색어를 먼저 입력해 주세요');return}
    if(!isSp)persistDraft();mc.href=mapUrl(q0);return;
  }
  var el=e.target.closest('[data-act]');if(!el)return;
  var a=el.getAttribute('data-act'),v=el.getAttribute('data-v'),id=el.getAttribute('data-id');
  if(a==='sheet-bg'){if(e.target===el){UI.sheet=null;UI.expDraft=null;UI.evDraft=null;clearDraft();render()}return}
  switch(a){
    case 'tab':UI.tab=v;lset('tab',v);render();document.getElementById('screen').scrollTop=0;break;
    case 'sheet':UI.sheet=v;render();break;
    case 'sheet-close':UI.sheet=null;UI.expDraft=null;UI.evDraft=null;clearDraft();render();break;
    case 'sync':pull(true).then(function(){toast('동기화했어요')});break;
    case 'date':UI.sched=v;render();break;
    case 'cond':UI.cond[el.getAttribute('data-date')]=v;render();break;
    case 'plan':setChoice(el.getAttribute('data-date'),el.getAttribute('data-slot'),v);break;
    case 'clf':UI.clFilter=v;render();break;
    case 'ck':{var it=findCl(id);if(it){it.done=el.checked;it.completedAt=it.done?Date.now():null;tdUpd(it,{done:it.done,completed_at:it.completedAt});render()}break}
    case 'edit':UI.edit=id;UI.editVal=null;UI.timeEdit=null;render();break;
    case 'edit-ok':{var inp=document.querySelector('input.edit');commitEdit(id,inp?inp.value:'');break}
    case 'del':{var it2=findCl(id);if(it2){CL.items=CL.items.filter(function(x){return x.id!==id});tdDel(it2);render()}break}
    case 'add':{var key=el.getAttribute('data-key'),ai=document.querySelector('input[data-add="'+key+'"]');addCl(key,ai?ai.value:'');break}
    case 'paid':{var arr=el.getAttribute('data-k')==='stay'?M.stays:M.expenses;arr.forEach(function(o){if(o.cid===id){o.d.paid=!o.d.paid;tiUp(el.getAttribute('data-k')==='stay'?'stay':'expense',o)}});render();break}
    case 'exp-new':openExp(null);break;
    case 'expedit':openExp(id);break;
    case 'xpick':{
      var xref=el.getAttribute('data-ref'),xnm=el.getAttribute('data-name');
      if(UI.expDraft){
        UI.expDraft.ref=xref;UI.expDraft.name=xnm;
        var xin=document.getElementById('x_name');if(xin)xin.value=xnm;
        var xi=refInfo(xref),guess=null;
        if(xi&&xi.t==='spot'){var xsp=M.spots.filter(function(q){return q.cid===xi.cid})[0];if(xsp)guess=spotCatToEcat(xsp.d.cat)}
        else if(xi&&xi.t==='event'){var xe=findEvent(xi.cid),xs=xe?spotOfEvent(xe):null;if(xs)guess=spotCatToEcat(xs.d.cat)}
        if(guess){UI.expDraft.cat=guess;Array.prototype.forEach.call(document.querySelectorAll('[data-act="expcat"]'),function(b){var on=b.getAttribute('data-v')===guess;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
        refreshXSug();persistDraft();
      }
      break}
    case 'xunlink':{if(UI.expDraft){UI.expDraft.ref='';refreshXSug();persistDraft()}break}
    case 'expcat':{if(UI.expDraft)UI.expDraft.cat=v;Array.prototype.forEach.call(el.parentNode.querySelectorAll('.tsb'),function(b){var on=b===el;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});break}
    case 'exppay':{if(UI.expDraft)UI.expDraft.pay=v;Array.prototype.forEach.call(el.parentNode.querySelectorAll('.tsb'),function(b){var on=b===el;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});break}
    case 'expcur':{if(UI.expDraft)UI.expDraft.cur=v;Array.prototype.forEach.call(el.parentNode.querySelectorAll('.tsb'),function(b){var on=b===el;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});var sy=document.getElementById('x_sym');if(sy)sy.textContent=v==='KRW'?'₩':'¥';updateExpLine();break}
    case 'payedit':{var parr=el.getAttribute('data-k')==='stay'?M.stays:M.expenses;var po=parr.filter(function(o){return o.cid===id})[0];if(po){UI.payDraft={k:el.getAttribute('data-k'),id:id,name:po.d.name,amt:String(po.d.amount),cur:po.d.currency==='JPY'?'JPY':'KRW',paid:!!po.d.paid};UI.sheet='pay';render()}break}
    case 'paycur':{if(UI.payDraft)UI.payDraft.cur=v;Array.prototype.forEach.call(el.parentNode.querySelectorAll('.tsb'),function(b){var on=b===el;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});var ps=document.getElementById('p_sym');if(ps)ps.textContent=v==='KRW'?'₩':'¥';break}
    case 'paystat':{if(UI.payDraft)UI.payDraft.paid=(v==='true');Array.prototype.forEach.call(el.parentNode.querySelectorAll('.tsb'),function(b){var on=b===el;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});break}
    case 'pay-save':{
      var pdr=UI.payDraft;if(!pdr)break;
      var pa=parseInt((document.getElementById('p_amt').value||'').replace(/[^0-9]/g,''),10);
      if(!pa){toast('금액을 입력해 주세요');break}
      var pArr=pdr.k==='stay'?M.stays:M.expenses;var pObj=pArr.filter(function(o){return o.cid===pdr.id})[0];
      if(pObj){pObj.d.amount=pa;pObj.d.currency=pdr.cur;pObj.d.paid=!!pdr.paid;tiUp(pdr.k==='stay'?'stay':'expense',pObj)}
      UI.sheet=null;UI.payDraft=null;render();toast('저장했어요');break}
    case 'pay-del':{var pd2=UI.payDraft;if(pd2&&pd2.k==='exp'){var po2=M.expenses.filter(function(o){return o.cid===pd2.id})[0];if(po2){M.expenses=M.expenses.filter(function(o){return o.cid!==pd2.id});tiDel(po2)}}UI.sheet=null;UI.payDraft=null;render();break}
    case 'exp-save':saveExp();break;
    case 'exp-del':{var ex=M.expenses.filter(function(x){return x.cid===id})[0];if(ex){M.expenses=M.expenses.filter(function(x){return x.cid!==id});tiDel(ex)}UI.sheet=null;UI.expDraft=null;render();break}
    case 'fxmode':{var f0=fxGet();if(v==='auto'){f0.auto=true;tiUp('trip',M.trip);fetchFx(true)}else{f0.auto=false;tiUp('trip',M.trip)}render();break}
    case 'spc':UI.spCity=v;render();break;
    case 'spcat':UI.spCat=v;render();break;
    case 'spedit':{
      var spe=M.spots.filter(function(q){return q.cid===id})[0];
      if(spe){UI.spDraft={id:spe.cid,name:spe.d.name,cat:spe.d.cat||'meal',city:spe.d.city,desc:spe.d.desc||'',map:(spe.d.map&&spe.d.map!==spe.d.name)?spe.d.map:''};UI.sheet='spedit';render()}
      break}
    case 'spcatpick':{if(UI.spDraft)UI.spDraft.cat=v;Array.prototype.forEach.call(el.parentNode.querySelectorAll('.tsb'),function(b){var on=b===el;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});break}
    case 'spcitypick':{if(UI.spDraft)UI.spDraft.city=v;Array.prototype.forEach.call(el.parentNode.querySelectorAll('.tsb'),function(b){var on=b===el;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});break}
    case 'spedit-save':{
      var sdr=UI.spDraft;if(!sdr)break;
      var sps=M.spots.filter(function(q){return q.cid===sdr.id})[0];if(!sps)break;
      var nn=(document.getElementById('sp_name').value||'').trim();
      if(!nn){toast('이름을 입력해 주세요');break}
      var ndesc=(document.getElementById('sp_desc').value||'').trim(),nmap=(document.getElementById('sp_map').value||'').trim()||nn;
      var oldName=sps.d.name,oldMap=sps.d.map;
      if(nn!==oldName){
        Object.keys(M.events).forEach(function(dk){M.events[dk].forEach(function(e){
          var linkedByName=(e.d.title||'').trim()===oldName;
          if(e.d.spot===sps.cid||linkedByName){
            var chg=false;
            if(linkedByName){e.d.title=nn;chg=true}
            if(!e.d.spot){e.d.spot=sps.cid;chg=true}
            if(e.d.map&&(e.d.map===oldMap||e.d.map===oldName)){e.d.map=nmap;chg=true}
            if(chg)tiUp('event',e);
          }
        })});
      }
      sps.d.name=nn;sps.d.cat=sdr.cat;sps.d.city=sdr.city;sps.d.map=nmap;
      if(ndesc)sps.d.desc=ndesc;else delete sps.d.desc;
      tiUp('spot',sps);
      UI.sheet=null;UI.spDraft=null;render();toast('저장했어요');break}
    case 'sp-state':{
      var spx=M.spots.filter(function(q){return q.cid===id})[0];
      if(spx&&spotState(spx.d)!==v){
        var prevSt=spx.d.state;spx.d.state=v;tiUp('spot',spx);render();
        toastUndo('"'+spx.d.name+'" '+(v==='done'?'다녀옴':'갈 곳')+'으로 바꿨어요',function(){spx.d.state=prevSt;tiUp('spot',spx);render()});
      }
      break}
    case 'undo':{var uf=UI.undoFn;UI.undoFn=null;document.getElementById('toast').innerHTML='';clearTimeout(UI.toastT);if(uf)uf();break}
    case 'sp-del':{var sp=M.spots.filter(function(x){return x.cid===id})[0];if(sp){M.spots=M.spots.filter(function(x){return x.cid!==id});tiDel(sp);render()}break}
    case 'sp-new':UI.addSpot=true;render();break;
    case 'sp-cancel':UI.addSpot=false;render();break;
    case 'sp-save':{
      var nm2=(document.getElementById('s_name').value||'').trim();if(!nm2){toast('이름을 입력해 주세요');break}
      var so={cid:'spot_'+genCid(),date:null,sort:Date.now()%100000000,d:{city:UI.spCity,cat:document.getElementById('s_cat').value,name:nm2,desc:(document.getElementById('s_desc').value||'').trim(),state:'go',map:(document.getElementById('s_map').value||'').trim()||nm2}};
      M.spots.push(so);tiUp('spot',so);UI.addSpot=false;render();break}
    case 'key-save':{
      var k=(document.getElementById('k_in').value||'').trim();if(!k){toast('키를 입력해 주세요');break}
      cfg.key=k;lset('cfg',cfg);UI.sheet=null;UI.keyBad=false;
      loadTrips().then(function(){loadTrip();return pull(true)}).then(function(){render();toast(M?'불러왔어요':'데이터를 찾지 못했어요')});break}
    case 'trip-open':{cfg.tripId=id;lset('cfg',cfg);UI.sheet=null;loadTrip();render();pull(true);break}
    case 'evck':{var ev0=findEvent(id);if(ev0){ev0.d.done=!ev0.d.done;if(ev0.d.done)ev0.d.doneAt=Date.now();else{delete ev0.d.doneAt}UI.evTimeEdit=null;tiUp('event',ev0);var lsp=spotOfEvent(ev0);if(lsp){lsp.d.state=ev0.d.done?'done':'go';tiUp('spot',lsp)}render()}break}
    case 'evtime':UI.evTimeEdit=id;render();{var ei2=document.querySelector('input.evtin');if(ei2)ei2.focus()}break;
    case 'evnew':openEv(null,el.getAttribute('data-date'));break;
    case 'evedit':openEv(id);break;
    case 'spot2ev':openEv(null,UI.sched||clampDate(today()),id);break;
    case 'evpick':{
      var psp=M.spots.filter(function(x){return x.cid===id})[0];
      if(psp&&UI.evDraft){
        UI.evDraft.spot=psp.cid;UI.evDraft.title=psp.d.name;
        var pti=document.getElementById('ev_title'),pma=document.getElementById('ev_map'),pde=document.getElementById('ev_desc');
        if(pti)pti.value=psp.d.name;
        if(pma&&!pma.value.trim())pma.value=psp.d.map||psp.d.name;
        if(pde&&!pde.value.trim())pde.value=psp.d.desc||'';
        var pcs=({meal:'noon',cafe:'pm',sight:'pm',snack:'pm'})[psp.d.cat];
        if(pcs&&!document.getElementById('ev_time').value){UI.evDraft.slot=pcs;Array.prototype.forEach.call(document.querySelectorAll('[data-act="evslot"]'),function(b){var on=b.getAttribute('data-v')===pcs;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
        refreshSug();persistDraft();
      }
      break}
    case 'evunlink':{if(UI.evDraft){UI.evDraft.spot='';refreshSug();persistDraft()}break}
    case 'evslot':{if(UI.evDraft)UI.evDraft.slot=v;Array.prototype.forEach.call(el.parentNode.querySelectorAll('.tsb'),function(b){var on=b===el;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});break}
    case 'evmap':{if(UI.evDraft)UI.evDraft.mapOn=(v==='true');Array.prototype.forEach.call(el.parentNode.querySelectorAll('.tsb'),function(b){var on=b===el;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});break}
    case 'ev-save':saveEv();break;
    case 'ev-del':{var ex2=findEvent(id);if(ex2){removeEvent(ex2);tiDel(ex2)}UI.sheet=null;UI.evDraft=null;render();toast('삭제했어요');break}
    case 'dprev':UI.vd=addDays(viewDate(),-1);render();break;
    case 'dnext':UI.vd=addDays(viewDate(),1);render();break;
    case 'adds':{UI.addTs[el.getAttribute('data-key')]=v;Array.prototype.forEach.call(el.parentNode.querySelectorAll('.tsb'),function(b){var on=b===el;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});break}
    case 'edits':{var ein=document.querySelector('input.edit');UI.editVal=ein?ein.value:null;var eit=findCl(id);if(eit){eit.ts=v;tdUpd(eit,{time_section:v})}render();break}
    case 'ctime':UI.timeEdit=id;render();{var ti=document.querySelector('input.ctin');if(ti)ti.focus()}break;
    case 'trip-save':{
      var t=trip(),ttl=(document.getElementById('te_title').value||'').trim(),st=document.getElementById('te_start').value,en=document.getElementById('te_end').value;
      if(!ttl){toast('여행명을 입력해 주세요');break}
      if(!st||!en||en<st){toast('기간을 확인해 주세요');break}
      t.title=ttl;t.start=st;t.end=en;t.status=document.getElementById('te_status').value;
      Array.prototype.forEach.call(document.querySelectorAll('.te_city'),function(ci){var c=t.cities[+ci.getAttribute('data-i')];var nm=(ci.value||'').trim();if(c&&nm)c.name=nm});
      tiUp('trip',M.trip);
      TRIPS=TRIPS.map(function(r){return r.trip_id===cfg.tripId?{trip_id:r.trip_id,data:t}:r});lset('trips',TRIPS);
      UI.vd=null;UI.sched=null;UI.sheet='trips';render();toast('저장했어요');break}
    case 'export':doExport();break;
  }
  if(a==='evslot'||a==='evmap'||a==='expcat'||a==='exppay'||a==='expcur')persistDraft();
}
function onChange(e){
  var el=e.target;
  if(el.id==='x_date'&&UI.expDraft){UI.expDraft.date=el.value;refreshXSug();persistDraft();return}
  if(el.id==='ev_date'&&UI.evDraft){UI.evDraft.date=el.value;refreshSug();persistDraft();return}
  if(el.classList&&el.classList.contains('evtin')){
    var evx=findEvent(el.getAttribute('data-id'));
    if(evx&&evx.d.doneAt&&/^\d{1,2}:\d{2}$/.test(el.value)){evx.d.doneAt=setTimeOnly(evx.d.doneAt,el.value);tiUp('event',evx)}
    UI.evTimeEdit=null;render();return;
  }
  if(el.classList&&el.classList.contains('ctin')){
    var cit=findCl(el.getAttribute('data-id'));
    if(cit&&cit.completedAt&&/^\d{1,2}:\d{2}$/.test(el.value)){cit.completedAt=setTimeOnly(cit.completedAt,el.value);tdUpd(cit,{completed_at:cit.completedAt})}
    return;
  }
  if(el.matches&&el.matches('input[data-act="ck"]'))return onClick({target:el});
  if(el.id==='imp'){doImport(el.files&&el.files[0]);return}
  if(el.hasAttribute('data-cust')){
    var p=el.getAttribute('data-cust').split('|'),ch=M.choices[p[0]+'|'+p[1]];
    if(ch){ch.d.text=el.value;tiUp('choice',ch)}return;
  }
  if(el.hasAttribute('data-evspot')){
    var sp0=M.spots.filter(function(x){return x.cid===el.value})[0];
    if(UI.evDraft)UI.evDraft.spot=el.value;
    if(sp0){
      var ti=document.getElementById('ev_title'),ma=document.getElementById('ev_map'),de=document.getElementById('ev_desc');
      if(ti)ti.value=sp0.d.name;
      if(ma&&!ma.value.trim())ma.value=sp0.d.map||sp0.d.name;
      if(de&&!de.value.trim())de.value=sp0.d.desc||'';
      var cs={meal:'noon',cafe:'pm',sight:'pm',snack:'pm'}[sp0.d.cat];
      if(cs&&UI.evDraft){UI.evDraft.slot=cs;Array.prototype.forEach.call(document.querySelectorAll('[data-act="evslot"]'),function(b){var on=b.getAttribute('data-v')===cs;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
    }
    return;
  }
  if(el.hasAttribute('data-evtime')){
    if(el.value&&UI.evDraft){var sl=timeToSlot(el.value);UI.evDraft.slot=sl;Array.prototype.forEach.call(document.querySelectorAll('[data-act="evslot"]'),function(b){var on=b.getAttribute('data-v')===sl;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
    return;
  }
  if(el.hasAttribute('data-expref')){
    var ri=refInfo(el.value),nin=document.getElementById('x_name');
    if(ri&&nin&&!nin.value.trim())nin.value=ri.name;
    if(UI.expDraft)UI.expDraft.ref=el.value;
    persistDraft();return;
  }
  if(el.hasAttribute('data-fxadj')){
    var ad=parseFloat(String(el.value).replace(',','.'));var ff=fxGet();
    if(isFinite(ad)){ff.adj=ad;if(ff.base)ff.JPY=Math.round(ff.base*(1+ad/100)*1000)/1000;tiUp('trip',M.trip);render()}
    return;
  }
  if(el.hasAttribute('data-fx')){
    var f=parseFloat(String(el.value).replace(',','.'));
    if(f>0){var fo=fxGet();fo.JPY=f;fo.auto=false;tiUp('trip',M.trip);render()}else toast('환율을 숫자로 입력해 주세요');
  }
}
function onKey(e){
  var el=e.target;
  if(e.key==='Enter'&&!e.isComposing){
    if(el.hasAttribute&&el.hasAttribute('data-add')){e.preventDefault();addCl(el.getAttribute('data-add'),el.value)}
    else if(el.classList&&el.classList.contains('edit')){e.preventDefault();commitEdit(el.getAttribute('data-id'),el.value)}
  }else if(e.key==='Escape'&&el.classList&&el.classList.contains('edit')){UI.edit=null;render()}
}
function onBlur(e){var el=e.target;if(el.classList&&el.classList.contains('edit'))commitEdit(el.getAttribute('data-id'),el.value);else if(el.classList&&el.classList.contains('ctin')){UI.timeEdit=null;render()}else if(el.classList&&el.classList.contains('evtin')){UI.evTimeEdit=null;render()}}

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
        var td=(j.checklist||[]).map(function(it){return {date_key:it.date,text:it.t,done:!!it.done,created:it.created,client_id:it.id,time_section:it.ts||'none',cat:'todo',completed_at:it.completedAt||null,is_event:false}});
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
  document.addEventListener('touchstart',onTouchStart,{passive:true});
  document.addEventListener('touchend',onTouchEnd,{passive:true});
  document.addEventListener('input',function(e){var el=e.target;if(el&&el.id==='x_amt'){var n=parseInt(String(el.value).replace(/[^0-9]/g,''),10)||0;updateExpLine()}if(el&&el.id==='ev_title'&&UI.evDraft){UI.evDraft.title=el.value;refreshSug()}if(el&&el.id==='x_name'&&UI.expDraft){UI.expDraft.name=el.value;refreshXSug()}if(el&&el.id&&(el.id.indexOf('ev_')===0||el.id.indexOf('x_')===0))persistDraft()});
  document.addEventListener('focusout',onBlur);
  loadTrip();
  render();
  restoreDraft();
  window.addEventListener('pageshow',function(e){if(e.persisted){render();pull()}});
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
window.__triplog={periodOf:periodOf,pull:pull,flush:flush,state:function(){return {UI:UI,M:M,CL:CL,Q:Q,cfg:cfg}},render:render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
