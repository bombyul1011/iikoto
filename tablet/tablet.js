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
// 채움로그(chaeumlog) — 별도 Supabase 프로젝트, 읽기 전용 연동
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
// 본앱과 동일한 논리적 하루(새벽 4시 컷) 정렬 기준. 00:00~03:59 기록은 전날 늦은 시간대로 보고 +1440분 밀어서 맨 뒤로 정렬.
const DAWN_CUTOFF_MIN=4*60;
function _dawnTimeToMin(t){if(!t)return null;const p=t.split(':');return parseInt(p[0],10)*60+parseInt(p[1],10);}
function toDawnAdjustedMin(min,cutoffMin){
  if(min==null)return null;
  const c=cutoffMin!=null?cutoffMin:DAWN_CUTOFF_MIN;
  return min<c?min+1440:min;
}
function toSortKey(t){
  if(!t)return 9999;
  const min=_dawnTimeToMin(t);
  if(min==null)return 9999;
  return toDawnAdjustedMin(min);
}
function weekKeyOf(d){const m=new Date(d);m.setDate(d.getDate()-((d.getDay()+6)%7));return dateKey(m);}
function monthKeyOf(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;}
const DOW=['일','월','화','수','목','금','토'];
const DOW_MON_START=['월','화','수','목','금','토','일']; // 월요일 시작 캘린더(사이드바 미니캘린더, 독서달력)용
function escapeHtml(s){const d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML;}

// sleep_time/wake_time 쌍 배열에서 평균 수면시간(시간 단위, 문자열)을 계산 — 오늘/주간/월간탭 공통
function avgSleepHoursFromRows(sleepRows){
  let sleepMin=0,sleepCnt=0;
  (sleepRows||[]).forEach(s=>{
    if(s.sleep_time&&s.wake_time){
      const sv=s.sleep_time.split(':').map(Number),wv=s.wake_time.split(':').map(Number);
      let m=(wv[0]*60+wv[1])-(sv[0]*60+sv[1]);if(m<0)m+=1440;
      sleepMin+=m;sleepCnt++;
    }
  });
  return sleepCnt>0?(sleepMin/sleepCnt/60).toFixed(1):'-';
}

// 콘텐츠 완료 집계 공통 규칙 — music은 등록일(start_date) 기준, 그 외는 완료(done/stopped) 상태이면서 종료일(end_date)이 기간 내일 때만 카운트
function countContentsCompletedInRange(contents,startDk,endDk){
  return (contents||[]).filter(c=>{
    if(c.content_cat==='music')return c.start_date&&c.start_date>=startDk&&c.start_date<=endDk;
    if(c.status!=='done'&&c.status!=='stopped')return false;
    if(!c.end_date)return false;
    return c.end_date>=startDk&&c.end_date<=endDk;
  }).length;
}

// 주간탭/월간탭 공통 미니 통계바(메모/완료투두/습관%/콘텐츠완결/평균수면) — habitDenominator만 다름(주간:7, 월간:daysInMonth)
function renderStatBar(elId,{memoCount,doneCount,habitCount,checkCount,habitDenominator,contentCount,avgSleep}){
  const el=document.getElementById(elId);
  const pct=habitCount?Math.round(checkCount/(habitCount*habitDenominator)*100):0;
  el.innerHTML=`
    <div class="sbar-item"><i class="ti ti-notes" aria-hidden="true"></i><span class="sbar-num">${memoCount}</span></div>
    <div class="sbar-div"></div>
    <div class="sbar-item"><i class="ti ti-checkbox" aria-hidden="true"></i><span class="sbar-num">${doneCount}</span></div>
    <div class="sbar-div"></div>
    <div class="sbar-item"><i class="ti ti-chart-donut" aria-hidden="true"></i><span class="sbar-num">${pct}%</span></div>
    <div class="sbar-div"></div>
    <div class="sbar-item"><i class="ti ti-stack-2" aria-hidden="true"></i><span class="sbar-num">${contentCount}</span></div>
    <div class="sbar-div"></div>
    <div class="sbar-item"><i class="ti ti-moon-stars" aria-hidden="true"></i><span class="sbar-num">${avgSleep}h</span></div>
  `;
}

// 수면 점수 → 표정 아이콘 매핑 (본앱 SLEEP_SCORE_LEVELS 원본과 동일)
const SLEEP_SCORE_LEVELS=[
  {max:50,  key:'verylow',  icon:'ti-mood-angry',      label:'매우낮음'},
  {max:65,  key:'low',      icon:'ti-mood-sad',        label:'낮음'},
  {max:78,  key:'normal',   icon:'ti-mood-empty',      label:'보통'},
  {max:89,  key:'high',     icon:'ti-mood-smile',      label:'높음'},
  {max:101, key:'veryhigh', icon:'ti-mood-smile-beam', label:'매우높음'}
];
function getSleepScoreLevel(score){
  return SLEEP_SCORE_LEVELS.find(l=>score<=l.max) || SLEEP_SCORE_LEVELS[SLEEP_SCORE_LEVELS.length-1];
}

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
// ── 모닝루틴 항목 (본앱 MORNING_ROUTINE_ITEMS와 동일) ──
const MORNING_ROUTINE_ITEMS=[
  {key:'wake',label:'기상',icon:'ti-sunset-2',colorRgb:'252,215,110'},
  {key:'tea',label:'티타임',icon:'ti-mug',colorRgb:'244,177,206'},
  {key:'audiobook',label:'오디오북',icon:'ti-radio',colorRgb:'216,168,205'},
  {key:'weight',label:'체중',icon:'ti-scale-outline',colorRgb:'150,205,225'},
  {key:'pill',label:'영양제',icon:'ti-pill',colorRgb:'205,215,145'}
];

const CAT_ICON_META={
  drama:{icon:'ti-device-tv',bg:'rgba(var(--pal-pink-rgb),1)',iconColor:'#fff',label:'드라마'},
  book:{icon:'ti-book',bg:'rgba(var(--pal-yellow-rgb),1)',iconColor:'#fff',label:'책'},
  movie:{icon:'ti-movie',bg:'rgba(var(--pal-sky-rgb),1)',iconColor:'#fff',label:'영화'},
  music:{icon:'ti-music',bg:'rgba(var(--pal-lime-rgb),1)',iconColor:'#fff',label:'음악'}
};

// ── 상태 ──
let _selectedDate=new Date();
let _currentTab='today';
let _rdCalDate=new Date();

// ══════════════════════════════════════════════════════════
// 사이드바 접기/펼치기 (아이패드 미니처럼 화면이 좁을 때 메인 영역을 넓혀줌)
// ══════════════════════════════════════════════════════════
const SIDEBAR_COLLAPSE_KEY='tablet_sidebar_collapsed';
function toggleSidebar(){
  const side=document.getElementById('side');
  const btn=document.getElementById('side-toggle-btn');
  const collapsed=side.classList.toggle('collapsed');
  btn.classList.toggle('collapsed',collapsed);
  try{localStorage.setItem(SIDEBAR_COLLAPSE_KEY,collapsed?'1':'0');}catch(e){}
}
function initSidebarCollapse(){
  let collapsed=false;
  try{collapsed=localStorage.getItem(SIDEBAR_COLLAPSE_KEY)==='1';}catch(e){}
  if(collapsed){
    const side=document.getElementById('side');
    const btn=document.getElementById('side-toggle-btn');
    side.style.transition='none';
    btn.style.transition='none';
    side.classList.add('collapsed');
    btn.classList.add('collapsed');
    // 강제 리플로우 후 트랜지션 복구 — 이후 사용자가 토글할 때만 부드럽게 움직이도록
    void side.offsetWidth;
    requestAnimationFrame(()=>{side.style.transition='';btn.style.transition='';});
  }
}

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
  // 오늘탭으로 돌아올 때는 항상 실제 '오늘' 날짜로 재설정(자정을 넘겨도 갱신되도록)
  if(tab==='today'){_selectedDate=new Date();loadTodayTab();}
  else if(tab==='week')loadWeekTab();
  else if(tab==='month')loadMonthTab();
  else if(tab==='reports')loadReportsTab();
  else if(tab==='settings')_loadClaudeKeyStatus();
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
  const startWeekday=(first.getDay()+6)%7; // 월요일 시작 기준으로 보정(일요일=0 → 6칸 밀림)
  const daysInMonth=new Date(y,m+1,0).getDate();
  const todayDk=dateKey(new Date());
  const selDk=dateKey(_selectedDate);

  let html=`<div class="mini-cal-hdr"><i class="ti ti-chevron-left" onclick="sideCalShift(-1)" aria-hidden="true"></i><span>${y}년 ${m+1}월</span><i class="ti ti-chevron-right" onclick="sideCalShift(1)" aria-hidden="true"></i></div>
  <div class="mini-cal-grid">${DOW_MON_START.map(d=>`<div class="dow">${d}</div>`).join('')}`;
  for(let i=0;i<startWeekday;i++)html+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dk=`${y}-${pad(m+1)}-${pad(d)}`;
    let cls='mini-cal-day';
    if(dk===todayDk)cls+=' today';
    else if(dk===selDk)cls+=' sel'; // 오늘이 선택된 상태에선 today색을 유지 — sel은 오늘이 아닌 날짜를 골랐을 때만
    html+=`<div class="${cls}" onclick="selectDate('${dk}')">${d}</div>`;
  }
  html+='</div>';
  el.innerHTML=html;
}
function sideCalShift(delta){
  _sideCalDate.setMonth(_sideCalDate.getMonth()+delta);
  renderMiniCal();
}
// 사이드바 미니캘린더에서 날짜를 고르면 항상 오늘탭으로 이동해서 그 날짜를 보여줌
function selectDate(dk){
  _selectedDate=new Date(dk+'T00:00:00');
  renderMiniCal();
  if(_currentTab!=='today'){
    _currentTab='today';
    document.querySelectorAll('.main-body').forEach(el=>el.classList.remove('on'));
    document.querySelectorAll('.float-tab').forEach(el=>el.classList.remove('on'));
    document.getElementById('tab-today').classList.add('on');
    document.getElementById('ft-today').classList.add('on');
    closeFloatMenu();
  }
  loadTodayTab();
}

// ── 사이드바 인사배너 (본앱 홈탭 인사카드 이식) ──
// 태블릿엔 Claude API 키가 없으므로 생성은 하지 않고, 모바일이 생성해 ai_cache에 저장한 문구를 조회만 함.
// 본앱 getHomeTimeSlot과 동일한 7분류 → 4개 섹션(morning/afternoon/night/dawn) 매핑.
function getHomeTimeSlot(){
  const h=new Date().getHours();
  if(h<4)return 'dawn';
  if(h<9)return 'morning_1';
  if(h<12)return 'morning_2';
  if(h<16)return 'afternoon_1';
  if(h<19)return 'afternoon_2';
  if(h<22)return 'night_1';
  return 'night_2';
}
function getHomeSection(){
  const slot=getHomeTimeSlot();
  if(slot==='dawn')return 'dawn';
  if(slot==='morning_1'||slot==='morning_2')return 'morning';
  if(slot==='afternoon_1'||slot==='afternoon_2')return 'afternoon';
  return 'night';
}
const SIDE_GREETING_POOL={
  morning:['좋은 아침이에요','오늘도 좋은 하루예요','활기찬 하루 보내요','상쾌한 아침이에요'],
  afternoon:['잘 하고 있어요','오늘도 순항 중이에요','좋은 흐름이에요','한창인 하루예요'],
  night:['오늘도 수고했어요','오늘 하루도 애쓰셨어요','하루를 잘 마무리해요','편안한 저녁 되세요'],
  dawn:['오늘 하루도 잘 보내셨어요','하루를 잘 채워내셨어요','오늘도 무사히 지나갔어요','편안한 밤 되세요']
};
async function renderSideGreeting(){
  const card=document.getElementById('side-greeting-card');
  const timeEl=document.getElementById('side-greeting-time');
  const greetEl=document.getElementById('side-greeting-text');
  const subEl=document.getElementById('side-greeting-sub');
  if(!card)return;

  const section=getHomeSection();
  const subSec=getHomeTimeSlot();
  card.className='side-hcard '+section;
  // 사이드바 접기 탭도 인사카드와 같은 시간대(section) 톤을 그대로 따라가도록 클래스 동기화.
  const toggleBtn=document.getElementById('side-toggle-btn');
  if(toggleBtn){
    toggleBtn.classList.remove('tod-morning','tod-afternoon','tod-night','tod-dawn');
    toggleBtn.classList.add('tod-'+section);
  }

  const now=new Date();
  if(timeEl)timeEl.textContent=`${DOW[now.getDay()]}요일`;

  const pool=SIDE_GREETING_POOL[section]||['좋은 하루예요'];
  if(greetEl)greetEl.textContent=pool[Math.floor(Math.random()*pool.length)];

  if(subEl){
    const cacheKey=`greeting_${dateKey(now)}_${subSec}`;
    const rows=await supaFetch(`ai_cache?cache_key=eq.${encodeURIComponent(cacheKey)}&select=content,expires_at`);
    const row=rows&&rows[0];
    const valid=row&&(row.expires_at==null||row.expires_at>Date.now());
    subEl.textContent=valid?row.content:'곧 준비될 거예요';
  }
}
// 다음 시간대 경계(4/9/12/16/19/22/24시)까지 남은 ms 계산 — 그 시점에 정확히 한 번만 갱신.
// 1분 폴링 대신 이 방식을 쓰면 불필요한 반복 실행 없이 슬롯 전환 시점만 정확히 잡아낼 수 있음.
const SIDE_GREETING_BOUNDARY_HOURS=[4,9,12,16,19,22,24];
function _msUntilNextGreetingBoundary(){
  const now=new Date();
  const h=now.getHours(),m=now.getMinutes(),s=now.getSeconds(),ms=now.getMilliseconds();
  const nowMin=h*60+m;
  let nextH=SIDE_GREETING_BOUNDARY_HOURS.find(b=>b*60>nowMin);
  if(nextH===undefined)nextH=24+SIDE_GREETING_BOUNDARY_HOURS[0]; // 오늘 마지막 경계(24시) 이후 → 다음날 4시
  const target=new Date(now);
  target.setHours(0,0,0,0);
  target.setTime(target.getTime()+nextH*60*60*1000);
  return target.getTime()-now.getTime()+500; // 경계 직후로 500ms 여유
}
function scheduleSideGreetingRefresh(){
  renderSideGreeting();
  const wait=_msUntilNextGreetingBoundary();
  setTimeout(function tick(){
    renderSideGreeting();
    setTimeout(tick,_msUntilNextGreetingBoundary());
  },wait);
}



// ══════════════════════════════════════════════════════════
// 오늘탭
// ══════════════════════════════════════════════════════════
async function loadTodayTab(){
  const dk=dateKey(_selectedDate);
  document.getElementById('today-date').textContent=`${_selectedDate.getMonth()+1}월 ${_selectedDate.getDate()}일`;
  document.getElementById('today-dow').textContent=DOW[_selectedDate.getDay()]+'요일';

  // 평균 취침/기상용 최근 2주 범위(주간탭과 동일 방식)
  const sleepAvgStart=new Date(_selectedDate);sleepAvgStart.setDate(sleepAvgStart.getDate()-13);
  const sleepAvgStartDk=dateKey(sleepAvgStart);

  const [todos,sleepRows,recentSleepRows,habits,habitChecks,meals,contents,books,rblocks,morningChecks]=await Promise.all([
    supaFetch(`todos?date_key=eq.${dk}&order=created.asc`),
    supaFetch(`sleep?date_key=eq.${dk}`),
    supaFetch(`sleep?date_key=gte.${sleepAvgStartDk}&date_key=lte.${dk}&select=date_key,score,sleep_time,wake_time`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=eq.${dk}`),
    supaFetch(`meals?date_key=eq.${dk}`),
    supaFetch(`contents?or=(status.eq.watching,and(status.eq.done,end_date.eq.${dk}),and(content_cat.eq.music,start_date.eq.${dk}))&order=created.desc&limit=6`),
    supaFetch(`reading_books?status=eq.reading&limit=1`),
    supaFetch(`rhythm_blocks?date_key=eq.${dk}&order=start_time.asc`),
    supaFetch(`morning_routine_checks?date_key=eq.${dk}`)
  ]);

  renderTodayTodosEvents(todos||[]);
  renderTodayMemos(dk);
  renderTodaySleep(dk,sleepRows&&sleepRows[0],recentSleepRows||[]);
  renderTodayHabits(habits||[],habitChecks||[],dk);
  renderTodayMeals(meals&&meals[0]);
  renderTodayContents(contents||[]);
  _todayRhythmBlocks=rblocks||[];
  renderTodayRhythm(rblocks||[]);
  renderTodayReading(books&&books[0]);
  renderTodayPace(todos||[],habits||[],habitChecks||[],morningChecks||[]);
  renderReportBanner('today-report-banner',_selectedDate);
}

// 본앱과 동일한 투두 정렬 규칙: 미완료 우선 → 시간대(아침/오후/밤/없음) → 강조(pinned) → sort_order → 텍스트 앞머리 시:분
const TODO_TS_ORDER={morning:0,afternoon:1,night:2,none:3};
function parseTodoLeadingTime(text){
  const m=(text||'').match(/^(\d{1,2}):(\d{2})/);
  return m?parseInt(m[1],10)*60+parseInt(m[2],10):9999;
}
function compareTodoOrder(a,b){
  const ta=TODO_TS_ORDER[a.time_section||'none']??3;
  const tb=TODO_TS_ORDER[b.time_section||'none']??3;
  if(ta!==tb)return ta-tb;
  const pa=a.pinned?0:1,pb=b.pinned?0:1;
  if(pa!==pb)return pa-pb;
  if(typeof a.sort_order==='number'&&typeof b.sort_order==='number')return a.sort_order-b.sort_order;
  return parseTodoLeadingTime(a.text)-parseTodoLeadingTime(b.text);
}
function renderTodayTodosEvents(todos){
  const plainTodos=todos.filter(t=>!t.is_event).slice().sort((a,b)=>{
    if(!!a.done!==!!b.done)return a.done?1:-1;
    return compareTodoOrder(a,b);
  });
  const events=todos.filter(t=>t.is_event);
  const todoEl=document.getElementById('today-todos');
  todoEl.innerHTML=plainTodos.length?plainTodos.slice(0,8).map(t=>{
    const ts=t.time_section||'none';
    const chkHtml=(!t.done&&t.pinned)
      ?`<div class="pinned-ico"><i class="ti ti-bolt-filled" aria-hidden="true"></i></div>`
      :`<div class="chk ts-${ts}${t.done?' on':''}"></div>`;
    return `<div class="todo-row${t.done?' done':''}">${chkHtml}${escapeHtml(t.text)}</div>`;
  }).join(''):'<div class="empty-msg">오늘 할 일이 없어요</div>';

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
  const memosRaw=await supaFetch(`memos?date_key=eq.${dk}&order=memo_time.asc`);
  if(!memosRaw||!memosRaw.length){el.innerHTML='<div class="empty-msg">오늘 남긴 메모가 없어요</div>';return;}
  // DB order는 단순 문자열순이라 00:00~03:59 기록이 맨 앞으로 와버림 — 새벽 4시 컷 기준으로 재정렬(본앱과 동일 규칙).
  const memos=memosRaw.slice().sort((a,b)=>toSortKey(a.memo_time)-toSortKey(b.memo_time));
  el.innerHTML=memos.map(m=>{
    const isSeed=m.type==='seed';
    let todClass='';
    if(!isSeed&&m.memo_time){
      const h=parseInt(m.memo_time.split(':')[0],10);
      todClass=h>=5&&h<12?' tod-morning':h>=12&&h<18?' tod-afternoon':' tod-night';
    }
    const timeHtml=isSeed?'<i class="ti ti-seeding seed-ico" aria-hidden="true"></i>':(m.memo_time||'');
    return `<div class="memo-item${isSeed?' memo-seed':todClass}"><div class="memo-time">${timeHtml}</div><div class="memo-txt">${escapeHtml(m.text)}</div></div>`;
  }).join('');
}

function renderTodaySleep(dk,sleep,recentSleepRows){
  const scoreEl=document.getElementById('today-sleep-score');
  const el=document.getElementById('today-sleep');
  const subEl=document.getElementById('today-sleep-time-sub');
  let durText='';
  if(sleep&&sleep.sleep_time&&sleep.wake_time){
    const sv=sleep.sleep_time.split(':').map(Number),wv=sleep.wake_time.split(':').map(Number);
    let mins=(wv[0]*60+wv[1])-(sv[0]*60+sv[1]);if(mins<0)mins+=1440;
    durText=Math.floor(mins/60)+'h '+(mins%60)+'m';
  }
  if(subEl)subEl.textContent=(sleep&&sleep.sleep_time&&sleep.wake_time)?`${sleep.sleep_time}–${sleep.wake_time}`:'';
  scoreEl.innerHTML=(sleep&&sleep.score!=null)
    ?`<div class="sleep-score">${sleep.score}<span style="font-size:12px;color:var(--tm);"> 점</span></div>${durText?`<div class="sleep-score-lbl">${durText}</div>`:''}`
    :`<div class="sleep-score-lbl">기록 없음</div>`;

  // 평균 취침/기상 — 주간탭과 동일하게 최근 2주 데이터 기준(sleep_time은 22시 컷 보정).
  const validRows=(recentSleepRows||[]).filter(r=>r.sleep_time&&r.wake_time);
  let sleepAvgTxt='–',wakeAvgTxt='–';
  if(validRows.length){
    let sSum=0,wSum=0;
    validRows.forEach(r=>{
      const sv=toDawnAdjustedMin(_dawnTimeToMin(r.sleep_time),22*60);
      sSum+=sv;
      wSum+=_dawnTimeToMin(r.wake_time);
    });
    sleepAvgTxt=_minToHHMM(Math.round(sSum/validRows.length)%1440);
    wakeAvgTxt=_minToHHMM(Math.round(wSum/validRows.length)%1440);
  }

  // 최근 7일 컨디션 아이콘 — 주간탭(wsleep-face)과 동일 로직, 요일 표기는 기존 오늘탭 스타일 유지
  const scoreByDk={};
  (recentSleepRows||[]).forEach(r=>{if(r.score!=null)scoreByDk[r.date_key]=r.score;});
  const days=[];
  const base=new Date(dk+'T00:00:00');
  for(let i=6;i>=0;i--){const d=new Date(base);d.setDate(base.getDate()-i);days.push(dateKey(d));}
  const weekCols=days.map(dayDk=>{
    const sc=scoreByDk[dayDk];
    const isToday=dayDk===dk;
    const dow=DOW[new Date(dayDk+'T00:00:00').getDay()];
    const faceHtml=sc!=null?`<i class="ti ${getSleepScoreLevel(sc).icon}"></i>`:`<i class="ti ti-minus" style="opacity:.3;" aria-hidden="true"></i>`;
    return `<div class="sleep-week-col"><div class="sleep-spark-dow${isToday?' today':''}">${dow}</div><div class="sleep-week-face">${faceHtml}</div></div>`;
  }).join('');

  el.innerHTML=`<div class="sleep-week-grid">${weekCols}</div><div class="sleep-summary" id="today-sleep-summary">
    <div class="sleep-summary-item"><i class="ti ti-moon" aria-hidden="true"></i><span class="sleep-summary-label">평균 취침</span><span class="sleep-summary-val">${sleepAvgTxt}</span></div>
    <div class="sleep-summary-div"></div>
    <div class="sleep-summary-item"><i class="ti ti-sunrise" aria-hidden="true"></i><span class="sleep-summary-label">평균 기상</span><span class="sleep-summary-val">${wakeAvgTxt}</span></div>
  </div>`;
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
    const c=done?(colorMap[h.color]||'var(--pal-warmgray-rgb)'):'var(--pal-warmgray-rgb)';
    const hIcon=getHabitIcon(h.name);
    const iconHtml=hIcon?`<i class="ti ${hIcon} habit-row-icon" style="color:rgba(${c},${done?1:0.75});" aria-hidden="true"></i>`:'';
    return `<div class="habit-row${done?' done':''}">${iconHtml}${escapeHtml(h.name)}${done?'<i class="ti ti-check habit-check" aria-hidden="true"></i>':''}</div>`;
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
  if(!items.length){el.innerHTML='<div class="empty-msg">오늘 감상한 콘텐츠 없음</div>';return;}
  el.innerHTML=items.slice(0,4).map(c=>{
    const meta=CAT_ICON_META[c.content_cat]||{label:c.content_cat};
    return `<div class="content-row"><span class="content-cat">${meta.label||''}</span><span class="content-title">${escapeHtml(c.title)}</span></div>`;
  }).join('');
}

// 오늘 활동 분포 — 본앱 _paceDayEvents/_paceDotTimelineHtml 로직을 Supabase 데이터 기준으로 이식.
// 새벽 4시 보정은 기존 toDawnAdjustedMin 유틸이 없어 여기서 최소 버전으로 재정의(홈탭 새벽 로직과 별개, 이 그래프 전용).
const PACE_DOT_COLORS={todo:'#e8a0ac',habit:'#a3c9ae',morning:'#f2cf8e',event:'#b9a5e6'};
const PACE_DOT_RANGE_START=6*60,PACE_DOT_RANGE_END=24*60;
function _paceAdjustMin(min){
  // 0:00~3:59는 전날 24:00~27:59 위치로 밀어서 활동분포 그래프 오른쪽 끝에 붙게 함
  return min<PACE_DOT_RANGE_START ? min+1440 : min;
}
function _paceParseHM(hm){const p=(hm||'').split(':');return parseInt(p[0],10)*60+parseInt(p[1],10);}
function renderTodayPace(todos,habits,habitChecks,morningChecks){
  const el=document.getElementById('today-pace');
  const events=[];
  (todos||[]).forEach(t=>{
    if(t.is_event){
      if(!t.event_time)return;
      events.push({type:'event',min:_paceAdjustMin(_paceParseHM(t.event_time)),label:t.text||''});
      return;
    }
    const st=t.strike_times||{};
    const timeEntries=Object.entries(st).filter(([,v])=>typeof v==='number');
    if(timeEntries.length){
      timeEntries.forEach(([,ms])=>{
        const d=new Date(ms);
        events.push({type:'todo',min:_paceAdjustMin(d.getHours()*60+d.getMinutes()),label:t.text||''});
      });
    }else if(t.done&&t.completed_at){
      const d=new Date(t.completed_at);
      events.push({type:'todo',min:_paceAdjustMin(d.getHours()*60+d.getMinutes()),label:t.text||''});
    }
  });
  (habitChecks||[]).forEach(hc=>{
    if(!hc.checked_time)return;
    events.push({type:'habit',min:_paceAdjustMin(_paceParseHM(hc.checked_time)),label:hc.habit_name||''});
  });
  (morningChecks||[]).forEach(mc=>{
    if(!mc.checked_time)return;
    events.push({type:'morning',min:_paceAdjustMin(_paceParseHM(mc.checked_time)),label:mc.item_key||''});
  });
  if(!events.length){el.innerHTML='<div class="pace-empty">오늘 기록된 활동이 없어요</div>';return;}
  events.sort((a,b)=>a.min-b.min);
  const rangeLen=PACE_DOT_RANGE_END-PACE_DOT_RANGE_START;
  const positioned=events.filter(ev=>ev.min>=PACE_DOT_RANGE_START).map(ev=>({...ev,xPct:Math.min(100,(ev.min-PACE_DOT_RANGE_START)/rangeLen*100)}));
  if(!positioned.length){el.innerHTML='<div class="pace-empty">오늘 기록된 활동이 없어요</div>';return;}
  const MIN_GAP_PCT=2.0;
  const groups=[];
  positioned.forEach(ev=>{
    const last=groups[groups.length-1];
    if(last&&ev.xPct-last.centerX<MIN_GAP_PCT){
      last.items.push(ev);
      last.centerX=last.items.reduce((s,it)=>s+it.xPct,0)/last.items.length;
    }else{
      groups.push({centerX:ev.xPct,items:[ev]});
    }
  });
  const TRACK_H=42,BASE_Y=18;
  let dotsHtml='';
  groups.forEach(gr=>{
    const n=gr.items.length;
    gr.items.forEach((ev,idx)=>{
      const offset=(idx-(n-1)/2)*MIN_GAP_PCT;
      const x=Math.min(100,Math.max(0,gr.centerX+offset));
      dotsHtml+=`<div class="pace-dot" style="left:${x}%;top:${BASE_Y}px;background:${PACE_DOT_COLORS[ev.type]};" title="${escapeHtml(ev.label)}"></div>`;
    });
  });
  let hourMarks='';
  for(let h=PACE_DOT_RANGE_START/60;h<=PACE_DOT_RANGE_END/60;h+=6){
    const x=(h*60-PACE_DOT_RANGE_START)/rangeLen*100;
    hourMarks+=`<div class="pace-dot-hourline" style="left:${x}%;"></div><div class="pace-dot-hourlabel" style="left:${x}%;">${h>24?h-24:h}시</div>`;
  }
  el.innerHTML=`<div class="pace-dot-track" style="height:${TRACK_H}px;">
    <div class="pace-dot-baseline" style="top:${BASE_Y}px;"></div>
    ${hourMarks}
    ${dotsHtml}
  </div>`;
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
  // 문자열 비교(localeCompare)는 00:00~03:59대 새벽 기록을 맨 앞으로 보내버림 — 새벽 4시 컷 기준(toSortKey)으로 정렬해야
  // 수면 등록 전까지의 기록이 "자정 전 날짜의 가장 마지막 기록"으로 온다(본앱 규칙과 동일).
  const blocks=(_todayRhythmBlocks||[]).slice().sort((a,b)=>toSortKey(a.start_time)-toSortKey(b.start_time));
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
    <div class="rd-cur-info"><div class="rd-cur-title">${escapeHtml(book.title)}</div><div class="rd-cur-author">${escapeHtml(book.author||'')}</div><div class="rd-cur-pct">${pct}% 진행 중</div></div>
  </div>`;
}

// ── 리포트 배너 (주/월 캐시가 있으면 노출) ──
async function renderReportBanner(elId,forDate){
  const el=document.getElementById(elId);
  if(!el)return;
  const wkSun=_mondayToSundayDk(weekKeyOf(forDate));
  const mk=monthKeyOf(forDate);
  const [weeklyRows,monthlyRows]=await Promise.all([
    supaFetch(`ai_cache?cache_key=eq.weekly_summary_${wkSun}&select=cache_key`),
    supaFetch(`ai_cache?cache_key=eq.monthly_report_${mk}&select=cache_key`)
  ]);
  if(weeklyRows&&weeklyRows.length){
    el.classList.add('on');
    el.innerHTML=`<div class="report-banner-inner"><i class="ti ti-sparkles" aria-hidden="true"></i>이번 주 리포트가 준비됐어요<i class="ti ti-chevron-right" aria-hidden="true"></i></div>`;
    el.onclick=()=>openReportPanel('weekly_summary_'+wkSun,'이번 주 리포트');
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
  if(!content){bodyEl.innerHTML='<div class="empty-msg">내용을 불러오지 못했어요</div>';return;}
  // monthly_report_ 캐시는 본앱에서 {comment, keywords} JSON으로 저장됨 — 파싱해서 mr-ai-card 스타일로 렌더링.
  // 그 외(weekly_summary_ 등)는 이미 완성된 HTML 문자열이라 그대로 삽입.
  if(cacheKey.startsWith('monthly_report_')){
    try{
      const report=JSON.parse(content);
      bodyEl.innerHTML=`<div class="mr-ai-card">
        <div class="mr-sec-title"><i class="ti ti-sparkles" aria-hidden="true"></i> 이번 달 한눈에</div>
        <p class="mr-ai-comment">${escapeHtml(report.comment||'')}</p>
        ${report.keywords&&report.keywords.length?`<div class="mr-tag-cloud">${report.keywords.map(k=>`<span class="mr-tag">${escapeHtml(k)}</span>`).join('')}</div>`:''}
      </div>`;
    }catch(e){
      bodyEl.innerHTML=content;
    }
  }else{
    bodyEl.innerHTML=`<div class="mr-ai-comment">${content}</div>`;
  }
}
function closeReportPanel(){
  document.getElementById('report-overlay').classList.remove('on');
}
// ══════════════════════════════════════════════════════════
// 주간탭
// ══════════════════════════════════════════════════════════
const WC_COLORS_BG=['var(--pal-pink-bg)','var(--pal-orange-bg)','var(--pal-yellow-bg)','var(--pal-mint-bg)','var(--pal-sky-bg)','var(--pal-lavender-bg)','var(--pal-rose-bg)'];
const WC_COLORS_TXT=['var(--pal-pink-text)','var(--pal-orange-text)','var(--pal-yellow-text)','var(--pal-mint-text)','var(--pal-sky-text)','var(--pal-lavender-text)','var(--pal-rose-text)'];
const WC_COLORS_BORDER=['var(--pal-pink-border)','var(--pal-orange-border)','var(--pal-yellow-border)','var(--pal-mint-border)','var(--pal-sky-border)','var(--pal-lavender-border)','var(--pal-rose-border)'];
const WC_DAYS=['M','T','W','T','F','S','S']; // 본앱 이니셜 표기(월요일 시작)
const WC_DOW=['월','화','수','목','금','토','일'];

// ── 상단 화살표: 오늘/주간/월간 탭 공통 날짜 이동 ──
function shiftSelectedDate(delta){
  const d=new Date(_selectedDate);
  d.setDate(d.getDate()+delta);
  _selectedDate=d;
  _sideCalDate=new Date(d);
  renderMiniCal();
  loadTodayTab();
}
function shiftSelectedWeek(delta){
  const d=new Date(_selectedDate);
  d.setDate(d.getDate()+delta*7);
  _selectedDate=d;
  _sideCalDate=new Date(d);
  renderMiniCal();
  loadWeekTab();
}
function shiftSelectedMonth(delta){
  const d=new Date(_selectedDate);
  const day=d.getDate();
  d.setDate(1); // 말일 넘어가는 오버플로 방지(예: 1/31 +1개월 → 3/3 되는 문제)
  d.setMonth(d.getMonth()+delta);
  const lastDay=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  d.setDate(Math.min(day,lastDay));
  _selectedDate=d;
  _sideCalDate=new Date(d);
  renderMiniCal();
  loadMonthTab();
}
// 월요일 시작 기준, baseDate가 속한 주의 월요일이 그 달의 몇 번째 월요일인지로 "N주차" 계산
function getWeekOfMonthLabel(baseDate){
  const wk=weekKeyOf(baseDate);
  const monday=new Date(wk+'T00:00:00');
  const y=monday.getFullYear(),mo=monday.getMonth();
  const firstOfMonth=new Date(y,mo,1);
  const firstMondayOffset=(8-firstOfMonth.getDay())%7; // 그 달 1일 기준 첫 월요일까지 offset(일)
  const firstMonday=new Date(y,mo,1+firstMondayOffset);
  const weekNo=Math.round((monday-firstMonday)/(7*24*60*60*1000))+1;
  return `${mo+1}월 ${weekNo}주차`;
}

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
  document.getElementById('week-range').textContent=getWeekOfMonthLabel(_selectedDate);

  // 지난주 대비 계산 시 "오늘이 속한 요일까지"만 비교 대상으로 삼기 위한 범위.
  // 이번주가 현재 진행 중인 주(오늘이 weekDates 안에 있음)일 때만 절단하고,
  // 과거/미래 주로 이동한 경우엔 이 로직을 적용하지 않고 7일 전체로 비교한다.
  const todayDk=dateKey(new Date());
  const todayIdx=weekDates.indexOf(todayDk);
  const isCurrentWeek=todayIdx!==-1;
  const cmpEndDk=isCurrentWeek?todayDk:endDk; // 이번주 비교 종료일(포함)
  const cmpDayCount=isCurrentWeek?(todayIdx+1):7;

  const lastWeekDates=getWeekDates(new Date(new Date(weekDates[0]+'T00:00:00').getTime()-7*24*60*60*1000));
  const lastStartDk=lastWeekDates[0];
  const lastCmpEndDk=isCurrentWeek?lastWeekDates[todayIdx]:lastWeekDates[6];

  // 모닝루틴 카드용 최근 7일(캘린더 주와 무관하게 오늘 포함 롤링 7일)
  const mrEnd=new Date();
  const mrStart=new Date(mrEnd);mrStart.setDate(mrStart.getDate()-6);
  const mrEndDk=dateKey(mrEnd),mrStartDk=dateKey(mrStart);

  const [goalRows,habits,habitChecks,memos,todos,sleepRows,onelineRows,contents,
    lwMemos,lwTodos,lwSleepRows,lwHabitChecks,lwContents,rblocksThis,rblocksLast,morningChecksWeek]=await Promise.all([
    supaFetch(`goal_notes?note_key=eq.wchallenge_${encodeURIComponent(wk)}`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    supaFetch(`memos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=id`),
    supaFetch(`todos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=done`),
    supaFetch(`sleep?date_key=gte.${startDk}&date_key=lte.${endDk}&select=date_key,score,sleep_time,wake_time`),
    supaFetch(`goal_notes?note_key=gte.oneline:${startDk}&note_key=lte.oneline:${endDk}`),
    supaFetch(`contents?or=(status.in.(done,stopped),content_cat.eq.music)&order=created.desc&limit=100`),
    // 지난주 대비 비교용(오늘 요일까지로 절단된 범위)
    supaFetch(`memos?date_key=gte.${lastStartDk}&date_key=lte.${lastCmpEndDk}&select=id`),
    supaFetch(`todos?date_key=gte.${lastStartDk}&date_key=lte.${lastCmpEndDk}&select=done`),
    supaFetch(`sleep?date_key=gte.${lastStartDk}&date_key=lte.${lastCmpEndDk}&select=date_key,score,sleep_time,wake_time`),
    supaFetch(`habit_checks?date_key=gte.${lastStartDk}&date_key=lte.${lastCmpEndDk}`),
    supaFetch(`contents?or=(status.in.(done,stopped),content_cat.eq.music)&order=created.desc&limit=100`),
    // 리듬 흐름 비교용: 이번주(오늘까지)/지난주(7일 전체)
    supaFetch(`rhythm_blocks?date_key=gte.${startDk}&date_key=lte.${cmpEndDk}`),
    supaFetch(`rhythm_blocks?date_key=gte.${lastStartDk}&date_key=lte.${lastWeekDates[6]}`),
    // 모닝루틴 최근 7일
    supaFetch(`morning_routine_checks?date_key=gte.${mrStartDk}&date_key=lte.${mrEndDk}`)
  ]);

  renderWeekGoals(goalRows&&goalRows[0]);
  renderWeekHabitMatrix(habits||[],habitChecks||[],weekDates);
  renderWeekMorningRoutine(morningChecksWeek||[]);
  renderWeekDelta({
    memos:memos||[],todos:todos||[],sleepRows:sleepRows||[],habits:habits||[],checks:habitChecks||[],contents:contents||[],
    startDk,endDk:cmpEndDk,cmpDayCount
  },{
    memos:lwMemos||[],todos:lwTodos||[],sleepRows:lwSleepRows||[],checks:lwHabitChecks||[],contents:lwContents||[],
    startDk:lastStartDk,endDk:lastCmpEndDk
  });
  renderWeekRhythmFlow(rblocksThis||[],rblocksLast||[],cmpDayCount);
  renderWeekOneline(onelineRows||[],weekDates);
  renderReportBanner('week-report-banner',_selectedDate);
}

function _minToHHMM(min){const h=Math.floor(min/60),m=min%60;return pad(h)+':'+pad(m);}

// 이번 주 모닝루틴 — 오늘 포함 최근 7일 롤링 기준, 항목별 체크 일수를 얇은 막대로 표시(2열 그리드, 본앱 하단 통계그리드와 동일 배치).
// 달성률 자체보다 "얼마나 루틴화됐는지"를 가볍게 보여주는 용도라 궤도 UI 없이 심플하게.
function renderWeekMorningRoutine(rows){
  const el=document.getElementById('week-morning-routine');
  if(!el)return;
  const cntByKey={};
  (rows||[]).forEach(r=>{if(r.item_key)cntByKey[r.item_key]=(cntByKey[r.item_key]||0)+1;});
  const total=7;
  let itemsHtml=MORNING_ROUTINE_ITEMS.map(it=>{
    const cnt=cntByKey[it.key]||0;
    const pct=Math.round(cnt/total*100);
    return `<div class="wmroutine-row">
      <i class="ti ${it.icon}" style="color:rgb(${it.colorRgb});" aria-hidden="true"></i>
      <span class="wmroutine-label">${it.label}</span>
      <div class="wmroutine-bar-track"><div class="wmroutine-bar-fill" style="width:${pct}%;background:rgb(${it.colorRgb});"></div></div>
      <span class="wmroutine-cnt">${cnt}/7</span>
    </div>`;
  }).join('');
  // 남는 한 칸: 전체 합산 달성률(체크 총합/전체 슬롯) — 본앱과 동일하게 무지개 그라디언트
  const doneTotal=MORNING_ROUTINE_ITEMS.reduce((s,it)=>s+(cntByKey[it.key]||0),0);
  const slotTotal=MORNING_ROUTINE_ITEMS.length*total;
  const totalPct=slotTotal>0?Math.round(doneTotal/slotTotal*100):0;
  itemsHtml+=`<div class="wmroutine-row">
    <i class="ti ti-chart-donut" style="color:var(--tm);" aria-hidden="true"></i>
    <span class="wmroutine-label">합산</span>
    <div class="wmroutine-bar-track"><div class="wmroutine-bar-fill" style="width:${totalPct}%;background:linear-gradient(90deg,rgba(248,192,160,0.95) 0%,rgba(252,215,110,0.95) 25%,rgba(150,205,225,0.95) 50%,rgba(190,160,230,0.95) 75%,rgba(244,177,206,0.95) 100%);"></div></div>
    <span class="wmroutine-cnt">${totalPct}%</span>
  </div>`;
  el.innerHTML=`<div class="wmroutine-grid">${itemsHtml}</div>`;
}

// 지난주 대비 — 오늘 요일까지로 절단된 동일 범위끼리 비교(주 진행 중엔 항상 마이너스로 왜곡되는 문제 방지)
function renderWeekDelta(cur,prev){
  const el=document.getElementById('week-delta');
  const curDone=cur.todos.filter(t=>t.done).length;
  const prevDone=prev.todos.filter(t=>t.done).length;
  const curHabitPct=cur.habits.length?Math.round(cur.checks.length/(cur.habits.length*cur.cmpDayCount)*100):0;
  const prevDenom=cur.habits.length*(prev.checks.length?cur.cmpDayCount:cur.cmpDayCount); // 습관 목록은 현재 기준 유지
  const prevHabitPct=cur.habits.length?Math.round(prev.checks.length/(cur.habits.length*cur.cmpDayCount)*100):0;
  const curContent=countContentsCompletedInRange(cur.contents,cur.startDk,cur.endDk);
  const prevContent=countContentsCompletedInRange(prev.contents,prev.startDk,prev.endDk);
  const curSleep=parseFloat(avgSleepHoursFromRows(cur.sleepRows))||0;
  const prevSleep=parseFloat(avgSleepHoursFromRows(prev.sleepRows))||0;

  const items=[
    {icon:'ti-notes',cur:cur.memos.length,prev:prev.memos.length,label:'메모',fmt:v=>v},
    {icon:'ti-checkbox',cur:curDone,prev:prevDone,label:'완료투두',fmt:v=>v},
    {icon:'ti-chart-donut',cur:curHabitPct,prev:prevHabitPct,label:'습관율',fmt:v=>v+'%'},
    {icon:'ti-stack-2',cur:curContent,prev:prevContent,label:'콘텐츠',fmt:v=>v},
    {icon:'ti-moon-stars',cur:curSleep,prev:prevSleep,label:'평균수면',fmt:v=>v+'h'}
  ];

  el.innerHTML=`<div class="week-delta-grid">`+items.map(it=>{
    const diff=Math.round((it.cur-it.prev)*10)/10;
    const dir=diff>0?'up':(diff<0?'down':'flat');
    const arrow=dir==='up'?'ti-arrow-up':(dir==='down'?'ti-arrow-down':'ti-minus');
    const sign=diff>0?'+':'';
    return `<div class="wd-item">
      <i class="ti ${it.icon} wd-icon" aria-hidden="true"></i>
      <div class="wd-num">${it.fmt(it.cur)}</div>
      <div class="wd-delta ${dir}"><i class="ti ${arrow}" style="font-size:12px;"></i>${sign}${it.fmt(diff)}</div>
    </div>`;
  }).join('')+`</div>`;
}

// 리듬 흐름 비교 — 본앱 recap-rhythm-bar-chart를 두 줄(지난주 7일 평균 / 이번주 현재까지)로 이식
// 본앱 fmtDur과 동일한 형식(N시간 M분 / N시간 / M분)
function _fmtDur(min){
  const h=Math.floor(min/60),m=Math.round(min%60);
  if(h>0&&m>0)return h+'시간 '+m+'분';
  if(h>0)return h+'시간';
  return m+'분';
}
function renderWeekRhythmFlow(rblocksThis,rblocksLast,cmpDayCount){
  const el=document.getElementById('week-rhythm-flow');
  const durByCat=(rblocks)=>{
    const d={};let total=0;
    rblocks.forEach(b=>{
      if(!b.start_time||!b.end_time)return;
      const s=_paceParseHM(b.start_time),e=_paceParseHM(b.end_time);
      if(isNaN(s)||isNaN(e))return;
      let dur=e-s;if(dur<0)dur+=1440;
      if(dur<=0)return;
      d[b.cat]=(d[b.cat]||0)+dur;total+=dur;
    });
    return {d,total};
  };
  const curD=durByCat(rblocksThis);
  const lastD=durByCat(rblocksLast);

  // 막대는 그 줄의 총합 중 비중이 큰 카테고리부터 이어지도록 시간이 긴 순으로 정렬(들쑥날쑥함 방지)
  // 상위 4개 세그먼트는 아이콘 옆에 그 줄 기준 일평균 시간을 함께 표기(누계/dayCount)
  const barRow=(tick,d,total,dayCount)=>{
    if(total<=0)return `<div class="rf-row"><span class="rf-tick">${tick}</span><div class="rf-bar-chart"></div></div>`;
    const sorted=Object.keys(d).filter(k=>d[k]>0).sort((a,b)=>d[b]-d[a]);
    let segs='';
    sorted.forEach((k,i)=>{
      const c=RHYTHM_CATS[k];if(!c)return;
      const pct=d[k]/total*100;
      const showTime=i<4&&pct>=9; // 상위 4개 + 텍스트가 들어갈 최소 폭 확보되는 경우만 표기
      const avgMin=d[k]/(dayCount||1);
      segs+=`<div class="rf-bar-seg" style="width:${pct}%;background:${c.color};"><i class="ti ${c.icon}"></i>${showTime?`<span class="rf-seg-time">${_fmtDur(avgMin)}</span>`:''}</div>`;
    });
    return `<div class="rf-row"><span class="rf-tick">${tick}</span><div class="rf-bar-chart">${segs}</div></div>`;
  };

  const usedCats=new Set([...Object.keys(lastD.d),...Object.keys(curD.d)]);
  if(!usedCats.size){
    el.innerHTML='<div class="empty-msg">기록된 리듬이 없어요</div>';
    return;
  }

  // 지난주 평균: 7일 기준 일평균 / 이번주 현재: 오늘까지 진행일수(cmpDayCount) 기준 일평균
  el.innerHTML=barRow('지난주 평균',lastD.d,lastD.total,7)+barRow('이번주 현재',curD.d,curD.total,cmpDayCount);
}

function renderWeekGoals(row){
  const el=document.getElementById('week-goals');
  const lines=(row&&Array.isArray(row.lines))?row.lines.filter(l=>l&&l.text&&l.text.trim()):[];
  if(!lines.length){el.innerHTML='<div class="empty-msg">등록된 목표가 없어요</div>';return;}
  el.innerHTML=lines.map(item=>{
    const daysHtml=WC_DAYS.map((d,i)=>{
      const on=item.days&&item.days[i];
      const style=on?`background:${WC_COLORS_BG[i]};border-color:${WC_COLORS_BORDER[i]};color:${WC_COLORS_TXT[i]};border-style:solid;`:'';
      return `<div class="wgoal-day" style="${style}">${d}</div>`;
    }).join('');
    return `<div class="wgoal-item"><div class="wgoal-text">${escapeHtml(item.text)}</div><div class="wgoal-days">${daysHtml}</div></div>`;
  }).join('');
}

function renderWeekHabitMatrix(habits,checks,weekDates){
  const el=document.getElementById('week-habit-matrix');
  if(!habits.length){el.innerHTML='<div class="empty-msg">등록된 습관 없음</div>';return;}
  const colorMap={mint:'var(--pal-mint-rgb)',pink:'var(--pal-pink-rgb)',sky:'var(--pal-sky-rgb)',yellow:'var(--pal-yellow-rgb)'};
  let html=`<div class="habit-matrix">`;
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


// 하루한줄 2열 배치: 왼쪽(월/화/수), 오른쪽(목/금/토/일)
function renderWeekOneline(rows,weekDates){
  const elA=document.getElementById('week-oneline-a');
  const elB=document.getElementById('week-oneline-b');
  const byDate={};
  rows.forEach(r=>{
    const dk=r.note_key.replace('oneline:','');
    const text=Array.isArray(r.lines)?(r.lines[0]||''):r.lines;
    if(text&&text.trim())byDate[dk]=text;
  });
  const entries=weekDates.map((dk,i)=>({dow:WC_DOW[i],text:byDate[dk]}));
  const left=entries.slice(0,4).filter(e=>e.text);   // 월화수목 — 목요일을 왼쪽으로 올려 왼쪽 4/오른쪽 3, 최대 줄 수를 맞춤
  const right=entries.slice(4,7).filter(e=>e.text);  // 금토일
  const rowHtml=e=>`<div class="oneline-row"><div class="oneline-dow">${e.dow}</div>${escapeHtml(e.text)}</div>`;
  elA.innerHTML=left.length?left.map(rowHtml).join(''):'<div class="empty-msg">기록 없음</div>';
  elB.innerHTML=right.length?right.map(rowHtml).join(''):'<div class="empty-msg">기록 없음</div>';
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
  await renderMonthQuotes(y,mo);
  await renderMonthContentCollect(y,mo);
  await renderChaeumLogTablet();
  _rdCalDate=new Date(_monthCalDate);
  await renderReadingCal();
  lockContentCollectToReadingCal();
}

// 독서달력(top-row 첫 카드)의 실제 렌더링 높이를 콘텐츠모아보기 카드의 절대 상한으로 고정.
// 콘텐츠모아보기가 아무리 길어져도 이 값을 넘지 못하고 내부 스크롤로만 처리됨.
function lockContentCollectToReadingCal(){
  const topRow=document.querySelector('.top-row');
  if(!topRow)return;
  const rdCard=topRow.children[0];
  const ccolCard=document.querySelector('.ccol-card');
  if(!rdCard||!ccolCard)return;
  // 이미지 로딩(독서표지)이나 폰트로 레이아웃이 아직 안 굳었을 수 있어 두 프레임 뒤에 측정
  setTimeout(()=>{
    const h=rdCard.offsetHeight;
    if(h>0){
      ccolCard.style.height=h+'px';
      ccolCard.style.maxHeight=h+'px';
    }
  },50);
}

function renderMonthGoals(row){
  const el=document.getElementById('month-goals');
  const lines=(row&&Array.isArray(row.lines))?row.lines.filter(l=>l&&l.trim()):[];
  if(!lines.length){el.innerHTML='<div class="empty-msg">등록된 목표가 없어요</div>';return;}
  el.innerHTML=lines.map(l=>`<div class="mgoal-row">${escapeHtml(l)}</div>`).join('');
}

// ── 콘텐츠 타임라인 — 전체 폭 한줄(%기반), 스와이프 불필요하게 31일치를 카드 폭에 맞춰 표시 ──
function isContentCarryOverTablet(c,mk){
  if(c.content_cat==='music')return false;
  if(c.status==='watching')return true;
  if((c.status==='done'||c.status==='stopped')&&c.end_date&&c.end_date.slice(0,7)>=mk)return true;
  return false;
}
function isContentEndedInMonthTablet(c,targetMk){
  return (c.end_date||c.start_date||'').slice(0,7)===targetMk;
}
// 본앱 computeContentMonthlyList와 동일 규칙: 완결은 종료월에 한 번, 진행중은 오늘이 속한 달에서만 노출
async function renderMonthContentCollect(y,mo){
  const el=document.getElementById('month-content-collect');
  const mk=`${y}-${pad(mo+1)}`;
  const prevMk=monthKeyOf(new Date(y,mo-1,1));
  const isSameMonth=mk===monthKeyOf(new Date());
  const [curRows,prevRows]=await Promise.all([
    supaFetch(`contents?month_key=eq.${mk}`),
    supaFetch(`contents?month_key=eq.${prevMk}`)
  ]);
  const belongsHere=c=>{
    if(c.status==='done'||c.status==='stopped')return isContentEndedInMonthTablet(c,mk);
    return c.status==='watching'&&isSameMonth;
  };
  const list=[...(curRows||[]).filter(belongsHere),...(prevRows||[]).filter(belongsHere)];
  const CATS=['drama','book','movie','music'];
  const byCat={drama:[],book:[],movie:[],music:[]};
  list.forEach(c=>{if(byCat[c.content_cat])byCat[c.content_cat].push(c);});
  const hasAny=CATS.some(cat=>byCat[cat].length>0);
  if(!hasAny){el.innerHTML='<div class="empty-msg">이 달엔 완료한 콘텐츠가 없어요</div>';return;}
  el.innerHTML=CATS.filter(cat=>byCat[cat].length>0).map(cat=>{
    const meta=CAT_ICON_META[cat];
    const items=byCat[cat].map(c=>{
      const stars=c.stars>0?`<span class="ccol-stars">${'★'.repeat(c.stars)}</span>`:'';
      const status=c.status==='stopped'?'<span class="ccol-status">중단</span>':(c.status==='watching'?'<span class="ccol-status">진행중</span>':'');
      const poster=c.poster
        ?`<img class="ccol-poster" src="${c.poster}" />`
        :`<div class="ccol-poster-fallback" style="background:${meta.bg};"><i class="ti ${meta.icon}" style="font-size:13px;color:#fff;" aria-hidden="true"></i></div>`;
      return `<div class="ccol-item">${poster}<div class="ccol-title">${escapeHtml(c.title||'')}</div>${stars}${status}</div>`;
    }).join('');
    return `<div class="ccol-sec"><div class="ccol-sec-title"><i class="ti ${meta.icon}" aria-hidden="true"></i>${meta.label}</div>${items}</div>`;
  }).join('');
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
  // tt-cell/tt-block과 폭을 정확히 맞추기 위해 헤더도 1일=1칸(flex:1) 구조로 만들고, 5의 배수일에만 숫자를 표기
  for(let i=1;i<=daysInMonth;i++)headHtml+=`<span>${i%5===0?i:''}</span>`;

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
      const catLabel=tIdx===0?`<span class="tt-cat-badge" style="background:${meta.bg};"><i class="ti ${meta.icon}" style="color:${meta.iconColor};" aria-hidden="true"></i></span>${meta.label}`:'';
      // 본앱과 동일하게 커서를 하루씩 진행하며, 콘텐츠 없는 날은 점선 네모칸(tt-cell), 있는 구간은 카테고리색 블록(tt-block)으로 채움
      // 음악은 같은 시작일끼리 그룹핑해서 2곡 이상이면 곡 제목 대신 숫자 개수로 표시(본앱 동일 규칙)
      const sortedGroups=cat==='music'
        ?Object.values(trackItems.reduce((acc,c)=>{(acc[c.startD]=acc[c.startD]||[]).push(c);return acc;},{})).sort((a,b)=>a[0].startD-b[0].startD)
        :trackItems.slice().sort((a,b)=>a.startD-b.startD).map(c=>[c]);
      let cellsHtml='';
      let cursor=1;
      sortedGroups.forEach(group=>{
        const c=group[0];
        const dispStart=Math.max(c.startD,cursor);
        for(let d=cursor;d<dispStart;d++)cellsHtml+=`<div class="tt-cell"></div>`;
        const dispEnd=Math.max(c.endD,dispStart);
        const span=dispEnd-dispStart+1;
        const w=span*22+(span-1)*1.5;
        const isWatching=c.item.status==='watching'&&cat!=='music';
        const isStopped=c.item.status==='stopped';
        let label,titleAttr;
        if(cat==='music'&&group.length>1){
          label=String(group.length);
          titleAttr=group.map(g=>g.item.title).join(', ');
        }else{
          label=cat==='music'?(c.item.title||'').slice(0,1):escapeHtml(c.item.title||'');
          titleAttr=(c.item._carried?c.item.title+' (전월부터 이어짐)':c.item.title)+(c.item.status==='stopped'?' · 중단':'');
        }
        cellsHtml+=`<div class="tt-block ${cat}${isWatching?' watching':''}${isStopped?' stopped':''}" style="width:${w}px;min-width:${w}px;" title="${escapeHtml(titleAttr||'')}">${label}</div>`;
        cursor=dispEnd+1;
      });
      for(let d=cursor;d<=daysInMonth;d++)cellsHtml+=`<div class="tt-cell"></div>`;
      rowsHtml+=`<div class="tt-row"><div class="tt-cat-fixed">${catLabel}</div><div class="tt-date-scroll" data-tt="1"><div class="tt-date-inner">${cellsHtml}</div></div></div>`;
    });
  });

  el.innerHTML=`<div class="tt-head-row"><div class="tt-cat-fixed-sp"></div><div class="tt-head-scroll" data-tt="1"><div class="tt-head-dates">${headHtml}</div></div></div><div>${rowsHtml}</div>`;

  // 여러 행(카테고리별 트랙)과 헤더가 각각 독립 스크롤 컨테이너라 가로 스크롤을 서로 동기화
  const allScrolls=el.querySelectorAll('[data-tt]');
  allScrolls.forEach(s=>{
    s.addEventListener('scroll',()=>{
      allScrolls.forEach(o=>{if(o!==s)o.scrollLeft=s.scrollLeft;});
    });
  });
}

// 습관명 키워드 매칭 아이콘 규칙 — 본앱(iikoto index.html) HABIT_ICON_RULES와 동일하게 유지
const HABIT_ICON_RULES=[
  {keywords:['운동','헬스','필라테스','런닝','러닝','조깅'],icon:'ti-run',color:'var(--pal-mint-border)'},
  {keywords:['독서','책'],icon:'ti-book',color:'var(--pal-pink-border)'},
  {keywords:['일기','다이어리','글쓰기'],icon:'ti-pencil-heart',color:'var(--pal-sky-border)'},
  {keywords:['영양제','비타민','약'],icon:'ti-pill',color:'var(--pal-yellow-border)'}
];
function getHabitIcon(name){
  if(!name)return null;
  const rule=HABIT_ICON_RULES.find(r=>r.keywords.some(k=>name.includes(k)));
  return rule?rule.icon:null;
}
const HABIT_COLOR_BORDER_MAP={mint:'var(--pal-mint-border)',pink:'var(--pal-pink-border)',sky:'var(--pal-sky-border)',yellow:'var(--pal-yellow-border)'};
function getHabitIconColor(name,habitColor){
  if(habitColor&&HABIT_COLOR_BORDER_MAP[habitColor])return HABIT_COLOR_BORDER_MAP[habitColor];
  const rule=HABIT_ICON_RULES.find(r=>name&&r.keywords.some(k=>name.includes(k)));
  return rule?rule.color:'var(--tm)';
}
async function renderMonthHabits(y,mo){
  const el=document.getElementById('month-habits');
  const mk=`${y}-${pad(mo+1)}`;
  const daysInMonth=new Date(y,mo+1,0).getDate();
  const [habits,checks]=await Promise.all([
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=gte.${mk}-01&date_key=lte.${mk}-${pad(daysInMonth)}`)
  ]);
  if(!habits||!habits.length){el.innerHTML='<div class="empty-msg">등록된 습관 없음</div>';return;}
  el.innerHTML=`<div class="habit-numbox-grid">${habits.map(h=>{
    const count=(checks||[]).filter(ch=>ch.habit_name===h.name).length;
    const hIcon=getHabitIcon(h.name);
    const iconColor=getHabitIconColor(h.name,h.color);
    const inner=hIcon
      ?`<i class="ti ${hIcon} habit-numbox-icon" style="color:${iconColor};" aria-hidden="true"></i>`
      :`<div class="habit-numbox-name">${escapeHtml(h.name)}</div>`;
    return `<div class="habit-numbox-card">${inner}<div class="habit-numbox-num">${count}</div></div>`;
  }).join('')}</div>`;
}

// 이번 달 미니 통계바 — 주간탭과 동일 스타일(sbar-item/sbar-div), 박스 없이 심플하게
async function renderMonthStatBar(y,mo){
  const mk=`${y}-${pad(mo+1)}`;
  const startDk=`${mk}-01`,endDk=`${mk}-31`;
  const [memos,todos,sleepRows,habits,checks,contents]=await Promise.all([
    supaFetch(`memos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=id`),
    supaFetch(`todos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=done`),
    supaFetch(`sleep?date_key=gte.${startDk}&date_key=lte.${endDk}&select=sleep_time,wake_time`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    supaFetch(`contents?or=(status.in.(done,stopped),content_cat.eq.music)&month_key=eq.${mk}`)
  ]);
  const daysInMonth=new Date(y,mo+1,0).getDate();
  const habitList=habits||[];
  renderStatBar('month-stat-bar',{
    memoCount:(memos||[]).length,
    doneCount:(todos||[]).filter(t=>t.done).length,
    habitCount:habitList.length,
    checkCount:(checks||[]).length,
    habitDenominator:daysInMonth,
    contentCount:countContentsCompletedInRange(contents,startDk,endDk),
    avgSleep:avgSleepHoursFromRows(sleepRows)
  });
}

// 신규: 이번 달 수집한 문장(reading_quotes) — created 타임스탬프 기준, 책 단위로 그룹핑
async function renderMonthQuotes(y,mo){
  const el=document.getElementById('month-quotes');
  const startMs=new Date(y,mo,1,0,0,0,0).getTime();
  const daysInMonth=new Date(y,mo+1,0).getDate();
  const endMs=new Date(y,mo,daysInMonth,23,59,59,999).getTime();
  const rows=await supaFetch(`reading_quotes?created=gte.${startMs}&created=lte.${endMs}&order=created.desc&select=text,created,book_cid,comment`);
  if(!rows||!rows.length){el.innerHTML='<div class="empty-msg">이번 달 수집한 문장이 없어요</div>';return;}
  const bookCids=[...new Set(rows.map(r=>r.book_cid).filter(Boolean))];
  let bookMap={};
  if(bookCids.length){
    const cidFilter=bookCids.map(c=>`"${c}"`).join(',');
    const books=await supaFetch(`reading_books?cid=in.(${cidFilter})&select=cid,title,author,poster`);
    (books||[]).forEach(b=>{bookMap[b.cid]=b;});
  }
  const groups=[];
  const groupIdx={};
  rows.forEach(r=>{
    const key=r.book_cid||'_none';
    if(!(key in groupIdx)){groupIdx[key]=groups.length;groups.push({book_cid:r.book_cid,items:[]});}
    groups[groupIdx[key]].items.push(r);
  });
  // rows가 이미 created desc이므로 각 그룹의 items[0]이 그 책의 최신 문장 -> 그룹 자체도 이미 최신순 순서로 생성됨
  el.innerHTML=groups.map(g=>{
    const b=bookMap[g.book_cid];
    const title=b?.title||'책 미지정';
    const author=b?.author||'';
    const coverHtml=b?.poster?`<img class="mq-book-cover" src="${b.poster}" alt="">`:`<div class="mq-book-cover-fallback"><i class="ti ti-book" aria-hidden="true"></i></div>`;
    const quoteItems=g.items.map(r=>{
      const commentHtml=r.comment?`<div class="mq-quote-comment">${escapeHtml(r.comment)}</div>`:'';
      return `<div class="mq-quote-item">${escapeHtml(r.text||'')}${commentHtml}</div>`;
    }).join('');
    return `<div class="mq-book">${coverHtml}<div class="mq-book-info"><div class="mq-book-title">${escapeHtml(title)}</div>${author?`<div class="mq-book-author">${escapeHtml(author)}</div>`:''}<div class="mq-quote-list">${quoteItems}</div></div></div>`;
  }).join('');
}

// ── 독서 달력 (밀리의 서재 스타일, iikoto 원본 구조 그대로) ──
function rdCalShift(delta){
  _rdCalDate.setMonth(_rdCalDate.getMonth()+delta);
  renderReadingCal().then(lockContentCollectToReadingCal);
}
async function renderReadingCal(){
  const y=_rdCalDate.getFullYear(),m=_rdCalDate.getMonth();
  const mk=`${y}-${pad(m+1)}`;
  document.getElementById('rdcal-month').textContent=`${y}년 ${pad(m+1)}월`;
  const first=new Date(y,m,1);
  const startWeekday=(first.getDay()+6)%7; // 월요일 시작 기준으로 보정
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
  document.getElementById('rdcal-dows').innerHTML=DOW_MON_START.map(d=>`<div class="rdcal-dow">${d}</div>`).join('');

  let gridHtml='';
  for(let i=0;i<startWeekday;i++)gridHtml+='<div></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dk=`${mk}-${pad(d)}`;
    const dayLogs=logsByDate[dk]||[];
    const cids=[...new Set(dayLogs.slice().reverse().map(r=>r.book_cid))];
    if(cids.length){
      // 본앱과 동일: 2권 이상이면 표지를 살짝 겹쳐 보여주고(밀리의 서재 방식) 우하단에 권수 뱃지 표시.
      const cover=bookMap[cids[0]]&&bookMap[cids[0]].poster;
      const cover2=cids.length>1&&bookMap[cids[1]]&&bookMap[cids[1]].poster;
      const innerHtml=`<div style="position:relative;width:34px;height:46px;margin:0 auto;">
        ${cids.length>1?`<div style="position:absolute;top:2px;left:3px;width:34px;height:46px;border-radius:6px;overflow:hidden;background:var(--card);border:1px solid var(--card-b);box-shadow:0 1px 3px rgba(0,0,0,0.15);${cover2?`background-image:url('${cover2}');background-size:cover;background-position:center;`:''}"></div>`:''}
        <div style="position:absolute;top:0;left:0;width:34px;height:46px;border-radius:6px;overflow:hidden;background:var(--card);border:1px solid var(--card-b);${cids.length>1?'box-shadow:-1px 1px 4px rgba(0,0,0,0.18);':''}${cover?`background-image:url('${cover}');background-size:cover;background-position:center;`:''}"></div>
        ${cids.length>1?`<div style="position:absolute;bottom:-4px;right:-4px;background:rgba(60,40,35,0.85);color:#fff;font-size:9px;font-weight:600;border-radius:7px;min-width:14px;height:14px;display:flex;align-items:center;justify-content:center;padding:0 3px;z-index:2;">${cids.length}</div>`:''}
      </div>`;
      gridHtml+=`<div>${innerHtml}</div>`;
    }else{
      gridHtml+=`<div class="rdcal-num">${d}</div>`;
    }
  }
  document.getElementById('rdcal-grid').innerHTML=gridHtml;
}


// ── 채움 로그 타임라인(월간탭, 독서달력 옆) — 이이코토 본앱 chaeum-log-tl 디자인 그대로, 읽기 전용 요약 리스트 ──
function chaeumDateShort(dk){
  const m=(dk||'').match(/^\d{4}-(\d{2})-(\d{2})/);
  return m?m[1]+'.'+m[2]:(dk||'');
}
async function renderChaeumLogTablet(){
  const tlEl=document.getElementById('chaeum-log-tl');
  if(!tlEl)return;
  const sessions=await chaeumFetch('sessions?select=id,date_key,category,title,status&order=created_at.desc&limit=10');
  if(sessions==null){
    tlEl.innerHTML='<div class="empty-msg">채움 기록을 불러오지 못했어요</div>';
    return;
  }
  if(!sessions.length){
    tlEl.innerHTML='<div class="empty-msg">아직 채움 기록이 없어요</div>';
    return;
  }
  tlEl.innerHTML=sessions.map(s=>
    `<div class="chaeum-log-item">`+
      `<div class="chaeum-log-date">${chaeumDateShort(s.date_key)}</div>`+
      `<div class="chaeum-log-line-wrap"><div class="chaeum-log-dot${s.status==='completed'?'':' ing'}"></div></div>`+
      `<div class="chaeum-log-txt">`+
        `<div class="chaeum-log-txt-title">${escapeHtml(s.title||'')}</div>`+
        `<div class="chaeum-log-txt-cat">${escapeHtml(s.category||'')}</div>`+
      `</div>`+
    `</div>`
  ).join('');
}

// ══════════════════════════════════════════════════════════
// 설정탭 — 글자 크기 조절(작게/기본/크게 3단계, 본앱과 동일한 textScale 저장 키/step 체계)
// ══════════════════════════════════════════════════════════
const FS_STEPS={'-1':{title:16,body:15},'0':{title:17,body:16},'1':{title:18,body:17}};
function _loadFsStep(){
  try{
    const raw=localStorage.getItem('textScale');
    const n=raw?JSON.parse(raw):0;
    return(n===-1||n===0||n===1)?n:0;
  }catch(e){return 0;}
}
let _fsStep=_loadFsStep();
function _applyFontSizes(){
  const b=FS_STEPS[String(_fsStep)]||FS_STEPS['0'];
  document.documentElement.style.setProperty('--fs-title',b.title+'px');
  document.documentElement.style.setProperty('--fs-body',b.body+'px');
  // 본앱에서 생성된 리포트 HTML(메모리포트, 주간종합 등)은 --main-text-size/--dow-label-size 인라인 스타일을
  // 그대로 갖고 있어, 이 두 변수를 --fs-body/--fs-sm과 동기화해둬야 태블릿에서도 폰트 조절이 반영됨.
  document.documentElement.style.setProperty('--main-text-size',b.body+'px');
  document.documentElement.style.setProperty('--dow-label-size',(b.body-1.5)+'px');
}
function setFontScale(step){
  if(step!==-1&&step!==0&&step!==1)return;
  _fsStep=step;
  localStorage.setItem('textScale',JSON.stringify(step));
  _applyFontSizes();
}
function adjustFontSize(dir){
  const next=Math.max(-1,Math.min(1,_fsStep+dir));
  if(next===_fsStep)return;
  setFontScale(next);
}
function resetFontSize(){
  setFontScale(0);
}

// ══════════════════════════════════════════════════════════
// Claude API 키 — 본앱과 동일한 방식(브라우저 localStorage에만 저장, 서버 전송 없음).
// 월간리포트 "이 달의 마디" 분석에만 사용. 태블릿은 이 하나의 용도로만 씀.
// ══════════════════════════════════════════════════════════
function getClaudeKey(){return localStorage.getItem('claude_api_key')||'';}
function saveClaudeApiKey(){
  const input=document.getElementById('claude-api-key-input');
  const statusEl=document.getElementById('api-key-status');
  const key=(input.value||'').trim();
  if(!key){
    localStorage.removeItem('claude_api_key');
    statusEl.textContent='키를 비워서 저장했어요';
    statusEl.classList.remove('saved');
    return;
  }
  localStorage.setItem('claude_api_key',key);
  input.value='';
  input.placeholder='저장됨 (••••••••)';
  statusEl.textContent='저장했어요';
  statusEl.classList.add('saved');
}
function _loadClaudeKeyStatus(){
  const input=document.getElementById('claude-api-key-input');
  if(!input)return;
  if(getClaudeKey())input.placeholder='저장됨 (••••••••)';
}
// 본앱 callClaude와 동일한 방식(브라우저에서 Anthropic API 직접 호출). 태블릿 전용 용도라 timeout/모델만 그대로 이식.
async function callClaudeFromTablet(systemPrompt,userContent,maxTokens){
  const key=getClaudeKey();
  if(!key)return null;
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),30000);
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      signal:controller.signal,
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-haiku-4-5',max_tokens:maxTokens||500,system:systemPrompt,messages:[{role:'user',content:userContent}]})
    });
    clearTimeout(timer);
    if(!res.ok)return null;
    const data=await res.json();
    return (data.content&&data.content[0]&&data.content[0].text)||null;
  }catch(e){return null;}
}

// ══════════════════════════════════════════════════════════
// 리포트탭 — 월간종합/주간종합/주간습관(챌린지리뷰)/주간메모, 월 단위로 모아보기
// ══════════════════════════════════════════════════════════
let _reportMonthDate=new Date();
let _reportFilter='all';
const REPORT_READ_KEY='tablet_report_read'; // localStorage에 읽은 cache_key 집합 저장

function _loadReadReports(){
  try{
    const raw=localStorage.getItem(REPORT_READ_KEY);
    return raw?new Set(JSON.parse(raw)):new Set();
  }catch(e){return new Set();}
}
function _saveReadReports(set){
  try{localStorage.setItem(REPORT_READ_KEY,JSON.stringify([...set]));}catch(e){}
}
function _markReportRead(cacheKey){
  const set=_loadReadReports();
  if(set.has(cacheKey))return;
  set.add(cacheKey);
  _saveReadReports(set);
}
function _isReportRead(cacheKey){
  return _loadReadReports().has(cacheKey);
}

// 본앱과 동일한 "월 소속 주차" 판정: 그 주(월요일 시작)의 목요일이 해당 (y,mo)에 속할 때만 그 달 소속으로 인정.
// 예: 8/31~9/6 주는 목요일이 9/3이라 9월 소속(월요일만 8월이어도 9월로 잡힘).
function getReportWeeksOfMonth(y,mo){
  const dim=new Date(y,mo+1,0).getDate();
  const weekSet={};
  for(let d=1;d<=dim;d++){
    const date=new Date(y,mo,d);
    const wk=weekKeyOf(date);
    const wkStart=new Date(wk+'T00:00:00');
    const wkThu=new Date(wkStart);wkThu.setDate(wkStart.getDate()+3);
    if(wkThu.getFullYear()===y&&wkThu.getMonth()===mo)weekSet[wk]=true;
  }
  return Object.keys(weekSet).sort();
}
function _weekRangeLabel(wk){
  const start=new Date(wk+'T00:00:00');
  const end=new Date(start);end.setDate(start.getDate()+6);
  return `${start.getMonth()+1}.${start.getDate()}~${end.getMonth()+1}.${end.getDate()}`;
}
// weeksInMonth는 각 주의 월요일 날짜(예:'2026-08-17'). 리포트 종류별로 본앱이 실제 쓰는 캐시 키 포맷이 다름:
// - weekly_summary_ : 그 주의 "일요일" 날짜(dateKey, 접두사 없음) — 예: weekly_summary_2026-08-23
// - challenge_review_ / weekly_memo_report_ : weekKey() 리턴값 그대로(월요일 날짜 + 'week:' 접두사) — 예: challenge_review_week:2026-08-17
function _mondayToSundayDk(mondayDk){
  const d=new Date(mondayDk+'T00:00:00');d.setDate(d.getDate()+6);
  return dateKey(d);
}
function shiftReportMonth(delta){
  _reportMonthDate.setMonth(_reportMonthDate.getMonth()+delta);
  loadReportsTab();
}
function setReportFilter(filter){
  _reportFilter=filter;
  document.querySelectorAll('.report-filter-chip').forEach(el=>el.classList.toggle('on',el.dataset.filter===filter));
  document.querySelectorAll('.report-sec').forEach(el=>{
    const sec=el.dataset.sec;
    const show=filter==='all'
      ||(filter==='monthly'&&sec==='summary')
      ||(filter==='weekly'&&sec==='summary')
      ||(filter==='habit'&&sec==='habit')
      ||(filter==='memo'&&sec==='memo');
    el.classList.toggle('hidden',!show);
  });
  // 종합 섹션 내부는 월간/주간 필터에 따라 리스트 아이템 단위로도 걸러줌
  if(filter==='monthly'||filter==='weekly'){
    document.querySelectorAll('#report-summary-list [data-kind]').forEach(el=>{
      el.style.display=(el.dataset.kind===filter)?'':'none';
    });
  }else{
    document.querySelectorAll('#report-summary-list [data-kind]').forEach(el=>{el.style.display='';});
  }
}
async function loadReportsTab(){
  const y=_reportMonthDate.getFullYear(),mo=_reportMonthDate.getMonth();
  document.getElementById('report-page-title').textContent=`${y}년 ${mo+1}월`;
  const weeksInMonth=getReportWeeksOfMonth(y,mo);
  const mk=monthKeyOf(_reportMonthDate);

  const [monthlyRows,...weeklyRowsList]=await Promise.all([
    supaFetch(`ai_cache?cache_key=eq.monthly_report_${mk}&select=cache_key,content,expires_at`),
    ...weeksInMonth.map(wk=>supaFetch(`ai_cache?cache_key=eq.weekly_summary_${_mondayToSundayDk(wk)}&select=cache_key,content,expires_at`))
  ]);
  const habitRowsList=await Promise.all(weeksInMonth.map(wk=>supaFetch(`ai_cache?cache_key=eq.${encodeURIComponent('challenge_review_week:'+wk)}&select=cache_key,content,expires_at`)));
  const memoRowsList=await Promise.all(weeksInMonth.map(wk=>supaFetch(`ai_cache?cache_key=eq.${encodeURIComponent('weekly_memo_report_week:'+wk)}&select=cache_key,content,expires_at`)));

  renderReportSummaryList(monthlyRows,weeksInMonth,weeklyRowsList,mk);
  renderReportBoxGrid('report-habit-grid',weeksInMonth,habitRowsList,'habit');
  renderReportBoxGrid('report-memo-grid',weeksInMonth,memoRowsList,'memo');
  setReportFilter(_reportFilter);
  _updateSideReportBadge();
}
function renderReportSummaryList(monthlyRows,weeksInMonth,weeklyRowsList,mk){
  const el=document.getElementById('report-summary-list');
  const items=[];
  const mkYear=parseInt(mk.slice(0,4),10),mkMonth=parseInt(mk.slice(5,7),10)-1;
  const monthlyRow=monthlyRows&&monthlyRows[0];
  if(monthlyRow){
    const cacheKey=monthlyRow.cache_key;
    const read=_isReportRead(cacheKey);
    items.push({cacheKey,kind:'monthly',read,year:mkYear,month:mkMonth,
      icon:'ti-calendar',iconBg:'rgba(255,225,120,0.55)',iconColor:'var(--pal-yellow-border)',
      title:`${mk.slice(5,7).replace(/^0/,'')}월 월간종합 리포트`,sub:`${mk.slice(0,4)}년 ${mk.slice(5,7).replace(/^0/,'')}월 전체 흐름 정리`});
  }
  weeksInMonth.slice().reverse().forEach((wk,i)=>{
    const idx=weeksInMonth.indexOf(wk);
    const rows=weeklyRowsList[idx];
    const row=rows&&rows[0];
    if(!row)return;
    const cacheKey=row.cache_key;
    const read=_isReportRead(cacheKey);
    items.push({cacheKey,kind:'weekly',read,
      icon:'ti-sparkles',iconBg:'rgba(210,175,225,0.5)',iconColor:'var(--pal-lavender-border)',
      title:`${(idx+1)}주차 주간종합 리포트`,sub:_weekRangeLabel(wk)});
  });
  if(!items.length){el.innerHTML='<div class="empty-msg">이 달엔 아직 발행된 종합 리포트가 없어요</div>';return;}
  el.innerHTML=items.map(it=>{
    // 월간종합은 팝업이 아니라 전체페이지(아카이브)로, 나머지(주간종합 등)는 기존처럼 팝업으로 연다.
    const onclick=it.kind==='monthly'
      ?`openMonthlyReportPage(${it.year},${it.month})`
      :`openReportFromList('${it.cacheKey}','${escapeHtml(it.title)}')`;
    return `
    <div class="report-list-item${it.read?' read':''}" data-kind="${it.kind}" onclick="${onclick}">
      <div class="report-list-dot"></div>
      <div class="report-list-icon" style="background:${it.iconBg};"><i class="ti ${it.icon}" style="color:${it.iconColor};" aria-hidden="true"></i></div>
      <div class="report-list-body">
        <div class="report-list-title">${escapeHtml(it.title)}</div>
        <div class="report-list-sub">${escapeHtml(it.sub)}</div>
      </div>
      <i class="ti ti-chevron-right" aria-hidden="true"></i>
    </div>`;
  }).join('');
}
function openReportFromList(cacheKey,title){
  _markReportRead(cacheKey);
  openReportPanel(cacheKey,title);
  loadReportsTab();
}
// HTML 문자열에서 첫 굵은글씨(한줄요약) 블록과 나머지 본문을 분리
function _parseReportPreview(html){
  const div=document.createElement('div');
  div.innerHTML=html;
  const children=[...div.children];
  if(!children.length)return{headline:null,bodyText:div.textContent||''};
  const first=children[0];
  const isBold=first.style&&(first.style.fontWeight==='600'||first.style.fontWeight==='bold');
  if(isBold){
    const headline=first.textContent||'';
    const rest=children.slice(1).map(c=>c.textContent||'').join(' ').trim();
    return{headline,bodyText:rest};
  }
  return{headline:null,bodyText:div.textContent||''};
}
function renderReportBoxGrid(elId,weeksInMonth,rowsList,type){
  const el=document.getElementById(elId);
  const meta=type==='habit'
    ?{icon:'ti-target-arrow',iconBg:'rgba(145,210,175,0.5)',iconColor:'var(--pal-mint-border)'}
    :{icon:'ti-notes',iconBg:'rgba(170,208,228,0.5)',iconColor:'var(--pal-sky-border)'};
  if(!weeksInMonth.length){el.innerHTML='<div class="empty-msg">이 달엔 해당 주차가 없어요</div>';return;}
  el.innerHTML=weeksInMonth.slice().reverse().map((wk,i)=>{
    const idx=weeksInMonth.indexOf(wk);
    const rows=rowsList[idx];
    const row=rows&&rows[0];
    const wkNo=idx+1;
    if(!row||!row.content){
      return `<div class="report-box empty"><div class="report-box-empty-txt">아직 없어요</div></div>`;
    }
    const cacheKey=row.cache_key;
    const read=_isReportRead(cacheKey);
    const title=`${wkNo}주차 ${type==='habit'?'습관 리뷰':'메모 리포트'}`;
    const{headline,bodyText}=_parseReportPreview(row.content);
    const bodyHtml=headline
      ?`<div class="report-box-body headline-only"><div class="report-box-headline">${escapeHtml(headline)}</div></div>`
      :`<div class="report-box-body text-preview"><div class="report-box-preview-txt">${escapeHtml(bodyText)}</div></div>`;
    return `<div class="report-box${read?' read':''}" onclick="openReportBoxDetail('${cacheKey}','${escapeHtml(title)}',this)">
      ${read?'':'<div class="report-box-dot"></div>'}
      <div class="report-box-hdr">
        <div class="report-box-icon" style="background:${meta.iconBg};"><i class="ti ${meta.icon}" style="color:${meta.iconColor};" aria-hidden="true"></i></div>
        <div><div class="report-box-wk">${wkNo}주차</div><div class="report-box-range">${_weekRangeLabel(wk)}</div></div>
      </div>
      ${bodyHtml}
      <div class="report-box-ellipsis">···</div>
    </div>`;
  }).join('');
}
function openReportBoxDetail(cacheKey,title,el){
  _markReportRead(cacheKey);
  if(el){el.classList.add('read');const dot=el.querySelector('.report-box-dot');if(dot)dot.remove();}
  document.getElementById('report-panel-title').innerHTML=`<i class="ti ti-sparkles" aria-hidden="true"></i>${title}`;
  const bodyEl=document.getElementById('report-panel-body');
  bodyEl.innerHTML='<div class="loading-msg">불러오는 중...</div>';
  document.getElementById('report-overlay').classList.add('on');
  supaFetch(`ai_cache?cache_key=eq.${encodeURIComponent(cacheKey)}&select=content`).then(rows=>{
    const content=rows&&rows[0]&&rows[0].content;
    bodyEl.innerHTML=content?`<div class="mr-ai-comment">${content}</div>`:'<div class="empty-msg">내용을 불러오지 못했어요</div>';
  });
  _updateSideReportBadge();
}
async function _updateSideReportBadge(){
  const dot=document.getElementById('side-logo-dot');
  if(!dot)return;
  const y=new Date().getFullYear(),mo=new Date().getMonth();
  const weeksInMonth=getReportWeeksOfMonth(y,mo);
  const mk=monthKeyOf(new Date());
  const keys=[`monthly_report_${mk}`,...weeksInMonth.map(wk=>`weekly_summary_${_mondayToSundayDk(wk)}`),...weeksInMonth.map(wk=>`challenge_review_week:${wk}`),...weeksInMonth.map(wk=>`weekly_memo_report_week:${wk}`)];
  const rows=await supaFetch(`ai_cache?cache_key=in.(${keys.map(encodeURIComponent).join(',')})&select=cache_key`);
  const existing=(rows||[]).map(r=>r.cache_key);
  const readSet=_loadReadReports();
  const unreadCount=existing.filter(k=>!readSet.has(k)).length;
  dot.classList.toggle('on',unreadCount>0);
}

// ══════════════════════════════════════════════════════════
// 초기화
// ══════════════════════════════════════════════════════════
async function init(){
  initSidebarCollapse();
  _applyFontSizes();
  await renderMiniCal();
  scheduleSideGreetingRefresh();
  await loadTodayTab();
  _updateSideReportBadge();
}
init();

// 태블릿을 오래 켜둔 채로 자정을 넘기는 경우를 위한 안전장치:
// 화면이 다시 포그라운드로 돌아왔을 때, 오늘탭을 보고 있고 날짜가 바뀌었으면 자동 갱신
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible')return;
  renderSideGreeting();
  if(_currentTab!=='today')return;
  const now=new Date();
  if(dateKey(now)!==dateKey(_selectedDate)){
    _selectedDate=now;
    loadTodayTab();
    renderMiniCal();
  }
});

// ══════════════════════════════════════════════════════════
// 월간리포트 전체페이지 — 리포트탭 "N월 월간종합 리포트" 클릭시에만 진입하는 아카이브 페이지.
// 팝업이 아니라 사이드바 제외한 전체 영역을 쓰는 신문형 레이아웃(AI 코멘트가 헤드라인, 나머지 섹션이 본문).
// 플로팅탭 메뉴엔 노출하지 않고, 진입/이탈을 별도 함수로 관리(switchTab의 float-tab 갱신 로직과 분리).
// ══════════════════════════════════════════════════════════
let _mrpDate=new Date();
let _mrpReturnTab='reports';
function openMonthlyReportPage(y,mo){
  _mrpReturnTab=_currentTab;
  _mrpDate=new Date(y,mo,1);
  _markReportRead(`monthly_report_${monthKeyOf(_mrpDate)}`);
  document.querySelectorAll('.main-body').forEach(el=>el.classList.remove('on'));
  document.getElementById('tab-monthly-report').classList.add('on');
  _currentTab='monthly-report';
  loadMonthlyReportPage();
}
function closeMonthlyReportPage(){
  document.querySelectorAll('.main-body').forEach(el=>el.classList.remove('on'));
  document.getElementById('tab-'+_mrpReturnTab).classList.add('on');
  document.getElementById('ft-'+_mrpReturnTab).classList.add('on');
  _currentTab=_mrpReturnTab;
  if(_mrpReturnTab==='reports')loadReportsTab();
}
function shiftMonthlyReportPage(delta){
  _mrpDate.setMonth(_mrpDate.getMonth()+delta);
  loadMonthlyReportPage();
}
// 콘텐츠 카테고리 도트 색상 — CAT_ICON_META의 배경색을 그대로 점 색으로 재사용
function _mrpCatDotColor(cat){
  const meta=CAT_ICON_META[cat];
  return meta?meta.bg:'rgba(var(--pal-warmgray-rgb),0.6)';
}
function _mrpStatusLabel(c){
  if(c.status==='watching')return '진행중';
  if(c.status==='stopped')return '중단';
  return '완료';
}
async function loadMonthlyReportPage(){
  const y=_mrpDate.getFullYear(),mo=_mrpDate.getMonth();
  const mk=monthKeyOf(_mrpDate);
  document.getElementById('mrp-title').textContent=`${y}년 ${mo+1}월 리포트`;

  const startDk=`${mk}-01`;
  const dim=new Date(y,mo+1,0).getDate();
  const endDk=`${mk}-${pad(dim)}`;
  const weeksInMonth=getReportWeeksOfMonth(y,mo);

  // 전월 동기간(같은 일수)도 함께 가져와 리듬 비교에 사용
  const prevMonthDate=new Date(y,mo-1,1);
  const py=prevMonthDate.getFullYear(),pmo=prevMonthDate.getMonth();
  const prevMk=monthKeyOf(prevMonthDate);
  const prevDim=Math.min(dim,new Date(py,pmo+1,0).getDate());
  const prevStartDk=`${prevMk}-01`,prevEndDk=`${prevMk}-${pad(prevDim)}`;
  const prevWeeksInMonth=getReportWeeksOfMonth(py,pmo);

  const [monthlyRows,goalRows,todos,memosRows,sleepRows,habits,habitChecksAll,rblocks,prevRblocks,contents,prevContents,wcRowsList,milestoneRows,prevWcRowsList,prevTodos,prevSleepRows,prevHabitChecksAll,trajectoryRows]=await Promise.all([
    supaFetch(`ai_cache?cache_key=eq.monthly_report_${mk}&select=content`),
    supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('mgoal:'+mk)}`),
    supaFetch(`todos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=done,date_key`),
    supaFetch(`memos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=id`),
    supaFetch(`sleep?date_key=gte.${startDk}&date_key=lte.${endDk}&select=sleep_time,wake_time,date_key`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    supaFetch(`rhythm_blocks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    supaFetch(`rhythm_blocks?date_key=gte.${prevStartDk}&date_key=lte.${prevEndDk}`),
    supaFetch(`contents?or=(status.in.(done,stopped),content_cat.eq.music)&order=created.desc&limit=200`),
    supaFetch(`contents?or=(status.in.(done,stopped),content_cat.eq.music)&order=created.desc&limit=200`),
    Promise.all(weeksInMonth.map(wk=>supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('wchallenge_week:'+wk)}`))),
    supaFetch(`ai_cache?cache_key=eq.${encodeURIComponent('monthly_milestones_'+mk)}&select=content`),
    Promise.all(prevWeeksInMonth.map(wk=>supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('wchallenge_week:'+wk)}`))),
    supaFetch(`todos?date_key=gte.${prevStartDk}&date_key=lte.${prevEndDk}&select=done,date_key`),
    supaFetch(`sleep?date_key=gte.${prevStartDk}&date_key=lte.${prevEndDk}&select=sleep_time,wake_time,date_key`),
    supaFetch(`habit_checks?date_key=gte.${prevStartDk}&date_key=lte.${prevEndDk}`),
    supaFetch(`ai_cache?cache_key=eq.${encodeURIComponent('monthly_trajectory_'+mk)}&select=content`)
  ]);

  renderMrpHero(monthlyRows&&monthlyRows[0]);
  renderMrpGoalsAndStats(goalRows&&goalRows[0],todos||[],memosRows||[],sleepRows||[],habits||[],habitChecksAll||[],weeksInMonth.length*7||dim);
  const heroCommentText=_mrpExtractHeroComment(monthlyRows&&monthlyRows[0]);
  renderMrpTrajectory(mk,todos||[],sleepRows||[],habits||[],habitChecksAll||[],weeksInMonth,
    {todos:prevTodos||[],sleepRows:prevSleepRows||[],habitChecks:prevHabitChecksAll||[],weeksInMonth:prevWeeksInMonth,habits:habits||[]},
    trajectoryRows&&trajectoryRows[0],heroCommentText);
  renderMrpRhythm(rblocks||[],prevRblocks||[]);
  renderMrpMilestones(mk,rblocks||[],prevRblocks||[],weeksInMonth,wcRowsList||[],milestoneRows&&milestoneRows[0],prevWcRowsList||[],heroCommentText);
  renderMrpWeeklyMissions(weeksInMonth,wcRowsList||[]);
  renderMrpContents(contents||[],startDk,endDk);
  renderMrpReportLinks(weeksInMonth,mk);
}

// "이 달 한눈에"(monthly_report_ 캐시)에서 순수 코멘트 텍스트만 뽑아옴 — 마디/궤적 AI가 맥락 참고용으로 사용
function _mrpExtractHeroComment(row){
  if(!row||!row.content)return '';
  try{
    const report=JSON.parse(row.content);
    return report&&report.comment?report.comment:'';
  }catch(e){
    return typeof row.content==='string'?row.content:'';
  }
}
function renderMrpHero(row){
  const el=document.getElementById('mrp-body');
  // 최초 렌더 시 전체 골격을 한 번에 잡고, 이후 각 render 함수가 자기 섹션의 innerHTML만 채움
  if(!document.getElementById('mrp-hero-slot')){
    el.innerHTML=`
      <div class="mrp-hero" id="mrp-hero-slot"></div>
      <div class="mrp-grid2" style="margin-bottom:14px;">
        <div class="mrp-card"><div class="mrp-card-title"><i class="ti ti-flag-3" style="color:rgba(178,60,105,0.85);" aria-hidden="true"></i>이 달의 목표</div><div id="mrp-goals"></div></div>
        <div class="mrp-card"><div class="mrp-card-title"><i class="ti ti-chart-donut" style="color:rgba(var(--pal-mint-rgb),1);" aria-hidden="true"></i>이 달의 숫자</div><div id="mrp-stats"></div></div>
      </div>
      <div class="mrp-card" style="margin-bottom:14px;"><div class="mrp-card-title"><i class="ti ti-chart-line" style="color:rgba(var(--pal-mint-rgb),1);" aria-hidden="true"></i>이 달의 궤적</div><div id="mrp-traj"></div></div>
      <div class="mrp-card" style="margin-bottom:14px;">
        <div class="mrp-card-title"><i class="ti ti-rainbow" style="color:rgba(var(--pal-orange-rgb),1);" aria-hidden="true"></i>이 달의 리듬</div>
        <div id="mrp-rhythm"></div>
        <div id="mrp-milestones" style="margin-top:16px;"></div>
      </div>
      <div class="mrp-grid2">
        <div class="mrp-card"><div class="mrp-card-title"><i class="ti ti-flag-3" style="color:rgba(210,175,225,1);" aria-hidden="true"></i>주간 미션 모음</div><div id="mrp-missions"></div></div>
        <div class="mrp-card mrp-contents-card"><div class="mrp-card-title"><i class="ti ti-book" style="color:rgba(178,60,105,0.75);" aria-hidden="true"></i>이 달의 콘텐츠</div><div id="mrp-contents"></div></div>
      </div>
      <div class="mrp-links-wrap"><div id="mrp-report-links"></div></div>
    `;
  }
  const heroEl=document.getElementById('mrp-hero-slot');
  if(!row||!row.content){
    heroEl.innerHTML=`<div class="mrp-hero-eyebrow"><i class="ti ti-sparkles" aria-hidden="true"></i>이 달 한눈에</div><div class="mrp-hero-comment" style="opacity:.6;">이 달의 종합 리포트가 아직 발행되지 않았어요</div>`;
    return;
  }
  try{
    const report=JSON.parse(row.content);
    heroEl.innerHTML=`<div class="mrp-hero-eyebrow"><i class="ti ti-sparkles" aria-hidden="true"></i>이 달 한눈에</div>
      <div class="mrp-hero-comment">${escapeHtml(report.comment||'')}</div>
      ${report.keywords&&report.keywords.length?`<div class="mr-tag-cloud">${report.keywords.map(k=>`<span class="mr-tag">${escapeHtml(k)}</span>`).join('')}</div>`:''}`;
  }catch(e){
    heroEl.innerHTML=`<div class="mrp-hero-eyebrow"><i class="ti ti-sparkles" aria-hidden="true"></i>이 달 한눈에</div><div class="mrp-hero-comment">${row.content}</div>`;
  }
}

// 목표(왼쪽)와 숫자(오른쪽)를 반반 배치 — 목표만 두면 배너가 비어 보여 숫자 카드와 짝지음
function renderMrpGoalsAndStats(goalRow,todos,memos,sleepRows,habits,habitChecks,habitDenominator){
  const goalsEl=document.getElementById('mrp-goals');
  // mgoal: 캐시는 wchallenge_(주간챌린지)와 저장 구조가 다름 — lines가 {text,days}[] 객체 배열이 아니라 순수 문자열 배열(string[]).
  const lines=(goalRow&&Array.isArray(goalRow.lines))?goalRow.lines.filter(l=>l&&typeof l==='string'&&l.trim()):[];
  goalsEl.innerHTML=lines.length?lines.map(l=>`<div class="mrp-goal-line">${escapeHtml(l)}</div>`).join(''):'<div class="empty-msg">등록된 목표가 없어요</div>';

  const statsEl=document.getElementById('mrp-stats');
  const doneTodos=todos.filter(t=>t.done).length;
  const habitPct=habits.length?Math.round(habitChecks.length/(habits.length*habitDenominator)*100):0;
  const avgSleep=avgSleepHoursFromRows(sleepRows);
  statsEl.innerHTML=`<div class="mrp-stat-row">
    <div class="mrp-stat"><div class="v">${doneTodos}개</div><div class="l">투두 완료</div></div>
    <div class="mrp-stat"><div class="v">${habitPct}%</div><div class="l">습관 달성률</div></div>
    <div class="mrp-stat"><div class="v">${avgSleep?avgSleep+'h':'-'}</div><div class="l">평균 수면</div></div>
  </div>`;
}

// 이 달의 궤적 — 주차별 값을 부드러운 곡선(spline)으로 이어 "월 안에서의 오르내림"을 보여줌.
// 꺾은선(polyline) 대신 Catmull-Rom 기반 3차 베지어로 부드럽게.
function _mrpSmoothPath(points){
  if(points.length<2)return '';
  if(points.length===2)return `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`;
  let d=`M${points[0][0]},${points[0][1]}`;
  for(let i=0;i<points.length-1;i++){
    const p0=points[i===0?0:i-1],p1=points[i],p2=points[i+1],p3=points[i+2===points.length?i+1:i+2];
    const cp1x=p1[0]+(p2[0]-p0[0])/6,cp1y=p1[1]+(p2[1]-p0[1])/6;
    const cp2x=p2[0]-(p3[0]-p1[0])/6,cp2y=p2[1]-(p3[1]-p1[1])/6;
    d+=` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}
// 세 지표를 하나의 웨이브 그래프에 겹쳐 표시 — 각 지표는 자기 자신의 이번 달 최소~최대 범위 안에서 정규화한
// "상대적 위치"이며 절대 눈금이 아님(단위가 %/시간으로 서로 다르기 때문). 절대값은 하단 tail-vals에 별도 표기.
function _mrpWaveSvg(rows,weekCount){
  const H=110,padTop=8,padBottom=8,plotH=H-padTop-padBottom;
  const stepX=380/Math.max(1,weekCount-1);
  const legendHtml=`<div class="mrp-wave-legend">`+rows.map(r=>
    `<span><i style="background:rgba(${r.color},0.95);"></i>${r.label}</span>`
  ).join('')+`</div>`;

  let defsHtml='',pathsHtml='',dotsHtml='';
  const validRows=rows.filter(r=>r.values.some(v=>v!=null));
  if(!validRows.length){
    return legendHtml+'<div class="empty-msg" style="text-align:left;padding:8px 0;">이 달엔 표시할 기록이 없어요</div>';
  }
  validRows.forEach((r,idx)=>{
    const valid=r.values.map((v,i)=>({v,i})).filter(o=>o.v!=null);
    const vs=valid.map(o=>o.v);
    const min=Math.min(...vs),max=Math.max(...vs);
    const range=max-min||1;
    const pts=valid.map(o=>{
      const x=10+o.i*stepX;
      const y=padTop+plotH-((o.v-min)/range)*plotH;
      return [x,y];
    });
    if(pts.length<1)return;
    const gid=`mrpWave${idx}`;
    defsHtml+=`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(${r.color},0.36)"/><stop offset="100%" stop-color="rgba(${r.color},0)"/></linearGradient>`;
    if(pts.length>1){
      const linePath=_mrpSmoothPath(pts);
      const areaPath=`${linePath} L${pts[pts.length-1][0]},${H} L${pts[0][0]},${H} Z`;
      pathsHtml+=`<path d="${areaPath}" fill="url(#${gid})"/><path d="${linePath}" fill="none" stroke="rgba(${r.color},1)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const last=pts[pts.length-1];
    dotsHtml+=`<circle cx="${last[0]}" cy="${last[1]}" r="4.2" fill="rgba(${r.color},1)"/>`;
  });

  const weekLabels=Array.from({length:weekCount},(_,i)=>`<span>${i+1}주차</span>`).join('');
  const tailVals=rows.map(r=>{
    const lastValid=[...r.values].reverse().find(v=>v!=null);
    return `<div class="mrp-wave-tail-item"><div class="n">${lastValid!=null?r.fmt(lastValid):'-'}</div><div class="l">${r.label}</div></div>`;
  }).join('');

  return legendHtml+
    `<div class="mrp-wave-wrap"><svg viewBox="0 0 400 ${H}" preserveAspectRatio="none">${`<defs>${defsHtml}</defs>`}${pathsHtml}${dotsHtml}</svg></div>`+
    `<div class="mrp-wave-labels">${weekLabels}</div>`+
    `<div class="mrp-wave-tail">${tailVals}</div>`;
}
async function renderMrpTrajectory(mk,todos,sleepRows,habits,habitChecks,weeksInMonth,prevData,cacheRow,heroComment){
  const el=document.getElementById('mrp-traj');
  if(!weeksInMonth.length){el.innerHTML='<div class="empty-msg">이 달엔 표시할 주차가 없어요</div>';return;}

  const calcWeekly=(todos,sleepRows,habits,habitChecks,weeksInMonth)=>{
    const byWeekTodo=weeksInMonth.map(wk=>{
      const days=getWeekDates(new Date(wk+'T00:00:00'));
      const inWeek=todos.filter(t=>days.includes(t.date_key));
      return inWeek.length?Math.round(inWeek.filter(t=>t.done).length/inWeek.length*100):null;
    });
    const byWeekSleep=weeksInMonth.map(wk=>{
      const days=getWeekDates(new Date(wk+'T00:00:00'));
      const rows=sleepRows.filter(r=>days.includes(r.date_key));
      const h=parseFloat(avgSleepHoursFromRows(rows));
      return isNaN(h)?null:h;
    });
    const byWeekHabit=weeksInMonth.map(wk=>{
      const days=getWeekDates(new Date(wk+'T00:00:00'));
      if(!habits.length)return null;
      const checks=habitChecks.filter(c=>days.includes(c.date_key));
      return Math.round(checks.length/(habits.length*7)*100);
    });
    return {byWeekTodo,byWeekSleep,byWeekHabit};
  };

  const {byWeekTodo,byWeekSleep,byWeekHabit}=calcWeekly(todos,sleepRows,habits,habitChecks,weeksInMonth);

  const rows=[
    {key:'habit',label:'습관율',values:byWeekHabit,color:'145,210,175',fmt:v=>v+'%'},
    {key:'sleep',label:'평균수면',values:byWeekSleep,color:'170,208,228',fmt:v=>v.toFixed(1)+'h'},
    {key:'todo',label:'투두완료율',values:byWeekTodo,color:'210,175,225',fmt:v=>v+'%'}
  ];
  el.innerHTML=_mrpWaveSvg(rows,weeksInMonth.length)+`<div id="mrp-traj-ai" style="margin-top:14px;"></div>`;

  // ── AI 궤적 분석 ──
  const aiEl=document.getElementById('mrp-traj-ai');
  const validWeekCount=(vals)=>vals.filter(v=>v!=null).length;
  const enoughData=Math.max(validWeekCount(byWeekHabit),validWeekCount(byWeekSleep),validWeekCount(byWeekTodo))>=2;
  if(!enoughData){aiEl.innerHTML='';return;}

  if(cacheRow&&cacheRow.content){
    aiEl.innerHTML=`<div class="mrp-traj-ai-text">${escapeHtml(cacheRow.content)}</div>`;
    return;
  }
  const apiKey=getClaudeKey();
  if(!apiKey){
    aiEl.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">이 달의 궤적 분석은 설정 탭에서 Claude API 키를 추가하면 볼 수 있어요</div>`;
    return;
  }

  // 전월 데이터도 같은 방식으로 계산 — 있으면 프롬프트에 "방향성 비교"용으로만 제공(수치는 안 줌, 방향만 서술)
  let prevDirText='';
  if(prevData&&prevData.weeksInMonth&&prevData.weeksInMonth.length){
    const p=calcWeekly(prevData.todos,prevData.sleepRows,prevData.habits,prevData.habitChecks,prevData.weeksInMonth);
    const dirOf=(vals)=>{
      const valid=vals.filter(v=>v!=null);
      if(valid.length<2)return null;
      return valid[valid.length-1]>valid[0]?'상승':(valid[valid.length-1]<valid[0]?'하락':'유지');
    };
    const parts=[];
    const hd=dirOf(p.byWeekHabit);if(hd)parts.push(`습관율은 ${hd} 흐름`);
    const sd=dirOf(p.byWeekSleep);if(sd)parts.push(`평균수면은 ${sd} 흐름`);
    const td=dirOf(p.byWeekTodo);if(td)parts.push(`투두완료율은 ${td} 흐름`);
    if(parts.length)prevDirText=`전월 방향성(참고용, 방향만): ${parts.join(', ')}`;
  }

  // 이번 달 방향성도 텍스트로만(구체 수치 없이) 정리해서 넘김 — 프롬프트에서 수치 재진술을 원천 차단
  const dirOfCur=(vals)=>{
    const valid=vals.filter(v=>v!=null);
    if(valid.length<2)return '데이터 부족';
    return valid[valid.length-1]>valid[0]?'상승':(valid[valid.length-1]<valid[0]?'하락':'유지');
  };
  const curDirText=`이 달 방향성: 습관율 ${dirOfCur(byWeekHabit)}, 평균수면 ${dirOfCur(byWeekSleep)}, 투두완료율 ${dirOfCur(byWeekTodo)}`;
  const heroText=heroComment?`이 달 종합 리포트(참고용 맥락, 이미 발행된 코멘트):\n${heroComment}`:'';
  const dataContext=[curDirText,prevDirText,heroText].filter(Boolean).join('\n\n');

  const sys=`당신은 한 달의 생활 패턴을 해석해주는 담담한 회고 비서예요.
아래는 이 달의 습관율, 평균수면, 투두완료율이 주차를 거치며 각각 상승/하락/유지 중 어느 방향으로 움직였는지를 나타낸 정보예요(구체적인 수치는 주어지지 않아요). 함께 주어졌다면 이 달의 종합 리포트(이미 발행된 코멘트)도 참고하세요 — 그 안에 담긴 이 달의 사건이나 맥락과 어긋나지 않게, 자연스럽게 이어지도록 서술하세요.
이 세 지표가 서로 어떤 관계로 움직였는지 — 무엇을 더 챙기는 대신 무엇을 내줬는지, 어떤 성향의 한 달이었는지 — 짧은 이야기로 풀어주세요.
- 3~4문장, 전체 120자 내외.
- 절대 숫자나 퍼센트, 시간 같은 구체적인 수치를 언급하지 마세요. 그래프에 이미 나와 있으니, 당신은 그 움직임이 "무엇을 의미하는지"만 해석하세요.
- 원인 추정, 지표 간 트레이드오프, 이 달 전체의 성향 위주로 서술하세요.
- 종합 리포트 내용을 그대로 반복하거나 요약하지 말고, 거기 없는 지표 간의 관계만 새롭게 짚으세요.
- 담담하고 자연스러운 ~어요/~했어요체.
- 전월 방향성 정보가 함께 주어졌다면, 그 변화도 수치 없이 방향성으로만 마지막에 한 문장 정도 자연스럽게 녹이세요. 주어지지 않았다면 언급하지 마세요.
- 반드시 JSON 형식으로만 응답하세요: {"text":"..."}
- 다른 설명이나 마크다운 없이 순수 JSON만 출력하세요.`;
  const reply=await callClaudeFromTablet(sys,dataContext,400);
  if(!reply)return;
  try{
    const clean=reply.replace(/```json|```/g,'').trim();
    const parsed=JSON.parse(clean);
    if(parsed&&parsed.text){
      await supaUpsertAiCache('monthly_trajectory_'+mk,parsed.text);
      aiEl.innerHTML=`<div class="mrp-traj-ai-text">${escapeHtml(parsed.text)}</div>`;
    }
  }catch(e){/* 파싱 실패 시 조용히 빈 채로 둠 */}
}

function renderMrpRhythm(rblocks,prevRblocks){
  const el=document.getElementById('mrp-rhythm');
  const durByCat=(blocks)=>{
    const d={};let total=0;
    blocks.forEach(b=>{
      if(!b.start_time||!b.end_time)return;
      const s=_paceParseHM(b.start_time),e=_paceParseHM(b.end_time);
      if(isNaN(s)||isNaN(e))return;
      let dur=e-s;if(dur<0)dur+=1440;
      if(dur<=0)return;
      d[b.cat]=(d[b.cat]||0)+dur;total+=dur;
    });
    return {d,total};
  };
  const cur=durByCat(rblocks);
  const prev=durByCat(prevRblocks);
  if(!cur.total){el.innerHTML='<div class="empty-msg">기록된 리듬이 없어요</div>';return;}

  // 전월 실제 기록일수가 너무 적으면(예: 그 달 사용을 늦게 시작한 경우) "전월 대비"가 왜곡되어 거의 모든 항목이
  // 폭증/폭감으로 보이는 문제가 있었음 — 전월 기록일수가 7일 미만이면 비교 자체를 생략.
  const prevRecordedDays=new Set(prevRblocks.map(b=>b.date_key)).size;
  const showCompare=prevRecordedDays>=7;

  const sorted=Object.keys(cur.d).filter(k=>cur.d[k]>0).sort((a,b)=>cur.d[b]-cur.d[a]);
  let barHtml=`<div class="mrp-rhythm-bar">`;
  sorted.forEach(k=>{
    const c=RHYTHM_CATS[k];if(!c)return;
    barHtml+=`<div class="mrp-rhythm-seg" style="width:${cur.d[k]/cur.total*100}%;background:${c.color};"><i class="ti ${c.icon}"></i></div>`;
  });
  barHtml+=`</div>`;

  // 전월 대비 60분 이상 차이나는 항목만 "누계·전월대비" 형태로 리스트업(본앱 rhythmCompare 임계값 규칙 준용)
  const listHtml=`<div class="mrp-rhythm-list">`+sorted.map(k=>{
    const c=RHYTHM_CATS[k];
    const diff=cur.d[k]-(prev.d[k]||0);
    const diffTxt=(showCompare&&Math.abs(diff)>=60)?`<span style="color:${diff>0?'var(--pal-rose-border)':'var(--pal-sky-border)'};">${diff>0?'+':'−'}${_fmtDur(Math.abs(diff))}</span>`:'';
    return `<div class="mrp-rhythm-item"><span class="dot" style="background:${c.color};"></span><span class="lbl">${c.label}</span><span class="val">누계 ${_fmtDur(cur.d[k])}${diffTxt?' · 전월대비 '+diffTxt:''}</span></div>`;
  }).join('')+`</div>`;

  el.innerHTML=barHtml+listHtml+(showCompare?'':'<div class="empty-msg" style="text-align:left;padding:8px 2px 0;">전월 기록이 적어 전월 대비 비교는 생략했어요</div>');
}

// 이 달의 마디 — 리듬 변화는 순수 계산, 목표/맥락 변화는 Claude API로 문장화해서 monthly_milestones_ 캐시에 저장.
// 캐시가 있으면 그대로 쓰고, 없고 API 키가 있으면 그 자리에서 1회 생성(아카이브 페이지를 실제로 열었을 때만 생성 — 자동 발행 없음).
async function renderMrpMilestones(mk,rblocks,prevRblocks,weeksInMonth,wcRowsList,cacheRow,prevWcRowsList,heroComment){
  const el=document.getElementById('mrp-milestones');

  const renderList=(items)=>{
    if(!items||!items.length){el.innerHTML='';return;}
    el.innerHTML=`<div class="mrp-milestone-list">`+items.map(t=>`
      <div class="mrp-milestone">
        <div class="mrp-milestone-dot" style="background:rgba(var(--pal-lavender-rgb),0.9);"></div>
        <div class="mrp-milestone-txt">${escapeHtml(t)}</div>
      </div>`).join('')+`</div>`;
  };

  // 캐시가 있으면 그대로 표시
  if(cacheRow&&cacheRow.content){
    try{
      const parsed=JSON.parse(cacheRow.content);
      renderList(Array.isArray(parsed)?parsed:[]);
    }catch(e){el.innerHTML='';}
    return;
  }

  const apiKey=getClaudeKey();
  if(!apiKey){
    el.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">이 달의 마디 분석은 설정 탭에서 Claude API 키를 추가하면 볼 수 있어요</div>`;
    return;
  }

  // 리듬 변화(계산값)는 화면에 직접 보여주지 않고, AI가 목표 텍스트와 엮을 재료로만 넘김.
  // 전월 기록일수가 너무 적으면(예: 사용 시작 초반) 비교 자체가 왜곡되니 재료에서 제외.
  const durByCat=(blocks)=>{
    const d={};
    blocks.forEach(b=>{
      if(!b.start_time||!b.end_time)return;
      const s=_paceParseHM(b.start_time),e=_paceParseHM(b.end_time);
      if(isNaN(s)||isNaN(e))return;
      let dur=e-s;if(dur<0)dur+=1440;
      if(dur<=0)return;
      d[b.cat]=(d[b.cat]||0)+dur;
    });
    return d;
  };
  const cur=durByCat(rblocks),prev=durByCat(prevRblocks);
  const prevRecordedDays=new Set(prevRblocks.map(b=>b.date_key)).size;
  const canCompareRhythm=prevRecordedDays>=7;
  const rhythmChanges=canCompareRhythm?Object.keys(cur).map(k=>({k,diff:cur[k]-(prev[k]||0)}))
    .filter(o=>Math.abs(o.diff)>=60).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,4)
    .map(o=>{
      const c=RHYTHM_CATS[o.k];if(!c)return null;
      const dir=o.diff>0?'증가':'감소';
      return `${c.label} ${dir}(전월 대비 약 ${Math.round(Math.abs(o.diff)/60)}시간)`;
    }).filter(Boolean):[];

  const missionByWeek=weeksInMonth.map((wk,idx)=>{
    const row=wcRowsList[idx]&&wcRowsList[idx][0];
    const lines=(row&&Array.isArray(row.lines))?row.lines.filter(l=>l&&l.text&&l.text.trim()).map(l=>l.text):[];
    return lines.length?`${idx+1}주차: ${lines.join(', ')}`:null;
  }).filter(Boolean);
  const prevMissionLines=(prevWcRowsList||[]).flatMap(rows=>{
    const row=rows&&rows[0];
    return (row&&Array.isArray(row.lines))?row.lines.filter(l=>l&&l.text&&l.text.trim()).map(l=>l.text):[];
  });

  // 리듬 변화, 목표 텍스트, 종합 리포트 코멘트 중 아무 재료도 없으면 생성하지 않음 — 다만 조용히 끝내지 않고 이유를 안내
  if(!rhythmChanges.length&&!missionByWeek.length&&!heroComment){
    el.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">이 달의 마디를 짚을 만한 자료(목표 변화나 리듬 변화)가 아직 없어요</div>`;
    return;
  }

  const parts=[];
  if(missionByWeek.length)parts.push(`이 달 주차별 목표(주간 미션):\n${missionByWeek.join('\n')}`);
  if(prevMissionLines.length)parts.push(`전월 목표: ${prevMissionLines.join(', ')}`);
  if(rhythmChanges.length)parts.push(`이 달 리듬 시간 변화(전월 대비, 계산된 값):\n${rhythmChanges.join('\n')}`);
  if(heroComment)parts.push(`이 달 종합 리포트(참고용 맥락, 이미 발행된 코멘트):\n${heroComment}`);
  const dataContext=parts.join('\n\n');

  const sys=`당신은 한 달의 흐름에서 "뭔가 바뀐 지점"을 짚어주는 회고 비서예요.
아래 자료는 여러 종류예요: (1) 주차별 목표/주간미션 텍스트, (2) 리듬(활동 카테고리별) 시간이 전월 대비 어떻게 달라졌는지 계산된 값, (3) 있다면 이 달의 종합 리포트(이미 발행된 코멘트, 참고용 맥락).
(1)과 (2)를 각각 따로 언급하지 말고, 목표의 방향 전환과 리듬 시간 변화 사이에 실제로 앞뒤가 맞는 관계가 보이면 하나의 문장으로 엮어서 설명해주세요.
예: "운동 시간이 늘어난 건 목표가 체력 회복으로 방향을 잡으면서였던 것 같아요"처럼, 무엇이 원인이고 무엇이 결과처럼 보이는지 자연스럽게 연결하세요.
(3) 종합 리포트가 함께 주어졌다면, 그 안에 담긴 이 달의 사건이나 맥락을 먼저 확인하고 참고해서, 그와 어긋나지 않고 자연스럽게 이어지는 마디를 짚으세요. 종합 리포트 내용을 그대로 반복하지는 마세요.
관계가 뚜렷하지 않다면 억지로 엮지 말고, 목표 변화나 리듬 변화 중 더 뚜렷한 쪽 하나만 단독으로 짚어도 좋아요. 둘 다 뚜렷하지 않은 항목은 아예 만들지 마세요.
- 최대 3개까지만, 정말 짚을 게 없으면 빈 배열도 괜찮아요.
- 각 문장은 40~60자, 담담하고 자연스러운 ~어요/~였어요체.
- 문장 안에 분·시간·퍼센트 같은 구체적 수치는 절대 넣지 마세요. 방향과 의미만 담백하게 풀어서 설명하세요.
- 전월 목표가 함께 주어졌다면, 그 중 최대 1개는 전월과 비교하는 관점으로 써도 좋아요(강제는 아니에요).
- 반드시 JSON 배열 형식으로만 응답하세요. 예: ["운동 시간이 늘어난 건 목표가 체력 회복으로 방향을 잡으면서였던 것 같아요"]
- 다른 설명이나 마크다운 없이 순수 JSON 배열만 출력하세요.`;
  const reply=await callClaudeFromTablet(sys,dataContext,500);
  if(!reply){
    el.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">마디 분석을 불러오지 못했어요 — 잠시 후 다시 열어보시면 재시도돼요</div>`;
    return;
  }
  try{
    const clean=reply.replace(/```json|```/g,'').trim();
    const parsed=JSON.parse(clean);
    if(Array.isArray(parsed)&&parsed.length){
      await supaUpsertAiCache('monthly_milestones_'+mk,JSON.stringify(parsed));
      renderList(parsed);
    }else{
      // 빈 배열은 "정말 짚을 게 없다"는 판단일 수도, 일시적 부실 응답일 수도 있어 캐시하지 않고 다음에 다시 시도되게 둠
      el.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">이 달은 뚜렷하게 짚을 만한 변화는 없었어요</div>`;
    }
  }catch(e){
    el.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">마디 분석 응답을 해석하지 못했어요</div>`;
  }
}
// ai_cache 테이블 upsert — 본앱 aiCacheSet과 동일한 패턴(만료 없이 영구 보관, 그 달 데이터는 확정된 과거라 안 바뀜)
async function supaUpsertAiCache(cacheKey,content){
  try{
    await fetch(SUPA_URL+'/rest/v1/ai_cache',{
      method:'POST',
      headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({cache_key:cacheKey,content})
    });
  }catch(e){/* 저장 실패해도 화면엔 이미 표시된 상태라 조용히 무시 */}
}

function renderMrpWeeklyMissions(weeksInMonth,wcRowsList){
  const el=document.getElementById('mrp-missions');
  const blocks=weeksInMonth.map((wk,idx)=>{
    const rows=wcRowsList[idx];
    const row=rows&&rows[0];
    const lines=(row&&Array.isArray(row.lines))?row.lines.filter(l=>l&&l.text&&l.text.trim()):[];
    if(!lines.length)return null;
    const wkStart=new Date(wk+'T00:00:00');
    const wkEnd=new Date(wkStart);wkEnd.setDate(wkStart.getDate()+6);
    const isOngoing=wkEnd>=new Date(new Date().toDateString());
    const lineHtml=lines.map(l=>{
      const days=Array.isArray(l.days)?l.days:[];
      const pct=Math.round(days.filter(Boolean).length/7*100);
      return `<div class="mrp-wc-line"><span class="txt">${escapeHtml(l.text)}</span><span class="pct">${pct}%</span></div>`;
    }).join('');
    return `<div class="mrp-week-block"><div class="mrp-week-head"><span class="wk">${idx+1}주차 · ${_weekRangeLabel(wk)}</span>${isOngoing?'<span class="mrp-week-ongoing">진행중</span>':''}</div>${lineHtml}</div>`;
  }).filter(Boolean);
  el.innerHTML=blocks.length?blocks.join(''):'<div class="empty-msg">이 달엔 작성한 주간 미션이 없어요</div>';
}

function renderMrpContents(contents,startDk,endDk){
  const el=document.getElementById('mrp-contents');
  const inRange=contents.filter(c=>{
    if(c.content_cat==='music')return c.start_date&&c.start_date>=startDk&&c.start_date<=endDk;
    if(c.status!=='done'&&c.status!=='stopped')return false;
    return c.end_date&&c.end_date>=startDk&&c.end_date<=endDk;
  });
  if(!inRange.length){el.innerHTML='<div class="empty-msg">이 달엔 기록한 콘텐츠가 없어요</div>';return;}
  el.innerHTML=inRange.slice(0,30).map(c=>`
    <div class="mrp-content-line">
      <span style="display:flex;align-items:center;min-width:0;overflow:hidden;"><span class="dot" style="background:${_mrpCatDotColor(c.content_cat)};"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.title||'')}</span></span>
      <span class="st">${_mrpStatusLabel(c)}</span>
    </div>`).join('');
}

function renderMrpReportLinks(weeksInMonth,mk){
  const el=document.getElementById('mrp-report-links');
  const cards=weeksInMonth.map((wk,idx)=>{
    const sundayDk=_mondayToSundayDk(wk);
    return `<div class="mrp-link-card" onclick="openReportPanel('weekly_summary_${sundayDk}','${idx+1}주차 주간종합 리포트')"><i class="ti ti-sparkles" style="font-size:12px;color:var(--pal-lavender-border);" aria-hidden="true"></i><span class="wk">${idx+1}주차</span><span class="range">${_weekRangeLabel(wk)}</span></div>`;
  });
  el.innerHTML=cards.length?`<div class="mrp-links-grid">${cards.join('')}</div>`:'<div class="empty-msg">이 달엔 발행된 주간 리포트가 없어요</div>';
}

// ══════════════════════════════════════════════════════════
// 화면별 좌우 스와이프 이동 — 오늘 → 주간 → 월간 → 리포트 순으로 탭 자체를 순환 이동
// ══════════════════════════════════════════════════════════
(function setupSwipeNav(){
  const wrap=document.querySelector('.main-wrap');
  if(!wrap)return;
  const TAB_ORDER=['today','week','month','reports'];
  let startX=0,startY=0,tracking=false;
  const SWIPE_MIN_DIST=60; // 스와이프로 인정할 최소 가로 이동거리(px)
  const SWIPE_MAX_VERTICAL=50; // 이보다 세로로 많이 움직이면 스크롤 의도로 보고 무시
  wrap.addEventListener('touchstart',e=>{
    if(e.touches.length!==1)return;
    // 리포트탭의 습관/메모 그리드, 콘텐츠 타임라인의 날짜 트랙은 자체 가로 스크롤이 있어, 그 안에서 시작된 터치는 탭 이동 스와이프로 취급하지 않음
    if(e.target.closest&&e.target.closest('.report-box-grid, .tt-date-scroll, .tt-head-scroll')){tracking=false;return;}
    startX=e.touches[0].clientX;startY=e.touches[0].clientY;tracking=true;
  },{passive:true});
  wrap.addEventListener('touchend',e=>{
    if(!tracking)return;tracking=false;
    const endX=e.changedTouches[0].clientX,endY=e.changedTouches[0].clientY;
    const dx=endX-startX,dy=endY-startY;
    if(Math.abs(dx)<SWIPE_MIN_DIST||Math.abs(dy)>SWIPE_MAX_VERTICAL)return;
    const curIdx=TAB_ORDER.indexOf(_currentTab);
    if(curIdx===-1)return; // 설정탭 등 순환 대상 밖이면 무시
    const dir=dx<0?1:-1; // 왼쪽으로 스와이프 → 다음 탭, 오른쪽으로 스와이프 → 이전 탭
    const nextIdx=curIdx+dir;
    if(nextIdx<0||nextIdx>=TAB_ORDER.length)return; // 양 끝에서는 순환하지 않고 멈춤
    switchTab(TAB_ORDER[nextIdx]);
  },{passive:true});
})();
