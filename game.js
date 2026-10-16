/* ATLAS UA 1.8 — a LOCAL fictional air-alert simulator.
   Never uses real alerts, real-time intelligence, or operational weapon data.
   All values are browser-local and not shared between visitors. */
'use strict';
(() => {
 const api=window.ATLAS_MAP_API;
 if(!api){console.error('ATLAS: map API missing');return;}
 const el=id=>document.getElementById(id);
 const STORE='atlas_ua_game_1_5'; // Migration: keep the stage 1.5 key and saved levels
 const words={
  uk:{
   simEyebrow:'МОДУЛЬ 02 / СИМУЛЯЦІЯ',simHeading:'Центр тривог',simTag:'ЛОКАЛЬНО',
   simIntro:'Вигадана навчальна симуляція. Не показує реальних тривог.',redCounterLabel:'ЧЕРВОНИЙ',yellowCounterLabel:'ЖОВТИЙ',totalCounterLabel:'РАЙОНИ',
   modeManual:'Ручний',modeAuto:'Авто',simTargetCaption:'ОБРАНІ РАЙОНИ',none:'Оберіть район на мапі або в пошуку',
   labelLevelOff:'Зняти',labelLevelYellow:'Жовтий',labelLevelRed:'Червоний',simHint:'Виберіть район для керування тривогою.',
   hintSelected:'Ctrl + клік: вибрати кілька районів. Зміна застосовується до всіх.',hintAuto:'Авто: виділіть райони та натисніть «Запустити сценарій». Випадкових тривог немає.',
   simClockLabel:'ІГРОВИЙ ЧАС',simSpeedLabel:'Швидкість · 1× = 3 хв / 1 реальна хв',simRandomLabel:'▶ Запустити сценарій',simResetLabel:'Скинути',
   gameSearchLabel:'ШВИДКИЙ ПОШУК РАЙОНУ',gameSearchPlaceholder:'Назва району…',gameNoMatches:'Не знайдено',tabGame:'Симуляція',tabGeography:'Географія',simLogHeading:'ЖУРНАЛ ПОДІЙ',mapAlertLabel:'ІГРОВІ ТРИВОГИ',autoIndicator:'АВТО',manualIndicator:'РУЧНИЙ',
   simPause:'Пауза',simPlay:'Продовжити',simEmptyLog:'Поки немає подій. Оберіть район і змініть рівень.',
   confirmTitle:'Скинути симуляцію?',confirmDetail:'Усі навчальні тривоги, події та ігровий час будуть скинуті.',confirmCancel:'Скасувати',confirmAccept:'Скинути',
   reasonManual:'вручну',reasonAuto:'автоматично',levelOff:'тривогу знято',levelYellow:'жовтий рівень',levelRed:'червоний рівень',
   modeSetAuto:'Автоматичний режим увімкнено (без випадкових подій)',modeSetManual:'Увімкнено ручний режим',resume:'Час відновлено',pause:'Час призупинено',
   reset:'Симуляцію скинуто',defaultRegion:'Україна',demo:'ДЕМО · НЕ РЕАЛЬНІ ТРИВОГИ'
  },
  ru:{
   simEyebrow:'МОДУЛЬ 02 / СИМУЛЯЦИЯ',simHeading:'Центр тревог',simTag:'ЛОКАЛЬНО',
   simIntro:'Вымышленная учебная симуляция. Не показывает реальные тревоги.',redCounterLabel:'КРАСНЫЙ',yellowCounterLabel:'ЖЁЛТЫЙ',totalCounterLabel:'РАЙОНЫ',
   modeManual:'Ручной',modeAuto:'Авто',simTargetCaption:'ВЫБРАННЫЕ РАЙОНЫ',none:'Выбери район на карте или в поиске',
   labelLevelOff:'Снять',labelLevelYellow:'Жёлтый',labelLevelRed:'Красный',simHint:'Выбери район для управления тревогой.',
   hintSelected:'Ctrl + клик: выбери несколько районов. Уровень изменится для всех.',hintAuto:'Авто: выдели районы и нажми «Запустить сценарий». Случайных тревог нет.',
   simClockLabel:'ИГРОВОЕ ВРЕМЯ',simSpeedLabel:'Скорость · 1× = 3 мин / 1 реальная мин',simRandomLabel:'▶ Запустить сценарий',simResetLabel:'Сбросить',
   gameSearchLabel:'БЫСТРЫЙ ПОИСК РАЙОНА',gameSearchPlaceholder:'Название района…',gameNoMatches:'Не найдено',tabGame:'Симуляция',tabGeography:'География',simLogHeading:'ЖУРНАЛ СОБЫТИЙ',mapAlertLabel:'ИГРОВЫЕ ТРЕВОГИ',autoIndicator:'АВТО',manualIndicator:'РУЧНОЙ',
   simPause:'Пауза',simPlay:'Продолжить',simEmptyLog:'Пока нет событий. Выбери район и измени уровень.',
   confirmTitle:'Сбросить симуляцию?',confirmDetail:'Все учебные тревоги, события и игровое время будут сброшены.',confirmCancel:'Отмена',confirmAccept:'Сбросить',
   reasonManual:'вручную',reasonAuto:'автоматически',levelOff:'тревога снята',levelYellow:'жёлтый уровень',levelRed:'красный уровень',
   modeSetAuto:'Автоматический режим включён (без случайных событий)',modeSetManual:'Включён ручной режим',resume:'Время возобновлено',pause:'Время остановлено',
   reset:'Симуляция сброшена',defaultRegion:'Украина',demo:'ДЕМО · НЕ РЕАЛЬНЫЕ ТРЕВОГИ'
  }
 };
 // Illustrative event categories only. No real warning thresholds or weapons data.
 const threatClasses={
  uav:{level:'yellow',uk:'Навчальний БПЛА',ru:'Учебный БПЛА'},
  ballistic:{level:'red',uk:'Умовна балістична загроза',ru:'Условная баллистическая угроза'},
  kab:{level:'red',uk:'Умовна авіаційна загроза',ru:'Условная авиационная угроза'},
  banderole:{level:'red',uk:'Умовний об’єкт «Бандероль»',ru:'Условный объект «Бандероль»'},
  missile:{level:'red',uk:'Умовна ракетна загроза',ru:'Условная ракетная угроза'}
 };
 const state={levels:new Map(),started:new Map(),mode:'manual',speed:1,paused:false,time:0,events:[],nextEvent:12,allFeatures:[],scenario:null};
 let selected=[], language=api.getLanguage(), lastClock=-1, lastTick=performance.now();
 function tr(){return words[language]||words.uk;}
 function formatTime(total){
  const s=Math.max(0,Math.floor(total));
  return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':');
 }
 function getLevel(feature){return state.levels.get(api.getKey(feature))||'off';}
 function getAlertInfo(feature){
  const level=getLevel(feature),started=state.started.get(api.getKey(feature));
  return {level,durationSeconds:level==='off'?0:Math.max(0,state.time-(started??state.time)),durationText:formatTime(level==='off'?0:Math.max(0,state.time-(started??state.time)))};
 }
 function read(){
  try{
   const data=JSON.parse(localStorage.getItem(STORE)||'null');
   if(!data||![1,2].includes(data.version))return;
   if(Array.isArray(data.levels))for(const pair of data.levels){
    if(Array.isArray(pair)&&typeof pair[0]==='string'&&['red','yellow'].includes(pair[1])&&pair[0].length<250)state.levels.set(pair[0],pair[1]);
   }
   if(data.version===2&&Array.isArray(data.started))for(const pair of data.started){if(Array.isArray(pair)&&typeof pair[0]==='string'&&Number.isFinite(pair[1]))state.started.set(pair[0],pair[1]);}
   if(data.mode==='auto'||data.mode==='manual')state.mode=data.mode;
   if([1,2,3,4,5].includes(data.speed))state.speed=data.speed;
   if(typeof data.paused==='boolean')state.paused=data.paused;
   if(Number.isFinite(data.time)&&data.time>=0&&data.time<100000000)state.time=data.time;
   if(Array.isArray(data.events))state.events=data.events.filter(e=>e&&typeof e==='object'&&Number.isFinite(e.time)).slice(-24);
   // Migration from 1.6: clear stored random auto alerts identifiable in its event log.
   if(data.version<=2){
    for(const event of [...state.events].reverse()){
     if(event.type!=='level'||!event.name||event.origin!=='auto')continue;
     const suffix='|'+String(event.name).toLocaleLowerCase('uk');
     for(const key of [...state.levels.keys()])if(key.endsWith(suffix)){
      const later=state.events.some(e=>e.type==='level'&&e.name===event.name&&e.origin==='manual'&&e.time>event.time);
      if(!later){state.levels.delete(key);state.started.delete(key);}
     }
    }
   }
   // Stage 1.5 had no alarm-start timestamps; recover them from its log when possible.
   for(const [key,level] of state.levels){
    if(state.started.has(key))continue;
    const name=key.split('|').slice(1).join('|');
    const found=[...state.events].reverse().find(e=>e.type==='level'&&String(e.name||'').toLocaleLowerCase('uk')===name&&e.level===level);
    state.started.set(key,found?found.time:state.time);
   }
  }catch(e){console.warn('Local game save could not be restored',e);}
 }
 let saveTimer=0;
 function saveSoon(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
   try{localStorage.setItem(STORE,JSON.stringify({version:2,levels:[...state.levels],started:[...state.started],mode:state.mode,speed:state.speed,paused:state.paused,time:state.time,events:state.events.slice(-24)}));}
   catch(e){console.warn('Local storage unavailable',e);}
  },250);
 }
 function log(event){
  state.events.push({time:Math.floor(state.time),...event});
  if(state.events.length>24)state.events.splice(0,state.events.length-24);
  renderEvents();saveSoon();
 }
 function eventCaption(e){
  const t=tr();
  if(e.type==='scenarioStart'){const cl=threatClasses[e.threat]||threatClasses.uav;return (language==='uk'?'Запущено сценарій: ':'Запущен сценарий: ')+cl[language];}
  if(e.type==='levelBulk')return `${e.count} ${language==='uk'?'районів':'районов'} · ${t['level'+(e.level==='red'?'Red':e.level==='yellow'?'Yellow':'Off')]}`;
  if(e.type==='level')return `${e.name||'—'} · ${t['level'+(e.level==='red'?'Red':e.level==='yellow'?'Yellow':'Off')]} (${e.origin==='auto'?t.reasonAuto:t.reasonManual})`;
  return t[e.type]||'';
 }
 function renderEvents(){
  const container=el('simEvents');container.replaceChildren();
  el('simEventCount').textContent=String(state.events.length);
  if(!state.events.length){const li=document.createElement('li');li.className='sim-empty';li.textContent=tr().simEmptyLog;container.append(li);return;}
  for(const e of [...state.events].reverse().slice(0,9)){
   const li=document.createElement('li'),time=document.createElement('time'),text=document.createElement('span'),dot=document.createElement('i');
   li.className='sim-log-item'; dot.className='sim-event-dot '+(e.level||'neutral');
   time.textContent=formatTime(e.time).slice(0,8);text.textContent=eventCaption(e);
   li.append(dot,text,time);container.append(li);
  }
 }
 function renderHits(){
  const input=el('gameSearch');const term=input.value.trim().toLocaleLowerCase('uk');
  const view=el('gameHits');view.replaceChildren();
  if(term.length<2)return;
  const hits=state.allFeatures.filter(f=>(api.getName(f)+' '+api.getRegion(f)).toLocaleLowerCase('uk').includes(term)).slice(0,7);
  if(!hits.length){const empty=document.createElement('div');empty.className='game-hit-empty';empty.textContent=tr().gameNoMatches;view.append(empty);return;}
  for(const feature of hits){
   const button=document.createElement('button');button.type='button';button.className='game-hit';
   const name=document.createElement('strong');name.textContent=api.getName(feature);
   const region=document.createElement('small');region.textContent=api.getRegion(feature);
   button.append(name,region);
   button.addEventListener('click',e=>{input.value='';renderHits();api.focus(feature,e.ctrlKey||e.metaKey);});
   view.append(button);
  }
 }
 function setView(view){
  const game=view==='game';
  el('gameView').hidden=!game;el('geoView').hidden=game;
  el('tabGame').classList.toggle('active',game);el('tabGeography').classList.toggle('active',!game);
  el('tabGame').setAttribute('aria-pressed',String(game));el('tabGeography').setAttribute('aria-pressed',String(!game));
  const scroll=document.querySelector('.side-scroll');if(scroll)scroll.scrollTop=0;
 }
 function counts(){
  let red=0,yellow=0;
  for(const level of state.levels.values()){if(level==='red')red++;if(level==='yellow')yellow++;}
  return {red,yellow};
 }
 function renderCounts(){
  const {red,yellow}=counts();
  el('redCounter').textContent=red;el('yellowCounter').textContent=yellow;el('totalCounter').textContent=red+yellow;
  el('mapRedCount').textContent=red;el('mapYellowCount').textContent=yellow;
  el('mapAutoIndicator').textContent=state.mode==='auto'?tr().autoIndicator:tr().manualIndicator;
  el('mapAutoIndicator').classList.toggle('auto',state.mode==='auto');
 }
 function renderTarget(){
  const t=tr(),disabled=!selected.length||state.mode==='auto';
  el('simTargetName').textContent=!selected.length?t.none:selected.length===1?api.getName(selected[0]):(language==='uk'?`Вибрано ${selected.length} районів`:`Выбрано районов: ${selected.length}`);
  el('simTargetRegion').textContent=selected.length===1?api.getRegion(selected[0]):selected.length?(language==='uk'?'Спільне керування · Ctrl + клік':'Общее управление · Ctrl + клик'):'';
  el('simHint').textContent=state.mode==='auto'?t.hintAuto:selected.length?t.hintSelected:t.simHint;
  for(const key of ['Off','Yellow','Red']){
   const button=el('level'+key);button.disabled=disabled;
   const current=selected.length&&selected.every(f=>getLevel(f)===key.toLowerCase());
   button.classList.toggle('current',!!current);
   button.setAttribute('aria-pressed',String(!!current));
  }
 }
 function renderMode(){
  const auto=state.mode==='auto';
  el('modeManual').classList.toggle('active',!auto);el('modeAuto').classList.toggle('active',auto);
  el('modeManual').setAttribute('aria-pressed',String(!auto));el('modeAuto').setAttribute('aria-pressed',String(auto));
  el('pauseSimulation').textContent=state.paused?'▶':'Ⅱ';
  el('pauseSimulation').setAttribute('aria-label',state.paused?tr().simPlay:tr().simPause);
  el('pauseSimulation').setAttribute('aria-pressed',String(state.paused));
  for(const b of document.querySelectorAll('[data-speed]'))b.classList.toggle('selected',Number(b.dataset.speed)===state.speed);
  renderTarget();renderCounts();
 }
 function renderLanguage(){
  const t=tr();
  for(const k of ['simEyebrow','simTag','simIntro','redCounterLabel','yellowCounterLabel','totalCounterLabel','simTargetCaption','labelLevelOff','labelLevelYellow','labelLevelRed','simClockLabel','simSpeedLabel','simRandomLabel','simResetLabel','gameSearchLabel','simLogHeading','mapAlertLabel','confirmTitle','confirmDetail','confirmCancel','confirmAccept']){
   el(k).textContent=t[k];
  }
  el('simHeading').replaceChildren(document.createTextNode(t.simHeading),Object.assign(document.createElement('span'),{className:'game-spark',textContent:'.'}));
  el('modeManual').textContent=t.modeManual;el('modeAuto').textContent=t.modeAuto;
  el('gameSearch').placeholder=t.gameSearchPlaceholder;el('tabGame').lastElementChild.textContent=t.tabGame;el('tabGeography').lastElementChild.textContent=t.tabGeography;
  renderHits();
  el('scenarioThreatLabel').textContent=language==='uk'?'ТИП ІГРОВОЇ ПОДІЇ':'ТИП ИГРОВОГО СОБЫТИЯ';
  el('scenarioThreatHelp').textContent=language==='uk'?'Авто: жовтий для БПЛА; червоний тільки для обраних небезпечних класів. Ігрові правила, не реальний прогноз.':'Авто: жёлтый для БПЛА; красный только для выбранных опасных классов. Игровые правила, не реальный прогноз.';
  for(const opt of el('scenarioThreat').options){const c=threatClasses[opt.value];if(c)opt.textContent=c[language];}
  renderMode();renderEvents();statusScenario();
 }
 function alertSetMany(features,level,origin='manual'){
  if(!features.length||!['off','yellow','red'].includes(level))return;
  let changed=0;
  for(const feature of features){
   const key=api.getKey(feature),old=getLevel(feature);if(level===old)continue;
   if(level==='off'){state.levels.delete(key);state.started.delete(key);}
   else {state.levels.set(key,level);state.started.set(key,state.time);}
   api.repaint(feature);changed++;
   if(features.length===1)log({type:'level',level,name:api.getName(feature),region:api.getRegion(feature),origin});
  }
  if(!changed)return;
  if(features.length!==1)log({type:'levelBulk',level,count:changed,origin});
  renderCounts();renderTarget();window.dispatchEvent(new CustomEvent('atlas:alerts-changed'));
 }
 function alertSet(feature,level,origin='manual'){if(feature)alertSetMany([feature],level,origin);}
 function setMode(mode){
  if(!['manual','auto'].includes(mode)||state.mode===mode)return;
  state.mode=mode;state.nextEvent=state.time+15;if(mode==='manual')stopScenario();
  renderMode();statusScenario();log({type:mode==='auto'?'modeSetAuto':'modeSetManual'});
 }
 // Deterministic *explicitly started* fictional scenario; never pick random real districts.
 // Times are fictional game phases, not ETA or predictions of real aerial threats.
 function statusScenario(){
  const node=el('scenarioStatus');if(!node)return;
  const s=state.scenario;
  const uk=language==='uk';
  node.textContent=s?(uk?`Сценарій: ${threatClasses[s.threat]?.uk||threatClasses.uav.uk} · ${s.names.join(', ')} · етап ${Math.max(1,s.phase+1)}/3`:`Сценарий: ${threatClasses[s.threat]?.ru||threatClasses.uav.ru} · ${s.names.join(', ')} · этап ${Math.max(1,s.phase+1)}/3`):
   (uk?'Авто: виберіть район та запустіть навчальний сценарій. Без випадкових тривог.':'Авто: выбери район и запусти учебный сценарий. Без случайных тревог.');
 }
 function startScenario(){
  if(!selected.length){statusScenario();el('scenarioStatus').textContent=language==='uk'?'Спершу виберіть район на мапі (Ctrl + клік — кілька).':'Сначала выбери район на карте (Ctrl + клик — несколько).';return;}
  if(state.mode!=='auto')setMode('auto');
  const threat=Object.hasOwn(threatClasses,el('scenarioThreat').value)?el('scenarioThreat').value:'uav';
  state.scenario={keys:selected.map(api.getKey),names:selected.map(api.getName),start:state.time,phase:-1,threat};
  // The selected district names are used only to select visual alert polygons.
  statusScenario();log({type:'scenarioStart',threat:state.scenario.threat});
 }
 function stopScenario(){state.scenario=null;statusScenario();}
 function advanceScenario(){
  const s=state.scenario;if(!s)return;
  const since=state.time-s.start;
  const phase=since>=90?3:since>=42?2:since>=12?1:since>=3?0:-1;
  if(phase===s.phase)return;
  s.phase=phase;
  if(phase<0)return;
  const features=state.allFeatures.filter(f=>s.keys.includes(api.getKey(f)));
  if(features.length&&(phase===0||phase===2))alertSetMany(features,phase===2?'off':(threatClasses[s.threat]?.level||'yellow'),'auto');
  if(phase>=2)stopScenario();else statusScenario();
 }
 function tick(){
  const now=performance.now();const delta=Math.min(2,Math.max(0,(now-lastTick)/1000));lastTick=now;
  if(state.paused)return;
  state.time+=delta*3*state.speed;
  if(Math.floor(state.time)!==lastClock){lastClock=Math.floor(state.time);el('simClock').textContent=formatTime(state.time);saveSoon();}
  if(state.mode==='auto')advanceScenario();
 }
 function reset(){
  state.levels.clear();state.started.clear();state.mode='manual';state.speed=1;state.paused=false;
  state.time=0;state.nextEvent=36;state.scenario=null;state.events=[];lastTick=performance.now();lastClock=-1;
  api.repaintAll();window.dispatchEvent(new CustomEvent('atlas:alerts-changed'));window.dispatchEvent(new CustomEvent('atlas:game-reset'));
  renderMode();statusScenario();el('simClock').textContent='00:00:00';log({type:'reset'});
 }
 read();
 window.ATLAS_GAME={getLevel,getAlertInfo,getTime:()=>state.time,getSpeed:()=>state.speed,isPaused:()=>state.paused,startScenario,getScenario:()=>state.scenario&&({...state.scenario}),getThreatClasses:()=>({...threatClasses})};
 // Important: the basemap and all existing geography controls stay untouched.
 window.addEventListener('atlas:select',e=>{selected=e.detail?.features||[];renderTarget();});
 window.addEventListener('atlas:districts-ready',e=>{
  state.allFeatures=e.detail.features||[];
  // Remove saved entries from obsolete datasets to keep stats accurate.
  const valid=new Set(state.allFeatures.map(api.getKey));
  for(const key of state.levels.keys())if(!valid.has(key)){state.levels.delete(key);state.started.delete(key);}
  renderCounts();renderTarget();renderHits();saveSoon();
 });
 window.addEventListener('atlas:language',e=>{language=e.detail?.lang||api.getLanguage();renderLanguage();});
 el('tabGame').addEventListener('click',()=>setView('game'));
 el('tabGeography').addEventListener('click',()=>setView('geo'));
 el('gameSearch').addEventListener('input',renderHits);
 el('modeManual').addEventListener('click',()=>setMode('manual'));
 el('modeAuto').addEventListener('click',()=>setMode('auto'));
 for(const level of ['Off','Yellow','Red'])el('level'+level).addEventListener('click',()=>{
  if(state.mode==='manual'&&selected.length)alertSetMany(selected,level.toLowerCase());
 });
 el('pauseSimulation').addEventListener('click',()=>{
  state.paused=!state.paused;lastTick=performance.now();renderMode();log({type:state.paused?'pause':'resume'});
 });
 for(const button of document.querySelectorAll('[data-speed]'))button.addEventListener('click',()=>{
  state.speed=Number(button.dataset.speed);renderMode();saveSoon();
 });
 el('simRandomDistrict').addEventListener('click',startScenario);
 el('simReset').addEventListener('click',()=>{
  const dialog=el('simConfirm');if(typeof dialog.showModal==='function')dialog.showModal();else if(confirm(tr().confirmTitle))reset();
 });
 el('simConfirm').addEventListener('close',()=>{if(el('simConfirm').returnValue==='reset')reset();});
 document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,dialog'))return;
  if(state.mode!=='manual'||!selected.length)return;
  const wanted={'0':'off','1':'yellow','2':'red'}[e.key];
  if(wanted)alertSetMany(selected,wanted,'manual');
 });
 el('simClock').textContent=formatTime(state.time);
 language=api.getLanguage();renderLanguage();
 state.nextEvent=state.time+30;
 setInterval(tick,250);
 setInterval(()=>{
  const tip=document.querySelector('.leaflet-tooltip.district-tooltip');
  const feature=window.ATLAS_HOVER_FEATURE;
  if(!tip||!feature)return;
  const info=getAlertInfo(feature),status=tip.querySelector('.district-tip-status'),duration=tip.querySelector('.district-tip-duration');
  if(status){
   status.className='district-tip-status tip-'+info.level;
   status.textContent=language==='uk'?(info.level==='red'?'● Червона тривога':info.level==='yellow'?'● Жовта тривога':'● Тривоги немає'):(info.level==='red'?'● Красная тревога':info.level==='yellow'?'● Жёлтая тревога':'● Тревоги нет');
  }
  if(duration)duration.textContent=(language==='uk'?'Час тривоги: ':'Время тревоги: ')+(info.level==='off'?'—':info.durationText);
 },1000);
 window.addEventListener('pagehide',()=>{
  clearTimeout(saveTimer);
  try{localStorage.setItem(STORE,JSON.stringify({version:2,levels:[...state.levels],started:[...state.started],mode:state.mode,speed:state.speed,paused:state.paused,time:state.time,events:state.events.slice(-24)}));}catch(_){/* storage optional */}
 });
})();
