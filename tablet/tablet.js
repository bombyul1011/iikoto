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
// 주(월~일)의 소속 월 — 본앱(iikoto)과 동일하게 ISO 8601 방식: 그 주의 목요일이 속한 달을 그 주의 소속 월로 본다.
// 8/31~9/6 같은 월 경계 주는 월요일이 8월이어도 목요일(9/3)이 9월이라 9월 소속으로 계산.
// baseDate로 아무 날짜나 넘겨도 됨(주 안의 어느 요일이든 같은 결과) — 내부에서 그 주의 월요일을 구하고 +3일로 목요일을 잡음.
function weekMonthKey(baseDate){
  const monday=new Date(weekKeyOf(baseDate)+'T00:00:00');
  const thu=new Date(monday);thu.setDate(monday.getDate()+3);
  return monthKeyOf(thu);
}
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

// 목표 수면시간(2026-08-22 확정, 고정값) — 관련 통계(부족/초과, 달성률 등) 전부 이 상수 기준.
const SLEEP_GOAL_MIN=7*60+30; // 7시간 30분

// 표준편차(분) 계산 — 취침/기상 규칙성 점수용 공통 유틸
function _stdDevMin(valuesMin){
  const valid=valuesMin.filter(v=>v!=null&&!isNaN(v));
  if(valid.length<2)return null;
  const mean=valid.reduce((a,b)=>a+b,0)/valid.length;
  const variance=valid.reduce((a,b)=>a+Math.pow(b-mean,2),0)/valid.length;
  return Math.sqrt(variance);
}
// 수면 규칙성 점수(2026-08-22 확정): 취침/기상 각각의 표준편차(분) 평균을 100점 만점으로 환산.
// 편차 0분=100점, 계수 1.2 적용(편차 30분≈64점, 60분≈28점, 83분 이상=0점).
// sleepTimes/wakeTimes는 이미 _dawnTimeToMin(취침은 toDawnAdjustedMin 22시컷 보정)된 분단위 배열이어야 함.
function calcSleepRegularity(sleepTimesMin,wakeTimesMin){
  const sleepSd=_stdDevMin(sleepTimesMin);
  const wakeSd=_stdDevMin(wakeTimesMin);
  if(sleepSd==null&&wakeSd==null)return null;
  const avgSd=(sleepSd!=null&&wakeSd!=null)?(sleepSd+wakeSd)/2:(sleepSd!=null?sleepSd:wakeSd);
  const score=Math.max(0,Math.round(100-Math.min(100,avgSd*1.2)));
  let label,color;
  if(score>=85){label='매우 규칙적';color='#4a8f6a';}
  else if(score>=65){label='규칙적';color='#5a9a7a';}
  else if(score>=40){label='보통';color='#a3897c';}
  else{label='불규칙';color='#c0788a';}
  return {score,label,color,avgSd:Math.round(avgSd)};
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

// sleep 테이블 row 하나의 수면시간(분) — sleep_time~wake_time, 자정 넘김 자동 보정.
function _sleepDurMinOf(r){
  const sv=r.sleep_time.split(':').map(Number),wv=r.wake_time.split(':').map(Number);
  let m=(wv[0]*60+wv[1])-(sv[0]*60+sv[1]);if(m<0)m+=1440;
  return m;
}
// sleep rows에서 평균 컨디션 점수만 계산(sleep_time/wake_time 유무와 무관, score만 있으면 됨) —
// 궤적 카드처럼 수면시간이 아닌 컨디션만 필요한 곳에서 사용.
function _avgSleepScoreOf(rows){
  const scored=(rows||[]).filter(r=>r.score!=null&&!isNaN(r.score));
  return scored.length?Math.round(scored.reduce((a,r)=>a+r.score,0)/scored.length):null;
}
// sleep rows 배열 하나에서 평균 수면시간/평균 컨디션/규칙성을 한 번에 계산 — 주간(renderWeekSleepReport)과
// 월간(renderMrpSleep) 리포트에 거의 동일한 로직이 각각 중복돼 있던 것을 통합(2026-08-22).
// validRows: sleep_time/wake_time이 있는 유효 기록만 걸러서 넘겨야 함(호출부에서 필터링).
function _sleepStatsOf(validRows){
  if(!validRows.length)return {avgMin:null,avgScore:null,reg:null,validCount:0};
  const avgMin=Math.round(validRows.reduce((a,r)=>a+_sleepDurMinOf(r),0)/validRows.length);
  const avgScore=_avgSleepScoreOf(validRows);
  const sleepMinArr=validRows.map(r=>toDawnAdjustedMin(_dawnTimeToMin(r.sleep_time),22*60));
  const wakeMinArr=validRows.map(r=>_dawnTimeToMin(r.wake_time));
  const reg=calcSleepRegularity(sleepMinArr,wakeMinArr);
  return {avgMin,avgScore,reg,validCount:validRows.length};
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
// 리듬 카테고리별 의미 가이드 — 월간리포트 리듬 AI 분석 프롬프트에서 라벨만으론 모호한 카테고리를 짧게 설명(2026-08-22, 정의 누락 수정).
const RHYTHM_CAT_GUIDE=`카테고리 의미: 운동(신체 활동), 휴식(수면 외 쉼), 단장(씻기·꾸미기 등 자기관리), 업무(일), 외출(이동·약속), 책상(독립적인 개인 작업·자기계발), 감상(영화·책 등 콘텐츠 소비), 정리(청소·집안일).`;

const CAT_ICON_META={
  drama:{icon:'ti-device-tv',bg:'rgba(var(--pal-pink-rgb),1)',iconColor:'#fff',label:'드라마'},
  book:{icon:'ti-book',bg:'rgba(var(--pal-yellow-rgb),1)',iconColor:'#fff',label:'책'},
  movie:{icon:'ti-movie',bg:'rgba(var(--pal-sky-rgb),1)',iconColor:'#fff',label:'영화'},
  music:{icon:'ti-music',bg:'rgba(var(--pal-lime-rgb),1)',iconColor:'#fff',label:'음악'}
};

// ── 상태 ──
let _selectedDate=new Date();
let _currentTab='today';
let _wcalDate=new Date();

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
  else if(tab==='reports'){resetReportsView();loadReportsTab();}
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
let _sideCalExpanded=false; // 월 라벨 클릭으로 월간 그리드가 펼쳐진 상태인지(기본은 주간뷰만)
function _mrpCalDayCell(dk,d,todayDk,selDk){
  let cls='mini-cal-day';
  if(dk===todayDk)cls+=' today';
  else if(dk===selDk)cls+=' sel'; // 오늘이 선택된 상태에선 today색을 유지 — sel은 오늘이 아닌 날짜를 골랐을 때만
  return `<div class="${cls}" onclick="selectDate('${dk}')">${d}</div>`;
}
async function renderMiniCal(){
  const el=document.getElementById('mini-cal');
  const y=_sideCalDate.getFullYear(),m=_sideCalDate.getMonth();
  const first=new Date(y,m,1);
  const startWeekday=(first.getDay()+6)%7; // 월요일 시작 기준으로 보정(일요일=0 → 6칸 밀림)
  const daysInMonth=new Date(y,m+1,0).getDate();
  const todayDk=dateKey(new Date());
  const selDk=dateKey(_selectedDate);

  // 주간뷰 — 선택된 날짜(_selectedDate)가 속한 주(월~일)를 항상 한 줄로 보여줌. 캘린더 접힘/펼침과 무관하게 기준점 역할.
  const weekDates=getWeekDates(_selectedDate);
  const weekRowHtml=weekDates.map(dk=>{
    const d=parseInt(dk.slice(8,10),10);
    return _mrpCalDayCell(dk,d,todayDk,selDk);
  }).join('');

  // 월간 그리드 — 펼쳤을 때만(그리드 자체는 항상 그려두고 CSS max-height로 접음, 펼칠 때 다시 계산할 필요 없게)
  let monthGridHtml='';
  for(let i=0;i<startWeekday;i++)monthGridHtml+='<div class="mini-cal-day empty"></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dk=`${y}-${pad(m+1)}-${pad(d)}`;
    monthGridHtml+=_mrpCalDayCell(dk,d,todayDk,selDk);
  }

  el.innerHTML=`<div class="mini-cal-hdr">
      <div class="mini-cal-month-toggle${_sideCalExpanded?' expanded':''}" onclick="toggleSideCalExpand()"><span>${y}년 ${m+1}월</span><i class="ti ti-chevron-down expand-arrow" aria-hidden="true"></i></div>
      <div><i class="ti ti-chevron-left" onclick="sideCalShift(-1)" aria-hidden="true"></i><i class="ti ti-chevron-right" onclick="sideCalShift(1)" aria-hidden="true"></i></div>
    </div>
    <div class="mini-cal-dow-row">${DOW_MON_START.map(d=>`<div class="dow">${d}</div>`).join('')}</div>
    <div class="mini-cal-week-row${_sideCalExpanded?' hidden':''}"><div class="mini-cal-grid">${weekRowHtml}</div></div>
    <div class="mini-cal-month-grid${_sideCalExpanded?' on':''}"><div>
      <div class="mini-cal-grid">${monthGridHtml}</div>
    </div></div>`;
}
function toggleSideCalExpand(){
  _sideCalExpanded=!_sideCalExpanded;
  renderMiniCal();
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
// 본앱 getHomeTimeSlot과 동일한 7분류 → 5개 섹션(morning/day/afternoon/night/dawn) 매핑.
// day(12-16시, 오후1)는 "해 떠있는 낮"으로 afternoon(16-19시, 오후2, 저물녘)과 톤을 구분(2026-08-22 확정).
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
  if(slot==='afternoon_1')return 'day';
  if(slot==='afternoon_2')return 'afternoon';
  return 'night';
}
const SIDE_GREETING_POOL={
  morning:['좋은 아침이에요','오늘도 좋은 하루예요','활기찬 하루 보내요','상쾌한 아침이에요'],
  day:['한창인 하루예요','오늘도 순항 중이에요','해가 좋은 시간이에요','잘 하고 있어요'],
  afternoon:['잘 하고 있어요','오늘도 순항 중이에요','좋은 흐름이에요','노을이 예쁜 시간이에요'],
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
  // 사이드바 배경 워터마크와 접기 탭 모두 인사카드와 같은 시간대(section) 톤을 그대로 따라가도록 클래스 동기화.
  const sideEl=document.getElementById('side');
  if(sideEl){
    sideEl.classList.remove('tod-morning','tod-day','tod-afternoon','tod-night','tod-dawn');
    sideEl.classList.add('tod-'+section);
  }
  const toggleBtn=document.getElementById('side-toggle-btn');
  if(toggleBtn){
    toggleBtn.classList.remove('tod-morning','tod-day','tod-afternoon','tod-night','tod-dawn');
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
// 사이드바 오늘 진행률 카드 — 항상 "진짜 오늘" 기준(오늘탭에서 다른 날짜를 보고 있어도 무관하게 고정).
// 도넛은 오늘 할일 완료율, 옆 텍스트에 할일/습관 개수를 함께 표기.
async function renderSideProgress(){
  const el=document.getElementById('side-progress');
  if(!el)return;
  const todayDk=dateKey(new Date());
  const [todos,habits,habitChecks]=await Promise.all([
    supaFetch(`todos?date_key=eq.${todayDk}&is_event=eq.false&select=done`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=eq.${todayDk}`)
  ]);
  const todoList=todos||[];
  const doneCount=todoList.filter(t=>t.done).length;
  const totalTodo=todoList.length;
  const pct=totalTodo?Math.round(doneCount/totalTodo*100):0;
  const habitCount=(habits||[]).length;
  const checkedNames=new Set((habitChecks||[]).map(c=>c.habit_name));
  const habitDone=(habits||[]).filter(h=>checkedNames.has(h.name)).length;

  const r=17,circumference=2*Math.PI*r;
  const dashOffset=circumference*(1-pct/100);
  const ringSvg=`<svg width="42" height="42" viewBox="0 0 42 42" class="side-progress-ring">
    <circle cx="21" cy="21" r="${r}" fill="none" stroke="rgba(145,210,175,0.18)" stroke-width="5"/>
    <circle cx="21" cy="21" r="${r}" fill="none" stroke="rgba(145,210,175,0.9)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="${dashOffset.toFixed(1)}" transform="rotate(-90 21 21)"/>
    <text x="21" y="25" text-anchor="middle" font-size="11" font-weight="700" fill="var(--tp)" font-family="'DM Sans',sans-serif">${totalTodo?pct+'%':'-'}</text>
  </svg>`;

  const subMsg=totalTodo===0?'오늘 등록된 할일이 없어요':(pct>=100?'오늘 할일을 모두 마쳤어요':(pct>=50?'잘 하고 있어요':'천천히 시작해봐요'));

  el.innerHTML=`${ringSvg}<div class="side-progress-txt">
    <div class="side-progress-main">오늘 할일 ${doneCount}/${totalTodo} · 습관 ${habitDone}/${habitCount}</div>
    <div class="side-progress-sub">${subMsg}</div>
  </div>`;
}
function scheduleSideGreetingRefresh(){
  renderSideGreeting();
  renderSideProgress();
  const wait=_msUntilNextGreetingBoundary();
  setTimeout(function tick(){
    renderSideGreeting();
    renderSideProgress();
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
  // 독서 스트릭 계산용 최근 90일 범위(reading_daily_log 실제 기록 기반, 그 날짜에 로그가 있으면 "읽은 날")
  const readingStreakStart=new Date(_selectedDate);readingStreakStart.setDate(readingStreakStart.getDate()-90);
  const readingStreakStartDk=dateKey(readingStreakStart);

  const [todos,sleepRows,recentSleepRows,habits,habitChecks,meals,contents,books,rblocks,morningChecks,readingLogRows,todayNoteRows,todayManualRows]=await Promise.all([
    supaFetch(`todos?date_key=eq.${dk}&order=created.asc`),
    supaFetch(`sleep?date_key=eq.${dk}`),
    supaFetch(`sleep?date_key=gte.${sleepAvgStartDk}&date_key=lte.${dk}&select=date_key,score,sleep_time,wake_time`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=eq.${dk}`),
    supaFetch(`meals?date_key=eq.${dk}`),
    supaFetch(`contents?or=(status.eq.watching,and(status.eq.done,end_date.eq.${dk}),start_date.eq.${dk})&order=created.desc&limit=10`),
    supaFetch(`reading_books?status=eq.reading&limit=1`),
    supaFetch(`rhythm_blocks?date_key=eq.${dk}&order=start_time.asc`),
    supaFetch(`morning_routine_checks?date_key=eq.${dk}`),
    supaFetch(`reading_daily_log?date_key=gte.${readingStreakStartDk}&date_key=lte.${dk}&select=date_key`),
    supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('wcal_note_'+dk.slice(0,7))}`),
    supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('wcal_manual_'+dk.slice(0,7))}`)
  ]);

  renderTodayTodosEvents(todos||[]);
  renderTodayMemos(dk);
  renderTodaySleep(dk,sleepRows&&sleepRows[0],recentSleepRows||[]);
  renderTodayHabits(habits||[],habitChecks||[],dk);
  renderTodayMeals(meals&&meals[0]);
  const todayNotes=((todayNoteRows&&todayNoteRows[0]&&todayNoteRows[0].lines)||[]).filter(n=>n.dk===dk);
  renderTodayContents(contents||[],todayNotes);
  _todayRhythmBlocks=rblocks||[];
  _todaySleepRow=sleepRows&&sleepRows[0];
  _todayMealsRow=meals&&meals[0];
  renderTodayRhythm(rblocks||[]);
  const todayManual=((todayManualRows&&todayManualRows[0]&&todayManualRows[0].lines)||[]).filter(it=>it.dk===dk);
  renderTodayReading(dk,rblocks||[],contents||[],todayManual,books&&books[0],readingLogRows||[]);
  renderTodayPace(todos||[],habits||[],habitChecks||[],morningChecks||[]);
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
  // 정렬 순서는 그대로(시간순) 두고, 첫 화면 노출은 최신(마지막) 메모가 보이도록 스크롤을 맨 아래로
  el.scrollTop=el.scrollHeight;
}
// ── 오늘의 메모 카드 — 검색 ──
function toggleMemoSearch(){
  const box=document.getElementById('memo-search-box');
  const toggle=document.getElementById('memo-search-toggle');
  const on=box.classList.toggle('on');
  toggle.classList.toggle('on',on);
  if(on){
    document.getElementById('memo-search-input').focus();
  }else{
    document.getElementById('memo-search-input').value='';
    document.getElementById('memo-search-results').innerHTML='';
  }
}
let _memoSearchTimer=null;
function onMemoSearchInput(){
  clearTimeout(_memoSearchTimer);
  const q=document.getElementById('memo-search-input').value.trim();
  const resultsEl=document.getElementById('memo-search-results');
  if(!q){resultsEl.innerHTML='';return;}
  _memoSearchTimer=setTimeout(()=>_runMemoSearch(q),300);
}
async function _runMemoSearch(q){
  const resultsEl=document.getElementById('memo-search-results');
  resultsEl.innerHTML='<div class="memo-search-empty">검색 중...</div>';
  const encoded=encodeURIComponent(q.replace(/[%*]/g,''));
  const rows=await supaFetch(`memos?text=ilike.*${encoded}*&order=date_key.desc,memo_time.desc&limit=50`);
  if(!rows||!rows.length){resultsEl.innerHTML='<div class="memo-search-empty">검색 결과가 없어요</div>';return;}
  resultsEl.innerHTML=rows.map(m=>{
    const dateLabel=m.date_key?`${m.date_key.slice(5,7)}.${m.date_key.slice(8,10)}${m.memo_time?' · '+m.memo_time:''}`:'';
    return `<div class="memo-search-result-item"><div class="memo-search-result-date">${dateLabel}</div><div class="memo-search-result-txt">${escapeHtml(m.text)}</div></div>`;
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

function renderTodayContents(items,todayNotes){
  const el=document.getElementById('today-contents');
  items=items||[];
  const dk=dateKey(_selectedDate);
  if(!items.length){el.innerHTML='<div class="empty-msg">오늘 감상한 콘텐츠 없음</div>';return;}
  el.innerHTML=items.slice(0,4).map(c=>{
    const meta=CAT_ICON_META[c.content_cat]||{label:c.content_cat};
    const finalBadge=(c.status==='done'&&c.end_date===dk)?'<span class="status-badge done">완결</span>':'';
    const progressBadge=(c.status==='watching')?'<span class="status-badge">진행중</span>':'';
    return `<div class="content-row"><span class="content-cat">${meta.label||''}</span><span class="content-title">${escapeHtml(c.title)}</span>${finalBadge}${progressBadge}</div>`;
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
// habit_checks를 "날짜+습관명" 조합 기준으로 중복 제거해서 세는 통합 헬퍼.
// 정상 흐름에선 하루에 같은 습관을 두 번 체크할 UI 자체가 없지만(renderTodayHabits는 ON/OFF 토글),
// 네트워크 재시도나 동시 클릭 등으로 실수로 중복 삽입되면 length 기준 집계는 100%를 넘는 왜곡된 비율을 만들 수 있어
// 모든 습관 카운트 계산을 이 고유매칭 방식으로 통일함(2026-08-22, 봄이님 결정).
function _uniqueHabitCheckCount(checks){
  return new Set((checks||[]).map(c=>c.date_key+'|'+c.habit_name)).size;
}
function _paceParseHM(hm){const p=(hm||'').split(':');return parseInt(p[0],10)*60+parseInt(p[1],10);}
// rhythm_blocks에서 start_time/end_time을 분 단위로 파싱해 카테고리별로 합산(자정 넘김 자동 보정) — 공통 헬퍼.
// 기존에 renderWeekRhythmFlow/renderMrpTrajectory/renderMrpMilestones 세 곳에 거의 동일한 로직이 각각
// 로컬 함수로 중복 정의돼 있던 것을 하나로 통합함(2026-08-22). renderMrpRhythm은 카테고리별 dayCount(일평균 분모)까지
// 추가로 계산하는 별도 요구사항이 있어 이 헬퍼로 흡수하지 않고 그대로 둠.
// days를 주면 그 날짜(date_key)들만 필터링, 생략하면 전달된 blocks 전체를 사용.
function _rhythmDurByCat(rblocks,days){
  const d={};let total=0;
  (rblocks||[]).forEach(b=>{
    if(days&&!days.includes(b.date_key))return;
    if(!b.start_time||!b.end_time)return;
    const s=_paceParseHM(b.start_time),e=_paceParseHM(b.end_time);
    if(isNaN(s)||isNaN(e))return;
    let dur=e-s;if(dur<0)dur+=1440;
    if(dur<=0)return;
    d[b.cat]=(d[b.cat]||0)+dur;total+=dur;
  });
  return {d,total};
}
// 특정 카테고리 하나만의 합산 분(分) — 생활밸런스(업무/책상 비율) 계산처럼 카테고리 하나만 필요할 때.
function _rhythmSumCatMin(rblocks,cat,days){
  return _rhythmDurByCat(rblocks,days).d[cat]||0;
}
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
let _todaySleepRow=null;
let _todayMealsRow=null;
const RHYTHM_SLEEP_COLOR='rgba(205,194,182,0.88)';
const RHYTHM_MEAL_COLOR='rgba(130,205,145,0.90)';
// 본앱 computeRhythmBlocksRaw와 동일 로직(수면/식사/수기 리듬블록을 하나의 흐름으로 합성) — 태블릿용 이식.
function computeRhythmBlocksRawTablet(sleep,meals,manual){
  sleep=sleep||{};meals=meals||{};manual=manual||[];
  const blocks=[];
  const wakeMin=_dawnTimeToMin(sleep.wake_time),sleepMin=_dawnTimeToMin(sleep.sleep_time);
  if(wakeMin!=null&&sleepMin!=null&&sleepMin<=wakeMin){
    blocks.push({start:sleepMin,end:wakeMin,color:RHYTHM_SLEEP_COLOR,label:'수면',kind:'sleep'});
  }else{
    if(wakeMin!=null)blocks.push({start:0,end:wakeMin,color:RHYTHM_SLEEP_COLOR,label:'수면',kind:'sleep'});
    if(sleepMin!=null&&wakeMin==null){
      blocks.push({start:sleepMin,end:null,color:RHYTHM_SLEEP_COLOR,label:'수면',ongoing:true,kind:'sleep'});
    }
  }
  MEAL_KEYS.forEach(k=>{
    const t=meals[k+'_time'];
    if(!t)return;
    const start=_dawnTimeToMin(t);
    blocks.push({start,end:Math.min(start+30,1440),color:RHYTHM_MEAL_COLOR,label:'식사 · '+(meals[k]||MEAL_LABELS[k]),kind:'meal'});
  });
  let latestManualMin=-1;
  manual.forEach(b=>{
    const s=_dawnTimeToMin(b.start_time);if(s==null)return;
    const e=b.end_time?_dawnTimeToMin(b.end_time):s;
    const ref=(e!=null&&e>s)?e:s;
    if(ref>latestManualMin)latestManualMin=ref;
  });
  manual.forEach(b=>{
    const cat=RHYTHM_CATS[b.cat];if(!cat)return;
    const sMin=_dawnTimeToMin(b.start_time);if(sMin==null)return;
    const eMin=b.end_time?_dawnTimeToMin(b.end_time):null;
    const isLateNightNew=sMin<DAWN_CUTOFF_MIN&&latestManualMin>=DAWN_CUTOFF_MIN&&sMin<latestManualMin;
    let sortKey=sMin;
    if(isLateNightNew)sortKey+=1440;
    blocks.push({start:sMin,end:eMin,sortKey,color:cat.color,label:b.text||cat.label,ongoing:!b.end_time,kind:'manual'});
  });
  return blocks;
}
function toHHMMFromMin(min){
  const m=((min%1440)+1440)%1440;
  return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
}
function openTodayRhythmFlow(){
  const dk=dateKey(_selectedDate);
  const label=`${_selectedDate.getMonth()+1}월 ${_selectedDate.getDate()}일 리듬 흐름`;
  document.getElementById('report-panel-title').innerHTML=`<i class="ti ti-activity" aria-hidden="true"></i>${label}`;
  const bodyEl=document.getElementById('report-panel-body');
  // 본앱 renderRhythmFlowHtml과 동일: 수면/식사/수기 리듬블록을 하나로 합쳐서(computeRhythmBlocksRawTablet) 시간순 정렬.
  const raw=computeRhythmBlocksRawTablet(_todaySleepRow,_todayMealsRow,_todayRhythmBlocks);
  const items=raw.map(b=>{
    let e=b.end,labelEnd=e;
    if(e!=null&&e<=b.start){labelEnd=e+1440;e=1440;}
    return Object.assign({},b,{
      end:e==null?b.start:e,
      labelEnd:labelEnd==null?b.start:labelEnd,
      ongoing:b.end==null,
      sortKey:b.sortKey!=null?b.sortKey:b.start
    });
  }).sort((a,b)=>a.sortKey-b.sortKey);
  if(!items.length){
    bodyEl.innerHTML='<div class="wrb-flow-empty">이날은 기록된 리듬이 없어요</div>';
  }else{
    bodyEl.innerHTML='<div class="wrb-flow-list">'+items.map(s=>{
      const displayEnd=s.labelEnd!=null?s.labelEnd:s.end;
      const timeRange=toHHMMFromMin(s.start)+(s.ongoing?'~진행중':'~'+toHHMMFromMin(displayEnd));
      return `<div class="wrb-flow-row"><span class="wrb-flow-dot" style="background:${s.color};"></span><span class="wrb-flow-time">${timeRange}</span><span class="wrb-flow-label">${escapeHtml(s.label)}</span></div>`;
    }).join('')+'</div>';
  }
  document.getElementById('report-overlay').classList.add('on');
}

// 오늘의 감상 — "오늘 진행중 상태"가 아니라 감상달력과 동일한 기준(오늘 날짜에 실제로 감상 기록이 찍힌 항목:
// 드라마/영화/책은 rhythm_blocks, 음악은 contents.start_date, 그 외 수동추가분은 wcal_manual)으로 수집.
// 최근 것부터 최대 2개까지 절반씩 나눠 보여주고, 3개 이상이면 존재감 낮은 작은 배지(+N)로만 표시.
function _todayReadingItemHtml(item,book,readingLogRows){
  const meta=WCAL_CAT_META[item.cat]||{icon:'ti-stack-2',color:'rgba(150,150,150,1)',label:''};
  const coverStyle=item.poster?`background-image:url('${item.poster}');`:`background:${meta.color};`;
  const coverIcon=item.poster?'':`<i class="ti ${meta.icon}" style="color:#fff;font-size:16px;" aria-hidden="true"></i>`;
  let subLine='';
  if(item.cat==='book'&&book&&book.title===item.title){
    let pct=0;
    if(book.unit==='percent')pct=book.percent||0;
    else if(book.total_pages)pct=Math.min(100,Math.round((book.pages/book.total_pages)*100));
    subLine=`${pct}%`;
  }else if((item.cat==='drama'||item.cat==='movie')&&item.totalUnit){
    // 본앱에서 TMDB로 자동 채운 total_unit(드라마=총화수,영화=총러닝타임분)/current_unit(진행분)으로 % 계산. 책과 동일 형식으로 통일.
    const pct=Math.min(100,Math.round(((item.currentUnit||0)/item.totalUnit)*100));
    subLine=`${pct}%`;
  }else{
    subLine=meta.label||'';
  }
  return `<div class="rd-cur-book-sm">
    <div class="rd-cur-cover-sm" style="${coverStyle}display:flex;align-items:center;justify-content:center;">${coverIcon}</div>
    <div class="rd-cur-info-sm"><div class="rd-cur-title-sm">${escapeHtml(item.title||'')}</div><div class="rd-cur-pct-sm">${subLine}</div></div>
  </div>`;
}
function renderTodayReading(dk,rblocks,contents,manualItems,book,readingLogRows){
  const el=document.getElementById('today-reading');
  const items=[];
  const seen=new Set();
  const push=(cat,title,poster)=>{
    const key=cat+'|'+title;
    if(seen.has(key)||!title)return;
    seen.add(key);
    items.push({cat,title,poster:poster||null});
  };
  (rblocks||[]).forEach(b=>{
    if(b.cat!=='enjoy'||!b.text)return;
    if(b.text.startsWith('드라마 - '))push('drama',b.text.slice(6));
    else if(b.text.startsWith('독서 - '))push('book',b.text.slice(5));
  });
  (contents||[]).filter(c=>c.content_cat==='music'&&c.start_date===dk).forEach(c=>push('music',c.title,c.poster));
  // 영화는 리듬 기록 유무와 무관하게 contents 하나만 기준으로 판단 — 하루짜리(당일 시작~종료), 기간형(진행중이면
  // 시작일~오늘 사이), 콘텐츠탭에만 등록된 경우까지 모두 이 하나의 규칙으로 포섭(2026-08-25 단순화).
  (contents||[]).filter(c=>c.content_cat==='movie').forEach(c=>{
    const isToday=(c.status==='watching'&&c.start_date&&c.start_date<=dk)||c.start_date===dk||c.end_date===dk;
    if(isToday)push('movie',c.title,c.poster);
  });
  (manualItems||[]).forEach(it=>push(it.cat,it.title));
  // 포스터/진행률 매칭 — 드라마/영화는 오늘 넘어온 contents 목록에서 같은 제목의 poster·total_unit·current_unit을 찾아 붙임
  const posterByTitle={};
  const unitByTitle={};
  (contents||[]).forEach(c=>{
    if(c.content_cat==='music'||!c.title)return;
    posterByTitle[c.title]=c.poster||null;
    if(c.total_unit)unitByTitle[c.title]={totalUnit:c.total_unit,currentUnit:c.current_unit||0};
  });
  items.forEach(it=>{
    if(it.cat==='music')return;
    if(!it.poster)it.poster=posterByTitle[it.title]||null;
    if((it.cat==='drama'||it.cat==='movie')&&unitByTitle[it.title]){
      it.totalUnit=unitByTitle[it.title].totalUnit;
      it.currentUnit=unitByTitle[it.title].currentUnit;
    }
  });

  const shown=items.slice(0,2);
  if(!shown.length){el.innerHTML='<div class="empty-msg" style="text-align:left;">오늘 감상한 콘텐츠가 없어요</div>';return;}
  const moreCount=items.length-shown.length;
  const moreBadge=moreCount>0?`<span class="rd-cur-more-tiny">+${moreCount}</span>`:'';
  const itemsHtml=shown.map(it=>_todayReadingItemHtml(it,book,readingLogRows)).join('');
  el.innerHTML=`<div class="rd-cur-row">${itemsHtml}</div>${moreBadge}`;
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
// 목요일(ISO 8601) 기준 소속 월 + 그 달 안에서 몇 번째 주인지로 "N주차" 계산(weekMonthKey/getReportWeeksOfMonth와 동일 규칙, 본앱과 통일)
function getWeekOfMonthLabel(baseDate){
  const monday=new Date(weekKeyOf(baseDate)+'T00:00:00');
  const mk=weekMonthKey(baseDate);
  const [y,mo0]=mk.split('-').map(Number);
  const mo=mo0-1;
  const weekNo=_weekNoInMonth(dateKey(monday));
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

  // 수면 리포트 카드용 최근 2주(캘린더 주와 무관하게 오늘 포함 롤링 14일)
  const slEnd=new Date();
  const slStart=new Date(slEnd);slStart.setDate(slStart.getDate()-13);
  const slEndDk=dateKey(slEnd),slStartDk=dateKey(slStart);

  // 이번 주(월~일)가 걸치는 저장 월(들) — contents/wcal_note는 날짜 기준 월별 시트라, 주가 두 달에 걸치면
  // 데이터 누락 없이 양쪽 다 읽어야 함. "이 주가 어느 달 소속인가"(라벨 표시용)와는 다른 개념 — 그건 weekMonthKey(목요일 기준) 사용.
  const spanStartMk=monthKeyOf(new Date(startDk+'T00:00:00'));
  const spanEndMk=monthKeyOf(new Date(endDk+'T00:00:00'));

  const [goalRows,habits,habitChecks,memos,todos,sleepRows,onelineRows,contents,
    lwMemos,lwTodos,lwSleepRows,lwHabitChecks,lwContents,rblocksThis,rblocksLast,sleepReportRows,
    wcalStripRblocks,wcalStripContents,wcalNoteRowsA,wcalNoteRowsB]=await Promise.all([
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
    // 리듬 흐름 비교용: 이번주(오늘까지)/지난주(동일 요일까지) — 일평균 분모는 둘 다 고정(cmpDayCount)이라
    // 지난주도 7일 전체가 아니라 같은 요일수까지만 봐야 공정한 비교가 됨(2026-08-22 확정, 봄이님 판단).
    supaFetch(`rhythm_blocks?date_key=gte.${startDk}&date_key=lte.${cmpEndDk}`),
    supaFetch(`rhythm_blocks?date_key=gte.${lastStartDk}&date_key=lte.${lastCmpEndDk}`),
    // 수면 리포트 최근 2주
    supaFetch(`sleep?date_key=gte.${slStartDk}&date_key=lte.${slEndDk}&select=date_key,score,sleep_time,wake_time`),
    // 이번 주 감상 스트립(월~일 전체) — 리듬 흐름 비교와 달리 오늘까지 절단하지 않고 7일 전체를 봄
    supaFetch(`rhythm_blocks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    supaFetch(`contents?month_key=in.(${spanStartMk},${spanEndMk})`),
    // 이번 주 코멘트 타임라인용 감상 메모(월 경계를 넘을 수 있어 두 달치 모두 조회 후 주간 범위로 필터링).
    // 시작월=종료월(대부분의 주)이면 같은 로우를 두 번 받게 되는데, 중복 제거는 renderWeekNoteTimeline에서 처리.
    supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('wcal_note_'+spanStartMk)}`),
    supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('wcal_note_'+spanEndMk)}`)
  ]);

  renderWeekGoals(goalRows&&goalRows[0]);
  renderWeekHabitMatrix(habits||[],habitChecks||[],weekDates);
  renderWeekSleepReport(sleepReportRows||[]);
  renderWeekDelta({
    memos:memos||[],todos:todos||[],sleepRows:sleepRows||[],habits:habits||[],checks:habitChecks||[],contents:contents||[],
    startDk,endDk:cmpEndDk,cmpDayCount
  },{
    memos:lwMemos||[],todos:lwTodos||[],sleepRows:lwSleepRows||[],checks:lwHabitChecks||[],contents:lwContents||[],
    startDk:lastStartDk,endDk:lastCmpEndDk
  });
  renderWeekRhythmFlow(rblocksThis||[],rblocksLast||[],cmpDayCount);
  renderWeekOneline(onelineRows||[],weekDates);
  renderWeekWatchStrip(weekDates,wcalStripRblocks||[],wcalStripContents||[]);
  renderWeekNoteTimeline(weekDates,wcalStripContents||[],wcalNoteRowsA,wcalNoteRowsB);
}

function _minToHHMM(min){const h=Math.floor(min/60),m=min%60;return pad(h)+':'+pad(m);}

// 이번 주 모닝루틴 — 오늘 포함 최근 7일 롤링 기준, 항목별 체크 일수를 얇은 막대로 표시(2열 그리드, 본앱 하단 통계그리드와 동일 배치).
// 달성률 자체보다 "얼마나 루틴화됐는지"를 가볍게 보여주는 용도라 궤도 UI 없이 심플하게.
// 이번 주 수면 리포트 — 최근 2주 롤링 기준, 목표(SLEEP_GOAL_MIN) 대비/평균컨디션/달성률/규칙성 4지표 풀와이드 카드.
function renderWeekSleepReport(rows){
  const el=document.getElementById('week-sleep-report');
  if(!el)return;
  const validSleep=(rows||[]).filter(r=>r.sleep_time&&r.wake_time);
  const {avgMin,avgScore,reg}=_sleepStatsOf(validSleep);

  const avgSleepHtml=avgMin!=null?`${Math.floor(avgMin/60)}<span class="unit">시간</span> ${avgMin%60}<span class="unit">분</span>`:'-';
  const diffMin=avgMin!=null?avgMin-SLEEP_GOAL_MIN:null;
  const diffHtml=diffMin!=null
    ?`목표 대비 <b style="color:${diffMin<0?'#c0788a':'#5a9a7a'};">${diffMin>0?'+':''}${diffMin}분</b>`
    :'데이터 없음';

  const scoreLevel=avgScore!=null?getSleepScoreLevel(avgScore):null;

  // 목표 달성률 — 목표 대비 근접도 평균(초과 수면은 100%로 인정, 부족한 만큼만 감점)
  const goalPct=validSleep.length
    ?Math.round(validSleep.reduce((sum,r)=>{
        const durMin=_sleepDurMinOf(r);
        const pct=durMin>=SLEEP_GOAL_MIN?100:Math.max(0,100-(SLEEP_GOAL_MIN-durMin)/SLEEP_GOAL_MIN*100);
        return sum+pct;
      },0)/validSleep.length)
    :0;

  el.innerHTML=`<div class="wsleep2-grid">
    <div class="wsleep2-item">
      <div class="wsleep2-icon-box" style="background:rgba(190,220,240,0.35);"><i class="ti ti-bed" style="color:rgba(80,130,170,0.9);" aria-hidden="true"></i></div>
      <div class="wsleep2-label">평균 수면시간</div>
      <div class="wsleep2-val">${avgSleepHtml}</div>
      <div class="wsleep2-sub">${diffHtml}</div>
    </div>
    <div class="wsleep2-item">
      <div class="wsleep2-icon-box" style="background:rgba(190,225,205,0.4);"><i class="ti ti-heart" style="color:rgba(90,155,120,0.9);" aria-hidden="true"></i></div>
      <div class="wsleep2-label">평균 수면 컨디션</div>
      <div class="wsleep2-val">${avgScore!=null?avgScore:'-'}<span class="unit">${avgScore!=null?'점':''}</span></div>
      ${scoreLevel?`<div class="wsleep2-badge" style="background:rgba(190,225,205,0.35);color:#4a8f6a;">${scoreLevel.label}</div>`:'<div class="wsleep2-sub">데이터 없음</div>'}
    </div>
    <div class="wsleep2-item">
      <div class="wsleep2-icon-box" style="background:rgba(255,222,170,0.4);"><i class="ti ti-target-arrow" style="color:rgba(200,150,60,0.9);" aria-hidden="true"></i></div>
      <div class="wsleep2-label">목표 달성률</div>
      <div class="wsleep2-val">${goalPct}<span class="unit">%</span></div>
      <div class="wsleep2-sub">7시간 30분 기준</div>
    </div>
    <div class="wsleep2-item">
      <div class="wsleep2-icon-box" style="background:rgba(216,190,225,0.4);"><i class="ti ti-activity" style="color:rgba(150,100,170,0.9);" aria-hidden="true"></i></div>
      <div class="wsleep2-label">수면 규칙성</div>
      <div class="wsleep2-val">${reg?reg.score:'-'}<span class="unit">${reg?'점':''}</span></div>
      ${reg?`<div class="wsleep2-badge" style="background:rgba(216,190,225,0.35);color:${reg.color};">${reg.label}</div>`:'<div class="wsleep2-sub">데이터 없음</div>'}
    </div>
  </div>
  <div class="wsleep2-foot">최근 2주 기준</div>`;
}

// 지난주 대비 — 오늘 요일까지로 절단된 동일 범위끼리 비교(주 진행 중엔 항상 마이너스로 왜곡되는 문제 방지)
function renderWeekDelta(cur,prev){
  const el=document.getElementById('week-delta');
  const curDone=cur.todos.filter(t=>t.done).length;
  const prevDone=prev.todos.filter(t=>t.done).length;
  const curHabitPct=cur.habits.length?Math.round(_uniqueHabitCheckCount(cur.checks)/(cur.habits.length*cur.cmpDayCount)*100):0;
  const prevHabitPct=cur.habits.length?Math.round(_uniqueHabitCheckCount(prev.checks)/(cur.habits.length*cur.cmpDayCount)*100):0;
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

  el.innerHTML=items.map(it=>{
    const diff=Math.round((it.cur-it.prev)*10)/10;
    const dir=diff>0?'up':(diff<0?'down':'flat');
    const arrow=dir==='up'?'ti-arrow-up':(dir==='down'?'ti-arrow-down':'ti-minus');
    const sign=diff>0?'+':'';
    return `<div class="wd-item">
      <div class="wd-item-top"><i class="ti ${it.icon}" aria-hidden="true"></i><span class="wd-num">${it.fmt(it.cur)}</span></div>
      <div class="wd-delta ${dir}"><i class="ti ${arrow}" style="font-size:10px;"></i>${sign}${it.fmt(diff)}</div>
    </div>`;
  }).join('');
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
  const curD=_rhythmDurByCat(rblocksThis);
  const lastD=_rhythmDurByCat(rblocksLast);

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

  // 지난주 평균/이번주 현재 모두 동일 진행일수(cmpDayCount) 기준 일평균 — 과거 완결 주끼리 비교할 땐 cmpDayCount가 7이라 기존과 동일.
  el.innerHTML=barRow('지난주 평균',lastD.d,lastD.total,cmpDayCount)+barRow('이번주 현재',curD.d,curD.total,cmpDayCount);
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

// 이번 주 감상 스트립 — 월간탭 감상달력과 같은 데이터 소스(rhythm_blocks+contents)를 그 주(월~일) 범위로 재사용.
// 요일 7칸에 그 날 감상한 콘텐츠 포스터(또는 카테고리 폴백)를 표시, 여러 개면 겹쳐서 조합. 칸을 누르면 아래에 정방형 포스터+제목+진행중여부 간단 상세.
let _weekWatchByDate={};
let _weekWatchSelectedDk=null;
function renderWeekWatchStrip(weekDates,rblocks,contents){
  const el=document.getElementById('week-watch-strip');
  if(!el)return;
  _weekWatchByDate={};
  _weekWatchSelectedDk=null;
  const push=(dk,item)=>{if(!_weekWatchByDate[dk])_weekWatchByDate[dk]=[];_weekWatchByDate[dk].push(item);};
  (rblocks||[]).forEach(b=>{
    if(b.cat!=='enjoy'||!b.text)return;
    let cat=null,title=null;
    if(b.text.startsWith('드라마 - ')){cat='drama';title=b.text.slice(6);}
    else if(b.text.startsWith('독서 - ')){cat='book';title=b.text.slice(5);}
    if(!cat)return;
    push(b.date_key,{cat,title,status:null});
  });
  (contents||[]).filter(c=>c.content_cat==='music'&&c.start_date).forEach(c=>{
    if(weekDates.includes(c.start_date))push(c.start_date,{cat:'music',title:c.title,poster:c.poster,status:c.status});
  });
  // 영화는 리듬 기록 유무와 무관하게 contents 하나만 기준(시작일)으로 판단(2026-08-25 단순화, 감상달력과 동일 규칙).
  (contents||[]).filter(c=>c.content_cat==='movie'&&c.start_date).forEach(c=>{
    if(weekDates.includes(c.start_date))push(c.start_date,{cat:'movie',title:c.title,poster:c.poster,status:c.status});
  });
  const posterByTitle={},statusByTitle={};
  (contents||[]).forEach(c=>{if(c.content_cat!=='music'&&c.title){posterByTitle[c.title]=c.poster||null;statusByTitle[c.title]=c.status||null;}});
  Object.values(_weekWatchByDate).forEach(list=>list.forEach(it=>{
    if(it.cat!=='music'){it.poster=posterByTitle[it.title]||null;if(it.status==null)it.status=statusByTitle[it.title]||null;}
  }));
  Object.keys(_weekWatchByDate).forEach(dk=>{
    const seen=new Set();
    _weekWatchByDate[dk]=_weekWatchByDate[dk].filter(it=>{const key=it.cat+'|'+it.title;if(seen.has(key))return false;seen.add(key);return true;});
  });
  const hasAny=Object.keys(_weekWatchByDate).length>0;
  if(!hasAny){el.innerHTML='<div class="empty-msg">이번 주엔 기록된 감상이 없어요</div>';renderWeekWatchDetail();return;}
  const today=dateKey(new Date());
  el.innerHTML=weekDates.map((dk,i)=>{
    const items=_weekWatchByDate[dk]||[];
    const dayNum=parseInt(dk.slice(8,10),10);
    const isToday=dk===today;
    if(!items.length)return `<div class="wcal-week-cell${isToday?' today':''}"><div class="wcal-date-plain">${dayNum}</div></div>`;
    return `<div class="wcal-week-cell${isToday?' today':''}"><div class="wcal-thumb" onclick="weekWatchSelectDay('${dk}')">${_wcalBuildThumb(items)}</div></div>`;
  }).join('');
  renderWeekWatchDetail();
}
function weekWatchSelectDay(dk){
  _weekWatchSelectedDk=(_weekWatchSelectedDk===dk)?null:dk;
  renderWeekWatchDetail();
}
// 감상 미선택 상태에서 존재감 없이 띄우는 감성 문구 — 렌더될 때마다 랜덤으로 하나 고름.
const WEEK_WATCH_EMPTY_PHRASES=[
  '좋은 작품 하나가 오늘을 완성해줄 거예요',
  '이번 주, 어떤 이야기들을 만났나요',
  '스쳐간 장면들이 여기 남아있어요',
  '하루의 끝에 남는 건 결국 좋은 이야기 하나',
  '그날의 감상을 다시 꺼내보세요',
  'A good story completes the day',
  "Where the week's stories live",
  'Every scene leaves a little trace',
  'Some stories stay with us'
];
// 정방형 포스터+제목+진행중/완결 여부만 간단히, 최대 2개까지 — 코멘트 카드와 세로 길이를 맞추기 위해 딱 이 정도 정보량으로 고정.
function renderWeekWatchDetail(){
  const el=document.getElementById('week-watch-detail');
  if(!el)return;
  if(!_weekWatchSelectedDk){
    const phrase=WEEK_WATCH_EMPTY_PHRASES[Math.floor(Math.random()*WEEK_WATCH_EMPTY_PHRASES.length)];
    el.innerHTML=`<div class="week-watch-empty-phrase">${escapeHtml(phrase)}</div>`;
    return;
  }
  const items=(_weekWatchByDate[_weekWatchSelectedDk]||[]).slice(0,2);
  if(!items.length){
    const phrase=WEEK_WATCH_EMPTY_PHRASES[Math.floor(Math.random()*WEEK_WATCH_EMPTY_PHRASES.length)];
    el.innerHTML=`<div class="week-watch-empty-phrase">${escapeHtml(phrase)}</div>`;
    return;
  }
  el.innerHTML=items.map(it=>{
    const m=WCAL_CAT_META[it.cat]||{icon:'ti-stack-2',color:'rgba(150,150,150,1)'};
    const thumb=it.poster
      ?`<img src="${it.poster}" class="week-watch-detail-thumb" />`
      :`<div class="week-watch-detail-thumb" style="background:${m.color};display:flex;align-items:center;justify-content:center;"><i class="ti ${m.icon}" style="color:#fff;" aria-hidden="true"></i></div>`;
    const statusTag=it.status==='watching'?'<span class="status-badge">진행중</span>':(it.status==='done'?'<span class="status-badge done">완결</span>':'');
    return `<div class="week-watch-detail-item">${thumb}<span class="week-watch-detail-title">${escapeHtml(it.title||'')}</span>${statusTag}</div>`;
  }).join('');
}

// 이번 주 코멘트 타임라인 — 그 주(월~일)에 완결된 리뷰와 남긴 감상 메모를 날짜순으로. 코멘트 모아보기와 같은 렌더 로직(_chRenderNoteTimelineByDate) 재사용.
function renderWeekNoteTimeline(weekDates,contents,noteRowsA,noteRowsB){
  const el=document.getElementById('week-note-timeline');
  if(!el)return;
  const finals=[];
  (contents||[]).forEach(c=>{
    if(c.review&&c.review.trim()){
      const dk=c.end_date||c.start_date||'';
      if(weekDates.includes(dk))finals.push({cid:c.client_id,cat:c.content_cat,title:c.title,poster:c.poster||null,stars:c.stars||0,review:c.review||'',dk});
    }
  });
  const notes=[];
  const seenNoteKeys=new Set();
  const posterByCid={};
  (contents||[]).forEach(c=>{if(c.client_id)posterByCid[c.client_id]=c.poster||null;});
  [noteRowsA,noteRowsB].forEach(rows=>{
    const lines=(rows&&rows[0]&&Array.isArray(rows[0].lines))?rows[0].lines:[];
    lines.forEach(n=>{
      if(!weekDates.includes(n.dk))return;
      const key=(n.cid||'')+'|'+n.dk+'|'+(n.text||'')+'|'+(n.updatedAt||'');
      if(seenNoteKeys.has(key))return; // 시작월=종료월인 주는 A/B가 같은 로우라 여기서 걸러짐
      seenNoteKeys.add(key);
      notes.push({...n,poster:n.cid?(posterByCid[n.cid]||null):null});
    });
  });
  if(!finals.length&&!notes.length){el.innerHTML='<div class="ch-note-tl-empty">이번 주엔 남긴 코멘트가 없어요</div>';return;}
  el.innerHTML=_chRenderNoteTimelineByDate(finals,notes);
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
  await renderMonthContentGrid(y,mo);
  await renderChaeumLogTablet();
  _wcalDate=new Date(_monthCalDate);
  await renderWatchCal();
  lockContentCollectToReadingCal();
}

// 감상달력(top-row 첫 카드)의 실제 렌더링 높이를 콘텐츠모아보기 카드의 절대 상한으로 고정.
// 콘텐츠모아보기가 아무리 길어져도 이 값을 넘지 못하고 내부 스크롤로만 처리됨.
function lockContentCollectToReadingCal(){
  const topRow=document.querySelector('.top-row');
  if(!topRow)return;
  const rdCard=topRow.children[0];
  const ccolCard=document.querySelector('.cgrid-card');
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
  el.innerHTML=lines.map(l=>`<div class="mgoal-row"><span>${escapeHtml(l)}</span></div>`).join('');
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
// ── 콘텐츠 아카이브(그리드형) ──
let _cgridFilter='all';
let _cgridStatusFilter='all'; // 'all'|'watching'|'done' — 카테고리 필터와 별개 축, AND로 함께 적용
let _cgridContents=[]; // 현재 달(또는 연간) 콘텐츠 원본 캐시(필터 전환 시 재조회 없이 재사용)
let _cgridYearMode=false;
// 카테고리 필터 칩도 상태필터와 동일한 순환 배지 방식 — 탭할 때마다 전체→도서→드라마→영화→음악→전체 순환.
const CGRID_CAT_CYCLE=['all','book','drama','movie','music'];
const CGRID_CAT_META={
  all:{label:'전체',icon:'ti-stack-2'},
  book:{label:'도서',icon:'ti-book'},
  drama:{label:'드라마',icon:'ti-device-tv'},
  movie:{label:'영화',icon:'ti-movie'},
  music:{label:'음악',icon:'ti-music'}
};
function cycleCgridFilter(){
  const idx=CGRID_CAT_CYCLE.indexOf(_cgridFilter);
  _cgridFilter=CGRID_CAT_CYCLE[(idx+1)%CGRID_CAT_CYCLE.length];
  _updateCgridFilterChipUI();
  _renderCgridFromCache();
}
function _updateCgridFilterChipUI(){
  const el=document.getElementById('cgrid-cat-chip');if(!el)return;
  const meta=CGRID_CAT_META[_cgridFilter];
  el.className=`cgrid-status-chip cat-${_cgridFilter}`;
  el.innerHTML=`<i class="ti ${meta.icon}" aria-hidden="true"></i>${_cgridFilter==='all'?'':meta.label}`;
}
// 상태필터 칩 하나를 탭할 때마다 전체→진행중→완결→전체 순환. 칩 자체가 현재 상태를 표시(라벨+색)하는 토글 배지.
const CGRID_STATUS_CYCLE=['all','watching','done'];
const CGRID_STATUS_META={all:{label:'전체',icon:'ti-apps'},watching:{label:'진행중',icon:'ti-player-play'},done:{label:'완결',icon:'ti-check'}};
function cycleCgridStatusFilter(){
  const idx=CGRID_STATUS_CYCLE.indexOf(_cgridStatusFilter);
  _cgridStatusFilter=CGRID_STATUS_CYCLE[(idx+1)%CGRID_STATUS_CYCLE.length];
  _updateCgridStatusChipUI();
  _renderCgridFromCache();
}
function _updateCgridStatusChipUI(){
  const el=document.getElementById('cgrid-status-chip');if(!el)return;
  const meta=CGRID_STATUS_META[_cgridStatusFilter];
  el.className=`cgrid-status-chip status-${_cgridStatusFilter}`;
  el.innerHTML=`<i class="ti ${meta.icon}" aria-hidden="true"></i>${_cgridStatusFilter==='all'?'':meta.label}`;
}
// 제목 옆 "연간모아보기" 토글 — 켜면 그 순간 보고 있던 연도 전체를, 끄면 다시 이번 월로 복귀
async function toggleCgridYearMode(){
  _cgridYearMode=!_cgridYearMode;
  document.getElementById('cgrid-year-toggle').classList.toggle('on',_cgridYearMode);
  if(_cgridYearMode){
    await _loadCgridYearly(_monthCalDate.getFullYear());
  }else{
    await renderMonthContentGrid(_monthCalDate.getFullYear(),_monthCalDate.getMonth());
  }
}
async function _loadCgridYearly(y){
  const rows=await supaFetch(`contents?month_key=like.${y}-*`);
  const months=[];for(let mo=1;mo<=12;mo++)months.push(`${y}-${pad(mo)}`);
  await _loadCgridNotesForMonths(months);
  const belongsHere=c=>{
    if(c.status==='done'||c.status==='stopped')return true;
    return c.status==='watching'&&y===new Date().getFullYear();
  };
  _cgridContents=(rows||[]).filter(belongsHere).sort((a,b)=>(b.created||0)-(a.created||0));
  _cgridFilter='all';
  _cgridStatusFilter='all';
  _updateCgridFilterChipUI();
  _updateCgridStatusChipUI();
  _renderCgridFromCache();
}
async function renderMonthContentGrid(y,mo){
  const mk=`${y}-${pad(mo+1)}`;
  const prevMk=monthKeyOf(new Date(y,mo-1,1));
  const isSameMonth=mk===monthKeyOf(new Date());
  _cgridFilter='all';
  _cgridStatusFilter='all';
  _cgridYearMode=false;
  const yearToggleEl=document.getElementById('cgrid-year-toggle');
  if(yearToggleEl)yearToggleEl.classList.remove('on');
  _updateCgridFilterChipUI();
  _updateCgridStatusChipUI();
  const [curRows,prevRows]=await Promise.all([
    supaFetch(`contents?month_key=eq.${mk}`),
    supaFetch(`contents?month_key=eq.${prevMk}`)
  ]);
  await _loadCgridNotesForMonths([mk,prevMk]);
  const belongsHere=c=>{
    if(c.status==='done'||c.status==='stopped')return isContentEndedInMonthTablet(c,mk);
    return c.status==='watching'&&isSameMonth;
  };
  _cgridContents=[...(curRows||[]).filter(belongsHere),...(prevRows||[]).filter(belongsHere)]
    .sort((a,b)=>(b.created||0)-(a.created||0));
  _renderCgridFromCache();
}
// 카테고리+상태 필터를 함께 적용 — _renderCgridFromCache/toggleCgridDetail에서 공용
function _cgridFilteredList(){
  let list=_cgridFilter==='all'?_cgridContents:_cgridContents.filter(c=>c.content_cat===_cgridFilter);
  if(_cgridStatusFilter==='watching')list=list.filter(c=>c.status==='watching');
  else if(_cgridStatusFilter==='done')list=list.filter(c=>c.status==='done'||c.status==='stopped');
  return list;
}
function _renderCgridFromCache(){
  const el=document.getElementById('month-content-grid');
  if(!el)return;
  const list=_cgridFilteredList();
  _cgridActiveId=null;
  if(!list.length){el.innerHTML='<div class="empty-msg">이 달엔 해당하는 콘텐츠가 없어요</div>';return;}
  el.innerHTML=`<div class="cgrid-grid" id="cgrid-grid-inner">${_cgridRowsHtml(list)}</div>`;
}
// 3개씩 행 단위로 렌더 — 펼침 영역을 그 행 바로 뒤에 3칸 전체폭으로 삽입하기 위해 행 경계를 알아야 함
function _cgridRowsHtml(list){
  let html='';
  for(let i=0;i<list.length;i+=3){
    const row=list.slice(i,i+3);
    html+=row.map(c=>_cgridItemHtml(c)).join('');
    const activeInRow=row.find(c=>c.id===_cgridActiveId);
    html+=`<div class="cgrid-detail-row-wrap${activeInRow?' on':''}" id="cgrid-detail-wrap-${i}">${activeInRow?_cgridDetailHtml(activeInRow):''}</div>`;
  }
  return html;
}
let _cgridActiveId=null;
// 감상 메모(goal_notes, note_key='wcal_note_YYYY-MM', lines:[{cid,dk,title,cat,text,time,updatedAt}]) — cid별로 모아 캐시.
let _cgridNotesByCid={};
async function _loadCgridNotesForMonths(months){
  const rows=await Promise.all(months.map(mk=>supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('wcal_note_'+mk)}`)));
  _cgridNotesByCid={};
  rows.forEach(r=>{
    const lines=(r&&r[0]&&Array.isArray(r[0].lines))?r[0].lines:[];
    lines.forEach(n=>{
      if(!n.cid)return;
      (_cgridNotesByCid[n.cid]=_cgridNotesByCid[n.cid]||[]).push(n);
    });
  });
  Object.values(_cgridNotesByCid).forEach(list=>list.sort((a,b)=>(b.dk||'').localeCompare(a.dk||'')));
}
function _cgridPeriodLabel(c){
  const s=c.start_date,e=c.end_date;
  if(s&&e&&s!==e)return `${s.slice(5).replace('-','.')}~${e.slice(5).replace('-','.')}`;
  return (e||s||'').slice(5).replace('-','.');
}
// 본앱 _cmrDetailBodyHtml과 동일한 구조 — 완결 총평(Comment)과 감상 메모(Timeline)를 함께 표시
function _cgridDetailHtml(c){
  const period=_cgridPeriodLabel(c);
  const stars=c.stars>0?`<span class="cgrid-detail-stars">${'★'.repeat(c.stars)}</span>`:'';
  const topRow=(period||stars)?`<div class="cgrid-detail-row"><span class="cgrid-detail-row-date">${period?`<i class="ti ti-calendar" style="font-size:12px;" aria-hidden="true"></i>${period}`:''}</span>${stars}</div>`:'';
  const finalHtml=c.review?`<div class="cgrid-detail-final"><span class="cgrid-detail-final-lbl">Comment :</span> ${escapeHtml(c.review)}</div>`:'';
  const notes=_cgridNotesByCid[c.client_id]||[];
  const notesHtml=notes.length?`<div class="cgrid-detail-notes${c.review?' with-final':''}">
    <div class="cgrid-detail-notes-lbl">Timeline</div>
    <div class="cgrid-detail-notes-tl">
      ${notes.map(n=>{
        const dispDate=n.dk?(parseInt(n.dk.slice(5,7),10)+'/'+parseInt(n.dk.slice(8,10),10)):'';
        return `<div class="cgrid-detail-note-item"><span class="cgrid-detail-note-date">${dispDate}</span><span>${escapeHtml(n.text||'')}</span></div>`;
      }).join('')}
    </div>
  </div>`:'';
  return `<div class="cgrid-detail">${topRow}${finalHtml}${notesHtml}</div>`;
}
function _cgridItemHtml(c){
  const meta=CAT_ICON_META[c.content_cat]||{icon:'ti-stack-2',bg:'rgba(150,150,150,1)'};
  const thumb=c.poster
    ?`<img class="cgrid-thumb" src="${c.poster}" />`
    :`<div class="cgrid-thumb-fallback" style="background:${meta.bg};"><i class="ti ${meta.icon}" aria-hidden="true"></i></div>`;
  const statusDot=c.status==='watching'?'<span class="status-badge dot">진행중</span>':'';
  const icons=[];
  if(c.stars>0)icons.push('<i class="ti ti-star" aria-hidden="true"></i>');
  if(c.review||(_cgridNotesByCid[c.client_id]&&_cgridNotesByCid[c.client_id].length))icons.push('<i class="ti ti-message-circle" aria-hidden="true"></i>');
  const thumbIcons=icons.length?`<div class="cgrid-thumb-icons">${icons.join('')}</div>`:'';
  const active=c.id===_cgridActiveId;
  return `<div class="cgrid-item${active?' active':''}" data-cid="${c.id}" onclick="toggleCgridDetail('${c.id}')">
    <div class="cgrid-thumb-wrap">${thumb}${statusDot}${thumbIcons}</div>
    <div class="cgrid-title">${escapeHtml(c.title||'')}</div>
  </div>`;
}
function toggleCgridDetail(id){
  _cgridActiveId=(_cgridActiveId===id)?null:id;
  const el=document.getElementById('cgrid-grid-inner');
  if(el)el.innerHTML=_cgridRowsHtml(_cgridFilteredList());
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
    checkCount:_uniqueHabitCheckCount(checks),
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

// ── 감상 달력 (본앱 wcal 구조 이식, 조회 전용 — 월 이동만 가능, 등록/코멘트작성 없음) ──
const WCAL_CAT_META={
  drama:{label:'드라마',icon:'ti-device-tv',color:'rgba(var(--pal-pink-rgb),1)'},
  movie:{label:'영화',icon:'ti-movie',color:'rgba(var(--pal-sky-rgb),1)'},
  book:{label:'책',icon:'ti-book',color:'rgba(var(--pal-yellow-rgb),1)'},
  music:{label:'음악',icon:'ti-music',color:'rgba(var(--pal-lime-rgb),1)'}
};
let _wcalFilter='all';
let _wcalByDate={};
function wcalMonthShift(delta){
  _wcalDate.setMonth(_wcalDate.getMonth()+delta);
  renderWatchCal().then(lockContentCollectToReadingCal);
}
function wcalSetFilter(cat){
  _wcalFilter=cat;
  renderWatchCalGrid();
  renderWcalFilterChips();
}
// 드라마/영화/책은 rhythm_blocks(cat='enjoy', text="드라마 - 제목" 등)의 date_key가 감상일.
// 음악은 리듬 기록이 없어 contents(content_cat='music')의 start_date(=등록일)를 그 날의 기록으로 사용.
async function renderWatchCal(){
  const y=_wcalDate.getFullYear(),m=_wcalDate.getMonth();
  const mk=`${y}-${pad(m+1)}`;
  const prevMk=monthKeyOf(new Date(y,m-1,1));
  document.getElementById('wcal-month-label').textContent=`${y}년 ${pad(m+1)}월`;
  _wcalByDate={};
  const push=(dk,item)=>{if(!_wcalByDate[dk])_wcalByDate[dk]=[];_wcalByDate[dk].push(item);};

  const [rblocks,curContents,prevContents,manualRows]=await Promise.all([
    supaFetch(`rhythm_blocks?date_key=gte.${mk}-01&date_key=lte.${mk}-31`),
    supaFetch(`contents?month_key=eq.${mk}`),
    supaFetch(`contents?month_key=eq.${prevMk}`),
    supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('wcal_manual_'+mk)}`)
  ]);

  (rblocks||[]).forEach(b=>{
    if(b.cat!=='enjoy'||!b.text)return;
    let cat=null,title=null;
    if(b.text.startsWith('드라마 - ')){cat='drama';title=b.text.slice(6);}
    else if(b.text.startsWith('독서 - ')){cat='book';title=b.text.slice(5);}
    if(!cat)return;
    push(b.date_key,{cat,title});
  });
  const contents=curContents||[];
  contents.filter(c=>c.content_cat==='music'&&c.start_date).forEach(c=>{
    push(c.start_date,{cat:'music',title:c.title,poster:c.poster,cid:c.client_id||null});
  });
  // 영화는 리듬 기록 유무와 무관하게 contents 하나만 기준으로 판단(2026-08-25 단순화, 오늘의 감상과 동일 규칙).
  // 달력엔 시작일 하루에만 찍음 — 하루짜리든 기간형이든 "언제부터 봤는지"가 감상 시작 지점으로 가장 명확한 기준.
  contents.filter(c=>c.content_cat==='movie'&&c.start_date).forEach(c=>{
    push(c.start_date,{cat:'movie',title:c.title,poster:c.poster,cid:c.client_id||null});
  });
  // 수동 추가분(드라마/책) — 자동 수집(리듬 기록)이 못 잡는 사각지대(오디오북 미등록, TV 감상탭 미입력 등) 보충용
  const manualLines=(manualRows&&manualRows[0]&&Array.isArray(manualRows[0].lines))?manualRows[0].lines:[];
  manualLines.forEach(it=>push(it.dk,{cat:it.cat,title:it.title}));

  const posterByTitle={},cidByTitle={};
  [...contents,...(prevContents||[])].forEach(c=>{
    if(c.content_cat!=='music'&&c.title){posterByTitle[c.title]=c.poster||null;cidByTitle[c.title]=c.client_id||null;}
  });
  Object.values(_wcalByDate).forEach(list=>list.forEach(it=>{
    if(it.cat!=='music'){it.poster=posterByTitle[it.title]||null;it.cid=cidByTitle[it.title]||null;}
  }));

  Object.keys(_wcalByDate).forEach(dk=>{
    const seen=new Set();
    _wcalByDate[dk]=_wcalByDate[dk].filter(it=>{
      const key=it.cat+'|'+it.title;
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
  });

  renderWcalFilterChips();
  document.getElementById('wcal-weekday-row').innerHTML=DOW_MON_START.map(d=>`<span>${d}</span>`).join('');
  renderWatchCalGrid();
  renderWcalMonthSummary(contents,prevContents||[],mk);
}
// 감상달력 하단 — 이 달의 카테고리별 진행중+완결 누계(작품 단위, 중복 없음). 콘텐츠그리드(renderMonthContentGrid)와 동일한 belongsHere 기준.
// 음악은 진행중/완결 개념이 없어 등록 건수를 그대로 완결로 집계.
function renderWcalMonthSummary(curContents,prevContents,mk){
  const el=document.getElementById('wcal-month-summary');if(!el)return;
  const isSameMonth=mk===monthKeyOf(new Date());
  const belongsHere=c=>{
    if(c.content_cat==='music')return true; // 등록 건수를 그대로 완결로 카운트
    if(c.status==='done'||c.status==='stopped')return isContentEndedInMonthTablet(c,mk);
    return c.status==='watching'&&isSameMonth;
  };
  const list=[...curContents,...prevContents].filter(belongsHere);
  const counts={drama:0,movie:0,book:0,music:0};
  list.forEach(c=>{if(counts[c.content_cat]!==undefined)counts[c.content_cat]++;});
  const parts=Object.keys(WCAL_CAT_META)
    .filter(k=>counts[k]>0)
    .map(k=>`<span class="wcal-summary-item"><i class="ti ${WCAL_CAT_META[k].icon}" aria-hidden="true"></i>${counts[k]}</span>`);
  el.innerHTML=parts.length?parts.join(''):'<div class="wcal-summary-empty">이 달엔 기록된 감상이 없어요</div>';
}
function renderWcalFilterChips(){
  const el=document.getElementById('wcal-filter-chips');if(!el)return;
  const cats=[{key:'all',label:'전체',icon:'ti-apps'},...Object.keys(WCAL_CAT_META).map(k=>({key:k,label:WCAL_CAT_META[k].label,icon:WCAL_CAT_META[k].icon}))];
  el.innerHTML=cats.map(c=>`<div class="wcal-filter-chip${c.key===_wcalFilter?' on':''}" data-cat="${c.key}" onclick="wcalSetFilter('${c.key}')"><i class="ti ${c.icon}" aria-hidden="true" style="font-size:12px;margin-right:3px;"></i>${c.label}</div>`).join('');
}
function _wcalFilteredItems(dk){
  const items=_wcalByDate[dk]||[];
  return _wcalFilter==='all'?items:items.filter(it=>it.cat===_wcalFilter);
}
function _wcalSwatch(it){
  const m=WCAL_CAT_META[it.cat];
  if(it.poster)return `<img src="${it.poster}" alt="">`;
  return `<div class="wcal-cat-fallback" style="background:${m.color};"><i class="ti ${m.icon}" aria-hidden="true"></i></div>`;
}
function _wcalBuildThumb(items){
  const n=items.length;
  if(n===1)return _wcalSwatch(items[0]);
  if(n===2)return `<div class="wcal-split2">${items.slice(0,2).map(_wcalSwatch).join('')}</div>`;
  if(n===3)return `<div class="wcal-split3">${_wcalSwatch(items[0])}<div class="wcal-split3-bottom">${items.slice(1,3).map(_wcalSwatch).join('')}</div></div>`;
  return `<div class="wcal-split4">${items.slice(0,4).map(_wcalSwatch).join('')}</div>${n>4?`<div class="wcal-more">+${n-4}</div>`:''}`;
}
function renderWatchCalGrid(){
  const el=document.getElementById('wcal-grid');if(!el)return;
  const y=_wcalDate.getFullYear(),m=_wcalDate.getMonth();
  const first=new Date(y,m,1);
  const startWeekday=(first.getDay()+6)%7;
  const daysInMonth=new Date(y,m+1,0).getDate();
  let html='';
  for(let i=0;i<startWeekday;i++)html+='<div class="wcal-cell"></div>';
  for(let d=1;d<=daysInMonth;d++){
    const dk=`${y}-${pad(m+1)}-${pad(d)}`;
    const items=_wcalFilteredItems(dk);
    if(!items.length){html+=`<div class="wcal-cell"><div class="wcal-date-plain">${d}</div></div>`;continue;}
    html+=`<div class="wcal-cell"><div class="wcal-thumb">${_wcalBuildThumb(items)}</div></div>`;
  }
  el.innerHTML=html;
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

// 월간리포트 AI 분석 3종(이 달의 궤적/수면/리듬) 공용: Claude 호출 → ```json 코드펜스 제거 →
// JSON.parse → {text} 추출 → ai_cache에 저장까지 처리. 실패 시 null 반환(호출부에서 UI 처리).
async function callClaudeForJsonText(sys,dataContext,cacheKey){
  const reply=await callClaudeFromTablet(sys,dataContext,400);
  if(!reply)return null;
  try{
    const clean=reply.replace(/```json|```/g,'').trim();
    const parsed=JSON.parse(clean);
    if(!parsed||!parsed.text)return null;
    await supaUpsertAiCache(cacheKey,parsed.text);
    return parsed.text;
  }catch(e){return null;}
}

// ══════════════════════════════════════════════════════════
// 리포트탭 — 월간종합/주간종합/주간습관(챌린지리뷰)/주간메모, 월 단위로 모아보기
// ══════════════════════════════════════════════════════════
let _reportMonthDate=new Date();
let _reportFilter=null;
const REPORT_READ_KEY='tablet_report_read'; // localStorage에 읽은 cache_key 집합 저장(빠른 표시용 로컬 캐시)
const REPORT_READ_PREFIX='report_read:'; // Supabase ai_cache에 저장할 때 쓰는 키 접두어(서버 동기화용)
let _readReportsServerSynced=false; // 이번 세션에서 서버 목록을 이미 한 번 받아왔는지

function _loadReadReports(){
  try{
    const raw=localStorage.getItem(REPORT_READ_KEY);
    return raw?new Set(JSON.parse(raw)):new Set();
  }catch(e){return new Set();}
}
function _saveReadReports(set){
  try{localStorage.setItem(REPORT_READ_KEY,JSON.stringify([...set]));}catch(e){}
}
// PWA를 재설치하면 localStorage가 초기화돼 이미 읽었던 리포트가 다시 "안읽음"으로 뜨는 문제가 있었음 —
// Supabase ai_cache에 report_read:{cacheKey} 형태로도 저장해두고, 앱 진입 시 그 목록을 한 번 받아와
// 로컬 Set과 합쳐두면 기기가 바뀌어도(재설치, 다른 기기) 읽음 상태가 유지됨(2026-08-22 확정).
async function _syncReadReportsFromServer(){
  if(_readReportsServerSynced)return; // 세션당 한 번만 — 매 탭 진입마다 전체 목록을 다시 받을 필요는 없음
  try{
    const rows=await supaFetch(`ai_cache?cache_key=like.${encodeURIComponent(REPORT_READ_PREFIX)}*&select=cache_key`);
    const serverSet=_loadReadReports();
    (rows||[]).forEach(r=>serverSet.add(r.cache_key.slice(REPORT_READ_PREFIX.length)));
    _saveReadReports(serverSet);
    _readReportsServerSynced=true;
  }catch(e){/* 서버 동기화 실패해도 로컬 캐시만으로 계속 동작 */}
}
function _markReportRead(cacheKey){
  const set=_loadReadReports();
  if(set.has(cacheKey))return;
  set.add(cacheKey);
  _saveReadReports(set);
  // 서버에도 기록 — 응답을 기다리지 않고 화면은 로컬 캐시로 즉시 갱신(fire-and-forget)
  supaUpsertAiCache(REPORT_READ_PREFIX+cacheKey,'1').catch(()=>{});
}
function _isReportRead(cacheKey){
  return _loadReadReports().has(cacheKey);
}

// 본앱과 동일한 "월 소속 주차" 판정: weekMonthKey(그 주 목요일 기준)와 동일 규칙.
// 예: 8/31~9/6 주는 목요일이 9/3이라 9월 소속(월요일만 8월이어도 9월로 잡힘).
function getReportWeeksOfMonth(y,mo){
  const mk=`${y}-${pad(mo+1)}`;
  const dim=new Date(y,mo+1,0).getDate();
  const weekSet={};
  for(let d=1;d<=dim;d++){
    const date=new Date(y,mo,d);
    if(weekMonthKey(date)===mk)weekSet[weekKeyOf(date)]=true;
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
// 로고 클릭 등으로 리포트탭에 재진입할 때 — 어떤 페이지를 보고 있었든 무조건 이번 달 전체보기로 리셋
function resetReportsView(){
  _reportMonthDate=new Date();
  _reportFilter=null;
  document.querySelectorAll('.report-filter-chip').forEach(el=>el.classList.remove('on'));
}
// 연간모드(습관/메모 박스, 주간종합 리스트)에서 쓰는 "월 정보 포함" 라벨 — 예: "8월 3주차"
// 월 숫자도 wkNo와 같은 기준(목요일 소속)이어야 앞뒤가 맞음 — 월경계 주에서 월요일 월을 쓰면 wkNo와 불일치했던 버그 수정.
function _weekLabelWithMonth(wk,wkNo){
  const mk=weekMonthKey(new Date(wk+'T00:00:00'));
  const mo=Number(mk.split('-')[1]);
  return `${mo}월 ${wkNo}주차`;
}
// 그 주(wk, 월요일 날짜)가 속한 달 안에서 몇 번째 주인지 — weekMonthKey와 동일한 "목요일 소속" 규칙 사용
function _weekNoInMonth(wk){
  const start=new Date(wk+'T00:00:00');
  const mk=weekMonthKey(start);
  const [y,mo0]=mk.split('-').map(Number);
  const weeks=getReportWeeksOfMonth(y,mo0-1);
  const idx=weeks.indexOf(wk);
  return idx>=0?idx+1:1;
}
function setReportFilter(filter){
  // 같은 필터를 다시 누르면 해제(월 전체보기로 복귀), 아니면 해당 필터의 연간모아보기로 전환
  _reportFilter=(_reportFilter===filter)?null:filter;
  document.querySelectorAll('.report-filter-chip').forEach(el=>el.classList.toggle('on',el.dataset.filter===_reportFilter));
  loadReportsTab();
}
function _allWeeksOfYear(y){
  let weeks=[];
  for(let mo=0;mo<12;mo++)weeks=weeks.concat(getReportWeeksOfMonth(y,mo));
  return [...new Set(weeks)].sort();
}
async function loadReportsTab(){
  await _syncReadReportsFromServer();
  const filter=_reportFilter;
  // 필터가 지정돼 있으면(월간종합/주간종합/습관/메모 중 하나 클릭) 해당 섹션만 연간으로 모아보기,
  // 필터 없음(초기 진입/월 이동 직후)이면 기존처럼 그 달 전체를 보여줌.
  document.querySelectorAll('.report-sec').forEach(el=>{
    const sec=el.dataset.sec;
    const show=!filter
      ||((filter==='monthly'||filter==='weekly')&&sec==='summary')
      ||(filter==='habit'&&sec==='habit')
      ||(filter==='memo'&&sec==='memo');
    el.classList.toggle('hidden',!show);
  });
  const subEl=document.getElementById('report-page-sub');
  if(!filter){
    document.getElementById('report-month-nav').classList.remove('hidden');
    if(subEl)subEl.textContent='이 달에 발행된 리포트를 모아봤어요';
    await _loadReportsMonthly();
  }else{
    document.getElementById('report-month-nav').classList.add('hidden');
    if(subEl)subEl.textContent='올해 발행된 리포트를 모아봤어요';
    await _loadReportsYearly(filter);
  }
  _updateSideReportBadge();
}
async function _loadReportsMonthly(){
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

  renderReportSummaryList(monthlyRows,weeksInMonth,weeklyRowsList,mk,false);
  renderReportBoxGrid('report-habit-grid',weeksInMonth,habitRowsList,'habit',false);
  renderReportBoxGrid('report-memo-grid',weeksInMonth,memoRowsList,'memo',false);
}
// filter별로 그 해에 필요한 캐시만 IN 쿼리 1방으로 모아옴 (연간모드 — 콜 수를 최소화)
async function _loadReportsYearly(filter){
  const y=_reportMonthDate.getFullYear();
  document.getElementById('report-page-title').textContent=`${y}년 전체`;
  const weeksInYear=_allWeeksOfYear(y);

  if(filter==='weekly'){
    const sundayKeys=weeksInYear.map(wk=>'weekly_summary_'+_mondayToSundayDk(wk));
    const rows=sundayKeys.length?await supaFetch(`ai_cache?cache_key=in.(${sundayKeys.join(',')})&select=cache_key,content,expires_at`):[];
    const rowsByKey={};(rows||[]).forEach(r=>{rowsByKey[r.cache_key]=r;});
    const weeklyRowsList=weeksInYear.map(wk=>{const r=rowsByKey['weekly_summary_'+_mondayToSundayDk(wk)];return r?[r]:[];});
    renderReportSummaryList(null,weeksInYear,weeklyRowsList,null,true);
  }else if(filter==='monthly'){
    const mkKeys=[];for(let mo=0;mo<12;mo++)mkKeys.push(`monthly_report_${y}-${pad(mo+1)}`);
    const rows=await supaFetch(`ai_cache?cache_key=in.(${mkKeys.join(',')})&select=cache_key,content,expires_at`);
    renderReportMonthlyYearList(rows||[],y);
  }else{
    // habit / memo — 주차별 캐시를 IN 쿼리 1방으로
    const prefix=filter==='habit'?'challenge_review_week:':'weekly_memo_report_week:';
    const keys=weeksInYear.map(wk=>encodeURIComponent(prefix+wk));
    const rows=keys.length?await supaFetch(`ai_cache?cache_key=in.(${keys.join(',')})&select=cache_key,content,expires_at`):[];
    const rowsByKey={};(rows||[]).forEach(r=>{rowsByKey[decodeURIComponent(r.cache_key)]=r;});
    const rowsList=weeksInYear.map(wk=>{const r=rowsByKey[prefix+wk];return r?[r]:[];});
    renderReportBoxGrid(filter==='habit'?'report-habit-grid':'report-memo-grid',weeksInYear,rowsList,filter,true);
  }
}
function renderReportSummaryList(monthlyRows,weeksInMonth,weeklyRowsList,mk,isYearly){
  const el=document.getElementById('report-summary-list');
  const items=[];
  if(!isYearly){
    const mkYear=parseInt(mk.slice(0,4),10),mkMonth=parseInt(mk.slice(5,7),10)-1;
    const monthlyRow=monthlyRows&&monthlyRows[0];
    // 발행된 종합 리포트(캐시)가 없어도, 그 달이 오늘이거나 이미 지난 달이면 리포트 페이지 자체는 열람 가능
    // (진행 중인 달은 hero만 "이 달이 끝나면 정리해드려요"로 안내, 나머지 카드는 오늘까지 누계로 정상 표시됨).
    const now=new Date();
    const isPastOrCurrentMonth=(mkYear<now.getFullYear())||(mkYear===now.getFullYear()&&mkMonth<=now.getMonth());
    if(monthlyRow||isPastOrCurrentMonth){
      const cacheKey=monthlyRow?monthlyRow.cache_key:`monthly_report_${mk}`;
      const read=monthlyRow?_isReportRead(cacheKey):true; // 미발행 상태는 "안 읽음" 배지를 굳이 띄우지 않음
      items.push({cacheKey,kind:'monthly',read,year:mkYear,month:mkMonth,
        icon:'ti-calendar',iconBg:'rgba(255,225,120,0.55)',iconColor:'var(--pal-yellow-border)',
        title:`${mk.slice(5,7).replace(/^0/,'')}월 월간종합 리포트`,sub:`${mk.slice(0,4)}년 ${mk.slice(5,7).replace(/^0/,'')}월 전체 흐름 정리`});
    }
  }
  // 연간모드에선 "N주차"가 월을 넘나들며 의미 없어지므로 "8월 3주차" 형태로 월 표기를 붙임
  weeksInMonth.slice().reverse().forEach((wk,i)=>{
    const idx=weeksInMonth.indexOf(wk);
    const rows=weeklyRowsList[idx];
    const row=rows&&rows[0];
    if(!row)return;
    const cacheKey=row.cache_key;
    const read=_isReportRead(cacheKey);
    const title=isYearly?`${_weekLabelWithMonth(wk,_weekNoInMonth(wk))} 주간종합 리포트`:`${(idx+1)}주차 주간종합 리포트`;
    items.push({cacheKey,kind:'weekly',read,
      icon:'ti-sparkles',iconBg:'rgba(210,175,225,0.5)',iconColor:'var(--pal-lavender-border)',
      title,sub:_weekRangeLabel(wk)});
  });
  if(!items.length){el.innerHTML=`<div class="empty-msg">${isYearly?'올해 아직 발행된 주간종합 리포트가 없어요':'이 달엔 아직 발행된 종합 리포트가 없어요'}</div>`;return;}
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
// 월간종합 필터의 연간모드 — 그 해 발행된 월간 리포트만 최신월 순으로 나열
function renderReportMonthlyYearList(rows,y){
  const el=document.getElementById('report-summary-list');
  const rowsByKey={};(rows||[]).forEach(r=>{rowsByKey[r.cache_key]=r;});
  const now=new Date();
  const items=[];
  for(let mo=11;mo>=0;mo--){
    const mk=`${y}-${pad(mo+1)}`;
    const isPastOrCurrentMonth=(y<now.getFullYear())||(y===now.getFullYear()&&mo<=now.getMonth());
    const row=rowsByKey[`monthly_report_${mk}`];
    if(!row&&!isPastOrCurrentMonth)continue; // 아직 오지 않은 미래 달은 건너뜀
    const cacheKey=row?row.cache_key:`monthly_report_${mk}`;
    const read=row?_isReportRead(cacheKey):true;
    items.push({cacheKey,read,year:y,month:mo,
      title:`${mo+1}월 월간종합 리포트`,sub:`${y}년 ${mo+1}월 전체 흐름 정리`});
  }
  if(!items.length){el.innerHTML='<div class="empty-msg">올해 아직 발행된 월간종합 리포트가 없어요</div>';return;}
  el.innerHTML=items.map(it=>`
    <div class="report-list-item${it.read?' read':''}" data-kind="monthly" onclick="openMonthlyReportPage(${it.year},${it.month})">
      <div class="report-list-dot"></div>
      <div class="report-list-icon" style="background:rgba(255,225,120,0.55);"><i class="ti ti-calendar" style="color:var(--pal-yellow-border);" aria-hidden="true"></i></div>
      <div class="report-list-body">
        <div class="report-list-title">${escapeHtml(it.title)}</div>
        <div class="report-list-sub">${escapeHtml(it.sub)}</div>
      </div>
      <i class="ti ti-chevron-right" aria-hidden="true"></i>
    </div>`).join('');
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
function _reportBoxCardHtml(wk,row,type,meta,wkLabel){
  if(!row||!row.content){
    return `<div class="report-box empty"><div class="report-box-empty-txt">아직 없어요</div></div>`;
  }
  const cacheKey=row.cache_key;
  const read=_isReportRead(cacheKey);
  const title=`${wkLabel} ${type==='habit'?'습관 리뷰':'메모 리포트'}`;
  const{headline,bodyText}=_parseReportPreview(row.content);
  const bodyHtml=headline
    ?`<div class="report-box-body headline-only"><div class="report-box-headline">${escapeHtml(headline)}</div></div>`
    :`<div class="report-box-body text-preview"><div class="report-box-preview-txt">${escapeHtml(bodyText)}</div></div>`;
  return `<div class="report-box${read?' read':''}" onclick="openReportBoxDetail('${cacheKey}','${escapeHtml(title)}',this)">
    ${read?'':'<div class="report-box-dot"></div>'}
    <div class="report-box-hdr">
      <div class="report-box-icon" style="background:${meta.iconBg};"><i class="ti ${meta.icon}" style="color:${meta.iconColor};" aria-hidden="true"></i></div>
      <div><div class="report-box-wk">${wkLabel}</div><div class="report-box-range">${_weekRangeLabel(wk)}</div></div>
    </div>
    ${bodyHtml}
    <div class="report-box-ellipsis">···</div>
  </div>`;
}
function renderReportBoxGrid(elId,weeksInMonth,rowsList,type,isYearly){
  const el=document.getElementById(elId);
  el.classList.toggle('report-box-grid',!isYearly);
  el.classList.toggle('report-box-year-stack',!!isYearly);
  const meta=type==='habit'
    ?{icon:'ti-target-arrow',iconBg:'rgba(145,210,175,0.5)',iconColor:'var(--pal-mint-border)'}
    :{icon:'ti-notes',iconBg:'rgba(170,208,228,0.5)',iconColor:'var(--pal-sky-border)'};
  if(!weeksInMonth.length){el.innerHTML=`<div class="empty-msg">${isYearly?'올해 해당 주차가 없어요':'이 달엔 해당 주차가 없어요'}</div>`;return;}
  // 연간모드는 빈 주차 칸까지 다 그리면 52칸으로 늘어나 지저분해지므로, 실제로 발행된 것만 모아 보여줌
  let entries=weeksInMonth.map((wk,idx)=>({wk,row:(rowsList[idx]&&rowsList[idx][0])||null}));
  if(isYearly)entries=entries.filter(e=>e.row&&e.row.content);
  if(isYearly&&!entries.length){el.innerHTML=`<div class="empty-msg">올해 발행된 ${type==='habit'?'습관 리뷰':'메모 리포트'}가 없어요</div>`;return;}

  if(!isYearly){
    // 단일 월 뷰 — 기존처럼 한 줄 가로 스와이프
    el.innerHTML=entries.slice().reverse().map(({wk,row})=>{
      const wkNo=weeksInMonth.indexOf(wk)+1;
      return _reportBoxCardHtml(wk,row,type,meta,`${wkNo}주차`);
    }).join('');
    return;
  }
  // 연간모드 — 월별로 줄을 나눠 최신월부터 세로로 쌓고, 각 월 줄 안에서만 가로 스와이프.
  // 그룹핑 기준도 weekMonthKey(목요일 소속)로 통일 — 월요일 기준으로 묶으면 월경계 주가 wkNo(목요일 기준)와
  // 다른 달에 표시되는 모순이 생김(예: 8/31 주가 "8월 모음"에 묶이는데 라벨은 "9월 1주차"로 나오는 버그).
  const byMonth={}; // 'YYYY-MM' -> [{wk,row}]
  entries.forEach(({wk,row})=>{
    const mk=weekMonthKey(new Date(wk+'T00:00:00'));
    (byMonth[mk]=byMonth[mk]||[]).push({wk,row});
  });
  const monthKeys=Object.keys(byMonth).sort().reverse();
  el.innerHTML=monthKeys.map(mk=>{
    const moNum=parseInt(mk.slice(5,7),10);
    const cards=byMonth[mk].slice().reverse().map(({wk,row})=>{
      const wkNo=_weekNoInMonth(wk);
      return _reportBoxCardHtml(wk,row,type,meta,`${moNum}월 ${wkNo}주차`);
    }).join('');
    return `<div class="report-box-month-row">
      <div class="report-box-month-label">${moNum}월 모음</div>
      <div class="report-box-grid">${cards}</div>
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
  await _syncReadReportsFromServer();
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
  const lastDayOfThisMonth=new Date(y,mo+1,0).getDate();
  const now=new Date();
  // 조회 중인 달이 "진행 중인 이번 달"이면, 통계 분모를 월 전체 일수가 아니라 "오늘까지의 경과일수"로 절단.
  // 그래야 습관률(체크일수/분모)이나 전월 대비 증감률이 아직 지나지 않은 날짜까지 분모에 넣어 왜곡되는 문제를 막을 수 있음(2026-08-22 확정).
  // 과거(완결된) 달은 기존과 동일하게 그 달 전체 일수를 그대로 사용.
  const isViewingOngoingMonth=(y===now.getFullYear()&&mo===now.getMonth());
  const dim=isViewingOngoingMonth?now.getDate():lastDayOfThisMonth;
  const endDk=`${mk}-${pad(dim)}`;
  const weeksInMonth=getReportWeeksOfMonth(y,mo);

  // 전월 동기간(같은 일수)도 함께 가져와 리듬 비교에 사용 — dim이 절단됐으면 전월도 동일하게 절단된 일수만큼만 비교.
  const prevMonthDate=new Date(y,mo-1,1);
  const py=prevMonthDate.getFullYear(),pmo=prevMonthDate.getMonth();
  const prevMk=monthKeyOf(prevMonthDate);
  const prevDim=Math.min(dim,new Date(py,pmo+1,0).getDate());
  const prevStartDk=`${prevMk}-01`,prevEndDk=`${prevMk}-${pad(prevDim)}`;
  const prevWeeksInMonth=getReportWeeksOfMonth(py,pmo);

  const [monthlyRows,goalRows,todos,memosRows,sleepRows,habits,habitChecksAll,rblocks,prevRblocks,contents,prevContents,wcRowsList,milestoneRows,prevWcRowsList,prevTodos,prevSleepRows,prevHabitChecksAll,trajectoryRows,sleepReportCacheRows,weeklySummaryRowsList,weeklyMemoRowsList,prevMemosRows]=await Promise.all([
    supaFetch(`ai_cache?cache_key=eq.monthly_report_${mk}&select=content`),
    supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('mgoal:'+mk)}`),
    supaFetch(`todos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=done,date_key`),
    supaFetch(`memos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=id`),
    supaFetch(`sleep?date_key=gte.${startDk}&date_key=lte.${endDk}&select=score,sleep_time,wake_time,date_key`),
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
    supaFetch(`sleep?date_key=gte.${prevStartDk}&date_key=lte.${prevEndDk}&select=score,sleep_time,wake_time,date_key`),
    supaFetch(`habit_checks?date_key=gte.${prevStartDk}&date_key=lte.${prevEndDk}`),
    supaFetch(`ai_cache?cache_key=eq.${encodeURIComponent('monthly_trajectory_'+mk)}&select=content`),
    supaFetch(`ai_cache?cache_key=eq.${encodeURIComponent('monthly_sleep_'+mk)}&select=content`),
    // 세 프롬프트(궤적/리듬/수면)가 공통 참고자료로 쓸 그 달 주간종합/주간메모 리포트 — 조회는 한 번만, 정제해서 각 함수에 전달
    Promise.all(weeksInMonth.map(wk=>supaFetch(`ai_cache?cache_key=eq.weekly_summary_${_mondayToSundayDk(wk)}&select=content`))),
    Promise.all(weeksInMonth.map(wk=>supaFetch(`ai_cache?cache_key=eq.${encodeURIComponent('weekly_memo_report_week:'+wk)}&select=content`))),
    supaFetch(`memos?date_key=gte.${prevStartDk}&date_key=lte.${prevEndDk}&select=id`)
  ]);

  // 참고자료 정제: 저장된 HTML 카드에서 태그만 제거한 순수 텍스트로 — 세 프롬프트 공통 재료
  const monthlyRefContext=_mrpBuildRefContext(weeklySummaryRowsList,weeklyMemoRowsList);

  renderMrpHero(monthlyRows&&monthlyRows[0]);
  renderMrpGoalsAndStats(goalRows&&goalRows[0],todos||[],memosRows||[],sleepRows||[],habits||[],habitChecksAll||[],dim,prevTodos||[],prevHabitChecksAll||[],prevMemosRows||[],prevDim);
  const heroCommentText=_mrpExtractHeroComment(monthlyRows&&monthlyRows[0]);
  renderMrpTrajectory(mk,sleepRows||[],habits||[],habitChecksAll||[],rblocks||[],weeksInMonth,dim,
    {sleepRows:prevSleepRows||[],habitChecks:prevHabitChecksAll||[],rblocks:prevRblocks||[],weeksInMonth:prevWeeksInMonth,habits:habits||[]},
    trajectoryRows&&trajectoryRows[0],heroCommentText,monthlyRefContext);
  renderMrpSleep(mk,sleepRows||[],prevSleepRows||[],sleepReportCacheRows&&sleepReportCacheRows[0],monthlyRefContext,heroCommentText);
  renderMrpRhythm(rblocks||[],prevRblocks||[]);
  renderMrpMilestones(mk,rblocks||[],prevRblocks||[],weeksInMonth,wcRowsList||[],milestoneRows&&milestoneRows[0],prevWcRowsList||[],heroCommentText,monthlyRefContext);
  renderMrpWeeklyMissions(weeksInMonth,wcRowsList||[]);
  renderMrpContents(contents||[],startDk,endDk);
  renderMrpReportLinks(weeksInMonth,mk);
}

// 세 프롬프트(궤적/리듬/수면) 공통 규칙 — 숫자 재진술 금지, 부정적 어휘 금지, 긍정적·진취적 톤(2026-08-22 확정)
const MRP_COMMON_RULES=`- 이미 화면에 숫자/그래프로 보이는 수치를 그대로 나열하거나 재진술하지 마세요. 해석과 의미 위주로 서술하세요.
- 부정적이거나 질책하는 어휘는 쓰지 마세요("부족했다", "못했다", "나빴다" 같은 표현 대신 담백한 사실 서술이나 긍정적 관점으로 풀어주세요).
- 앞으로 더 나아갈 수 있다는 진취적이고 긍정적인 방향으로 서술하세요.`;

// HTML 카드 문자열에서 태그만 제거해 순수 텍스트로(과도한 공백 정리 포함) — weekly_summary_/weekly_memo_report_ 공용
function _stripHtmlToText(html){
  if(!html)return '';
  return html.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}
// 그 달 주차별 weekly_summary_(주간종합)와 weekly_memo_report_week:(주간메모) 캐시를 정제해 하나의 참고 텍스트로 묶음.
// 궤적/리듬/수면 세 프롬프트가 이 결과를 공통으로 재사용(캐시 조회는 loadMonthlyReportPage에서 1회만 수행).
function _mrpBuildRefContext(weeklySummaryRowsList,weeklyMemoRowsList){
  const summaries=(weeklySummaryRowsList||[]).map((rows,i)=>{
    const row=rows&&rows[0];
    if(!row||!row.content)return null;
    const txt=_stripHtmlToText(row.content);
    return txt?`${i+1}주차 주간종합: ${txt}`:null;
  }).filter(Boolean);
  const memos=(weeklyMemoRowsList||[]).map((rows,i)=>{
    const row=rows&&rows[0];
    if(!row||!row.content)return null;
    const txt=_stripHtmlToText(row.content);
    return txt?`${i+1}주차 메모요약: ${txt}`:null;
  }).filter(Boolean);
  const parts=[...summaries,...memos];
  if(!parts.length)return '';
  return `이 달 주차별 참고자료(이미 발행된 주간 리포트들, 맥락 참고용 — 여기 담긴 숫자를 그대로 재진술하지 말 것):\n${parts.join('\n')}`;
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
        <div class="mrp-card mrp-card-vcenter"><div class="mrp-card-title"><i class="ti ti-chart-donut" style="color:rgba(var(--pal-mint-rgb),1);" aria-hidden="true"></i>이 달의 숫자</div><div id="mrp-stats"></div></div>
      </div>
      <div class="mrp-card" style="margin-bottom:14px;"><div class="mrp-card-title"><i class="ti ti-chart-line" style="color:rgba(var(--pal-mint-rgb),1);" aria-hidden="true"></i>이 달의 궤적</div><div id="mrp-traj"></div></div>
      <div class="mrp-card" style="margin-bottom:14px;"><div class="mrp-card-title"><i class="ti ti-moon-stars" style="color:rgba(150,190,215,1);" aria-hidden="true"></i>이 달의 수면</div><div id="mrp-sleep"></div></div>
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
  const now=new Date();
  const lastDateOfThisMonth=new Date(_mrpDate.getFullYear(),_mrpDate.getMonth()+1,0).getDate();
  const isLastDayEvening=now.getDate()===lastDateOfThisMonth&&_mrpDate.getMonth()===now.getMonth()&&_mrpDate.getFullYear()===now.getFullYear()&&(now.getHours()>=19||now.getHours()<6);
  const isThisMonth=(_mrpDate.getFullYear()===now.getFullYear()&&_mrpDate.getMonth()===now.getMonth());
  const isOngoingMonth=isThisMonth&&!isLastDayEvening;
  if(isOngoingMonth){
    heroEl.innerHTML=`<div class="mrp-hero-eyebrow"><i class="ti ti-sparkles" aria-hidden="true"></i>이 달 한눈에</div><div class="mrp-hero-comment" style="opacity:.6;">이 달이 끝나면 정리해드려요</div>`;
    return;
  }
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
function renderMrpGoalsAndStats(goalRow,todos,memos,sleepRows,habits,habitChecks,habitDenominator,prevTodos,prevHabitChecks,prevMemos,prevHabitDenominator){
  const goalsEl=document.getElementById('mrp-goals');
  // mgoal: 캐시는 wchallenge_(주간챌린지)와 저장 구조가 다름 — lines가 {text,days}[] 객체 배열이 아니라 순수 문자열 배열(string[]).
  const lines=(goalRow&&Array.isArray(goalRow.lines))?goalRow.lines.filter(l=>l&&typeof l==='string'&&l.trim()):[];
  goalsEl.innerHTML=lines.length?lines.map(l=>`<div class="mrp-goal-line">${escapeHtml(l)}</div>`).join(''):'<div class="empty-msg">등록된 목표가 없어요</div>';

  const statsEl=document.getElementById('mrp-stats');
  const doneTodos=todos.filter(t=>t.done).length;
  const memoCount=(memos||[]).length;
  const habitPct=habits.length?Math.round(_uniqueHabitCheckCount(habitChecks)/(habits.length*habitDenominator)*100):0;

  // 전월 대비(각 통계 하단에 증감만 짧게) — 전월 분모(prevHabitDenominator)는 이번 달과 별개로, 진행 중인 달이면
  // 동일하게 "오늘까지의 경과일수"로 절단된 값이 상위(loadMonthlyReportPage)에서 넘어옴(2026-08-22 확정).
  const prevDoneTodos=(prevTodos||[]).filter(t=>t.done).length;
  const prevMemoCount=(prevMemos||[]).length;
  const prevHabitPct=habits.length?Math.round(_uniqueHabitCheckCount(prevHabitChecks)/(habits.length*(prevHabitDenominator||habitDenominator))*100):0;
  const deltaOf=(cur,prev,fmt)=>{
    const diff=Math.round((cur-prev)*10)/10;
    const dir=diff>0?'up':(diff<0?'down':'flat');
    const arrow=dir==='up'?'ti-arrow-up':(dir==='down'?'ti-arrow-down':'ti-minus');
    const sign=diff>0?'+':'';
    return `<div class="mrp-stat-delta ${dir}"><i class="ti ${arrow}" style="font-size:10px;"></i>${sign}${fmt(diff)}</div>`;
  };

  statsEl.innerHTML=`<div class="mrp-stat-row">
    <div class="mrp-stat"><div class="v">${doneTodos}개</div><div class="l">투두 완료</div>${deltaOf(doneTodos,prevDoneTodos,v=>v+'개')}</div>
    <div class="mrp-stat"><div class="v">${memoCount}개</div><div class="l">메모 작성</div>${deltaOf(memoCount,prevMemoCount,v=>v+'개')}</div>
    <div class="mrp-stat"><div class="v">${habitPct}%</div><div class="l">습관 달성률</div>${deltaOf(habitPct,prevHabitPct,v=>v+'%')}</div>
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
// tailOverridesByKey: {key: value|null} — 주어지면 하단 tail 숫자를 "마지막 주차 값" 대신 이 값(보통 월 전체 평균)으로 표시.
// (2026-08-22: 생활밸런스 100% 절대기준선을 그렸었으나, 지표별 정규화 스케일이 서로 달라 같은 캔버스에 절대값 기준선을
//  그리면 다른 지표(수면 등)까지 그 높이가 "0 기준"인 것처럼 보이는 착시가 생겨 제거함. 절대 달성 여부는 하단 tail 숫자로 확인.)
// 주차 라벨을 누르면 그 주차의 세 지표 실제 수치를 라벨 아래에 펼쳐 보여줌(그래프 자체는 정규화된 상대값이라
// 오독 소지가 있어, 정확한 숫자가 궁금할 때 확인할 수 있게 함, 2026-08-22).
function _mrpWaveWeekDetailHtml(rows,weekIdx){
  return rows.map(r=>{
    const v=r.values[weekIdx];
    return `<div class="mrp-wave-detail-item"><i style="background:rgba(${r.color},0.95);"></i><span class="l">${r.label}</span><span class="v">${v!=null?r.fmt(v):'기록 없음'}</span></div>`;
  }).join('');
}
function _mrpToggleWeekDetail(weekIdx){
  const key=String(weekIdx);
  const target=document.querySelector(`.mrp-wave-detail[data-week="${key}"]`);
  const willOpen=target&&!target.classList.contains('on');
  document.querySelectorAll('.mrp-wave-detail').forEach(el=>el.classList.remove('on'));
  document.querySelectorAll('.mrp-wave-labels span').forEach(el=>el.classList.remove('active'));
  if(willOpen){
    target.classList.add('on');
    document.querySelector(`.mrp-wave-labels span[data-week="${key}"]`).classList.add('active');
  }
}
function _mrpWaveSvg(rows,weekCount,tailOverridesByKey){
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

  // 주차 라벨 — 클릭하면 그 주차 바로 아래에 세 지표 실제 수치가 펼쳐짐(아코디언, 한 번에 하나만 열림)
  const weekLabels=Array.from({length:weekCount},(_,i)=>
    `<span data-week="${i}" onclick="_mrpToggleWeekDetail(${i})">${i+1}주차</span>`
  ).join('');
  const weekDetails=Array.from({length:weekCount},(_,i)=>
    `<div class="mrp-wave-detail" data-week="${i}">${_mrpWaveWeekDetailHtml(rows,i)}</div>`
  ).join('');

  const tailVals=rows.map(r=>{
    const override=tailOverridesByKey&&tailOverridesByKey[r.key];
    const val=(override!=null)?override:[...r.values].reverse().find(v=>v!=null);
    return `<div class="mrp-wave-tail-item"><div class="n">${val!=null?r.fmt(val):'-'}</div><div class="l">${r.label}</div></div>`;
  }).join('');

  return legendHtml+
    `<div class="mrp-wave-wrap"><svg viewBox="0 0 400 ${H}" preserveAspectRatio="none">${`<defs>${defsHtml}</defs>`}${pathsHtml}${dotsHtml}</svg></div>`+
    `<div class="mrp-wave-labels">${weekLabels}</div>`+
    weekDetails+
    `<div class="mrp-wave-tail">${tailVals}</div>`;
}
// 생활밸런스(업무 대비 개인작업) 목표 비율 — 업무 3시간당 개인작업(책상) 2시간이 이상적이라는 기준(2026-08-22 확정).
const WORK_NOTE_TARGET_RATIO=2/3;
async function renderMrpTrajectory(mk,sleepRows,habits,habitChecks,rblocks,weeksInMonth,dim,prevData,cacheRow,heroComment,refContext){
  const el=document.getElementById('mrp-traj');
  if(!weeksInMonth.length){el.innerHTML='<div class="empty-msg">이 달엔 표시할 주차가 없어요</div>';return;}

  // weeksInMonth는 그 달에 속하는 모든 주차(목요일 기준)를 담고 있는데, 진행 중인 달이면 아직 지나지 않은
  // 미래 주차도 포함돼있어 습관율이 "데이터 없음"이 아니라 "체크 0건→0%"로 계산되며 그래프가 미래까지 이어지는
  // 문제가 있었음 — dim(오늘까지 절단된 일수) 이후 시작하는 주차는 아예 제외(2026-08-22 확정).
  const validWeeksInMonth=weeksInMonth.filter(wk=>{
    const wkStartDay=parseInt(wk.slice(8,10),10);
    const wkMonth=wk.slice(0,7);
    return wkMonth!==mk||wkStartDay<=dim;
  });
  if(!validWeeksInMonth.length){el.innerHTML='<div class="empty-msg">이 달엔 표시할 주차가 없어요</div>';return;}

  const calcWeekly=(sleepRows,habits,habitChecks,rblocks,weeksInMonth)=>{
    const byWeekSleep=weeksInMonth.map(wk=>{
      const days=getWeekDates(new Date(wk+'T00:00:00'));
      const rows=sleepRows.filter(r=>days.includes(r.date_key)&&r.score!=null&&!isNaN(r.score));
      if(!rows.length)return null;
      return Math.round(rows.reduce((a,r)=>a+r.score,0)/rows.length);
    });
    const byWeekHabit=weeksInMonth.map(wk=>{
      const days=getWeekDates(new Date(wk+'T00:00:00'));
      if(!habits.length)return null;
      const checks=habitChecks.filter(c=>days.includes(c.date_key));
      if(!checks.length)return null;
      return Math.round(_uniqueHabitCheckCount(checks)/(habits.length*7)*100);
    });
    // 생활밸런스: 그 주 (책상/업무) 실제비율을 목표비율(2/3)로 나눈 달성률(%). 업무기록이 없는 주는 null.
    const byWeekBalance=weeksInMonth.map(wk=>{
      const days=getWeekDates(new Date(wk+'T00:00:00'));
      const workMin=_rhythmSumCatMin(rblocks,'work',days);
      const noteMin=_rhythmSumCatMin(rblocks,'note',days);
      if(!workMin)return null;
      return Math.round((noteMin/workMin)/WORK_NOTE_TARGET_RATIO*100);
    });
    return {byWeekSleep,byWeekHabit,byWeekBalance};
  };

  const {byWeekSleep,byWeekHabit,byWeekBalance}=calcWeekly(sleepRows,habits,habitChecks,rblocks,validWeeksInMonth);

  const rows=[
    {key:'habit',label:'습관율',values:byWeekHabit,color:'145,210,175',fmt:v=>v+'%'},
    {key:'sleep',label:'평균수면컨디션',values:byWeekSleep,color:'170,208,228',fmt:v=>v+'점'},
    {key:'balance',label:'생활밸런스',values:byWeekBalance,color:'210,175,225',fmt:v=>v+'%'}
  ];

  // 하단 tail 요약값 — 그래프는 주차별 오르내림이지만, tail 숫자만큼은 "이 달 전체 평균"으로 다시 계산해
  // 다른 카드(이달의 수면/습관 달성률)와 값이 일치하도록 함(2026-08-22, 마지막 주차 값 표시 문제 수정).
  // 수면 지표는 시간이 아니라 컨디션 점수 기준(2026-08-22, 시간과 컨디션이 항상 같이 움직이지 않아 해석에 혼선이 있어 변경).
  const monthAvgSleep=_avgSleepScoreOf(sleepRows);
  const monthAvgHabit=habits.length?Math.round(_uniqueHabitCheckCount(habitChecks)/(habits.length*dim)*100):null;
  const monthWorkMin=_rhythmSumCatMin(rblocks,'work');
  const monthNoteMin=_rhythmSumCatMin(rblocks,'note');
  const monthAvgBalance=monthWorkMin?Math.round((monthNoteMin/monthWorkMin)/WORK_NOTE_TARGET_RATIO*100):null;
  const tailOverridesByKey={habit:monthAvgHabit,sleep:monthAvgSleep,balance:monthAvgBalance};

  el.innerHTML=_mrpWaveSvg(rows,validWeeksInMonth.length,tailOverridesByKey)+`<div id="mrp-traj-ai" style="margin-top:14px;"></div>`;

  // ── AI 궤적 분석 ──
  const aiEl=document.getElementById('mrp-traj-ai');
  const validWeekCount=(vals)=>vals.filter(v=>v!=null).length;
  const enoughData=Math.max(validWeekCount(byWeekHabit),validWeekCount(byWeekSleep),validWeekCount(byWeekBalance))>=2;
  if(!enoughData){aiEl.innerHTML='';return;}

  if(cacheRow&&cacheRow.content){
    aiEl.innerHTML=`<div class="mrp-traj-ai-text">${escapeHtml(cacheRow.content)}</div>`;
    return;
  }
  // 이 달의 종합 리포트(본앱 hero)가 아직 발행되지 않았으면 궤적 분석도 생성하지 않음(시점 제한, 시간 기준 아님) —
  // 본앱에서 월간종합을 받아온 이후에만 태블릿 쪽 세 AI 카드(궤적/리듬/수면)가 순차적으로 생성 가능해짐.
  if(!heroComment){
    aiEl.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">이 달의 종합 리포트가 발행되면 궤적 분석도 볼 수 있어요</div>`;
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
    const p=calcWeekly(prevData.sleepRows,prevData.habits,prevData.habitChecks,prevData.rblocks,prevData.weeksInMonth);
    const dirOf=(vals)=>{
      const valid=vals.filter(v=>v!=null);
      if(valid.length<2)return null;
      return valid[valid.length-1]>valid[0]?'상승':(valid[valid.length-1]<valid[0]?'하락':'유지');
    };
    const parts=[];
    const hd=dirOf(p.byWeekHabit);if(hd)parts.push(`습관율은 ${hd} 흐름`);
    const sd=dirOf(p.byWeekSleep);if(sd)parts.push(`평균수면컨디션은 ${sd} 흐름`);
    const bd=dirOf(p.byWeekBalance);if(bd)parts.push(`생활밸런스는 ${bd} 흐름`);
    if(parts.length)prevDirText=`전월 방향성(참고용, 방향만): ${parts.join(', ')}`;
  }

  // 이번 달 방향성도 텍스트로만(구체 수치 없이) 정리해서 넘김 — 프롬프트에서 수치 재진술을 원천 차단
  const dirOfCur=(vals)=>{
    const valid=vals.filter(v=>v!=null);
    if(valid.length<2)return '데이터 부족';
    return valid[valid.length-1]>valid[0]?'상승':(valid[valid.length-1]<valid[0]?'하락':'유지');
  };
  const curDirText=`이 달 방향성: 습관율 ${dirOfCur(byWeekHabit)}, 평균수면컨디션 ${dirOfCur(byWeekSleep)}, 생활밸런스 ${dirOfCur(byWeekBalance)}`;
  const heroText=heroComment?`이 달 종합 리포트(참고용 맥락, 이미 발행된 코멘트):\n${heroComment}`:'';
  const dataContext=[curDirText,prevDirText,heroText,refContext].filter(Boolean).join('\n\n');

  const sys=`당신은 한 달의 생활 패턴을 해석해주는 담담한 회고 비서예요.
아래는 이 달의 습관율, 평균수면컨디션, 생활밸런스가 주차를 거치며 각각 상승/하락/유지 중 어느 방향으로 움직였는지를 나타낸 정보예요(구체적인 수치는 주어지지 않아요). "평균수면컨디션"은 수면시간이 아니라 기상 후 기록한 컨디션 점수의 평균이에요 — 잔 시간과 컨디션이 항상 같이 움직이지 않을 수 있다는 점을 감안해서 해석하세요. "생활밸런스"는 업무 시간 대비 개인작업(책상) 시간의 비율이 이상적인 기준(업무 3시간당 개인작업 2시간)을 얼마나 채웠는지를 나타내는 지표예요 — 100%에 가까울수록 일과 자기계발 시간의 밸런스를 잘 지킨 주, 낮을수록 업무에 밀려 개인 시간을 내주지 못한 주예요. 함께 주어졌다면 이 달의 종합 리포트(이미 발행된 코멘트)와 주차별 참고자료(주간종합/주간메모)도 참고하세요 — 그 안에 담긴 이 달의 사건이나 맥락과 어긋나지 않게, 자연스럽게 이어지도록 서술하세요.
이 세 지표가 서로 어떤 관계로 움직였는지 — 무엇을 더 챙기는 대신 무엇을 내줬는지, 어떤 성향의 한 달이었는지 — 짧은 이야기로 풀어주세요.
- 3~4문장, 전체 120자 내외.
- 절대 숫자나 퍼센트, 시간 같은 구체적인 수치를 언급하지 마세요. 그래프에 이미 나와 있으니, 당신은 그 움직임이 "무엇을 의미하는지"만 해석하세요.
- 원인 추정, 지표 간 트레이드오프, 이 달 전체의 성향 위주로 서술하세요.
- 종합 리포트나 참고자료 내용을 그대로 반복하거나 요약하지 말고, 거기 없는 지표 간의 관계만 새롭게 짚으세요.
- 담담하고 자연스러운 ~어요/~했어요체.
- 전월 방향성 정보가 함께 주어졌다면, 그 변화도 수치 없이 방향성으로만 마지막에 한 문장 정도 자연스럽게 녹이세요. 주어지지 않았다면 언급하지 마세요.
${MRP_COMMON_RULES}
- 반드시 JSON 형식으로만 응답하세요: {"text":"..."}
- 다른 설명이나 마크다운 없이 순수 JSON만 출력하세요.`;
  const text=await callClaudeForJsonText(sys,dataContext,'monthly_trajectory_'+mk);
  if(text)aiEl.innerHTML=`<div class="mrp-traj-ai-text">${escapeHtml(text)}</div>`;
  /* 실패 시 조용히 빈 채로 둠 */
}

// 이 달의 수면 — 상단(분포 도넛+지난달 대비), 중단(숫자 요약), 하단(AI 분석: 취침시간대별 컨디션 포함).
// 도넛 중앙은 이 달 평균 컨디션에 대응하는 표정 아이콘(getSleepScoreLevel 재사용).
async function renderMrpSleep(mk,sleepRows,prevSleepRows,cacheRow,refContext,heroComment){
  const el=document.getElementById('mrp-sleep');
  const validCur=(sleepRows||[]).filter(r=>r.sleep_time&&r.wake_time);
  const validPrev=(prevSleepRows||[]).filter(r=>r.sleep_time&&r.wake_time);

  if(!validCur.length){el.innerHTML='<div class="empty-msg">이 달엔 기록된 수면이 없어요</div>';return;}

  // 분포 4구간
  const buckets=[
    {key:'u5',label:'5시간 미만',min:0,max:300,color:'rgba(255,205,150,0.85)'},
    {key:'5to6',label:'5~6시간',min:300,max:360,color:'rgba(190,225,205,0.85)'},
    {key:'6to7',label:'6~7시간',min:360,max:420,color:'rgba(150,190,215,0.85)'},
    {key:'o7',label:'7시간 이상',min:420,max:100000,color:'rgba(216,190,225,0.85)'}
  ];
  const counts=buckets.map(b=>validCur.filter(r=>{const m=_sleepDurMinOf(r);return m>=b.min&&m<b.max;}).length);
  const total=validCur.length;
  let cum=0,donutSegs='';
  const circ=2*Math.PI*42;
  const order=[3,2,1,0];
  order.forEach(i=>{
    const b=buckets[i];const c=counts[i];
    const len=total>0?(c/total*circ):0;
    donutSegs+=`<circle cx="50" cy="50" r="42" fill="none" stroke="${b.color}" stroke-width="13" stroke-dasharray="${len.toFixed(2)} ${(circ-len).toFixed(2)}" stroke-dashoffset="${-cum.toFixed(2)}" stroke-linecap="round"/>`;
    cum+=len;
  });

  const {avgMin,avgScore,reg}=_sleepStatsOf(validCur);
  const scoreLevel=avgScore!=null?getSleepScoreLevel(avgScore):null;

  let cmpHtml='<div class="empty-msg" style="text-align:left;">전월 기록이 적어 비교를 생략했어요</div>';
  if(validPrev.length>=7){
    const prevStats=_sleepStatsOf(validPrev);

    const mkCmpRow=(label,curV,prevV,unit)=>{
      if(curV==null||prevV==null)return `<div class="mrsl-cmp-row"><span class="mrsl-cmp-label">${label}</span><span class="mrsl-cmp-val flat">데이터 부족</span></div>`;
      const diff=curV-prevV;
      const dir=diff>0?'up':(diff<0?'down':'flat');
      const arrow=dir==='up'?'ti-arrow-up':(dir==='down'?'ti-arrow-down':'ti-minus');
      const sign=diff>0?'+':'';
      return `<div class="mrsl-cmp-row"><span class="mrsl-cmp-label">${label}</span><span class="mrsl-cmp-val ${dir}"><i class="ti ${arrow}" style="font-size:11px;"></i>${sign}${diff}${unit}</span></div>`;
    };
    cmpHtml=mkCmpRow('수면시간',avgMin,prevStats.avgMin,'분')
      +mkCmpRow('규칙성',reg?reg.score:null,prevStats.reg?prevStats.reg.score:null,'점')
      +mkCmpRow('컨디션',avgScore,prevStats.avgScore,'점');
  }

  el.innerHTML=`<div class="mrsl-top">
    <div class="mrsl-top-item">
      <div class="mrsl-top-label">수면시간 분포</div>
      <div class="mrsl-donut-wrap">
        <div class="mrsl-donut-box">
          <svg viewBox="0 0 100 100">${donutSegs}</svg>
          <div class="mrsl-donut-center">${scoreLevel?`<i class="ti ${scoreLevel.icon}" style="color:rgba(150,190,215,0.9);" aria-hidden="true"></i>`:''}</div>
        </div>
        <div class="mrsl-legend">
          <div class="mrsl-legend-row"><span class="mrsl-legend-dot" style="background:${buckets[3].color};"></span>7시간 이상 <span class="mrsl-legend-val">${counts[3]}일</span></div>
          <div class="mrsl-legend-row"><span class="mrsl-legend-dot" style="background:${buckets[2].color};"></span>6~7시간 <span class="mrsl-legend-val">${counts[2]}일</span></div>
          <div class="mrsl-legend-row"><span class="mrsl-legend-dot" style="background:${buckets[1].color};"></span>5~6시간 <span class="mrsl-legend-val">${counts[1]}일</span></div>
          <div class="mrsl-legend-row"><span class="mrsl-legend-dot" style="background:${buckets[0].color};"></span>5시간 미만 <span class="mrsl-legend-val">${counts[0]}일</span></div>
        </div>
      </div>
    </div>
    <div class="mrsl-top-item">
      <div class="mrsl-top-label">지난달 대비</div>
      <div class="mrsl-cmp">${cmpHtml}</div>
    </div>
  </div>
  <div class="mrsl-stat-row">
    <div class="mrsl-stat"><div class="v">${Math.floor(avgMin/60)}.${Math.round((avgMin%60)/60*10)}h</div><div class="l">평균 수면</div></div>
    <div class="mrsl-stat"><div class="v">${avgScore!=null?avgScore+'점':'-'}</div><div class="l">평균 컨디션</div></div>
    <div class="mrsl-stat"><div class="v">${reg?reg.score+'점':'-'}</div><div class="l">규칙성</div></div>
  </div>
  <div id="mrp-sleep-ai" style="margin-top:0;"></div>`;

  const aiEl=document.getElementById('mrp-sleep-ai');
  if(cacheRow&&cacheRow.content){
    aiEl.innerHTML=`<div class="mrsl-ai-text">${escapeHtml(cacheRow.content)}</div>`;
    return;
  }
  // 이 달의 종합 리포트(본앱 hero)가 아직 발행되지 않았으면 수면 분석도 생성하지 않음(시점 제한)
  if(!heroComment){
    aiEl.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">이 달의 종합 리포트가 발행되면 수면 분석도 볼 수 있어요</div>`;
    return;
  }
  const apiKey=getClaudeKey();
  if(!apiKey){
    aiEl.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">이 달의 수면 분석은 설정 탭에서 Claude API 키를 추가하면 볼 수 있어요</div>`;
    return;
  }
  if(scoredCur.length<5){
    aiEl.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">컨디션 기록이 더 쌓이면 분석을 볼 수 있어요</div>`;
    return;
  }

  // 취침시간대별 평균 컨디션(00시 이전 / 00~01시 / 01시 이후) — 각 구간 2건 이상일 때만 포함
  const scoredWithSleep=scoredCur.filter(r=>r.sleep_time);
  const bandScores={'00시 이전':[],'00~01시':[],'01시 이후':[]};
  scoredWithSleep.forEach(r=>{
    const hh=parseInt(r.sleep_time.split(':')[0],10);
    let band;
    if(hh>=1&&hh<4)band='01시 이후';
    else if(hh===0)band='00~01시';
    else band='00시 이전'; // 22,23시대(자정 전)
    bandScores[band].push(r.score);
  });
  const bandText=Object.keys(bandScores).filter(k=>bandScores[k].length>=2).map(k=>{
    const avg=Math.round(bandScores[k].reduce((a,b)=>a+b,0)/bandScores[k].length);
    return `${k} 취침 평균컨디션 ${avg}점(${bandScores[k].length}일)`;
  });

  const dataContext=[
    `이 달 평균 수면시간: ${Math.floor(avgMin/60)}시간 ${avgMin%60}분(목표 7시간30분 대비 ${avgMin-SLEEP_GOAL_MIN>=0?'+':''}${avgMin-SLEEP_GOAL_MIN}분)`,
    avgScore!=null?`이 달 평균 수면 컨디션: ${avgScore}점`:'',
    reg?`이 달 수면 규칙성: ${reg.score}점(${reg.label})`:'',
    bandText.length?`취침시간대별 평균 컨디션(참고, 표본이 적을 수 있음):\n${bandText.join('\n')}`:'',
    refContext
  ].filter(Boolean).join('\n');

  const sys=`당신은 한 달의 수면을 담담하게 짚어주는 회고 비서예요.
아래는 이 달의 평균 수면시간(목표 대비), 평균 컨디션, 규칙성 점수, 있다면 취침시간대별 평균 컨디션 정보, 그리고 이 달 주차별 참고자료(주간종합/주간메모 리포트)예요.
이 데이터를 바탕으로 이 달의 수면이 어떤 흐름이었는지, 특히 몇 시간을 잤는지보다 언제 잠들었는지가 컨디션에 어떻게 작용했는지를 중심으로 해석해주세요.
참고자료가 함께 주어졌다면, 그 안에 담긴 이 달의 실제 생활(일과 사건, 감정선)과 수면 패턴을 연결지어 — 수면이 그 달의 생활에 어떤 영향을 미쳤을지, 또는 그 달의 생활이 수면에 어떻게 반영됐는지 — 자연스럽게 짚어주세요. 참고자료에 근거가 없는 연결은 추측해서 만들지 마세요.
- 4~5문장, 전체 180자 내외.
- 주어진 수치는 참고만 하고, 그대로 나열하지 마세요. 각주가 아니라 해석과 의미 위주로 서술하세요.
- 취침시간대별 컨디션 정보가 함께 주어졌다면, 이걸 핵심 소재로 삼아 "몇 시에 잠들었을 때 컨디션이 더 좋았는지"를 자연스럽게 짚어주세요. 다만 이건 상관관계일 뿐 인과관계로 단정하지 말고, "~한 경향이 있었다" 정도로 담백하게 표현하세요.
- 취침시간대별 정보가 주어지지 않았다면 이 부분은 언급하지 말고, 수면시간/컨디션/규칙성 중심으로만 해석하세요.
- 담담하고 자연스러운 ~어요/~했어요체.
${MRP_COMMON_RULES}
- 반드시 JSON 형식으로만 응답하세요: {"text":"..."}
- 다른 설명이나 마크다운 없이 순수 JSON만 출력하세요.`;

  aiEl.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">수면 분석을 불러오는 중...</div>`;
  const text=await callClaudeForJsonText(sys,dataContext,'monthly_sleep_'+mk);
  aiEl.innerHTML=text?`<div class="mrsl-ai-text">${escapeHtml(text)}</div>`:'';
}

function renderMrpRhythm(rblocks,prevRblocks){
  const el=document.getElementById('mrp-rhythm');
  const durByCat=(blocks)=>{
    const d={};let total=0;const dayCount={};const daysSeen={};
    blocks.forEach(b=>{
      if(!b.start_time||!b.end_time)return;
      const s=_paceParseHM(b.start_time),e=_paceParseHM(b.end_time);
      if(isNaN(s)||isNaN(e))return;
      let dur=e-s;if(dur<0)dur+=1440;
      if(dur<=0)return;
      d[b.cat]=(d[b.cat]||0)+dur;total+=dur;
      // 본앱 월간리포트와 동일 기준: 일평균의 분모는 "그 카테고리가 실제로 기록된 날짜 수"(전체 월 일수 아님)
      daysSeen[b.cat]=daysSeen[b.cat]||new Set();
      daysSeen[b.cat].add(b.date_key);
    });
    Object.keys(daysSeen).forEach(k=>{dayCount[k]=daysSeen[k].size;});
    return {d,total,dayCount};
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

  // 누계와 일평균을 한 줄에, 2열 그리드로 배치(공간 절약)
  // 전월 대비는 "+3시간 20분"처럼 풀어쓰면 한 줄이 너무 길어져 "-39H"처럼 반올림 시간 단위로 축약.
  // 색상은 이달의 숫자 카드(mrp-stat-delta)와 동일한 up/down 팔레트 재사용.
  const listHtml=`<div class="mrp-rhythm-list">`+sorted.map(k=>{
    const c=RHYTHM_CATS[k];
    const diff=cur.d[k]-(prev.d[k]||0);
    const diffH=Math.round(diff/60);
    const diffTxt=(showCompare&&Math.abs(diff)>=60)?` · <span class="mrp-rhythm-delta ${diff>0?'up':'down'}">${diff>0?'+':'−'}${Math.abs(diffH)}H</span>`:'';
    const avgMin=cur.d[k]/(cur.dayCount[k]||1);
    return `<div class="mrp-rhythm-item"><span class="dot" style="background:${c.color};"></span><span class="lbl">${c.label}</span><span class="val">${_fmtDur(cur.d[k])} · 일${_fmtDur(avgMin)}${diffTxt}</span></div>`;
  }).join('')+`</div>`;

  el.innerHTML=barHtml+listHtml+(showCompare?'':'<div class="empty-msg" style="text-align:left;padding:8px 2px 0;">전월 기록이 적어 전월 대비 비교는 생략했어요</div>');
}

// 이 달의 리듬 분석 — 순수하게 카테고리별 시간 배분(리듬)의 이야기만 다룸. 목표/미션 연결이나 "마디(전환점)" 개념은
// 다루지 않음(이전엔 "마디"로 목표×리듬을 엮었으나, 각 프롬프트가 겹치지 않게 역할을 분리하며 리듬 전용으로 재정의함, 2026-08-22).
// 캐시가 있으면 그대로 쓰고, 없고 API 키가 있으면 그 자리에서 1회 생성(아카이브 페이지를 실제로 열었을 때만 생성 — 자동 발행 없음).
async function renderMrpMilestones(mk,rblocks,prevRblocks,weeksInMonth,wcRowsList,cacheRow,prevWcRowsList,heroComment,refContext){
  const el=document.getElementById('mrp-milestones');

  const renderText=(text)=>{
    if(!text){el.innerHTML='';return;}
    el.innerHTML=`<div class="mrp-rhythm-ai-text">${escapeHtml(text)}</div>`;
  };

  // 캐시가 있으면 그대로 표시
  if(cacheRow&&cacheRow.content){
    try{
      const parsed=JSON.parse(cacheRow.content);
      renderText(typeof parsed==='string'?parsed:(parsed&&parsed.text)||'');
    }catch(e){renderText(cacheRow.content);}
    return;
  }

  // 이 달의 종합 리포트(본앱 hero)가 아직 발행되지 않았으면 리듬 분석도 생성하지 않음(시점 제한) —
  // 궤적/수면 카드와 동일하게 빈 화면 대신 안내 문구를 보여줌(2026-08-22, 안내문구 누락 수정).
  if(!heroComment){
    el.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">이 달의 종합 리포트가 발행되면 리듬 분석도 볼 수 있어요</div>`;
    return;
  }

  const apiKey=getClaudeKey();
  if(!apiKey){
    el.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">이 달의 리듬 분석은 설정 탭에서 Claude API 키를 추가하면 볼 수 있어요</div>`;
    return;
  }

  // 카테고리별 누계 시간(분) 재계산 — renderMrpRhythm과 동일 규칙
  const cur=_rhythmDurByCat(rblocks);
  const prev=_rhythmDurByCat(prevRblocks);
  if(!cur.total){el.innerHTML='';return;}

  const sorted=Object.keys(cur.d).filter(k=>cur.d[k]>0).sort((a,b)=>cur.d[b]-cur.d[a]);
  const rankText=sorted.map((k,i)=>{
    const c=RHYTHM_CATS[k];if(!c)return null;
    return `${i+1}위 ${c.label} ${_fmtDur(cur.d[k])}`;
  }).filter(Boolean).join(', ');

  const prevRecordedDays=new Set((prevRblocks||[]).map(b=>b.date_key)).size;
  const showCompare=prevRecordedDays>=7;
  let compareText='';
  if(showCompare){
    const diffs=sorted.map(k=>{
      const c=RHYTHM_CATS[k];if(!c)return null;
      const diff=cur.d[k]-(prev.d[k]||0);
      if(Math.abs(diff)<60)return null;
      return `${c.label} ${diff>0?'+':'−'}${_fmtDur(Math.abs(diff))}`;
    }).filter(Boolean);
    if(diffs.length)compareText=`전월 대비 변화(60분 이상만): ${diffs.join(', ')}`;
  }

  const missionByWeek=(weeksInMonth||[]).map((wk,idx)=>{
    const row=wcRowsList&&wcRowsList[idx]&&wcRowsList[idx][0];
    const lines=(row&&Array.isArray(row.lines))?row.lines.filter(l=>l&&l.text&&l.text.trim()).map(l=>l.text):[];
    return lines.length?`${idx+1}주차: ${lines.join(', ')}`:null;
  }).filter(Boolean);
  const missionText=missionByWeek.length?`이 달 주차별 목표(주간 미션, 참고용):\n${missionByWeek.join('\n')}`:'';

  const dataContext=[`이 달 카테고리별 시간 순위(누계): ${rankText}`,compareText,missionText,refContext].filter(Boolean).join('\n');

  const sys=`당신은 한 달의 시간 사용(리듬)을 담담하게 짚어주는 회고 비서예요.
${RHYTHM_CAT_GUIDE}
아래는 이 달에 어떤 활동 카테고리에 얼마나 시간을 썼는지 순위와, 있다면 전월 대비 60분 이상 달라진 항목, 그리고 이 달의 목표나 주간 미션이 담긴 참고자료예요.
이 달의 시간 배분이 어떤 성향이었는지 — 무엇에 시간을 많이 내줬고 무엇이 뒤로 밀렸는지, 카테고리 간 균형이 어땠는지 — 짧은 이야기로 풀어주세요.
참고자료에 이 달의 목표나 미션이 나타나 있다면, 그 목표를 몰라서는 안 될 배경으로만 인지하고 있어도 좋아요 — 이 달의 리듬(시간 배분)이 그 목표를 향한 노력으로 자연스럽게 읽힌다면 가볍게 한 문장 정도 녹여도 좋지만, 억지로 리듬과 목표를 매번 연결지으려 하지 마세요. 이 프롬프트의 중심은 어디까지나 리듬이에요.
- 3~4문장, 전체 120자 내외.
- 절대 구체적인 시간·분·퍼센트 수치를 그대로 나열하지 마세요. 이미 그래프로 보여지고 있으니, 당신은 그 배분이 "무엇을 의미하는지"만 해석하세요.
- 습관, 투두 등 리듬 외의 다른 지표는 언급하지 마세요. 순수하게 시간을 어디에 썼는지의 이야기를 중심에 두세요.
- 담담하고 자연스러운 ~어요/~했어요체.
- 전월 대비 변화가 함께 주어졌다면, 그 변화도 수치 없이 방향과 의미로만 한 문장 정도 자연스럽게 녹이세요. 주어지지 않았다면 언급하지 마세요.
${MRP_COMMON_RULES}
- 반드시 JSON 형식으로만 응답하세요: {"text":"..."}
- 다른 설명이나 마크다운 없이 순수 JSON만 출력하세요.`;

  el.innerHTML=`<div class="empty-msg" style="text-align:left;padding:4px 0;">리듬 분석을 불러오는 중...</div>`;
  const text=await callClaudeForJsonText(sys,dataContext,'monthly_milestones_'+mk);
  if(text)renderText(text);else el.innerHTML='';
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
  // 카테고리(드라마/책/영화/음악) 순서 고정 그룹핑 — 그룹 내부는 기존처럼 최신순 유지
  const CAT_ORDER=['drama','book','movie','music'];
  const groups={};
  inRange.forEach(c=>{(groups[c.content_cat]=groups[c.content_cat]||[]).push(c);});
  const html=CAT_ORDER.filter(cat=>groups[cat]&&groups[cat].length).map(cat=>{
    const meta=CAT_ICON_META[cat]||{icon:'ti-stack-2',bg:'rgba(150,150,150,1)',iconColor:'#fff',label:cat};
    const lines=groups[cat].slice(0,30).map(c=>`
      <div class="mrp-content-line">
        <span style="display:flex;align-items:center;min-width:0;overflow:hidden;"><span class="dot" style="background:${_mrpCatDotColor(c.content_cat)};"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.title||'')}</span></span>
        <span class="st">${_mrpStatusLabel(c)}</span>
      </div>`).join('');
    return `<div class="mrp-content-group">
      <div class="mrp-content-group-head"><i class="ti ${meta.icon}" style="color:${meta.bg};" aria-hidden="true"></i><span>${meta.label}</span><span class="mrp-content-group-count">${groups[cat].length}</span></div>
      ${lines}
    </div>`;
  }).join('');
  el.innerHTML=html;
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

// ══════════════════════════════════════════════════════════
// 코멘트 모아보기(타임라인, 읽기 전용) — 본앱 로직 이식, supaFetch 기반으로 재작성
// 완결 코멘트(contents.review+stars)와 감상 메모(goal_notes: wcal_note_YYYY-MM)를 함께 모아 보여줌.
// ══════════════════════════════════════════════════════════
let _chNoteTimelineMonths=6; // 최근 몇 개월치를 모아볼지
let _chNoteTimelineView='date';
let _cgridMode='grid'; // 'grid'(콘텐츠 모아보기) | 'timeline'(코멘트 모아보기) — 제목을 눌러 전환
function toggleCgridMode(){
  _cgridMode=_cgridMode==='grid'?'timeline':'grid';
  const isTl=_cgridMode==='timeline';
  document.getElementById('cgrid-title-text').textContent=isTl?'코멘트 모아보기':'콘텐츠 모아보기';
  document.getElementById('cgrid-title-icon').className=`ti ${isTl?'ti-timeline':'ti-stack-2'}`;
  document.getElementById('cgrid-hdr-actions').style.display=isTl?'none':'';
  document.getElementById('note-tl-subtabs').style.display=isTl?'':'none';
  document.getElementById('month-content-grid').style.display=isTl?'none':'';
  document.getElementById('content-note-timeline-list').style.display=isTl?'':'none';
  if(isTl)renderContentNoteTimeline();
}
function switchNoteTimelineView(btn,view){
  _chNoteTimelineView=view;
  document.querySelectorAll('#note-tl-subtabs .rd-tab').forEach(t=>t.classList.remove('on'));
  btn.classList.add('on');
  renderContentNoteTimeline();
}
// 최근 N개월치의 완결 콘텐츠(review 또는 stars가 있는 것)와 감상 메모를 함께 수집
async function _chCollectNoteSource(){
  const now=new Date();
  const months=[];
  for(let i=0;i<_chNoteTimelineMonths;i++)months.push(monthKeyOf(new Date(now.getFullYear(),now.getMonth()-i,1)));
  const [contentRows,noteRows]=await Promise.all([
    Promise.all(months.map(mk=>supaFetch(`contents?month_key=eq.${mk}`))),
    Promise.all(months.map(mk=>supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('wcal_note_'+mk)}`)))
  ]);
  const finals=[]; // {cid,cat,title,poster,stars,review,dk}
  const notes=[]; // {cid,cat,title,dk,text,time,updatedAt}
  const posterByCid={};
  contentRows.forEach(rows=>(rows||[]).forEach(c=>{
    if(c.client_id)posterByCid[c.client_id]=c.poster||null;
    if(c.review&&c.review.trim()){
      finals.push({cid:c.client_id,cat:c.content_cat,title:c.title,poster:c.poster||null,stars:c.stars||0,review:c.review||'',dk:c.end_date||c.start_date||''});
    }
  }));
  noteRows.forEach(r=>{
    const lines=(r&&r[0]&&Array.isArray(r[0].lines))?r[0].lines:[];
    notes.push(...lines);
  });
  notes.forEach(n=>{n.poster=n.cid?(posterByCid[n.cid]||null):null;});
  return {finals,notes};
}
async function renderContentNoteTimeline(){
  const el=document.getElementById('content-note-timeline-list');if(!el)return;
  el.innerHTML='<div class="loading-msg">불러오는 중...</div>';
  const {finals,notes}=await _chCollectNoteSource();
  if(!finals.length&&!notes.length){el.innerHTML='<div class="ch-note-tl-empty">아직 남긴 코멘트가 없어요</div>';return;}
  el.innerHTML=_chNoteTimelineView==='work'?_chRenderNoteTimelineByWork(finals,notes):_chRenderNoteTimelineByDate(finals,notes);
}
// 날짜순 뷰 — 날짜별로 묶어 최신순 정렬, 완결 카드 먼저 + 감상 메모는 곁가지로
function _chRenderNoteTimelineByDate(finals,notes){
  const byDate={};
  const push=(dk,item)=>{if(!dk)return;if(!byDate[dk])byDate[dk]=[];byDate[dk].push(item);};
  finals.forEach(f=>push(f.dk,{...f,__type:'final'}));
  notes.forEach(n=>push(n.dk,{...n,__type:'note'}));
  const dks=Object.keys(byDate).sort((a,b)=>b.localeCompare(a));
  return dks.map(dk=>{
    const dispDate=parseInt(dk.slice(5,7),10)+'월 '+parseInt(dk.slice(8,10),10)+'일';
    const items=byDate[dk].slice().sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const showTime=items.length>1;
    const rowsHtml=items.map(it=>it.__type==='final'?_chFinalRowHtml(it):_chNoteRowHtml(it,showTime)).join('');
    return `<div class="ch-tlA-day">
      <div class="ch-tlA-day-date">${dispDate}</div>
      ${rowsHtml}
    </div>`;
  }).join('');
}
// 작품별 뷰 — cid 기준으로 묶음
function _chRenderNoteTimelineByWork(finals,notes){
  const groups={};
  finals.forEach(f=>{
    if(!f.cid)return;
    groups[f.cid]=groups[f.cid]||{cat:f.cat,title:f.title,poster:f.poster,final:null,notes:[]};
    groups[f.cid].final=f;
  });
  notes.forEach(n=>{
    if(!n.cid)return;
    groups[n.cid]=groups[n.cid]||{cat:n.cat,title:n.title,poster:n.poster||null,final:null,notes:[]};
    if(!groups[n.cid].poster)groups[n.cid].poster=n.poster||null;
    groups[n.cid].notes.push(n);
  });
  const cids=Object.keys(groups).sort((a,b)=>{
    const la=groups[a].notes.concat(groups[a].final?[groups[a].final]:[]).map(x=>x.dk||x.updatedAt||0).sort().pop()||'';
    const lb=groups[b].notes.concat(groups[b].final?[groups[b].final]:[]).map(x=>x.dk||x.updatedAt||0).sort().pop()||'';
    return String(lb).localeCompare(String(la));
  });
  return cids.map(cid=>{
    const g=groups[cid];
    const m=WCAL_CAT_META[g.cat]||{label:''};
    const posterHtml=_wcalPosterThumbHtml(g.cat,g.poster);
    const finalHtml=g.final?
      `<div class="ch-tlB-final-row">${g.final.stars>0?`<div class="ch-tlB-stars">${'★'.repeat(g.final.stars)}${'☆'.repeat(5-g.final.stars)}</div>`:''}</div>
       ${g.final.review?`<div class="ch-tlB-final-text">${escapeHtml(g.final.review)}</div>`:''}`
      :'';
    const progressBadgeHtml=g.final?'':'<span class="status-badge">진행중</span>';
    const notesSorted=g.notes.slice().sort((a,b)=>(b.dk||'').localeCompare(a.dk||''));
    const notesHtml=notesSorted.length?`<div class="ch-tlB-notes">${notesSorted.map(n=>{
      const dispDate=n.dk?(parseInt(n.dk.slice(5,7),10)+'/'+parseInt(n.dk.slice(8,10),10)):'';
      return `<div class="ch-tlB-note-item"><div class="ch-tlB-note-date">${dispDate}</div><div class="ch-tlB-note-text">${escapeHtml(n.text||'')}</div></div>`;
    }).join('')}</div>`:'';
    return `<div class="ch-tlB-card">
      <div class="ch-tlB-top">
        ${posterHtml}
        <div class="ch-tlB-body">
          <div class="ch-tlB-title-row"><div class="ch-tlB-title">${escapeHtml(g.title||'')}</div><div class="ch-tlB-cat">${m.label}</div>${progressBadgeHtml}</div>
          ${finalHtml}
        </div>
      </div>
      ${notesHtml}
    </div>`;
  }).join('');
}
function _wcalPosterThumbHtml(cat,poster){
  const m=WCAL_CAT_META[cat]||{icon:'ti-stack-2'};
  if(poster)return `<img src="${poster}" style="width:32px;height:44px;border-radius:5px;object-fit:cover;flex-shrink:0;" />`;
  return `<div style="width:32px;height:44px;border-radius:5px;background:var(--card);flex-shrink:0;display:flex;align-items:center;justify-content:center;"><i class="ti ${m.icon}" style="color:var(--tm);font-size:13px;" aria-hidden="true"></i></div>`;
}
function _chFinalRowHtml(f){
  const posterHtml=`<img class="ch-tlA-poster" src="${f.poster||''}" style="${f.poster?'':'background:var(--card);'}" alt="">`;
  return `<div class="ch-tlA-row">
    <div class="ch-tlA-dot final"></div>
    <div class="ch-tlA-content">
      ${posterHtml}
      <div class="ch-tlA-main">
        <div class="ch-tlA-title-row">
          <span class="ch-tlA-badge-final">완</span>
          <span class="ch-tlA-title">${escapeHtml(f.title||'')}</span>
          ${f.stars>0?`<span class="ch-tlA-stars">${'★'.repeat(f.stars)}${'☆'.repeat(5-f.stars)}</span>`:''}
        </div>
        ${f.review?`<div class="ch-tlA-text">${escapeHtml(f.review)}</div>`:''}
      </div>
    </div>
  </div>`;
}
function _chNoteRowHtml(n,showTime){
  const posterHtml=`<img class="ch-tlA-poster" src="${n.poster||''}" style="${n.poster?'':'background:var(--card);'}" alt="">`;
  const m=WCAL_CAT_META[n.cat]||{label:''};
  const timeHtml=(showTime&&n.time)?`<span class="ch-tlA-time">${n.time}</span>`:'';
  return `<div class="ch-tlA-row">
    <div class="ch-tlA-dot"></div>
    <div class="ch-tlA-content">
      ${posterHtml}
      <div class="ch-tlA-main">
        <div class="ch-tlA-title-row">
          ${timeHtml}
          <span class="ch-tlA-title">${escapeHtml(n.title||'')}</span>
          <span class="ch-tlA-cat-tag">${m.label}</span>
        </div>
        <div class="ch-tlA-text">${escapeHtml(n.text||'')}</div>
      </div>
    </div>
  </div>`;
}
