/* ATLAS UA 1.5 — a LOCAL fictional air-alert simulator.
   Never uses real alerts, real-time intelligence, or operational weapon data.
   All values are browser-local and not shared between visitors. */
'use strict';
(() => {
 const api=window.ATLAS_MAP_API;
 if(!api){console.error('ATLAS: map API missing');return;}
 const el=id=>document.getElementById(id);
 const STORE='atlas_ua_game_1_5';
 const words={
  uk:{
   simEyebrow:'МОДУЛЬ 02 / СИМУЛЯЦІЯ',simHeading:'Центр тривог',simTag:'ЛОКАЛЬНО',
   simIntro:'Вигадана навчальна симуляція. Не показує реальних тривог.',redCounterLabel:'ЧЕРВОНИЙ',yellowCounterLabel:'ЖОВТИЙ',totalCounterLabel:'РАЙОНИ',
   modeManual:'Ручний',modeAuto:'Авто',simTargetCaption:'ОБРАНИЙ РАЙОН',none:'Оберіть район на мапі або в пошуку',
   labelLevelOff:'Зняти',labelLevelYellow:'Жовтий',labelLevelRed:'Червоний',simHint:'Виберіть район для керування тривогою.',
   hintSelected:'Змініть навчальний рівень для вибраного району.',hintAuto:'Автоматичний ігровий сценарій активний. Для ручного керування оберіть «Ручний».',
   simClockLabel:'ІГРОВИЙ ЧАС',simSpeedLabel:'Швидкість',simRandomLabel:'Випадковий район',simResetLabel:'Скинути',
   gameSearchLabel:'ШВИДКИЙ ПОШУК РАЙОНУ',gameSearchPlaceholder:'Назва району…',gameNoMatches:'Не знайдено',tabGame:'Симуляція',tabGeography:'Географія',simLogHeading:'ЖУРНАЛ ПОДІЙ',mapAlertLabel:'ІГРОВІ ТРИВОГИ',autoIndicator:'АВТО',manualIndicator:'РУЧНИЙ',
   simPause:'Пауза',simPlay:'Продовжити',simEmptyLog:'Поки немає подій. Оберіть район і змініть рівень.',
   confirmTitle:'Скинути симуляцію?',confirmDetail:'Усі навчальні тривоги, події та ігровий час будуть скинуті.',confirmCancel:'Скасувати',confirmAccept:'Скинути',
   reasonManual:'вручну',reasonAuto:'автоматично',levelOff:'тривогу знято',levelYellow:'жовтий рівень',levelRed:'червоний рівень',
   modeSetAuto:'Запущено автоматичний сценарій',modeSetManual:'Увімкнено ручний режим',resume:'Час відновлено',pause:'Час призупинено',
   reset:'Симуляцію скинуто',defaultRegion:'Україна',demo:'ДЕМО · НЕ РЕАЛЬНІ ТРИВОГИ'
  },
  ru:{
   simEyebrow:'МОДУЛЬ 02 / СИМУЛЯЦИЯ',simHeading:'Центр тревог',simTag:'ЛОКАЛЬНО',
   simIntro:'Вымышленная учебная симуляция. Не показывает реальные тревоги.',redCounterLabel:'КРАСНЫЙ',yellowCounterLabel:'ЖЁЛТЫЙ',totalCounterLabel:'РАЙОНЫ',
   modeManual:'Ручной',modeAuto:'Авто',simTargetCaption:'ВЫБРАННЫЙ РАЙОН',none:'Выбери район на карте или в поиске',
   labelLevelOff:'Снять',labelLevelYellow:'Жёлтый',labelLevelRed:'Красный',simHint:'Выбери район для управления тревогой.',
   hintSelected:'Измени учебный уровень для выбранного района.',hintAuto:'Запущен автоматический игровой сценарий. Для ручного управления выбери «Ручной».',
   simClockLabel:'ИГРОВОЕ ВРЕМЯ',simSpeedLabel:'Скорость',simRandomLabel:'Случайный район',simResetLabel:'Сбросить',
   gameSearchLabel:'БЫСТРЫЙ ПОИСК РАЙОНА',gameSearchPlaceholder:'Название района…',gameNoMatches:'Не найдено',tabGame:'Симуляция',tabGeography:'География',simLogHeading:'ЖУРНАЛ СОБЫТИЙ',mapAlertLabel:'ИГРОВЫЕ ТРЕВОГИ',autoIndicator:'АВТО',manualIndicator:'РУЧНОЙ',
   simPause:'Пауза',simPlay:'Продолжить',simEmptyLog:'Пока нет событий. Выбери район и измени уровень.',
   confirmTitle:'Сбросить симуляцию?',confirmDetail:'Все учебные тревоги, события и игровое время будут сброшены.',confirmCancel:'Отмена',confirmAccept:'Сбросить',
   reasonManual:'вручную',reasonAuto:'автоматически',levelOff:'тревога снята',levelYellow:'жёлтый уровень',levelRed:'красный уровень',
   modeSetAuto:'Запущен автоматический сценарий',modeSetManual:'Включён ручной режим',resume:'Время возобновлено',pause:'Время остановлено',
   reset:'Симуляция сброшена',defaultRegion:'Украина',demo:'ДЕМО · НЕ РЕАЛЬНЫЕ ТРЕВОГИ'
  }
 };
 const state={levels:new Map(),mode:'manual',speed:1,paused:false,time:0,events:[],nextEvent:12,allFeatures:[]};
 let selected=null, language=api.getLanguage(), lastClock=-1, lastTick=performance.now();
 function tr(){return words[language]||words.uk;}
 function formatTime(total){
  const s=Math.max(0,Math.floor(total));
  return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':');
 }
 function getLevel(feature){return state.levels.get(api.getKey(feature))||'off';}
 function read(){
  try{
   const data=JSON.parse(localStorage.getItem(STORE)||'null');
   if(!data||data.version!==1)return;
   if(Array.isArray(data.levels))for(const pair of data.levels){
    if(Array.isArray(pair)&&typeof pair[0]==='string'&&['red','yellow'].includes(pair[1])&&pair[0].length<250)state.levels.set(pair[0],pair[1]);
   }
   if(data.mode==='auto'||data.mode==='manual')state.mode=data.mode;
   if([1,2,3,4,5].includes(data.speed))state.speed=data.speed;
   if(typeof data.paused==='boolean')state.paused=data.paused;
   if(Number.isFinite(data.time)&&data.time>=0&&data.time<100000000)state.time=data.time;
   if(Array.isArray(data.events))state.events=data.events.filter(e=>e&&typeof e==='object'&&Number.isFinite(e.time)).slice(-24);
  }catch(e){console.warn('Local game save could not be restored',e);}
 }
 let saveTimer=0;
 function saveSoon(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
   try{localStorage.setItem(STORE,JSON.stringify({version:1,levels:[...state.levels],mode:state.mode,speed:state.speed,paused:state.paused,time:state.time,events:state.events.slice(-24)}));}
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
   button.addEventListener('click',()=>{input.value='';renderHits();api.focus(feature);});
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
  const t=tr(),disabled=!selected||state.mode==='auto';
  el('simTargetName').textContent=selected?api.getName(selected):t.none;
  el('simTargetRegion').textContent=selected?api.getRegion(selected):'';
  el('simHint').textContent=state.mode==='auto'?t.hintAuto:selected?t.hintSelected:t.simHint;
  const level=selected?getLevel(selected):'off';
  for(const key of ['Off','Yellow','Red']){
   const button=el('level'+key);button.disabled=disabled;
   const current=selected&&level===key.toLowerCase();
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
  renderMode();renderEvents();
 }
 function alertSet(feature,level,origin='manual'){
  if(!feature||!['off','yellow','red'].includes(level))return;
  const key=api.getKey(feature),old=getLevel(feature);
  if(level===old)return;
  if(level==='off')state.levels.delete(key);else state.levels.set(key,level);
  api.repaint(feature);
  renderCounts();renderTarget();
  log({type:'level',level,name:api.getName(feature),region:api.getRegion(feature),origin});
  window.dispatchEvent(new CustomEvent('atlas:alerts-changed'));
 }
 function setMode(mode){
  if(!['manual','auto'].includes(mode)||state.mode===mode)return;
  state.mode=mode;state.nextEvent=state.time+5;
  renderMode();log({type:mode==='auto'?'modeSetAuto':'modeSetManual'});
 }
 function runAutoEvent(){
  const pool=state.allFeatures;
  if(!pool.length)return;
  const feature=pool[Math.floor(Math.random()*pool.length)];
  const old=getLevel(feature);
  const r=Math.random();
  let next=old==='off'?(r<.65?'yellow':'red'):old==='yellow'?(r<.43?'red':'off'):(r<.6?'off':'yellow');
  if(next===old)next='off';
  alertSet(feature,next,'auto');
 }
 function tick(){
  const now=performance.now();const delta=Math.min(2,Math.max(0,(now-lastTick)/1000));lastTick=now;
  if(state.paused)return;
  state.time+=delta*state.speed;
  if(Math.floor(state.time)!==lastClock){lastClock=Math.floor(state.time);el('simClock').textContent=formatTime(state.time);saveSoon();}
  if(state.mode==='auto'&&state.time>=state.nextEvent){
   runAutoEvent();state.nextEvent=state.time+8+Math.random()*10;
  }
 }
 function reset(){
  state.levels.clear();state.mode='manual';state.speed=1;state.paused=false;
  state.time=0;state.nextEvent=12;state.events=[];lastTick=performance.now();lastClock=-1;
  api.repaintAll();window.dispatchEvent(new CustomEvent('atlas:alerts-changed'));
  renderMode();el('simClock').textContent='00:00:00';log({type:'reset'});
 }
 function randomDistrict(){
  if(!state.allFeatures.length)return;
  api.focus(state.allFeatures[Math.floor(Math.random()*state.allFeatures.length)]);
 }
 read();
 window.ATLAS_GAME={getLevel};
 // Important: the basemap and all existing geography controls stay untouched.
 window.addEventListener('atlas:select',e=>{selected=e.detail?.feature||null;renderTarget();});
 window.addEventListener('atlas:districts-ready',e=>{
  state.allFeatures=e.detail.features||[];
  // Remove saved entries from obsolete datasets to keep stats accurate.
  const valid=new Set(state.allFeatures.map(api.getKey));
  for(const key of state.levels.keys())if(!valid.has(key))state.levels.delete(key);
  renderCounts();renderTarget();renderHits();saveSoon();
 });
 window.addEventListener('atlas:language',e=>{language=e.detail?.lang||api.getLanguage();renderLanguage();});
 el('tabGame').addEventListener('click',()=>setView('game'));
 el('tabGeography').addEventListener('click',()=>setView('geo'));
 el('gameSearch').addEventListener('input',renderHits);
 el('modeManual').addEventListener('click',()=>setMode('manual'));
 el('modeAuto').addEventListener('click',()=>setMode('auto'));
 for(const level of ['Off','Yellow','Red'])el('level'+level).addEventListener('click',()=>{
  if(state.mode==='manual'&&selected)alertSet(selected,level.toLowerCase());
 });
 el('pauseSimulation').addEventListener('click',()=>{
  state.paused=!state.paused;lastTick=performance.now();renderMode();log({type:state.paused?'pause':'resume'});
 });
 for(const button of document.querySelectorAll('[data-speed]'))button.addEventListener('click',()=>{
  state.speed=Number(button.dataset.speed);renderMode();saveSoon();
 });
 el('simRandomDistrict').addEventListener('click',randomDistrict);
 el('simReset').addEventListener('click',()=>{
  const dialog=el('simConfirm');if(typeof dialog.showModal==='function')dialog.showModal();else if(confirm(tr().confirmTitle))reset();
 });
 el('simConfirm').addEventListener('close',()=>{if(el('simConfirm').returnValue==='reset')reset();});
 document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,dialog'))return;
  if(state.mode!=='manual'||!selected)return;
  const wanted={'0':'off','1':'yellow','2':'red'}[e.key];
  if(wanted)alertSet(selected,wanted,'manual');
 });
 el('simClock').textContent=formatTime(state.time);
 language=api.getLanguage();renderLanguage();
 state.nextEvent=state.time+8;
 setInterval(tick,250);
 window.addEventListener('pagehide',()=>{
  clearTimeout(saveTimer);
  try{localStorage.setItem(STORE,JSON.stringify({version:1,levels:[...state.levels],mode:state.mode,speed:state.speed,paused:state.paused,time:state.time,events:state.events.slice(-24)}));}catch(_){/* storage optional */}
 });
})();
