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

/* Stage 1.1: district boundaries (2020 reform), selection and search.
 * Source: https://github.com/slawomirmatuszak/ukrainian_geodata (CC BY 4.0)
 * Loaded as external static GeoJSON, no server credentials.
 */
const districtUI = {
  uk:{districtsTitle:'Райони України',districtsSubtitle:'Натисніть на район або знайдіть його',search:'Пошук району…',loading:'Завантаження меж районів…',loaded:'Завантажено районів: ',failed:'Не вдалося завантажити межі. Перевірте інтернет і оновіть сторінку.',none:'Нічого не знайдено',selected:'Обраний район',clear:'Скасувати вибір',collapse:'Згорнути панель',expand:'Розгорнути панель',note:'Межі: реформа 2020 · Геодані CC BY 4.0',stage:'Етап 1.1'},
  ru:{districtsTitle:'Районы Украины',districtsSubtitle:'Нажмите на район или найдите его',search:'Поиск района…',loading:'Загрузка границ районов…',loaded:'Загружено районов: ',failed:'Не удалось загрузить границы. Проверьте интернет и обновите страницу.',none:'Ничего не найдено',selected:'Выбранный район',clear:'Снять выделение',collapse:'Свернуть панель',expand:'Развернуть панель',note:'Границы: реформа 2020 · Геоданные CC BY 4.0',stage:'Этап 1.1'}
};
let districtLayer = null;
let districtFeatures = [];
let districtSelected = null;
let districtLoadStatus='loading';
const districtSearch = document.getElementById('districtSearch');
const districtResults = document.getElementById('districtResults');
const districtLoading = document.getElementById('districtLoading');
const selectedPanel = document.getElementById('selectedDistrict');
const districtPanel = document.querySelector('.district-panel');
function districtName(feature){
  const p=feature?.properties||{};
  const raw=p.name_uk||p.NAME_UA||p.NAME_UKR||p.name||p.NAME||p.Name||p.rayon||p.RAION||p.ray_name||p.rayon_name||p.name_2||p.NAME_2||p.admin_name||p.title;
  if(typeof raw==='string' && raw.trim()) return raw.trim();
  if(raw && typeof raw==='object')return raw.uk||raw.local||raw.ua||raw.en||'Район';
  return 'Район '+(feature.id??'');
}
function oblastName(feature){
  const p=feature?.properties||{};
  return p.oblast||p.OBLAST||p.region||p.REGION||p.obl_name||p.oblast_name||p.name_1||p.NAME_1||'';
}
function districtStyle(feature){
  const isSel=districtSelected===feature;
  return {color:isSel?'#3bb7ff':'#1879bf',weight:isSel?3.2:1.35,opacity:isSel?1:.75,fillColor:'#308ee2',fillOpacity:isSel?.26:.035};
}
function safeFit(layer){try {const b=layer.getBounds();if(b.isValid()) map.fitBounds(b.pad(.17),{maxZoom:10,animate:true});}catch(e){console.warn(e)}}
function clearDistrict(){districtSelected=null;selectedPanel.hidden=true;if(districtLayer)districtLayer.setStyle(districtStyle);renderDistrictList();}
function chooseDistrict(feature,layer){
  districtSelected=feature;
  if(districtLayer)districtLayer.setStyle(districtStyle);
  selectedPanel.hidden=false;
  document.getElementById('selectedName').textContent=districtName(feature);
  document.getElementById('selectedExtra').textContent=oblastName(feature);
  if(layer)safeFit(layer);
  renderDistrictList();
}
function renderDistrictList(){
  districtResults.replaceChildren();
  if(districtLoadStatus!=='ok')return;
  const query=districtSearch.value.toLocaleLowerCase('uk').trim();
  const filtered=districtFeatures.filter(f=>(districtName(f)+' '+oblastName(f)).toLocaleLowerCase('uk').includes(query));
  // Keep list compact until user searches; all outlines are already drawn on the map.
  const display=filtered.slice(0,query?45:10);
  if(!display.length){let p=document.createElement('p');p.className='district-loading';p.textContent=districtUI[lang].none;districtResults.append(p);return;}
  for(const f of display){
    const btn=document.createElement('button');btn.className='district-result';btn.type='button';
    const n=document.createElement('span');n.textContent=districtName(f);
    const o=document.createElement('small');o.textContent=oblastName(f)||'Україна';
    btn.append(n,o);btn.addEventListener('click',()=>chooseDistrict(f,f._layer));districtResults.append(btn);
  }
}
function updateDistrictLang(){
  let t=districtUI[lang];
  for(const key of ['districtsTitle','districtsSubtitle'])document.getElementById(key).textContent=t[key];
  document.getElementById('stageLabel').textContent=t.stage;
  districtSearch.placeholder=t.search;
  document.getElementById('selectedCaption').textContent=t.selected;
  document.getElementById('deselectBtn').textContent=t.clear;
  document.getElementById('dataNote').textContent=t.note;
  document.getElementById('panelToggle').title=districtPanel.classList.contains('is-collapsed')?t.expand:t.collapse;
  if(districtLoadStatus==='loading')districtLoading.textContent=t.loading;
  if(districtLoadStatus==='error')districtLoading.textContent=t.failed;
  if(districtLoadStatus==='ok')districtLoading.textContent=t.loaded+districtFeatures.length;
  renderDistrictList();
}
// Extend existing stage-1.0 language switching without replacing the map.
const originalApplyLang=applyLang;
applyLang=function(){originalApplyLang();updateDistrictLang();};
document.getElementById('deselectBtn').addEventListener('click',clearDistrict);
districtSearch.addEventListener('input',renderDistrictList);
document.getElementById('panelToggle').addEventListener('click',()=>{
  const collapsed=districtPanel.classList.toggle('is-collapsed');
  document.getElementById('panelToggle').textContent=collapsed?'+':'−';
  updateDistrictLang();
});
async function loadDistricts(){
  const urls=[
    'https://cdn.jsdelivr.net/gh/slawomirmatuszak/ukrainian_geodata@master/rayony.geojson',
    'https://cdn.jsdelivr.net/gh/slawomirmatuszak/ukrainian_geodata@main/rayony.geojson',
    'https://raw.githubusercontent.com/slawomirmatuszak/ukrainian_geodata/master/rayony.geojson',
    'https://raw.githubusercontent.com/slawomirmatuszak/ukrainian_geodata/main/rayony.geojson'
  ];
  let geo;
  for(const url of urls){
    try{
      const response=await fetch(url,{cache:'force-cache'});
      if(!response.ok)continue;
      const value=await response.json();
      if(value.type==='FeatureCollection'&&Array.isArray(value.features)&&value.features.length>30){geo=value;break;}
    }catch(err){console.warn('Boundary source unavailable:',url,err)}
  }
  if(!geo){districtLoadStatus='error';updateDistrictLang();return;}
  districtFeatures=geo.features.filter(f=>f.geometry);
  districtLayer=L.geoJSON({type:'FeatureCollection',features:districtFeatures},{
    style:districtStyle,
    onEachFeature:(feature,layer)=>{
      feature._layer=layer;
      layer.on({click:()=>chooseDistrict(feature,layer),mouseover:()=>{if(feature!==districtSelected)layer.setStyle({weight:2.4,fillOpacity:.13})},mouseout:()=>{if(feature!==districtSelected)layer.setStyle(districtStyle(feature))}});
      layer.bindTooltip(()=>districtName(feature),{sticky:true,direction:'top'});
    }
  }).addTo(map);
  districtLoadStatus='ok';updateDistrictLang();
}
updateDistrictLang();
loadDistricts();
