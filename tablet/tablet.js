// rebuild: 2026-08-27
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
// ── 별점 표시 헬퍼 (본앱과 동일 — 0.5단위, tabler 아이콘 기반. 읽기전용이라 표시만 필요, 클릭 위젯 없음) ──
function _starIconClass(val,n){
  if(val>=n)return 'ti-star-filled';
  if(val>=n-0.5)return 'ti-star-half-filled';
  return 'ti-star';
}
function renderStarDisplayHtml(stars,sizeClass){
  if(!stars||stars<=0)return '';
  const cls=sizeClass?` ${sizeClass}`:'';
  return [1,2,3,4,5].map(n=>`<i class="ti ${_starIconClass(stars,n)}${cls}" aria-hidden="true"></i>`).join('');
}
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

// 앱 출시 첫 달(6월, 0-indexed=5) — 월 중순 시작이라 반달치 데이터라 연간탭 통계 비교에서 왜곡 요인.
// 습관탭 전체통계(_yrHabitOverallStats)와 리듬탭 GROWING/SHRINKING(renderYrRhythmChangeInsights) 양쪽에서
// "시작달(비교 기준점)로 6월을 쓰지 않기" 위해 공유(2027-01, 봄이님 결정). 트랙 그래프 등 시각적 표시에는
// 계속 6월이 남아있고, 오직 통계 계산의 시작점에서만 제외됨.
// TODO: 다음 해로 넘어가면(연간탭이 calendar-year로 리셋되는 시점) 이 하드코딩 제거할 것 — 그때는
// 새해 첫 달부터가 정상적인 전체 기록 달이 됨.
const YR_FIRST_LAUNCH_MONTH_IDX=5;

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
// ══════════════════════════════════════════════════════════
// top-row(감상 달력 / 콘텐츠 모아보기) 높이 동기화
// ──────────────────────────────────────────────────────────
// 과거 시도 1(JS로 매번 측정+고정)과 시도 2(CSS grid align-items:stretch에 위임)가
// 번갈아 재발했던 이유:
//   - CSS stretch만으로는 "감상 달력 높이에 맞춰 콘텐츠 모아보기를 자르고 스크롤"이 불가능함.
//     stretch는 두 칸을 "더 큰 쪽" 기준으로 서로 늘릴 뿐, 어느 한쪽에 상한을 주지 못한다.
//     콘텐츠 모아보기는 항목 수가 달마다 달라 원래도 감상 달력보다 쉽게 길어지므로,
//     stretch 하에서는 감상 달력이 오히려 콘텐츠 쪽 길이를 따라가며 "무한정 길어짐" 현상으로 보였음.
//   - 예전 JS 동기화는 사이드바 접기/펼치기 트랜지션(0.32s) 중 한 번만 측정해서 반영이 어긋났음.
// 이번 구현은 ResizeObserver로 wcal-card의 실제 렌더 높이를 프레임 단위로 계속 관찰하다가
// 바뀔 때마다 cgrid-card 높이에 그대로 반영한다 — 사이드바 트랜지션 중에도, 폰트 크기 변경으로
// 주차 행 수가 바뀌어도, 달이 바뀌어 주차 수(4~6주)가 바뀌어도 항상 자동으로 따라간다.
// 모바일(≤760px)에서는 .top-row가 1열 스택으로 바뀌어 높이를 맞출 필요가 없으므로 개입하지 않는다.
let _cgridHeightRO=null;
function syncCgridHeightToWcal(){
  const wcal=document.querySelector('.wcal-card');
  const cgrid=document.querySelector('.cgrid-card');
  if(!wcal||!cgrid)return;
  const isDesktop=window.matchMedia('(min-width:761px)').matches;
  if(!isDesktop){
    cgrid.style.height='';
    return;
  }
  const h=wcal.getBoundingClientRect().height;
  if(h>0)cgrid.style.height=h+'px';
}
function initCgridHeightSync(){
  const wcal=document.querySelector('.wcal-card');
  if(!wcal)return;
  if(_cgridHeightRO)_cgridHeightRO.disconnect();
  _cgridHeightRO=new ResizeObserver(()=>syncCgridHeightToWcal());
  _cgridHeightRO.observe(wcal);
  // ResizeObserver 자체가 wcal-card 폭이 바뀌는 매 프레임마다(aspect-ratio로 셀이 커지고 작아지는
  // 진행 과정 포함) 콜백을 태우므로 트랜지션 도중에도 이미 실시간으로 계속 따라간다.
  // transitionend는 트랜지션이 끝난 마지막 프레임까지 오차 없이 딱 맞추기 위한 보정용 안전망일 뿐.
  const side=document.getElementById('side');
  if(side){
    side.addEventListener('transitionend',(e)=>{
      if(e.propertyName==='width')syncCgridHeightToWcal();
    });
  }
  syncCgridHeightToWcal();
}
window.addEventListener('resize',()=>{if(_cgridHeightRO)syncCgridHeightToWcal();});

// ══════════════════════════════════════════════════════════
// 연간탭 콘텐츠 — 올해의 감상 아카이브(기준) / 월별 감상 그리드(따라감) 높이 동기화
// syncCgridHeightToWcal/initCgridHeightSync(월간탭)와 완전히 동일한 패턴 — 기준 카드는 자연 높이,
// 따라가는 카드는 ResizeObserver로 실측 높이를 실시간 반영, transitionend는 사이드바 트랜지션 종료 보정용.
// ══════════════════════════════════════════════════════════
let _yrContentHeightRO=null;
function syncYrContentHeight(){
  const ref=document.querySelector('.yr-cgrid-refcard');
  const follow=document.querySelector('.yr-mgrid-card');
  if(!ref||!follow)return;
  const isDesktop=window.matchMedia('(min-width:761px)').matches;
  if(!isDesktop){
    follow.style.height='';
    return;
  }
  const h=ref.getBoundingClientRect().height;
  if(h>0)follow.style.height=h+'px';
}
function initYrContentHeightSync(){
  const ref=document.querySelector('.yr-cgrid-refcard');
  if(!ref)return;
  if(_yrContentHeightRO)_yrContentHeightRO.disconnect();
  _yrContentHeightRO=new ResizeObserver(()=>syncYrContentHeight());
  _yrContentHeightRO.observe(ref);
  const side=document.getElementById('side');
  if(side){
    side.addEventListener('transitionend',(e)=>{
      if(e.propertyName==='width')syncYrContentHeight();
    });
  }
  syncYrContentHeight();
}
window.addEventListener('resize',()=>{if(_yrContentHeightRO)syncYrContentHeight();});

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
  document.getElementById('tab-'+tab).scrollTop=0;
  closeFloatMenu();
  // 오늘탭으로 돌아올 때는 항상 실제 '오늘' 날짜로 재설정(자정을 넘겨도 갱신되도록)
  if(tab==='today'){_selectedDate=new Date();loadTodayTab();}
  else if(tab==='week')loadWeekTab();
  else if(tab==='month'){loadMonthTab();initCgridHeightSync();}
  else if(tab==='reports'){resetReportsView();loadReportsTab();}
  else if(tab==='yearly')loadYearlyTab();
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

  const html=`<div class="mini-cal-hdr">
      <div class="mini-cal-month-toggle${_sideCalExpanded?' expanded':''}" onclick="toggleSideCalExpand()"><span>${y}년 ${m+1}월</span><i class="ti ti-chevron-down expand-arrow" aria-hidden="true"></i></div>
      <div><i class="ti ti-chevron-left" onclick="sideCalShift(-1)" aria-hidden="true"></i><i class="ti ti-chevron-right" onclick="sideCalShift(1)" aria-hidden="true"></i></div>
    </div>
    <div class="mini-cal-dow-row">${DOW_MON_START.map(d=>`<div class="dow">${d}</div>`).join('')}</div>
    <div class="mini-cal-week-row${_sideCalExpanded?' hidden':''}"><div class="mini-cal-grid">${weekRowHtml}</div></div>
    <div class="mini-cal-month-grid${_sideCalExpanded?' on':''}"><div>
      <div class="mini-cal-grid">${monthGridHtml}</div>
    </div></div>`;
  // 데스크탑/태블릿 사이드바용(#mini-cal)과, 세로(모바일) 상단 스트립에서 펼치는 오버레이용
  // (#mini-cal-overlay-inner) 둘 다 같은 마크업을 공유 — 후자는 CSS로 월간뷰만 노출.
  const el=document.getElementById('mini-cal');
  if(el)el.innerHTML=html;
  const elOverlay=document.getElementById('mini-cal-overlay-inner');
  if(elOverlay)elOverlay.innerHTML=html;
}
function toggleSideCalExpand(){
  _sideCalExpanded=!_sideCalExpanded;
  renderMiniCal();
}
function sideCalShift(delta){
  _sideCalDate.setMonth(_sideCalDate.getMonth()+delta);
  renderMiniCal();
}
// 세로(모바일) 전용 — 상단 스트립엔 요일/주간 한 줄만 보이므로, 월 라벨·월간 그리드를
// 보고 싶을 때 오버레이로 펼쳐서 보여줌. 가로 화면에선 버튼 자체가 숨겨져 있어 호출되지 않음.
function openMobileCalOverlay(){
  document.getElementById('mobile-cal-overlay').classList.add('on');
}
function closeMobileCalOverlay(){
  document.getElementById('mobile-cal-overlay').classList.remove('on');
}
// 사이드바 미니캘린더에서 날짜를 고르면 항상 오늘탭으로 이동해서 그 날짜를 보여줌
function selectDate(dk){
  _selectedDate=new Date(dk+'T00:00:00');
  renderMiniCal();
  closeMobileCalOverlay(); // 세로 모드 오버레이에서 날짜를 골랐으면 자동으로 닫아줌(가로에선 오버레이가 안 열려 있으니 무해)
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

  const [todos,sleepRows,recentSleepRows,habits,habitChecks,meals,contents,rblocks,morningChecks,todayManualRows]=await Promise.all([
    supaFetch(`todos?date_key=eq.${dk}&order=created.asc`),
    supaFetch(`sleep?date_key=eq.${dk}`),
    supaFetch(`sleep?date_key=gte.${sleepAvgStartDk}&date_key=lte.${dk}&select=date_key,score,sleep_time,wake_time`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=eq.${dk}`),
    supaFetch(`meals?date_key=eq.${dk}`),
    supaFetch(`contents?or=(status.eq.watching,and(status.eq.done,end_date.eq.${dk}),start_date.eq.${dk})&order=created.desc&limit=10`),
    supaFetch(`rhythm_blocks?date_key=eq.${dk}&order=start_time.asc`),
    supaFetch(`morning_routine_checks?date_key=eq.${dk}`),
    supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('wcal_manual_'+dk.slice(0,7))}`)
  ]);

  renderTodayTodosEvents(todos||[]);
  renderTodayMemos(dk);
  renderTodaySleep(dk,sleepRows&&sleepRows[0],recentSleepRows||[]);
  renderTodayHabits(habits||[],habitChecks||[],dk);
  renderTodayMeals(meals&&meals[0]);
  renderTodayContents(contents||[]);
  _todayRhythmBlocks=rblocks||[];
  _todaySleepRow=sleepRows&&sleepRows[0];
  _todayMealsRow=meals&&meals[0];
  renderTodayRhythm(rblocks||[]);
  const todayManual=((todayManualRows&&todayManualRows[0]&&todayManualRows[0].lines)||[]).filter(it=>it.dk===dk);
  renderTodayReading(dk,rblocks||[],contents||[],todayManual);
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
// 본앱 SCHEDULE_TIME_RE와 동일 — 투두 텍스트 맨 앞이 "HH:MM 텍스트" 형식이면 타임테이블 항목으로 분류.
const SCHEDULE_TIME_RE=/^(\d{1,2}):(\d{2})\s+(.+)/;
// 본앱 parseScheduleTodos와 동일 로직(체크박스 토글 없는 읽기전용이라 done만 반영, i/cid는 불필요).
function parseTabletScheduleTodos(todos){
  const nowMin=new Date().getHours()*60+new Date().getMinutes();
  const items=[];
  todos.forEach(t=>{
    const m=(t.text||'').match(SCHEDULE_TIME_RE);
    if(!m)return;
    const hh=parseInt(m[1],10),mm=parseInt(m[2],10);
    if(hh>23||mm>59)return;
    items.push({time:m[1].padStart(2,'0')+':'+m[2],min:hh*60+mm,label:m[3],done:t.done});
  });
  items.sort((a,b)=>{
    if(a.done!==b.done)return a.done?1:-1;
    if(!a.done){
      const da=a.min>=nowMin?a.min-nowMin:1440+(a.min-nowMin);
      const db=b.min>=nowMin?b.min-nowMin:1440+(b.min-nowMin);
      return da-db;
    }
    return a.min-b.min;
  });
  return items;
}
// 오늘 일정 ↔ 타임테이블 전환 — 본앱과 동일 방식(제목 클릭), 리듬 도넛/바 없이 리스트만.
let _tabletEventMode=null; // null=자동판단, 'event'|'schedule'=사용자가 수동전환한 값(날짜 이동 시 리셋)
let _tabletEventModeDk=null;
function toggleTabletEventMode(){
  const curShowsSchedule=document.getElementById('today-timetable').style.display!=='none';
  _tabletEventMode=curShowsSchedule?'event':'schedule';
  renderTodayTodosEvents(_todayTodosCache||[]);
}
let _todayTodosCache=[];
function renderTodayTodosEvents(todos){
  _todayTodosCache=todos;
  // 날짜가 바뀌어 다시 보는 화면이면(다른 날짜 조회 후 복귀 등) 수동 전환 기록을 리셋 — 매 조회마다 새로 자동판단
  const _dk=dateKey(_selectedDate);
  if(_tabletEventModeDk!==_dk){_tabletEventMode=null;_tabletEventModeDk=_dk;}
  const scheduleItems=parseTabletScheduleTodos(todos.filter(t=>!t.is_event));
  const plainTodos=todos.filter(t=>!t.is_event&&!SCHEDULE_TIME_RE.test(t.text||'')).slice().sort((a,b)=>{
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
  const ttEl=document.getElementById('today-timetable');
  const labelEl=document.getElementById('today-event-label');
  const evCardEl=document.getElementById('today-event-card');
  const sorted=events.slice().sort((a,b)=>(a.event_time||'99:99').localeCompare(b.event_time||'99:99'));
  const hasEvent=sorted.length>0,hasSchedule=scheduleItems.length>0;
  // 세로(모바일) 화면에서 "일정도 시간표도 없으면 카드 자체를 숨김" 처리용 — 가로에서는 이 클래스를 무시하고 항상 노출.
  if(evCardEl)evCardEl.classList.toggle('no-events',!hasEvent&&!hasSchedule);
  let mode;
  if(!hasEvent)mode='schedule';
  else if(!hasSchedule)mode='event';
  else if(_tabletEventMode)mode=_tabletEventMode;
  else{
    // 최초 노출: 각자 카테고리에서 가장 가까운(아직 안 지난) 항목 시각끼리 비교, 더 가까운 쪽. 둘 다 없으면(다 지났으면) 일정 선노출.
    const nextUpcoming=(mins)=>{const up=mins.filter(m=>m>=nowMin);return up.length?Math.min(...up):null;};
    const eventMins=isToday?sorted.filter(e=>e.event_time).map(e=>{const m=e.event_time.match(/^(\d{1,2}):(\d{2})/);return m?parseInt(m[1],10)*60+parseInt(m[2],10):null;}).filter(m=>m!=null):[];
    const scheduleMins=isToday?scheduleItems.filter(it=>!it.done).map(it=>it.min):[];
    const nextEvent=nextUpcoming(eventMins),nextSchedule=nextUpcoming(scheduleMins);
    mode=(nextSchedule!=null&&(nextEvent==null||nextSchedule<nextEvent))?'schedule':'event';
  }
  const showSwitch=hasEvent&&hasSchedule;
  if(labelEl)labelEl.innerHTML=`<i class="ti ti-calendar-heart" style="color:rgba(var(--pal-lavender-rgb),1);" aria-hidden="true"></i>${mode==='event'?'오늘 일정':'타임테이블'}${showSwitch?' <i class="ti ti-switch-horizontal" aria-hidden="true"></i>':''}`;
  if(mode==='schedule'){
    evEl.style.display='none';
    if(ttEl){
      ttEl.style.display='block';
      ttEl.innerHTML=scheduleItems.length?scheduleItems.map(it=>{
        return `<div class="event-row${it.done?' past':''}"><span class="event-time">${it.time}</span>${escapeHtml(it.label)}</div>`;
      }).join(''):'<div class="empty-msg">오늘 등록된 시간표가 없어요</div>';
    }
    return;
  }
  evEl.style.display='';
  if(ttEl)ttEl.style.display='none';
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
    sleepAvgTxt=_minToHHMM(sSum/validRows.length);
    wakeAvgTxt=_minToHHMM(wSum/validRows.length);
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
// _rhythmDurByCat + 카테고리별 실제 발생일수(dayCount) — renderMrpRhythm(월간리포트)과 동일 기준.
// 카테고리 일평균의 분모는 전체 기록일수가 아니라 "그 카테고리가 실제로 기록된 날짜 수"여야 함
// (외출이 한 달 중 3일만, 총 12시간이면 12시간÷3일이지 12시간÷30일이 아님) — 연간탭 8대 카테고리
// 밸런스에서 이 기준이 빠져 있던 걸 발견, 여기에 추가(2026-08).
function _rhythmDurByCatWithDays(rblocks,days){
  const d={};let total=0;const daysSeen={};
  (rblocks||[]).forEach(b=>{
    if(days&&!days.includes(b.date_key))return;
    if(!b.start_time||!b.end_time)return;
    const s=_paceParseHM(b.start_time),e=_paceParseHM(b.end_time);
    if(isNaN(s)||isNaN(e))return;
    let dur=e-s;if(dur<0)dur+=1440;
    if(dur<=0)return;
    d[b.cat]=(d[b.cat]||0)+dur;total+=dur;
    daysSeen[b.cat]=daysSeen[b.cat]||new Set();
    daysSeen[b.cat].add(b.date_key);
  });
  const dayCount={};
  Object.keys(daysSeen).forEach(k=>{dayCount[k]=daysSeen[k].size;});
  return {d,total,dayCount};
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
function _todayReadingItemHtml(item){
  const meta=WCAL_CAT_META[item.cat]||{icon:'ti-stack-2',color:'rgba(150,150,150,1)',label:''};
  const coverStyle=item.poster?`background-image:url('${item.poster}');`:`background:${meta.color};`;
  const coverIcon=item.poster?'':`<i class="ti ${meta.icon}" style="color:#fff;font-size:16px;" aria-hidden="true"></i>`;
  // 드라마/독서/영화 모두 "오늘 이만큼 봤어요"를 시간으로 통일 표기(2026-08-27) — 퍼센트 진행률은
  // 감상달력·콘텐츠 모아보기 등 다른 곳에서 이미 볼 수 있어 여기서는 시간이 더 직관적이라는 판단.
  // durationMin이 없는 경우(리듬 기록도 없고 완결 러닝타임도 없는 영화, 음악 등)는 기존처럼 카테고리 라벨만.
  const subLine=item.durationMin?_fmtDur(item.durationMin):(meta.label||'');
  return `<div class="rd-cur-book-sm">
    <div class="rd-cur-cover-sm" style="${coverStyle}display:flex;align-items:center;justify-content:center;">${coverIcon}</div>
    <div class="rd-cur-info-sm"><div class="rd-cur-title-sm">${escapeHtml(item.title||'')}</div><div class="rd-cur-pct-sm">${subLine}</div></div>
  </div>`;
}
function renderTodayReading(dk,rblocks,contents,manualItems){
  const el=document.getElementById('today-reading');
  const items=[];
  const seen=new Set();
  const push=(cat,title,poster)=>{
    const key=cat+'|'+title;
    if(seen.has(key)||!title)return;
    seen.add(key);
    items.push({cat,title,poster:poster||null});
  };
  // 드라마/독서는 오늘 기록된 리듬 블록(시작~종료 시각)을 같은 제목끼리 합산해 "오늘 실제로 쓴 시간"을 구함.
  // 하루에 나눠서 여러 번 기록해도(오전에 좀 보고 저녁에 이어보고) 전부 더해서 하나의 총 시간으로 보여줌.
  const durMinByKey={};
  (rblocks||[]).forEach(b=>{
    if(b.cat!=='enjoy'||!b.text||!b.start_time||!b.end_time)return;
    let cat=null,title=null;
    if(b.text.startsWith('드라마 - ')){cat='drama';title=b.text.slice(6);}
    else if(b.text.startsWith('독서 - ')){cat='book';title=b.text.slice(5);}
    else return;
    const s=_paceParseHM(b.start_time),e=_paceParseHM(b.end_time);
    let mins=e-s;if(mins<0)mins+=1440;
    const key=cat+'|'+title;
    durMinByKey[key]=(durMinByKey[key]||0)+mins;
    push(cat,title);
  });
  (contents||[]).filter(c=>c.content_cat==='music'&&c.start_date===dk).forEach(c=>push('music',c.title,c.poster));
  // 영화는 리듬 기록 유무와 무관하게 contents 하나만 기준으로 판단 — 하루짜리(당일 시작~종료), 기간형(진행중이면
  // 시작일~오늘 사이), 콘텐츠탭에만 등록된 경우까지 모두 이 하나의 규칙으로 포섭(2026-08-25 단순화).
  (contents||[]).filter(c=>c.content_cat==='movie').forEach(c=>{
    const isToday=(c.status==='watching'&&c.start_date&&c.start_date<=dk)||c.start_date===dk||c.end_date===dk;
    if(isToday)push('movie',c.title,c.poster);
    // 영화도 같은 날 리듬 블록에 기록이 있으면(나눠 보기 등) 그 시간을 우선 사용할 수 있도록 같은 방식으로 합산.
    // 리듬 블록 텍스트가 영화 제목과 일치하는 수기 기록이 있는 경우만 해당(드물지만 대비).
  });
  (rblocks||[]).forEach(b=>{
    if(b.cat!=='enjoy'||!b.text||!b.start_time||!b.end_time)return;
    if(!b.text.startsWith('영화 - '))return;
    const title=b.text.slice(5);
    const s=_paceParseHM(b.start_time),e=_paceParseHM(b.end_time);
    let mins=e-s;if(mins<0)mins+=1440;
    const key='movie|'+title;
    durMinByKey[key]=(durMinByKey[key]||0)+mins;
  });
  (manualItems||[]).forEach(it=>push(it.cat,it.title));
  // 포스터/상태 매칭 — 오늘 넘어온 contents 목록에서 같은 제목의 poster·status·total_unit(영화 완결 러닝타임)을 찾아 붙임
  const posterByTitle={},statusByTitle={},totalUnitByTitle={};
  (contents||[]).forEach(c=>{
    if(c.content_cat==='music'||!c.title)return;
    posterByTitle[c.title]=c.poster||null;
    statusByTitle[c.title]=c.status||null;
    if(c.total_unit)totalUnitByTitle[c.title]=c.total_unit;
  });
  items.forEach(it=>{
    if(it.cat==='music')return;
    if(!it.poster)it.poster=posterByTitle[it.title]||null;
    const key=it.cat+'|'+it.title;
    if(durMinByKey[key]){
      it.durationMin=durMinByKey[key]; // 드라마/독서/(리듬기록 있는)영화 — 오늘 실제로 쓴 시간
    }else if(it.cat==='movie'&&statusByTitle[it.title]==='done'&&totalUnitByTitle[it.title]){
      it.durationMin=totalUnitByTitle[it.title]; // 완결 영화 — 리듬 기록이 없으면 러닝타임(total_unit=분)을 그대로 감상시간으로
    }
  });

  const shown=items.slice(0,2);
  if(!shown.length){el.innerHTML='<div class="empty-msg" style="text-align:left;">오늘 감상한 콘텐츠가 없어요</div>';return;}
  const moreCount=items.length-shown.length;
  const moreBadge=moreCount>0?`<span class="rd-cur-more-tiny">+${moreCount}</span>`:'';
  const itemsHtml=shown.map(it=>_todayReadingItemHtml(it)).join('');
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
function goToCurrentWeek(){
  const d=new Date();
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

  // 이번 주 키워드 카드용 롤링 2주(오늘 제외) — 캘린더 주(월~일)와 무관하게 항상 "어제부터 14일 전까지".
  // 처음엔 7일로 시작했으나 표본이 너무 적어 실사용 중 2주로 확장(2026-08-27).
  const kwEnd=new Date();kwEnd.setDate(kwEnd.getDate()-1);
  const kwStart=new Date();kwStart.setDate(kwStart.getDate()-14);
  const kwStartDk=dateKey(kwStart),kwEndDk=dateKey(kwEnd);

  // 이번 주 독서 스트릭용 — 연속 일수가 여러 주에 걸쳐 이어질 수 있어 이번 주 범위만으론 부족하지만,
  // 한 책을 90일씩 읽는 경우는 드물어 30일 롤링 정도면 스트릭 계산에 충분함(2026-08-26 축소 확정).
  const rdStreakStart=new Date();rdStreakStart.setDate(rdStreakStart.getDate()-30);
  const rdStreakStartDk=dateKey(rdStreakStart);

  const [goalRows,habits,habitChecks,memos,todos,sleepRows,onelineRows,contents,
    lwMemos,lwTodos,lwSleepRows,lwHabitChecks,rblocksFull,sleepReportRows,
    rblocksLast,weekMemoTexts,weekOnelineTexts,readingLogRows,
    rdaThisWeek,rdaLastWeek]=await Promise.all([
    supaFetch(`goal_notes?note_key=eq.wchallenge_${encodeURIComponent(wk)}`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    supaFetch(`memos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=id`),
    supaFetch(`todos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=done`),
    supaFetch(`sleep?date_key=gte.${startDk}&date_key=lte.${endDk}&select=date_key,score,sleep_time,wake_time`),
    supaFetch(`goal_notes?note_key=gte.oneline:${startDk}&note_key=lte.oneline:${endDk}`),
    // 콘텐츠는 이번주/지난주가 항상 동일한 쿼리(status/카테고리 조건만 있고 날짜 범위가 없음)라
    // renderWeekDelta 안에서 countContentsCompletedInRange(contents,startDk,endDk)로 각자 날짜만
    // 다르게 필터링함 — 한 번만 조회해서 cur/prev 양쪽에 같은 배열을 넘기면 됨(구 lwContents 제거).
    // 이번 주 독서 카드(진행중/완독 책 판별)에도 이 같은 배열을 재사용 — 책만 watching 상태도 포함하도록
    // 조건을 넓혀서, 별도 쿼리 없이 여기서 표지/제목/상태를 모두 가져옴. 책 진행률(total_unit/current_unit/unit_label)도
    // contents에 통합됐으므로(2026-08-29 본앱 통합) 더 이상 reading_books 보조 조회가 필요 없음.
    supaFetch(`contents?or=(status.in.(done,stopped),content_cat.eq.music,and(content_cat.eq.book,status.eq.watching))&order=created.desc&limit=100`),
    // 지난주 대비 비교용(오늘 요일까지로 절단된 범위)
    supaFetch(`memos?date_key=gte.${lastStartDk}&date_key=lte.${lastCmpEndDk}&select=id`),
    supaFetch(`todos?date_key=gte.${lastStartDk}&date_key=lte.${lastCmpEndDk}&select=done`),
    supaFetch(`sleep?date_key=gte.${lastStartDk}&date_key=lte.${lastCmpEndDk}&select=date_key,score,sleep_time,wake_time`),
    supaFetch(`habit_checks?date_key=gte.${lastStartDk}&date_key=lte.${lastCmpEndDk}`),
    // 이번 주 리듬 블록(월~일 7일 전체) — "리듬 흐름 비교용(오늘까지 절단)"과 "감상 스트립용(7일 전체)"이
    // 예전엔 각각 따로 조회됐으나, 절단 범위가 7일 전체의 부분집합이라 한 번만 가져와 흐름 비교 쪽은
    // cmpEndDk 기준으로 아래에서 JS로 잘라 쓰고, 감상 스트립은 이 전체 배열을 그대로 씀.
    supaFetch(`rhythm_blocks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    // 수면 리포트 최근 2주
    supaFetch(`sleep?date_key=gte.${slStartDk}&date_key=lte.${slEndDk}&select=date_key,score,sleep_time,wake_time`),
    supaFetch(`rhythm_blocks?date_key=gte.${lastStartDk}&date_key=lte.${lastCmpEndDk}`),
    // 주간 키워드용 메모 원문 — 롤링 2주(오늘 제외, kwStartDk~kwEndDk)
    supaFetch(`memos?date_key=gte.${kwStartDk}&date_key=lte.${kwEndDk}&select=date_key,text`),
    // 주간 키워드 카드에 하루한줄도 메모와 같은 역할로 포함 — 같은 롤링 2주(오늘 제외) 범위로 별도 조회.
    // 캘린더 주 범위(onelineRows, 하루한줄 배너용)와는 범위가 달라 재사용하지 않음(2026-08-27).
    supaFetch(`goal_notes?note_key=gte.oneline:${kwStartDk}&note_key=lte.oneline:${kwEndDk}`),
    // 이번 주 독서용 — 스트릭 계산은 여전히 reading_daily_log 기준(현재 읽는 책 자체는 위 contents에서 파생)
    supaFetch(`reading_daily_log?date_key=gte.${rdStreakStartDk}&select=date_key`),
    // 이번 주 독서 활동(탭 전환용) — 이번 주/지난주 각각의 독서 로그(권별 진행량 계산용)
    supaFetch(`reading_daily_log?date_key=gte.${startDk}&date_key=lte.${cmpEndDk}&select=date_key,book_cid,unit,amount_read,seconds&order=date_key.asc`),
    supaFetch(`reading_daily_log?date_key=gte.${lastStartDk}&date_key=lte.${lastCmpEndDk}&select=date_key,book_cid,unit,amount_read,seconds&order=date_key.asc`)
  ]);
  // 현재 읽는 책 1권 + 전체 책 목록 — 이제 contents(content_cat='book')에서 직접 파생(2026-08-29, reading_books 제거로 별도 쿼리 불필요)
  const weekBooks=(contents||[]).filter(c=>c.content_cat==='book');
  const readingBook=weekBooks.find(c=>c.status==='watching');
  const readingBooksAll=weekBooks;

  const rblocksThis=(rblocksFull||[]).filter(b=>b.date_key<=cmpEndDk);

  renderWeekGoals(goalRows&&goalRows[0]);
  renderWeekHabitMatrix(habits||[],habitChecks||[],weekDates);
  renderWeekSleepReport(sleepReportRows||[]);
  renderWeekDelta({
    memos:memos||[],todos:todos||[],sleepRows:sleepRows||[],habits:habits||[],checks:habitChecks||[],contents:contents||[],
    startDk,endDk:cmpEndDk,cmpDayCount
  },{
    memos:lwMemos||[],todos:lwTodos||[],sleepRows:lwSleepRows||[],checks:lwHabitChecks||[],contents:contents||[],
    startDk:lastStartDk,endDk:lastCmpEndDk
  });
  renderWeekRhythmFlow(rblocksThis||[],rblocksLast||[],cmpDayCount);
  renderWeekOneline(onelineRows||[],weekDates);
  renderWeekKeywords(weekMemoTexts||[],weekOnelineTexts||[]);
  renderWeekReading(contents||[],readingBook,readingLogRows||[],startDk,endDk);
  renderWeekReadingActivity(rdaThisWeek||[],rdaLastWeek||[],readingBooksAll||[],contents||[],startDk,cmpEndDk,lastStartDk,lastCmpEndDk);
}

// 반올림·음수/1440초과 정규화까지 포함 — 평균 계산 등 소수분·범위 밖 값이 들어올 수 있는 모든 호출부에서 안전하게 사용(2026-08, 기존엔 연간탭에 _yrMinToHHMM으로 중복 존재했음).
function _minToHHMM(min){const m=Math.round(((min%1440)+1440)%1440);return pad(Math.floor(m/60))+':'+pad(m%60);}

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

  // 세로(모바일) 화면은 막대 폭이 좁아 시간 텍스트가 겹치기 쉬워, 표기 개수를 4개→3개, 최소 비중도 9%→13%로 더 보수적으로 잡음.
  // 매 렌더 시점의 실제 뷰포트 폭을 그때그때 확인 — 리사이즈 이벤트까지 구독할 필요는 없음(이 앱은 로드 시 뷰포트가 사실상 고정).
  const isNarrow=window.innerWidth<=760;
  const maxTimeCount=isNarrow?3:4;
  const minPctForTime=isNarrow?13:9;

  // 막대는 그 줄의 총합 중 비중이 큰 카테고리부터 이어지도록 시간이 긴 순으로 정렬(들쑥날쑥함 방지)
  // 상위 N개 세그먼트는 아이콘 옆에 그 줄 기준 일평균 시간을 함께 표기(누계/dayCount)
  const barRow=(tick,d,total,dayCount)=>{
    if(total<=0)return `<div class="rf-row"><span class="rf-tick">${tick}</span><div class="rf-bar-chart"></div></div>`;
    const sorted=Object.keys(d).filter(k=>d[k]>0).sort((a,b)=>d[b]-d[a]);
    let segs='';
    sorted.forEach((k,i)=>{
      const c=RHYTHM_CATS[k];if(!c)return;
      const pct=d[k]/total*100;
      const showTime=i<maxTimeCount&&pct>=minPctForTime; // 상위 N개 + 텍스트가 들어갈 최소 폭 확보되는 경우만 표기
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

// 주간 키워드 — 최근 2주(오늘 제외)에 남긴 메모+하루한줄 원문에서 자주 등장한 단어 상위 6개를 뽑아 워드클라우드로 표시.
// AI 요약이 아니라 순수 프론트엔드 빈도 집계라 매일 갱신해도 비용 부담이 없음(2026-08-26, 진단용 키워드_test.html로 검증 후 확정).
// 완벽한 형태소 분석이 아닌 규칙 기반 근사치 — "감 잡기용" 정도의 정확도를 목표로 함.
const WEEK_KW_STOPWORDS=new Set([
  '오늘','내일','어제','그리고','그런데','근데','너무','정말','진짜','조금','약간','다시','이제','그냥','아직',
  '했다','했어','했음','한다','하다','해야','해서','하고','했는데','같다','같아','같음','있다','있어','있음',
  '없다','없어','없음','되다','됐다','됐어','것','거','수','때','것같다','이거','저거','그거','우리','나는',
  '내가','나도','그래서','하지만','그리고나서','좀','약간의','매우','아주','완전','진짜로','이렇게','저렇게',
  '그렇게','하는','하는데','한테','에서','으로','에게','까지','부터','이랑','랑','한','할','하며','했지만',
  '아침','오후','저녁','새벽','점심','밤','낮', // 매일 습관처럼 시간대로 문장을 시작해 키워드로서 의미 없음
  '이번주','지난주','다음주','이번달','지난달','다음달','오늘부터','요즘','최근', // 시간대와 같은 이유로 매번 습관적으로 붙는 기간 표현
  '많이','조금씩','살짝','잠깐','잠시','계속','자꾸','거의','늘','항상','가끔','종종','벌써','이미','아마',
  '일찍','한번','한번씩','다시한번','좀더','조금더', // 빈도부사/횟수표현 — 문장 어디에나 붙는 습관적 수식어
  '하루','하루씩','하루하루','매일','매번','주말','평일','요일','시간','분','초','시','일주일','한달','한주', // 시간 단위 표현 — 아침/오후 등과 같은 이유로 의미 없음
  '되게','엄청','완전히','확실히','일단','우선','제법','꽤','상당히', // 문장 어디에나 습관적으로 붙어 키워드로서 의미 없는 부사류
  '1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월', // 날짜 표현 — 하루/아침과 같은 이유로 의미 없음
  '월요일','화요일','수요일','목요일','금요일','토요일','일요일',
  '한시간','두시간','세시간','네시간','반나절','한나절', // "시간"은 이미 불용어지만 숫자와 붙은 형태는 별도 토큰이라 추가
  '열심히','쉬엄쉬엄','부지런히','천천히','느긋하게','성실히','꾸준히', // 태도/정도를 나타내는 습관적 부사 — 내용보다 형식적으로 자주 붙음
  '완료','진행중','시작','종료','예정','완성', // 콘텐츠/할일 상태를 나타내는 시스템성 용어 — 실제 내용보다 형식적 표현
  '어느정도' // "도"가 조사로 오인식돼 "어느정"으로 잘못 잘리던 문제 — 원본 형태를 조사 제거 전에 먼저 걸러 방지(2026-08-27)
]);
// 접속부사류 — 조사 제거 규칙보다 먼저 원본 형태로 걸러야 함. 예: "그래도"가 조사 "도"만 벗겨지면
// "그래"라는 의미 없는 조각이 남아버림(2026-08-26 실사용 데이터에서 발견, 순서를 먼저로 확정).
const WEEK_KW_CONJUNCTIONS=new Set([
  '그래도','그래서','그러니까','그러므로','그치만','그렇지만','그럼에도','그런데도','근데도',
  '하지만','그러나','따라서','또한','게다가','더군다나','아무튼','어쨌든','아무래도','어차피',
  '그러면','그럼','그리하여','그러다가','그러다','그렇다면','한편'
]);
const WEEK_KW_PARTICLE_SUFFIXES=[
  '으로부터','에서부터','까지도','하고는','한테서','이라는','라는','이라도','라도',
  '에서는','에게는','으로는','에는','에도','엔','에서','에게','으로','까지','부터','마저','조차','밖에',
  '이랑','랑','와','과','도','만','만큼','처럼','같이','보다',
  '이라','라','인데','였는데','했는데','한데',
  '을','를','이','가','은','는','의','에'
];
const WEEK_KW_VERB_ENDING_RE=/(했다|했어|했음|한다|하다가|하다|해서|하고|했는데|되다|됐다|됐어|있다|있어|없다|없어|같다|같아|같음|이다|였다|였음|였다가|해봤다|해봤어|해봄|해야지|해야겠다|해야겠어|한대|한대요|했네|했네요|하네|하네요|이네|이네요|다네|다네요|겠다|좋겠다|좋겠어|좋겠네|좋다|좋아|좋네)$/;
// 자주 쓰일 법한 일상 동사 어간(먹다/자다/보다/가다/오다 등)의 흔한 활용형 — "~고"류 연결어미는 "친구/학교"
// 같은 멀쩡한 명사까지 통째로 걸러버릴 위험이 있어 어미 패턴으로 일반화하지 않고, 실제로 자주 나올 법한
// 어간+어미 조합만 명시적으로 나열(2026-08-27, "먹고"가 안 걸러지던 문제 계기로 추가).
const WEEK_KW_COMMON_VERBS=['먹','자','보','가','오','하','쉬','걷','씻','마시','만나','듣','읽','쓰','놀','웃','울','타','사','팔','주','받','넣','빼','열','닫','켜','끄'];
const WEEK_KW_VERB_ENDINGS=['고','다가','었다','었어','었음','으니까','니까','면서','는데','고는','고서','아서','어서','았다','았어'];
const WEEK_KW_VERB_COMBOS=new Set();
WEEK_KW_COMMON_VERBS.forEach(stem=>WEEK_KW_VERB_ENDINGS.forEach(end=>WEEK_KW_VERB_COMBOS.add(stem+end)));
function _weekKwStripParticle(w){
  for(const suf of WEEK_KW_PARTICLE_SUFFIXES){
    // 조사를 떼고 남는 부분이 최소 1글자만 되면 됨(예: "잠이"→"잠"). 기존엔 +1을 잘못 걸어 2글자 이상만
    // 허용하는 바람에 "잠","밥","꿈" 같은 1글자 명사+조사가 안 벗겨지는 문제가 있었음(2026-08-27 수정).
    if(w.length>suf.length&&w.endsWith(suf))return w.slice(0,-suf.length);
  }
  return w;
}
function _weekKwTokenize(text){
  const words=(text||'')
    .replace(/[.,!?~^;:()\[\]"'‘’“”·…]/g,' ')
    .split(/\s+/)
    .map(w=>w.trim())
    .filter(w=>w.length>=2);
  return words.map(w=>{
    if(WEEK_KW_CONJUNCTIONS.has(w))return null; // 접속부사는 조사 제거 전에 원본 형태로 먼저 제외
    if(WEEK_KW_STOPWORDS.has(w))return null; // 불용어도 조사 제거 전에 원본 형태로 먼저 확인 — "어느정도"가 "도"만 떼여 "어느정"으로 남는 문제 방지
    if(WEEK_KW_VERB_ENDING_RE.test(w))return null; // 동사/형용사류 어미로 끝나면 명사 후보 아님
    if(WEEK_KW_VERB_COMBOS.has(w))return null; // "먹고/자고/보고"처럼 흔한 동사 어간+어미 조합 원본 형태로 매칭되는 경우
    const stripped=_weekKwStripParticle(w);
    if(WEEK_KW_VERB_COMBOS.has(stripped))return null; // 조사까지 떼고 나서야 동사 조합과 일치하는 경우(드묾) 대비
    return stripped;
  }).filter(Boolean)
    .filter(w=>w.length>=2)
    .filter(w=>!WEEK_KW_STOPWORDS.has(w))
    .filter(w=>!/^\d+$/.test(w));
}
// 워드클라우드처럼 불규칙하게 배치 — 완전 랜덤 좌표는 겹침 검사가 비싸고 실패율이 높아,
// 카드 영역을 단어 개수만큼 칸으로 나눈 뒤 각 칸 안에서만 무작위 오프셋을 주는 방식(카드형 배치가 자연스럽게 불규칙해 보임).
// 빈도 1위일수록 글자 크기를 크게, 팔레트 색상을 순환시켜 단조롭지 않게 함.
const WEEK_KW_COLORS=['var(--pal-pink-text)','var(--pal-orange-text)','var(--pal-mint-text)','var(--pal-sky-text)','var(--pal-lavender-text)'];
function renderWeekKeywords(memoRows,onelineRows){
  const el=document.getElementById('week-keywords');
  if(!el)return;
  // 쿼리 자체가 이미 "오늘 제외 롤링 2주"(kwStartDk~kwEndDk) 범위라 여기서 추가 필터링 불필요.
  const memoText=(memoRows||[]).map(m=>m.text||'').join(' ');
  // 하루한줄도 메모와 같은 역할로 집계에 포함 — goal_notes는 note_key당 lines 배열 구조라 첫 줄만 사용(renderWeekOneline과 동일 파싱).
  const onelineText=(onelineRows||[]).map(r=>Array.isArray(r.lines)?(r.lines[0]||''):(r.lines||'')).join(' ');
  const allText=(memoText+' '+onelineText).trim();
  if(!allText){el.innerHTML='<div class="empty-msg">최근 메모가 없어요</div>';return;}
  const tokens=_weekKwTokenize(allText);
  const freq={};
  tokens.forEach(t=>{freq[t]=(freq[t]||0)+1;});
  const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!top.length){el.innerHTML='<div class="empty-msg">추출된 키워드가 없어요</div>';return;}

  const maxCnt=top[0][1],minCnt=top[top.length-1][1];
  const n=top.length;
  // 카드 영역(퍼센트 기준)을 단어 개수에 맞는 대략적인 격자로 나눠 각 칸 중심 근처에 배치 — 5개 기준 2행 배치가 자연스러움.
  const gridCols=n<=2?n:Math.ceil(n/2);
  const gridRows=n<=2?1:2;
  const cellW=100/gridCols,cellH=100/gridRows;
  const wordsHtml=top.map(([w,c],i)=>{
    // 빈도 비례 폰트 크기(가장 잦은 단어가 가장 크게) — 1~5개뿐이라 빈도差가 작아도 시각적으로 티나게 범위를 넉넉히 잡음.
    const ratio=maxCnt===minCnt?1:(c-minCnt)/(maxCnt-minCnt);
    const fontSize=18+ratio*16; // 18px~34px
    const col=i%gridCols,row=Math.floor(i/gridCols);
    // 칸 중심 기준 무작위 오프셋(카드형 배치가 자연스럽게 불규칙해 보이도록). 카드 가장자리에서 텍스트가
    // 잘리지 않도록 전체 범위를 12%~88%로 한 번 더 clamp — 특히 폰트가 큰 1위 단어가 가장자리에 걸리는 걸 방지.
    const rawCx=col*cellW+cellW/2+(Math.random()-0.5)*cellW*0.5;
    const rawCy=row*cellH+cellH/2+(Math.random()-0.5)*cellH*0.45;
    const cx=Math.min(88,Math.max(12,rawCx));
    const cy=Math.min(85,Math.max(15,rawCy));
    const rotate=(Math.random()-0.5)*24; // -12deg~12deg
    const color=WEEK_KW_COLORS[i%WEEK_KW_COLORS.length];
    return `<div class="week-kw-word" style="left:${cx}%;top:${cy}%;font-size:${fontSize}px;color:${color};transform:translate(-50%,-50%) rotate(${rotate}deg);">${escapeHtml(w)}<span class="week-kw-cnt">${c}</span></div>`;
  }).join('');
  el.innerHTML=`<div class="week-kw-cloud">${wordsHtml}</div>`;
}

// 이번 주 독서 — 이이코토 본앱 rd-top-*/rd-progress-* 스타일 그대로 이식(2026-08-26).
// 현재 읽고 있는 책의 표지+진행률 바(무지개 구슬 포함)와, reading_daily_log 기준 연속 독서일(스트릭)을 함께 보여줌.
// 스트릭 계산은 본앱 getReadingStreak()과 동일한 로직(어제부터 거슬러 올라가며 기록이 끊기는 지점까지 카운트)을
// reading_daily_log(서버 기준 실제 독서 로그) 데이터로 재구현.
function _readingStreakOf(logRows){
  const dates=new Set((logRows||[]).map(r=>r.date_key));
  let streak=0;
  const cur=new Date();
  for(let i=0;i<dates.size+1;i++){
    const dk=dateKey(cur);
    if(dates.has(dk)){streak++;cur.setDate(cur.getDate()-1);}
    else break;
  }
  return streak;
}
function renderWeekReading(contents,book,streakLogRows,startDk,endDk){
  const el=document.getElementById('week-reading');
  if(!el)return;
  // 이번 주 완독한 책 — contents(content_cat='book')에서 done/stopped이고 종료일이 이번 주 범위인 것.
  // 2026-08-29 통합 이후 book(진행중 1권)도 이 contents 배열에서 파생되므로 완독작 판별도 동일 배열로 처리.
  const doneThisWeek=(contents||[]).find(c=>c.content_cat==='book'&&(c.status==='done'||c.status==='stopped')&&c.end_date&&c.end_date>=startDk&&c.end_date<=endDk);

  if(!book&&!doneThisWeek){
    el.innerHTML=`<div class="week-reading-inner"><div class="week-reading-title" style="color:var(--tm);">지금 읽는 책이 없어요</div></div>`;
    return;
  }

  let pct=0;
  if(book){
    // 2026-08-29 통합: book은 이제 contents 로우(unit_label/current_unit/total_unit)
    if(book.unit_label==='percent')pct=book.current_unit||0;
    else if(book.total_unit)pct=Math.min(100,Math.round((book.current_unit/book.total_unit)*100));
  }
  const streak=_readingStreakOf(streakLogRows);
  const streakText=streak>0?`연속 <b>${streak}일째</b> 읽고 있어요`:'오늘부터 다시 시작해볼까요?';

  const bookCoverHtml=(b,badge)=>{
    const cover=b.poster
      ?`<img class="week-reading-cover" src="${b.poster}" alt="">`
      :`<div class="week-reading-cover-empty"></div>`;
    return `<div class="week-reading-cover-wrap">${cover}${badge?`<span class="week-reading-badge${badge==='완독'?' done':''}">${badge}</span>`:''}</div>`;
  };

  // 진행중+완독 두 권이 함께 있는 주 — 표지 두 개를 나란히, 완독 쪽엔 배지만(그래프 없음). 진행률 그래프는 진행중 책 기준으로만 아래에 표시.
  if(book&&doneThisWeek){
    el.innerHTML=`<div class="week-reading-inner">
      <div class="week-reading-main week-reading-main-dual">
        ${bookCoverHtml(doneThisWeek,'완독')}
        ${bookCoverHtml(book,'진행중')}
        <div class="week-reading-info">
          <div class="week-reading-title">${escapeHtml(book.title||'')}</div>
          <div class="week-reading-author">${escapeHtml(book.author||'')}</div>
        </div>
        <div class="week-reading-pct-num">${pct}%</div>
      </div>
      <div class="week-reading-progress-bar">
        <div class="week-reading-progress-track"><div class="week-reading-progress-fill" style="width:${pct}%;"></div></div>
        <div class="week-reading-progress-bead" style="left:${pct}%;"></div>
      </div>
      <div class="week-reading-streak">${streakText}</div>
    </div>`;
    return;
  }

  // 완독 직후라 진행중인 책이 아직 없는 경우 — 완독 책만 배지로 보여주고, 그래프 대신 축하 문구로 대체.
  if(!book&&doneThisWeek){
    el.innerHTML=`<div class="week-reading-inner">
      <div class="week-reading-main">
        ${bookCoverHtml(doneThisWeek,'완독')}
        <div class="week-reading-info">
          <div class="week-reading-title">${escapeHtml(doneThisWeek.title||'')}</div>
          <div class="week-reading-author">${escapeHtml(doneThisWeek.author||'')}</div>
        </div>
      </div>
      <div class="week-reading-streak">이번 주 한 권 완독했어요 🎉</div>
    </div>`;
    return;
  }

  // 진행중인 책만 있는 일반적인 경우
  el.innerHTML=`<div class="week-reading-inner">
    <div class="week-reading-main">
      ${bookCoverHtml(book,null)}
      <div class="week-reading-info">
        <div class="week-reading-title">${escapeHtml(book.title||'')}</div>
        <div class="week-reading-author">${escapeHtml(book.author||'')}</div>
      </div>
      <div class="week-reading-pct-num">${pct}%</div>
    </div>
    <div class="week-reading-progress-bar">
      <div class="week-reading-progress-track"><div class="week-reading-progress-fill" style="width:${pct}%;"></div></div>
      <div class="week-reading-progress-bead" style="left:${pct}%;"></div>
    </div>
    <div class="week-reading-streak">${streakText}</div>
  </div>`;
}

// 이번 주 독서 활동(탭 전환용) — "지금 읽는 책 1권" 스냅샷과 달리, 이번 주에 실제 기록이 있었던
// 모든 책(병렬 독서 포함)의 주간 진행량을 권별로 보여주고, 완독 권수·활동일수를 지난주와 비교.
// 페이지 단위 책은 total_pages가 있어야 %로 환산 가능 — 없는 책(초기 등록 누락분)은 "기록됨"만 표시하고
// 완독/활동일 집계에는 포함하되, 진행률 델타 계산에서만 제외(2026-08-28).
function _wraStatsOf(logRows,booksByCid){
  // 책별로 이번 범위 내 첫/마지막 기록의 percent_after를 비교해 진행폭 산출.
  const byBook={};
  (logRows||[]).forEach(r=>{
    if(!byBook[r.book_cid])byBook[r.book_cid]=[];
    byBook[r.book_cid].push(r);
  });
  const activeDays=new Set((logRows||[]).map(r=>r.date_key)).size;
  const totalSeconds=(logRows||[]).reduce((s,r)=>s+(r.seconds||0),0);
  const rows=Object.keys(byBook).map(cid=>{
    const logs=byBook[cid].sort((a,b)=>a.date_key<b.date_key?-1:1);
    const book=booksByCid[cid]||{};
    let deltaPct=null;
    // 2026-08-29 통합: book은 이제 contents 로우(unit_label/total_unit)
    if(book.unit_label==='percent'){
      // amount_read를 그날의 증가폭으로 기록해뒀다는 전제 하에 합산(로그 1건이든 여러 건이든 동일 로직).
      deltaPct=logs.reduce((s,r)=>s+(r.amount_read||0),0);
    }else if(book.unit_label==='pages'&&book.total_unit){
      const pagesRead=logs.reduce((s,r)=>s+(r.amount_read||0),0);
      deltaPct=Math.round((pagesRead/book.total_unit)*100);
    }
    return {cid,title:book.title||'',deltaPct,noTotal:book.unit_label==='pages'&&!book.total_unit};
  });
  return {rows,activeDays,totalSeconds};
}
function toggleWeekReadingView(){
  const a=document.getElementById('week-reading'),b=document.getElementById('week-reading-activity'),txt=document.getElementById('week-reading-title-text');
  if(!a||!b)return;
  const showActivity=a.style.display!=='none';
  a.style.display=showActivity?'none':'';
  b.style.display=showActivity?'':'none';
  if(txt)txt.textContent=showActivity?'이번 주 활동':'이번 주 독서';
}
function renderWeekReadingActivity(logsThis,logsLast,booksAll,contents,startDk,endDk,lastStartDk,lastEndDk){
  const el=document.getElementById('week-reading-activity');
  if(!el)return;
  const booksByCid={};
  // 2026-08-29 통합: book은 이제 contents 로우이므로 client_id가 곧 cid
  (booksAll||[]).forEach(b=>{booksByCid[b.client_id]=b;});

  const {rows,activeDays,totalSeconds}=_wraStatsOf(logsThis,booksByCid);
  const {rows:rowsLast,activeDays:activeDaysLast,totalSeconds:totalSecondsLast}=_wraStatsOf(logsLast,booksByCid);

  const doneThis=(contents||[]).filter(c=>c.content_cat==='book'&&(c.status==='done'||c.status==='stopped')&&c.end_date&&c.end_date>=startDk&&c.end_date<=endDk);
  // 2026-08-29 통합 이후 book_cid(reading_daily_log)와 contents.client_id가 동일한 ID 체계이므로
  // cid로 직접 매칭 가능 — 예전 title 매칭 우회(동명이서 오매칭 리스크 있었음)를 제거.
  const doneCidSet=new Set(doneThis.map(c=>c.client_id));

  const sumPct=(rs)=>rs.reduce((s,r)=>s+(r.noTotal?0:(r.deltaPct||0)),0);
  const totalThis=sumPct(rows),totalLast=sumPct(rowsLast);

  const rowsHtml=rows.length?rows.map(r=>{
    const isDone=doneCidSet.has(r.cid);
    const badge=isDone?`<span class="wra-row-badge">완독</span>`:'';
    if(r.noTotal)return `<div class="wra-row"><span class="wra-row-title">${escapeHtml(r.title)}</span>${badge}<span class="wra-row-flag">기록됨</span></div>`;
    return `<div class="wra-row"><span class="wra-row-title">${escapeHtml(r.title)}</span>${badge}<span class="wra-row-delta">+${r.deltaPct}%</span></div>`;
  }).join(''):'';
  // 진행 로그가 아예 없이 완독만 된 책(예: 지난주 전에 다 읽고 이번 주에 상태만 done으로 바뀐 경우) 별도 표기
  const doneOnlyHtml=doneThis.filter(c=>!rows.some(r=>r.cid===c.client_id)).map(c=>`<div class="wra-row"><span class="wra-row-title">${escapeHtml(c.title||'')}</span><span class="wra-row-badge">완독</span></div>`).join('');
  const bodyHtml=(rowsHtml+doneOnlyHtml)||`<div class="wra-empty">이번 주엔 독서 기록이 없어요</div>`;

  const deltaDays=activeDays-activeDaysLast;
  const deltaPctTotal=totalThis-totalLast;
  const deltaSeconds=totalSeconds-totalSecondsLast;
  const deltaHtml=(d,suffix='')=>d>0?`<span class="wra-stat-delta up">+${d}${suffix}</span>`:d<0?`<span class="wra-stat-delta down">${d}${suffix}</span>`:`<span class="wra-stat-delta flat">-</span>`;
  const fmtHM=(sec)=>{const h=Math.floor(sec/3600),m=Math.round((sec%3600)/60);return h>0?`${h}시간${m>0?' '+m+'분':''}`:`${m}분`;};
  const deltaMinHtml=(dSec)=>{const dm=Math.round(dSec/60);return deltaHtml(dm,'분');};

  el.innerHTML=`<div class="week-reading-inner">
    <div class="wra-list">${bodyHtml}</div>
    <div class="wra-summary">
      <div class="wra-stat"><div class="wra-stat-num">${totalThis}%</div><div class="wra-stat-lbl">진행량</div>${deltaHtml(deltaPctTotal,'%')}</div>
      <div class="wra-stat"><div class="wra-stat-num">${fmtHM(totalSeconds)}</div><div class="wra-stat-lbl">독서시간</div>${deltaMinHtml(deltaSeconds)}</div>
      <div class="wra-stat"><div class="wra-stat-num">${activeDays}</div><div class="wra-stat-lbl">활동일</div>${deltaHtml(deltaDays)}</div>
    </div>
  </div>`;
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
  const prevMk=monthKeyOf(new Date(y,mo-1,1));
  _wcalDate=new Date(_monthCalDate);

  // 감상달력/콘텐츠모아보기/콘텐츠타임라인 세 배너가 공통으로 쓰는 당월·전월 contents,
  // 습관모아보기/월통계바가 공통으로 쓰는 습관목록+체크기록을 각각 한 번만 조회해서 공유
  // — 예전엔 각 함수가 자기 몫만큼 동일한 쿼리를 따로 날려 중복 요청했음.
  const [goalRows,curContents,prevContents,habitsList,habitChecksMonth]=await Promise.all([
    supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('mgoal:'+mk)}`),
    supaFetch(`contents?month_key=eq.${mk}`),
    supaFetch(`contents?month_key=eq.${prevMk}`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=gte.${mk}-01&date_key=lte.${mk}-31`)
  ]);
  const contentsData={cur:curContents||[],prev:prevContents||[]};
  const habitsData={habits:habitsList||[],checks:habitChecksMonth||[]};
  renderMonthGoals(goalRows&&goalRows[0]);

  // 서로 의존관계 없는 배너 렌더는 병렬로 처리
  await Promise.all([
    renderMonthTimetable(y,mo,contentsData),
    renderMonthHabits(y,mo,habitsData),
    renderMonthStatBar(y,mo,habitsData),
    renderMonthQuotes(y,mo),
    renderMonthContentGrid(y,mo,contentsData),
    renderChaeumLogTablet(),
    renderWatchCal(contentsData)
  ]);
  // 감상 달력(wcal-card) 렌더가 끝나 실제 높이가 확정된 직후 한 번 더 동기화 —
  // ResizeObserver도 이후 변화를 계속 잡아주지만, 최초 렌더 프레임에서 한 박자 밀리는 걸 방지.
  syncCgridHeightToWcal();
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
async function renderMonthContentGrid(y,mo,contentsData){
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
  const curRows=contentsData?contentsData.cur:await supaFetch(`contents?month_key=eq.${mk}`);
  const prevRows=contentsData?contentsData.prev:await supaFetch(`contents?month_key=eq.${prevMk}`);
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
function _cgridPeriodLabel(c){
  const s=c.start_date,e=c.end_date;
  if(s&&e&&s!==e)return `${s.slice(5).replace('-','.')}~${e.slice(5).replace('-','.')}`;
  return (e||s||'').slice(5).replace('-','.');
}
// 본앱 _cmrDetailBodyHtml과 동일한 구조 — 진행률 바, 완결 총평(Comment), 감상 메모(Timeline)를 함께 표시.
// (본앱의 "시청 시작" 스톱워치 버튼은 태블릿 상세뷰 성격상 제외.)
function _cgridDetailHtml(c){
  const period=_cgridPeriodLabel(c);
  const stars=c.stars>0?`<span class="cgrid-detail-stars">${renderStarDisplayHtml(c.stars)}</span>`:'';
  const isMusic=c.content_cat==='music';
  // 재생 — 음악만, music_url이 등록돼 있을 때만. 본앱 _cmrDetailBodyHtml의 musicPlayBtnHtml과 동일 로직/스타일.
  const musicPlayBtnHtml=isMusic&&c.music_url?`<span class="pl-item-play music-play-btn" style="background:rgba(160,105,180,.18);border:1px solid rgba(160,105,180,.45);" onclick="event.stopPropagation();window.location.href='${c.music_url.replace(/'/g,"\\'")}'"><i class="ti ti-player-play-filled" style="color:rgba(160,105,180,1);" aria-hidden="true"></i></span>`:'';
  // 음악 상세 헤더는 좌측 가수명 / 우측 날짜+재생버튼 구조(요청 반영, 2026-08-27). 그 외 카테고리는 기존 날짜+별점 구조 유지.
  const artistDetailHtml=isMusic&&c.author?`<span class="cgrid-detail-artist">${escapeHtml(c.author)}</span>`:'';
  const dateWithPlayHtml=`<span class="cgrid-detail-date-play">${period?`<span class="cgrid-detail-row-date"><i class="ti ti-calendar" style="font-size:12px;" aria-hidden="true"></i>${period}</span>`:''}${musicPlayBtnHtml}</span>`;
  const topRow=isMusic
    ?((artistDetailHtml||period||musicPlayBtnHtml)?`<div class="cgrid-detail-row">${artistDetailHtml||'<span></span>'}${dateWithPlayHtml}</div>`:'')
    :((period||stars)?`<div class="cgrid-detail-row"><span class="cgrid-detail-row-date">${period?`<i class="ti ti-calendar" style="font-size:12px;" aria-hidden="true"></i>${period}`:''}</span>${stars}</div>`:'');
  // 음악 — 앨범명/발매연도, 가수명 아래 별도 줄로 표시.
  const musicMetaHtml=isMusic&&(c.album||c.release_year)?`<div class="cgrid-detail-music-meta">${escapeHtml(c.album||'')}${c.album&&c.release_year?' · ':''}${c.release_year||''}</div>`:'';
  // 진행률 바 — 드라마/영화 모두 진행중(watching)일 때만 표시. 완결 시엔 회차/러닝타임을 끝까지
  // 갱신했다는 보장이 없어(특히 영화는 애초에 회차 개념이 없어 current_unit이 항상 0으로 남음) 완결
  // 콘텐츠에 0%로 잘못 노출되는 문제가 있었음 — 독서와 동일 기준으로 통일(2026-08-27).
  let progressHtml='';
  if((c.content_cat==='drama'||c.content_cat==='movie')&&c.status==='watching'&&c.total_unit){
    const cur=Math.min(c.current_unit||0,c.total_unit);
    const pct=Math.round((cur/c.total_unit)*100);
    const unitLabel=c.content_cat==='drama'?'화':'분';
    progressHtml=`<div class="cgrid-progress-bar">
      <div class="cgrid-progress-track"><div class="cgrid-progress-fill" style="width:${pct}%;"></div></div>
      <div class="cgrid-progress-label">${cur}/${c.total_unit}${unitLabel}</div>
    </div>`;
  }else if(c.content_cat==='book'&&c.status==='watching'){
    // 2026-08-29 통합: 책 진행률도 이제 c 자체(total_unit/current_unit/unit_label)에 있음 — drama/movie와 동일 패턴.
    if(c.unit_label==='percent'&&c.current_unit!=null){
      const pct=Math.round(Math.min(c.current_unit||0,100));
      progressHtml=`<div class="cgrid-progress-bar">
        <div class="cgrid-progress-track"><div class="cgrid-progress-fill" style="width:${pct}%;"></div></div>
        <div class="cgrid-progress-label">${pct}%</div>
      </div>`;
    }else if(c.unit_label==='pages'&&c.total_unit){
      const cur=Math.min(c.current_unit||0,c.total_unit);
      const pct=Math.round((cur/c.total_unit)*100);
      progressHtml=`<div class="cgrid-progress-bar">
        <div class="cgrid-progress-track"><div class="cgrid-progress-fill" style="width:${pct}%;"></div></div>
        <div class="cgrid-progress-label">${cur}/${c.total_unit}쪽</div>
      </div>`;
    }
  }
  const finalHtml=c.review?`<div class="cgrid-detail-final"><span class="cgrid-detail-final-lbl">Comment :</span> ${escapeHtml(c.review)}</div>`:'';
  // 2026-08-29 통합: 감상 메모도 이제 c.notes[]에 직접 있음 — 별도 goal_notes 조회/cid 매칭 불필요.
  const notes=(c.notes||[]).slice().sort((a,b)=>(b.dk||'').localeCompare(a.dk||''));
  const notesHtml=notes.length?`<div class="cgrid-detail-notes${c.review?' with-final':''}">
    <div class="cgrid-detail-notes-lbl">Timeline</div>
    <div class="cgrid-detail-notes-tl">
      ${notes.map(n=>{
        const dispDate=n.dk?(parseInt(n.dk.slice(5,7),10)+'/'+parseInt(n.dk.slice(8,10),10)):'';
        return `<div class="cgrid-detail-note-item"><span class="cgrid-detail-note-date">${dispDate}</span><span>${escapeHtml(n.text||'')}</span></div>`;
      }).join('')}
    </div>
  </div>`:'';
  return `<div class="cgrid-detail">${topRow}${musicMetaHtml}${progressHtml}${finalHtml}${notesHtml}</div>`;
}
function _cgridItemHtml(c){
  const meta=CAT_ICON_META[c.content_cat]||{icon:'ti-stack-2',bg:'rgba(150,150,150,1)'};
  const thumb=c.poster
    ?`<img class="cgrid-thumb" src="${c.poster}" />`
    :`<div class="cgrid-thumb-fallback" style="background:${meta.bg};"><i class="ti ${meta.icon}" aria-hidden="true"></i></div>`;
  const statusDot=c.status==='watching'?'<span class="status-badge dot">진행중</span>':'';
  const icons=[];
  if(c.stars>0)icons.push('<i class="ti ti-star" aria-hidden="true"></i>');
  if(c.review||(c.notes&&c.notes.length))icons.push('<i class="ti ti-message-circle" aria-hidden="true"></i>');
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
async function renderMonthTimetable(y,mo,contentsData){
  const el=document.getElementById('month-tt');
  const mk=`${y}-${pad(mo+1)}`;
  const isSameMonth=mk===monthKeyOf(new Date());
  const prevMk=monthKeyOf(new Date(y,mo-1,1));
  const contents=contentsData?contentsData.cur:(await supaFetch(`contents?month_key=eq.${mk}`))||[];
  const prevContents=contentsData?contentsData.prev:(await supaFetch(`contents?month_key=eq.${prevMk}`))||[];
  const todayDay=new Date().getDate();
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
      const catLabel=tIdx===0?`<span class="tt-cat-badge" style="background:${meta.bg};"><i class="ti ${meta.icon}" style="color:${meta.iconColor};" aria-hidden="true"></i></span><span class="tt-cat-label-txt">${meta.label}</span>`:'';
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
async function renderMonthHabits(y,mo,habitsData){
  const el=document.getElementById('month-habits');
  const mk=`${y}-${pad(mo+1)}`;
  const daysInMonth=new Date(y,mo+1,0).getDate();
  const habits=habitsData?habitsData.habits:(await supaFetch(`habits?order=sort_order.asc`))||[];
  const checks=habitsData?habitsData.checks:(await supaFetch(`habit_checks?date_key=gte.${mk}-01&date_key=lte.${mk}-${pad(daysInMonth)}`))||[];
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
async function renderMonthStatBar(y,mo,habitsData){
  const mk=`${y}-${pad(mo+1)}`;
  const startDk=`${mk}-01`,endDk=`${mk}-31`;
  const [memos,todos,sleepRows,contents]=await Promise.all([
    supaFetch(`memos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=id`),
    supaFetch(`todos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=done`),
    supaFetch(`sleep?date_key=gte.${startDk}&date_key=lte.${endDk}&select=sleep_time,wake_time`),
    supaFetch(`contents?or=(status.in.(done,stopped),content_cat.eq.music)&month_key=eq.${mk}`)
  ]);
  const habits=habitsData?habitsData.habits:(await supaFetch(`habits?order=sort_order.asc`))||[];
  const checks=habitsData?habitsData.checks:(await supaFetch(`habit_checks?date_key=gte.${startDk}&date_key=lte.${endDk}`))||[];
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

// 이 달의 감상 시간 계산 — 드라마/독서는 리듬(enjoy) 기록만 합산, 영화는 작품 단위로 "이번 달 리듬 기록이
// 하나라도 있으면 실측 합산, 전혀 없으면(등록만 하고 감상 타이머를 안 쓴 경우) 완결 러닝타임(total_unit)을
// 그 한 번만 대체 가산" — 오늘탭(renderTodayReading)의 fallback 판단 기준을 월 단위로 그대로 확장한 것.
// 음악은 애초에 시간 데이터가 없어 집계에서 제외.
// 월간리포트 "이 달의 콘텐츠"(renderMrpContents)가 쓰는 계산 헬퍼.
function _calcWatchTimeByCat(rblocks,contents){
  // enjoy 블록을 텍스트 접두어로 드라마/독서 재분류 후 작품별로 합산(하루에 나눠봐도 합쳐짐).
  // 영화는 리듬 기록을 참조하지 않고 항상 러닝타임(total_unit) 고정 집계 — 아래 movie 섹션 참고.
  const durByTitle={drama:{},book:{}};
  (rblocks||[]).forEach(b=>{
    if(b.cat!=='enjoy'||!b.text||!b.start_time||!b.end_time)return;
    let cat=null,title=null;
    if(b.text.startsWith('드라마 - ')){cat='drama';title=b.text.slice(6);}
    else if(b.text.startsWith('독서 - ')){cat='book';title=b.text.slice(5);}
    else return;
    const s=_paceParseHM(b.start_time),e=_paceParseHM(b.end_time);
    if(isNaN(s)||isNaN(e))return;
    let mins=e-s;if(mins<0)mins+=1440;
    if(mins<=0)return;
    durByTitle[cat][title]=(durByTitle[cat][title]||0)+mins;
  });

  let dramaMin=0;
  Object.values(durByTitle.drama).forEach(m=>{dramaMin+=m;});
  let bookMin=0;
  Object.values(durByTitle.book).forEach(m=>{bookMin+=m;});

  // 영화 — 리듬 기록 유무로 실측/추정을 나누던 방식은 월 필터가 조금만 어긋나도 다른 달 러닝타임이
  // 새어 들어가는 버그를 반복적으로 만들어(2026-08-27), 완결된 영화는 항상 total_unit(러닝타임)만
  // 더하는 방식으로 단순화. 완결편수(_mrpContentsInRange)와 동일하게 done 상태만 집계 대상으로 삼음.
  let movieMin=0;
  const movieTitlesSeen=new Set();
  (contents||[]).filter(c=>c.content_cat==='movie'&&c.title&&c.status==='done'&&c.total_unit).forEach(c=>{
    if(movieTitlesSeen.has(c.title))return; // 같은 제목 중복 등록 방지(재감상 등은 현재 구조상 구분 안 함)
    movieTitlesSeen.add(c.title);
    movieMin+=c.total_unit;
  });

  return {
    drama:dramaMin,movie:movieMin,book:bookMin,
    total:dramaMin+movieMin+bookMin
  };
}

// 이번 달 수집한 문장(reading_quotes) — created 타임스탬프 기준, 책 단위로 그룹핑.
// book_cid는 2026-08-29 본앱 통합 이후 contents.client_id와 동일한 ID 체계이므로 contents에서 직접 조회.
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
    const books=await supaFetch(`contents?client_id=in.(${cidFilter})&content_cat=eq.book&select=client_id,title,author,poster`);
    (books||[]).forEach(b=>{bookMap[b.client_id]={cid:b.client_id,title:b.title,author:b.author,poster:b.poster};});
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
async function wcalMonthShift(delta){
  _wcalDate.setMonth(_wcalDate.getMonth()+delta);
  await renderWatchCal();
  syncCgridHeightToWcal(); // 주차 수(4~6주)가 달마다 달라 감상 달력 높이가 바뀌므로 즉시 재동기화
}
function wcalSetFilter(cat){
  _wcalFilter=cat;
  renderWatchCalGrid();
  renderWcalFilterChips();
}
// 드라마/영화/책은 rhythm_blocks(cat='enjoy', text="드라마 - 제목" 등)의 date_key가 감상일.
// 음악은 리듬 기록이 없어 contents(content_cat='music')의 start_date(=등록일)를 그 날의 기록으로 사용.
async function renderWatchCal(contentsData){
  const y=_wcalDate.getFullYear(),m=_wcalDate.getMonth();
  const mk=`${y}-${pad(m+1)}`;
  const prevMk=monthKeyOf(new Date(y,m-1,1));
  document.getElementById('wcal-month-label').textContent=`${y}년 ${pad(m+1)}월`;
  _wcalByDate={};
  const push=(dk,item)=>{if(!_wcalByDate[dk])_wcalByDate[dk]=[];_wcalByDate[dk].push(item);};

  // loadMonthTab에서 이미 조회한 당월/전월 contents가 있으면 재사용, 없으면(월 이동 등 단독 호출) 직접 조회
  const [rblocks,curContents,prevContents,manualRows]=await Promise.all([
    supaFetch(`rhythm_blocks?date_key=gte.${mk}-01&date_key=lte.${mk}-31`),
    contentsData?Promise.resolve(contentsData.cur):supaFetch(`contents?month_key=eq.${mk}`),
    contentsData?Promise.resolve(contentsData.prev):supaFetch(`contents?month_key=eq.${prevMk}`),
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

  const [monthlyRows,goalRows,todos,memosRows,sleepRows,habits,habitChecksAll,rblocks,prevRblocks,contents,wcRowsList,milestoneRows,prevWcRowsList,prevTodos,prevSleepRows,prevHabitChecksAll,trajectoryRows,sleepReportCacheRows,weeklySummaryRowsList,weeklyMemoRowsList,prevMemosRows]=await Promise.all([
    supaFetch(`ai_cache?cache_key=eq.monthly_report_${mk}&select=content`),
    supaFetch(`goal_notes?note_key=eq.${encodeURIComponent('mgoal:'+mk)}`),
    supaFetch(`todos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=done,date_key`),
    supaFetch(`memos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=id`),
    supaFetch(`sleep?date_key=gte.${startDk}&date_key=lte.${endDk}&select=score,sleep_time,wake_time,date_key`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    supaFetch(`rhythm_blocks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    supaFetch(`rhythm_blocks?date_key=gte.${prevStartDk}&date_key=lte.${prevEndDk}`),
    // 이달의 콘텐츠(renderMrpContents) 전용 데이터 — done/stopped/music 전체(최근 200개)를 한 번만 가져와
    // 이번 달·전월 양쪽에서 공유. month_key(등록월)로 나눠 가져오면 진행중이다가 그 달에 완결된(등록은
    // 이전 달) 콘텐츠가 누락돼 완결편수가 본앱(종료월 기준 집계) 기준과 어긋남(2026-08-27 수정) —
    // 이제 _mrpContentsInRange가 이 동일 원본을 이번 달/전월 각자의 startDk~endDk로 나눠 필터링.
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
  renderMrpContents(contents||[],startDk,endDk,rblocks||[],contents||[],prevRblocks||[],prevStartDk,prevEndDk);
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
// 세로(모바일) 화면 전용 — "이 달 한눈에" 카드를 절반 정도만 보이게 접었다가 펼치는 토글.
// 가로에서는 CSS가 이 버튼과 접힘 상태를 모두 무시하도록 되어 있어 클릭돼도 시각적 영향이 없음.
function toggleMrpHeroFold(){
  const slot=document.getElementById('mrp-hero-slot');
  const btn=document.getElementById('mrp-hero-fold-btn');
  if(!slot)return;
  const collapsed=slot.classList.toggle('folded');
  if(btn)btn.classList.toggle('open',!collapsed);
}
function renderMrpHero(row){
  const el=document.getElementById('mrp-body');
  // 최초 렌더 시 전체 골격을 한 번에 잡고, 이후 각 render 함수가 자기 섹션의 innerHTML만 채움
  if(!document.getElementById('mrp-hero-slot')){
    el.innerHTML=`
      <div class="mrp-hero folded" id="mrp-hero-slot">
        <div class="mrp-hero-eyebrow"><i class="ti ti-sparkles" aria-hidden="true"></i>이 달 한눈에</div>
        <i class="ti ti-chevron-down mrp-hero-fold-btn" id="mrp-hero-fold-btn" onclick="toggleMrpHeroFold()" title="펼치기/접기" aria-hidden="true"></i>
        <div id="mrp-hero-body"></div>
      </div>
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
        <div class="mrp-card mrp-contents-card">
          <div class="mrp-card-title-row mrp-contents-title-row" id="mrp-contents-title-row" onclick="toggleMrpContentsView()">
            <div class="mrp-card-title"><i class="ti ti-book" id="mrp-contents-title-icon" style="color:rgba(178,60,105,0.75);" aria-hidden="true"></i><span id="mrp-contents-title-text">이 달의 콘텐츠</span></div>
            <span class="mrp-card-title-total" id="mrp-contents-total"></span>
          </div>
          <div id="mrp-contents"></div>
          <div id="mrp-contents-cmp" style="display:none;"></div>
        </div>
      </div>
      <div class="mrp-links-wrap"><div id="mrp-report-links"></div></div>
    `;
  }
  const heroEl=document.getElementById('mrp-hero-body');
  const now=new Date();
  const lastDateOfThisMonth=new Date(_mrpDate.getFullYear(),_mrpDate.getMonth()+1,0).getDate();
  const isLastDayEvening=now.getDate()===lastDateOfThisMonth&&_mrpDate.getMonth()===now.getMonth()&&_mrpDate.getFullYear()===now.getFullYear()&&(now.getHours()>=19||now.getHours()<6);
  const isThisMonth=(_mrpDate.getFullYear()===now.getFullYear()&&_mrpDate.getMonth()===now.getMonth());
  const isOngoingMonth=isThisMonth&&!isLastDayEvening;
  if(isOngoingMonth){
    heroEl.innerHTML=`<div class="mrp-hero-comment" style="opacity:.6;">이 달이 끝나면 정리해드려요</div>`;
    return;
  }
  if(!row||!row.content){
    heroEl.innerHTML=`<div class="mrp-hero-comment" style="opacity:.6;">이 달의 종합 리포트가 아직 발행되지 않았어요</div>`;
    return;
  }
  try{
    const report=JSON.parse(row.content);
    heroEl.innerHTML=`<div class="mrp-hero-comment">${escapeHtml(report.comment||'')}</div>
      ${report.keywords&&report.keywords.length?`<div class="mr-tag-cloud">${report.keywords.map(k=>`<span class="mr-tag">${escapeHtml(k)}</span>`).join('')}</div>`:''}`;
  }catch(e){
    heroEl.innerHTML=`<div class="mrp-hero-comment">${row.content}</div>`;
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

// 이 달의 콘텐츠 — 전월대비 뷰(A안). 제목 옆에 이미 이번 달 총 시간이 노출되므로 여기선 총량 증감만 짧게,
// 그 아래 ①카테고리별 시간 미니바+증감 ②완결 편수 비교. 시간·편수 모두 동일 기준(_mrpContentsInRange,
// end_date 기준 월 범위)으로 걸러진 inRange/inRangePrev를 그대로 재사용 — 영화는 러닝타임 고정 집계.
// 음악은 시청시간 데이터가 없어 시간 비교에서는 제외하고, 편수 비교에는 포함.
function renderMrpContentsCmp(t,prevRblocks,inRangePrev,inRange){
  const el=document.getElementById('mrp-contents-cmp');
  if(!el)return;
  const prevT=_calcWatchTimeByCat(prevRblocks||[],inRangePrev||[]);
  if(prevT.total<=0&&t.total<=0){
    el.innerHTML='<div class="empty-msg" style="text-align:left;">이 달·지난달 모두 감상 기록이 없어요</div>';
    return;
  }
  // ① 총 시청시간 증감(제목 옆 총 시간과 중복되므로 큰 숫자 없이 증감만, 위로 바싹 붙임)
  const totalDiff=t.total-prevT.total;
  const totalDir=totalDiff>0?'up':(totalDiff<0?'down':'flat');
  const totalArrow=totalDir==='up'?'ti-arrow-up':(totalDir==='down'?'ti-arrow-down':'ti-minus');
  const totalSign=totalDiff>0?'+':(totalDiff<0?'-':'');
  const headlineHtml=prevT.total>0?`
    <div class="mrp-cc-headline">
      <span class="mrp-cc-headline-diff ${totalDir}"><i class="ti ${totalArrow}" style="font-size:12px;" aria-hidden="true"></i>${totalSign}${_fmtDur(Math.abs(totalDiff))}</span>
    </div>`:'';
  // ② 카테고리별 시간 미니바 + 증감(음악 제외 — 시간 데이터 없음)
  const CATS=[
    {cat:'drama',label:'드라마',icon:'ti-device-tv',color:'rgba(var(--pal-pink-rgb),1)',cur:t.drama,prev:prevT.drama},
    {cat:'movie',label:'영화',icon:'ti-movie',color:'rgba(var(--pal-sky-rgb),1)',cur:t.movie,prev:prevT.movie},
    {cat:'book',label:'독서',icon:'ti-book',color:'rgba(var(--pal-yellow-rgb),1)',cur:t.book,prev:prevT.book}
  ];
  const timeRows=CATS.filter(r=>r.cur>0||r.prev>0);
  const maxMin=Math.max(1,...timeRows.map(r=>Math.max(r.cur,r.prev)));
  const mkBarRow=(r)=>{
    const diff=r.cur-r.prev;
    const dir=diff>0?'up':(diff<0?'down':'flat');
    const arrow=dir==='up'?'ti-arrow-up':(dir==='down'?'ti-arrow-down':'ti-minus');
    const sign=diff>0?'+':(diff<0?'-':'');
    return `<div class="mrp-cc-row">
      <span class="mrp-cc-row-label"><i class="ti ${r.icon}" style="color:${r.color};font-size:13px;margin-right:4px;" aria-hidden="true"></i>${r.label}</span>
      <div class="mrp-cc-bars">
        <div class="mrp-cc-bar-track"><div class="mrp-cc-bar mrp-cc-bar-cur" style="width:${Math.round(r.cur/maxMin*100)}%;background:${r.color};"></div></div>
        <div class="mrp-cc-bar-track"><div class="mrp-cc-bar mrp-cc-bar-prev" style="width:${Math.round(r.prev/maxMin*100)}%;"></div></div>
      </div>
      <span class="mrp-cc-row-val ${dir}"><i class="ti ${arrow}" style="font-size:10px;" aria-hidden="true"></i>${sign}${_fmtDur(Math.abs(diff))}</span>
    </div>`;
  };
  const timeSectionHtml=timeRows.length?`
    <div class="mrp-cc-sec-title">감상 시간</div>
    ${timeRows.map(mkBarRow).join('')}
    <div class="mrp-cc-legend"><span><i class="mrp-cc-legend-dot cur"></i>이번 달</span><span><i class="mrp-cc-legend-dot prev"></i>지난달</span></div>`:'';
  // ③ 완결 편수 비교 — renderMrpContents 목록 뷰가 이미 월 범위로 판정해둔 inRange/inRangePrev를 그대로 셈(로직 이중화 방지).
  // 카테고리별 단위: 드라마=편, 영화=편, 독서=권, 음악=곡
  const countCat=(list,cat)=>(list||[]).filter(c=>c.content_cat===cat).length;
  const CAT_META4=[
    {cat:'drama',label:'드라마',icon:'ti-device-tv',color:'rgba(var(--pal-pink-rgb),1)',unit:'편'},
    {cat:'movie',label:'영화',icon:'ti-movie',color:'rgba(var(--pal-sky-rgb),1)',unit:'편'},
    {cat:'book',label:'독서',icon:'ti-book',color:'rgba(var(--pal-yellow-rgb),1)',unit:'권'},
    {cat:'music',label:'음악',icon:'ti-music',color:'rgba(210,175,225,1)',unit:'곡'}
  ];
  const countRows=CAT_META4.map(m=>({...m,cur:countCat(inRange,m.cat),prev:countCat(inRangePrev,m.cat)})).filter(r=>r.cur>0||r.prev>0);
  const countSectionHtml=countRows.length?`
    <div class="mrp-cc-sec-title">완결 편수</div>
    <div class="mrp-cc-count-grid">
      ${countRows.map(r=>{
        const diff=r.cur-r.prev;
        const dir=diff>0?'up':(diff<0?'down':'flat');
        const sign=diff>0?'+':(diff<0?'-':'');
        return `<div class="mrp-cc-count-cell">
          <i class="ti ${r.icon}" style="color:${r.color};font-size:14px;" aria-hidden="true"></i>
          <span class="mrp-cc-count-label">${r.label}</span>
          <span class="mrp-cc-count-val">${r.cur}${r.unit}</span>
          <span class="mrp-cc-count-diff ${dir}">${diff!==0?sign+Math.abs(diff):'-'}</span>
        </div>`;
      }).join('')}
    </div>`:'';
  if(prevT.total<=0){
    el.innerHTML=headlineHtml+timeSectionHtml+countSectionHtml+'<div class="empty-msg" style="text-align:left;margin-top:8px;">지난달 기록이 적어 시간 비교는 참고용이에요</div>';
    return;
  }
  el.innerHTML=headlineHtml+timeSectionHtml+countSectionHtml;
}

// 완결(또는 등록) 여부를 월 범위로 판정 — renderMrpContents 목록 뷰와 renderMrpContentsCmp 편수 비교가 공유
function _mrpContentsInRange(contents,startDk,endDk){
  return (contents||[]).filter(c=>{
    if(c.content_cat==='music')return c.start_date&&c.start_date>=startDk&&c.start_date<=endDk;
    if(c.status!=='done'&&c.status!=='stopped')return false;
    return c.end_date&&c.end_date>=startDk&&c.end_date<=endDk;
  });
}
function renderMrpContents(contents,startDk,endDk,rblocks,prevContents,prevRblocks,prevStartDk,prevEndDk){
  const el=document.getElementById('mrp-contents');
  const inRange=_mrpContentsInRange(contents,startDk,endDk);
  // 탭 행(카드 제목 옆) 총 감상 시간 — 드라마/독서는 리듬 기록, 영화는 러닝타임(total_unit) 고정 집계.
  // 영화의 월 소속은 완결편수와 동일하게 end_date 기준(_mrpContentsInRange)이라 inRange를 그대로 재사용 —
  // 등록월(month_key) 기준 별도 필터를 쓰던 예전 방식은 두 기준이 어긋나는 버그를 반복적으로 만들어 폐기(2026-08-27).
  const t=_calcWatchTimeByCat(rblocks||[],inRange);
  const totalEl=document.getElementById('mrp-contents-total');
  if(totalEl)totalEl.textContent=t.total>0?_fmtDur(t.total):'';
  // 카드 진입/월 이동 시 뷰는 항상 '목록'으로 리셋 — 제목·표시 상태를 함께 맞춤
  _mrpContentsView='list';
  const titleTextEl=document.getElementById('mrp-contents-title-text');
  if(titleTextEl)titleTextEl.textContent='이 달의 콘텐츠';
  document.getElementById('mrp-contents').style.display='';
  const cmpElToggle=document.getElementById('mrp-contents-cmp');
  if(cmpElToggle)cmpElToggle.style.display='none';
  // 전월대비 뷰 — 완결 편수·시간 계산 모두 동일한 월 범위 판정(_mrpContentsInRange, end_date 기준) 하나로 통일.
  const inRangePrev=(prevStartDk&&prevEndDk)?_mrpContentsInRange(prevContents,prevStartDk,prevEndDk):[];
  renderMrpContentsCmp(t,prevRblocks,inRangePrev,inRange);
  if(!inRange.length){el.innerHTML='<div class="empty-msg">이 달엔 기록한 콘텐츠가 없어요</div>';return;}
  // 카테고리(드라마/책/영화/음악) 순서 고정 그룹핑 — 그룹 내부는 기존처럼 최신순 유지
  const CAT_ORDER=['drama','book','movie','music'];
  const groups={};
  inRange.forEach(c=>{(groups[c.content_cat]=groups[c.content_cat]||[]).push(c);});
  const timeByCat={drama:t.drama,movie:t.movie,book:t.book};
  const maxCatMin=Math.max(t.drama,t.movie,t.book,1); // 그룹간 미니바 길이를 서로 비교 가능하게 같은 축(최댓값) 기준으로 정규화
  const html=CAT_ORDER.filter(cat=>groups[cat]&&groups[cat].length).map(cat=>{
    const meta=CAT_ICON_META[cat]||{icon:'ti-stack-2',bg:'rgba(150,150,150,1)',iconColor:'#fff',label:cat};
    const lines=groups[cat].slice(0,30).map(c=>`
      <div class="mrp-content-line">
        <span style="display:flex;align-items:center;min-width:0;overflow:hidden;"><span class="dot" style="background:${_mrpCatDotColor(c.content_cat)};"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.title||'')}</span></span>
        <span class="st">${_mrpStatusLabel(c)}</span>
      </div>`).join('');
    const catMin=timeByCat[cat]||0;
    const timeHtml=catMin>0?`<div class="mrp-content-group-time-wrap"><div class="mrp-content-group-time-bar-wrap"><div class="mrp-content-group-time-bar" style="width:${Math.round(catMin/maxCatMin*100)}%;background:${meta.bg};"></div></div><span class="mrp-content-group-time-val">${_fmtDur(catMin)}</span></div>`:'';
    return `<div class="mrp-content-group">
      <div class="mrp-content-group-head"><i class="ti ${meta.icon}" style="color:${meta.bg};" aria-hidden="true"></i><span>${meta.label}</span><span class="mrp-content-group-count">${groups[cat].length}</span>${timeHtml}</div>
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

// 이 달의 콘텐츠 카드 — 목록/전월대비 뷰 전환. 별도 배너 없이 카드 제목("이 달의 콘텐츠"/"전월 대비 감상 시간") 클릭으로 토글.
let _mrpContentsView='list';
function toggleMrpContentsView(){
  _mrpContentsView=_mrpContentsView==='list'?'cmp':'list';
  const titleTextEl=document.getElementById('mrp-contents-title-text');
  if(titleTextEl)titleTextEl.textContent=_mrpContentsView==='list'?'이 달의 콘텐츠':'전월 대비 감상 시간';
  document.getElementById('mrp-contents').style.display=_mrpContentsView==='list'?'':'none';
  document.getElementById('mrp-contents-cmp').style.display=_mrpContentsView==='cmp'?'':'none';
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
// 연간탭 내부 서브뷰(요약→습관→콘텐츠→리듬→수면) 좌우 스와이프 전환 — 위 setupSwipeNav와 동일 패턴,
// 대상만 상단 탭이 아니라 .yr-tab-chip 순서로. 연간탭이 열려있을 때만 동작(2026-08).
// ══════════════════════════════════════════════════════════
(function setupYrSwipeNav(){
  const wrap=document.getElementById('tab-yearly');
  if(!wrap)return;
  let startX=0,startY=0,tracking=false;
  const SWIPE_MIN_DIST=60;
  const SWIPE_MAX_VERTICAL=50;
  wrap.addEventListener('touchstart',e=>{
    if(e.touches.length!==1||_currentTab!=='yearly'){tracking=false;return;}
    // 감상 아카이브 갤러리, 코멘트 타임라인처럼 자체 가로 스크롤이 있는 영역은 뷰 전환 스와이프로 취급하지 않음
    if(e.target.closest&&e.target.closest('.yr-cgrid-scroll')){tracking=false;return;}
    startX=e.touches[0].clientX;startY=e.touches[0].clientY;tracking=true;
  },{passive:true});
  wrap.addEventListener('touchend',e=>{
    if(!tracking)return;tracking=false;
    const endX=e.changedTouches[0].clientX,endY=e.changedTouches[0].clientY;
    const dx=endX-startX,dy=endY-startY;
    if(Math.abs(dx)<SWIPE_MIN_DIST||Math.abs(dy)>SWIPE_MAX_VERTICAL)return;
    const chips=Array.from(document.querySelectorAll('.yr-tab-chip'));
    const curIdx=chips.findIndex(c=>c.classList.contains('on'));
    if(curIdx===-1)return;
    const dir=dx<0?1:-1; // 왼쪽으로 스와이프 → 다음 뷰, 오른쪽으로 스와이프 → 이전 뷰
    const nextIdx=curIdx+dir;
    if(nextIdx<0||nextIdx>=chips.length)return; // 양 끝에서는 순환하지 않고 멈춤
    const nextChip=chips[nextIdx];
    switchYrView(nextChip,nextChip.dataset.view);
  },{passive:true});
})();

// ══════════════════════════════════════════════════════════
// 코멘트 모아보기(타임라인, 읽기 전용) — 본앱 로직 이식, supaFetch 기반으로 재작성
// 완결 코멘트(contents.review+stars)와 감상 메모(contents.notes[], 2026-08-29 통합)를 함께 모아 보여줌.
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
  const contentRows=await Promise.all(months.map(mk=>supaFetch(`contents?month_key=eq.${mk}`)));
  const finals=[]; // {cid,cat,title,poster,stars,review,dk}
  const notes=[]; // {cid,cat,title,dk,text,time,updatedAt}
  // 2026-08-29 통합: 감상 메모는 이제 contents.notes[]에 직접 있음 — 별도 goal_notes 조회/cid 매칭(_resolveBookNoteCids) 불필요.
  contentRows.forEach(rows=>(rows||[]).forEach(c=>{
    if(c.review&&c.review.trim()){
      finals.push({cid:c.client_id,cat:c.content_cat,title:c.title,poster:c.poster||null,stars:c.stars||0,review:c.review||'',dk:c.end_date||c.start_date||''});
    }
    (c.notes||[]).forEach(n=>notes.push({...n,cid:c.client_id,cat:c.content_cat,poster:c.poster||null}));
  }));
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
      `<div class="ch-tlB-final-row">${g.final.stars>0?`<div class="ch-tlB-stars">${renderStarDisplayHtml(g.final.stars)}</div>`:''}</div>
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
          ${f.stars>0?`<span class="ch-tlA-stars">${renderStarDisplayHtml(f.stars)}</span>`:''}
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

// ══════════════════════════════════════════════════════════════════════════
// 연간탭 (Yearly Tab)
// 아래는 tablet.js 본체의 확장부로, 독립 모듈이 아니라 위 함수들과 동일한
// 전역 스코프에서 동작하며 supaFetch/escapeHtml/RHYTHM_CATS 등 본체 유틸을 그대로 재사용함.
// (기존 yearly-report.js 파일을 여기 병합 — 2026-08)
// ══════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// 연간탭(yearly) 세부 함수 모음
// 기존 앱 헬퍼를 최대한 재사용하고, 신규 로직은 "연간탭 전용"으로 명시.
//
// 재사용하는 기존 함수/상수 (신규 작성 없음, 그대로 호출):
//   supaFetch, monthKeyOf, weekKeyOf, pad, dateKey, escapeHtml
//   RHYTHM_CATS, CAT_ICON_META, HABIT_ICON_RULES
//   getHabitIcon, getHabitIconColor
//   getSleepScoreLevel, calcSleepRegularity, _sleepStatsOf, _sleepDurMinOf
//   _rhythmDurByCat, _rhythmSumCatMin, _fmtDur
//   _mrpContentsInRange, countContentsCompletedInRange
//   SLEEP_GOAL_MIN, SLEEP_SCORE_LEVELS
//
// 신규로 만든 것 (연간탭에만 필요, 이 파일에 정의):
//   quarterRangeOf                              — 분기 개념(기존 앱엔 없었음)
//   _yrCoreWindowStat                           — 코어 회복구간(23~02시) 점유율
//   _yrSleepDurationBuckets                     — 수면시간 4구간 분포
//   _yrCoreVsDurationComment                    — 코어구간×수면시간, 룰 기반 3~4단계 코멘트(비-API)
// ══════════════════════════════════════════════════════════

// ── 분기 유틸 (기존 monthKeyOf/weekKeyOf와 동일한 스타일로 신규 추가) ──
function quarterRangeOf(y,q){
  // q: 1~4. 반환: {startMonth(0-index), endMonth(0-index), label}
  const startMonth=(q-1)*3;
  return {startMonth,endMonth:startMonth+2,label:`${startMonth+1}~${startMonth+3}월`};
}
// 연초부터 지금까지 존재하는 분기 목록(미래 분기는 제외) — 분기 카드 렌더링에 사용
function listQuartersUpTo(y,mo){
  const curQ=Math.floor(mo/3)+1;
  const qs=[];
  for(let q=1;q<=4;q++)qs.push({q,y,isFuture:q>curQ,isCurrent:q===curQ});
  return qs;
}

// ── 연간탭 진입/이탈 — switchTab('yearly')를 그대로 사용(기존 openYearlyTab 중복 제거, 2026-08) ──
let _yrDate=new Date();
function switchYrView(chipEl,view){
  document.querySelectorAll('.yr-tab-chip').forEach(c=>c.classList.remove('on'));
  document.querySelectorAll('.yr-view').forEach(v=>v.classList.remove('on'));
  chipEl.classList.add('on');
  document.getElementById('view-'+view).classList.add('on');
  window.scrollTo({top:0,behavior:'smooth'});
  // 콘텐츠뷰는 숨겨진 상태(display:none)에서는 아카이브 실측 높이가 0으로 잡히므로,
  // 뷰가 실제로 보이게 된 직후 한 번 더 동기화(2026-08, 서브탭 전환 시 월그리드 높이가 안 맞던 문제 수정).
  if(view==='content')requestAnimationFrame(()=>syncYrContentHeight());
}

// ── 데이터 로드 (기존 loadMonthlyReportPage와 동일하게 Promise.all 병렬 조회) ──
async function loadYearlyTab(){
  // 다른 탭(오늘/주간/월간)에 갔다가 돌아왔을 때 마지막으로 보던 서브뷰(습관/콘텐츠 등)가 아니라
  // 항상 전체요약부터 보이게 리셋 — switchYrView와 동일한 방식으로 chip/view의 on 상태를 되돌림(2026-08).
  const summaryChip=document.querySelector('.yr-tab-chip[data-view="summary"]');
  if(summaryChip){
    document.querySelectorAll('.yr-tab-chip').forEach(c=>c.classList.remove('on'));
    document.querySelectorAll('.yr-view').forEach(v=>v.classList.remove('on'));
    summaryChip.classList.add('on');
    document.getElementById('view-summary').classList.add('on');
  }
  window.scrollTo({top:0});

  const y=_yrDate.getFullYear();
  const now=new Date();
  const startDk=`${y}-01-01`;
  const endDk=dateKey(now.getFullYear()===y?now:new Date(y,11,31));
  const elapsedMonths=(now.getFullYear()===y?now.getMonth():11)+1;

  const [todos,memos,onelineRows,sleepRows,habits,habitChecks,rblocks,contents,goalRows]=await Promise.all([
    supaFetch(`todos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=done,date_key`),
    supaFetch(`memos?date_key=gte.${startDk}&date_key=lte.${endDk}&select=id,text`),
    // 하루한줄(goal_notes, note_key='oneline:YYYY-MM-DD') — renderWeekKeywords와 동일하게 메모와 합쳐 집계
    supaFetch(`goal_notes?note_key=like.oneline:${y}*&select=lines`),
    supaFetch(`sleep?date_key=gte.${startDk}&date_key=lte.${endDk}&select=score,sleep_time,wake_time,date_key`),
    supaFetch(`habits?order=sort_order.asc`),
    supaFetch(`habit_checks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    supaFetch(`rhythm_blocks?date_key=gte.${startDk}&date_key=lte.${endDk}`),
    supaFetch(`contents?or=(status.in.(done,stopped),content_cat.eq.music)&order=created.desc&limit=500`),
    supaFetch(`ai_cache?cache_key=like.quarterly_summary_${y}*&select=cache_key,content`)
  ]);

  const ctx={y,elapsedMonths,todos:todos||[],memos:memos||[],onelineRows:onelineRows||[],
    sleepRows:sleepRows||[],habits:habits||[],habitChecks:habitChecks||[],rblocks:rblocks||[],
    contents:contents||[],quarterlyCache:goalRows||[]};

  // 상단 페이지 라벨, 습관탭 인트로 텍스트(연도) — 정적 마크업의 빈 span을 채움
  const periodEl=document.getElementById('yr-period-label');
  if(periodEl)periodEl.textContent=`${y}.01 ~ 누계 (${elapsedMonths}개월)`;
  const habitYearEl=document.getElementById('yr-habit-year');
  if(habitYearEl)habitYearEl.textContent=y;
  const contentYearEl=document.getElementById('yr-content-year');
  if(contentYearEl)contentYearEl.textContent=y;


  renderYrHero(ctx);
  renderYrHabitTab(ctx);
  renderYrContentTab(ctx);
  renderYrRhythmTab(ctx);
  renderYrSleepTab(ctx);
}

// ══════════════════════════════════════════════════════════
// 전체요약
// ══════════════════════════════════════════════════════════
function renderYrHero(ctx){
  const el=document.getElementById('yr-summary-body');
  const doneTodos=ctx.todos.filter(t=>t.done).length;
  const memoCount=ctx.memos.length;
  const contentCount=countContentsCompletedInRange(ctx.contents,`${ctx.y}-01-01`,`${ctx.y}-12-31`);
  const totalRecords=doneTodos+memoCount+contentCount;

  el.innerHTML=`
    <div class="yr-hero-kw-row">
      <div class="yr-hero">
        <div class="yr-hero-top">
          <div class="yr-hero-period">${ctx.y} · 누적 ${ctx.elapsedMonths}개월째</div>
          <div class="yr-hero-line">올해 누적</div>
          <div class="yr-hero-line yr-hero-line-num"><b class="yr-hero-num">${totalRecords}</b><span class="yr-hero-num-unit">개</span>의 기록을 남겼어요</div>
        </div>
        <div class="yr-hero-tags">
          <span class="yr-hero-tag"><i class="ti ti-checkbox" aria-hidden="true"></i>할 일 ${doneTodos}개 완료</span>
          <span class="yr-hero-tag"><i class="ti ti-notes" aria-hidden="true"></i>메모 ${memoCount}개</span>
          <span class="yr-hero-tag"><i class="ti ti-movie" aria-hidden="true"></i>콘텐츠 ${contentCount}개 감상</span>
        </div>
      </div>
      <div class="card">
        <div class="card-lbl"><i class="ti ti-hash" style="color:rgba(178,60,105,0.85);" aria-hidden="true"></i>올해의 키워드</div>
        <div id="yr-kw-cloud"></div>
      </div>
    </div>
    <div class="yr-sum-grid" id="yr-metric-grid"></div>
    <div class="bento-item bento-full" style="margin-top:13px;" id="yr-quarterly-reflection"></div>`;

  renderYrKeywordCloud(ctx);
  renderYrMetricGrid(ctx);
  renderYrQuarterlyReflection(ctx);
}

// "올해를 돌아보며" — 분기 마무리 시점(9월말 등)에만 API 호출로 채울 예정인 자리.
// 지금은 API를 붙이지 않고: ai_cache에 해당 분기 캐시(quarterly_summary_YYYY-Qn)가 있으면 그 문장을 그대로 쓰고,
// 없으면(=평소) 가장 최근 완결 분기와 진행중 분기의 기록량만으로 룰 기반 코멘트를 대신 채운다.
// 캐시 사용 여부는 ctx.quarterlyCache(loadYearlyTab에서 이미 조회해둔 ai_cache 행들)로 판단.
function renderYrQuarterlyReflection(ctx){
  const el=document.getElementById('yr-quarterly-reflection');
  if(!el)return;
  const curMonth=ctx.elapsedMonths-1;
  const curQ=Math.floor(curMonth/3)+1;
  const cacheKey=`quarterly_summary_${ctx.y}-Q${curQ}`;
  const cached=(ctx.quarterlyCache||[]).find(r=>r.cache_key===cacheKey);

  if(cached&&cached.content){
    el.innerHTML=`<div class="insight-box tone-reflect"><i class="ti ti-quote"></i><div><strong>올해를 돌아보며:</strong> ${escapeHtml(cached.content)}</div></div>`;
    return;
  }

  // 캐시 없음(평소 상태) — 룰 기반 대체 코멘트
  const doneTodos=ctx.todos.filter(t=>t.done).length;
  const contentCount=countContentsCompletedInRange(ctx.contents,`${ctx.y}-01-01`,`${ctx.y}-12-31`);
  const {d:rhythmByCat}=_rhythmDurByCat(ctx.rblocks);
  const topRhythm=Object.entries(rhythmByCat).sort((a,b)=>b[1]-a[1])[0];
  const topRhythmLabel=topRhythm&&RHYTHM_CATS[topRhythm[0]]?RHYTHM_CATS[topRhythm[0]].label:null;

  const text=`아직 ${ctx.elapsedMonths}개월째지만${topRhythmLabel?` ${topRhythmLabel} 중심으로 하루가 채워지는 흐름이 뚜렷해요.`:' 여러 기록이 쌓이고 있어요.'} 그 사이 할 일 ${doneTodos}개를 완료하고 콘텐츠 ${contentCount}개를 감상하는 등 다양한 기록을 놓치지 않았어요. 개월이 쌓이면 이 흐름이 어떻게 이어지는지 함께 지켜봐요.`;
  el.innerHTML=`<div class="insight-box tone-reflect"><i class="ti ti-quote"></i><div><strong>올해를 돌아보며:</strong> ${text}</div></div>`;
}

// 키워드 클라우드 — renderWeekKeywords와 완전히 동일한 방식(_weekKwTokenize, WEEK_KW_COLORS, week-kw-cloud 배치 재사용),
// 대상 범위만 최근 2주 → 연 누적으로 확장. 개수도 주간탭과 동일하게 6개로 통일(2026-08).
function renderYrKeywordCloud(ctx){
  const el=document.getElementById('yr-kw-cloud');
  const memoText=ctx.memos.map(m=>m.text||'').join(' ');
  const onelineText=ctx.onelineRows.map(r=>Array.isArray(r.lines)?(r.lines[0]||''):(r.lines||'')).join(' ');
  const allText=(memoText+' '+onelineText).trim();
  if(!allText){el.innerHTML='<div class="empty-msg">기록된 메모가 없어요</div>';return;}
  const tokens=_weekKwTokenize(allText);
  const freq={};
  tokens.forEach(t=>{freq[t]=(freq[t]||0)+1;});
  const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!top.length){el.innerHTML='<div class="empty-msg">추출된 키워드가 없어요</div>';return;}

  const maxCnt=top[0][1],minCnt=top[top.length-1][1];
  const n=top.length;
  // 주간탭 renderWeekKeywords와 동일한 격자+무작위 오프셋 배치 — 카드형으로 자연스럽게 불규칙해 보이도록.
  const gridCols=n<=2?n:Math.ceil(n/2);
  const gridRows=n<=2?1:2;
  const cellW=100/gridCols,cellH=100/gridRows;
  const wordsHtml=top.map(([w,c],i)=>{
    const ratio=maxCnt===minCnt?1:(c-minCnt)/(maxCnt-minCnt);
    const fontSize=18+ratio*16; // 18px~34px
    const col=i%gridCols,row=Math.floor(i/gridCols);
    const rawCx=col*cellW+cellW/2+(Math.random()-0.5)*cellW*0.5;
    const rawCy=row*cellH+cellH/2+(Math.random()-0.5)*cellH*0.45;
    const cx=Math.min(88,Math.max(12,rawCx));
    const cy=Math.min(85,Math.max(15,rawCy));
    const rotate=(Math.random()-0.5)*24;
    const color=WEEK_KW_COLORS[i%WEEK_KW_COLORS.length];
    return `<div class="week-kw-word" style="left:${cx}%;top:${cy}%;font-size:${fontSize}px;color:${color};transform:translate(-50%,-50%) rotate(${rotate}deg);">${escapeHtml(w)}<span class="week-kw-cnt">${c}</span></div>`;
  }).join('');

  el.innerHTML=`<div class="week-kw-cloud">${wordsHtml}</div>
    <div class="yr-kw-summary"><i class="ti ti-quote" aria-hidden="true"></i> ${top[0][1]?escapeHtml(top[0][0]):''}${top[1]?', '+escapeHtml(top[1][0]):''}${top[2]?', '+escapeHtml(top[2][0]):''} 같은 단어가 자주 등장했어요.</div>`;
}

// 4분할 지표그리드(습관/콘텐츠/리듬/채움로그) — 클릭 시 해당 서브탭으로 이동
// ── 습관별(카테고리 없음, 습관 자체가 4개 구분) 누적 달성률 계산 — 전체요약 요약카드용 독립 헬퍼.
// renderYrHabitTab의 habitStats 계산과 동일 기준(습관별 최초 기록월부터, 월간 달성률 평균)이지만
// 전체요약이 습관탭보다 먼저 렌더링되므로 별도로 값만 가볍게 계산.
// 습관별 월간 흐름 통계 — 요약탭(전체평균/습관별 %)과 습관탭 본문(흐름표/편차/증감)이 동일한 월별 집계
// 로직을 각자 중복 계산하고 있었던 것을 하나로 통합(2026-08). habitStats에 필요한 모든 필드(seq/stdev/delta
// 포함)를 여기서 한 번에 만들고, 요약탭은 이 중 overallPct/avgPct만 골라 쓰면 됨.
// ctx당 1회만 계산되도록 ctx 자체에 캐시(요약탭→습관탭 순으로 이 턴 안에서 두 번 불릴 때 재계산 방지).
function _yrHabitOverallStats(ctx){
  if(ctx._habitStatsCache)return ctx._habitStatsCache;
  if(!ctx.habits.length)return {avgPct:0,perHabit:[],habitStats:[]};
  const byMonth={};
  for(let m=0;m<ctx.elapsedMonths;m++){
    const mk=`${ctx.y}-${pad(m+1)}`;
    const daysInMonth=new Date(ctx.y,m+1,0).getDate();
    const checksInMonth=ctx.habitChecks.filter(c=>c.date_key&&c.date_key.startsWith(mk));
    byMonth[m]={};
    ctx.habits.forEach(h=>{
      const cnt=checksInMonth.filter(c=>c.habit_name===h.name).length;
      byMonth[m][h.name]=Math.round(cnt/daysInMonth*100);
    });
  }
  // 습관별 "실제 기록이 시작된 달" — 앱을 6월 중순부터 쓰기 시작해 1~5월은 기록 자체가 없는데
  // 이걸 0%로 계산에 포함시키면 평균/편차/증감이 왜곡됨. 습관별 최초 체크 기록월부터만 계산.
  const firstCheckMonthOf=h=>{
    const checks=ctx.habitChecks.filter(c=>c.habit_name===h.name&&c.date_key);
    if(!checks.length)return 0;
    const earliestDk=checks.map(c=>c.date_key).sort()[0];
    const mo=parseInt(earliestDk.slice(5,7),10)-1;
    return Math.min(mo,ctx.elapsedMonths-1);
  };
  // 앱 출시 첫 달(6월, 반달치)은 전체통계(activeSeq)에서 완전히 제외 — 트랙 그래프(seq)에는 그대로
  // 남겨 시각적으로는 계속 보이게 함(2027-01, 봄이님 결정). 기준값은 YR_FIRST_LAUNCH_MONTH_IDX 참고.
  // seq는 12개월 전체를 담되(트랙 그래프용), 통계 계산(activeSeq)은 startMonth 이후 + 출시 첫 달(반달치) 제외.
  const habitStats=ctx.habits.map(h=>{
    const seq=Array.from({length:ctx.elapsedMonths},(_,m)=>byMonth[m][h.name]||0);
    let startMonth=firstCheckMonthOf(h);
    if(startMonth<=YR_FIRST_LAUNCH_MONTH_IDX)startMonth=YR_FIRST_LAUNCH_MONTH_IDX+1;
    const activeSeq=seq.slice(startMonth);
    const overallPct=activeSeq.length?Math.round(activeSeq.reduce((a,b)=>a+b,0)/activeSeq.length):0;
    const mean=activeSeq.length?activeSeq.reduce((a,b)=>a+b,0)/activeSeq.length:0;
    const variance=activeSeq.length?activeSeq.reduce((a,b)=>a+(b-mean)**2,0)/activeSeq.length:0;
    const stdev=Math.sqrt(variance);
    const delta=activeSeq.length>=2?activeSeq[activeSeq.length-1]-activeSeq[0]:0; // 실제 시작달 대비 최근달 증감(BEST FLOW용)
    return {name:h.name,color:h.color,seq,startMonth,activeSeq,overallPct,stdev,delta};
  });
  const perHabit=habitStats.map(({name,color,overallPct})=>({name,color,overallPct}));
  const avgPct=perHabit.length?Math.round(perHabit.reduce((s,h)=>s+h.overallPct,0)/perHabit.length):0;
  const result={avgPct,perHabit,habitStats};
  ctx._habitStatsCache=result;
  return result;
}

// 습관 4색 — 앱 전역 관례(오늘탭/주간탭 colorMap)와 동일하게 -rgb 변수 + rgba()로 통일(2026-08, 기존엔 -text 변수를 직접 써서 톤이 미묘하게 달랐음).
const YR_HABIT_COLOR_MAP={mint:'rgba(var(--pal-mint-rgb),1)',pink:'rgba(var(--pal-pink-rgb),1)',sky:'rgba(var(--pal-sky-rgb),1)',yellow:'rgba(var(--pal-yellow-rgb),1)'};

function renderYrMetricGrid(ctx){
  const el=document.getElementById('yr-metric-grid');
  if(!el)return;

  // 습관 — 전체평균 숫자(좌) + 습관별 4행(우)
  const {avgPct:habitAvgPct,perHabit}=_yrHabitOverallStats(ctx);
  const habitRowsHtml=perHabit.map(h=>{
    const color=YR_HABIT_COLOR_MAP[h.color]||'var(--tm)';
    return `<div class="yr-sum-habit-row"><span class="yr-sum-habit-dot" style="background:${color};"></span><span class="yr-sum-habit-name">${escapeHtml(h.name)}</span><span class="yr-sum-habit-pct">${h.overallPct}%</span></div>`;
  }).join('');

  // 콘텐츠 — 분기별 q-card 축소판(기존 renderYrContentTab의 분기 카드와 동일 계산)
  const curMonth=ctx.elapsedMonths-1;
  const quarters=listQuartersUpTo(ctx.y,curMonth);
  const countsByQ=quarters.map(({q,isFuture})=>{
    if(isFuture)return null;
    const {startMonth,endMonth}=quarterRangeOf(ctx.y,q);
    const sDk=`${ctx.y}-${pad(startMonth+1)}-01`;
    const eDk=`${ctx.y}-${pad(endMonth+1)}-${pad(new Date(ctx.y,endMonth+1,0).getDate())}`;
    return countContentsCompletedInRange(ctx.contents,sDk,eDk);
  });
  const contentCardsHtml=quarters.map(({q,isFuture,isCurrent},i)=>{
    const range=quarterRangeOf(ctx.y,q).label;
    const cnt=countsByQ[i];
    if(isFuture)return `<div class="q-card compact empty future"><div class="q-card-name">${range}</div><div class="q-card-val">–</div></div>`;
    if(cnt===null)return `<div class="q-card compact empty"><div class="q-card-name">${range}</div><div class="q-card-val">–</div></div>`;
    return `<div class="q-card compact${isCurrent?' active':''}"><div class="q-card-name">${range}</div><div class="q-card-val">${cnt}<span>개</span></div></div>`;
  }).join('');
  // 배너 길이를 늘리지 않고 하단 여백에 "현재 분기 누적량"만 텍스트 한 줄로(2026-08) — 카드 4칸이 이미 분기별 총량을 보여주므로,
  // 지금 서 있는 분기에 카테고리별로 뭘 얼마나 봤는지(드라마/영화/책/음악)를 짧게 짚어주는 용도.
  const curQIdx=quarters.findIndex(q=>q.isCurrent);
  let contentNoteHtml='';
  if(curQIdx>=0){
    const {startMonth,endMonth}=quarterRangeOf(ctx.y,quarters[curQIdx].q);
    const sDk=`${ctx.y}-${pad(startMonth+1)}-01`;
    const eDk=`${ctx.y}-${pad(endMonth+1)}-${pad(new Date(ctx.y,endMonth+1,0).getDate())}`;
    // countContentsCompletedInRange와 동일 판정(음악은 start_date=등록일, 나머지는 end_date=완결일)을 카테고리별로.
    const curQContents=(ctx.contents||[]).filter(c=>
      c.content_cat==='music'
        ?(c.start_date&&c.start_date>=sDk&&c.start_date<=eDk)
        :((c.status==='done'||c.status==='stopped')&&c.end_date&&c.end_date>=sDk&&c.end_date<=eDk)
    );
    const catUnitLabel={drama:'편',movie:'편',book:'권',music:'곡'};
    const catOrder=['drama','movie','book','music'];
    const catParts=catOrder
      .map(cat=>({cat,cnt:curQContents.filter(c=>c.content_cat===cat).length}))
      .filter(({cnt})=>cnt>0)
      .map(({cat,cnt})=>`${CAT_ICON_META[cat].label} <b>${cnt}${catUnitLabel[cat]}</b>`);
    contentNoteHtml=catParts.length
      ?`<div class="yr-sum-content-note">이번 분기 ${catParts.join(', ')} 감상했어요.</div>`
      :`<div class="yr-sum-content-note">이번 분기엔 아직 감상 기록이 없어요.</div>`;
  }

  // 리듬 — 8대 카테고리 아이콘+시간 그리드(renderYrRhythm9Grid와 동일 계산)
  const {d:rhythmD,dayCount:rhythmDayCount}=_rhythmDurByCatWithDays(ctx.rblocks);
  const rhythmItemsHtml=Object.entries(RHYTHM_CATS).map(([k,c])=>{
    const catDays=rhythmDayCount[k]||0;
    const avgMin=catDays?Math.round((rhythmD[k]||0)/catDays):0;
    return `<div class="r9-item"><div class="r9-icon" style="background:${c.color};"><i class="ti ${c.icon}"></i></div><div class="r9-val">${_fmtDur(avgMin)}</div><div class="r9-lbl">${c.label}</div></div>`;
  }).join('');

  // 수면 — 좌: 총수면시간 평균, 우: 취침·기상 평균 시각, 하단: 수면시간 분포 도넛(수면탭에서 이동)
  const validSleepRows=ctx.sleepRows.filter(r=>r.sleep_time&&r.wake_time);
  const sleepStats=validSleepRows.length?_sleepStatsOf(validSleepRows):null;
  const avgSleepHtml=sleepStats?`${Math.floor(sleepStats.avgMin/60)}<span class="unit">시간</span> ${sleepStats.avgMin%60}<span class="unit">분</span>`:'-';
  let avgSleepTimeHtml='-',avgWakeTimeHtml='-';
  if(validSleepRows.length){
    const sleepMins=validSleepRows.map(r=>toDawnAdjustedMin(_dawnTimeToMin(r.sleep_time),22*60)).filter(v=>v!=null);
    const wakeMins=validSleepRows.map(r=>_dawnTimeToMin(r.wake_time)).filter(v=>v!=null);
    if(sleepMins.length)avgSleepTimeHtml=_minToHHMM(sleepMins.reduce((a,b)=>a+b,0)/sleepMins.length);
    if(wakeMins.length)avgWakeTimeHtml=_minToHHMM(wakeMins.reduce((a,b)=>a+b,0)/wakeMins.length);
  }
  let sleepDistHtml='';
  if(validSleepRows.length){
    const {buckets,counts,total:distTotal}=_yrSleepDurationBuckets(validSleepRows);
    const circ=2*Math.PI*32;let cum=0;
    const order=[3,2,1,0];
    let donutSegs='';
    order.forEach(i=>{
      const b=buckets[i];const len=distTotal?(counts[i]/distTotal*circ):0;
      donutSegs+=`<circle cx="40" cy="40" r="32" fill="none" stroke="${b.color}" stroke-width="10" stroke-dasharray="${len.toFixed(2)} ${(circ-len).toFixed(2)}" stroke-dashoffset="${-cum.toFixed(2)}" stroke-linecap="round"/>`;
      cum+=len;
    });
    // 시간대별 분배는 일수 대신 퍼센트로(2026-08) — 도넛 자체가 이미 비율을 보여주니 범례도 같은 단위로 맞춤.
    sleepDistHtml=`
      <div class="yr-sum-sleep-dist">
        <div class="mrsl-donut-box"><svg viewBox="0 0 80 80">${donutSegs}</svg></div>
        <div class="mrsl-legend">${buckets.map((b,i)=>`<div class="mrsl-legend-row"><span class="mrsl-legend-dot" style="background:${b.color};"></span>${b.label} <span class="mrsl-legend-val">${distTotal?Math.round(counts[i]/distTotal*100):0}%</span></div>`).join('')}</div>
      </div>`;
  }

  el.innerHTML=`
    <div class="card yr-sum-banner" onclick="switchYrView(document.querySelector('[data-view=habit]'),'habit')">
      <div class="yr-sum-banner-hdr"><i class="ti ti-chart-donut" aria-hidden="true"></i>습관</div>
      <div class="yr-sum-habit-split">
        <div class="yr-sum-habit-avg"><div class="yr-sum-habit-avg-num">${habitAvgPct}<span>%</span></div><div class="yr-sum-habit-avg-lbl">전체 평균</div></div>
        <div class="yr-sum-habit-list">${habitRowsHtml}</div>
      </div>
    </div>
    <div class="card yr-sum-banner" onclick="switchYrView(document.querySelector('[data-view=content]'),'content')">
      <div class="yr-sum-banner-hdr"><i class="ti ti-stack-2" aria-hidden="true"></i>콘텐츠 · 분기별 소비량</div>
      <div class="yr-sum-content-quarters">${contentCardsHtml}</div>
      ${contentNoteHtml}
    </div>
    <div class="card yr-sum-banner" onclick="switchYrView(document.querySelector('[data-view=rhythm]'),'rhythm')">
      <div class="yr-sum-banner-hdr"><i class="ti ti-rainbow" aria-hidden="true"></i>리듬 · 8대 카테고리 일평균</div>
      <div class="rhythm-9grid">${rhythmItemsHtml}</div>
    </div>
    <div class="card yr-sum-banner" onclick="switchYrView(document.querySelector('[data-view=sleep]'),'sleep')">
      <div class="yr-sum-banner-hdr"><i class="ti ti-moon-stars" aria-hidden="true"></i>수면</div>
      <div class="yr-sum-sleep-split">
        <div class="yr-sum-sleep-item"><div class="yr-sum-sleep-lbl">총 수면시간 평균</div><div class="yr-sum-sleep-val">${avgSleepHtml}</div></div>
        <div class="yr-sum-sleep-item"><div class="yr-sum-sleep-lbl">평균 취침 · 기상</div><div class="yr-sum-sleep-val small">${avgSleepTimeHtml} – ${avgWakeTimeHtml}</div></div>
      </div>
      ${sleepDistHtml}
    </div>`;
}

// ══════════════════════════════════════════════════════════
// 습관 — 12개월 흐름 그리드. 현재까지의 달만 값 채움, 이후는 .future
// ══════════════════════════════════════════════════════════
function renderYrHabitTab(ctx){
  const el=document.getElementById('yr-habit-body');
  if(!ctx.habits.length){el.innerHTML='<div class="empty-msg">등록된 습관이 없어요</div>';return;}

  // 월별 집계·통계는 _yrHabitOverallStats에서 한 번만 계산(요약탭과 공유, 2026-08 중복 제거)
  const {habitStats}=_yrHabitOverallStats(ctx);

  const rowsHtml=ctx.habits.map((h,i)=>{
    const {seq,overallPct}=habitStats[i];
    const cells=[];
    for(let m=0;m<12;m++){
      if(m>=ctx.elapsedMonths){cells.push('<i class="future"></i>');continue;}
      const pct=seq[m]||0;
      cells.push(pct===0?'<i class="empty"></i>':`<i style="--v:${(pct/100).toFixed(2)}"></i>`);
    }
    const hIcon=getHabitIcon(h.name);
    return `<div class="yr-habit-row">
      <div class="habit-name">${hIcon?`<i class="ti ${hIcon}"></i>`:''}<span>${escapeHtml(h.name)}</span></div>
      <div class="habit-track">${cells.join('')}</div>
      <b>${overallPct}%</b>
    </div>`;
  }).join('');

  el.innerHTML=`<div class="habit-flow">${rowsHtml}</div>`;

  renderYrHabitScore(ctx,habitStats);
  renderYrHabitInsights(ctx,habitStats);
}

// 전체 평균 달성률 큰 숫자 + 가장 안정적인(표준편차 최소) 습관 — 습관탭 인트로 아래 첫 배너
function renderYrHabitScore(ctx,habitStats){
  const el=document.getElementById('yr-habit-score');
  if(!el)return;
  if(!habitStats.length){el.innerHTML='';return;}
  const avgPct=Math.round(habitStats.reduce((s,h)=>s+h.overallPct,0)/habitStats.length);
  const mostStable=[...habitStats].sort((a,b)=>a.stdev-b.stdev)[0];
  const stableNote=mostStable.stdev<8
    ?'월별 편차가 가장 적음'
    :`월별 편차 ${Math.round(mostStable.stdev)}%p로 가장 안정적`;

  el.innerHTML=`
    <div class="habit-score">
      <div class="habit-score-main">
        <div class="habit-overline">${ctx.elapsedMonths}-MONTH AVERAGE</div>
        <div class="habit-score-number">${avgPct}<span>%</span></div>
        <div class="habit-score-label">전체 평균 달성률</div>
      </div>
      <div class="habit-score-side">
        <div><span class="habit-dot" style="background:rgba(var(--pal-mint-rgb),.9)"></span> 가장 안정적</div>
        <strong>${escapeHtml(mostStable.name)}</strong>
        <small>${stableNote}</small>
      </div>
    </div>`;
}

// 미니 스파크라인 — 축/범례 없이 값 배열만으로 작은 SVG 라인을 그림(카드 안에 끼워 넣는 용도, 가볍게 별도 작성).
function _yrSparklineSVG(values,color){
  const valid=values.filter(v=>v!=null);
  if(valid.length<2)return '';
  const max=Math.max(...valid),min=Math.min(...valid),range=(max-min)||1;
  const xStep=100/(values.length-1);
  const pts=values.map((v,i)=>v==null?null:{x:i*xStep,y:30-((v-min)/range*24+3)}).filter(Boolean);
  const ptsStr=pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return `<svg class="habit-spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${ptsStr}" fill="none" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`;
}

// BEST FLOW(가장 크게 오른 습관) / NEEDS CARE(가장 낮은 습관) 2단 카드 — 12개월 흐름표 아래
function renderYrHabitInsights(ctx,habitStats){
  const el=document.getElementById('yr-habit-insights');
  if(!el)return;
  if(habitStats.length<2){el.innerHTML='';return;} // 습관이 1개뿐이면 비교 의미가 없어 생략

  const bestFlow=[...habitStats].sort((a,b)=>b.delta-a.delta)[0];
  const needsCare=[...habitStats].sort((a,b)=>a.overallPct-b.overallPct)[0];
  const firstMonthNum=bestFlow.startMonth+1;
  const lastMonthNum=ctx.elapsedMonths;
  const firstMonthPct=bestFlow.activeSeq[0]||0;
  const lastMonthPct=bestFlow.activeSeq[bestFlow.activeSeq.length-1]||0;
  const bestSpark=_yrSparklineSVG(bestFlow.activeSeq,'#4a8f6a');
  const careSpark=_yrSparklineSVG(needsCare.activeSeq,'#c08a2e');

  el.innerHTML=`
    <div class="habit-insights">
      <div class="habit-insight mint">
        <div class="habit-insight-tag">BEST FLOW</div>
        <div class="habit-insight-number">${bestFlow.delta>=0?'+':''}${bestFlow.delta}<span>%</span></div>
        <div class="habit-insight-title">${escapeHtml(bestFlow.name)}</div>
        <p>${firstMonthNum}월 ${firstMonthPct}%에서 ${lastMonthNum}월 ${lastMonthPct}%로, 가장 크게 ${bestFlow.delta>=0?'올랐어요':'변화했어요'}.</p>
        ${bestSpark}
      </div>
      <div class="habit-insight yellow">
        <div class="habit-insight-tag">NEEDS CARE</div>
        <div class="habit-insight-number">${needsCare.overallPct}<span>%</span></div>
        <div class="habit-insight-title">${escapeHtml(needsCare.name)}</div>
        <p>${ctx.habits.length}개 습관 중 가장 낮은 달성률이에요. 조금 더 관심이 필요해 보여요.</p>
        ${careSpark}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
// 콘텐츠 — 갤러리(완결 콘텐츠 포스터 모음), 분기(Q1~Q4)별 소비량, 전분기 대비
// ══════════════════════════════════════════════════════════

// 연간탭 전용 갤러리 상태 — 월간탭 cgrid(_cgridActiveId 등)와 완전히 분리(동시에 열려있을 때 서로 간섭 방지).
let _yrCgridActiveId=null;
let _yrCgridList=[]; // 필터 이전 전체 완결 목록(전체 수량 표시·필터 재계산에 사용)
let _yrCgridCatFilter='all'; // 'all'|'drama'|'book'|'movie' — 월간탭 wcal-filter-chip과 동일한 카테고리 필터 패턴

// 갤러리 카드 1개 — 월간탭 cgrid와 같은 CSS 클래스 재사용, 로직만 연간탭 전용으로 새로 작성(가볍게: 진행률·메모 타임라인 없음, 완결작만 다루므로).
function _yrCgridItemHtml(c){
  const meta=CAT_ICON_META[c.content_cat]||{icon:'ti-stack-2',bg:'rgba(150,150,150,1)'};
  const thumb=c.poster
    ?`<img class="cgrid-thumb" src="${c.poster}" />`
    :`<div class="cgrid-thumb-fallback" style="background:${meta.bg};"><i class="ti ${meta.icon}" aria-hidden="true"></i></div>`;
  const icons=[];
  if(c.stars>0)icons.push('<i class="ti ti-star" aria-hidden="true"></i>');
  if(c.review)icons.push('<i class="ti ti-message-circle" aria-hidden="true"></i>');
  const thumbIcons=icons.length?`<div class="cgrid-thumb-icons">${icons.join('')}</div>`:'';
  const active=c.id===_yrCgridActiveId;
  return `<div class="cgrid-item${active?' active':''}" data-cid="${c.id}" onclick="toggleYrCgridDetail('${c.id}')">
    <div class="cgrid-thumb-wrap">${thumb}${thumbIcons}</div>
    <div class="cgrid-title">${escapeHtml(c.title||'')}</div>
  </div>`;
}

// 갤러리 상세 — 완결작 전용(진행중 상태·진행률바·감상메모 타임라인 없음). 기간+별점, 완결 총평만.
function _yrCgridDetailHtml(c){
  const period=_cgridPeriodLabel(c);
  const stars=c.stars>0?`<span class="cgrid-detail-stars">${renderStarDisplayHtml(c.stars)}</span>`:'';
  const topRow=(period||stars)?`<div class="cgrid-detail-row"><span class="cgrid-detail-row-date">${period?`<i class="ti ti-calendar" style="font-size:12px;" aria-hidden="true"></i>${period}`:''}</span>${stars}</div>`:'';
  const finalHtml=c.review?`<div class="cgrid-detail-final"><span class="cgrid-detail-final-lbl">Comment :</span> ${escapeHtml(c.review)}</div>`:'';
  return `<div class="cgrid-detail">${topRow}${finalHtml}</div>`;
}

// 4개씩 행 단위 렌더(2026-08: 3→4→5→4, 최종적으로 4로 축소 — 옆에 월별 그리드 배너를 위한 공간 확보) —
// 월간탭 _cgridRowsHtml과 동일 패턴(펼침 영역을 해당 행 바로 뒤에 4칸 전체폭으로 삽입)
function _yrCgridRowsHtml(list){
  let html='';
  for(let i=0;i<list.length;i+=4){
    const row=list.slice(i,i+4);
    html+=row.map(c=>_yrCgridItemHtml(c)).join('');
    const activeInRow=row.find(c=>c.id===_yrCgridActiveId);
    html+=`<div class="cgrid-detail-row-wrap${activeInRow?' on':''}" id="yr-cgrid-detail-wrap-${i}">${activeInRow?_yrCgridDetailHtml(activeInRow):''}</div>`;
  }
  return html;
}
function toggleYrCgridDetail(id){
  _yrCgridActiveId=(_yrCgridActiveId===id)?null:id;
  const el=document.getElementById('yr-cgrid-grid-inner');
  if(el)el.innerHTML=_yrCgridRowsHtml(_yrCgridFilteredList());
}

// 카테고리 필터칩 — 월간탭 renderWcalFilterChips와 동일 패턴(전체+카테고리별, CAT_ICON_META 재사용).
// 음악은 갤러리 대상에서 애초에 제외(감상기간 개념 없음, renderYrContentGallery 방침과 동일)라 필터에도 넣지 않음.
const YR_CGRID_FILTER_CATS=['drama','book','movie','music'];
function renderYrCgridFilterChips(){
  const el=document.getElementById('yr-cgrid-filter-chips');
  if(!el)return;
  const chips=[{key:'all',label:'전체',icon:'ti-apps'},...YR_CGRID_FILTER_CATS.map(k=>({key:k,label:CAT_ICON_META[k].label,icon:CAT_ICON_META[k].icon}))];
  el.innerHTML=chips.map(c=>`<div class="wcal-filter-chip${c.key===_yrCgridCatFilter?' on':''}" data-cat="${c.key}" onclick="yrCgridSetFilter('${c.key}')"><i class="ti ${c.icon}" aria-hidden="true" style="font-size:12px;margin-right:3px;"></i>${c.label}</div>`).join('');
}
function _yrCgridFilteredList(){
  return _yrCgridCatFilter==='all'?_yrCgridList:_yrCgridList.filter(c=>c.content_cat===_yrCgridCatFilter);
}
function yrCgridSetFilter(cat){
  _yrCgridCatFilter=cat;
  _yrCgridActiveId=null; // 필터 전환 시 펼쳐진 상세는 접어서 행 인덱스 꼬임 방지
  renderYrCgridFilterChips();
  const gridEl=document.getElementById('yr-cgrid-grid-inner');
  if(gridEl)gridEl.innerHTML=_yrCgridRowsHtml(_yrCgridFilteredList());
  const countEl=document.getElementById('yr-cgrid-count');
  if(countEl)countEl.textContent=_yrCgridFilteredList().length;
}

// 올해 완결된 콘텐츠(book/drama/movie, done/stopped) + 올해 등록된 음악을 최근순으로 전부 — 배너 높이를
// 고정하고 내부 스크롤을 넣어(2026-08) 개수 제한 없이 다 보여줌. 연말결산 성격의 배너라 음악도 포함(2026-08):
// 음악은 완결 개념이 없어(등록일만 존재) 다른 콘텐츠 비교 전반에서는 계속 제외하지만, 이 아카이브만은
// countContentsCompletedInRange와 동일하게 등록일(start_date) 기준으로 넣음 — 정렬용 날짜도 그 기준을 따름.
function renderYrContentGallery(ctx){
  const el=document.getElementById('yr-content-gallery');
  if(!el)return;
  const startDk=`${ctx.y}-01-01`,endDk=`${ctx.y}-12-31`;
  const completed=(ctx.contents||[]).filter(c=>{
    if(c.content_cat==='music')return c.start_date&&c.start_date>=startDk&&c.start_date<=endDk;
    return(c.status==='done'||c.status==='stopped')&&c.end_date&&c.end_date>=startDk&&c.end_date<=endDk;
  }).sort((a,b)=>{
    const aDate=a.content_cat==='music'?a.start_date:a.end_date;
    const bDate=b.content_cat==='music'?b.start_date:b.end_date;
    return (bDate||'').localeCompare(aDate||'');
  });

  if(!completed.length){
    el.innerHTML=`<div class="bento-item bento-half yr-cgrid-refcard"><div class="bento-lbl">올해의 감상 아카이브</div><div class="empty-msg">아직 완결한 콘텐츠가 없어요</div></div>`;
    return;
  }

  _yrCgridList=completed;
  _yrCgridActiveId=null;
  _yrCgridCatFilter='all';

  el.innerHTML=`
    <div class="bento-item bento-half yr-cgrid-refcard">
      <div class="bento-lbl-row">
        <div class="bento-lbl">올해의 감상 아카이브</div>
        <div class="yr-cgrid-count-tag"><span id="yr-cgrid-count">${completed.length}</span>개</div>
      </div>
      <div class="bento-sub" style="margin-top:0;margin-bottom:10px;">완결한 콘텐츠를 최근 순으로 모아봤어요. 눌러보면 평점과 총평을 볼 수 있어요.</div>
      <div class="wcal-filter-chips" id="yr-cgrid-filter-chips"></div>
      <div class="yr-cgrid-scroll">
        <div class="cgrid-grid yr-cgrid-grid-4col" id="yr-cgrid-grid-inner">${_yrCgridRowsHtml(_yrCgridList)}</div>
      </div>
    </div>`;
  renderYrCgridFilterChips();
}

// ══════════════════════════════════════════════════════════
// 콘텐츠탭 — 월별 감상 그리드 (연력 스타일 3x4 타일, 아카이브 배너 옆 1:1 분할)
// 각 달 타일: 그 달 완결/등록 콘텐츠 총 개수를 중앙에 크게 표시, 배경은 월별 고정 파스텔색(12색, 앱 내
// 기존 팔레트 재사용 — 리듬 8색 우선 + 팔레트에서 4색 보충)으로 다채롭게. 클릭하면 아카이브 배너와 동일한
// 패턴으로, 클릭한 달이 속한 행 바로 아래에 그 달의 목록(포스터+제목)이 펼쳐짐(2026-08).
// 높이는 아카이브(.yr-cgrid-refcard)를 기준 카드로 삼아 initCgridHeightSync가 실시간 동기화 — 별도 로직 없음.
// ══════════════════════════════════════════════════════════

// 월별 고정 파스텔 12색 — 리듬 8색(RHYTHM_CATS 순서, 앱에서 가장 많이 쓰이는 팔레트)을 우선 사용하고,
// 리듬 8색과 톤이 겹치지 않는 --pal-* 4색(warmgray/lavender/rose/pink)으로 나머지를 보충해 12개월에 1:1 고정 배정.
// 콘텐츠 카테고리(3~4종)로는 색이 다양해지지 않아서 "그 달"에 색을 고정 배정하는 방식을 택함(2026-08).
const YR_MGRID_MONTH_COLORS=[
  'var(--rh-exercise)','var(--rh-rest)','var(--rh-groom)','var(--rh-work)',
  'var(--rh-appointment)','var(--rh-note)','var(--rh-enjoy)','var(--rh-home)',
  'rgba(var(--pal-warmgray-rgb),0.75)','rgba(var(--pal-lavender-rgb),0.75)',
  'rgba(var(--pal-rose-rgb),0.75)','rgba(var(--pal-pink-rgb),0.75)'
];
const YR_MGRID_COLS=4; // 한 줄 4개(1~4/5~8/9~12) — 펼침 삽입 위치 계산에도 사용

// 월 타일 하나 — 배경은 월별 고정 파스텔색, 총 개수는 타일 정중앙에 크게.
function _yrMonthGridTileHtml(m,monthItems,isFuture){
  const color=YR_MGRID_MONTH_COLORS[m];
  if(isFuture)return `<div class="yr-mgrid-tile future"><div class="yr-mgrid-month">${m+1}월</div></div>`;
  if(!monthItems.length)return `<div class="yr-mgrid-tile empty"><div class="yr-mgrid-month">${m+1}월</div><div class="yr-mgrid-count-empty">-</div></div>`;
  const active=_yrMonthGridActiveM===m;
  return `<div class="yr-mgrid-tile${active?' active':''}" style="background:${color};" onclick="toggleYrMonthGrid(${m})">
    <div class="yr-mgrid-month">${m+1}월</div>
    <div class="yr-mgrid-count">${monthItems.length}</div>
  </div>`;
}

// 그 달 목록 아이템 — 그리드형이 아닌 목록형(작은 정사각 포스터+제목 한 줄), 클릭 시 그 항목 바로 아래 상세(별점/총평) 펼침(2026-08).
let _yrMonthGridItemActiveId=null;
function _yrMgridItemHtml(c){
  const meta=CAT_ICON_META[c.content_cat]||{icon:'ti-stack-2',bg:'rgba(150,150,150,1)'};
  const thumb=c.poster
    ?`<img class="yr-mgrid-list-thumb" src="${c.poster}" />`
    :`<div class="yr-mgrid-list-thumb yr-mgrid-list-thumb-fallback" style="background:${meta.bg};"><i class="ti ${meta.icon}" aria-hidden="true"></i></div>`;
  const icons=[];
  if(c.stars>0)icons.push('<i class="ti ti-star" aria-hidden="true"></i>');
  if(c.review)icons.push('<i class="ti ti-message-circle" aria-hidden="true"></i>');
  const active=c.id===_yrMonthGridItemActiveId;
  return `<div class="yr-mgrid-list-item">
    <div class="yr-mgrid-list-row${active?' active':''}" onclick="_yrMgridToggleItem('${c.id}')">
      ${thumb}
      <div class="yr-mgrid-list-title">${escapeHtml(c.title||'')}</div>
      <div class="yr-mgrid-list-icons">${icons.join('')}</div>
    </div>
    <div class="yr-mgrid-list-detail-wrap${active?' on':''}">${active?_yrCgridDetailHtml(c):''}</div>
  </div>`;
}
function _yrMgridToggleItem(id){
  _yrMonthGridItemActiveId=(_yrMonthGridItemActiveId===id)?null:id;
  _yrMgridRenderExpandedRow();
}
// 클릭한 달이 속한 행(row) 바로 아래에 그 달의 목록을 렌더 — 아카이브의 _yrCgridRowsHtml과 동일 패턴(탭 전환 아님).
function _yrMgridRenderExpandedRow(){
  const rowIdx=_yrMonthGridActiveM==null?null:Math.floor(_yrMonthGridActiveM/YR_MGRID_COLS)*YR_MGRID_COLS;
  const wrapEl=rowIdx==null?null:document.getElementById('yr-mgrid-row-wrap-'+rowIdx);
  if(!wrapEl)return;
  if(_yrMonthGridActiveM==null||!_yrMonthGridData[_yrMonthGridActiveM]){wrapEl.innerHTML='';wrapEl.classList.remove('on');return;}
  const {items}=_yrMonthGridData[_yrMonthGridActiveM];
  wrapEl.classList.add('on');
  wrapEl.innerHTML=`
    <div class="yr-mgrid-detail-title">${_yrMonthGridActiveM+1}월 감상 목록</div>
    <div class="yr-mgrid-list">${items.map(c=>_yrMgridItemHtml(c)).join('')}</div>`;
}
// 월 타일 클릭 — 아카이브와 동일하게 그리드 자체는 그대로 두고, 클릭한 달이 속한 행 바로 아래에 목록을 펼침(탭 전환 아님).
// 배너 높이는 initCgridHeightSync가 아카이브(.yr-cgrid-refcard) 실측 높이를 그대로 따라가므로 여기선 건드리지 않음.
function toggleYrMonthGrid(m){
  const prevActive=_yrMonthGridActiveM;
  _yrMonthGridActiveM=(_yrMonthGridActiveM===m)?null:m;
  _yrMonthGridItemActiveId=null;
  const gridEl=document.getElementById('yr-mgrid-grid');
  if(gridEl)gridEl.innerHTML=_yrMgridGridHtml();
  _yrMgridRenderExpandedRow();
}
function _yrMgridGridHtml(){
  let html='';
  for(let m=0;m<12;m+=YR_MGRID_COLS){
    const rowMonths=Array.from({length:YR_MGRID_COLS},(_,k)=>m+k).filter(mm=>mm<12);
    html+=rowMonths.map(mm=>_yrMonthGridTileHtml(mm,_yrMonthGridData[mm]?_yrMonthGridData[mm].items:[],!_yrMonthGridData[mm])).join('');
    const activeInRow=rowMonths.includes(_yrMonthGridActiveM);
    html+=`<div class="yr-mgrid-row-wrap${activeInRow?' on':''}" id="yr-mgrid-row-wrap-${m}"></div>`;
  }
  return html;
}

// 카테고리별 총감상량 텍스트 — 월그리드 하단 남는 공간에 배치. 드라마/영화/책은 시간(분→시간 표기),
// 음악은 시간 데이터가 없어 곡 수로 표기(기존 콘텐츠 비교 전반의 방침과 동일).
const YR_MGRID_SUMMARY_CATS=[
  {key:'drama',label:'드라마',icon:'ti-device-tv',color:'rgba(var(--pal-pink-rgb),1)'},
  {key:'movie',label:'영화',icon:'ti-movie',color:'rgba(var(--pal-sky-rgb),1)'},
  {key:'book',label:'독서',icon:'ti-book',color:'rgba(var(--pal-yellow-rgb),1)'},
  {key:'music',label:'음악',icon:'ti-music',color:'rgba(var(--pal-lime-rgb),1)'}
];
function _yrMgridCatSummaryHtml(ctx){
  const startDk=`${ctx.y}-01-01`,endDk=`${ctx.y}-12-31`;
  const inRange=_mrpContentsInRange(ctx.contents,startDk,endDk);
  const t=_calcWatchTimeByCat(ctx.rblocks||[],inRange);
  const musicCount=inRange.filter(c=>c.content_cat==='music').length;
  const rowsHtml=YR_MGRID_SUMMARY_CATS.map(({key,label,icon,color})=>{
    const valText=key==='music'?`${musicCount}곡`:(t[key]>0?_fmtDur(t[key]):'0분');
    return `<div class="yr-mgrid-catsum-row">
      <span class="yr-mgrid-catsum-label"><i class="ti ${icon}" style="color:${color};" aria-hidden="true"></i>${label}</span>
      <span class="yr-mgrid-catsum-val">${valText}</span>
    </div>`;
  }).join('');
  return `<div class="yr-mgrid-catsum"><div class="yr-mgrid-catsum-title">카테고리별 총 감상량</div>${rowsHtml}</div>`;
}

function renderYrContentMonthGrid(ctx){
  const el=document.getElementById('yr-content-monthgrid');
  if(!el)return;
  const monthlyByM=Array.from({length:12},()=>[]);
  (ctx.contents||[]).forEach(c=>{
    let mk=null;
    if(c.content_cat==='music'){if(c.start_date)mk=c.start_date.slice(0,7);}
    else if((c.status==='done'||c.status==='stopped')&&c.end_date)mk=c.end_date.slice(0,7);
    if(!mk||!mk.startsWith(String(ctx.y)))return;
    const m=parseInt(mk.slice(5,7),10)-1;
    monthlyByM[m].push(c);
  });
  _yrMonthGridData=monthlyByM.map((items,m)=>m>=ctx.elapsedMonths?null:{items});
  _yrMonthGridActiveM=null;
  _yrMonthGridItemActiveId=null;

  el.innerHTML=`
    <div class="bento-item bento-half yr-mgrid-card">
      <div class="bento-lbl">월별 감상 그리드</div>
      <div class="bento-sub" style="margin-top:0;margin-bottom:10px;">달마다 얼마나 감상했는지 한눈에 볼 수 있어요. 눌러보면 그 달 목록이 나와요.</div>
      <div class="yr-mgrid-scroll">
        <div class="yr-mgrid-grid" id="yr-mgrid-grid">${_yrMgridGridHtml()}</div>
        ${_yrMgridCatSummaryHtml(ctx)}
      </div>
    </div>`;
  initYrContentHeightSync();
}

// rhythm_blocks에서 드라마/독서/영화 감상시간(분)을 월별로 집계 — renderTodayReading(오늘탭)과 동일 기준:
// cat==='enjoy'이고 텍스트가 "드라마 - "/"독서 - "/"영화 - "로 시작하는 블록만 대상, start~end 차이를 합산.
// 영화는 오늘탭과 동일한 이중 규칙 적용 — 리듬 기록이 있으면 그 시간 우선, 없으면(리듬 기록 없이 콘텐츠탭에만
// 등록·완결한 영화) contents.total_unit(러닝타임, 분)을 종료월(end_date 기준)에 대체로 카운트.
// 음악은 감상시간 개념이 없어(등록일만 존재) 애초에 제외 — 기존 콘텐츠 비교 전반의 규칙과 동일.
function _yrContentMinutesByMonth(rblocks,contents,mk){
  const sums={drama:0,book:0,movie:0};
  const movieTitlesWithRhythm=new Set();
  (rblocks||[]).forEach(b=>{
    if(b.cat!=='enjoy'||!b.text||!b.start_time||!b.end_time)return;
    if(!b.date_key||!b.date_key.startsWith(mk))return;
    let cat=null;
    if(b.text.startsWith('드라마 - '))cat='drama';
    else if(b.text.startsWith('독서 - '))cat='book';
    else if(b.text.startsWith('영화 - ')){cat='movie';movieTitlesWithRhythm.add(b.text.slice(5));}
    else return;
    const s=_paceParseHM(b.start_time),e=_paceParseHM(b.end_time);
    let mins=e-s;if(mins<0)mins+=1440;
    sums[cat]+=mins;
  });
  // 완결 영화 중 이 달에 종료됐고, 같은 달 리듬 기록이 없는 것만 러닝타임으로 대체(오늘탭과 동일 우선순위)
  (contents||[]).forEach(c=>{
    if(c.content_cat!=='movie'||c.status!=='done'||!c.total_unit)return;
    if(!c.end_date||!c.end_date.startsWith(mk))return;
    if(movieTitlesWithRhythm.has(c.title))return;
    sums.movie+=c.total_unit;
  });
  return sums;
}

const YR_CONTENT_TIME_CATS=[
  {key:'book',label:'책',color:'rgba(var(--pal-yellow-rgb),0.85)'},
  {key:'drama',label:'드라마',color:'rgba(var(--pal-pink-rgb),0.85)'},
  {key:'movie',label:'영화',color:'rgba(var(--pal-sky-rgb),0.85)'}
];

// 이번달 / 지난달 / 그 이전 평균(전전월~시작월) — 3줄 고정, 개월이 아무리 쌓여도 화면 폭이 늘지 않음.
// "지난달과 비교해 지금 뭘 더 보고 있나"를 즉시 보여주는 목적이라 라인차트 대신 가로 비중 막대 선택(2026-08).
function renderYrContentTimeCompare(ctx){
  const el=document.getElementById('yr-content-time-compare');
  if(!el)return;
  const curM=ctx.elapsedMonths-1; // 0-indexed 이번 달
  if(curM<0){el.innerHTML='';return;}

  const mkOf=m=>`${ctx.y}-${pad(m+1)}`;
  const curSums=_yrContentMinutesByMonth(ctx.rblocks,ctx.contents,mkOf(curM));
  const prevSums=curM>=1?_yrContentMinutesByMonth(ctx.rblocks,ctx.contents,mkOf(curM-1)):null;

  let earlierSums=null;
  if(curM>=2){
    earlierSums={drama:0,book:0,movie:0};
    let monthCount=0;
    for(let m=0;m<=curM-2;m++){
      const s=_yrContentMinutesByMonth(ctx.rblocks,ctx.contents,mkOf(m));
      YR_CONTENT_TIME_CATS.forEach(({key})=>{earlierSums[key]+=s[key];});
      monthCount++;
    }
    if(monthCount>0)YR_CONTENT_TIME_CATS.forEach(({key})=>{earlierSums[key]=earlierSums[key]/monthCount;});
  }

  const rowOf=(label,sums,sub)=>{
    if(!sums)return '';
    const total=YR_CONTENT_TIME_CATS.reduce((s,{key})=>s+sums[key],0);
    if(!total)return `<div class="yr-ctc-row"><div class="yr-ctc-row-lbl">${label}${sub?`<span class="yr-ctc-row-sub">${sub}</span>`:''}</div><div class="yr-ctc-empty">기록 없음</div></div>`;
    const segsHtml=YR_CONTENT_TIME_CATS.map(({key,color})=>{
      const pct=Math.round(sums[key]/total*100);
      return pct>0?`<div class="yr-ctc-seg" style="width:${pct}%;background:${color};"></div>`:'';
    }).join('');
    return `<div class="yr-ctc-row">
      <div class="yr-ctc-row-lbl">${label}${sub?`<span class="yr-ctc-row-sub">${sub}</span>`:''}</div>
      <div class="yr-ctc-bar">${segsHtml}</div>
    </div>`;
  };

  const rowsHtml=[
    rowOf('이번달',curSums),
    prevSums?rowOf('지난달',prevSums):'',
    earlierSums?rowOf('이전 평균',earlierSums,`${curM-1}개월 평균`):''
  ].join('');

  const legendHtml=YR_CONTENT_TIME_CATS.map(({label,color})=>
    `<div class="chart-legend-item"><span class="chart-legend-dot" style="background:${color}"></span>${label}</div>`
  ).join('');

  // 이번달·지난달·이전평균 전부 감상시간 0이면 빈 상태 문구로 대체
  const allEmpty=YR_CONTENT_TIME_CATS.every(({key})=>!curSums[key])
    &&(!prevSums||YR_CONTENT_TIME_CATS.every(({key})=>!prevSums[key]))
    &&(!earlierSums||YR_CONTENT_TIME_CATS.every(({key})=>!earlierSums[key]));
  if(allEmpty){
    el.innerHTML='<div class="empty-msg">감상 시간 기록이 부족해요</div>';
    return;
  }

  el.innerHTML=`
    <div class="bento-item bento-full">
      <div class="bento-lbl">월별 콘텐츠 시간 비중</div>
      <div class="bento-sub" style="margin-top:0;margin-bottom:12px;">책·드라마·영화에 쓴 시간의 비중을 비교해요.</div>
      <div class="yr-ctc-wrap">${rowsHtml}</div>
      <div class="chart-legend" style="margin-top:10px;">${legendHtml}</div>
    </div>`;
}

function renderYrContentTab(ctx){
  const inRange=_mrpContentsInRange(ctx.contents,`${ctx.y}-01-01`,`${ctx.y}-12-31`);
  const totalCount=countContentsCompletedInRange(ctx.contents,`${ctx.y}-01-01`,`${ctx.y}-12-31`);

  const introSubEl=document.getElementById('yr-content-intro-sub');
  if(introSubEl)introSubEl.textContent=`누적 ${totalCount}개의 콘텐츠, 그 흐름을 분석합니다.`;

  renderYrContentGallery(ctx);
  renderYrContentMonthGrid(ctx);
  renderYrContentTimeCompare(ctx);
  renderYrContentCumul(ctx,inRange);
}

// 평점/코멘트 요약 — contents 테이블의 실제 필드(stars: 0~5 별점, review: 완결 총평 텍스트) 기준.
// 카테고리별 누적 감상량 — 드라마/도서/영화 3개 장편 카테고리만 비교(음악은 소비 단위가 달라 제외, 전체요약의 방침과 동일)
function renderYrContentCumul(ctx,inRange){
  const el=document.getElementById('yr-content-cumul');
  if(!el)return;
  const cats=['drama','book','movie'];
  const unitLabel={drama:'편',book:'권',movie:'편'};
  const counts=cats.map(cat=>inRange.filter(c=>c.content_cat===cat).length);
  const maxCnt=Math.max(...counts,1);
  if(counts.every(c=>c===0)){el.innerHTML='';return;}

  const rowsHtml=cats.map((cat,i)=>{
    const cnt=counts[i];
    const pct=Math.round(cnt/maxCnt*100);
    const meta=CAT_ICON_META[cat];
    return `<div class="cumul-row"><div class="cumul-lbl">${meta.label}</div><div class="cumul-bar-bg"><div class="cumul-bar-fill" style="width:${pct}%; background:${meta.bg};"></div></div><div class="cumul-val">${cnt}${unitLabel[cat]}</div></div>`;
  }).join('');

  el.innerHTML=`
    <div class="bento-lbl">카테고리별 누적 감상량</div>
    <div class="cumul-list">${rowsHtml}</div>`;
}

// ══════════════════════════════════════════════════════════
// 리듬 — 표준하루밸런스 → 8대카테고리그리드 → 핵심리듬 월별흐름 → 늘고/줄어든 리듬
// ══════════════════════════════════════════════════════════

// ── 연간탭 공용 그룹핑 헬퍼 (2026-08 정리: 리듬/수면 렌더 함수들에 흩어져 있던 반복 로직 통합) ──

// ctx.rblocks를 연초~elapsedMonths까지 월별로 순회하며 각 달의 rows를 콜백에 넘긴다.
// 반환값은 콜백 결과를 모은 배열(길이=elapsedMonths) — 월별 라인차트/막대차트 데이터 조립에 공용 사용.
// rowsOverride를 주면 ctx.rblocks 대신 그 배열을 월별로 나눔(예: validRows만 대상인 수면 차트).
function _yrByMonth(ctx,mapFn,rowsOverride){
  const source=rowsOverride||ctx.rblocks;
  const out=[];
  for(let m=0;m<ctx.elapsedMonths;m++){
    const mk=`${ctx.y}-${pad(m+1)}`;
    const rowsInMonth=source.filter(r=>r.date_key&&r.date_key.startsWith(mk));
    out.push(mapFn(rowsInMonth,m));
  }
  return out;
}

function renderYrRhythmTab(ctx){
  renderYrRhythmStandardDay(ctx);
  renderYrRhythm9Grid(ctx);
  renderYrRhythmMonthlyFlow(ctx);
  renderYrRhythmChangeInsights(ctx);
}

// 표준 하루 밸런스 — 누적 평균 기준 상위 5개 카테고리를 24시간 막대로. 기존 timeline-24h-bar(월간탭) 재사용.
function renderYrRhythmStandardDay(ctx){
  const el=document.getElementById('yr-rhythm-standard-day');
  if(!el)return;
  const {d,dayCount}=_rhythmDurByCatWithDays(ctx.rblocks);
  if(!Object.keys(d).length){el.innerHTML='<div class="empty-msg">기록된 리듬이 없어요</div>';return;}
  const top5=Object.entries(d).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const dayTotal=top5.reduce((s,[,min])=>s+min,0);
  const segsHtml=top5.map(([k,min])=>{
    const c=RHYTHM_CATS[k];if(!c)return'';
    const pct=dayTotal?Math.round(min/dayTotal*100):0;
    const catDays=dayCount[k]||1;
    const avgMin=Math.round(min/catDays);
    return `<div class="tl-seg" style="width:${pct}%;background:${c.color};">${_fmtDur(avgMin)}</div>`;
  }).join('');
  const legendHtml=top5.map(([k])=>{
    const c=RHYTHM_CATS[k];if(!c)return'';
    return `<div class="chart-legend-item"><span class="chart-legend-dot" style="background:${c.color}"></span>${c.label}</div>`;
  }).join('');
  el.innerHTML=`
    <div class="timeline-24h-wrap" style="padding-bottom:0;">
      <div class="timeline-24h-bar">${segsHtml}</div>
    </div>
    <div class="chart-legend" style="margin-top:14px;">${legendHtml}</div>`;
}

// 8대 카테고리 일평균 밸런스 — RHYTHM_CATS 8개 전부, 아이콘/색 그대로 재사용.
// 일평균의 분모는 카테고리별 실제 발생일수(월간리포트와 동일 기준) — 전체 기록일수로 나누면
// 어쩌다 한 번 한 활동이 실제보다 훨씬 낮게 희석되어 보이는 문제가 있었음.
function renderYrRhythm9Grid(ctx){
  const el=document.getElementById('yr-rhythm-9grid');
  if(!el)return;
  const {d,dayCount}=_rhythmDurByCatWithDays(ctx.rblocks);
  if(!Object.keys(d).length){el.innerHTML='<div class="empty-msg">기록된 리듬이 없어요</div>';return;}
  const itemsHtml=Object.entries(RHYTHM_CATS).map(([k,c])=>{
    const catDays=dayCount[k]||0;
    const avgMin=catDays?Math.round((d[k]||0)/catDays):0;
    return `<div class="r9-item"><div class="r9-icon" style="background:${c.color};"><i class="ti ${c.icon}"></i></div><div class="r9-val">${_fmtDur(avgMin)}</div><div class="r9-lbl">${c.label}</div></div>`;
  }).join('');
  el.innerHTML=`<div class="rhythm-9grid">${itemsHtml}</div>`;
}

// 핵심 리듬 4가지의 누적 월별 흐름 — 전체 기간 합산 상위 4개 카테고리를 월별 막대로.
// 각 카테고리 내에서 최댓값 월을 100%로 정규화(목업과 동일 방식).
function renderYrRhythmMonthlyFlow(ctx){
  const el=document.getElementById('yr-rhythm-monthly-flow');
  if(!el)return;
  if(!ctx.rblocks.length){el.innerHTML='<div class="empty-msg">기록된 리듬이 없어요</div>';return;}
  const {d:totalByCat}=_rhythmDurByCat(ctx.rblocks);
  // 외출(appointment)은 이동·약속처럼 예외적 성격이라 이 배너의 top4 후보에서만 제외(수면·식사가 별도 관리되는 것과 같은 맥락, 2026-08).
  const top4=Object.entries(totalByCat).filter(([k])=>k!=='appointment').sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k])=>k);

  const byMonth=_yrByMonth(ctx,blocksInMonth=>_rhythmDurByCat(blocksInMonth).d);

  const cardsHtml=top4.map(k=>{
    const c=RHYTHM_CATS[k];
    const monthVals=byMonth.map(d=>d[k]||0);
    const maxVal=Math.max(...monthVals)||1;
    const barsHtml=monthVals.map((v,i)=>{
      const pct=Math.round(v/maxVal*100);
      return `<div class="r-sm-bar-col"><div class="r-sm-bar" style="height:${pct}%;background:${c.color}"></div><div class="r-sm-lbl">${i+1}월</div></div>`;
    }).join('');
    return `<div class="r-sm-card">
      <div class="r-sm-hdr"><div class="r-sm-title"><i class="ti ${c.icon}" style="color:${c.color}"></i>${c.label}</div></div>
      <div class="r-sm-bars">${barsHtml}</div>
    </div>`;
  }).join('');

  // 인사이트 — 마지막 달이 그 전달보다 늘어난 카테고리가 있으면 언급
  const lastIdx=ctx.elapsedMonths-1;
  const risingCats=top4.filter(k=>lastIdx>0&&(byMonth[lastIdx][k]||0)>(byMonth[lastIdx-1][k]||0));
  const risingText=risingCats.length
    ?`${risingCats.map(k=>RHYTHM_CATS[k].label).join('·')}${risingCats.length>1?'는':'은'} 최근 달에도 계속 늘어나는 중이라, 최근 들어 자리잡은 흐름으로 보여요.`
    :'월별로 큰 변화 없이 비슷한 패턴이 이어지고 있어요.';

  el.innerHTML=`
    <div class="rhythm-sm-grid">${cardsHtml}</div>
    <div class="insight-box tone-observe" style="margin-top:14px;">
      <i class="ti ti-chart-line"></i>
      <div><strong>추세:</strong> ${risingText}</div>
    </div>`;
}

// 가장 늘어난 리듬 / 가장 줄어든 리듬 — 습관탭 BEST FLOW/NEEDS CARE와 동일 원칙(전월 대비 아님, 시작달 대비
// 최근달 증감). 연간탭은 전체 흐름을 다루는 자리이고 전월 비교는 월간리포트의 역할이라 그 기준을 그대로 따름(2026-08).
// 외출(appointment)은 이동·약속 성격이라 후보에서 제외(renderYrRhythmMonthlyFlow의 top4 선정과 동일 방침).
// 2026-08 수정: 월 총합(분) 그대로 비교하면 "그 달에 며칠 기록했는지"에 따라 착시가 생김(기록을 늦게 시작한 달은
// 총합 자체가 작게 나와 증감폭이 실제보다 과장됨). 일평균(그 카테고리가 실제 기록된 날 기준)으로 바꾸고,
// "시간이 늘었다"와 "빈도(기록일수)가 늘었다"를 구분할 수 있도록 기록일수 변화도 함께 계산해 문구에 반영.
function renderYrRhythmChangeInsights(ctx){
  const el=document.getElementById('yr-rhythm-change-insights');
  if(!el)return;
  if(ctx.elapsedMonths<2||!ctx.rblocks.length){el.innerHTML='';return;}

  // 월별로 {avgMin(그 카테고리가 기록된 날 기준 일평균), days(그 카테고리가 실제 기록된 일수)}를 함께 계산
  const byMonth=_yrByMonth(ctx,blocksInMonth=>{
    const {d,dayCount}=_rhythmDurByCatWithDays(blocksInMonth);
    const out={};
    Object.keys(d).forEach(k=>{out[k]={avgMin:Math.round(d[k]/dayCount[k]),days:dayCount[k]};});
    return out;
  });
  const cats=Object.keys(RHYTHM_CATS).filter(k=>k!=='appointment');

  const stats=cats.map(k=>{
    const seq=byMonth.map(m=>m[k]?m[k].avgMin:null); // 기록 없는 달은 null(0으로 두면 "그 달엔 0분씩 했다"는 것과 헷갈림)
    const daysSeq=byMonth.map(m=>m[k]?m[k].days:0);
    let firstIdx=seq.findIndex(v=>v!=null);
    if(firstIdx===-1)return null; // 기록이 아예 없는 카테고리는 후보에서 제외
    // 앱 출시 첫 달(6월, 반달치)은 표본이 적어 우연히 튄 값이 "추세의 시작점"으로 오인될 수 있어
    // 비교 기준점에서 제외 — 습관탭 전체통계와 동일 원칙(2027-01, 봄이님 결정). YR_FIRST_LAUNCH_MONTH_IDX 참고.
    if(firstIdx<=YR_FIRST_LAUNCH_MONTH_IDX)firstIdx=YR_FIRST_LAUNCH_MONTH_IDX+1;
    if(firstIdx>=seq.length)return null; // 7월 이후 데이터가 아직 없으면(예: 6월까지만 경과) 후보에서 제외
    const activeSeq=seq.slice(firstIdx);
    const activeDaysSeq=daysSeq.slice(firstIdx);
    const validActive=activeSeq.filter(v=>v!=null);
    if(validActive.length<2)return null; // 비교할 달이 1개뿐이면 증감 의미 없음
    const firstAvg=validActive[0],lastAvg=validActive[validActive.length-1];
    const delta=lastAvg-firstAvg; // 일평균 기준 증감(분)
    const firstDays=activeDaysSeq[0],lastDays=activeDaysSeq[activeDaysSeq.length-1];
    const daysDelta=lastDays-firstDays; // 기록일수 증감(빈도 변화 참고용)
    return {key:k,label:RHYTHM_CATS[k].label,icon:RHYTHM_CATS[k].icon,color:RHYTHM_CATS[k].color,
      activeSeq,firstIdx,delta,firstDays,lastDays,daysDelta};
  }).filter(Boolean);

  if(stats.length<2){el.innerHTML='';return;} // 비교할 카테고리가 1개 이하면 의미 없어 생략

  const grown=[...stats].sort((a,b)=>b.delta-a.delta)[0];
  const shrunk=[...stats].sort((a,b)=>a.delta-b.delta)[0];
  if(grown.key===shrunk.key){el.innerHTML='';return;} // 카테고리가 1개뿐이라 같은 게 뽑히는 경우 방지

  const fmtDelta=mins=>{
    const sign=mins>=0?'+':'-';
    const abs=Math.abs(mins);
    return abs<60?`${sign}${abs}분`:`${sign}${_fmtDur(abs)}`;
  };
  // 빈도(기록일수) 변화가 함께 뚜렷할 때만 문구에 덧붙임 — 하루평균은 비슷한데 기록하는 날 자체가
  // 늘거나(예: 주1회→주3회) 줄었다면, "시간이 늘었다"보다 "더 자주/덜 자주 하게 됐다"는 설명이 더 정확함.
  const freqNote=daysDelta=>{
    if(daysDelta>=3)return ` 그만큼 기록하는 날도 늘었어요(+${daysDelta}일).`;
    if(daysDelta<=-3)return ` 기록하는 날 자체도 줄었어요(${daysDelta}일).`;
    return '';
  };
  const grownSpark=_yrSparklineSVG(grown.activeSeq,'#4a8f6a');
  const shrunkSpark=_yrSparklineSVG(shrunk.activeSeq,'#c08a2e');
  const firstMonthLabel=idx=>`${idx+1}월`;

  el.innerHTML=`
    <div class="habit-insights">
      <div class="habit-insight mint">
        <div class="habit-insight-tag">GROWING</div>
        <div class="habit-insight-number">${fmtDelta(grown.delta)}<span> /일</span></div>
        <div class="habit-insight-title"><i class="ti ${grown.icon}" style="color:${grown.color};margin-right:4px;" aria-hidden="true"></i>${escapeHtml(grown.label)}</div>
        <p>${firstMonthLabel(grown.firstIdx)}부터 지금까지 하루 평균이 가장 크게 늘어난 리듬이에요.${freqNote(grown.daysDelta)}</p>
        ${grownSpark}
      </div>
      <div class="habit-insight yellow">
        <div class="habit-insight-tag">SHRINKING</div>
        <div class="habit-insight-number">${fmtDelta(shrunk.delta)}<span> /일</span></div>
        <div class="habit-insight-title"><i class="ti ${shrunk.icon}" style="color:${shrunk.color};margin-right:4px;" aria-hidden="true"></i>${escapeHtml(shrunk.label)}</div>
        <p>${firstMonthLabel(shrunk.firstIdx)}부터 지금까지 하루 평균이 가장 크게 줄어든 리듬이에요.${freqNote(shrunk.daysDelta)}</p>
        ${shrunkSpark}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
// 수면 — 목표 달성률, 수면시간 분포, 코어 회복구간
// ══════════════════════════════════════════════════════════
function _yrSleepDurationBuckets(validRows){
  const buckets=[
    {key:'u5',label:'5시간 미만',min:0,max:300,color:'rgba(255,205,150,0.85)'},
    {key:'5to6',label:'5~6시간',min:300,max:360,color:'rgba(190,225,205,0.85)'},
    {key:'6to7',label:'6~7시간',min:360,max:420,color:'rgba(150,190,215,0.85)'},
    {key:'o7',label:'7시간 이상',min:420,max:100000,color:'rgba(216,190,225,0.85)'}
  ];
  const counts=buckets.map(b=>validRows.filter(r=>{const m=_sleepDurMinOf(r);return m>=b.min&&m<b.max;}).length);
  return {buckets,counts,total:validRows.length};
}
function _yrCoreWindowStat(validRows){
  // 코어 회복구간 23:00~02:00 — sleep_time을 새벽 4시 컷 기준으로 보정(toDawnAdjustedMin, 기존 DAWN_CUTOFF_MIN 관례와 동일)한 뒤 판정.
  // cutoff=240(04:00) 기준: 00:00~03:59는 +1440(1440~1679)으로, 04:00~23:59는 그대로(240~1439)로 이동.
  // → 23:00(1380) 이후 ~ 02:00(다음날, 1440+120=1560) 이전이 코어 구간.
  let inCore=0;
  validRows.forEach(r=>{
    if(!r.sleep_time)return;
    const min=_dawnTimeToMin(r.sleep_time);
    const adjusted=toDawnAdjustedMin(min,4*60);
    if(adjusted>=1380&&adjusted<1560)inCore++;
  });
  return {inCore,outCore:validRows.length-inCore,pct:validRows.length?Math.round(inCore/validRows.length*100):0};
}
// 룰 기반 3~4단계 코멘트(비-API) — 코어구간 사수율 구간에 따라 표현 강도만 다르게.
// 실제 상관계수 계산 없이 흉내: ≥85% 뚜렷하게 / 70~84% 안정적인 편 / 55~69% 약한 경향 / <55%(또는 표본부족) 상관관계 언급 생략
// 룰 기반 코멘트(비-API) — 코어구간 사수율에 수면 규칙성 점수를 더해 교차 판단.
// 코어구간(언제 잤는지)만으론 "이른 시각에 잤다"까지만 알 수 있고, 매일 그 시각이 들쭉날쭉했는지는
// 규칙성 점수가 있어야 판단 가능해 함께 반영(2026-08). 실제 상관계수 계산 없이 두 지표의 조합만으로 표현 강도를 다르게.
function _yrCoreVsDurationComment(corePct,sampleSize,reg){
  if(sampleSize<20)return null; // 표본 부족 — 분포 사실만 서술, 상관관계는 언급하지 않음
  const regScore=reg?reg.score:null;
  if(corePct>=85){
    if(regScore!=null&&regScore>=65)return '사수율도 규칙성도 모두 높아요. 이 구간을 지킨 날일수록 수면시간도 뚜렷하게 안정적으로 이어졌어요.';
    if(regScore!=null&&regScore<40)return '사수율은 높지만 취침·기상 시각 자체는 들쭉날쭉한 편이라, 코어구간을 지킨 날에도 리듬이 완전히 안정적이진 않았어요.';
    return '사수율이 매우 높아요. 이 구간을 지킨 날일수록 수면시간도 뚜렷하게 안정적으로 이어졌어요.';
  }
  if(corePct>=70){
    if(regScore!=null&&regScore>=65)return '사수율이 높은 편이고 규칙성도 함께 좋아서, 전반적으로 안정적인 수면 리듬을 유지했어요.';
    return '사수율이 높은 편이라, 이 구간을 지킨 날일수록 수면시간도 안정적으로 이어지는 편이었어요.';
  }
  if(corePct>=55){
    if(regScore!=null&&regScore<40)return '이 구간을 지킨 날일수록 수면시간이 조금 더 안정적인 경향이 있었지만, 취침·기상 시각 자체의 편차는 큰 편이었어요.';
    return '이 구간을 지킨 날일수록 수면시간이 조금 더 안정적인 경향이 있었어요.';
  }
  if(regScore!=null&&regScore>=65)return '코어구간 사수율은 낮은 편이지만, 취침·기상 시각 자체는 비교적 일정하게 유지했어요.';
  return null;
}
function renderYrSleepTab(ctx){
  const validRows=ctx.sleepRows.filter(r=>r.sleep_time&&r.wake_time);
  if(!validRows.length){document.getElementById('yr-sleep-summary').innerHTML='<div class="empty-msg">기록된 수면이 없어요</div>';return;}

  const {avgMin,avgScore,reg}=_sleepStatsOf(validRows);
  const goalPct=Math.round(validRows.reduce((sum,r)=>{
    const durMin=_sleepDurMinOf(r);
    const pct=durMin>=SLEEP_GOAL_MIN?100:Math.max(0,100-(SLEEP_GOAL_MIN-durMin)/SLEEP_GOAL_MIN*100);
    return sum+pct;
  },0)/validRows.length);

  document.getElementById('yr-sleep-summary').innerHTML=`
    <div class="bento-grid-3 compact-3">
      <div class="bento-item"><div class="bento-lbl">평균 수면시간</div><div class="bento-val">${Math.floor(avgMin/60)}.${Math.round((avgMin%60)/60*10)}<span>h</span></div></div>
      <div class="bento-item"><div class="bento-lbl">평균 컨디션</div><div class="bento-val">${avgScore!=null?avgScore:'-'}<span>점</span></div></div>
      <div class="bento-item"><div class="bento-lbl">목표 달성률</div><div class="bento-val">${goalPct}<span>%</span></div></div>
    </div>`;

  const core=_yrCoreWindowStat(validRows);
  const coreCirc=2*Math.PI*40;
  const coreComment=_yrCoreVsDurationComment(core.pct,validRows.length,reg);

  // 수면 규칙성 — 취침/기상 시각의 표준편차를 100점 만점으로 환산(calcSleepRegularity, 주간/월간 리포트와 동일 계산).
  // 코어구간(언제 잤는지) 옆에 나란히 두어 "얼마나 일정하게 잤는지"를 함께 보여줌(2026-08, 여백 채움 겸 신규 배너).
  const regHtml=reg?`
    <div class="mrsl-half-card">
      <div class="mrsl-half-title">수면 규칙성</div>
      <div class="yr-reg-score-row">
        <div class="yr-reg-score-num" style="color:${reg.color};">${reg.score}<span>점</span></div>
        <div class="yr-reg-badge" style="background:${reg.color};">${reg.label}</div>
      </div>
      <div class="yr-reg-detail">
        <div class="yr-reg-detail-row"><span class="yr-reg-detail-dot" style="background:var(--pal-lavender-text);"></span>취침·기상 평균 편차 ±${reg.avgSd}분</div>
      </div>
    </div>`:'<div class="mrsl-half-card"><div class="mrsl-half-title">수면 규칙성</div><div class="empty-msg" style="padding:20px 0;">계산할 데이터가 부족해요</div></div>';

  document.getElementById('yr-sleep-distribution').innerHTML=`
    <div class="yr-sleep-half-row">
      <div class="mrsl-half-card">
        <div class="mrsl-half-title">코어 구간 점유율</div>
        <div class="donut-stat-wrap" style="margin-top:10px;gap:10px;">
          <div class="donut-svg-box" style="width:76px;height:76px;">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--graph-track-color)" stroke-width="12"></circle>
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--pal-sky-text)" stroke-width="12" stroke-dasharray="${(core.pct/100*coreCirc).toFixed(2)} ${coreCirc.toFixed(2)}" stroke-dashoffset="0"></circle>
            </svg>
            <div class="donut-svg-center"><b>${core.pct}<span style="font-size:12px;">%</span></b></div>
          </div>
          <div style="flex:1;">
            <div style="display:flex;gap:8px;flex-direction:column;">
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--tp);font-weight:600;"><span style="width:10px;height:10px;border-radius:50%;background:var(--pal-sky-text);"></span>사수 ${core.inCore}일</div>
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--tm);font-weight:600;"><span style="width:10px;height:10px;border-radius:50%;background:var(--graph-track-color);"></span>이탈 ${core.outCore}일</div>
            </div>
          </div>
        </div>
      </div>
      ${regHtml}
    </div>
    <div class="insight-box tone-observe" style="margin-top:16px;">
      <i class="ti ti-moon-stars"></i>
      <div><strong>추세:</strong> 취침 시각으로 보면 ${validRows.length}일 중 ${core.inCore}일(${core.pct}%)이 코어 회복 구간(23:00~02:00) 안에 들어왔어요.${coreComment?' '+coreComment:''}</div>
    </div>`;

  renderYrSleepQuarterTime(ctx,validRows);
  renderYrSleepConditionFlow(ctx,validRows);
  renderYrSleepConditionTrace(ctx,validRows);
}

// 분기별 평균 취침·기상 시각 — 완결된 분기까지만(진행중 분기는 그 시점까지 데이터로 계산해 포함).
// 총 수면시간은 이미 상단 요약(전체 평균)에서 다루므로 여기선 시각의 변화에만 집중.
function renderYrSleepQuarterTime(ctx,validRows){
  const el=document.getElementById('yr-sleep-quarter-time');
  if(!el)return;
  const curMonth=ctx.elapsedMonths-1;
  const quarters=listQuartersUpTo(ctx.y,curMonth);
  if(quarters.length<1){el.innerHTML='';return;}

  const cardsHtml=quarters.map(({q,isFuture})=>{
    const range=quarterRangeOf(ctx.y,q).label;
    if(isFuture)return `<div class="ysqt-card empty"><div class="ysqt-range">${range}</div><div class="ysqt-empty">–</div></div>`;
    const {startMonth,endMonth}=quarterRangeOf(ctx.y,q);
    const sDk=`${ctx.y}-${pad(startMonth+1)}-01`;
    const eDk=`${ctx.y}-${pad(Math.min(endMonth,curMonth)+1)}-${pad(new Date(ctx.y,Math.min(endMonth,curMonth)+1,0).getDate())}`;
    const rowsInQ=validRows.filter(r=>r.date_key&&r.date_key>=sDk&&r.date_key<=eDk);
    if(!rowsInQ.length)return `<div class="ysqt-card empty"><div class="ysqt-range">${range}</div><div class="ysqt-empty">기록 없음</div></div>`;

    const sleepMins=rowsInQ.map(r=>toDawnAdjustedMin(_dawnTimeToMin(r.sleep_time),22*60)).filter(v=>v!=null);
    const wakeMins=rowsInQ.map(r=>_dawnTimeToMin(r.wake_time)).filter(v=>v!=null);
    const sleepAvg=sleepMins.length?sleepMins.reduce((a,b)=>a+b,0)/sleepMins.length:null;
    const wakeAvg=wakeMins.length?wakeMins.reduce((a,b)=>a+b,0)/wakeMins.length:null;

    // 24시간 축 위 점 — 22시~다음날14시 범위(16시간 폭)로 그려 취침·기상이 한 화면에 자연스럽게 들어오게 함.
    const axisStart=22*60,axisSpan=16*60; // 22:00 시작, 16시간 폭(22:00~14:00)
    const posOf=min=>{
      if(min==null)return null;
      const adjusted=min>=axisStart?min-axisStart:min+(1440-axisStart);
      return Math.min(100,Math.max(0,adjusted/axisSpan*100));
    };
    const sleepPos=posOf(sleepAvg),wakePos=posOf(wakeAvg);
    const dotsHtml=(sleepPos!=null?`<div class="ysqt-dot sleep" style="left:${sleepPos}%;"></div>`:'')
      +(wakePos!=null?`<div class="ysqt-dot wake" style="left:${wakePos}%;"></div>`:'');

    return `<div class="ysqt-card">
      <div class="ysqt-range">${range}</div>
      <div class="ysqt-axis">${dotsHtml}</div>
      <div class="ysqt-times">
        <span class="ysqt-time sleep">${sleepAvg!=null?_minToHHMM(sleepAvg):'-'}</span>
        <span class="ysqt-time wake">${wakeAvg!=null?_minToHHMM(wakeAvg):'-'}</span>
      </div>
    </div>`;
  }).join('');

  el.innerHTML=`
    <div class="bento-item bento-full">
      <div class="bento-lbl">분기별 취침 · 기상 시각</div>
      <div class="bento-sub" style="margin-top:0;margin-bottom:12px;">분기가 바뀌며 잠들고 일어나는 시각이 어떻게 움직였는지예요.</div>
      <div class="ysqt-grid">${cardsHtml}</div>
      <div class="chart-legend" style="margin-top:12px;">
        <div class="chart-legend-item"><span class="chart-legend-dot" style="background:var(--pal-lavender-text);border-radius:50%;"></span>취침</div>
        <div class="chart-legend-item"><span class="chart-legend-dot" style="background:var(--pal-orange-border);border-radius:50%;"></span>기상</div>
      </div>
    </div>`;
}

// 월별 수면 컨디션 흐름 — 컨디션 점수(sleep.score)만 단독으로. 콤보차트(수면시간+컨디션 결합, 삭제됨)와
// 달리 컨디션 자체의 흐름에만 집중. 라인차트 대신 막대(앱 톤 유지 원칙)로 표현.
function renderYrSleepConditionFlow(ctx,validRows){
  const el=document.getElementById('yr-sleep-condition-flow');
  if(!el)return;
  const scoredRows=validRows.filter(r=>r.score!=null&&!isNaN(r.score));
  if(scoredRows.length<2){el.innerHTML='';return;}

  const monthly=_yrByMonth(ctx,rowsInMonth=>{
    const scored=rowsInMonth.filter(r=>r.score!=null&&!isNaN(r.score));
    return scored.length?Math.round(scored.reduce((a,r)=>a+r.score,0)/scored.length):null;
  },scoredRows);

  const validMonthly=monthly.filter(v=>v!=null);
  if(validMonthly.length<2){el.innerHTML='';return;}

  const maxScore=Math.max(...validMonthly,1);
  const barsHtml=monthly.map((v,i)=>{
    if(v==null)return `<div class="c-bar-col"><div class="c-val">-</div><div class="c-bar" style="height:0%"></div></div>`;
    const pct=Math.round(v/maxScore*100);
    return `<div class="c-bar-col"><div class="c-val">${v}점</div><div class="c-bar" style="height:${pct}%;background:rgba(190,225,205,0.75);"></div></div>`;
  }).join('');
  const labelsHtml=monthly.map((_,i)=>`<span>${i+1}월</span>`).join('');

  el.innerHTML=`
    <div class="bento-item bento-full">
      <div class="bento-lbl">월별 수면 컨디션 흐름</div>
      <div class="bento-sub" style="margin-top:0;">그달의 평균 컨디션 점수예요.</div>
      <div class="combo-wrap" style="height:120px;">
        <div class="combo-bars">${barsHtml}</div>
        <div class="combo-labels">${labelsHtml}</div>
      </div>
    </div>`;
}

// 컨디션 낮은 날, 전날의 공통점 — 단일 원인으로 단정하지 않고 여러 요인(업무·외출·휴식시간, 취침시각,
// 전날 컨디션)을 동시에 계산해 유의미하게 차이나는 것만 전부 나열. 하나만 골라 "이것 때문"이라고 말하는 건
// 성급한 단정이라는 피드백 반영(2026-08) — 복합 요인을 있는 그대로 보여주는 게 정직하다는 원칙.
// 대상 날짜는 "전날"(date_key-1) — sleep.date_key는 기상일 기준이라 그 전날이 실제로 깨어있던 낮 시간대.
function renderYrSleepConditionTrace(ctx,validRows){
  const el=document.getElementById('yr-sleep-condition-trace');
  if(!el)return;
  const scoredRows=validRows.filter(r=>r.score!=null&&!isNaN(r.score)&&r.date_key);
  if(scoredRows.length<20){el.innerHTML='';return;} // 표본 부족 — 하위 30%를 나눠도 의미있는 비교가 안 됨

  const sorted=[...scoredRows].sort((a,b)=>a.score-b.score);
  const lowCount=Math.max(10,Math.round(sorted.length*0.3));
  if(lowCount>=sorted.length){el.innerHTML='';return;}
  const lowRows=sorted.slice(0,lowCount),restRows=sorted.slice(lowCount);
  const lowDates=new Set(lowRows.map(r=>r.date_key));
  const restDates=new Set(restRows.map(r=>r.date_key));

  const prevDateKeyOf=dk=>{
    const d=new Date(dk+'T00:00:00');
    d.setDate(d.getDate()-1);
    return dateKey(d);
  };
  const lowPrevDates=[...lowDates].map(prevDateKeyOf);
  const restPrevDates=[...restDates].map(prevDateKeyOf);
  const lowPrevSet=new Set(lowPrevDates),restPrevSet=new Set(restPrevDates);

  // 요인1~3: 업무/외출/휴식 — 전날 rblocks 카테고리별 일평균(분)
  const avgByCat=(prevDateSet)=>{
    const byDate={};
    ctx.rblocks.forEach(b=>{
      if(!b.date_key||!prevDateSet.has(b.date_key))return;
      (byDate[b.date_key]=byDate[b.date_key]||[]).push(b);
    });
    const dateList=Object.keys(byDate);
    if(!dateList.length)return {};
    const agg={};
    dateList.forEach(dk=>{
      const {d}=_rhythmDurByCat(byDate[dk]);
      Object.entries(d).forEach(([k,v])=>{agg[k]=(agg[k]||0)+v;});
    });
    const avg={};
    Object.keys(agg).forEach(k=>{avg[k]=agg[k]/dateList.length;});
    return avg;
  };
  const lowCatAvg=avgByCat(lowPrevSet),restCatAvg=avgByCat(restPrevSet);

  // 요인4: 취침시각 — 전날 밤 취침시각(22시 cutoff 보정). 전날 자체가 sleep row로 존재해야 계산 가능
  // (연속된 이틀치 sleep 기록이 필요 — 전날에 기록이 없으면 그 날짜는 자연히 제외됨).
  const sleepByDk={};
  validRows.forEach(r=>{if(r.date_key&&r.sleep_time)sleepByDk[r.date_key]=toDawnAdjustedMin(_dawnTimeToMin(r.sleep_time),22*60);});
  const avgSleepTimeOf=dateList=>{
    const vals=dateList.map(dk=>sleepByDk[dk]).filter(v=>v!=null);
    return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  };
  const lowSleepTimeAvg=avgSleepTimeOf(lowPrevDates),restSleepTimeAvg=avgSleepTimeOf(restPrevDates);

  // 요인5: 전날 컨디션 — 전날 자체의 sleep.score(컨디션 자기상관 — 컨디션 저하가 며칠 이어지는지)
  const scoreByDk={};
  scoredRows.forEach(r=>{scoreByDk[r.date_key]=r.score;});
  const avgScoreOf=dateList=>{
    const vals=dateList.map(dk=>scoreByDk[dk]).filter(v=>v!=null);
    return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  };
  const lowPrevScoreAvg=avgScoreOf(lowPrevDates),restPrevScoreAvg=avgScoreOf(restPrevDates);

  // 5개 요인을 같은 형식으로 모아서 유의미한 차이(임계값 이상)만 필터링, 차이가 큰 순으로 정렬
  const factors=[];
  ['work','appointment','rest'].forEach(k=>{
    const low=lowCatAvg[k]||0,rest=restCatAvg[k]||0;
    if(low===0&&rest===0)return;
    factors.push({type:'duration',key:k,label:RHYTHM_CATS[k].label,icon:RHYTHM_CATS[k].icon,color:RHYTHM_CATS[k].color,diff:low-rest,low,rest,thresholdMin:10});
  });
  if(lowSleepTimeAvg!=null&&restSleepTimeAvg!=null){
    factors.push({type:'time',key:'sleeptime',label:'취침시각',icon:'ti-moon',color:'var(--pal-lavender-text)',diff:lowSleepTimeAvg-restSleepTimeAvg,low:lowSleepTimeAvg,rest:restSleepTimeAvg,thresholdMin:15});
  }
  if(lowPrevScoreAvg!=null&&restPrevScoreAvg!=null){
    factors.push({type:'score',key:'prevscore',label:'전날 컨디션',icon:'ti-mood-empty',color:'var(--pal-sky-text)',diff:lowPrevScoreAvg-restPrevScoreAvg,low:lowPrevScoreAvg,rest:restPrevScoreAvg,thresholdMin:8});
  }

  const significant=factors.filter(f=>Math.abs(f.diff)>=f.thresholdMin).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));

  if(!significant.length){
    el.innerHTML=`
      <div class="bento-item bento-full">
        <div class="bento-lbl">컨디션 낮은 날, 전날의 공통점</div>
        <div class="insight-box tone-observe" style="margin-top:8px;"><i class="ti ti-search"></i><div><strong>관찰:</strong> 컨디션이 낮았던 날의 전날에서 뚜렷한 공통점은 아직 보이지 않아요.</div></div>
      </div>`;
    return;
  }

  const rowsHtml=significant.map(f=>{
    let descText;
    if(f.type==='duration'){
      const moreOrLess=f.diff>0?'더 많았어요':'더 적었어요';
      descText=`전날 평균 ${_fmtDur(Math.round(f.low))} <span class="yr-ctrace-diff">(평소보다 ${f.diff>0?'+':''}${_fmtDur(Math.round(Math.abs(f.diff)))})</span> — 평소보다 ${moreOrLess}`;
    }else if(f.type==='time'){
      const laterOrEarlier=f.diff>0?'늦음':'이름';
      descText=`평균 ${_minToHHMM(f.low)} <span class="yr-ctrace-diff">(평소보다 ${_fmtDur(Math.round(Math.abs(f.diff)))} ${laterOrEarlier})</span>`;
    }else{
      const higherOrLower=f.diff>0?'높음':'낮음';
      descText=`평균 ${Math.round(f.low)}점 <span class="yr-ctrace-diff">(평소보다 ${f.diff>0?'+':''}${Math.round(f.diff)}점 ${higherOrLower})</span>`;
    }
    return `<div class="yr-ctrace-row">
      <div class="yr-ctrace-icon" style="background:${f.color};"><i class="ti ${f.icon}" aria-hidden="true"></i></div>
      <div class="yr-ctrace-body">
        <div class="yr-ctrace-title">${escapeHtml(f.label)}</div>
        <div class="yr-ctrace-desc">${descText}</div>
      </div>
    </div>`;
  }).join('');

  // 관찰 문장 — 걸린 요인 조합에 따라 톤만 다르게(비-API, 템플릿 조합)
  const hitKeys=new Set(significant.map(f=>f.key));
  let observeText;
  if((hitKeys.has('work')||hitKeys.has('appointment'))&&hitKeys.has('sleeptime')){
    observeText='활동(업무·외출)이 길었던 날일수록 취침도 늦어지는 경향이 함께 나타났어요.';
  }else if(hitKeys.has('prevscore')){
    observeText='컨디션이 하루이틀 이어서 낮게 나타나는 흐름도 보여요.';
  }else{
    observeText='컨디션이 낮았던 날의 전날엔 몇 가지 특징이 함께 나타났어요.';
  }

  el.innerHTML=`
    <div class="bento-item bento-full">
      <div class="bento-lbl">컨디션 낮은 날, 전날의 공통점</div>
      <div class="bento-sub" style="margin-top:0;margin-bottom:12px;">컨디션 하위 ${lowCount}일의 전날을, 그 외 날의 전날과 비교했어요.</div>
      <div class="yr-ctrace-list">${rowsHtml}</div>
      <div class="insight-box tone-observe" style="margin-top:12px;">
        <i class="ti ti-search"></i>
        <div><strong>관찰:</strong> ${observeText} 하나가 직접적인 원인이라 단정할 순 없지만, 여러 요인이 겹쳐 나타난다는 점은 참고할 만해요.</div>
      </div>
    </div>`;
}
