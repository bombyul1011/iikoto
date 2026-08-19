// ══════════════════════════════════════════════════════════
// iikoto 태블릿(iPad mini 가로) 전용 읽기 전용 대시보드
// - 입력 기능 없음. iikoto 본 Supabase 프로젝트를 그대로 읽기만 함.
// - 유지보수: 주요 기능 변경 시 수동으로 반영(자동 동기화 없음)
// ══════════════════════════════════════════════════════════

const SUPA_URL='https://vqvpzrxmtpryzhontlxc.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdnB6cnhtdHByeXpob250bHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNTgxMjksImV4cCI6MjA5NjYzNDEyOX0.pbtq1UMPC7ylYM1H2xVa19C1TFlceLmEfEtkz3WK2VI';
const CHAEUM_SUPA_URL='https://sqeyoqpchiljvinuqxjf.supabase.co';
const CHAEUM_SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZXlvcXBjaGlsanZpbnVxeGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5ODY5NTksImV4cCI6MjEwMjU2Mjk1OX0.H_JNNYz7_eguAqds-Wm6cwK926U74aVPaS_XwGRKeB0';

async function supaFetch(path){
  try{
    const res=await fetch(SUPA_URL+'/rest/v1/'+path,{headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}});
    if(!res.ok)return null;
    return await res.json();
  }catch(e){return null;}
}
// TODO: 채움로그 연동 미착수 — 오늘탭 카드 추가는 별도 작업으로 진행 예정
async function chaeumFetch(path){
  try{
    const res=await fetch(CHAEUM_SUPA_URL+'/rest/v1/'+path,{headers:{'apikey':CHAEUM_SUPA_KEY,'Authorization':'Bearer '+CHAEUM_SUPA_KEY}});
    if(!res.ok)return null;
    return await res.json();
  }catch(e){return null;}
}

// ── 날짜 유틸 (iikoto와 동일 규칙) ──
function pad(n){return String(n).padStart(2,'0');}
function dateKey(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function weekKeyOf(d){const m=new Date(d);m.setDate(d.getDate()-((d.getDay()+6)%7));return dateKey(m);}
function monthKeyOf(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;}
const DOW=['일','월','화','수','목','금','토'];
function escapeHtml(s){const d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML;}

// ── 리듬 카테고리 (RHYTHM_CATS 원본과 동일) ──
const RHYTHM_CATS={
  exercise:{label:'운동',color:'var(--rh-exercise)',icon:'ti-run'},
  rest:{label:'휴식',color:'var(--rh-rest)',icon:'ti-armchair'},
  groom:{label:'단장',color:'var(--rh-groom)',icon:'ti-mood-spark'},
  work:{label:'업무',color:'var(--rh-work)',icon:'ti-keyboard'},
  appointment:{label:'외출',color:'var(--rh-appointment)',icon:'ti-bus'},
  note:{label:'책상',color:'var(--rh-note)',icon:'ti-desk'},
  enjoy:{label:'감상',color:'var(--rh-enjoy)',icon:'ti-stack-2'},
  home:{label:'정리',color:'var(--rh-home)',icon:'ti-home'}
};
const CAT_ICON_META={
  drama:{icon:'ti-device-tv',bg:'rgba(var(--pal-pink-rgb),1)',label:'드라마'},
  book:{icon:'ti-book',bg:'rgba(var(--pal-yellow-rgb),1)',label:'책'},
  movie:{icon:'ti-movie',bg:'rgba(var(--pal-sky-rgb),1)',label:'영화'},
  music:{icon:'ti-music',bg:'rgba(var(--pal-lime-rgb),1)',label:'음악'}
};

// ── 상태 ──
let _selectedDate=new Date();
let _currentTab='today';
let _rdCalDate=new Date();

// ══════════════════════════════════════════════════════════
// 탭 전환
// ══════════════════════════════════════════════════════════
function switchTab(tab){
  _currentTab=tab;
  document.querySelectorAll('.main-body').forEach(el=>el.classList.remove('on'));
  document.querySelectorAll('.float-tab').forEach(el=>el.classList.remove('on'));
  document.getElementById('tab-'+tab).classList.add('on');
  document.getElementById('ft-'+tab).classList.add('on');
  closeFloatMenu();
  if(tab==='today')loadTodayTab();
  else if(tab==='week')loadWeekTab();
  else if(tab==='month')loadMonthTab();
}

// ══════════════════════════════════════════════════════════
// 좌하단 → 우하단 플로팅 원형 버튼 + 탭 메뉴
// ══════════════════════════════════════════════════════════
let _floatMenuOpen=false;
function toggleFloatMenu(){
  _floatMenuOpen=!_floatMenuOpen;
  document.getElementById('float-tab-menu').classList.toggle('on',_floatMenuOpen);
  document.getElementById('float-fab').classList.toggle('open',_floatMenuOpen);
  document.getElementById('float-fab-icon').className=_floatMenuOpen?'ti ti-x':'ti ti-menu-2';
}
function closeFloatMenu(){
  _floatMenuOpen=false;
  document.getElementById('float-tab-menu').classList.remove('on');
  document.getElementById('float-fab').classList.remove('open');
  document.getElementById('float-fab-icon').className='ti ti-menu-2';
}

// ══════════════════════════════════════════════════════════
// 좌측 사이드 (미니 캘린더 + 주간요약)
// ══════════════════════════════════════════════════════════
let _sideCalDate=new Date();
async function renderMiniCal(){
  const el=document.getElementById('mini-cal');
  const y=_sideCalDate.getFullYear(),m=_sideCalDate.getMonth();
  const first=new Date(y,m,1);
  const startWeekday=first.getDay();
  const daysInMonth=new Date(y,m+1,0).getDate();
  const todayDk=dateKey(new Date());
  const selDk=dateKey(_selectedDate);
  const mk=monthKeyOf(_sideCalDate);
  // 기록 있는 날 점 표시용 — 투두/메모 존재 여부만 가볍게 조회
  const [todos,memos]=await Promise.all([
    supaFetch(`todos?date_key=gte.${mk}-01&date_key=lte.${mk}-31&select=date_key`),
    supaFetch(`memos?date_key=gte.${mk}-01&date_key=lte.${mk}-31&select=date_key`)
  ]);
  const hasRecord=new Set();
  (todos||[]).forEach(t=>hasRecord.add(t.date_key));
  (memos||[]).forEach(t=>hasRecord.add(t.date_key));

  let html=`<div class="mini-cal-hdr"><i class="ti ti-chevron-left" onclick="sideCalShift(-1)" aria-hidden="true"></i><span>${y}년 ${m+1}월</span><i class="ti ti-chevron-right" onclick="sideCalShift(1)" aria-hidden="true"></i></div>
  <div class="mini-cal-grid">${DOW.map(d=>`<div class="dow">${d}</div>`).join('')}`;
  for(let i=0;i<startWeekday;i++)html+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dk=`${y}-${pad(m+1)}-${pad(d)}`;
    let cls='mini-cal-day';
    if(dk===todayDk)cls+=' today';
    if(dk===selDk)cls+=' sel';
    if(hasRecord.has(dk))cls+=' has-dot';
    html+=`<div class="${cls}" onclick="selectDate('${dk}')">${d}</div>`;
  }
  html+='</div>';
  el.innerHTML=html;
}
function sideCalShift(delta){
  _sideCalDate.setMonth(_sideCalDate.getMonth()+delta);
  renderMiniCal();
}
function selectDate(dk){
  _selectedDate=new Date(dk+'T00:00:00');
  renderMiniCal();
  renderSideStats();
  if(_currentTab==='today')loadTodayTab();
  else if(_currentTab==='week')loadWeekTab();
  else if(_currentTab==='month')loadMonthTab();
}

async function renderSideStats(){
  const el=document.getElementById('side-stats');
  const wk=weekKeyOf(_selectedDate);
  const weekDates=[];
  const monday=new Date(wk+'T00:00:00');
  for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);weekDates.push(dateKey(d));}
  const startDk=weekDates[0],endDk=weekDates[6];

  const weekStartMs=monday.getTime();
  const weekEndMs=weekStartMs+7*24*60*60*1000-1;
  const [sleepRows,habitRows,quoteRows]=await Promise.all([
    supaFetch(`sleep?date_key=gte.${startDk}&date_key=lte.${endDk}&select=score`),
    supaFetch(`habit_checks?date_key=gte.${startDk}&date_key=lte.${endDk}&select=id`),
    supaFetch(`reading_quotes?created=gte.${weekStartMs}&created=lte.${weekEndMs}&select=id`)
  ]);
  const scores=(sleepRows||[]).map(r=>r.score).filter(s=>s!=null);
  const avgSleep=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
  const quoteCount=(quoteRows||[]).length;

  el.innerHTML=`
    <div class="side-stat"><i class="ti ti-moon-stars" style="color:rgba(var(--pal-sky-rgb),1);" aria-hidden="true"></i><div><div class="side-stat-val">${avgSleep!=null?avgSleep+'점':'-'}</div><div class="side-stat-txt">평균 수면 점수</div></div></div>
    <div class="side-stat"><i class="ti ti-flame" style="color:rgba(var(--pal-orange-rgb),1);" aria-hidden="true"></i><div><div class="side-stat-val">${(habitRows||[]).length}회</div><div class="side-stat-txt">이번 주 습관 체크</div></div></div>
    <div class="side-stat"><i class="ti ti-books" style="color:rgba(var(--pal-lavender-rgb),1);" aria-hidden="true"></i><div><div class="side-stat-val">${quoteCount}개</div><div class="side-stat-txt">이번 주 수집한 문장</div></div></div>
  `;
}

// ══════════════════════════════════════════════════════════
// 오늘탭
// ══════════════════════════════════════════════════════════
async function loadTodayTab(){
  const dk=dateKey(_selectedDate);
  document.getElementById('today-date').textContent=`${_selectedDate.getMonth()+1}월 ${_selectedDate.getDate()}일`;
  document.getElementById('today-dow').textContent=DOW[_selectedDate.getDay()]+'요일';

  // 수면 7일 스파크라인용 날짜 범위(오늘 포함 최근 7일)
  const sparkStart=new Date(_selectedDate);sparkStart.setDate(sparkStart.getDate()-6);
  const sparkStartDk=dateKey(sparkStart);

  const [todos,sleepRows,sleepWeekRows,habits,habitChecks,meals,contents,books,rblocks]=await Promise.all([
    supaFetch(`todos?date_key=eq.${dk}&order=sort_order.asc.nullslast`),
    supaFetch(`sleep?date_key=eq.${dk}`),
    supaFetch(`sleep?date_key=gte.${sparkStartDk}&date_key=lte.${dk}&select=date_key,score`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=eq.${dk}`),
    supaFetch(`meals?date_key=eq.${dk}`),
    supaFetch(`contents?status=eq.watching&order=created.desc&limit=6`),
    supaFetch(`reading_books?status=eq.reading&limit=1`),
    supaFetch(`rhythm_blocks?date_key=eq.${dk}&order=start_time.asc`)
  ]);

  renderTodayTodosEvents(todos||[]);
  renderTodayMemos(dk);
  renderTodaySleep(dk,sleepRows&&sleepRows[0],sleepWeekRows||[]);
  renderTodayHabits(habits||[],habitChecks||[],dk);
  renderTodayMeals(meals&&meals[0]);
  renderTodayContents(contents||[]);
  _todayRhythmBlocks=rblocks||[];
  renderTodayRhythm(rblocks||[]);
  renderTodayReading(books&&books[0]);
  renderReportBanner('today-report-banner',_selectedDate);
}

function renderTodayTodosEvents(todos){
  const plainTodos=todos.filter(t=>!t.is_event);
  const events=todos.filter(t=>t.is_event);
  const todoEl=document.getElementById('today-todos');
  todoEl.innerHTML=plainTodos.length?plainTodos.slice(0,8).map(t=>
    `<div class="todo-row${t.done?' done':''}"><div class="chk"></div>${escapeHtml(t.text)}</div>`
  ).join(''):'<div class="empty-msg">오늘 할 일이 없어요</div>';

  const nowMin=new Date().getHours()*60+new Date().getMinutes();
  const isToday=dateKey(_selectedDate)===dateKey(new Date());
  const evEl=document.getElementById('today-events');
  const sorted=events.slice().sort((a,b)=>(a.event_time||'99:99').localeCompare(b.event_time||'99:99'));
  evEl.innerHTML=sorted.length?sorted.map(e=>{
    let isPast=false;
    if(isToday&&e.event_time){
      const m=e.event_time.match(/^(\d{1,2}):(\d{2})/);
      if(m){const evMin=parseInt(m[1],10)*60+parseInt(m[2],10);isPast=nowMin>=evMin+60;}
    }
    return `<div class="event-row${isPast?' past':''}"><span class="event-time">${e.event_time||''}</span>${escapeHtml(e.text)}</div>`;
  }).join(''):'<div class="empty-msg">오늘 일정이 없어요</div>';
}

async function renderTodayMemos(dk){
  const el=document.getElementById('today-memos');
  const memos=await supaFetch(`memos?date_key=eq.${dk}&order=memo_time.asc`);
  if(!memos||!memos.length){el.innerHTML='<div class="empty-msg">오늘 남긴 메모가 없어요</div>';return;}
  el.innerHTML=memos.map(m=>
    `<div class="memo-item"><div class="memo-time">${m.memo_time||''}</div><div class="memo-txt">${escapeHtml(m.text)}</div></div>`
  ).join('');
}

function renderTodaySleep(dk,sleep,weekRows){
  const scoreEl=document.getElementById('today-sleep-score');
  const el=document.getElementById('today-sleep');
  let durText='';
  if(sleep&&sleep.sleep_time&&sleep.wake_time){
    const sv=sleep.sleep_time.split(':').map(Number),wv=sleep.wake_time.split(':').map(Number);
    let mins=(wv[0]*60+wv[1])-(sv[0]*60+sv[1]);if(mins<0)mins+=1440;
    durText=Math.floor(mins/60)+'h '+(mins%60)+'m';
  }
  scoreEl.innerHTML=(sleep&&sleep.score!=null)
    ?`<div class="sleep-score">${sleep.score}<span style="font-size:12px;color:var(--tm);"> 점</span></div>${durText?`<div class="sleep-score-lbl">${durText}</div>`:''}`
    :`<div class="sleep-score-lbl">기록 없음</div>`;

  // 최근 7일 스코어 맵
  const scoreByDk={};
  (weekRows||[]).forEach(r=>{if(r.score!=null)scoreByDk[r.date_key]=r.score;});
  const days=[];
  const base=new Date(dk+'T00:00:00');
  for(let i=6;i>=0;i--){const d=new Date(base);d.setDate(base.getDate()-i);days.push(dateKey(d));}
  const maxScore=100;
  const sparkCols=days.map(dayDk=>{
    const sc=scoreByDk[dayDk];
    const hPct=sc!=null?Math.max(8,Math.round(sc/maxScore*100)):4;
    const isToday=dayDk===dk;
    const dow=DOW[new Date(dayDk+'T00:00:00').getDay()];
    return `<div class="sleep-spark-col"><div class="sleep-spark-bar-wrap"><div class="sleep-spark-bar${isToday?' today':''}" style="height:${hPct}%;" title="${sc!=null?sc+'점':'기록없음'}"></div></div><div class="sleep-spark-dow">${dow}</div></div>`;
  }).join('');

  el.innerHTML=`<div class="sleep-spark">${sparkCols}</div>`;
}

function renderTodayHabits(habits,checks,dk){
  const lblEl=document.getElementById('today-habit-lbl');
  const checkedNames=new Set(checks.map(c=>c.habit_name));
  const doneCount=habits.filter(h=>checkedNames.has(h.name)).length;
  lblEl.innerHTML=`<i class="ti ti-target-arrow" style="color:rgba(var(--pal-mint-rgb),1);" aria-hidden="true"></i>습관 · ${doneCount}/${habits.length}`;
  const el=document.getElementById('today-habits');
  if(!habits.length){el.innerHTML='<div class="empty-msg">등록된 습관 없음</div>';return;}
  const colorMap={mint:'var(--pal-mint-rgb)',pink:'var(--pal-pink-rgb)',sky:'var(--pal-sky-rgb)',yellow:'var(--pal-yellow-rgb)'};
  el.innerHTML=`<div class="habit-grid">${habits.map(h=>{
    const done=checkedNames.has(h.name);
    const c=colorMap[h.color]||'var(--pal-warmgray-rgb)';
    return `<div class="habit-row${done?' done':''}"><div class="habit-dot" style="background:rgba(${c},${done?1:0.35});"></div>${escapeHtml(h.name)}${done?'<i class="ti ti-check habit-check" aria-hidden="true"></i>':''}</div>`;
  }).join('')}</div>`;
}

const MEAL_KEYS=['breakfast','lunch','snack','dinner'];
const MEAL_LABELS={breakfast:'아침',lunch:'점심',snack:'간식',dinner:'저녁'};
function renderTodayMeals(meal){
  const el=document.getElementById('today-meals');
  // 4끼 자리를 항상 고정으로 잡아두고(2x2), 기록 없는 끼니는 흐리게 표시
  const html=MEAL_KEYS.map(k=>{
    const menu=meal&&meal[k];
    const t=meal&&meal[k+'_time'];
    if(!menu){
      return `<div class="meal-slot empty"><span class="meal-label">${MEAL_LABELS[k]}</span><div class="meal-menu" style="color:var(--tm);">기록 없음</div></div>`;
    }
    return `<div class="meal-slot">${t?`<span class="meal-time">${t}</span>`:''}<span class="meal-label">${MEAL_LABELS[k]}</span><div class="meal-menu">${escapeHtml(menu)}</div></div>`;
  }).join('');
  el.innerHTML=`<div class="meal-grid">${html}</div>`;
}

function renderTodayContents(items){
  const el=document.getElementById('today-contents');
  if(!items.length){el.innerHTML='<div class="empty-msg">감상 중인 콘텐츠 없음</div>';return;}
  el.innerHTML=items.slice(0,4).map(c=>{
    const meta=CAT_ICON_META[c.content_cat]||{label:c.content_cat};
    return `<div class="content-row"><span class="content-cat">${meta.label||''}</span>${escapeHtml(c.title)}</div>`;
  }).join('');
}

function renderTodayRhythm(blocks){
  const el=document.getElementById('today-rhythm');
  if(!blocks.length){el.innerHTML='<div class="empty-msg">오늘 기록된 리듬이 없어요</div>';return;}
  // 분 단위 총합으로 비율 계산
  const durations={};
  let total=0;
  blocks.forEach(b=>{
    if(!b.start_time||!b.end_time)return;
    const sv=b.start_time.split(':').map(Number),ev=b.end_time.split(':').map(Number);
    let mins=(ev[0]*60+ev[1])-(sv[0]*60+sv[1]);if(mins<0)mins+=1440;
    durations[b.cat]=(durations[b.cat]||0)+mins;total+=mins;
  });
  if(!total){el.innerHTML='<div class="empty-msg">오늘 기록된 리듬이 없어요</div>';return;}
  const cats=Object.keys(durations);
  const barHtml=cats.map(cat=>{
    const c=RHYTHM_CATS[cat];if(!c)return'';
    const pct=(durations[cat]/total*100).toFixed(1);
    return `<div style="flex:${durations[cat]};background:${c.color};"></div>`;
  }).join('');
  const legendHtml=cats.map(cat=>{
    const c=RHYTHM_CATS[cat];if(!c)return'';
    return `<span><i class="ti ti-square-filled" style="color:${c.color};" aria-hidden="true"></i>${c.label}</span>`;
  }).join('');
  el.innerHTML=`<div class="rhythm-mini">${barHtml}</div><div class="rhythm-legend">${legendHtml}</div>`;
}

// ── 오늘의 리듬 클릭 → 시간순 흐름 텍스트 팝업(주간탭 리듬 모아보기 흐름보기와 동일 포맷) ──
let _todayRhythmBlocks=[];
function toHHMM(t){
  if(!t)return'';
  const m=t.match(/^(\d{1,2}):(\d{2})/);
  return m?m[0]:t;
}
function openTodayRhythmFlow(){
  const dk=dateKey(_selectedDate);
  const label=`${_selectedDate.getMonth()+1}월 ${_selectedDate.getDate()}일 리듬 흐름`;
  document.getElementById('report-panel-title').innerHTML=`<i class="ti ti-activity" aria-hidden="true"></i>${label}`;
  const bodyEl=document.getElementById('report-panel-body');
  const blocks=(_todayRhythmBlocks||[]).slice().sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||''));
  if(!blocks.length){
    bodyEl.innerHTML='<div class="wrb-flow-empty">이날은 기록된 리듬이 없어요</div>';
  }else{
    bodyEl.innerHTML='<div class="wrb-flow-list">'+blocks.map(b=>{
      const cat=RHYTHM_CATS[b.cat];
      const color=cat?cat.color:'var(--tm)';
      const label=(cat?cat.label:b.cat)+(b.text?' · '+escapeHtml(b.text):'');
      const timeRange=b.end_time?`${toHHMM(b.start_time)}~${toHHMM(b.end_time)}`:`${toHHMM(b.start_time)}~진행중`;
      return `<div class="wrb-flow-row"><span class="wrb-flow-dot" style="background:${color};"></span><span class="wrb-flow-time">${timeRange}</span><span class="wrb-flow-label">${label}</span></div>`;
    }).join('')+'</div>';
  }
  document.getElementById('report-overlay').classList.add('on');
}

function renderTodayReading(book){
  const el=document.getElementById('today-reading');
  if(!book){el.innerHTML='<div class="empty-msg" style="text-align:left;">지금 읽는 책이 없어요</div>';return;}
  let pct=0;
  if(book.unit==='percent')pct=book.percent||0;
  else if(book.total_pages)pct=Math.min(100,Math.round((book.pages/book.total_pages)*100));
  const coverStyle=book.poster?`background-image:url('${book.poster}');`:'';
  el.innerHTML=`<div class="rd-cur-book">
    <div class="rd-cur-cover" style="${coverStyle}"></div>
    <div><div class="rd-cur-title">${escapeHtml(book.title)}</div><div class="rd-cur-author">${escapeHtml(book.author||'')}</div><div class="rd-cur-pct">${pct}% 진행 중</div></div>
  </div>`;
}

// ── 리포트 배너 (주/월 캐시가 있으면 노출) ──
async function renderReportBanner(elId,forDate){
  const el=document.getElementById(elId);
  if(!el)return;
  const wk=weekKeyOf(forDate);
  const mk=monthKeyOf(forDate);
  const [weeklyRows,monthlyRows]=await Promise.all([
    supaFetch(`ai_cache?cache_key=eq.weekly_summary_${wk}&select=cache_key`),
    supaFetch(`ai_cache?cache_key=eq.monthly_report_${mk}&select=cache_key`)
  ]);
  if(weeklyRows&&weeklyRows.length){
    el.classList.add('on');
    el.innerHTML=`<div class="report-banner-inner"><i class="ti ti-sparkles" aria-hidden="true"></i>이번 주 리포트가 준비됐어요<i class="ti ti-chevron-right" aria-hidden="true"></i></div>`;
    el.onclick=()=>openReportPanel('weekly_summary_'+wk,'이번 주 리포트');
  }else if(monthlyRows&&monthlyRows.length){
    el.classList.add('on');
    el.innerHTML=`<div class="report-banner-inner"><i class="ti ti-sparkles" aria-hidden="true"></i>이번 달 리포트가 준비됐어요<i class="ti ti-chevron-right" aria-hidden="true"></i></div>`;
    el.onclick=()=>openReportPanel('monthly_report_'+mk,'이번 달 리포트');
  }else{
    el.classList.remove('on');
    el.onclick=null;
  }
}
async function openReportPanel(cacheKey,title){
  document.getElementById('report-panel-title').innerHTML=`<i class="ti ti-sparkles" aria-hidden="true"></i>${title}`;
  const bodyEl=document.getElementById('report-panel-body');
  bodyEl.innerHTML='<div class="loading-msg">불러오는 중...</div>';
  document.getElementById('report-overlay').classList.add('on');
  const rows=await supaFetch(`ai_cache?cache_key=eq.${cacheKey}&select=content`);
  const content=rows&&rows[0]&&rows[0].content;
  bodyEl.innerHTML=content?content:'<div class="empty-msg">내용을 불러오지 못했어요</div>';
}
function closeReportPanel(){
  document.getElementById('report-overlay').classList.remove('on');
}
// ══════════════════════════════════════════════════════════
// 주간탭
// ══════════════════════════════════════════════════════════
const WC_COLORS_RGB=['var(--pal-pink-rgb)','var(--pal-orange-rgb)','var(--pal-yellow-rgb)','var(--pal-mint-rgb)','var(--pal-sky-rgb)','var(--pal-lavender-rgb)','var(--pal-rose-rgb)'];
const WC_COLORS_TXT=['var(--pal-pink-text)','var(--pal-orange-text)','var(--pal-yellow-text)','var(--pal-mint-text)','var(--pal-sky-text)','var(--pal-lavender-text)','var(--pal-rose-text)'];
const WC_DOW=['월','화','수','목','금','토','일'];

function getWeekDates(baseDate){
  const wk=weekKeyOf(baseDate);
  const monday=new Date(wk+'T00:00:00');
  const arr=[];
  for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);arr.push(dateKey(d));}
  return arr;
}

async function loadWeekTab(){
  const weekDates=getWeekDates(_selectedDate);
  const wk='week:'+weekDates[0];
  const startDk=weekDates[0],endDk=weekDates[6];
  document.getElementById('week-range').textContent=`${weekDates[0].slice(5).replace('-','.')} - ${weekDates[6].slice(5).replace('-','.')}`;

  const [goalRows,habits,habitChecks,memos,todos,sleepRows,onelineRows,books]=await Promise.all([
    supaFetch(`goal_notes?note_key=eq.wchallenge_${encodeURIComponent(wk)}`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    supaFetch(`memos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=id`),
    supaFetch(`todos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=done`),
    supaFetch(`sleep?date_key=gte.${startDk}&date_key=lte.${endDk}&select=score`),
    supaFetch(`goal_notes?note_key=gte.oneline:${startDk}&note_key=lte.oneline:${endDk}`),
    supaFetch(`reading_books?status=eq.reading&limit=1`)
  ]);

  renderWeekGoals(goalRows&&goalRows[0]);
  renderWeekHabitMatrix(habits||[],habitChecks||[],weekDates);
  await renderWeekReading(books&&books[0],startDk,endDk);
  renderWeekStatBar(memos||[],todos||[],sleepRows||[],habits||[],habitChecks||[]);
  renderWeekOneline(onelineRows||[],weekDates);
  renderReportBanner('week-report-banner',_selectedDate);
}

function renderWeekGoals(row){
  const el=document.getElementById('week-goals');
  const lines=(row&&Array.isArray(row.lines))?row.lines.filter(l=>l&&l.text&&l.text.trim()):[];
  if(!lines.length){el.innerHTML='<div class="empty-msg">등록된 목표가 없어요</div>';return;}
  el.innerHTML=lines.map(item=>{
    const daysHtml=WC_DOW.map((d,i)=>{
      const on=item.days&&item.days[i];
      const style=on?`background:rgba(${WC_COLORS_RGB[i]},0.5);color:${WC_COLORS_TXT[i]};`:'';
      return `<div class="wgoal-day" style="${style}">${d}</div>`;
    }).join('');
    return `<div class="wgoal-item"><div class="wgoal-text">${escapeHtml(item.text)}</div><div class="wgoal-days">${daysHtml}</div></div>`;
  }).join('');
}

function renderWeekHabitMatrix(habits,checks,weekDates){
  const el=document.getElementById('week-habit-matrix');
  if(!habits.length){el.innerHTML='<div class="empty-msg">등록된 습관 없음</div>';return;}
  const colorMap={mint:'var(--pal-mint-rgb)',pink:'var(--pal-pink-rgb)',sky:'var(--pal-sky-rgb)',yellow:'var(--pal-yellow-rgb)'};
  let html=`<div class="habit-matrix"><div class="hdr"></div>${WC_DOW.map(d=>`<div class="hdr">${d}</div>`).join('')}`;
  habits.forEach(h=>{
    html+=`<div class="rowlbl">${escapeHtml(h.name)}</div>`;
    const c=colorMap[h.color]||'var(--pal-warmgray-rgb)';
    weekDates.forEach(dk=>{
      const done=checks.some(ch=>ch.habit_name===h.name&&ch.date_key===dk);
      html+=`<div class="dot" style="${done?`background:rgba(${c},1);`:''}"></div>`;
    });
  });
  html+='</div>';
  el.innerHTML=html;
}

async function renderWeekReading(book,startDk,endDk){
  const el=document.getElementById('week-reading');
  const logs=await supaFetch(`reading_daily_log?date_key=gte.${startDk}&date_key=lte.${endDk}&select=seconds`);
  const totalSec=(logs||[]).reduce((sum,l)=>sum+(l.seconds||0),0);
  const h=Math.floor(totalSec/3600),m=Math.floor((totalSec%3600)/60);
  const timeText=totalSec>0?`이번 주 독서 ${h}시간 ${m}분`:'이번 주 독서 기록 없음';
  if(!book){
    el.innerHTML=`<div class="rd-week-icon"><i class="ti ti-book" aria-hidden="true"></i></div><div><div class="rd-week-txt">읽는 중인 책 없음</div><div class="rd-week-sub">${timeText}</div></div>`;
    return;
  }
  let pct=0;
  if(book.unit==='percent')pct=book.percent||0;
  else if(book.total_pages)pct=Math.min(100,Math.round((book.pages/book.total_pages)*100));
  el.innerHTML=`<div class="rd-week-icon"><i class="ti ti-book" aria-hidden="true"></i></div><div><div class="rd-week-txt">${escapeHtml(book.title)} · ${pct}%</div><div class="rd-week-sub">${timeText}</div></div>`;
}

function renderWeekStatBar(memos,todos,sleepRows,habits,checks){
  const el=document.getElementById('week-stat-bar');
  const memoCount=memos.length;
  const doneCount=todos.filter(t=>t.done).length;
  const pct=habits.length?Math.round(checks.length/(habits.length*7)*100):0;
  el.innerHTML=`
    <div class="stat-bar-item"><i class="ti ti-notes" aria-hidden="true"></i><span class="stat-bar-num">${memoCount}</span></div>
    <div class="stat-bar-item"><i class="ti ti-checkbox" aria-hidden="true"></i><span class="stat-bar-num">${doneCount}</span></div>
    <div class="stat-bar-item"><i class="ti ti-chart-donut" aria-hidden="true"></i><span class="stat-bar-num">${pct}%</span></div>
  `;
}

function renderWeekOneline(rows,weekDates){
  const el=document.getElementById('week-oneline');
  const byDate={};
  rows.forEach(r=>{
    const dk=r.note_key.replace('oneline:','');
    const text=Array.isArray(r.lines)?(r.lines[0]||''):r.lines;
    if(text&&text.trim())byDate[dk]=text;
  });
  const entries=weekDates.map((dk,i)=>({dow:WC_DOW[i],text:byDate[dk]})).filter(e=>e.text);
  if(!entries.length){el.innerHTML='<div class="empty-msg">작성된 하루한줄이 없어요</div>';return;}
  el.innerHTML=entries.map(e=>`<div class="oneline-row"><div class="oneline-dow">${e.dow}</div>${escapeHtml(e.text)}</div>`).join('');
}

// ══════════════════════════════════════════════════════════
// 월간탭
// ══════════════════════════════════════════════════════════
let _monthCalDate=new Date();
async function loadMonthTab(){
  _monthCalDate=new Date(_selectedDate);
  const y=_monthCalDate.getFullYear(),mo=_monthCalDate.getMonth();
  document.getElementById('month-title').textContent=`${y}년 ${mo+1}월`;
  const mk=monthKeyOf(_monthCalDate);

  const [goalRows]=await Promise.all([
    supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('mgoal:'+mk)}`)
  ]);
  renderMonthGoals(goalRows&&goalRows[0]);
  await renderMonthTimetable(y,mo);
  await renderMonthHabits(y,mo);
  await renderMonthStatBar(y,mo);
  _rdCalDate=new Date(_monthCalDate);
  await renderReadingCal();
}

function renderMonthGoals(row){
  const el=document.getElementById('month-goals');
  const lines=(row&&Array.isArray(row.lines))?row.lines.filter(l=>l&&l.trim()):[];
  if(!lines.length){el.innerHTML='<div class="empty-msg">등록된 목표가 없어요</div>';return;}
  el.innerHTML=lines.map(l=>`<div class="mgoal-row">${escapeHtml(l)}</div>`).join('');
}

// ── 콘텐츠 타임라인 (실제 tt-row 간트 구조 재현) ──
function isContentCarryOverTablet(c,mk){
  if(c.content_cat==='music')return false;
  if(c.status==='watching')return true;
  if((c.status==='done'||c.status==='stopped')&&c.end_date&&c.end_date.slice(0,7)>=mk)return true;
  return false;
}
async function renderMonthTimetable(y,mo){
  const el=document.getElementById('month-tt');
  const mk=`${y}-${pad(mo+1)}`;
  const prevD=new Date(y,mo-1,1);
  const prevMk=monthKeyOf(prevD);
  const [curRows,prevRows]=await Promise.all([
    supaFetch(`contents?month_key=eq.${mk}`),
    supaFetch(`contents?month_key=eq.${prevMk}`)
  ]);
  const contents=curRows||[],prevContents=prevRows||[];
  const todayDay=new Date().getDate();
  const isSameMonth=mk===monthKeyOf(new Date());
  const daysInMonth=new Date(y,mo+1,0).getDate();
  const CATS=['drama','book','movie','music'];

  let headHtml='';
  for(let i=5;i<=Math.min(daysInMonth,29);i+=2)headHtml+=`<span>${i}</span>`;

  let rowsHtml='';
  CATS.forEach(cat=>{
    const items=contents.filter(c=>c.content_cat===cat);
    const carry=prevContents.filter(c=>c.content_cat===cat&&isContentCarryOverTablet(c,mk)).map(c=>({...c,_carried:true}));
    const all=[...carry,...items];
    const laid=all.map(item=>{
      const sStr=item.start_date||(mk+'-01');
      const eStr=item.end_date;
      const isWatching=item.status==='watching'&&cat!=='music';
      const startD=item._carried?1:Math.max(1,parseInt((sStr||'').slice(8,10),10)||1);
      let endD;
      if(isWatching&&!eStr){endD=isSameMonth?todayDay:daysInMonth;}
      else if(!eStr){endD=(cat!=='music'&&item.status==='watching')?(isSameMonth?todayDay:daysInMonth):startD;}
      else{const eMonth=eStr.slice(0,7);endD=eMonth===mk?Math.max(parseInt(eStr.slice(8,10),10)||startD,startD):daysInMonth;}
      endD=Math.min(Math.max(endD,startD),31);
      return {item,startD,endD};
    }).sort((a,b)=>a.startD-b.startD);

    let tracks;
    if(cat==='music'){tracks=[laid];}
    else{
      const trackEnds=[];tracks=[];
      laid.forEach(c=>{
        let placed=false;
        for(let i=0;i<trackEnds.length;i++){
          const prevItem=tracks[i][tracks[i].length-1].item;
          const prevDone=prevItem.status==='done'||prevItem.status==='stopped';
          const canFollow=prevDone?(c.startD>=trackEnds[i]):(c.startD>trackEnds[i]);
          if(canFollow){trackEnds[i]=c.endD;tracks[i].push(c);placed=true;break;}
        }
        if(!placed){trackEnds.push(c.endD);tracks.push([c]);}
      });
    }
    if(!tracks.length)tracks.push([]);
    const meta=CAT_ICON_META[cat];
    tracks.forEach((trackItems,tIdx)=>{
      const catLabel=tIdx===0?`<i class="dot" style="background:${meta.bg};"></i>${meta.label}`:'';
      let barsHtml='';
      trackItems.forEach(c=>{
        const leftPct=((c.startD-1)/daysInMonth*100).toFixed(1);
        const widthPct=Math.max(3,((c.endD-c.startD+1)/daysInMonth*100)).toFixed(1);
        const label=cat==='music'?(c.item.title||'').slice(0,1):escapeHtml(c.item.title||'');
        barsHtml+=`<div class="tt-bar" style="left:${leftPct}%;width:${widthPct}%;background:${meta.bg.replace('1)','0.6)')};">${label}</div>`;
      });
      rowsHtml+=`<div class="tt-row"><div class="tt-cat-fixed">${catLabel}</div><div class="tt-track">${barsHtml}</div></div>`;
    });
  });

  el.innerHTML=`<div class="tt-head-row"><div class="tt-cat-fixed-sp"></div><div class="tt-head-dates">${headHtml}</div></div>${rowsHtml}`;
}

async function renderMonthHabits(y,mo){
  const el=document.getElementById('month-habits');
  const mk=`${y}-${pad(mo+1)}`;
  const daysInMonth=new Date(y,mo+1,0).getDate();
  const [habits,checks]=await Promise.all([
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=gte.${mk}-01&date_key=lte.${mk}-31`)
  ]);
  if(!habits||!habits.length){el.innerHTML='<div class="empty-msg">등록된 습관 없음</div>';return;}
  const colorMap={mint:'var(--pal-mint-rgb)',pink:'var(--pal-pink-rgb)',sky:'var(--pal-sky-rgb)',yellow:'var(--pal-yellow-rgb)'};
  el.innerHTML=habits.map(h=>{
    const c=colorMap[h.color]||'var(--pal-warmgray-rgb)';
    let dotsHtml='';
    for(let d=1;d<=daysInMonth;d++){
      const dk=`${mk}-${pad(d)}`;
      const done=(checks||[]).some(ch=>ch.habit_name===h.name&&ch.date_key===dk);
      dotsHtml+=`<span style="${done?`background:rgba(${c},0.85);`:''}"></span>`;
    }
    return `<div class="habit-month-row"><div class="habit-month-lbl">${escapeHtml(h.name)}</div><div class="habit-month-dots">${dotsHtml}</div></div>`;
  }).join('');
}

async function renderMonthStatBar(y,mo){
  const el=document.getElementById('month-stat-bar');
  const mk=`${y}-${pad(mo+1)}`;
  const [memos,todos,sleepRows]=await Promise.all([
    supaFetch(`memos?date_key=gte.${mk}-01&date_key=lte.${mk}-31&select=id`),
    supaFetch(`todos?date_key=gte.${mk}-01&date_key=lte.${mk}-31&select=done`),
    supaFetch(`sleep?date_key=gte.${mk}-01&date_key=lte.${mk}-31&select=score`)
  ]);
  const memoCount=(memos||[]).length;
  const doneCount=(todos||[]).filter(t=>t.done).length;
  const scores=(sleepRows||[]).map(r=>r.score).filter(s=>s!=null);
  const avgScore=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
  el.innerHTML=`
    <div class="stat-bar-item"><i class="ti ti-notes" aria-hidden="true"></i><span class="stat-bar-num">${memoCount}</span></div>
    <div class="stat-bar-item"><i class="ti ti-checkbox" aria-hidden="true"></i><span class="stat-bar-num">${doneCount}</span></div>
    <div class="stat-bar-item"><i class="ti ti-moon-stars" aria-hidden="true"></i><span class="stat-bar-num">${avgScore!=null?avgScore+'점':'-'}</span></div>
  `;
}

// ── 독서 달력 (밀리의 서재 스타일, iikoto 원본 구조 그대로) ──
function rdCalShift(delta){
  _rdCalDate.setMonth(_rdCalDate.getMonth()+delta);
  renderReadingCal();
}
async function renderReadingCal(){
  const y=_rdCalDate.getFullYear(),m=_rdCalDate.getMonth();
  const mk=`${y}-${pad(m+1)}`;
  document.getElementById('rdcal-month').textContent=`${y}년 ${pad(m+1)}월`;
  const first=new Date(y,m,1);
  const startWeekday=first.getDay();
  const daysInMonth=new Date(y,m+1,0).getDate();
  const [logs,books]=await Promise.all([
    supaFetch(`reading_daily_log?date_key=gte.${mk}-01&date_key=lte.${mk}-31`),
    supaFetch(`reading_books?select=cid,title,poster`)
  ]);
  const bookMap={};(books||[]).forEach(b=>bookMap[b.cid]=b);
  const logsByDate={};
  (logs||[]).forEach(r=>{if(!logsByDate[r.date_key])logsByDate[r.date_key]=[];logsByDate[r.date_key].push(r);});
  const totalBooks=new Set();
  Object.values(logsByDate).forEach(list=>list.forEach(r=>totalBooks.add(r.book_cid)));

  document.getElementById('rdcal-count').innerHTML=`${totalBooks.size}<span>권</span>`;
  document.getElementById('rdcal-dows').innerHTML=DOW.map(d=>`<div class="rdcal-dow">${d}</div>`).join('');

  let gridHtml='';
  for(let i=0;i<startWeekday;i++)gridHtml+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dk=`${mk}-${pad(d)}`;
    const dayLogs=logsByDate[dk]||[];
    const cids=[...new Set(dayLogs.map(r=>r.book_cid))];
    if(cids.length){
      const cover=bookMap[cids[0]]&&bookMap[cids[0]].poster;
      const coverStyle=cover?`background-image:url('${cover}');`:'';
      gridHtml+=`<div class="rdcal-cover" style="${coverStyle}"></div>`;
    }else{
      gridHtml+=`<div class="rdcal-num">${d}</div>`;
    }
  }
  document.getElementById('rdcal-grid').innerHTML=gridHtml;
}


// ══════════════════════════════════════════════════════════
// 초기화
// ══════════════════════════════════════════════════════════
async function init(){
  await renderMiniCal();
  await renderSideStats();
  await loadTodayTab();
}
init();
