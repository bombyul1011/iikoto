(function(){
'use strict';
/* 버전은 iitabi.html의 <script src="iitabi.js?v=…"> 한 곳에서만 올린다(서비스 워커·화면 표시는 여기서 읽어 쓴다) */
var VER=(function(){try{return new URL(document.currentScript.src).searchParams.get('v')||'dev'}catch(e){return 'dev'}})();
var SUPA_URL='https://vqvpzrxmtpryzhontlxc.supabase.co';
var SUPA_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdnB6cnhtdHByeXpob250bHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNTgxMjksImV4cCI6MjA5NjYzNDEyOX0.pbtq1UMPC7ylYM1H2xVa19C1TFlceLmEfEtkz3WK2VI';
var LSP='iitabi:';
function lget(k,d){try{var v=localStorage.getItem(LSP+k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function lset(k,v){try{localStorage.setItem(LSP+k,JSON.stringify(v))}catch(e){}}
/* 색 팔레트: [글자, 배경, 진한색, 테두리] — 도시·분류·탭 색의 단일 출처 */
var PAL={
  rose:['rgb(142,51,51)','rgba(230,126,126,.52)','rgba(205,95,95,.85)','rgba(205,95,95,.55)'],
  sky:['rgb(41,97,130)','rgba(170,208,228,.55)','rgba(75,145,180,.85)','rgba(75,145,180,.55)'],
  mint:['rgb(34,103,68)','rgba(145,210,175,.55)','rgba(70,155,110,.85)','rgba(70,155,110,.55)'],
  orange:['rgb(147,71,14)','rgba(255,190,130,.58)','rgba(235,130,50,.85)','rgba(235,130,50,.55)'],
  pink:['rgb(165,55,97)','rgba(255,175,200,.38)','rgba(214,90,140,.85)','rgba(214,90,140,.55)'],
  lime:['rgb(81,103,29)','rgba(200,220,140,.55)','rgba(135,165,60,.85)','rgba(135,165,60,.55)'],
  lav:['rgb(120,69,139)','rgba(210,175,225,.55)','rgba(160,105,180,.85)','rgba(160,105,180,.55)'],
  yel:['rgb(135,99,0)','rgba(255,225,120,.6)','rgba(235,180,20,.85)','rgba(235,180,20,.55)'],
  gray:['rgb(108,101,93)','rgba(195,175,168,.3)','rgba(150,135,125,.85)','rgba(195,175,168,.55)']};
var CITYK=['rose','sky','mint','orange','pink','lime'];
var CITYC=CITYK.map(function(k){return PAL[k]});
var CH=[PAL.mint[1],PAL.rose[1],PAL.gray[3],PAL.yel[1]];  // 경비 그래프: 항공·숙소·기타·현지 (도시 알약과 같은 중간톤)
var CAT={meal:'식사',cafe:'카페',sight:'명소',snack:'간식'};
var SLOTL={am:'오전',noon:'점심',pm:'오후',eve:'저녁'};
var SLOTDEF={am:'09:00',noon:'12:00',pm:'15:00',eve:'19:00'};
var SPOT_SLOT={meal:'noon',cafe:'pm',sight:'pm',snack:'pm'};
var SPOT_ECAT={meal:'food',cafe:'cafe',sight:'entry',snack:'food'};
var CATI={meal:'tools-kitchen-2',cafe:'coffee',sight:'camera',snack:'cookie'};
var CATC={meal:'orange',cafe:'pink',sight:'lime',snack:'yel'};
var ECATC={food:'orange',cafe:'pink',move:'sky',shop:'lav',conv:'yel',entry:'lime',etc:'gray'};
var TABC={today:'orange',sched:'sky',check:'lav',budget:'mint',spots:'rose'};
var ECAT={food:'식사',cafe:'카페',move:'교통',shop:'쇼핑',conv:'편의점',entry:'관광',etc:'기타'};
var ECATI={food:'tools-kitchen-2',cafe:'coffee',move:'train',shop:'shopping-bag',conv:'building-store',entry:'ticket',etc:'dots'};
var TI={sun:'sun',cal:'calendar',chk:'list-check',wal:'wallet',pin:'map-pin',nav:'navigation',chevd:'chevron-down',chevr:'chevron-right',chevl:'chevron-left',plus:'plus',pen:'pencil',x:'x',check:'check',cloud:'cloud',cloudok:'cloud-check',cloudoff:'cloud-off',refresh:'refresh',ext:'external-link',plane:'plane',bed:'bed',bus:'bus',checkc:'circle-check',dl:'download',ul:'upload',clock:'clock',notes:'notes',calplus:'calendar-plus'};
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
function byCid(arr,id){for(var i=0;i<arr.length;i++){if(arr[i].cid===id)return arr[i]}return null}
function parseAmt(v){return parseInt(String(v==null?'':v).replace(/[^0-9]/g,''),10)||0}
function curSym(c){return c==='KRW'?'₩':'¥'}
function typing(){if(PK)return true;var ae=document.activeElement;return !!(ae&&((ae.tagName==='INPUT'&&ae.type!=='checkbox'&&ae.type!=='radio')||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'))}
function pickOn(el){Array.prototype.forEach.call(el.parentNode.querySelectorAll('.tsb'),function(b){var on=b===el;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
function setPick(act,v){Array.prototype.forEach.call(document.querySelectorAll('[data-act="'+act+'"]'),function(b){var on=b.getAttribute('data-v')===v;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
function shead(t,act,v,label){return '<div class="row between"><h1 style="font-size:22px">'+esc(t)+'</h1><button class="btn" style="border:0;background:transparent" data-act="'+(act||'sheet-close')+'"'+(v?' data-v="'+v+'"':'')+' aria-label="'+(label||'닫기')+'">'+ic('x',20)+'</button></div>'}
function endSheet(){UI.sheet=null;UI.expDraft=UI.evDraft=UI.payDraft=UI.spDraft=UI.clDraft=null;clearDraft()}  // 열린 시트와 작성 중 내용을 모두 비운다(화면은 호출 쪽에서 그림)
function closeSheet(){endSheet();render()}
function byTimeDesc(a,b){return String(b.d.time||'')<String(a.d.time||'')?-1:1}
function byMemoTime(a,b){var x=String(a.memo_time||'99:99'),y=String(b.memo_time||'99:99');return x<y?-1:(x>y?1:0)}

/* ---------- state ---------- */
var cfg=lget('cfg',{key:'',tripId:''});
var PK=null;  // 열려 있는 날짜·시간 선택 모달 상태
var UI={tab:'today',sched:null,clDate:null,spCity:null,spCat:'all',sheet:null,edit:null,status:'',syncAt:null,keyBad:false,addSpot:false,vd:null,addTxt:{},editVal:null,expDraft:null,evDraft:null,payDraft:null,spDraft:null,wkAnim:null,undoFn:null,toastT:null};
var PINH='';  // 화면 상단에 고정할 HTML(일정·경비 탭). render()가 #pin에 넣는다
var M=null,CL={items:[]},MEMOS=[],WX={},MIR={},Q=lget('q',[]),TRIPS=lget('trips',[]);  // MIR: 이이코토 시간표로 보낸 일정 {이름표:{date}}
function saveQ(){lset('q',Q)}
function loadTrip(){
  if(!cfg.tripId){M=null;CL={items:[]};MEMOS=[];WX={};MIR={};return}
  var rows=lget('rows:'+cfg.tripId,null);
  M=rows?buildModel(rows):null;
  CL=lget('cl:'+cfg.tripId,{items:[]});
  MEMOS=lget('memos:'+cfg.tripId,[]);
  WX=lget('wx:'+cfg.tripId,{});
  MIR=lget('mir:'+cfg.tripId,{});
}
function buildModel(rows){
  var m={trip:null,stays:[],events:{},plans:{},choices:{},spots:[],expenses:[]};
  rows=rows.slice().sort(function(a,b){return (a.sort_order||0)-(b.sort_order||0)});
  rows.forEach(function(r){
    var o={cid:r.client_id,date:r.date_key||null,sort:r.sort_order||0,d:r.data||{}};
    switch(r.kind){
      case 'trip':if(!Array.isArray(o.d.cities))o.d.cities=[];m.trip=o;break;
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
  var h={'apikey':SUPA_ANON,'Authorization':'Bearer '+SUPA_ANON,'Content-Type':'application/json','x-client-info':'iitabi|'+(cfg.key||'')};
  if(prefer)h['Prefer']=prefer;
  return fetch(SUPA_URL+'/rest/v1/'+path,{method:method||'GET',headers:h,body:body?JSON.stringify(body):undefined}).then(function(r){
    if(!r.ok)return r.text().then(function(t){console.warn('iitabi supa',r.status,path,t);return null});
    if(method&&method!=='GET')return (prefer&&prefer.indexOf('return=representation')>=0)?r.json():true;
    return r.json();
  }).catch(function(){return null});
}
/* 큐: 전송 중인 작업(inflight)은 끝난 뒤 자기 자신만 큐에서 빠진다. 같은 대상의 새 작업은 그 뒤에 쌓인다. */
var flushing=false,inflight=null,needPull=false;
function qWaiting(t,cid,op){return Q.some(function(o){return o!==inflight&&o.t===t&&o.cid===cid&&o.op===op})}
function qDrop(fn){Q=Q.filter(function(o){return o===inflight||!fn(o)})}
function tiUp(kind,o){
  qDrop(function(x){return x.t==='ti'&&x.op==='up'&&x.cid===o.cid});
  Q.push({t:'ti',op:'up',trip:cfg.tripId,kind:kind,cid:o.cid,date:o.date||null,sort:o.sort||0,data:o.d});
  saveQ();saveRows();flush();
  if(kind==='expense')syncPayMemos();
}
function tiDel(o){
  qDrop(function(x){return x.t==='ti'&&x.cid===o.cid});
  Q.push({t:'ti',op:'del',trip:cfg.tripId,cid:o.cid});
  saveQ();saveRows();flush();
  if(o.d&&o.d.local)syncPayMemos();
}
function prefix(){var t=trip();return (t&&t.cl_prefix)||('iitabi_'+cfg.tripId+'_')}
function clKey(it){return it.pre?'pre':it.date}
function preDate(){var t=trip();return (t&&t.pre_date)||(t&&t.start)||today()}
function clDate(key){return key==='pre'?preDate():key}
function newClId(key){return prefix()+(key==='pre'?'pre_':'d'+key.replace(/-/g,'').slice(4)+'_')+genCid()}
function tiUndoDel(o){qDrop(function(x){return x.t==='ti'&&x.op==='del'&&x.cid===o.cid})}
function tdUndoDel(it){qDrop(function(x){return x.t==='td'&&x.op==='del'&&x.cid===it.id});CL.items.push(it);tdAdd(it)}
/* ---------- 이이코토 반영: 완료한 일정 → 시간표 투두 / 하루 지출 → 메모 한 줄 ----------
   이름표(client_id) 접두사로 이이타비가 만든 행을 구분한다. 체크리스트 접두사(iitabi_여행ID_)와 첫 글자부터 달라 서로 섞이지 않고,
   지출 메모는 이이타비가 메모를 받아올 때 접두사로 걸러 화면에 다시 나오지 않는다. 이이코토 쪽 코드는 건드리지 않는다. */
var TV_PRE='tv-iitabi-',PAY_PRE='pay-iitabi-',PAY_HOUR=23;
function qMir(t,cid){qDrop(function(x){return x.t===t&&x.cid===cid})}
function saveMir(){if(cfg.tripId)lset('mir:'+cfg.tripId,MIR)}
/* 일정 완료 → 이이코토 시간표 항목("HH:MM 제목", 완료 상태·완료 시각). 완료 해제·삭제면 지운다 */
function mirrorEvent(e){
  var cid=TV_PRE+e.cid,prev=MIR[cid];
  if(e.d.done&&e.d.doneAt){
    qMir('tv',cid);
    if(prev&&prev.date!==e.date)Q.push({t:'tv',op:'del',cid:cid});  // 날짜를 옮겼으면 옛 날짜 행을 먼저 지운다
    Q.push({t:'tv',op:'up',cid:cid,date:e.date,text:hhmm(e.d.doneAt)+' '+e.d.title,at:e.d.doneAt});
    MIR[cid]={date:e.date};
  }else if(prev){qMir('tv',cid);Q.push({t:'tv',op:'del',cid:cid});delete MIR[cid]}
  else return;
  saveQ();saveMir();flush();
}
function mirrorDel(e){
  var cid=TV_PRE+e.cid;if(!MIR[cid])return;
  qMir('tv',cid);Q.push({t:'tv',op:'del',cid:cid});delete MIR[cid];saveQ();saveMir();flush();
}
function mirrorAll(){
  var n=0;
  Object.keys(M.events).forEach(function(d){M.events[d].forEach(function(e){if(e.d.done&&e.d.doneAt){delete MIR[TV_PRE+e.cid];mirrorEvent(e);n++}})});
  return n;
}
/* 하루 지출 → 그날 23시 이후(앱을 열 때) 메모 한 줄. 지나간 날은 밀린 것도 한꺼번에 채운다.
   마지막으로 보낸 글을 기억해 두고 지출이 바뀔 때만 다시 보낸다(이이코토에서 지운 메모는 그날 지출이 바뀌기 전엔 되살리지 않는다) */
function payMemoText(list){
  var i=sumInfo(list);
  return '💴 오늘 지출 '+(i.jpy?'약 '+won(i.est)+'원 (¥'+won(i.jpy)+')':won(i.est)+'원')+' · '+list.length+'건';
}
function syncPayMemos(){
  if(!M||!cfg.tripId)return;
  var td=today(),hour=new Date().getHours(),PM=lget('pm:'+cfg.tripId,{}),changed=false;
  tripDates().forEach(function(d){
    if(d>td||(d===td&&hour<PAY_HOUR))return;
    var list=localList().filter(function(x){return x.d.date===d}),text=list.length?payMemoText(list):'';
    if((PM[d]||'')===text)return;
    var cid=PAY_PRE+d,p=parse(d);p.setHours(PAY_HOUR,0,0,0);
    qMir('pm',cid);
    Q.push(text?{t:'pm',op:'up',cid:cid,date:d,text:text,time:pad(PAY_HOUR)+':00',created:p.getTime()}:{t:'pm',op:'del',cid:cid});
    PM[d]=text;changed=true;
  });
  if(changed){lset('pm:'+cfg.tripId,PM);saveQ();flush()}
}
function alIso(dk,hm){  // 그날 HH:MM → 기기 시간대 오프셋을 반영한 ISO(본앱 scheduleAlertAt과 같은 방식)
  var p=dk.split('-').map(Number),h=hm.split(':').map(Number),d=new Date(p[0],p[1]-1,p[2],h[0],h[1],0),off=-d.getTimezoneOffset(),sg=off>=0?'+':'-';
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())+':00'+sg+pad(Math.floor(Math.abs(off)/60))+':'+pad(Math.abs(off)%60);
}
/* 알림 예약 정리: 켜져 있고 미완료면 예약(덮어쓰기), 아니면 — 이전에 알림이 있었던 경우에만 — 예약·스누즈 삭제 */
function alUpdate(it,had){
  qDrop(function(x){return x.t==='al'&&x.cid===it.id});
  if(it.at&&it.ao&&!it.done&&!it.pre)Q.push({t:'al',op:'up',cid:it.id,iso:alIso(clDate(clKey(it)),it.at),title:it.t});
  else if(had)Q.push({t:'al',op:'del',cid:it.id});
  saveQ();flush();
}
function setItemAlert(it,at,ao){var had=!!it.at;it.at=at||'';it.ao=!!(at&&ao);tdUpd(it,{alert_time:it.at||null,todo_alert_on:it.ao});alUpdate(it,had)}
function tdAdd(it){Q.push({t:'td',op:'add',cid:it.id});saveQ();saveCL();flush();if(it.at)alUpdate(it,false)}
function tdUpd(it,f){if(qWaiting('td',it.id,'add')){saveCL();return}Q.push({t:'td',op:'upd',cid:it.id,date:it.date,f:f});saveQ();saveCL();flush()}
function tdDel(it){
  var had=qWaiting('td',it.id,'add');
  qDrop(function(x){return (x.t==='td'||x.t==='al')&&x.cid===it.id});
  if(!had)Q.push({t:'td',op:'del',cid:it.id,date:it.date});
  if(it.at)Q.push({t:'al',op:'del',cid:it.id});
  saveQ();saveCL();flush();
}
function flush(){
  if(flushing)return Promise.resolve();
  flushing=true;
  function next(){
    if(!Q.length)return Promise.resolve();
    var op=inflight=Q[0],p;
    if(op.t==='ti'&&op.op==='up'){
      p=sf('trip_items?on_conflict=trip_id,client_id','POST',[{trip_id:op.trip,kind:op.kind,client_id:op.cid,date_key:op.date,sort_order:op.sort,data:op.data,deleted_at:null}],'resolution=merge-duplicates,return=minimal');
    }else if(op.t==='ti'&&op.op==='del'){
      p=sf('trip_items?trip_id=eq.'+enc(op.trip)+'&client_id=eq.'+enc(op.cid),'PATCH',{deleted_at:new Date().toISOString()},'return=minimal');
    }else if(op.t==='td'&&op.op==='add'){
      var it=findCl(op.cid);
      if(!it)p=Promise.resolve(true);
      else p=sf('todos?on_conflict=date_key,client_id','POST',[{date_key:clDate(clKey(it)),text:it.t,done:!!it.done,created:it.created,client_id:it.id,time_section:it.ts||'none',cat:it.cat||'todo',completed_at:it.done?(it.completedAt||Date.now()):null,is_event:false,alert_time:it.at||null,todo_alert_on:!!(it.at&&it.ao)}],'resolution=ignore-duplicates,return=minimal');
    }else if(op.t==='td'&&op.op==='upd'){
      p=sf('todos?client_id=eq.'+enc(op.cid),'PATCH',op.f,'return=representation').then(function(rows){
        if(rows===null)return null;                     // 네트워크 실패 → 큐에 남겨 재시도
        if(Array.isArray(rows)&&!rows.length)needPull=true;  // 서버에 그 항목이 없음(본앱에서 삭제·이동) → 서버 기준으로 다시 맞춤
        return true;
      });
    }else if(op.t==='td'&&op.op==='del'){
      p=sf('todos?client_id=eq.'+enc(op.cid),'DELETE');
    }else if(op.t==='al'){  // 이이코토 알림 예약 — 본앱과 같은 alerts 행(source_type 'todo'). 계속 실패하면 큐가 막히지 않게 3번 뒤 포기
      p=(op.op==='up'
        ?sf('alerts?on_conflict=source_type,source_cid','POST',[{source_type:'todo',source_cid:op.cid,alert_at:op.iso,title:op.title||'',body:null,sent:false}],'resolution=merge-duplicates,return=minimal')
        :sf('alerts?source_type=in.(todo,todo_snooze)&source_cid=eq.'+enc(op.cid),'DELETE')
      ).then(function(r){if(r)return true;op.fails=(op.fails||0)+1;if(op.fails>=3){toast('알림 예약에 실패했어요');return true}return null});
    }else if(op.t==='tv'&&op.op==='up'){  // 이이코토 시간표 투두(완료 상태)
      p=sf('todos?on_conflict=date_key,client_id','POST',[{date_key:op.date,text:op.text,done:true,created:op.at,client_id:op.cid,time_section:'none',cat:'todo',completed_at:op.at,is_event:false}],'resolution=merge-duplicates,return=minimal');
    }else if(op.t==='tv'&&op.op==='del'){
      p=sf('todos?client_id=eq.'+enc(op.cid),'DELETE');
    }else if(op.t==='pm'&&op.op==='up'){  // 이이코토 메모(하루 지출 한 줄)
      p=sf('memos?on_conflict=date_key,client_id','POST',[{date_key:op.date,memo_time:op.time,text:op.text,created:op.created,client_id:op.cid,photo_url:null,question:null}],'resolution=merge-duplicates,return=minimal');
    }else if(op.t==='pm'&&op.op==='del'){
      p=sf('memos?client_id=eq.'+enc(op.cid),'DELETE');
    }else p=Promise.resolve(true);
    return p.then(function(ok){inflight=null;if(!ok)return;var i=Q.indexOf(op);if(i>=0)Q.splice(i,1);saveQ();return next()});
  }
  function end(){flushing=false;inflight=null;setStatus();if(needPull&&!Q.length){needPull=false;pull(true)}}
  return next().then(end,end);
}
function renderSafe(){if(!typing())render()}
function setStatus(m){UI.status=m||'';var el=document.getElementById('sync');if(el)el.innerHTML=syncHtml()}
function syncHtml(){
  var q=Q.length,x=function(t){return '<span class="synctx">'+t+'</span>'};
  if(UI.status==='sync')return ic('refresh',16,'var(--sub)')+x('동기화 중');
  if(UI.status==='off'||q)return ic('cloudoff',16,'var(--sub)')+x('오프라인'+(q?' · 대기 '+q+'건':''));
  if(UI.keyBad)return ic('cloudoff',16,'rgb(142,51,51)')+x('키 확인 필요');
  return ic('cloudok',16,'var(--sel-tx)')+x('iikoto 동기화됨'+(UI.syncAt?' '+hhmm(UI.syncAt):''));
}

/* ---------- pull ---------- */
function pull(force){
  if(!cfg.key||!cfg.tripId)return Promise.resolve();
  if(!force&&typing())return Promise.resolve();
  setStatus('sync');
  return flush().then(function(){
    if(Q.length){setStatus();return}
    return sf('trip_items?trip_id=eq.'+enc(cfg.tripId)+'&deleted_at=is.null&select=client_id,kind,date_key,sort_order,data&order=sort_order.asc').then(function(rows){
      if(!rows){setStatus('off');return}
      if(!rows.length){UI.keyBad=true;setStatus();render();return}
      UI.keyBad=false;
      if(Q.length){setStatus();return}  // 받는 사이 새로 고친 내용이 있으면 덮어쓰지 않고 다음 동기화로 넘김
      M=buildModel(rows);saveRows();
      return pullTodos().then(function(){return pullMemos()}).then(function(){
        UI.syncAt=Date.now();setStatus();renderSafe();pullWeather();fetchFx();locateCity();syncPayMemos();
      });
    });
  });
}
function pullTodos(){
  return sf('todos?client_id=like.'+enc(prefix())+'*&select=client_id,date_key,text,done,created,completed_at,time_section,alert_time,todo_alert_on,cat&order=created').then(function(rows){
    if(!rows||Q.some(function(o){return o.t==='td'}))return;
    var pre=prefix()+'pre_';
    CL.items=rows.map(function(r){var isPre=r.client_id.indexOf(pre)===0;return {id:r.client_id,date:r.date_key,pre:isPre,t:r.text,ts:r.time_section||'none',done:!!r.done,created:r.created,completedAt:r.completed_at,at:r.alert_time||'',ao:!!r.todo_alert_on,cat:r.cat||'todo'}});
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
  return sf('memos?date_key=in.('+ds_+')&select=client_id,date_key,memo_time,text,photo_url,question,created&order=created').then(function(rows){
    if(!rows)return;MEMOS=rows.filter(function(r){return String(r.client_id||'').indexOf(PAY_PRE)!==0});lset('memos:'+cfg.tripId,MEMOS);  // 이이타비가 만든 지출 메모는 화면에 다시 보이지 않게
  });
}
function hmOf(s){return s&&/T\d{2}:\d{2}/.test(s)?s.slice(s.indexOf('T')+1,s.indexOf('T')+6):null}
function wxHasSun(){var d=WX.d;if(!d)return false;return Object.keys(d).every(function(c){return Object.keys(d[c]).some(function(k){return d[c][k].sr})})}  // 일출·일몰이 없는 예전 저장분이면 다시 받는다
function pullWeather(){
  var t=trip();if(!t||!t.cities.length)return;
  var last=lget('wxAt:'+cfg.tripId,0);
  if(Date.now()-last<3*3600*1000&&WX.d&&wxHasSun())return;
  var fin=0,got=0,out={};
  t.cities.forEach(function(c){
    var u='https://api.open-meteo.com/v1/forecast?latitude='+c.lat+'&longitude='+c.lng+'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunshine_duration,daylight_duration,sunrise,sunset&timezone=auto&forecast_days=16';
    fetch(u).then(function(r){return r.ok?r.json():null}).then(function(j){
      if(j&&j.daily&&j.daily.time){got++;j.daily.time.forEach(function(d,i){
        var sun=j.daily.sunshine_duration?j.daily.sunshine_duration[i]:null,dl=j.daily.daylight_duration?j.daily.daylight_duration[i]:null;
        var pp=j.daily.precipitation_probability_max?j.daily.precipitation_probability_max[i]:null;
        var ratio=(sun!=null&&dl)?sun/dl:null;
        var good=(pp==null||pp<=40)&&(ratio==null||ratio>=0.5);
        (out[c.id]=out[c.id]||{})[d]={tmax:j.daily.temperature_2m_max[i],tmin:j.daily.temperature_2m_min[i],pp:pp,ratio:ratio,sun:good,sr:hmOf(j.daily.sunrise&&j.daily.sunrise[i]),ss:hmOf(j.daily.sunset&&j.daily.sunset[i])};
      })}
    }).catch(function(){}).then(function(){
      fin++;if(fin<t.cities.length)return;
      if(!got)return;   // 전부 실패(오프라인 등): 기존 날씨를 그대로 두고 다음에 다시 시도
      var merged={};Object.keys(WX.d||{}).forEach(function(k){merged[k]=WX.d[k]});Object.keys(out).forEach(function(k){merged[k]=out[k]});  // 받은 도시만 갱신
      WX={d:merged};lset('wx:'+cfg.tripId,WX);
      if(got===t.cities.length)lset('wxAt:'+cfg.tripId,Date.now());   // 일부만 받았으면 다음 기회에 나머지를 다시 받는다
      renderSafe();
    });
  });
}
/* 일출·일몰: 오늘은 현재 위치 기준 도시, 다른 날은 그날 일정의 도시 기준(현재 도시와 일정 도시가 다르면 도시 이름을 붙인다) */
function sunLine(vd){
  var id=vd===today()?curCity():cityOfDate(vd),w=WX.d&&WX.d[id]&&WX.d[id][vd];
  if(!w||!w.sr||!w.ss)return '';
  var name=id!==cityOfDate(vd)?'<span>'+esc(cityName(id))+' ·</span>':'';
  return '<div class="sunl">'+name+ic('sunrise',15,pcol('orange')[2])+'<span>일출 '+w.sr+'</span>'+ic('sunset',15,pcol('pink')[2])+'<span>일몰 '+w.ss+'</span></div>';
}
function loadTrips(){
  return sf('trip_items?kind=eq.trip&deleted_at=is.null&select=trip_id,data&order=created_at.desc').then(function(rows){
    if(!rows)return;TRIPS=rows;lset('trips',TRIPS);
    if(!cfg.tripId&&rows.length){cfg.tripId=rows[0].trip_id;lset('cfg',cfg);loadTrip()}
    else if(!rows.length&&cfg.key){UI.keyBad=true}
  });
}

/* ---------- ui helpers ---------- */
function chip(t,cls,style){return '<span class="chip '+(cls||'')+'"'+(style?' style="'+style+'"':'')+'>'+t+'</span>'}
function dfText(type,v){if(!v)return type==='time'?'--:--':'날짜 선택';if(type==='time')return v;var p=v.split('-');return p[0]+'. '+(+p[1])+'. '+(+p[2])+'. ('+wd(v)+')'}
function dfld(type,id,v,label,extra,clr){return '<button type="button" class="dfld" data-act="pick" data-pk="'+type+'" data-for="'+id+'"'+(clr?' data-clr="1"':'')+' aria-label="'+ea(label)+'"><span class="dv'+(v?'':' ph')+'">'+esc(dfText(type,v))+'</span>'+ic(type==='time'?'clock':'cal',16,'var(--sub)')+'</button><input type="hidden" id="'+id+'" value="'+ea(v||'')+'"'+(extra?' '+extra:'')+'>'}
function syncDF(el){var b=document.querySelector('button.dfld[data-for="'+el.id+'"]'),sp=b&&b.querySelector('.dv');if(sp){sp.textContent=dfText(b.getAttribute('data-pk'),el.value);sp.classList.toggle('ph',!el.value)}}
function pcol(k){return PAL[k]||PAL.gray}
function tint(k){var c=pcol(k);return 'color:'+c[0]+';background:'+c[1]+';border-color:'+c[3]}
function selVars(k){var c=pcol(k);return '--sb:'+c[1]+';--sbd:'+c[3]+';--st:'+c[0]}
function bdg(icn,k,size){var c=pcol(k),w=size||30;return '<span class="bdg" style="width:'+w+'px;height:'+w+'px;background:'+c[1]+';color:'+c[0]+'">'+ic(icn,Math.round(w*.58))+'</span>'}
function cityKey(id){return CITYK[cityIdx(id)%CITYK.length]}
function cityChip(id){var c=cityCol(id);return chip(esc(cityName(id)),'','color:'+c[0]+';background:'+c[1]+';border-color:'+c[3])}
function icoMap(q){return q?'<a class="ico" aria-label="지도에서 열기" href="'+ea(mapUrl(q))+'" target="_blank" rel="noopener">'+ic('pin',17)+'</a>':''}
function icoNav(q){return q?'<a class="ico" aria-label="길찾기(대중교통)" href="'+ea(navUrl(q))+'" target="_blank" rel="noopener">'+ic('nav',17)+'</a>':''}
function seg(act,items,sel,extra){
  var h='<div class="seg">';
  items.forEach(function(it){var k=it[3];h+='<button data-act="'+act+'" data-v="'+ea(it[0])+'"'+(extra?' '+extra:'')+(k?' style="'+selVars(k)+'"':'')+' aria-pressed="'+(sel===it[0])+'" class="'+(sel===it[0]?'on':'')+'">'+(it[2]?ic(it[2],18):'')+(k&&!it[2]?'<i class="sdot" style="background:'+pcol(k)[2]+'"></i>':'')+esc(it[1])+'</button>'}); 
  return h+'</div>';
}
function card(inner,cls){return '<div class="card '+(cls||'')+'">'+inner+'</div>'}
function titleBar(t,sub,right,key){return '<div class="titlebar"><div><h1>'+(key?'<span class="hl" style="--hl:'+pcol(key)[1]+'">'+esc(t)+'</span>':esc(t))+'</h1>'+(sub?'<div class="sub">'+esc(sub)+'</div>':'')+'</div>'+(right||'')+'</div>'}
var LOGO='data:image/png;base64,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';
document.documentElement.style.setProperty('--logo-mask','url('+LOGO+')');  // 로고는 모양(알파)만 쓰고 색은 CSS가 칠한다
var CUR=lget('cur',null);  // 현재 위치로 찾은 도시 {id,at} — 좌표는 저장하지 않고 도시 id만 남긴다
function hav(a,b,c,d){var r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,q=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)*Math.sin(y/2);return 12742*Math.asin(Math.sqrt(q))}
var locBusy=false;
function locateCity(force){
  var t=trip();if(!t||!navigator.geolocation||locBusy||document.hidden)return;
  var td=today();if(td<t.start||td>t.end)return;
  if(!force&&CUR&&Date.now()-CUR.at<15*60*1000)return;
  var done=function(id){locBusy=false;CUR={id:id,at:Date.now()};lset('cur',CUR);if(id)renderSafe()};
  locBusy=true;
  try{
    navigator.geolocation.getCurrentPosition(function(p){
      var best=null;
      t.cities.forEach(function(c){var la=parseFloat(c.lat),lo=parseFloat(c.lng);if(isNaN(la)||isNaN(lo))return;var k=hav(p.coords.latitude,p.coords.longitude,la,lo);if(!best||k<best.k)best={id:c.id,k:k}});
      done(best&&best.k<=60?best.id:null);
    },function(){done(null)},{maximumAge:600000,timeout:8000});
  }catch(e){done(null)}
}
function curCity(){var base=cityOfDate(today());if(CUR&&CUR.id&&Date.now()-CUR.at<6*3600*1000)return CUR.id;return base}
function topWx(){
  var id=curCity(),w=WX.d&&WX.d[id]&&WX.d[id][today()];if(!w)return '';
  var diff=id!==cityOfDate(today());
  return ic(w.sun?'sun':'cloud',15,pcol(w.sun?'orange':'sky')[2])+'<span>'+(diff?esc(cityName(id))+' · ':'')+(w.sun?'맑음':'흐림')+' '+Math.round(w.tmax)+'°/'+Math.round(w.tmin)+'°'+(w.pp!=null?' · 강수 '+w.pp+'%':'')+'</span>';
}
function dayPill(){var t=trip(),td=today();if(!t)return '';if(td<t.start)return 'D-'+Math.round((parse(t.start)-parse(td))/86400000);if(td>t.end)return '여행 종료';var dts=tripDates();return 'DAY '+(dts.indexOf(td)+1)+' / '+dts.length}
/* 오늘 카드에 올릴 일정: 아직 완료하지 않은 일정 중 시각이 가장 빠른 것(시각이 지났어도 미완료면 그대로 유지).
   전부 완료했다면 마지막 일정을 보여준다. */
function nextEventOf(vd){
  var ev=eventsOf(vd),pend=ev.filter(function(e){return !e.d.done});
  return pend[0]||ev[ev.length-1]||null;
}
function topPeriod(){var e=nextEventOf(today());return periodOf((e&&(e.d.time||SLOTDEF[e.d.slot]))||nowHM())}   // 배너와 같은 기준(다음 일정의 시간대)
function topBar(){
  var t=trip();if(!t)return '';
  var rng=md(t.start)+'–'+(t.start.slice(5,7)===t.end.slice(5,7)?(+t.end.slice(8)):md(t.end));
  return '<div class="topbar bn-'+topPeriod()+'"><div class="tbl"><span class="tblogo" role="button" tabindex="0" aria-label="사진첩 열기" data-act="album"></span><button class="tbn" data-act="sheet" data-v="trips" aria-label="여행 목록"><span class="tbt">'+esc(t.title)+'</span>'+ic('chevd',14)+'</button></div>'+
    '<div class="tbr"><div class="tbr1"><span class="tbd">'+rng+'</span>'+chip(esc(dayPill()),'',tint('sky'))+'<button class="syncst ico" data-act="sync" id="sync" aria-label="지금 동기화">'+syncHtml()+'</button><button class="tbi" data-act="goiikoto" aria-label="이이코토 열기">'+ic('macro',22,PAL.pink[2])+'</button></div><div class="tbw">'+topWx()+'</div></div></div>';
}
function bar(p){return '<div class="bar"><i style="width:'+Math.max(0,Math.min(100,p))+'%"></i></div>'}
function memosOf(d){return MEMOS.filter(function(m){return m.date_key===d})}
function hasPhoto(m){return !!(m.photo_url&&/^https?:/.test(m.photo_url))}
function photoThumb(m,size){
  return '<span class="mph" style="'+(size?'width:'+size+'px;height:'+size+'px':'')+'">'+ic('photo',20)+'<img class="mphi" loading="lazy" decoding="async" alt="" src="'+ea(m.photo_url)+'"></span>';
}
function memoText(m){return (m.question?'<div class="small muted" style="margin-bottom:2px">'+esc(m.question)+'</div>':'')+(m.text?esc(m.text).replace(/\n/g,'<br>'):(hasPhoto(m)?'<span class="muted">사진</span>':''))}
function memoHtml(list){
  if(!list.length)return '<div class="small muted">iikoto에서 쓴 메모가 여기에 시간순으로 보여요. (읽기 전용)</div>';
  var sorted=list.slice().sort(byMemoTime);
  return '<div class="memolist fitlist'+(sorted.length>MEMO_VISIBLE?' scroll':'')+'" data-end="1" data-vis="'+MEMO_VISIBLE+'">'+sorted.map(function(m){
    return '<div class="mrow"><div class="mt">'+esc(m.memo_time||'')+'</div>'+(hasPhoto(m)?'<div class="mb mpw">'+photoThumb(m)+'<span class="mtx">'+memoText(m)+'</span></div>':'<div class="mb">'+memoText(m)+'</div>')+'</div>';
  }).join('')+'</div>';
}
var MEMO_VISIBLE=5;
/* 6번째 메모가 살짝 비쳐 보이는 높이로 맞춘다(쓸어서 더 볼 수 있다는 신호). 줄 높이는 글 길이에 따라 달라 렌더 후 측정한다 */
function fitMemoList(){  // 메모·지출처럼 '몇 개만 보이고 나머지는 스크롤'인 목록 전부에 적용
  Array.prototype.forEach.call(document.querySelectorAll('.fitlist.scroll'),function(l){
    var r=l.children[+l.getAttribute('data-vis')||MEMO_VISIBLE];if(!r)return;
    l.style.maxHeight=(r.offsetTop+22)+'px';
  });
}
function onThumb(e){var t=e.target;if(!t||!t.classList||!t.classList.contains('mphi'))return;if(e.type==='load')t.classList.add('loaded');var p=t.parentNode.querySelector('.ti');if(p)p.classList.add('hide')}
function photoStrip(){
  var ps=MEMOS.filter(hasPhoto).sort(function(a,b){return (b.created||0)-(a.created||0)||String(b.date_key+(b.memo_time||'')).localeCompare(a.date_key+(a.memo_time||''))}).slice(0,60);
  if(!ps.length)return '';
  return card(ctitle('사진',ps.length+'장',['photo','sky'])+'<div class="pstrip">'+ps.map(function(m){return photoThumb(m,72)}).join('')+'</div>','flat');
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
var CATS=[['todo','flag-3','할일'],['shop','shopping-cart','쇼핑'],['etc','dots','기타']];
function shopCls(it){return it.cat==='shop'?' class="shopck"':''}  // 쇼핑 항목은 체크 칸이 장바구니 아이콘
function catTrio(sel,id){
  sel=sel||'todo';
  return '<span class="cattrio" role="group" aria-label="카테고리">'+CATS.map(function(c){return '<button class="'+c[0]+(sel===c[0]?' on':'')+'" data-act="clcat" data-v="'+c[0]+'" data-id="'+ea(id||'')+'" aria-label="'+c[2]+'" aria-pressed="'+(sel===c[0])+'">'+ic(c[1],18)+'</button>'}).join('')+'</span>';
}
function keepEdit(){var e=document.querySelector('input.edit');if(e)UI.editVal=e.value}  // 수정 중 글자를 알림 줄 조작으로 잃지 않게
function bellTag(it){return (it.at&&it.ao&&!it.done)?'<span class="belt">'+ic('bell',13)+it.at+'</span>':''}
function alRow(at,ao,id){
  var i=ea(id||'');
  return '<div class="alrow'+(at?' has':'')+(at&&ao?' on':'')+'"><button class="albtn" data-act="albell" data-id="'+i+'" aria-label="알림 켜기 끄기">'+ic(at&&!ao?'bell-off':'bell',20)+'</button><button class="altx" data-act="alpick" data-id="'+i+'">'+(at||'알림 없음')+'</button>'+(at?'<button class="alx" data-act="alclr" data-id="'+i+'" aria-label="알림 지우기">'+ic('x',16)+'</button>':'')+'</div>';
}
function clRow(it,ro){
  if(ro){
    var ctr=(it.done&&it.completedAt)?'<span class="ct">'+hhmm(it.completedAt)+'</span>':'';
    return '<div class="ck ro'+(it.done?' done':'')+'"><input type="checkbox"'+shopCls(it)+' '+(ro==='ck'?'data-act="ck" data-id="'+ea(it.id)+'"':'disabled')+' '+(it.done?'checked':'')+' aria-label="'+ea(it.t)+'"><span class="tx">'+esc(it.t)+'</span>'+bellTag(it)+ctr+'</div>';
  }
  if(UI.edit===it.id){
    var val=UI.editVal!=null?UI.editVal:it.t;
    return '<div class="ckedit"><div class="ck" style="border-bottom:0"><input type="checkbox" disabled aria-hidden="true"><input class="edit" data-id="'+ea(it.id)+'" value="'+ea(val)+'" aria-label="항목 수정"><button class="mini" data-act="edit-ok" data-id="'+ea(it.id)+'" aria-label="저장">'+ic('check',18)+'</button></div>'+tsChips('edits',null,it.ts||'none',' data-id="'+ea(it.id)+'"')+(it.pre?'':'<div class="catrow">'+catTrio(it.cat,it.id)+'</div>'+alRow(it.at,it.ao,it.id))+'</div>';
  }
  var ct='';
  if(it.done&&it.completedAt){
    ct='<button class="ct" data-act="ctime" data-id="'+ea(it.id)+'" aria-label="완료 시각 수정">'+hhmm(it.completedAt)+'</button>';
  }
  return '<div class="ck'+(it.done?' done':'')+'"><input type="checkbox"'+shopCls(it)+' data-act="ck" data-id="'+ea(it.id)+'" '+(it.done?'checked':'')+' aria-label="'+ea(it.t)+'"><span class="tx">'+esc(it.t)+'</span>'+bellTag(it)+ct+'<button class="mini" data-act="edit" data-id="'+ea(it.id)+'" aria-label="수정">'+ic('pen',16)+'</button><button class="mini" data-act="del" data-id="'+ea(it.id)+'" aria-label="삭제">'+ic('x',16)+'</button></div>';
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
  var v=UI.addTxt[key]||'';
  return '<div class="addrow"><input data-add="'+ea(key)+'" value="'+ea(v)+'" placeholder="항목 추가" aria-label="항목 추가"><button class="btn addbtn" data-act="add" data-key="'+ea(key)+'" aria-label="추가">'+ic('plus',22)+'</button></div>';
}
function addPrompt(key,val){
  if(!(val||'').trim()){toast('항목을 입력해 주세요');return}
  if(key==='pre'){addCl(key,val,'none');return}  // 사전준비는 시간대·알림 없이 텍스트만
  UI.clDraft={key:key,t:val.trim(),ts:'none',at:'',ao:false,cat:'todo'};UI.sheet='cl';render();  // 날짜 항목은 시트에서 시간대·알림을 고르고 등록(기본 지정없음)
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
  return '<div class="row" style="align-items:flex-start;gap:2px"><div class="grow"><h3 style="margin:0;font-size:15px;line-height:1.35">'+esc(d.title)+'</h3>'+(d.desc?'<p style="margin:3px 0 0;font-size:13px;color:var(--sub);line-height:1.45">'+esc(d.desc)+'</p>':'')+(tags?'<div class="chips" style="margin-top:8px">'+tags+'</div>':'')+(d.alt?'<p style="margin:6px 0 0;font-size:12px;color:var(--sub)">'+esc(d.alt)+'</p>':'')+spentLine(e.cid)+link+'</div><div class="icos"><button class="ico" data-act="evedit" data-id="'+ea(e.cid)+'" aria-label="일정 수정">'+ic('pen',16)+'</button>'+(d.map?icoMap(d.map):'')+(d.nav&&d.map?icoNav(d.map):'')+'</div></div>';
}
function evRow(e,cc,at){
  var d=e.d,done=!!d.done;
  var lab=done&&d.doneAt?hhmm(d.doneAt):(d.time||SLOTL[d.slot]||'');
  var tcol=(done&&d.doneAt)?'<button class="evt done" data-act="evtime" data-id="'+ea(e.cid)+'" aria-label="완료 시각 수정">'+esc(lab)+'</button>':'<button class="evt" disabled tabindex="-1" aria-hidden="true">'+esc(lab)+'</button>';
  return '<div class="ev" data-t="'+ea(at||'')+'" style="--cc:'+cc[1]+'">'+tcol+'<button class="evdot" data-act="evck" data-id="'+ea(e.cid)+'" aria-pressed="'+done+'" aria-label="'+ea(d.title)+' 완료"><span class="dotv"></span></button><div class="c"><div class="card sm'+(done?' evdone':'')+'">'+evBody(e)+'</div></div></div>';
}
function memoEv(m){
  return '<div class="ev mev" data-t="'+ea(m.memo_time||'')+'"><button class="evt" disabled tabindex="-1" aria-hidden="true">'+esc(m.memo_time||'')+'</button><span class="evdot memodot"><span class="mdot"></span></span><div class="c"><div class="memoc">'+(hasPhoto(m)?photoThumb(m,44):ic('notes',14))+'<span>'+memoText(m)+'</span></div></div></div>';
}
function effTimes(ev){
  var def=SLOTDEF,prev='00:00',out=[];
  ev.forEach(function(e){var t=e.d.time||def[e.d.slot]||prev;if(t<prev)t=prev;out.push(t);prev=t});
  return out;
}
/* 타임라인 표시용 시각: 화면 라벨에 보이는 시각(완료한 일정은 완료 시각)과 같은 기준으로 메모와 줄을 세운다.
   (저장·삽입 순서용 effTimes는 그대로 두고, 화면 배치에만 쓴다) */
function dispTimes(ev){
  var def=SLOTDEF,prev='00:00',out=[];
  ev.forEach(function(e){var d=e.d,t=(d.done&&d.doneAt)?hhmm(d.doneAt):(d.time||def[d.slot]||prev);if(t<prev)t=prev;out.push(t);prev=t});
  return out;
}
/* 화면에 보이는 시각(완료한 일정은 완료 시각, 아니면 예정 시각·시간대 기본값) 순으로 줄을 세운다.
   서버에 저장된 순서는 바꾸지 않는다 — 예정 시각 없이 시간대만 있는 일정을 일찍 마치면 라벨(13:19)이 앞 줄(13:50)보다 이르게 보이던 문제 */
function sortShown(ev){
  var def=SLOTDEF,prev='00:00';
  return ev.map(function(e,i){var d=e.d,k=(d.done&&d.doneAt)?hhmm(d.doneAt):(d.time||def[d.slot]||prev);prev=k;return {e:e,k:k,i:i}})
    .sort(function(a,b){return a.k<b.k?-1:(a.k>b.k?1:a.i-b.i)}).map(function(x){return x.e});
}
/* 이날 완료한 체크리스트 항목(완료 시각이 있는 것만) — 타임라인에 가벼운 한 줄로 섞어 보여준다 */
function doneChecksOf(d){return (CL.items||[]).filter(function(i){return !i.pre&&i.date===d&&i.done&&i.completedAt})}
function ckEv(i){
  var tm=hhmm(i.completedAt);
  return '<div class="ev mev ckev" data-t="'+tm+'"><button class="evt" disabled tabindex="-1" aria-hidden="true">'+tm+'</button><span class="evdot memodot"><span class="ckdot'+(i.cat==='shop'?' shop':'')+'">'+ic(i.cat==='shop'?'shopping-cart':'check',11)+'</span></span><div class="c"><div class="cktx">'+esc(i.t)+'</div>'+ckSpent(i.id)+'</div></div>';
}
function ckSpent(cid){var l=refList(cid);if(!l.length)return '';return '<div class="small" style="color:var(--sub);margin-top:1px">'+ic('cash',13)+' 지출 '+sumLabel(sumInfo(l))+'</div>'}
/* 일정에 연동하지 않은 현지 지출(연동된 건 일정 카드 안 '지출' 줄에 이미 나온다)을 결제 시각 자리에 한 줄로 */
function freePaysOf(d){return localList().filter(function(x){if(x.d.date!==d)return false;var r=x.d.ref;if(!(r&&r.cid))return true;return r.t==='check'&&!findCl(r.cid)})}  // 연동된 건 대상 카드·줄 안에 나온다(대상 체크가 지워졌으면 일반 결제 줄로)
function payEv(x){
  var d=x.d,tm=d.time||'',jpy=d.currency!=='KRW',
      amt=jpy?'¥'+won(d.amount)+' <span class="payk">'+won(d.amount*fx())+'원</span>':won(d.amount)+'원',
      ico=ic(ECATI[d.ecat]||'dots',13,'#fff'),bg=pcol(ECATC[d.ecat]||'gray')[2];
  return '<div class="ev mev ckev" data-t="'+ea(tm)+'"><button class="evt" disabled tabindex="-1" aria-hidden="true">'+esc(tm)+'</button><span class="evdot memodot"><span class="ckdot" style="background:'+bg+'">'+ico+'</span></span><div class="c"><div class="cktx">'+esc(d.name)+' <span class="payamt">'+amt+'</span></div></div></div>';
}
function tlFilterHtml(){
  var f=UI.tlf||{};
  function b(k,label,ico){var on=f[k]!==false;return '<button class="tlfb k-'+k+(on?' on':'')+'" data-act="tlf" data-v="'+k+'" aria-pressed="'+on+'">'+ic(ico,15)+label+'</button>'}
  return '<div class="tlf" role="group" aria-label="타임라인 표시 종류">'+b('e','일정','calendar')+b('m','메모','notes')+b('c','체크','checklist')+b('p','결제','cash')+'</div>';
}
function timelineHtml(d){
  var allEv=eventsOf(d),allMs=memosOf(d),allCk=doneChecksOf(d),allPay=freePaysOf(d);
  if(!allEv.length&&!allMs.length&&!allCk.length&&!allPay.length)return '';
  var f=UI.tlf||{};
  var ev=f.e===false?[]:sortShown(allEv),ex=[];
  if(f.m!==false)allMs.forEach(function(m){ex.push({t:String(m.memo_time||'99:99'),h:memoEv(m)})});
  if(f.c!==false)allCk.forEach(function(i){ex.push({t:hhmm(i.completedAt),h:ckEv(i)})});
  if(f.p!==false)allPay.forEach(function(x){ex.push({t:String(x.d.time||'99:99'),h:payEv(x)})});
  ex=ex.map(function(x,i){x.i=i;return x}).sort(function(a,b){return a.t<b.t?-1:(a.t>b.t?1:a.i-b.i)});
  var cc=cityCol(cityOfDate(d)),eff=dispTimes(ev),xi=0,h=tlFilterHtml();
  if(!ev.length&&!ex.length)return h+'<div class="small muted" style="text-align:center;padding:22px 0">표시할 종류를 하나 이상 켜 주세요</div>';
  h+='<div class="tl">';
  function pushEx(limit){while(xi<ex.length&&(limit==null||ex[xi].t<limit)){h+=ex[xi].h;xi++}}
  ev.forEach(function(e,i){pushEx(eff[i]);h+=evRow(e,cc,eff[i])});
  pushEx(null);
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
/* 아카이브앱 사이드바와 같은 5분할: 새벽(~4시) · 아침(~12) · 낮(~16) · 오후(~19) · 밤 */
function periodOf(t){
  var m=String(t||'').match(/^(\d{1,2}):(\d{2})/);if(!m)return 'afternoon';
  var h=+m[1];
  if(h<4)return 'dawn';if(h<12)return 'morning';if(h<16)return 'day';if(h<19)return 'afternoon';return 'night';
}
function ctitle(t,right,ico){return '<div class="ctitle"><b>'+(ico?bdg(ico[0],ico[1],22):'')+t+'</b>'+(right?'<span class="cinfo">'+right+'</span>':'')+'</div>'}
function screenToday(){
  var t=trip();if(!t)return empty();
  var vd=viewDate();
  var dates=tripDates(),idx=dates.indexOf(vd)+1,N=dates.length;
  var s=stayOf(vd),cid=cityOfDate(vd);
  var h='';
  h+='<div style="display:flex;flex-direction:column;align-items:center"><div class="dtitle"><button class="dnav'+(idx<=1?' off':'')+'" '+(idx<=1?'disabled ':'')+'data-act="dprev" aria-label="전날">'+ic('chevl',18)+'</button><span class="dnum"><span>'+md(vd)+'</span> <span class="dwd">'+wd(vd)+'</span></span><button class="dnav'+(idx>=N?' off':'')+'" '+(idx>=N?'disabled ':'')+'data-act="dnext" aria-label="다음날">'+ic('chevr',18)+'</button></div>'+
    '<div class="row" style="margin-top:4px;justify-content:center">'+cityChip(cid)+(s?'<a class="small muted stayln" aria-label="숙소까지 길찾기(대중교통)" href="'+ea(navUrl(s.d.map||s.d.name))+'" target="_blank" rel="noopener">'+esc(s.d.name)+'</a>':'')+'</div>'+sunLine(vd)+'</div>';
  if(UI.keyBad)h+=card('<b>데이터를 불러오지 못했어요</b><div class="small muted" style="margin-top:4px">접근 키가 맞지 않을 수 있어요.</div><button class="btn" style="margin-top:10px" data-act="sheet" data-v="key">키 다시 입력</button>');
  var note=(t.dayNotes||{})[vd];if(note)h+='<div>'+chip(esc(note),'pn')+'</div>';
  var ev=eventsOf(vd),next=nextEventOf(vd);
  if(next){
    var d=next.d;
    var ckb=d.done?'<span class="bnck on" aria-label="완료한 일정">'+ic('check',17)+'</span>':'<button class="bnck" data-act="bnck" data-id="'+ea(next.cid)+'" aria-label="'+ea(d.title)+' 완료">'+ic('check',17)+'</button>';
    var per=periodOf(d.time||SLOTDEF[d.slot]||'12:00');
    h+='<div class="card bn bn-'+per+'">'+ctitle(ev[ev.length-1]===next?'마지막 일정':'다음 일정',ckb)+'<div style="font-family:var(--serif);font-size:19px;font-weight:700;line-height:1.3;color:var(--bn-t)">'+esc(d.title)+'</div>'+(d.desc?'<div style="font-size:13px;color:var(--bn-s);margin-top:5px;line-height:1.5">'+esc(d.desc)+'</div>':'')+
      ((d.map)?'<div class="row" style="margin-top:14px"><a class="btn" style="flex:1;text-decoration:none" href="'+ea(mapUrl(d.map))+'" target="_blank" rel="noopener">'+ic('pin',17)+'지도에서 열기</a>'+(d.nav?'<a class="ibtn" aria-label="길찾기(대중교통)" href="'+ea(navUrl(d.map))+'" target="_blank" rel="noopener">'+ic('nav',20)+'</a>':'')+'</div>':'')+'</div>';
  }
  var sl=slotsOf(vd);
  if(sl.length){
    var ph=ctitle('오늘의 플랜',null,['route','sky']);
    sl.forEach(function(sx){var ch=choiceOf(vd,sx.key);var sel2=ch&&ch.d.plan;
      if(sel2==='custom')ph+='<div style="margin-bottom:8px"><b>'+esc(sx.label)+'</b><div class="small">'+esc(ch.d.text||'(비어 있음)')+'</div></div>';
      else if(sel2&&sel2!=='none')ph+='<div style="margin-bottom:8px"><div class="small muted">'+esc(sx.label)+'</div>'+planDetail(sel2)+'</div>';
    });
    h+=card(ph,'flat');
  }
  var items=clItems(vd);
  var done=items.filter(function(i){return i.done}).length;
  h+=card(ctitle('체크리스트',done+' / '+items.length,['list-check','lav'])+(items.length?bar(done/items.length*100)+'<div style="margin-top:6px">'+clList(items,'ck')+'</div>':'<div class="small muted">등록된 항목이 없어요. 체크 탭에서 추가해요.</div>'),'flat nb');
  var exs=localList().filter(function(x){return x.d.date===vd}).sort(byTimeDesc);
  h+=card(ctitle('지출',exs.length?sumLabel(sumInfo(exs)):'',['wallet','mint'])+(exs.length?'<div class="fitlist'+(exs.length>3?' scroll':'')+'" data-vis="3">'+exs.map(function(x){return expRow(x,true)}).join('')+'</div>':'<div class="small muted">아직 지출 기록이 없어요.</div>'),'flat');
  h+=card(ctitle('메모',null,['notes','rose'])+memoHtml(memosOf(vd)),'flat');
  h+=photoStrip();
  return h;
}
function weekStrip(d,act,badge){
  var t=trip(),ws=weekStartOf(d);
  var h='<div class="wk'+(UI.wkAnim?' slide-'+UI.wkAnim:'')+'" id="strip">';UI.wkAnim=null;
  for(var k=0;k<7;k++){
    var x=addDays(ws,k),on=x>=t.start&&x<=t.end,col=on?cityCol(cityOfDate(x))[1]:'transparent',n=(on&&badge)?badge(x):0;
    h+='<button class="day-btn'+(x===d?' sel':'')+(on?'':' off')+'" data-act="'+act+'" data-v="'+x+'" '+(on?'':'disabled ')+'aria-pressed="'+(x===d)+'" aria-label="'+md(x)+' '+wd(x)+(n?' 남은 '+n+'개':'')+'">'+(n?'<span class="dbadge">'+n+'</span>':'')+'<span class="dbar" style="background:'+col+'"></span><span class="dnumc'+(x===today()?' today-num':'')+'">'+(+x.slice(8))+'</span><span class="day-name">'+wd(x)+'</span></button>';
  }
  return h+'</div>';
}
function weekStartOf(x){var d=parse(x);return addDays(x,-((d.getDay()+6)%7))}
function screenSched(){
  var t=trip();if(!t)return empty();
  var dates=tripDates();
  var d=UI.sched&&dates.indexOf(UI.sched)>=0?UI.sched:clampDate(today());
  UI.sched=d;
  var h=titleBar('일정',null,'<span class="syncst" style="cursor:default">'+(dates.length-1)+'박 '+dates.length+'일</span>','sky');
  h+=weekStrip(d,'date');
  PINH=h;h='';
  var s=stayOf(d),cid=cityOfDate(d);
  h+='<div class="row" style="min-height:44px">'+cityChip(cid)+(s?'<span class="grow small muted">'+esc(s.d.name)+' · '+md(s.d.checkin)+' – '+md(s.d.checkout)+'</span>':'<span class="grow"></span>')+(s?icoMap(s.d.map||s.d.name):'')+'</div>';
  var note=(t.dayNotes||{})[d];if(note)h+='<div>'+chip(esc(note),'pn')+'</div>';
  h+=timelineHtml(d);
  h+='<button class="btn" style="width:100%" data-act="evnew" data-date="'+d+'">'+ic('plus',16)+'일정 추가</button>';
  slotsOf(d).forEach(function(sl){h+=slotUi(d,sl)});
  return h;
}
function dayLeft(d){
  var it=clItems(d).concat(d===preDate()?clItems('pre'):[]),n=0;
  it.forEach(function(i){if(!i.done)n++});return n;
}
function clCard(label,key,chp,items){
  var left=items.filter(function(i){return !i.done}).length;
  var st=!items.length?chip('비어 있음','ln'):(left?chip('남은 '+left+'개','pn'):chip('모두 완료','ok'));
  return card('<div class="row between" style="margin-bottom:4px"><b style="font-size:14px">'+esc(label)+'</b><span class="row" style="gap:6px">'+(chp||'')+st+'</span></div>'+clList(items)+(clDate(key)<today()?'':clAddRow(key)),'flat');  // 지난 날짜에는 입력창을 띄우지 않는다
}
function screenCheck(){
  var t=trip();if(!t)return empty();
  var dates=tripDates(),d=UI.clDate&&dates.indexOf(UI.clDate)>=0?UI.clDate:clampDate(today());
  UI.clDate=d;
  var pn=clItems('pre'),pl=pn.filter(function(i){return !i.done}).length;
  var preBtn='<button class="prebtn'+(UI.clPre?' on':'')+'" data-act="clpre" aria-pressed="'+(!!UI.clPre)+'" aria-label="사전준비'+(pl?' '+pl+'개 남음':'')+'">'+ic('luggage',22)+(pl?'<span class="cb">'+pl+'</span>':'')+'</button>';
  PINH=titleBar('체크리스트',null,preBtn,'lav')+weekStrip(d,'cdate',dayLeft);
  var h='';
  if(UI.clPre)h+=clCard('사전준비','pre',chip(md(preDate())+' · iikoto','ln'),pn);
  else h+=clCard(md(d)+' '+wd(d),d,(d===today()?chip('오늘','pn')+' ':'')+cityChip(cityOfDate(d)),clItems(d));
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
      lset('fxAt:'+cfg.tripId,Date.now());tiUp('trip',M.trip);renderSafe();
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
function amtPair(d){
  if(d.currency==='JPY')return '<div class="amt"><b>'+won(d.amount*fx())+'원</b><span class="yen">¥'+won(d.amount)+'</span></div>';
  return '<div class="amt"><b>'+won(d.amount)+'원</b></div>';
}
function xKrw(e){return e.d.currency==='KRW'?e.d.amount:e.d.amount*fx()}
function sumInfo(list){var j=0,k=0;list.forEach(function(e){if(e.d.currency==='KRW')k+=e.d.amount;else j+=e.d.amount});return {jpy:j,krw:k,est:j*fx()+k}}
function sumLabel(i){return '<b style="color:var(--tx)">'+won(i.est)+'원</b>'+(i.jpy?' <span class="yen">¥'+won(i.jpy)+'</span>':'')}
function localList(){return M.expenses.filter(function(e){return e.d.local})}
function refList(cid){return localList().filter(function(e){return e.d.ref&&e.d.ref.cid===cid})}
function spentLine(cid){var l=refList(cid);if(!l.length)return '';return '<div class="small" style="margin-top:6px;color:var(--sub)">'+ic('cash',14)+' 지출 '+sumLabel(sumInfo(l))+'</div>'}
function expRow(e,ro){
  var d=e.d,krw=d.currency==='KRW';
  var sub=[];if(d.ref&&d.ref.name&&d.ref.name!==d.name)sub.push(d.ref.name);if(krw)sub.push('원화 결제');
  var amt=amtPair(d);
  var ico=ic(ECATI[d.ecat]||'dots',22,pcol(ECATC[d.ecat]||'gray')[2]);
  var lead='<span class="xi">'+ico+'</span>';
  return '<div class="xrow'+(ro?'':' tap')+'"'+(ro?'':' data-act="expedit" data-id="'+ea(e.cid)+'" role="button" tabindex="0" aria-label="'+ea(d.name)+' 수정"')+'>'+lead+'<div class="grow"><div style="font-size:14px;line-height:1.35">'+esc(d.name)+'</div>'+(sub.length?'<div class="small muted">'+esc(sub.join(' · '))+'</div>':'')+'</div><div style="text-align:right">'+amt+'</div></div>';
}
function screenBudget(){
  var t=trip();if(!t)return empty();
  // 사전 결제는 결제한 것만, 엔화는 현재 환율로 환산해 모두 원화로 합산한다(소액 오차는 신경 쓰지 않음)
  var items=[];
  M.stays.forEach(function(s){if(s.d.paid)items.push({k:'stay',o:s})});
  M.expenses.forEach(function(e){if(!e.d.local&&e.d.paid)items.push({k:'exp',o:e})});
  var air=0,stay=0,etc=0,local=0;
  items.forEach(function(x){var v=xKrw(x.o);if(x.k==='stay')stay+=v;else if(x.o.d.cat==='air')air+=v;else etc+=v});
  localList().forEach(function(e){local+=xKrw(e)});
  var total=air+stay+etc+local;
  var h=titleBar('경비',null,'<button class="fab sm" data-act="exp-new" aria-label="지출 추가">'+ic('plus',20)+'</button>','mint');
  h+=card('<div class="row between" style="margin-bottom:2px"><div class="lbl" style="margin-bottom:0">총 지출</div><button class="fxtap" data-act="sheet" data-v="fx" aria-label="환율 보기">1엔 = '+rate2()+'원 '+ic('chevd',14)+'</button></div><div class="row between" style="align-items:baseline"><div style="font-family:var(--serif);font-size:36px;font-weight:700">'+won(total)+'<span style="font-size:18px;color:var(--sub)">원</span></div><span class="yen" style="font-size:14px">¥'+won(Math.round(total/fx()))+'</span></div>'+
    '<div class="gantt"><span style="flex:'+(air||0.001)+';background:'+CH[0]+'"></span><span style="flex:'+(stay||0.001)+';background:'+CH[1]+'"></span><span style="flex:'+(etc||0.001)+';background:'+CH[2]+'"></span><span style="flex:'+(local||0.001)+';background:'+CH[3]+'"></span></div>'+
    '<div class="legend"><span><i style="background:'+CH[0]+'"></i>항공 '+won(air)+'</span><span><i style="background:'+CH[1]+'"></i>숙소 '+won(stay)+'</span><span><i style="background:'+CH[2]+'"></i>기타 '+won(etc)+'</span><span><i style="background:'+CH[3]+'"></i>현지 '+won(local)+'</span></div>');
  PINH=h;h='';
  var cs={};localList().forEach(function(e){cs[e.d.ecat||'etc']=(cs[e.d.ecat||'etc']||0)+xKrw(e)});
  var ck=Object.keys(ECAT).filter(function(k){return cs[k]});
  if(ck.length)h+='<div class="chips">'+ck.map(function(k){return chip(ic(ECATI[k],14)+' '+ECAT[k]+' '+won(cs[k])+'원','',tint(ECATC[k]))}).join('')+'</div>';
  var byDay={};localList().forEach(function(e){(byDay[e.d.date]=byDay[e.d.date]||[]).push(e)});
  var days=Object.keys(byDay).sort().reverse();
  if(days.length){
    h+='<div class="lbl" style="margin:6px 0 0">현지 지출 · 엔화 기준 (추정 원)</div>';
    days.forEach(function(d){
      var sl=sumLabel(sumInfo(byDay[d]));
      var list=byDay[d].slice().sort(byTimeDesc);
      h+=card('<div class="row between" style="margin-bottom:2px"><b>'+md(d)+' '+wd(d)+'</b><span class="small muted">'+sl+'</span></div>'+list.map(function(e){return expRow(e)}).join(''),'sm flat');
    });
  }
  var iconOf=function(x){var d=x.o.d;return x.k==='stay'?'bed':(d.cat==='air'?'plane':(d.cat==='transport'?'bus':'dots'))};
  var fixed=items.slice();
  fixed.sort(function(a,b){return (a.o.d.currency==='JPY'?1:0)-(b.o.d.currency==='JPY'?1:0)});
  if(fixed.length)h+='<div class="lbl" style="margin:6px 0 0">사전 결제</div>';
  fixed.forEach(function(x){
    var d=x.o.d,c=x.k==='stay'?cityCol(d.city)[1]:null;
    h+=card('<div class="row" style="gap:12px">'+'<span class="xi" style="width:34px">'+ic(iconOf(x),24,pcol(x.k==='stay'?'rose':(d.cat==='air'?'mint':'gray'))[2])+'</span>'+'<div class="grow"><div class="row" style="gap:6px">'+(c?'<i style="width:10px;height:10px;border-radius:50%;background:'+c+';display:inline-block"></i>':'')+'<b style="font-size:15px">'+esc(d.name)+'</b></div><div class="small muted" style="margin-top:3px;line-height:1.45">'+esc(x.k==='stay'?(d.nights+'박 · '+md(d.checkin)+' – '+md(d.checkout)+(d.note?' · '+d.note:'')):(d.note||''))+'</div></div><div style="text-align:right">'+amtPair(x.o.d)+'</div></div>','sm flat').replace('<div class="card sm flat">','<div class="card sm flat" style="cursor:pointer" data-act="payedit" data-k="'+x.k+'" data-id="'+ea(x.o.cid)+'">');
  });
  return h;
}
function screenSpots(){
  var t=trip();if(!t)return empty();
  var city=UI.spCity||(t.cities[0]&&t.cities[0].id);UI.spCity=city;
  var h=titleBar('스팟','가고 싶은 곳 · 먹을 곳 · 쉴 곳',null,'rose');
  h+=seg('spc',t.cities.map(function(c){return [c.id,c.name,null,cityKey(c.id)]}),city);
  h+='<div class="chips cat">'+[['all','전체'],['meal','식사'],['cafe','카페'],['sight','명소'],['snack','간식']].map(function(c){var k=CATC[c[0]];return '<button class="btn sm'+(UI.spCat===c[0]?' on':'')+'" data-act="spcat" data-v="'+c[0]+'"'+(k?' style="'+selVars(k)+'"':'')+' aria-pressed="'+(UI.spCat===c[0])+'">'+(k?ic(CATI[c[0]],16,pcol(k)[2]):'')+c[1]+'</button>'}).join('')+'</div>';
  // 일정에 넣은 스팟은 이 목록에서 빠진다(일정을 지우면 자동으로 돌아옴)
  var placed=placedSpotCids();
  var inCity=M.spots.filter(function(s){return s.d.city===city});
  var list=inCity.filter(function(s){return !placed[s.cid]&&(UI.spCat==='all'||s.d.cat===UI.spCat)}).sort(function(a,b){return (a.sort||0)-(b.sort||0)});
  var placedN=inCity.filter(function(s){return placed[s.cid]}).length;
  var rows='';
  list.forEach(function(s){
    var d=s.d,memo=MEMOS.filter(function(m){return m.text&&m.text.indexOf(d.name)>=0})[0];
    rows+='<div class="sprow">'+bdg(CATI[d.cat]||'pin',CATC[d.cat]||'gray',36)+'<div class="grow"><div class="row" style="align-items:flex-start;gap:6px"><div class="grow"><div class="row" style="flex-wrap:wrap;gap:6px;min-height:36px"><b style="font-size:15px">'+esc(d.name)+'</b>'+(d.tags||[]).map(function(x){return chip(esc(x),'pn')}).join('')+'</div></div><button class="ico spadd" data-act="spot2ev" data-id="'+ea(s.cid)+'" aria-label="일정에 넣기">'+ic('calplus',19)+'</button></div>'+
      (d.desc?'<div class="small muted" style="margin-top:-4px;line-height:1.45">'+esc(d.desc)+'</div>':'')+
      (memo?'<div class="small" style="margin-top:6px">iikoto 메모 · '+esc(memo.date_key.slice(5))+' · '+esc((memo.text||'').slice(0,60))+'</div>':'')+
      '<div class="spbar"><span class="grow">'+spentLine(s.cid)+'</span>'+icoMap(d.map||d.name)+(d.map||d.name?icoNav(d.map||d.name):'')+'<button class="ico" style="color:var(--sub)" data-act="spmore" data-id="'+ea(s.cid)+'" aria-label="더보기">'+ic('dots',18)+'</button></div></div></div>';
  });
  if(!list.length)rows+='<div class="muted small" style="text-align:center;padding:14px 0">'+(placedN?'일정에 안 넣은 곳이 없어요':'이 분류에는 아직 없어요')+'</div>';
  if(placedN)rows+='<button class="frow" data-act="tab" data-v="sched"><span>'+ic('cal',16)+' 일정에 넣은 곳 '+placedN+'곳</span>'+ic('chevr',14)+'</button>';
  if(!UI.addSpot)rows+='<button class="frow" style="color:var(--sel-tx);font-weight:500" data-act="sp-new"><span>'+ic('plus',16)+' 스팟 추가</span></button>';
  h+='<div class="splist">'+rows+'</div>';
  if(UI.addSpot){
    h+=card('<div class="lbl">스팟 추가</div><input class="fld" id="s_name" placeholder="이름" aria-label="이름" style="width:100%"><div class="row" style="margin-top:8px"><select class="fld" id="s_cat" aria-label="분류">'+Object.keys(CAT).map(function(k){return '<option value="'+k+'">'+CAT[k]+'</option>'}).join('')+'</select></div><input class="fld" id="s_desc" placeholder="한 줄 설명 (선택)" aria-label="설명" style="width:100%;margin-top:8px"><input class="fld" id="s_map" placeholder="지도 검색어 (비우면 이름으로 검색)" aria-label="지도 검색어" style="width:100%;margin-top:8px"><div class="row" style="margin-top:10px"><button class="btn pri" style="width:auto;flex:1" data-act="sp-save">저장</button><button class="btn" data-act="sp-cancel">취소</button></div>');
  }
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
    body=shead('내 여행');
    TRIPS.forEach(function(r){var d=r.data||{};body+=card('<div class="row between">'+chip(d.status==='active'?'진행 중':(d.status==='done'?'완료':'계획'),d.status==='active'?'ok':'ln')+(r.trip_id===cur?'<span class="small muted">현재</span>':'')+'</div><div style="font-family:var(--serif);font-size:22px;font-weight:700;margin-top:8px">'+esc(d.title||r.trip_id)+'</div><div class="small muted" style="margin-top:4px">'+esc((d.start||'')+' – '+(d.end||''))+'</div>'+(r.trip_id===cur?'<button class="btn" style="margin-top:12px;width:100%" data-act="sheet" data-v="tripedit">'+ic('pen',16)+'여행 정보 수정</button>':'<button class="btn pri" style="margin-top:12px" data-act="trip-open" data-id="'+ea(r.trip_id)+'">열기</button>'))});
    body+=card('<b style="font-size:15px">새 여행 만들기</b><div class="small muted" style="margin-top:4px">템플릿·복제는 다녀온 뒤 추가할 예정이에요. 지금은 가져오기로 만들 수 있어요.</div>');
    body+=card('<div class="lbl">백업 · 복원</div><div class="row"><button class="btn" data-act="export">'+ic('dl',16)+'백업 내보내기</button><label class="btn" style="cursor:pointer">'+ic('ul',16)+'가져오기<input type="file" id="imp" accept="application/json,.json" style="display:none"></label></div>');
    body+=card('<div class="lbl">이이코토 반영</div><div class="small muted" style="line-height:1.5;margin-bottom:10px">완료한 일정은 이이코토 시간표로, 하루 지출은 '+PAY_HOUR+'시 이후 앱을 열 때 메모 한 줄로 자동 반영돼요.</div><button class="btn" data-act="mirror-all">'+ic('refresh',16)+'완료한 일정 다시 보내기</button>');
    body+=card('<div class="row between"><span class="small muted">앱 버전 '+VER+'</span><button class="btn" data-act="sheet" data-v="key">키 변경</button></div>');
  }else if(v==='cl'){
    var cdr=UI.clDraft||{ts:'none'};
    body='<div class="row" style="gap:8px"><h1 style="font-size:22px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(cdr.t||'체크리스트 추가')+'</h1>'+catTrio(cdr.cat,'')+'<button class="btn" style="border:0;background:transparent" data-act="sheet-close" aria-label="닫기">'+ic('x',20)+'</button></div>'+tsChips('clts',null,cdr.ts||'none')+alRow(cdr.at,cdr.ao,'')+'<button class="btn pri" data-act="cl-save">등록</button>';
  }else if(v==='exp'){
    var dr=UI.expDraft||{};
    body=shead((dr.id?'지출 수정':'지출 추가'))+
       '<div class="tsc" style="margin:0">'+[['JPY','¥ 엔화'],['KRW','₩ 원화']].map(function(c){return '<button class="chip tsb'+((dr.cur||'JPY')===c[0]?' on':'')+'" data-act="expcur" data-v="'+c[0]+'" aria-pressed="'+((dr.cur||'JPY')===c[0])+'">'+c[1]+'</button>'}).join('')+'</div>'+
      '<div class="amtbox"><span class="yen" id="x_sym">'+curSym(dr.cur||'JPY')+'</span><input id="x_amt" inputmode="numeric" autocomplete="off" placeholder="0" aria-label="금액" value="'+ea(dr.amt||'')+'"></div><div class="small muted" id="x_krw" style="margin-top:-6px">'+expLine(dr.cur||'JPY',dr.amt)+'</div>'+
      '<div><div class="lbl">분류</div><div class="tsc hscroll" style="margin-top:0">'+Object.keys(ECAT).map(function(k){return '<button class="chip tsb'+(dr.cat===k?' on':'')+'" data-act="expcat" data-v="'+k+'" style="'+selVars(ECATC[k])+'" aria-pressed="'+(dr.cat===k)+'">'+ic(ECATI[k],15,pcol(ECATC[k])[2])+ECAT[k]+'</button>'}).join('')+'</div></div>'+
      '<div><div class="lbl">내용 · 장소 (선택)</div><input class="fld" id="x_name" style="width:100%" placeholder="이름을 치거나 아래에서 고르세요" autocomplete="off" aria-label="내용" value="'+ea(dr.name||'')+'"><div id="x_sug">'+xSugHtml(dr)+'</div></div>'+
      '<div class="dt2"><div><div class="lbl">날짜</div>'+dfld('date','x_date',dr.date,'날짜')+'</div><div><div class="lbl">시간</div>'+dfld('time','x_time',dr.time,'시간')+'</div></div>'+
      '<div class="row"><button class="btn pri" style="flex:1" data-act="exp-save">저장</button>'+(dr.id?'<button class="btn" data-act="exp-del" data-id="'+ea(dr.id)+'">삭제</button>':'')+'</div>';
  }else if(v==='ev'){
    var ed=UI.evDraft||{};
    body=shead((ed.id?'일정 수정':'일정 추가'))+
      '<div><div class="lbl">제목</div><input class="fld" id="ev_title" style="width:100%" placeholder="이름을 치면 스팟이 떠요" aria-label="제목" autocomplete="off" value="'+ea(ed.title||'')+'"><div id="ev_sug">'+evSugHtml(ed)+'</div></div>'+
      '<div class="dt2"><div><div class="lbl">날짜</div>'+dfld('date','ev_date',ed.date,'날짜')+'</div><div><div class="lbl">시간 (선택)</div>'+dfld('time','ev_time',ed.time,'시간','data-evtime="1"',true)+'</div></div>'+
      '<div><div class="lbl">시간대</div><div class="tsc" style="margin-top:0">'+['am','noon','pm','eve'].map(function(k){return '<button class="chip tsb'+(ed.slot===k?' on':'')+'" data-act="evslot" data-v="'+k+'" aria-pressed="'+(ed.slot===k)+'">'+SLOTL[k]+'</button>'}).join('')+'</div></div>'+
      '<div><div class="lbl">설명 (선택)</div><input class="fld" id="ev_desc" style="width:100%" placeholder="예: 오픈 시간에 방문" aria-label="설명" value="'+ea(ed.desc||'')+'"></div>'+
      '<div><div class="lbl">지도 연결</div><div class="tsc" style="margin-top:0">'+[[true,'지도·길찾기 버튼 표시'],[false,'표시 안 함']].map(function(c){return '<button class="chip tsb'+((ed.mapOn!==false)===c[0]?' on':'')+'" data-act="evmap" data-v="'+c[0]+'" aria-pressed="'+((ed.mapOn!==false)===c[0])+'">'+c[1]+'</button>'}).join('')+'</div><div class="lbl" style="margin-top:10px">검색어 (비우면 제목으로 검색)</div><div class="row"><input class="fld" id="ev_map" style="flex:1" placeholder="가게·장소 이름 또는 주소" aria-label="지도 검색어" value="'+ea(ed.map||'')+'"><a class="btn" data-mapcheck="1" href="#" target="_blank" rel="noopener" style="text-decoration:none">'+ic('pin',16)+'확인</a></div></div>'+
      '<div class="row"><button class="btn pri" style="flex:1" data-act="ev-save">저장</button>'+(ed.id?'<button class="btn" data-act="ev-del" data-id="'+ea(ed.id)+'">삭제</button>':'')+'</div>';
  }else if(v==='fx'){
    body=shead('현재 환율')+card(fxCardHtml(),'');
  }else if(v==='pay'){
    var pd=UI.payDraft||{};
    body=shead('결제 항목 수정')+
      '<div style="font-size:15px;font-weight:700">'+esc(pd.name||'')+'</div>'+
      '<div class="tsc" style="margin:0">'+[['KRW','₩ 원화'],['JPY','¥ 엔화']].map(function(c){return '<button class="chip tsb'+(pd.cur===c[0]?' on':'')+'" data-act="paycur" data-v="'+c[0]+'" aria-pressed="'+(pd.cur===c[0])+'">'+c[1]+'</button>'}).join('')+'</div>'+
      '<div class="amtbox"><span class="yen" id="p_sym">'+curSym(pd.cur)+'</span><input id="p_amt" inputmode="numeric" autocomplete="off" placeholder="0" aria-label="금액" value="'+ea(pd.amt||'')+'"></div>'+
      '<div class="small muted">금액이 다르면 고쳐 주세요.</div>'+
      '<div class="row"><button class="btn pri" style="flex:1" data-act="pay-save">저장</button>'+(pd.k==='exp'?'<button class="btn" data-act="pay-del">삭제</button>':'')+'</div>';
  }else if(v==='spedit'){
    var sd=UI.spDraft||{};
    var sp0=byCid(M.spots,sd.id);
    if(!sp0)return '';
    body=shead('스팟 수정')+
      '<div><div class="lbl">이름</div><input class="fld" id="sp_name" style="width:100%" aria-label="이름" autocomplete="off" value="'+ea(sd.name||'')+'"></div>'+
      '<div><div class="lbl">분류</div><div class="tsc" style="margin-top:0">'+Object.keys(CAT).map(function(k){return '<button class="chip tsb'+(sd.cat===k?' on':'')+'" data-act="spcatpick" data-v="'+k+'" style="'+selVars(CATC[k])+'" aria-pressed="'+(sd.cat===k)+'">'+ic(CATI[k],15,pcol(CATC[k])[2])+CAT[k]+'</button>'}).join('')+'</div></div>'+
      '<div><div class="lbl">도시</div><div class="tsc" style="margin-top:0">'+(trip().cities||[]).map(function(c){return '<button class="chip tsb'+(sd.city===c.id?' on':'')+'" data-act="spcitypick" data-v="'+ea(c.id)+'" aria-pressed="'+(sd.city===c.id)+'">'+esc(c.name)+'</button>'}).join('')+'</div></div>'+
      '<div><div class="lbl">설명 (선택)</div><input class="fld" id="sp_desc" style="width:100%" aria-label="설명" value="'+ea(sd.desc||'')+'"></div>'+
      '<div><div class="lbl">지도 검색어 (비우면 이름으로 검색)</div><div class="row"><input class="fld" id="sp_map" style="flex:1" placeholder="가게·장소 이름 또는 주소" aria-label="지도 검색어" value="'+ea(sd.map||'')+'"><a class="btn" data-mapcheck="sp" href="#" target="_blank" rel="noopener" style="text-decoration:none">'+ic('pin',16)+'확인</a></div></div>'+
      '<div class="small muted">이름을 바꾸면 이 스팟과 연결된 일정의 제목도 같이 바뀌어요.</div>'+
      '<div class="row"><button class="btn pri" style="flex:1" data-act="spedit-save">저장</button></div>';
  }else if(v==='tripedit'){
    var t=trip();if(!t)return '';
    body=shead('여행 정보 수정','sheet','trips','뒤로')+
      '<div><div class="lbl">여행명</div><input class="fld" id="te_title" style="width:100%" value="'+ea(t.title||'')+'" aria-label="여행명"></div>'+
      '<div class="dt2"><div><div class="lbl">시작일</div>'+dfld('date','te_start',t.start,'시작일')+'</div><div><div class="lbl">종료일</div>'+dfld('date','te_end',t.end,'종료일')+'</div></div>'+
      '<div><div class="lbl">상태</div><select class="fld" id="te_status" style="width:100%" aria-label="상태">'+[['planned','계획'],['active','진행 중'],['done','완료']].map(function(o){return '<option value="'+o[0]+'"'+(t.status===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></div>'+
      '<div><div class="lbl">도시 이름</div>'+(t.cities||[]).map(function(c,i){return '<input class="fld te_city" data-i="'+i+'" style="width:100%;margin-bottom:6px" value="'+ea(c.name)+'" aria-label="도시 이름">'}).join('')+'</div>'+
      '<div class="small muted">기간을 바꿔도 이미 입력한 일정의 날짜는 그대로 남아요. 범위 밖 날짜는 화면에 나오지 않아요.</div>'+
      '<div class="row"><button class="btn pri" style="flex:1" data-act="trip-save">저장</button><button class="btn" data-act="sheet" data-v="trips">취소</button></div>';
  }
  return '<div class="sheetwrap" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true">'+body+'</div></div>';
}

/* ---------- render ---------- */
var LASTSIG='';
var TABS=[['today','오늘','sun'],['sched','일정','cal'],['check','체크','chk'],['budget','경비','wal'],['spots','스팟','pin']];
function render(){
  var sc=document.getElementById('screen'),y=sc.scrollTop,mly=Array.prototype.map.call(sc.querySelectorAll('.fitlist.scroll'),function(x){return x.scrollTop});
  var ml=sc.querySelector('.fitlist.scroll[data-end]'),mAtEnd=!!ml&&ml.scrollTop+ml.clientHeight>=ml.scrollHeight-4;  // 메모 목록을 맨 아래(최신)까지 보고 있었는지
  var sig=UI.tab+'|'+viewDate(),sameView=sig===LASTSIG;LASTSIG=sig;
  var h='';PINH='';
  try{
    if(!M)h=empty();
    else if(UI.tab==='today')h=screenToday();
    else if(UI.tab==='sched')h=screenSched();
    else if(UI.tab==='check')h=screenCheck();
    else if(UI.tab==='budget')h=screenBudget();
    else h=screenSpots();
  }catch(e){console.error(e);h=card('<b>화면을 그리지 못했어요</b><div class="small muted">'+esc(e.message)+'</div>')}
  sc.innerHTML=h;
  var tb='';try{tb=topBar()}catch(e){console.error(e)}   // 상단바 문제로 화면 전체가 멈추지 않게
  document.getElementById('pin').innerHTML=tb+PINH;
  document.getElementById('tabbar').innerHTML=TABS.map(function(t){var c=pcol(TABC[t[0]]);return '<button data-act="tab" data-v="'+t[0]+'" class="'+(UI.tab===t[0]?'on':'')+'" aria-current="'+(UI.tab===t[0]?'page':'false')+'" style="--tc:'+c[0]+';--ts:'+c[2]+'"><span class="tabi">'+ic(t[2],24)+'</span><span>'+t[1]+'</span></button>'}).join('');
  document.getElementById('bg-fixed').style.setProperty('--glow',pcol(TABC[UI.tab]||'orange')[1].replace(/,[\d.]+\)$/,',.26)'));
  var shh=sheetHtml();if(UI.sheet&&!shh)UI.sheet=null;  // 열려 있던 대상이 동기화로 사라진 경우 쓸기·입력이 막히지 않게
  document.getElementById('sheet').innerHTML=shh;
  if(UI.edit){var ei=document.querySelector('input.edit');if(ei&&document.activeElement!==ei){ei.focus();var el2=ei.value.length;try{ei.setSelectionRange(el2,el2)}catch(e){}} /* 전체 선택(파란 드래그) 대신 글 끝에 커서만 */}
  sc.scrollTop=y;
  fitMemoList();
  if(UI.album)renderAlbum(false);   // 동기화로 사진이 바뀌었을 때만 다시 그린다
  Array.prototype.forEach.call(sc.querySelectorAll('.fitlist.scroll'),function(x,i){
    if(x.hasAttribute('data-end')){if(!sameView||mAtEnd)x.scrollTop=x.scrollHeight;else if(mly[i])x.scrollTop=mly[i]}  // 메모는 시간순 그대로, 처음 열 때·맨 아래를 보던 중이면 최신(맨 아래)부터 보이게
    else if(mly[i])x.scrollTop=mly[i];
  });
}

/* ---------- 날짜·시간 선택 모달 (iikoto 본앱의 가운데 모달 · 시간 휠 · 월 달력과 같은 구성) ---------- */
var TW_H=40;
function openPicker(type,value,title,onOk,opt){
  opt=opt||{};
  if(type==='time'){
    var m=String(value||'').match(/^(\d{1,2}):(\d{2})$/),n=new Date();
    var h=m?Math.min(23,+m[1]):n.getHours(),mi=m?Math.min(59,+m[2]):n.getMinutes();
    PK={type:'time',title:title,onOk:onOk,clearable:!!opt.clearable,h:h,mi:Math.min(11,Math.round(mi/5))};  // mi = 5분 단위 칸 번호
  }else{
    var base=value?parse(value):new Date();
    PK={type:'date',title:title,onOk:onOk,clearable:!!opt.clearable,y:base.getFullYear(),m:base.getMonth(),sel:value||ds(base)};
  }
  renderPicker();
}
function spotEditOpen(sp){UI.spDraft={id:sp.cid,name:sp.d.name,cat:sp.d.cat||'meal',city:sp.d.city,desc:sp.d.desc||'',map:(sp.d.map&&sp.d.map!==sp.d.name)?sp.d.map:''};UI.sheet='spedit';render()}
function spotDelete(sp){M.spots=M.spots.filter(function(x){return x.cid!==sp.cid});tiDel(sp);render();toastUndo('"'+sp.d.name+'" 삭제했어요',function(){tiUndoDel(sp);M.spots.push(sp);tiUp('spot',sp);render()})}
function evSetDone(e,on){e.d.done=on;if(on)e.d.doneAt=Date.now();else delete e.d.doneAt;tiUp('event',e);mirrorEvent(e);render()}
function openChoice(title,msg,btns,row){PK={type:'choice',title:title,msg:msg,btns:btns,row:!!row};renderPicker()}
function closePicker(){PK=null;var el=document.getElementById('picker');if(el)el.innerHTML=''}
function pickerHtml(){
  if(!PK)return '';
  if(PK.type==='choice')return '<div class="pov" data-act="pk-bg"><div class="pmodal" role="alertdialog" aria-modal="true"><div class="pttl">'+esc(PK.title)+'</div><div style="font-size:14px;line-height:1.55;color:var(--tx)">'+esc(PK.msg)+'</div><div class="'+(PK.row?'pact':'pstack')+'">'+PK.btns.map(function(b,i){return '<button class="pbtn '+(b.cls||'')+'" data-act="pk-btn" data-i="'+i+'">'+esc(b.t)+'</button>'}).join('')+'</div></div></div>';
  var acts='<div class="pact"><button class="pbtn" data-act="pk-cancel">취소</button>'+(PK.clearable?'<button class="pbtn" data-act="pk-clear">지우기</button>':'')+'<button class="pbtn ok" data-act="pk-ok">확인</button></div>';
  if(PK.type==='time'){
    var hs='',ms='',i;
    for(i=0;i<24;i++)hs+='<div class="tw-item" data-i="'+i+'">'+pad(i)+'</div>';
    for(i=0;i<12;i++)ms+='<div class="tw-item" data-i="'+i+'">'+pad(i*5)+'</div>';
    return '<div class="pov" data-act="pk-bg"><div class="pmodal tm" role="dialog" aria-modal="true"><div class="pttl">'+esc(PK.title)+'</div><div class="tw-wrap"><div class="tw-fade-top"></div><div class="tw-fade-bottom"></div><div class="tw-cw"><div class="tw-hl"></div><div class="tw-col" id="tw-h"><div class="tw-sp"></div>'+hs+'<div class="tw-sp"></div></div></div><div class="tw-colon">:</div><div class="tw-cw"><div class="tw-hl"></div><div class="tw-col" id="tw-m"><div class="tw-sp"></div>'+ms+'<div class="tw-sp"></div></div></div></div>'+acts+'</div></div>';
  }
  var y=PK.y,mo=PK.m,dim=new Date(y,mo+1,0).getDate(),first=(new Date(y,mo,1).getDay()+6)%7,t=trip(),td=today();
  var g='';['월','화','수','목','금','토','일'].forEach(function(n,i){g+='<div class="pdn'+(i===6?' sun':'')+'">'+n+'</div>'});
  for(var k=0;k<first;k++)g+='<div></div>';
  for(var d=1;d<=dim;d++){
    var dk=y+'-'+pad(mo+1)+'-'+pad(d),inTrip=t&&dk>=t.start&&dk<=t.end;
    g+='<button class="pday'+((first+d-1)%7===6?' sun':'')+(dk===td?' today':'')+(dk===PK.sel?' sel':'')+'" data-act="pk-day" data-v="'+dk+'" aria-pressed="'+(dk===PK.sel)+'" aria-label="'+mo+'월 '+d+'일"><span class="pnum">'+d+'</span><span class="pbar" style="background:'+(inTrip?cityCol(cityOfDate(dk))[1]:'transparent')+'"></span></button>';
  }
  return '<div class="pov" data-act="pk-bg"><div class="pmodal" role="dialog" aria-modal="true"><div class="pttl">'+esc(PK.title)+'</div><div class="pcal-head"><button class="pnav" data-act="pk-prev" aria-label="이전 달">'+ic('chevl',18)+'</button><span class="pmon">'+y+'년 '+(mo+1)+'월</span><button class="pnav" data-act="pk-next" aria-label="다음 달">'+ic('chevr',18)+'</button></div><div class="pgrid">'+g+'</div>'+acts+'</div></div>';
}
function renderPicker(){
  var el=document.getElementById('picker');if(!el)return;
  el.innerHTML=pickerHtml();
  if(PK&&PK.type==='time')initWheels();
}
// 시간 휠: 스크롤 스냅(손가락 관성은 기기 기본 동작) + 가운데 칸만 크게
function initWheels(){
  var hc=document.getElementById('tw-h'),mc=document.getElementById('tw-m');if(!hc||!mc)return;
  function mark(col,idx){Array.prototype.forEach.call(col.querySelectorAll('.tw-item'),function(el,i){el.className='tw-item'+(i===idx?' sel':(Math.abs(i-idx)===1?' near':''))})}
  function bind(col,max,init,set){
    var raf=0;
    col.scrollTop=init*TW_H;mark(col,init);
    col.addEventListener('scroll',function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;var idx=Math.max(0,Math.min(max,Math.round(col.scrollTop/TW_H)));mark(col,idx);set(idx)})});
    col.addEventListener('click',function(e){var it=e.target.closest&&e.target.closest('.tw-item');if(!it)return;var i=+it.getAttribute('data-i');if(col.scrollTo)col.scrollTo({top:i*TW_H,behavior:'smooth'});else col.scrollTop=i*TW_H;mark(col,i);set(i)});
  }
  bind(hc,23,PK.h,function(i){if(PK)PK.h=i});
  bind(mc,11,PK.mi,function(i){if(PK)PK.mi=i});
}

/* ---------- actions ---------- */
function findCl(id){for(var i=0;i<CL.items.length;i++){if(CL.items[i].id===id)return CL.items[i]}return null}
function commitEdit(id,val){
  if(UI.edit!==id)return;
  val=(val||'').trim();var it=findCl(id);
  if(it&&val&&val!==it.t){it.t=val;tdUpd(it,{text:val});if(it.at&&it.ao&&!it.done)alUpdate(it,true)}
  UI.edit=null;UI.editVal=null;render();
}
function addCl(key,val,ts,at,ao,cat){
  val=(val||'').trim();if(!val)return;
  var it={id:newClId(key),date:clDate(key),pre:key==='pre',t:val,ts:ts||'none',done:false,created:Date.now(),at:key==='pre'?'':(at||''),ao:key==='pre'?false:!!(at&&ao),cat:key==='pre'?'todo':(cat||'todo')};
  CL.items.push(it);tdAdd(it);delete UI.addTxt[key];render();
  var ni=document.querySelector('input[data-add="'+key+'"]');if(ni)ni.focus();
}
function setChoice(d,slot,v){
  var k=d+'|'+slot,ch=M.choices[k];
  if(!ch){ch={cid:'choice_'+d+'_'+slot,date:d,sort:0,d:{slot:slot,plan:v,text:''}};M.choices[k]=ch}
  else ch.d.plan=v;
  tiUp('choice',ch);render();
}
function expLine(cur,amt){var n=parseAmt(amt);return cur==='KRW'?'원화로 결제한 금액이에요 · 환산 없이 그대로 합산돼요':won(n*fx())+'원 · 1엔 = '+rate2()+'원'}
function updateExpLine(){var a=document.getElementById('x_amt'),k=document.getElementById('x_krw');if(k)k.textContent=expLine((UI.expDraft&&UI.expDraft.cur)||'JPY',a?a.value:'0')}
function openExp(id){
  var base={id:null,cur:'JPY',cat:'food',amt:'',name:'',ref:'',date:today(),time:nowHM()};
  if(id){var ex=byCid(M.expenses,id);if(ex){var d=ex.d;base={id:ex.cid,cur:d.currency==='KRW'?'KRW':'JPY',cat:d.ecat||'etc',amt:String(d.amount),name:d.name||'',ref:d.ref?d.ref.t+':'+d.ref.cid:'',date:d.date||today(),time:d.time||nowHM()}}}
  UI.expDraft=base;UI.sheet='exp';render();persistDraft();
  var sc=document.querySelector('.tsc.hscroll .chip.on');if(sc&&sc.scrollIntoView)sc.scrollIntoView({inline:'center',block:'nearest'});
  var a=document.getElementById('x_amt');if(a&&!id)a.focus();
}
function refInfo(val){
  if(!val)return null;var p=val.split(':'),t=p[0],cid=p.slice(1).join(':');
  if(t==='event'){var e=findEvent(cid);return e?{t:'event',cid:cid,name:e.d.title}:null}
  if(t==='spot'){var sp=byCid(M.spots,cid);return sp?{t:'spot',cid:cid,name:sp.d.name}:null}
  if(t==='check'){var ck=findCl(cid);return ck?{t:'check',cid:cid,name:ck.t}:null}
  return null;
}
function saveExp(){
  var dr=UI.expDraft||{};
  var amt=parseAmt(document.getElementById('x_amt').value);
  if(!amt){toast('금액을 입력해 주세요');return}
  var ri=refInfo(dr.ref);
  var nm=(document.getElementById('x_name').value||'').trim()||(ri?ri.name:'')||ECAT[dr.cat||'etc'];
  var date=document.getElementById('x_date').value||today(),time=document.getElementById('x_time').value||nowHM();
  var data={cat:'local',name:nm,amount:amt,currency:(dr.cur==='KRW'?'KRW':'JPY'),paid:true,local:true,date:date,time:time,ecat:dr.cat||'etc'};
  if(ri)data.ref={t:ri.t,cid:ri.cid,name:ri.name};
  var o=dr.id?byCid(M.expenses,dr.id):null;
  if(o){o.d=data;o.date=date}else{o={cid:'exp_'+genCid(),date:date,sort:Date.now()%100000000,d:data};M.expenses.push(o)}
  tiUp('expense',o);endSheet();render();toast('저장했어요');
}
function timeToSlot(t){var h=parseInt(String(t).split(':')[0],10);if(isNaN(h))return 'pm';return h<11?'am':(h<14?'noon':(h<18?'pm':'eve'))}
function spotOfEvent(e){
  if(!M)return null;
  if(e.d.spot){var s1=byCid(M.spots,e.d.spot);if(s1)return s1}
  var nm=(e.d.title||'').trim();
  return M.spots.filter(function(x){return x.d.name===nm})[0]||null;
}
function linkedEvents(sp){
  var out=[];Object.keys(M.events).sort().forEach(function(d){M.events[d].forEach(function(e){if(spotOfEvent(e)===sp)out.push(e)})});return out;
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
  var base={id:null,date:date||UI.sched||clampDate(today()),slot:'pm',spot:'',title:'',desc:'',map:'',time:'',mapOn:true};
  if(id){var e=findEvent(id);if(e){var d=e.d;base={id:e.cid,mapOn:!!d.map,date:e.date,slot:d.slot||'pm',spot:d.spot||(spotOfEvent(e)?spotOfEvent(e).cid:''),title:d.title||'',desc:d.desc||'',map:d.map||'',time:d.time||''}}}
  else if(spotCid){
    var sp=byCid(M.spots,spotCid);
    if(sp){base.spot=sp.cid;base.title=sp.d.name;base.desc=sp.d.desc||'';base.map=sp.d.map||sp.d.name;base.slot=SPOT_SLOT[sp.d.cat]||'pm'}
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
  delete d.cond;
  Object.keys(d).forEach(function(k){if(d[k]===undefined)delete d[k]});
  var e=old;
  if(e){removeEvent(e);e.date=date;e.d=d}
  else e={cid:'ev_'+date+'_'+genCid(),date:date,sort:0,d:d};
  insertEvent(date,e);mirrorEvent(e);
  var t=trip();if(t&&(date<t.start||date>t.end))toast('여행 기간 밖의 날짜예요. 기간을 넓히면 보여요');
  UI.sched=date;endSheet();render();if(!(t&&(date<t.start||date>t.end)))toast('저장했어요');
}
function delEvent(e,sp){
  removeEvent(e);tiDel(e);mirrorDel(e);
  if(sp){M.spots=M.spots.filter(function(x){return x.cid!==sp.cid});tiDel(sp)}
  closeSheet();
  toastUndo(sp?'일정과 스팟을 삭제했어요':'일정을 삭제했어요',function(){tiUndoDel(e);insertEvent(e.date,e);mirrorEvent(e);if(sp){tiUndoDel(sp);M.spots.push(sp);tiUp('spot',sp)}render()});
}
function placedSpotCids(){var m={};Object.keys(M.events).forEach(function(d){M.events[d].forEach(function(e){var sp=spotOfEvent(e);if(sp)m[sp.cid]=1})});return m}
function normQ(t){return String(t||'').toLowerCase().replace(/\s+/g,'')}
function evSugHtml(ed){
  var q=normQ(ed.title),cc=cityOfDate(ed.date||today());
  var linked=ed.spot?byCid(M.spots,ed.spot):null;
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
    list=M.spots.filter(function(sp){return sp.d.city===cc&&!placed[sp.cid]});
    label='아직 일정에 안 넣은 스팟 · '+cityName(cc);
  }
  list=list.slice().sort(function(a,b){return (a.d.city===cc?0:1)-(b.d.city===cc?0:1)}).slice(0,5);
  if(list.length)h+='<div class="small muted" style="margin:10px 0 6px">'+esc(label)+'</div><div class="tsc" style="margin-top:0">'+list.map(function(sp){return '<button class="tschip" data-act="evpick" data-id="'+ea(sp.cid)+'">'+esc(sp.d.name)+'</button>'}).join('')+'</div>';
  else if(q&&!linked)h+='<div class="small muted" style="margin-top:8px">일치하는 스팟이 없어요 · 그대로 일정으로 저장돼요</div>';
  return h;
}
function refreshSug(){var sg=document.getElementById('ev_sug');if(sg&&UI.evDraft)sg.innerHTML=evSugHtml(UI.evDraft)}
function swipeWeek(dir){
  var t=trip();if(!t)return;
  var key=UI.tab==='check'?'clDate':'sched';
  var cur=UI[key]||clampDate(today()),tg=addDays(cur,dir*7);
  if(tg<t.start)tg=t.start;if(tg>t.end)tg=t.end;
  if(weekStartOf(tg)===weekStartOf(cur))return;
  UI[key]=tg;UI.wkAnim=dir>0?'l':'r';render();
}
var swipeX=null,swipeY=null;
/* ---------- 탭 이동(하단 메뉴·쓸어넘기기 공용) ---------- */
function resetView(){  // 탭을 옮길 때마다 '오늘 기준'으로 다시 연다(마지막에 본 날짜·도시·분류는 기억하지 않음)
  UI.vd=null;UI.sched=null;UI.clDate=null;UI.clPre=false;UI.spCat='all';UI.tlf=null;
  var t=trip(),c=curCity();UI.spCity=(t&&t.cities.some(function(x){return x.id===c}))?c:null;
}
function goTab(v,dir){
  var sc=document.getElementById('screen');
  resetView();UI.tab=v;render();sc.scrollTop=0;
  if(v==='sched')focusNowLine();
  if(dir){  // 쓸어서 이동했을 때만 살짝 밀려 들어오는 효과(본앱과 같은 방식)
    sc.classList.remove('tab-enter-from-left','tab-enter-from-right');void sc.offsetWidth;
    sc.classList.add(dir==='left'?'tab-enter-from-right':'tab-enter-from-left');
    setTimeout(function(){sc.classList.remove('tab-enter-from-left','tab-enter-from-right')},260);
  }
}
function nearestLine(){
  var nm=nowMin(),best=null,bd=1e9;
  document.querySelectorAll('#screen .tl .ev[data-t]').forEach(function(el){
    var t=el.getAttribute('data-t');if(!/^\d{1,2}:\d{2}$/.test(t))return;
    var d=Math.abs(hmMin(t)-nm);if(d<bd){bd=d;best=el}
  });
  return best;
}
function focusNowLine(){
  if(UI.sched!==today())return;
  var el=nearestLine(),sc=document.getElementById('screen');if(!el)return;
  var first=document.querySelector('#screen .tl .ev[data-t]'),ft=first&&first.getAttribute('data-t');
  if(ft&&/^\d{1,2}:\d{2}$/.test(ft)&&nowMin()<hmMin(ft))return;  // 첫 일정 전에는 내리지 않고 맨 위부터 보여준다
  sc.scrollTop+=el.getBoundingClientRect().top-sc.getBoundingClientRect().top-40;  // 바로 앞 줄이 조금 보이도록 여유를 둔다
}
/* 화면을 좌우로 쓸면 옆 탭으로 이동. 가로로 움직이는 영역(칩·사진 줄)이나 입력창, 열린 시트에서는 반응하지 않는다 */
var swipeTab=null;
function swipeBlocked(t){
  if(UI.sheet||PK||document.getElementById('picker').innerHTML.trim())return true;
  for(var el=t;el&&el.id!=='screen';el=el.parentElement){
    var tag=el.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||el.isContentEditable)return true;
    if(el.scrollWidth>el.clientWidth+2){var ox=getComputedStyle(el).overflowX;if(ox==='auto'||ox==='scroll')return true}
  }
  return false;
}
function onTabTouchStart(e){
  if(!e.touches||e.touches.length!==1||swipeBlocked(e.target)){swipeTab=null;return}
  swipeTab={x:e.touches[0].clientX,y:e.touches[0].clientY};
}
function onTabTouchEnd(e){
  if(!swipeTab)return;var s=swipeTab;swipeTab=null;
  var p=e.changedTouches&&e.changedTouches[0];if(!p)return;
  var dx=p.clientX-s.x,dy=p.clientY-s.y;
  if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.3)return;   // 세로로 스크롤하려던 움직임은 무시
  var i=TABS.map(function(t){return t[0]}).indexOf(UI.tab),n=dx<0?i+1:i-1;
  if(i<0||n<0||n>=TABS.length)return;
  goTab(TABS[n][0],dx<0?'left':'right');
}
function onTouchStart(e){var st=e.target.closest&&e.target.closest('#strip');if(!st){swipeX=null;return}var p=(e.touches&&e.touches[0])||e;swipeX=p.clientX;swipeY=p.clientY}
function onTouchEnd(e){
  if(swipeX==null)return;
  var p=(e.changedTouches&&e.changedTouches[0])||e,dx=p.clientX-swipeX,dy=p.clientY-swipeY;swipeX=null;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)swipeWeek(dx<0?1:-1);
}
function nowMin(){var d=new Date();return d.getHours()*60+d.getMinutes()}
function hmMin(t){var p=String(t).split(':');return (+p[0])*60+(+p[1]||0)}
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
      M.spots.filter(function(sp){return sp.d.city===cc}).slice(0,5).forEach(function(sp){list.push({ref:'spot:'+sp.cid,name:sp.d.name,tag:'스팟'})});
      label='이 날짜엔 일정이 없어요 · '+cityName(cc)+' 스팟';
    }
  }
  var shops=(CL.items||[]).filter(function(i){return !i.pre&&i.date===date&&i.cat==='shop'&&i.done&&!(linked&&linked.cid===i.id)})  // 그날 완료한 쇼핑 체크는 몇 개 안 되므로 이름이 달라도(예: 체크 '치약이랑 핸드크림 작은거' ↔ 결제 '치약, 핸드크림') 모두 보여주고, 이름이 맞는 것을 앞으로
    .map(function(i){return {ref:'check:'+i.id,name:i.t,tag:'체크',m:(q&&normQ(i.t).indexOf(q)>=0)?0:1}}).sort(function(x,y){return x.m-y.m});
  list=shops.concat(list).slice(0,5);
  if(list.length)h+='<div class="small muted" style="margin:10px 0 6px">'+esc(label)+'</div><div class="tsc" style="margin-top:0">'+list.map(function(x){return '<button class="tschip" data-act="xpick" data-ref="'+ea(x.ref)+'" data-name="'+ea(x.name)+'">'+(x.tag==='체크'?ic('shopping-cart',14)+' ':'')+esc(x.name)+'</button>'}).join('')+'</div>';
  else if(q&&!linked)h+='<div class="small muted" style="margin-top:8px">일치하는 일정·스팟이 없어요 · 내용만 저장돼요</div>';
  return h;
}
function refreshXSug(){var sg=document.getElementById('x_sug');if(sg&&UI.expDraft)sg.innerHTML=xSugHtml(UI.expDraft)}
function persistDraft(){
  try{
    var g=function(id){var x=document.getElementById(id);return x?x.value:null};
    if(UI.sheet==='ev'&&UI.evDraft){var d=UI.evDraft;if(g('ev_title')!=null){d.title=g('ev_title');d.date=g('ev_date');d.time=g('ev_time');d.desc=g('ev_desc');d.map=g('ev_map');}lset('draft',{k:'ev',d:d,t:Date.now()})}
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
/* ---------- 사진첩 ----------
   사진은 이이코토 메모에 올린 것을 읽기 전용으로 모아 보여준다. 최신순 한 줄기 그리드 + 지역·날짜 칩(둘 다 걸 수 있음).
   사진을 누르면 이이코토 본앱과 같은 모양의 폴라로이드 뷰어(좌우로 밀어 넘기기: 왼쪽으로 밀면 더 오래된 사진, 오른쪽으로 밀면 더 최신 사진) */
var ALBSIG='',ALBH=0;   // ALBH: 사진첩이 쌓아 둔 브라우저 기록 수(사진첩 1 + 뷰어 1) — 시스템 뒤로가기·가장자리 쓸기와 같은 길로 닫히게 한다
function albPush(){try{history.pushState({iitabiAlb:1},'');ALBH++}catch(e){}}
function albPop(){var A=UI.album;if(!A)return;if(A.v>=0)albumView(-1);else{UI.album=null;renderAlbum(true)}}   // 기록은 이미 뒤로 갔을 때 화면만 닫는다
function albBack(){if(!UI.album)return;if(ALBH>0){try{history.back();return}catch(e){}}albPop()}   // 맨 위 겹(뷰어 → 사진첩 순)부터 한 겹 닫기
window.addEventListener('popstate',function(){if(ALBH>0){ALBH--;albPop()}});
function albumAll(){
  return MEMOS.filter(hasPhoto).map(function(m){return {m:m,city:cityOfDate(m.date_key)}}).sort(function(a,b){
    var x=a.m.date_key+(a.m.memo_time||''),y=b.m.date_key+(b.m.memo_time||'');return x<y?1:(x>y?-1:0)});
}
function albumList(){
  var A=UI.album;if(!A)return [];
  return albumAll().filter(function(p){return (A.city==='all'||p.city===A.city)&&(A.date==='all'||p.m.date_key===A.date)});
}
function albumHtml(){
  var A=UI.album,all=albumAll(),t=trip();
  var inCity=all.filter(function(p){return A.city==='all'||p.city===A.city}),dates=[];
  inCity.forEach(function(p){if(dates.indexOf(p.m.date_key)<0)dates.push(p.m.date_key)});   // 사진이 있는 날만, 최신 날짜부터
  if(A.date!=='all'&&dates.indexOf(A.date)<0)A.date='all';
  var list=albumList(),cnt={};all.forEach(function(p){cnt[p.city]=(cnt[p.city]||0)+1});
  var cc='<button class="chip tsb'+(A.city==='all'?' on':'')+'" data-act="albcity" data-v="all" aria-pressed="'+(A.city==='all')+'">전체 '+all.length+'</button>'+
    ((t&&t.cities)||[]).map(function(c){var on=A.city===c.id;return '<button class="chip tsb'+(on?' on':'')+'" data-act="albcity" data-v="'+ea(c.id)+'" style="'+selVars(cityKey(c.id))+'" aria-pressed="'+on+'">'+esc(c.name)+' '+(cnt[c.id]||0)+'</button>'}).join('');
  var dc='<button class="chip tsb'+(A.date==='all'?' on':'')+'" data-act="albdate" data-v="all" aria-pressed="'+(A.date==='all')+'">모든 날짜</button>'+
    dates.map(function(d){var on=A.date===d;return '<button class="chip tsb'+(on?' on':'')+'" data-act="albdate" data-v="'+d+'" aria-pressed="'+on+'">'+md(d)+'</button>'}).join('');
  var grid=list.length?'<div class="algrid">'+list.map(function(p,i){
    return '<button class="alt" data-act="albopen" data-i="'+i+'" aria-label="'+ea(md(p.m.date_key)+' '+(p.m.memo_time||'')+' 사진')+'">'+ic('photo',18)+'<img class="mphi" loading="lazy" decoding="async" alt="" src="'+ea(p.m.photo_url)+'"></button>';
  }).join('')+'</div>':'<div class="alemp">'+(all.length?'이 조건에 맞는 사진이 없어요':'아직 사진이 없어요<br>이이코토 메모에 올린 사진이 여기 모여요')+'</div>';
  return '<div class="alb"><div class="alh"><button class="abk" data-act="albclose" aria-label="사진첩 닫기">'+ic('chevl',24)+'</button><h1>사진첩</h1><span class="small muted">'+list.length+'장</span></div>'+
    '<div class="alchips"><div class="tsc hscroll">'+cc+'</div><div class="tsc hscroll">'+dc+'</div></div><div class="alsc" id="alsc">'+grid+'</div></div>';
}
function renderAlbum(force){
  var el=document.getElementById('album');if(!el)return;
  var A=UI.album;
  if(!A){el.classList.remove('on');el.innerHTML='';ALBSIG='';return}
  var sig=A.city+'|'+A.date+'|'+albumList().map(function(p){return p.m.photo_url}).join(',')+'|'+((trip()||{}).cities||[]).length;
  if(!force&&sig===ALBSIG)return;
  ALBSIG=sig;
  var old=document.getElementById('alsc'),y=old?old.scrollTop:0,xs=Array.prototype.map.call(el.querySelectorAll('.tsc.hscroll'),function(r){return r.scrollLeft});
  el.innerHTML=albumHtml();el.classList.add('on');
  var sc=document.getElementById('alsc');if(sc)sc.scrollTop=force?0:y;   // 칩을 바꾸면 맨 위부터, 동기화로 다시 그릴 땐 보던 자리 유지
  Array.prototype.forEach.call(el.querySelectorAll('.tsc.hscroll'),function(r,i){if(!force&&xs[i])r.scrollLeft=xs[i]});
  if(A.v>=0&&A.v>=albumList().length)albBack();
}
function albumView(i){
  var A=UI.album,el=document.getElementById('albview');if(!A||!el)return;
  var list=albumList(),p=list[i];
  if(!p){A.v=-1;el.classList.remove('on');el.innerHTML='';return}
  if(A.v<0)albPush();
  A.v=i;
  var m=p.m,d=parse(m.date_key);
  var meta=(d.getMonth()+1)+'월 '+d.getDate()+'일 '+wd(m.date_key)+'요일'+(m.memo_time?' · '+m.memo_time:'')+(p.city?' · '+cityName(p.city):'');
  el.innerHTML='<div class="pvo" data-act="albvbg"><div class="pvc"><div class="pvf"><div class="pvw">'+ic('photo',26)+'<img class="mphi" alt="" src="'+ea(m.photo_url)+'"><button class="pvx" data-act="albvclose" aria-label="닫기">'+ic('x',14)+'</button></div>'+
    '<div class="pvd">'+esc(meta)+'</div><div class="pvt">'+(m.text?esc(m.text).replace(/\n/g,'<br>'):'')+'</div></div>'+
    '<div class="pvh">'+(list.length>1?'좌우로 밀어 넘기기 · ':'')+(i+1)+' / '+list.length+'</div></div></div>';
  el.classList.add('on');
  [i-1,i+1].forEach(function(k){if(list[k]){var im=new Image();im.src=list[k].m.photo_url}});   // 이웃 사진을 미리 받아 넘길 때 바로 뜨게
}
function albumNav(dir){var A=UI.album;if(!A||A.v<0)return;var n=A.v+dir;if(n<0||n>=albumList().length)return;albumView(n)}
var avS=null;
function onAvStart(e){if(!UI.album||UI.album.v<0||!e.touches||e.touches.length!==1)return;avS={x:e.touches[0].clientX,y:e.touches[0].clientY}}
var ebS=null;   // 사진첩 목록: 왼쪽 가장자리에서 오른쪽으로 쓸면 뒤로(iOS 뒤로가기 제스처와 같음)
function onEdgeStart(e){if(!UI.album||UI.album.v>=0||!e.touches||e.touches.length!==1){ebS=null;return}var x=e.touches[0].clientX;ebS=x<=28?{x:x,y:e.touches[0].clientY}:null}
function onEdgeEnd(e){if(!ebS)return;var s=ebS;ebS=null;var p=e.changedTouches&&e.changedTouches[0];if(!p)return;var dx=p.clientX-s.x,dy=p.clientY-s.y;if(dx>70&&dx>Math.abs(dy)*1.3)albBack()}
function onAvEnd(e){
  if(!avS)return;var s=avS;avS=null;var p=e.changedTouches&&e.changedTouches[0];if(!p)return;
  var dx=p.clientX-s.x,dy=p.clientY-s.y;
  if(s.x<=28&&dx>70&&dx>Math.abs(dy)*1.3){albBack();return}   // 가장자리에서 시작한 쓸기는 뒤로(뷰어 닫기)
  if(Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy)*1.3)return;   // 세로 스크롤 의도는 무시
  albumNav(dx<0?1:-1);   // 왼쪽으로 밀면 다음(더 오래된), 오른쪽으로 밀면 이전(더 최신) — 일반 갤러리 방향
}
/* ---------- 클릭 동작 표: data-act 값 → 처리 함수 (각 함수가 자기 지역변수를 가진다) ---------- */
function pkMonth(el,v,id){var a=el.getAttribute('data-act');if(!PK)return;PK.m+=(a==='pk-next'?1:-1);if(PK.m<0){PK.m=11;PK.y--}else if(PK.m>11){PK.m=0;PK.y++}renderPicker()}
function delWithUndo(o,label,list,kind){  // 지출·결제 항목 삭제 + 5초 되돌리기
  M[list]=M[list].filter(function(x){return x.cid!==o.cid});tiDel(o);render();
  toastUndo(label,function(){tiUndoDel(o);M[list].push(o);tiUp(kind,o);render()});
}
var ACT={
  'tab':function(el,v){goTab(v)},
  'sheet':function(el,v){UI.sheet=v;render()},
  'sheet-close':function(){closeSheet()},
  'sync':function(){pull(true).then(function(){toast('동기화했어요')})},
  'date':function(el,v){UI.sched=v;render()},
  'cdate':function(el,v){UI.clDate=v;UI.clPre=false;render()},
  'clpre':function(){UI.clPre=!UI.clPre;render()},
  'goiikoto':function(){window.location.href='https://bombyul1011.github.io/iikoto/'},  // 같은 창에서 본앱으로 이동
  'pick':function(el){
    var pid=el.getAttribute('data-for'),ptype=el.getAttribute('data-pk'),pinp=document.getElementById(pid);
    openPicker(ptype,pinp?pinp.value:'',ptype==='date'?'날짜 선택':'시간 선택',function(val){
      var t2=document.getElementById(pid);if(!t2)return;
      t2.value=val;syncDF(t2);t2.dispatchEvent(new Event('change',{bubbles:true}));persistDraft();
    },{clearable:!!el.getAttribute('data-clr')});
  },
  'pk-cancel':function(){closePicker()},
  'pk-btn':function(el){var pk=PK,i=+el.getAttribute('data-i');closePicker();if(pk&&pk.btns&&pk.btns[i]&&pk.btns[i].fn)pk.btns[i].fn()},
  'pk-clear':function(){var pk=PK;closePicker();if(pk&&pk.onOk)pk.onOk('')},
  'pk-ok':function(){
    var pk=PK;if(!pk)return;
    var val=pk.type==='time'?pad(pk.h)+':'+pad(pk.mi*5):pk.sel;
    closePicker();if(pk.onOk)pk.onOk(val);
  },
  'pk-day':function(el,v){if(PK){PK.sel=v;renderPicker()}},
  'pk-prev':pkMonth,
  'pk-next':pkMonth,
  'plan':function(el,v){setChoice(el.getAttribute('data-date'),el.getAttribute('data-slot'),v)},

  /* 체크리스트 */
  'ck':function(el,v,id){
    var it=findCl(id);if(!it||it.done===el.checked)return;  // 클릭·change가 겹쳐 두 번 와도 한 번만 처리
    it.done=el.checked;it.completedAt=it.done?Date.now():null;
    tdUpd(it,{done:it.done,completed_at:it.completedAt});
    if(it.at)alUpdate(it,true);
    render();
  },
  'edit':function(el,v,id){UI.edit=id;UI.editVal=null;render()},
  'edit-ok':function(el,v,id){var inp=document.querySelector('input.edit');commitEdit(id,inp?inp.value:'')},
  'edits':function(el,v,id){
    var ein=document.querySelector('input.edit');UI.editVal=ein?ein.value:null;
    var it=findCl(id);if(it){it.ts=v;tdUpd(it,{time_section:v})}
    render();
  },
  'del':function(el,v,id){
    var it=findCl(id);if(!it)return;
    CL.items=CL.items.filter(function(x){return x.id!==id});tdDel(it);render();
    toastUndo('항목을 삭제했어요',function(){tdUndoDel(it);render()});
  },
  'add':function(el){var key=el.getAttribute('data-key'),inp=document.querySelector('input[data-add="'+key+'"]');addPrompt(key,inp?inp.value:'')},
  'ctime':function(el,v,id){
    var it=findCl(id);if(!it||!it.completedAt)return;
    openPicker('time',hhmm(it.completedAt),'완료 시각',function(val){
      var c=findCl(id);if(c&&val){c.completedAt=setTimeOnly(c.completedAt||Date.now(),val);tdUpd(c,{completed_at:c.completedAt});render()}
    });
  },
  'clcat':function(el,v,id){
    if(id){keepEdit();var it=findCl(id);if(it){it.cat=v;tdUpd(it,{cat:v})}}
    else if(UI.clDraft)UI.clDraft.cat=v;
    render();
  },
  'clts':function(el,v){if(UI.clDraft){UI.clDraft.ts=v;render()}},
  'cl-save':function(){var cd=UI.clDraft;if(!cd)return;endSheet();addCl(cd.key,cd.t,cd.ts,cd.at,cd.ao,cd.cat)},
  'alpick':function(el,v,id){
    if(id){keepEdit();BLURSKIP=true;try{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur()}catch(e){}BLURSKIP=false}  // 수정 중이면 키보드를 내려 시간 휠이 가리지 않게(수정 상태는 유지)
    var it=id?findCl(id):UI.clDraft,cur=it&&it.at||'';
    openPicker('time',cur||'09:00','알림 시각',function(val){
      if(!val)return;
      if(id){var x=findCl(id);if(x){setItemAlert(x,val,true);render()}}
      else if(UI.clDraft){UI.clDraft.at=val;UI.clDraft.ao=true;render()}
    });
  },
  'albell':function(el,v,id){
    if(id)keepEdit();
    var it=id?findCl(id):UI.clDraft;if(!it)return;
    if(!it.at){if(el.nextElementSibling)el.nextElementSibling.click();return}
    if(id)setItemAlert(it,it.at,!it.ao);else it.ao=!it.ao;
    render();
  },
  'alclr':function(el,v,id){
    if(id){keepEdit();var x=findCl(id);if(x)setItemAlert(x,'',false)}
    else if(UI.clDraft){UI.clDraft.at='';UI.clDraft.ao=false}
    render();
  },
  'tlf':function(el,v){UI.tlf=UI.tlf||{};UI.tlf[v]=UI.tlf[v]===false;render()},

  /* 경비 */
  'exp-new':function(){openExp(null)},
  'expedit':function(el,v,id){openExp(id)},
  'exp-save':function(){saveExp()},
  'exp-del':function(el,v,id){
    var ex=byCid(M.expenses,id);
    if(ex)delWithUndo(ex,'지출을 삭제했어요','expenses','expense');
    closeSheet();
  },
  'xpick':function(el){
    var ref=el.getAttribute('data-ref'),nm=el.getAttribute('data-name');
    if(!UI.expDraft)return;
    UI.expDraft.ref=ref;UI.expDraft.name=nm;
    var inp=document.getElementById('x_name');if(inp)inp.value=nm;
    var info=refInfo(ref),guess=null;
    if(info&&info.t==='spot'){var sp=byCid(M.spots,info.cid);if(sp)guess=SPOT_ECAT[sp.d.cat]}
    else if(info&&info.t==='event'){var ev=findEvent(info.cid),es=ev?spotOfEvent(ev):null;if(es)guess=SPOT_ECAT[es.d.cat]}
    if(guess){UI.expDraft.cat=guess;setPick('expcat',guess)}
    refreshXSug();persistDraft();
  },
  'xunlink':function(){if(UI.expDraft){UI.expDraft.ref='';refreshXSug();persistDraft()}},
  'expcat':function(el,v){if(UI.expDraft)UI.expDraft.cat=v;pickOn(el)},
  'expcur':function(el,v){if(UI.expDraft)UI.expDraft.cur=v;pickOn(el);var sy=document.getElementById('x_sym');if(sy)sy.textContent=curSym(v);updateExpLine()},
  'payedit':function(el,v,id){
    var k=el.getAttribute('data-k'),po=byCid(k==='stay'?M.stays:M.expenses,id);if(!po)return;
    UI.payDraft={k:k,id:id,name:po.d.name,amt:String(po.d.amount),cur:po.d.currency==='JPY'?'JPY':'KRW'};UI.sheet='pay';render();
  },
  'paycur':function(el,v){if(UI.payDraft)UI.payDraft.cur=v;pickOn(el);var ps=document.getElementById('p_sym');if(ps)ps.textContent=curSym(v)},
  'pay-save':function(){
    var pd=UI.payDraft;if(!pd)return;
    var amt=parseAmt(document.getElementById('p_amt').value);
    if(!amt){toast('금액을 입력해 주세요');return}
    var po=byCid(pd.k==='stay'?M.stays:M.expenses,pd.id);
    if(po){po.d.amount=amt;po.d.currency=pd.cur;tiUp(pd.k==='stay'?'stay':'expense',po)}
    endSheet();render();toast('저장했어요');
  },
  'pay-del':function(){
    var pd=UI.payDraft,po=(pd&&pd.k==='exp')?byCid(M.expenses,pd.id):null;
    if(po)delWithUndo(po,'결제 항목을 삭제했어요','expenses','expense');
    closeSheet();
  },
  'fxmode':function(el,v){var f=fxGet();if(v==='auto'){f.auto=true;tiUp('trip',M.trip);fetchFx(true)}else{f.auto=false;tiUp('trip',M.trip)}render()},

  /* 스팟 */
  'spc':function(el,v){UI.spCity=v;render()},
  'spcat':function(el,v){UI.spCat=v;render()},
  'spcatpick':function(el,v){if(UI.spDraft)UI.spDraft.cat=v;pickOn(el)},
  'spcitypick':function(el,v){if(UI.spDraft)UI.spDraft.city=v;pickOn(el)},
  'spmore':function(el,v,id){
    var sp=byCid(M.spots,id);if(!sp)return;
    openChoice(sp.d.name,'이 스팟을 어떻게 할까요?',[
      {t:'수정',cls:'ok',fn:function(){spotEditOpen(sp)}},
      {t:'삭제',cls:'warn',fn:function(){spotDelete(sp)}},
      {t:'취소',fn:function(){}}],true);
  },
  'sp-new':function(){UI.addSpot=true;render()},
  'sp-cancel':function(){UI.addSpot=false;render()},
  'sp-save':function(){
    var nm=(document.getElementById('s_name').value||'').trim();if(!nm){toast('이름을 입력해 주세요');return}
    var so={cid:'spot_'+genCid(),date:null,sort:Date.now()%100000000,d:{city:UI.spCity,cat:document.getElementById('s_cat').value,name:nm,desc:(document.getElementById('s_desc').value||'').trim(),map:(document.getElementById('s_map').value||'').trim()||nm}};
    M.spots.push(so);tiUp('spot',so);UI.addSpot=false;render();
  },
  'spedit-save':function(){
    var sd=UI.spDraft;if(!sd)return;
    var sp=byCid(M.spots,sd.id);if(!sp)return;
    var nn=(document.getElementById('sp_name').value||'').trim();
    if(!nn){toast('이름을 입력해 주세요');return}
    var ndesc=(document.getElementById('sp_desc').value||'').trim(),nmap=(document.getElementById('sp_map').value||'').trim()||nn;
    var oldName=sp.d.name,oldMap=sp.d.map;
    if(nn!==oldName){  // 이름을 바꾸면 이 스팟과 연결된 일정의 제목·지도 검색어도 같이 바꾼다
      Object.keys(M.events).forEach(function(dk){M.events[dk].forEach(function(e){
        var byName=(e.d.title||'').trim()===oldName;
        if(e.d.spot!==sp.cid&&!byName)return;
        var chg=false;
        if(byName){e.d.title=nn;chg=true}
        if(!e.d.spot){e.d.spot=sp.cid;chg=true}
        if(e.d.map&&(e.d.map===oldMap||e.d.map===oldName)){e.d.map=nmap;chg=true}
        if(chg){tiUp('event',e);mirrorEvent(e)}
      })});
    }
    sp.d.name=nn;sp.d.cat=sd.cat;sp.d.city=sd.city;sp.d.map=nmap;
    if(ndesc)sp.d.desc=ndesc;else delete sp.d.desc;
    tiUp('spot',sp);
    endSheet();render();toast('저장했어요');
  },

  /* 일정 */
  'evck':function(el,v,id){var e=findEvent(id);if(e)evSetDone(e,!e.d.done)},
  'bnck':function(el,v,id){
    var e=findEvent(id);if(!e||e.d.done)return;
    evSetDone(e,true);
    toastUndo('"'+e.d.title+'" 완료했어요',function(){var e2=findEvent(id);if(e2&&e2.d.done)evSetDone(e2,false)});  // 그사이 서버에서 다시 받아와도 안전하게 id로 찾는다
  },
  'evtime':function(el,v,id){
    var e=findEvent(id);if(!e||!e.d.doneAt)return;
    openPicker('time',hhmm(e.d.doneAt),'완료 시각',function(val){
      var e2=findEvent(id);if(e2&&val){e2.d.doneAt=setTimeOnly(e2.d.doneAt,val);tiUp('event',e2);mirrorEvent(e2);render()}
    });
  },
  'evnew':function(el){openEv(null,el.getAttribute('data-date'))},
  'evedit':function(el,v,id){openEv(id)},
  'spot2ev':function(el,v,id){openEv(null,UI.sched||clampDate(today()),id)},
  'evpick':function(el,v,id){
    var sp=byCid(M.spots,id);if(!sp||!UI.evDraft)return;
    UI.evDraft.spot=sp.cid;UI.evDraft.title=sp.d.name;
    var ti=document.getElementById('ev_title'),ma=document.getElementById('ev_map'),de=document.getElementById('ev_desc');
    if(ti)ti.value=sp.d.name;
    if(ma&&!ma.value.trim())ma.value=sp.d.map||sp.d.name;
    if(de&&!de.value.trim())de.value=sp.d.desc||'';
    var slot=SPOT_SLOT[sp.d.cat];
    if(slot&&!document.getElementById('ev_time').value){UI.evDraft.slot=slot;setPick('evslot',slot)}
    refreshSug();persistDraft();
  },
  'evunlink':function(){if(UI.evDraft){UI.evDraft.spot='';refreshSug();persistDraft()}},
  'evslot':function(el,v){if(UI.evDraft)UI.evDraft.slot=v;pickOn(el)},
  'evmap':function(el,v){if(UI.evDraft)UI.evDraft.mapOn=(v==='true');pickOn(el)},
  'ev-save':function(){saveEv()},
  'ev-del':function(el,v,id){
    var e=findEvent(id);if(!e)return;
    var sp=spotOfEvent(e);
    if(sp&&linkedEvents(sp).length===1){
      openChoice('일정 삭제','"'+e.d.title+'"은(는) 스팟에서 넣은 일정이에요. 삭제하면 스팟 목록으로 돌아가요.',[
        {t:'스팟 목록으로 돌려놓기',cls:'ok',fn:function(){delEvent(e,null)}},
        {t:'스팟도 같이 삭제',cls:'warn',fn:function(){delEvent(e,sp)}},
        {t:'취소',fn:function(){}}]);
    }else delEvent(e,null);
  },
  'dprev':function(){UI.vd=addDays(viewDate(),-1);render()},
  'dnext':function(){UI.vd=addDays(viewDate(),1);render()},

  /* 설정·여행 */
  'undo':function(){var uf=UI.undoFn;UI.undoFn=null;document.getElementById('toast').innerHTML='';clearTimeout(UI.toastT);if(uf)uf()},
  'key-save':function(){
    var k=(document.getElementById('k_in').value||'').trim();if(!k){toast('키를 입력해 주세요');return}
    cfg.key=k;lset('cfg',cfg);UI.sheet=null;UI.keyBad=false;
    loadTrips().then(function(){loadTrip();return pull(true)}).then(function(){render();toast(M?'불러왔어요':'데이터를 찾지 못했어요')});
  },
  'trip-open':function(el,v,id){cfg.tripId=id;lset('cfg',cfg);UI.sheet=null;loadTrip();render();pull(true)},
  'trip-save':function(){
    var t=trip(),ttl=(document.getElementById('te_title').value||'').trim(),st=document.getElementById('te_start').value,en=document.getElementById('te_end').value;
    if(!ttl){toast('여행명을 입력해 주세요');return}
    if(!st||!en||en<st){toast('기간을 확인해 주세요');return}
    t.title=ttl;t.start=st;t.end=en;t.status=document.getElementById('te_status').value;
    Array.prototype.forEach.call(document.querySelectorAll('.te_city'),function(ci){var c=t.cities[+ci.getAttribute('data-i')],nm=(ci.value||'').trim();if(c&&nm)c.name=nm});
    tiUp('trip',M.trip);
    TRIPS=TRIPS.map(function(r){return r.trip_id===cfg.tripId?{trip_id:r.trip_id,data:t}:r});lset('trips',TRIPS);
    UI.vd=null;UI.sched=null;UI.sheet='trips';render();toast('저장했어요');
  },
  'mirror-all':function(){var n=M?mirrorAll():0;syncPayMemos();toast(n?'완료한 일정 '+n+'건을 이이코토로 보냈어요':'보낼 완료 일정이 없어요')},
  'album':function(){UI.album={city:'all',date:'all',v:-1};albPush();renderAlbum(true)},
  'albclose':function(){albBack()},
  'albcity':function(el,v){UI.album.city=v;UI.album.date='all';renderAlbum(true)},
  'albdate':function(el,v){UI.album.date=v;renderAlbum(true)},
  'albopen':function(el){albumView(+el.getAttribute('data-i'))},
  'albvclose':function(){albBack()},
  'export':function(){doExport()}
};
var DRAFT_ACT={evslot:1,evmap:1,expcat:1,expcur:1};  // 이 동작 뒤에는 작성 중인 시트 내용을 기기에 임시 저장
function onClick(e){
  var mc=e.target.closest&&e.target.closest('[data-mapcheck]');
  if(mc){
    var isSp=mc.getAttribute('data-mapcheck')==='sp';
    var q0=isSp?((document.getElementById('sp_map').value||'').trim()||(document.getElementById('sp_name').value||'').trim()):((document.getElementById('ev_map').value||'').trim()||(document.getElementById('ev_title').value||'').trim());
    if(!q0){e.preventDefault();toast('제목이나 검색어를 먼저 입력해 주세요');return}
    if(!isSp)persistDraft();mc.href=mapUrl(q0);return;
  }
  var el=e.target.closest('[data-act]');if(!el)return;
  var a=el.getAttribute('data-act');
  if(a==='sheet-bg'){if(e.target===el)closeSheet();return}   // 시트·모달 바깥 배경을 눌렀을 때만 닫는다
  if(a==='pk-bg'){if(e.target===el)closePicker();return}
  if(a==='albvbg'){if(e.target===el)albBack();return}   // 뷰어 바깥 어두운 곳을 눌렀을 때만 닫는다
  var h=ACT[a];if(!h)return;
  h(el,el.getAttribute('data-v'),el.getAttribute('data-id'));
  if(DRAFT_ACT[a])persistDraft();
}
function onChange(e){
  var el=e.target;
  if(el.id==='x_date'&&UI.expDraft){UI.expDraft.date=el.value;refreshXSug();persistDraft();return}
  if(el.id==='ev_date'&&UI.evDraft){UI.evDraft.date=el.value;refreshSug();persistDraft();return}
  if(el.matches&&el.matches('input[data-act="ck"]'))return onClick({target:el});
  if(el.id==='imp'){doImport(el.files&&el.files[0]);return}
  if(el.hasAttribute('data-cust')){
    var p=el.getAttribute('data-cust').split('|'),ch=M.choices[p[0]+'|'+p[1]];
    if(ch){ch.d.text=el.value;tiUp('choice',ch)}return;
  }
  if(el.hasAttribute('data-evtime')){
    if(el.value&&UI.evDraft){var sl=timeToSlot(el.value);UI.evDraft.slot=sl;setPick('evslot',sl)}
    return;
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
    if(el.hasAttribute&&el.hasAttribute('data-add')){e.preventDefault();addPrompt(el.getAttribute('data-add'),el.value)}
    else if(el.classList&&el.classList.contains('edit')){e.preventDefault();commitEdit(el.getAttribute('data-id'),el.value)}
  }else if(e.key==='Escape'&&el.classList&&el.classList.contains('edit')){UI.edit=null;render()}
}
var BLURSKIP=false,EDITTAP=0;
/* 수정 중 같은 수정 영역(칩·알림 줄·확인)을 누르면 입력창 포커스가 먼저 빠지는데, 이때 수정 상태를 닫아 버리면 누른 버튼이 사라져 동작하지 않는다 → 그 직후의 포커스 이탈은 무시 */
function markEditTap(e){var t=e.target;EDITTAP=(t&&t.closest&&t.closest('.ckedit')&&!t.closest('input'))?Date.now():0}
function onBlur(e){if(BLURSKIP||Date.now()-EDITTAP<900)return;var el=e.target;if(el.classList&&el.classList.contains('edit'))commitEdit(el.getAttribute('data-id'),el.value)}

/* ---------- backup ---------- */
function doExport(){
  if(!M){toast('내보낼 데이터가 없어요');return}
  var data={format:'iitabi-backup',version:1,exportedAt:new Date().toISOString(),trip_id:cfg.tripId,rows:modelRows(),checklist:CL.items,memos_note:'memos는 iikoto 원본이라 포함하지 않아요'};
  var txt=JSON.stringify(data,null,1),name='iitabi-'+cfg.tripId+'-'+today()+'.json';
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
      if(j.format!=='iitabi-backup'||!j.rows||!j.trip_id)throw new Error('형식이 달라요');
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
  document.addEventListener('click',onClick);
  // 이미지 load/error는 버블링하지 않아 캡처로 받는다(썸네일 페이드인)
  document.addEventListener('load',onThumb,true);document.addEventListener('error',onThumb,true);
  document.addEventListener('change',onChange);
  document.addEventListener('keydown',onKey);
  var scr=document.getElementById('screen');scr.addEventListener('touchstart',onTabTouchStart,{passive:true});scr.addEventListener('touchend',onTabTouchEnd,{passive:true});
  var av=document.getElementById('albview');av.addEventListener('touchstart',onAvStart,{passive:true});av.addEventListener('touchend',onAvEnd,{passive:true});
  var ab=document.getElementById('album');ab.addEventListener('touchstart',onEdgeStart,{passive:true});ab.addEventListener('touchend',onEdgeEnd,{passive:true});
  document.addEventListener('touchstart',onTouchStart,{passive:true});
  document.addEventListener('touchend',onTouchEnd,{passive:true});
  document.addEventListener('input',function(e){var el=e.target;if(el&&el.hasAttribute&&el.hasAttribute('data-add'))UI.addTxt[el.getAttribute('data-add')]=el.value;if(el&&el.id==='x_amt')updateExpLine();if(el&&el.id==='ev_title'&&UI.evDraft){UI.evDraft.title=el.value;refreshSug()}if(el&&el.id==='x_name'&&UI.expDraft){UI.expDraft.name=el.value;refreshXSug()}if(el&&el.id&&(el.id.indexOf('ev_')===0||el.id.indexOf('x_')===0))persistDraft()});
  document.addEventListener('focusout',onBlur);
  document.addEventListener('touchstart',markEditTap,{passive:true,capture:true});document.addEventListener('mousedown',markEditTap,true);
  loadTrip();
  render();
  restoreDraft();
  syncPayMemos();
  window.addEventListener('pageshow',function(e){if(e.persisted)location.reload()});  // 이이코토 등 다른 페이지에서 뒤로 돌아오면(캐시 복원) 하단바가 내려가 보이는 문제 — 완전히 새로 불러온다(전송 대기 중인 작업은 기기에 저장돼 있어 유지됨)
  if(!cfg.key){UI.sheet='key';render()}
  else{
    loadTrips().then(function(){if(!M)loadTrip();render();return pull(true)});
  }
  document.addEventListener('visibilitychange',function(){if(!document.hidden){pull();locateCity();syncPayMemos()}});
  locateCity();
  window.addEventListener('online',function(){pull(true)});
  window.addEventListener('resize',fitMemoList);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitMemoList);
  setInterval(function(){if(!document.hidden)pull()},90000);
  if('serviceWorker' in navigator&&/\/iitabi\//.test(location.pathname)){
    navigator.serviceWorker.register('iitabi-sw.js?v='+VER,{scope:'./'}).catch(function(){});
  }
}
window.__iitabi={periodOf:periodOf,pull:pull,flush:flush,state:function(){return {UI:UI,M:M,CL:CL,Q:Q,cfg:cfg}},render:render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
