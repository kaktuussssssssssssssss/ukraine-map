/* ATLAS UA / Stage 1.6 — geography and local fictional training alerts; no real alerts or tracking.
 * Administrative boundaries: https://github.com/slawomirmatuszak/ukrainian_geodata (CC BY 4.0)
 * Lightweight Leaflet + Canvas. OSM base tiles, no API key, no worldwide masks.
 */
'use strict';

const $=id=>document.getElementById(id);
const TEXT={
  uk:{brandSub:'Інтерактивна мапа',topLabel:'КАРТОГРАФІЧНИЙ ОГЛЯД',demoLabel:'ДЕМО · НЕ РЕАЛЬНІ ТРИВОГИ',sectionEyebrow:'МОДУЛЬ 01 / ГЕОГРАФІЯ',heroTitle:'Простір.<br><span>Деталі.</span>',heroSub:'Чиста мапа з населеними пунктами та адміністративними межами. Без зайвих накладок.',countryTitle:'ПЕРЕЙТИ ДО РЕГІОНУ',ua:'Україна',by:'Білорусь',ru:'РФ · захід',searchTitle:'ПОШУК РАЙОНІВ',searchPlaceholder:'Введіть назву району…',load:'Завантаження меж районів…',ready:'Районів завантажено: ',partial:'Області готові · Завантаження районів…',fail:'Не вдалося завантажити райони',noMatches:'Районів не знайдено',selectedTitle:'ВИБРАНИЙ РАЙОН',clearText:'Скинути вибір',layersTitle:'АДМІНІСТРАТИВНІ МЕЖІ',oblastLabel:'Області',oblastSub:'Виразний контур',raionLabel:'Райони',raionSub:'Ледь помітні до наведення',noteText:'Крим, Донецька й Луганська області — у складі України. Мапа демонстраційна.',stageText:'ЕТАП 1.6 · ІГРОВА МАПА',mapChipText:'УКРАЇНА · БІЛОРУСЬ · РФ',mapState:'МАПА АКТИВНА',zoom:'Масштаб',home:'Показати Україну',full:'На весь екран',openMenu:'Відкрити панель',unknown:'Район',noRegion:'Україна'},
  ru:{brandSub:'Интерактивная карта',topLabel:'КАРТОГРАФИЧЕСКИЙ ОБЗОР',demoLabel:'ДЕМО · НЕ РЕАЛЬНЫЕ ТРЕВОГИ',sectionEyebrow:'МОДУЛЬ 01 / ГЕОГРАФИЯ',heroTitle:'Пространство.<br><span>Детали.</span>',heroSub:'Чистая карта с городами и административными границами. Без лишних наложений.',countryTitle:'ПЕРЕЙТИ К РЕГИОНУ',ua:'Украина',by:'Беларусь',ru:'РФ · запад',searchTitle:'ПОИСК РАЙОНОВ',searchPlaceholder:'Введите название района…',load:'Загрузка границ районов…',ready:'Районов загружено: ',partial:'Области готовы · Загрузка районов…',fail:'Не удалось загрузить районы',noMatches:'Районы не найдены',selectedTitle:'ВЫБРАННЫЙ РАЙОН',clearText:'Снять выделение',layersTitle:'АДМИНИСТРАТИВНЫЕ ГРАНИЦЫ',oblastLabel:'Области',oblastSub:'Заметный контур',raionLabel:'Районы',raionSub:'Почти незаметны до наведения',noteText:'Крым, Донецкая и Луганская области — в составе Украины. Карта демонстрационная.',stageText:'ЭТАП 1.6 · ИГРОВАЯ КАРТА',mapChipText:'УКРАИНА · БЕЛАРУСЬ · РФ',mapState:'КАРТА АКТИВНА',zoom:'Масштаб',home:'Показать Украину',full:'На весь экран',openMenu:'Открыть панель',unknown:'Район',noRegion:'Украина'}
};
const VIEWS={ua:[[44.2,22.1],[52.5,40.4]],by:[[51.15,23.1],[56.2,33.7]],ru:[[47.2,27.7],[59.5,51.5]]};
const VIEW_LIMITS=[[41,18],[62,64]];
const DATA_ROOT='https://cdn.jsdelivr.net/gh/slawomirmatuszak/ukrainian_geodata@main/';
const DATA_FALLBACK='https://raw.githubusercontent.com/slawomirmatuszak/ukrainian_geodata/main/';

let lang='uk', focused='ua', oblastEnabled=true, raionEnabled=true;
let oblastLayer=null, raionLayer=null, selectedLayer=null, selectedLayers=new Set(), raionFeatures=[], raionReady=false, oblastReady=false, dataFailed=false;
const raionPaths=new WeakMap();

const map=L.map('map',{
  zoomControl:false,preferCanvas:true,zoomSnap:.5,zoomDelta:.5,minZoom:3.5,maxZoom:19,
  maxBounds:VIEW_LIMITS,maxBoundsViscosity:.85,worldCopyJump:false,
  fadeAnimation:false,markerZoomAnimation:false,zoomAnimation:false,
  attributionControl:true
});
map.fitBounds(VIEWS.ua,{padding:[24,24],maxZoom:7,animate:false});
// The same dependable, readable base map from stage 1.0. No CARTO API key needed.
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,maxNativeZoom:19,keepBuffer:3,updateWhenIdle:true,updateWhenZooming:false,
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
}).addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);

// Separate Canvas renderers: districts do not obscure oblast borders.
map.createPane('raionPane');
map.getPane('raionPane').style.zIndex='410';
map.createPane('oblastPane');
map.getPane('oblastPane').style.zIndex='440';
map.getPane('oblastPane').style.pointerEvents='none';
const rayonRenderer=L.canvas({pane:'raionPane',padding:.15,tolerance:3});
const oblastRenderer=L.canvas({pane:'oblastPane',padding:.15,interactive:false});
// Show ONLY active training alerts at country-wide zoom levels. This avoids
// drawing all 136 district polygons when the district layer is intentionally hidden.
const summaryRenderer=L.canvas({pane:'raionPane',padding:.10,interactive:false});
let summaryLayer=null,summaryScheduled=false;
function scheduleAlertSummary(){
 if(summaryScheduled)return;
 summaryScheduled=true;
 requestAnimationFrame(()=>{
  summaryScheduled=false;
  if(summaryLayer){map.removeLayer(summaryLayer);summaryLayer=null;}
  if(!raionReady||!raionEnabled||map.getZoom()>=4.5)return;
  const features=raionFeatures.filter(f=>window.ATLAS_GAME?.getLevel?.(f)!=='off');
  if(!features.length)return;
  summaryLayer=L.geoJSON({type:'FeatureCollection',features},{
   renderer:summaryRenderer,interactive:false,smoothFactor:3,
   style(f){const red=window.ATLAS_GAME?.getLevel?.(f)==='red';return {
    color:red?'#b34154':'#b88c35',weight:1,opacity:.8,
    fill:true,fillColor:red?'#e65763':'#f2bb42',fillOpacity:red?.49:.43,
    interactive:false
   };}
  }).addTo(map);
 });
}
window.addEventListener('atlas:alerts-changed',scheduleAlertSummary);


function featureName(f){
 const p=f?.properties||{};
 for(const k of ['rayon','raion','district','name_uk','NAME_UA','name','NAME','ray_name','rayon_name','name_2','NAME_2','admin_name','title']){
  const v=p[k];if(typeof v==='string'&&v.trim())return v.trim();
  if(v&&typeof v==='object')return v.uk||v.ua||v.local||v.en||TEXT[lang].unknown;
 }
 return TEXT[lang].unknown;
}
function featureRegion(f){
 const p=f?.properties||{};
 for(const k of ['region','oblast','OBLAST','REGION','oblast_name','name_1','NAME_1','obl_name','admin1']){
  if(typeof p[k]==='string'&&p[k].trim())return p[k].trim();
 }
 return TEXT[lang].noRegion;
}
const keyText=f=>(featureName(f)+' '+featureRegion(f)).toLocaleLowerCase('uk');
const normalDistrict={color:'#506f87',weight:.8,opacity:.13,fill:true,fillColor:'#78bdcd',fillOpacity:0};
const hoverDistrict={color:'#2c83a0',weight:1.55,opacity:.8,fill:true,fillColor:'#72c9d6',fillOpacity:.075};
const activeDistrict={color:'#167b9a',weight:2.1,opacity:.98,fill:true,fillColor:'#71cfde',fillOpacity:.12};
const oblastStyle={color:'#3a6686',weight:2.25,opacity:.82,fill:false,interactive:false};

function districtKey(f){return (featureRegion(f)+'|'+featureName(f)).toLocaleLowerCase('uk');}
// Styles are recalculated only when one district changes. No full-map redraw per frame.
function visualStyle(layer){
 const hover=!!layer._atlasHover;
 const selected=selectedLayers.has(layer);
 const status=window.ATLAS_GAME?.getLevel?.(layer.feature)||'off';
 if(status!=='off'){
  const red=status==='red';
  return {color:red?'#aa3545':'#be8724',weight:selected?2.45:hover?1.8:1.1,opacity:selected?1:hover?.95:.8,
   fill:true,fillColor:red?'#e65763':'#f2bb42',fillOpacity:selected?.64:hover?.56:red?.47:.41};
 }
 return selected?activeDistrict:hover?hoverDistrict:normalDistrict;
}
function refreshDistrict(layer){if(layer)layer.setStyle(visualStyle(layer));}
function refreshAllDistricts(){if(raionLayer)raionLayer.eachLayer(refreshDistrict);}
function zoomDistrict(layer){const b=layer.getBounds();if(b&&b.isValid())map.fitBounds(b.pad(.2),{animate:true,maxZoom:10,duration:.6});}
function informSelection(){
 const features=[...selectedLayers].map(l=>l.feature);
 const panel=$('selectedPanel');panel.hidden=!features.length;
 if(features.length){
  $('selectedName').textContent=features.length===1?featureName(features[0]):(lang==='uk'?`Вибрано районів: ${features.length}`:`Выбрано районов: ${features.length}`);
  $('selectedRegion').textContent=features.length===1?featureRegion(features[0]):(lang==='uk'?'Ctrl + клік — додати або прибрати район':'Ctrl + клик — добавить или убрать район');
 }
 selectedLayer=[...selectedLayers].at(-1)||null;
 listResults();
 window.dispatchEvent(new CustomEvent('atlas:select',{detail:{feature:selectedLayer?.feature||null,features}}));
}
function chooseRaion(layer,zoom=true,additive=false){
 if(additive){
  if(selectedLayers.has(layer)){selectedLayers.delete(layer);refreshDistrict(layer)}
  else{selectedLayers.add(layer);refreshDistrict(layer);layer.bringToFront();}
 }else{
  for(const old of selectedLayers){if(old!==layer){selectedLayers.delete(old);refreshDistrict(old)}}
  selectedLayers.add(layer);refreshDistrict(layer);layer.bringToFront();
 }
 informSelection();
 // Ctrl selection must never zoom the map or close the side panel.
 if(zoom&&!additive&&selectedLayers.has(layer))zoomDistrict(layer);
 if(!additive&&innerWidth<=800){$('app').classList.remove('menu-open');}
}
function clearRaion(){
 for(const layer of selectedLayers){selectedLayers.delete(layer);refreshDistrict(layer)}
 informSelection();
}
function districtTooltip(f){
 const outer=document.createElement('div');outer.className='district-tip-content';
 const title=document.createElement('strong');title.textContent=featureName(f);
 const region=document.createElement('small');region.textContent=featureRegion(f);
 const status=document.createElement('span');status.className='district-tip-status';
 const info=window.ATLAS_GAME?.getAlertInfo?.(f);
 const level=info?.level||'off';
 status.classList.add('tip-'+level);
 status.textContent=lang==='uk'?(level==='red'?'● Червона тривога':level==='yellow'?'● Жовта тривога':'● Тривоги немає'):(level==='red'?'● Красная тревога':level==='yellow'?'● Жёлтая тревога':'● Тревоги нет');
 const elapsed=document.createElement('span');elapsed.className='district-tip-duration';
 elapsed.textContent=(lang==='uk'?'Час тривоги: ':'Время тревоги: ')+(level==='off'?'—':info?.durationText||'00:00:00');
 outer.append(title,region,status,elapsed);return outer;
}
function listResults(){
 const el=$('districtResults');el.replaceChildren();if(!raionReady)return;
 const q=$('districtSearch').value.trim().toLocaleLowerCase('uk');
 let result;
 if(q)result=raionFeatures.filter(f=>keyText(f).includes(q)).slice(0,35);
 else {
  const names=['Миргород','Лубен','Полтав','Кременч','Київ','Львів'];
  result=names.map(n=>raionFeatures.find(f=>featureName(f).includes(n))).filter(Boolean);
 }
 if(!result.length){const p=document.createElement('p');p.className='empty-results';p.textContent=TEXT[lang].noMatches;el.append(p);return;}
 for(const f of result){
  const l=raionPaths.get(f);if(!l)continue;
  const button=document.createElement('button');button.className='result'+(selectedLayers.has(l)?' active':'');button.type='button';
  const pin=document.createElementNS('http://www.w3.org/2000/svg','svg');pin.classList.add('ico');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#i-pin');pin.append(use);
  const main=document.createElement('span');main.className='result-main';
  const title=document.createElement('strong');title.textContent=featureName(f);
  const region=document.createElement('small');region.textContent=featureRegion(f);
  main.append(title,region);
  const arr=document.createElementNS('http://www.w3.org/2000/svg','svg');arr.classList.add('ico','forward');const arrowUse=document.createElementNS('http://www.w3.org/2000/svg','use');arrowUse.setAttribute('href','#i-arrow');arr.append(arrowUse);
  button.append(pin,main,arr);button.addEventListener('click',e=>chooseRaion(l,true,e.ctrlKey||e.metaKey));el.append(button);
 }
}
function updateStatus(){
 const s=$('loadStatus');s.classList.toggle('ready',raionReady);s.classList.toggle('error',dataFailed&&!raionReady);
 $('statusText').textContent=raionReady?TEXT[lang].ready+raionFeatures.length:dataFailed?TEXT[lang].fail:oblastReady?TEXT[lang].partial:TEXT[lang].load;
}
function applyLanguage(){
 const t=TEXT[lang];document.documentElement.lang=lang;document.title=lang==='uk'?'ATLAS UA — Мапа України':'ATLAS UA — Карта Украины';
 for(const k of ['brandSub','topLabel','demoLabel','sectionEyebrow','heroSub','countryTitle','searchTitle','selectedTitle','clearText','layersTitle','oblastLabel','oblastSub','raionLabel','raionSub','noteText','stageText','mapChipText','mapState'])$(k).textContent=t[k];
 $('heroTitle').innerHTML=t.heroTitle;
 $('focusUa').textContent=t.ua;$('focusBy').textContent=t.by;$('focusRu').textContent=t.ru;
 $('districtSearch').placeholder=t.searchPlaceholder;$('langBtn').textContent=lang==='uk'?'УКР / РУС':'РУС / УКР';
 $('homeBtn').title=t.home;$('homeBtn').setAttribute('aria-label',t.home);
 $('fullscreenBtn').title=t.full;$('fullscreenBtn').setAttribute('aria-label',t.full);
 $('menuBtn').setAttribute('aria-label',t.openMenu);
 $('zoomReadout').textContent=t.zoom+' '+map.getZoom().toFixed(1);
 if(selectedLayers.size){informSelection();}
 updateStatus();listResults();
 window.dispatchEvent(new CustomEvent('atlas:language',{detail:{lang}}));
}
function showRaionLayer(){
 // Loading polygons is deferred; rendering them at very small zoom levels is unnecessary.
 const visible=raionLayer && raionEnabled && map.getZoom()>=4.5;
 if(!raionLayer)return;
 if(visible && !map.hasLayer(raionLayer))raionLayer.addTo(map);
 if(!visible && map.hasLayer(raionLayer))map.removeLayer(raionLayer);
 scheduleAlertSummary();
}
function setFocus(country){focused=country;
 for(const code of ['ua','by','ru'])$('focus'+code[0].toUpperCase()+code.slice(1)).classList.toggle('active',code===country);
 map.fitBounds(VIEWS[country],{padding:[30,30],animate:true,maxZoom:7,duration:.65});
}
async function fetchGeo(name){
 const urls=[DATA_ROOT+name,DATA_FALLBACK+name];
 for(const url of urls){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),14000);
  try{
   const r=await fetch(url,{signal:controller.signal,cache:'force-cache'});
   if(!r.ok)throw Error('HTTP '+r.status);
   const data=await r.json();if(data.type==='FeatureCollection'&&Array.isArray(data.features)&&data.features.length>10)return data;
  }catch(e){console.warn('GeoJSON source unavailable:',name,e?.message||e)}finally{clearTimeout(timer)}
 }
 throw Error('No valid GeoJSON: '+name);
}
async function loadOblasts(){
 try{
  const g=await fetchGeo('regiony.geojson');
  oblastLayer=L.geoJSON(g,{renderer:oblastRenderer,style:()=>oblastStyle,smoothFactor:2.3,interactive:false});
  if(oblastEnabled)oblastLayer.addTo(map);
  oblastReady=true;updateStatus();
 }catch(e){console.warn('Oblast boundaries unavailable',e);dataFailed=true;updateStatus();}
}
async function loadRaions(){
 try{
  const g=await fetchGeo('rayony.geojson');
  raionFeatures=g.features.filter(f=>f.geometry);
  raionLayer=L.geoJSON({type:'FeatureCollection',features:raionFeatures},{
   renderer:rayonRenderer,style:f=>{const level=window.ATLAS_GAME?.getLevel?.(f)||'off';return level==='red'?{...normalDistrict,color:'#ad3e47',fillColor:'#e65763',fillOpacity:.47,opacity:.8}:level==='yellow'?{...normalDistrict,color:'#b88a28',fillColor:'#f2bb42',fillOpacity:.41,opacity:.8}:normalDistrict;},smoothFactor:2.6,bubblingMouseEvents:false,
   onEachFeature:(f,layer)=>{
    raionPaths.set(f,layer);
    layer.on('mouseover',()=>{window.ATLAS_HOVER_FEATURE=f;layer._atlasHover=true;refreshDistrict(layer)});
    layer.on('mouseout',()=>{if(window.ATLAS_HOVER_FEATURE===f)window.ATLAS_HOVER_FEATURE=null;layer._atlasHover=false;refreshDistrict(layer)});
    layer.on('click',e=>chooseRaion(layer,true,!!(e.originalEvent?.ctrlKey||e.originalEvent?.metaKey)));
    layer.bindTooltip(()=>districtTooltip(f),{sticky:true,opacity:.98,direction:'top',className:'district-tooltip'});
   }
  });
  raionReady=true;dataFailed=false;showRaionLayer();updateStatus();listResults();
  window.dispatchEvent(new CustomEvent('atlas:districts-ready',{detail:{features:raionFeatures}}));
 }catch(e){console.warn('District boundaries unavailable',e);dataFailed=true;updateStatus();}
}

window.ATLAS_MAP_API={
 map,
 getDistricts:()=>raionFeatures,
 getSelected:()=>selectedLayer?.feature||null,
 getSelectedFeatures:()=>[...selectedLayers].map(layer=>layer.feature),
 getKey:districtKey,
 getName:featureName,
 getRegion:featureRegion,
 getLanguage:()=>lang,
 repaint(feature){const layer=raionPaths.get(feature);refreshDistrict(layer);},
 repaintAll:refreshAllDistricts,
 focus(feature,additive=false){const layer=raionPaths.get(feature);if(layer)chooseRaion(layer,true,additive);}
};

$('focusUa').addEventListener('click',()=>setFocus('ua'));
$('focusBy').addEventListener('click',()=>setFocus('by'));
$('focusRu').addEventListener('click',()=>setFocus('ru'));
$('homeBtn').addEventListener('click',()=>setFocus('ua'));
$('langBtn').addEventListener('click',()=>{lang=lang==='uk'?'ru':'uk';applyLanguage()});
$('clearBtn').addEventListener('click',clearRaion);
$('districtSearch').addEventListener('input',listResults);
$('oblastToggle').addEventListener('change',e=>{oblastEnabled=e.target.checked;if(!oblastLayer)return;if(oblastEnabled)oblastLayer.addTo(map);else map.removeLayer(oblastLayer)});
$('raionToggle').addEventListener('change',e=>{raionEnabled=e.target.checked;showRaionLayer()});
$('fullscreenBtn').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await $('mapWrap').requestFullscreen();else await document.exitFullscreen();}catch(e){console.warn('Fullscreen unavailable',e)}});
document.addEventListener('fullscreenchange',()=>map.invalidateSize({animate:false}));
$('menuBtn').addEventListener('click',()=>{$('app').classList.toggle('menu-open');setTimeout(()=>map.invalidateSize({animate:false}),230)});
$('mapWrap').addEventListener('click',()=>{if(innerWidth<=800)$('app').classList.remove('menu-open')});
map.on('zoomend',()=>{showRaionLayer();$('zoomReadout').textContent=TEXT[lang].zoom+' '+map.getZoom().toFixed(1)});
let resizePending=false;
function refreshMapSize(){if(resizePending)return;resizePending=true;requestAnimationFrame(()=>{resizePending=false;map.invalidateSize({animate:false,pan:false})});}
window.addEventListener('resize',refreshMapSize);
if('ResizeObserver' in window){new ResizeObserver(refreshMapSize).observe($('mapWrap'));}
window.addEventListener('load',()=>setTimeout(refreshMapSize,40));

applyLanguage();
// Prioritise tiles / province outlines. Loading district geometries while the browser is idle
// avoids a synchronous all-world SVG/Canvas workload in the first paint.
loadOblasts();
if('requestIdleCallback' in window)requestIdleCallback(loadRaions,{timeout:2500});
else setTimeout(loadRaions,1200);
