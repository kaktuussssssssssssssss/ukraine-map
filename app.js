/* Stage 1.0: basic public map only. No real alert information. */
const strings = {
  uk: {title:'Мапа України',sub:'Інтерактивний симулятор',badge:'СИМУЛЯЦІЯ · НЕ РЕАЛЬНІ ТРИВОГИ',status:'Карта активна',stage:'Етап 1.0',home:'Показати всю Україну',fullscreen:'На весь екран',lang:'УКР'},
  ru: {title:'Карта Украины',sub:'Интерактивный симулятор',badge:'СИМУЛЯЦИЯ · НЕ РЕАЛЬНЫЕ ТРЕВОГИ',status:'Карта активна',stage:'Этап 1.0',home:'Показать всю Украину',fullscreen:'На весь экран',lang:'РУС'}
};
const map = L.map('map', {zoomControl:true, preferCanvas:true, minZoom:4, maxZoom:18, worldCopyJump:true});
const ukraineBounds = L.latLngBounds([43.25,21.7],[52.6,40.3]);
map.fitBounds(ukraineBounds, {padding:[16,16]});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom:19,
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
}).addTo(map);
let lang='uk';
function applyLang(){
  const t=strings[lang];
  document.documentElement.lang=lang;
  document.title=t.title+' — '+t.sub;
  for(const [id,key] of [['appTitle','title'],['appSub','sub'],['simBadge','badge'],['mapStatus','status'],['stageLabel','stage']]) document.getElementById(id).textContent=t[key];
  document.getElementById('langBtn').innerHTML=t.lang+' <span aria-hidden="true">⌄</span>';
  for(const [id,key] of [['homeBtn','home'],['fullscreenBtn','fullscreen']]){document.getElementById(id).title=t[key];document.getElementById(id).setAttribute('aria-label',t[key]);}
}
document.getElementById('langBtn').addEventListener('click',()=>{lang=lang==='uk'?'ru':'uk';applyLang()});
document.getElementById('homeBtn').addEventListener('click',()=>map.fitBounds(ukraineBounds,{padding:[16,16],animate:true}));
document.getElementById('fullscreenBtn').addEventListener('click',async()=>{
  try {if(!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen();}
  catch(err){console.warn('Fullscreen unavailable',err)}
});
window.addEventListener('resize',()=>map.invalidateSize());
applyLang();
