/* ATLAS UA | Stage 1.2 | Static client-side JavaScript.
   Visual demo only — no operational alerts, real-time tracking, or live forecasts.
   District boundaries: slawomirmatuszak/ukrainian_geodata, CC BY 4.0.
   Country masks: Natural Earth low resolution polygons, public domain.
*/
'use strict';
const I18N={
 uk:{brandSubtitle:'Геопросторовий симулятор',topLabel:'ІНТЕРАКТИВНА МАПА УКРАЇНИ',demoLabel:'ДЕМО · НЕ РЕАЛЬНІ ТРИВОГИ',lang:'УКР',sideEyebrow:'ГЕОПРОСТОРОВІ ДАНІ',sideHeading:'Карта<br><span>України.</span>',sideDesc:'Досліджуйте райони, переміщуйтеся мапою та керуйте її виглядом.',districtTitle:'ПОШУК РАЙОНУ',search:'Назва району або області…',loading:'Завантаження районів…',loaded:'Завантажено районів',failed:'Не вдалося завантажити райони',none:'Не знайдено. Спробуйте іншу назву.',selectedLabel:'ОБРАНИЙ РАЙОН',clearText:'Скинути вибір',layersTitle:'ШАРИ МАПИ',districtsToggleText:'Межі районів',districtsToggleSub:'Тонкі контури 2020 року',outsideToggleText:'Затемнення інших країн',outsideToggleSub:'Чорні діагональні смуги',mapThemeTitle:'СТИЛЬ МАПИ',legendTitle:'УМОВНІ ПОЗНАЧЕННЯ',legendDistrict:'Межа району',legendSelected:'Вибраний район',legendOutside:'Інші країни',footerStage:'ЕТАП 1.2',footerHint:'Картографічна основа',mapHudTitle:'УКРАЇНА',mapHudSub:'КАРТОГРАФІЧНИЙ ОГЛЯД',mapState:'КАРТА АКТИВНА',scaleCaption:'ГЕОГРАФІЧНА СХЕМА · ДЕМОНСТРАЦІЯ',home:'Показати Україну',fullscreen:'На весь екран',dark:'Нічна мапа',light:'Денна мапа',menu:'Показати панель',unknown:'Район'},
 ru:{brandSubtitle:'Геопространственный симулятор',topLabel:'ИНТЕРАКТИВНАЯ КАРТА УКРАИНЫ',demoLabel:'ДЕМО · НЕ РЕАЛЬНЫЕ ТРЕВОГИ',lang:'РУС',sideEyebrow:'ГЕОПРОСТРАНСТВЕННЫЕ ДАННЫЕ',sideHeading:'Карта<br><span>Украины.</span>',sideDesc:'Исследуйте районы, перемещайтесь по карте и настраивайте её внешний вид.',districtTitle:'ПОИСК РАЙОНА',search:'Название района или области…',loading:'Загрузка районов…',loaded:'Загружено районов',failed:'Не удалось загрузить районы',none:'Не найдено. Попробуйте другое название.',selectedLabel:'ВЫБРАННЫЙ РАЙОН',clearText:'Сбросить выбор',layersTitle:'СЛОИ КАРТЫ',districtsToggleText:'Границы районов',districtsToggleSub:'Тонкие контуры 2020 года',outsideToggleText:'Затемнение других стран',outsideToggleSub:'Чёрные диагональные полосы',mapThemeTitle:'СТИЛЬ КАРТЫ',legendTitle:'УСЛОВНЫЕ ОБОЗНАЧЕНИЯ',legendDistrict:'Граница района',legendSelected:'Выбранный район',legendOutside:'Другие страны',footerStage:'ЭТАП 1.2',footerHint:'Картографическая основа',mapHudTitle:'УКРАИНА',mapHudSub:'КАРТОГРАФИЧЕСКИЙ ОБЗОР',mapState:'КАРТА АКТИВНА',scaleCaption:'ГЕОГРАФИЧЕСКАЯ СХЕМА · ДЕМОНСТРАЦИЯ',home:'Показать Украину',fullscreen:'На весь экран',dark:'Ночная карта',light:'Дневная карта',menu:'Показать панель',unknown:'Район'}
};
const $=id=>document.getElementById(id);
let lang='uk', theme='dark', districtData=[], districtLayer=null, selectedFeature=null, loadState='loading';
let countryLayer=null, districtEnabled=true, outsideEnabled=true;
const bounds=L.latLngBounds([[43.3,21.7],[52.5,40.35]]);
const map=L.map('map',{zoomControl:false,preferCanvas:false,minZoom:3,maxZoom:18,worldCopyJump:false,zoomSnap:.25,zoomDelta:.5});
map.fitBounds(bounds,{padding:[35,35],maxZoom:7});
map.createPane('shadePane');map.getPane('shadePane').style.zIndex=360;map.getPane('shadePane').style.pointerEvents='none';
map.createPane('districtPane');map.getPane('districtPane').style.zIndex=450;
const nightTiles=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,maxNativeZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'});
const dayTiles=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,maxNativeZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'});
nightTiles.addTo(map);
L.control.zoom({position:'bottomright',zoomInTitle:'+',zoomOutTitle:'−'}).addTo(map);

const geoName=f=>{
 const p=f?.properties||{};
 const preferred=['name_uk','NAME_UA','NAME_UKR','name','NAME','Name','rayon','RAION','ray_name','rayon_name','name_2','NAME_2','admin_name','title','district','NAME_RAY'];
 for(const key of preferred){const v=p[key];if(typeof v==='string'&&v.trim())return v.trim();if(v&&typeof v==='object'){const x=v.uk||v.ua||v.local||v.en;if(x)return x;}}
 return I18N[lang].unknown;
};
const geoRegion=f=>{const p=f?.properties||{};for(const key of ['oblast','OBLAST','region','REGION','obl_name','oblast_name','name_1','NAME_1','admin1','NAME_OBL']){if(typeof p[key]==='string'&&p[key].trim())return p[key].trim();}return '';};
function borderStyle(feature){const selected=feature===selectedFeature;const zoom=map.getZoom();return {className:'ua-district'+(selected?' selected':''),color:selected?'#c3f6fc':(theme==='dark'?'#63a4b6':'#207788'),weight:selected?2.8:(zoom<6?.78:1.1),opacity:selected?1:(zoom<6?.59:.78),fillColor:selected?'#77c9d3':'#55a0b1',fillOpacity:selected?.25:.035,interactive:true};}
function applyBorders(){if(!districtLayer)return;districtLayer.eachLayer(layer=>layer.setStyle(borderStyle(layer.feature)));}
function safeZoomTo(layer){try{const b=layer.getBounds();if(b.isValid())map.fitBounds(b.pad(.21),{animate:true,maxZoom:10,duration:.8});}catch(err){console.warn(err)}}
function selectDistrict(f,layer,zoom=true){selectedFeature=f;applyBorders();$('selectedDistrict').hidden=false;$('selectedName').textContent=geoName(f);$('selectedExtra').textContent=geoRegion(f);if(zoom&&layer)safeZoomTo(layer);renderSearch();if(window.matchMedia('(max-width: 800px)').matches){$('appShell').classList.remove('menu-open');}}
function clearSelected(){selectedFeature=null;$('selectedDistrict').hidden=true;applyBorders();renderSearch();}
function findLayer(f){return f?f._leafletLayer:null}
function renderSearch(){
 const area=$('districtResults');area.replaceChildren();if(loadState!=='ready')return;
 const q=$('districtSearch').value.trim().toLocaleLowerCase('uk');
 const all=districtData.filter(f=>(geoName(f)+' '+geoRegion(f)).toLocaleLowerCase('uk').includes(q));
 const curated=['Миргород','Лубен','Полтав','Київ','Кременч','Львів'];
 const favorites=curated.map(x=>all.find(f=>geoName(f).toLocaleLowerCase('uk').includes(x.toLocaleLowerCase('uk')))).filter(Boolean);
 const list=q?all.slice(0,28):[...new Set([...favorites,...all.slice(0,2)])].slice(0,7);
 if(!list.length){const note=document.createElement('p');note.className='no-results';note.textContent=I18N[lang].none;area.append(note);return;}
 for(const f of list){const btn=document.createElement('button');btn.type='button';btn.className='district-entry'+(selectedFeature===f?' active':'');
 const ico=document.createElementNS('http://www.w3.org/2000/svg','svg');ico.setAttribute('class','icon entry-pin');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#ic-pin');ico.append(use);
 const text=document.createElement('span');const strong=document.createElement('strong');strong.textContent=geoName(f);const small=document.createElement('small');small.textContent=geoRegion(f)||'Україна';text.append(strong,small);const arrow=document.createElement('span');arrow.className='entry-chevron';arrow.textContent='›';btn.append(ico,text,arrow);btn.addEventListener('click',()=>selectDistrict(f,findLayer(f)));area.append(btn);}
}
function updateStatus(){const box=$('districtLoading');box.classList.toggle('ready',loadState==='ready');box.classList.toggle('error',loadState==='error');$('districtStatusText').textContent=loadState==='ready'?I18N[lang].loaded+': '+districtData.length:loadState==='error'?I18N[lang].failed:I18N[lang].loading;}
function applyLanguage(){const t=I18N[lang];document.documentElement.lang=lang;document.title=(lang==='uk'?'ATLAS UA — Інтерактивна мапа':'ATLAS UA — Интерактивная карта');
 const entries=['brandSubtitle','topLabel','demoLabel','sideEyebrow','sideDesc','districtTitle','selectedLabel','clearText','layersTitle','districtsToggleText','districtsToggleSub','outsideToggleText','outsideToggleSub','mapThemeTitle','legendTitle','legendDistrict','legendSelected','legendOutside','footerStage','footerHint','mapHudTitle','mapHudSub','mapState','scaleCaption'];for(const key of entries)$(key).textContent=t[key];$('sideHeading').innerHTML=t.sideHeading;$('districtSearch').placeholder=t.search;$('langBtn').innerHTML=t.lang+' <svg class="icon"><use href="#ic-chevron"/></svg>';
 for(const [id,title]of[['homeBtn','home'],['fullscreenBtn','fullscreen'],['menuBtn','menu'],['nightBtn','dark'],['dayBtn','light']]){$(id).title=t[title];$(id).setAttribute('aria-label',t[title]);}
 updateStatus();if(selectedFeature){$('selectedName').textContent=geoName(selectedFeature);$('selectedExtra').textContent=geoRegion(selectedFeature);}renderSearch();}
$('langBtn').addEventListener('click',()=>{lang=lang==='uk'?'ru':'uk';applyLanguage()});
$('districtSearch').addEventListener('input',renderSearch);
$('deselectBtn').addEventListener('click',clearSelected);
$('homeBtn').addEventListener('click',()=>map.fitBounds(bounds,{padding:[36,36],animate:true,maxZoom:7}));
$('fullscreenBtn').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await $('mapArea').requestFullscreen();else await document.exitFullscreen();setTimeout(()=>map.invalidateSize(),120);}catch(e){console.warn('Fullscreen unavailable',e);}});
document.addEventListener('fullscreenchange',()=>setTimeout(()=>map.invalidateSize(),100));
$('menuBtn').addEventListener('click',()=>{$('appShell').classList.toggle('menu-open');setTimeout(()=>map.invalidateSize(),260)});
$('mapArea').addEventListener('click',()=>{$('appShell').classList.remove('menu-open')});
$('districtsToggle').addEventListener('change',e=>{districtEnabled=e.target.checked;if(districtLayer){if(districtEnabled)districtLayer.addTo(map);else map.removeLayer(districtLayer);}});
$('outsideToggle').addEventListener('change',e=>{outsideEnabled=e.target.checked;if(countryLayer){if(outsideEnabled){countryLayer.addTo(map);queuePatternUpdate();}else map.removeLayer(countryLayer);}});
function setTheme(next){theme=next;$('mapArea').classList.toggle('day-theme',next==='light');$('nightBtn').classList.toggle('active',next==='dark');$('dayBtn').classList.toggle('active',next==='light');if(next==='dark'){map.removeLayer(dayTiles);nightTiles.addTo(map)}else{map.removeLayer(nightTiles);dayTiles.addTo(map)}applyBorders();if(countryLayer)queuePatternUpdate();}
$('nightBtn').addEventListener('click',()=>setTheme('dark'));
$('dayBtn').addEventListener('click',()=>setTheme('light'));
map.on('mousemove',evt=>{$('coordinateReadout').textContent=evt.latlng.lat.toFixed(2)+'° N · '+evt.latlng.lng.toFixed(2)+'° E'});
map.on('zoomend',applyBorders);
window.addEventListener('resize',()=>map.invalidateSize());

// Foreign-country hatching is fully local. SVG pattern is clipped by each
// country's actual polygon geometry. UA / RU / BY are absent from this dataset.
function queuePatternUpdate(){requestAnimationFrame(()=>{
 const pane=map.getPane('shadePane');if(!pane)return;
 const svg=pane.querySelector('svg');if(!svg)return;
 const ns='http://www.w3.org/2000/svg';let defs=svg.querySelector('defs');if(!defs){defs=document.createElementNS(ns,'defs');svg.insertBefore(defs,svg.firstChild)}
 let pattern=svg.querySelector('#atlas-outside-hatch');if(!pattern){pattern=document.createElementNS(ns,'pattern');pattern.setAttribute('id','atlas-outside-hatch');pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.setAttribute('width','12');pattern.setAttribute('height','12');pattern.setAttribute('patternTransform','rotate(45)');defs.append(pattern)}
 pattern.replaceChildren();const base=document.createElementNS(ns,'rect');base.setAttribute('width','12');base.setAttribute('height','12');base.setAttribute('fill',theme==='dark'?'#060a0e':'#10161d');base.setAttribute('fill-opacity',theme==='dark'?'.90':'.83');pattern.append(base);
 const line=document.createElementNS(ns,'rect');line.setAttribute('width','3');line.setAttribute('height','12');line.setAttribute('fill',theme==='dark'?'#25313a':'#45515d');line.setAttribute('fill-opacity',theme==='dark'?'.95':'.80');pattern.append(line);
 const shine=document.createElementNS(ns,'rect');shine.setAttribute('x','8');shine.setAttribute('width','.7');shine.setAttribute('height','12');shine.setAttribute('fill','#62717a');shine.setAttribute('fill-opacity','.17');pattern.append(shine);
 pane.querySelectorAll('.outside-hatch-path').forEach(path=>path.setAttribute('fill','url(#atlas-outside-hatch)'));
});}
async function loadCountries(){try{const response=await fetch('./other-countries.geojson');if(!response.ok)throw Error('country polygons '+response.status);const geo=await response.json();countryLayer=L.geoJSON(geo,{pane:'shadePane',interactive:false,style:()=>({className:'outside-hatch-path',color:'#33414b',weight:.58,opacity:.75,fillColor:'#070a0d',fillOpacity:1})});if(outsideEnabled)countryLayer.addTo(map);queuePatternUpdate();}catch(e){console.error('Failed to load foreign-country overlay',e)}}

async function loadDistricts(){
 const urls=[
  'https://cdn.jsdelivr.net/gh/slawomirmatuszak/ukrainian_geodata@main/rayony.geojson',
  'https://cdn.jsdelivr.net/gh/slawomirmatuszak/ukrainian_geodata@master/rayony.geojson',
  'https://raw.githubusercontent.com/slawomirmatuszak/ukrainian_geodata/main/rayony.geojson',
  'https://raw.githubusercontent.com/slawomirmatuszak/ukrainian_geodata/master/rayony.geojson'
 ];let geo=null;
 for(const url of urls){try{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),11000);let response;try{response=await fetch(url,{signal:controller.signal,cache:'force-cache'});}finally{clearTimeout(timeout)}if(!response.ok)continue;const data=await response.json();if(data.type==='FeatureCollection'&&Array.isArray(data.features)&&data.features.length>40){geo=data;break;}}catch(e){console.warn('District source unavailable',url,e)}}
 if(!geo){loadState='error';updateStatus();return;}
 districtData=geo.features.filter(f=>f&&f.geometry);
 districtLayer=L.geoJSON({type:'FeatureCollection',features:districtData},{pane:'districtPane',style:borderStyle,onEachFeature:(feature,layer)=>{
   feature._leafletLayer=layer;
   layer.on('click',()=>selectDistrict(feature,layer));
   layer.on('mouseover',()=>{if(feature!==selectedFeature)layer.setStyle({color:'#94dbe7',weight:2.0,fillOpacity:.12,opacity:1});});
   layer.on('mouseout',()=>{if(feature!==selectedFeature)layer.setStyle(borderStyle(feature));});
   layer.bindTooltip(()=>geoName(feature),{sticky:true,className:'district-tooltip',direction:'top'});
 }});
 if(districtEnabled)districtLayer.addTo(map);
 loadState='ready';updateStatus();renderSearch();
}
applyLanguage();
loadCountries();
loadDistricts();
