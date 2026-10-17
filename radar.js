/* ATLAS UA 1.9 · Fictional cartographic scanner and visual object studio.
   Coordinates of the scanner are arbitrary. Icons and drift are decorative;
   no real detection / targeting / flight planning is calculated. */
'use strict';
(() => {
 const api=window.ATLAS_MAP_API, game=window.ATLAS_GAME;
 const cvs=document.getElementById('radarOverlay');
 if(!api||!game||!cvs||!window.L)return;
 const map=api.map, el=id=>document.getElementById(id);
 const ctx=cvs.getContext('2d',{alpha:true});if(!ctx)return;
 const TAU=Math.PI*2,PERIOD=12,MAX_OBJECTS=16;
 const ORIGIN=L.latLng(49.17,31.31); // Arbitrary fictional location, not a real radar.
 const kinds=[
  {id:'delta',uk:'Герань-2 · умовна',ru:'Герань-2 · условная',color:'#56ead0',shape:'<path d="M12 2 22 18l-10-5L2 18Z"/><path d="M12 3v17" fill="none" stroke="currentColor" stroke-width="1.35"/>'},
  {id:'jet',uk:'Герань-3 / 4 · умовна',ru:'Герань-3 / 4 · условная',color:'#f8bc72',shape:'<path d="M12 1 16 11 22 16 22 19 13.5 16 13.5 21 16 23 8 23 10.5 21 10.5 16 2 19 2 16 8 11Z"/><path d="M9 23h6" stroke="#ff965e" stroke-width="2"/>'},
  {id:'rocket',uk:'Герань-5 · умовна',ru:'Герань-5 · условная',color:'#ed9bc6',shape:'<path d="M12 1q6 4 5 13l4 5v3l-8-4h-2l-8 4v-3l4-5Q6 5 12 1Z"/><path d="M12 8v11" fill="none" stroke="currentColor" stroke-width="1.2"/>'},
  {id:'wing',uk:'Бандероль · умовна',ru:'Бандероль · условная',color:'#adc6ff',shape:'<path d="M12 2 15 12 23 15v3l-9-2-2 7-2-7-9 2v-3l8-3Z"/><path d="M12 4v15" fill="none" stroke="currentColor" stroke-width="1"/>'},
  {id:'cruise',uk:'Крилата мітка',ru:'Крылатая отметка',color:'#c0f0a5',shape:'<path d="M12 1 15 9 22 14 22 17 14 14l-2 8-2-8-8 3v-3l7-5Z"/>'},
  {id:'quad',uk:'Малий квадрокоптер',ru:'Малый квадрокоптер',color:'#c2d6e6',shape:'<rect x="10" y="10" width="4" height="4" rx="1"/><path d="M8 8 5 5m11 3 3-3M8 16l-3 3m11-3 3 3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="4" cy="4" r="3"/><circle cx="20" cy="4" r="3"/><circle cx="4" cy="20" r="3"/><circle cx="20" cy="20" r="3"/>'},
  {id:'unknown',uk:'Невідома мітка',ru:'Неизвестная отметка',color:'#f1ce70',shape:'<path d="M9 9q0-4 4-4t4 4q0 3-4 5v2" stroke="currentColor" stroke-width="3" fill="none"/><circle cx="13" cy="20" r="1.7"/>'}
 ];
 const shapes=new Map();
 for(const kind of kinds){
  const src=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${kind.color}" stroke="${kind.color}" stroke-width=".4" stroke-linejoin="round">${kind.shape}</svg>`;
  const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(src);shapes.set(kind.id,img);
 }
 const items=[],snapshots=new Map();let seq=1,selectedKind='delta',armed=false,enabled=true;
 let width=1,height=1,dpr=1,lastTime=game.getTime(),lastAngle=null,smoothTime=game.getTime(),lastAnim=null,lastPaint=0,lastVisualSpeed=0,lastPaused=null;
 const lang=()=>api.getLanguage()==='uk'?'uk':'ru';
 const text=(uk,ru)=>lang()==='uk'?uk:ru;
 function iconMarkup(kind){return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="currentColor" stroke-width=".4">${kind.shape}</svg>`;}
 const machineHTML=`<div class="scanner-machine scanner-machine--compact" aria-label="Навчальна радарна машина">
  <span class="scanner-machine-pulse"></span>
  <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
   <ellipse cx="24" cy="38" rx="12" ry="3.4" fill="#001118" opacity=".42"/>
   <rect x="9" y="20" width="30" height="12" rx="4" fill="#13242c" stroke="#21515a" stroke-width="1.5"/>
   <rect x="13" y="16" width="22" height="7" rx="2.4" fill="#5c7d78" stroke="#bce9cb" stroke-width="1"/>
   <rect x="12" y="32" width="6" height="5" rx="1.3" fill="#0a1218"/><rect x="30" y="32" width="6" height="5" rx="1.3" fill="#0a1218"/>
   <rect x="20" y="22" width="8" height="8" rx="2" fill="#173138" stroke="#79baab" stroke-width=".8"/>
   <g class="scanner-dish"><path d="M24 21V9" stroke="#aff2cf" stroke-width="1.9"/><path d="M13 10q11-8 22 0l-11 7Z" fill="#90c6ac" stroke="#20493d" stroke-width="1.4"/><path d="M17 10h14" stroke="#c8f4d6" stroke-width="1.2"/><circle cx="24" cy="17" r="1.6" fill="#6bf1bb"/></g>
  </svg></div>`;
 const machine=L.marker(ORIGIN,{icon:L.divIcon({className:'scanner-leaflet-icon',html:machineHTML,iconSize:[44,44],iconAnchor:[22,22]}),keyboard:false,zIndexOffset:1900,interactive:true}).addTo(map);
 machine.bindTooltip(text('Навчальна радарна машина · вигадана позиція','Учебная радарная машина · вымышленная позиция'),{direction:'top',offset:[0,-29],className:'district-tooltip'});
 function resize(){
  const rect=el('mapWrap').getBoundingClientRect();width=Math.max(1,Math.floor(rect.width));height=Math.max(1,Math.floor(rect.height));
  dpr=Math.min(1.25,window.devicePixelRatio||1);cvs.width=Math.round(width*dpr);cvs.height=Math.round(height*dpr);
  cvs.style.width=width+'px';cvs.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
 }
 function center(){return map.latLngToContainerPoint(ORIGIN);}
 function radius(){return Math.min(660,Math.max(115,205*Math.pow(1.6,map.getZoom()-6)));}
 function objectCoordinates(item,t){
  // Decorative tiny oscillation around its own original marker, never point-to-point routing.
  const dt=Math.max(0,t-item.birth)/48;
  return L.latLng(item.base.lat+Math.sin(dt*.72+item.seed)*.036,item.base.lng+Math.cos(dt*.54+item.seed)*.045);
 }
 function angleCrossed(prev,now,a,travel){return travel>=TAU || ((a-prev+TAU)%TAU) <= Math.max(.00001,travel);}
 function createItem(at){
  if(items.length>=MAX_OBJECTS){el('objectHelp').textContent=text('Ліміт — 16 навчальних об’єктів.','Лимит — 16 учебных объектов.');return;}
  const kind=kinds.find(k=>k.id===selectedKind)||kinds[0];const id=seq++;
  const point=at||api.getSelectedCenter?.()||map.getCenter();
  items.push({id,kind,base:L.latLng(point.lat,point.lng),birth:smoothTime,seed:id*1.11});
  renderStudio();lastAngle=null;
 }
 function clear(){items.length=0;snapshots.clear();armed=false;syncArmed();renderStudio();}
 function syncArmed(){
  el('radarPlace').classList.toggle('is-armed',armed);
  el('radarPlace').setAttribute('aria-pressed',String(armed));
  el('mapWrap').classList.toggle('radar-placement',armed);
  el('objectHelp').textContent=armed?text('Клікни на мапі, щоб поставити навчальну позначку. Esc — скасувати.','Кликни на карте для учебной отметки. Esc — отмена.')
  :text('Позначки мають вигадані параметри та не розраховують маршрути.','У отметок вымышленные параметры, маршруты не рассчитываются.');
 }
 function makeIcon(){
  const select=el('radarKind');select.replaceChildren();
  for(const kind of kinds){const opt=document.createElement('option');opt.value=kind.id;opt.textContent=kind[lang()];select.add(opt);}
  select.value=selectedKind;
  const preview=el('radarKindIcon'),kind=kinds.find(k=>k.id===selectedKind)||kinds[0];
  preview.innerHTML=iconMarkup(kind);preview.style.color=kind.color;
 }
 function renderStudio(){
  el('radarObjectCount').textContent=String(items.length);
  const list=el('radarObjectList');list.replaceChildren();
  if(!items.length){const empty=document.createElement('li');empty.className='object-empty';empty.textContent=text('Ще немає навчальних позначок.','Пока нет учебных отметок.');list.append(empty);return;}
  for(const item of items.slice().reverse()){
   const li=document.createElement('li'),target=document.createElement('button'),remove=document.createElement('button');
   li.className='object-row';target.type='button';target.className='object-focus';
   const glyph=document.createElement('span');glyph.className='object-glyph';glyph.style.color=item.kind.color;glyph.innerHTML=iconMarkup(item.kind);
   const label=document.createElement('span');label.textContent=item.kind[lang()]+' · '+String(item.id).padStart(2,'0');
   target.append(glyph,label);target.title=text('Знайти на мапі','Показать на карте');
   target.addEventListener('click',()=>map.flyTo(item.base,Math.max(map.getZoom(),7),{duration:.55}));
   remove.type='button';remove.className='object-delete';remove.textContent='×';remove.title=text('Прибрати позначку','Удалить отметку');
   remove.setAttribute('aria-label',remove.title);
   remove.addEventListener('click',()=>{const i=items.findIndex(x=>x.id===item.id);if(i!==-1){items.splice(i,1);snapshots.delete(item.id);renderStudio();}});
   li.append(target,remove);list.append(li);
  }
 }
 function drawSweep(now,pivot,R){
  const cx=pivot.x,cy=pivot.y,angle=(now/PERIOD*TAU)%TAU;
  if(cx+R<0||cy+R<0||cx-R>width||cy-R>height)return angle;
  ctx.save();
  // Rings mark purely decorative scan coverage. No real range or sensitivity.
  ctx.setLineDash([3,7]);
  for(const fraction of [.5,1]){ctx.strokeStyle=`rgba(56,203,144,${fraction===1?.21:.12})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,R*fraction,0,TAU);ctx.stroke();}
  ctx.setLineDash([]);
  // Short fading wedge behind a crisp and narrower scanning line.
  ctx.translate(cx,cy);ctx.rotate(angle);
  const gradient=ctx.createRadialGradient(0,0,15,0,0,R);gradient.addColorStop(0,'rgba(50,250,161,.015)');gradient.addColorStop(.5,'rgba(50,250,161,.12)');gradient.addColorStop(1,'rgba(50,250,161,0)');
  ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R,-.31,0);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
  ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(R,0);ctx.lineWidth=1.7;ctx.strokeStyle='rgba(92,255,180,.82)';ctx.stroke();
  ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(R*.58,0);ctx.lineWidth=3.4;ctx.strokeStyle='rgba(90,255,167,.10)';ctx.stroke();ctx.restore();
  return angle;
 }
 function drawContact(position,item,opacity){
  const x=position.x,y=position.y;if(x<0||y<0||x>width||y>height)return;
  ctx.save();ctx.globalAlpha=opacity;ctx.lineWidth=1.2;ctx.strokeStyle=item.kind.color;ctx.fillStyle='#091c28';
  ctx.beginPath();ctx.arc(x,y,13,0,TAU);ctx.fill();ctx.stroke();
  const img=shapes.get(item.kind.id);
  if(img?.complete&&img.naturalWidth)ctx.drawImage(img,x-10,y-10,20,20);
  else{ctx.fillStyle=item.kind.color;ctx.fillRect(x-2,y-2,4,4);}
  ctx.font='700 10px system-ui';ctx.fillStyle='#e0fcf4';ctx.textBaseline='middle';ctx.fillText('#'+String(item.id).padStart(2,'0'),x+17,y+1);ctx.restore();
 }
 function render(t=smoothTime){
  ctx.clearRect(0,0,width,height);if(!enabled)return;
  const pivot=center(),R=radius(),angle=drawSweep(t,pivot,R);
  const travel=lastAngle===null?0:(t-lastTime)/PERIOD*TAU;
  if(lastAngle!==null&&!game.isPaused()&&t>=lastTime){
   for(const item of items){
    const ll=objectCoordinates(item,t),p=map.latLngToContainerPoint(ll);
    if(Math.hypot(p.x-pivot.x,p.y-pivot.y)>R)continue;
    const dir=(Math.atan2(p.y-pivot.y,p.x-pivot.x)+TAU)%TAU;
    if(angleCrossed(lastAngle,angle,dir,travel)&&travel>0)snapshots.set(item.id,{at:t,latlng:ll});
   }
  }
  lastAngle=angle;lastTime=t;
  for(const item of items){const snap=snapshots.get(item.id);if(!snap)continue;
   const age=t-snap.at,alpha=Math.max(0,1-age/38);if(alpha<=0){snapshots.delete(item.id);continue;}
   drawContact(map.latLngToContainerPoint(snap.latlng),item,alpha);
  }
 }
 function animate(ms){
  requestAnimationFrame(animate);
  if(lastAnim===null){lastAnim=ms;return;}
  const dt=Math.min(.12,Math.max(0,(ms-lastAnim)/1000));lastAnim=ms;
  if(!game.isPaused())smoothTime+=dt*3*game.getSpeed();
  if(document.hidden)return;
  if(game.getSpeed()!==lastVisualSpeed||game.isPaused()!==lastPaused){
   const machineNode=machine.getElement();
   if(machineNode){machineNode.style.setProperty('--sweep-period', (4/game.getSpeed())+'s');machineNode.classList.toggle('is-paused',game.isPaused());}
   lastVisualSpeed=game.getSpeed();lastPaused=game.isPaused();
  }
  if(ms-lastPaint<42)return;lastPaint=ms;render(smoothTime);
 }
 function updateLanguage(){
  const copy={
   radarHeading:text('РАДАРНА МАШИНА','РАДАРНАЯ МАШИНА'),radarBadge:'МОДУЛЬ 03',
   radarSpinLabel:text('ГЕОПРИВ’ЯЗКА · 4 С / 1×','ГЕОПРИВЯЗКА · 4 С / 1×'),
   radarSweepLabel:text('Промінь обертається від машини. Мітки оновлюються після сканування.','Луч вращается от машины. Отметки обновляются после сканирования.'),
   radarTargetsLabel:text('НАВЧАЛЬНІ МІТКИ','УЧЕБНЫЕ МЕТКИ'),
   radarVisibleLabel:text('Видно після сканування','Видны после сканирования'),
   radarSpawnLabel:text('Додати біля вибраного району','Добавить возле района'),radarClearLabel:text('Очистити','Очистить'),
   radarShowMapLabel:text('Показувати сканер на мапі','Показывать сканер на карте'),
   radarNote:text('Вигадана машина та умовні моделі. Це не справжня РЛС і не реальні маршрути.','Вымышленная машина и условные модели. Это не настоящая РЛС и не реальные маршруты.'),
   radarMapCaption:text('◉ НАВЧАЛЬНИЙ РАДАР','◉ УЧЕБНЫЙ РАДАР'),
   radarStudioTitle:text('РЕДАКТОР ОБ’ЄКТІВ','РЕДАКТОР ОБЪЕКТОВ'),
   radarKindLabel:text('ТИП ПОЗНАЧКИ','ТИП МЕТКИ'),radarPlaceLabel:text('Поставити на мапі','Разместить на карте'),
   radarLocateLabel:text('Знайти радарну машину','Найти радарную машину'),
   radarListTitle:text('СТВОРЕНІ ОБ’ЄКТИ','СОЗДАННЫЕ ОБЪЕКТЫ'),
   radarObjectHint:text('Різні силуети, без розрахунку бойових параметрів.','Разные силуэты, без расчёта боевых параметров.')
  };
  for(const [id,v] of Object.entries(copy))if(el(id))el(id).textContent=v;
  machine.setTooltipContent(text('Навчальна радарна машина · вигадана позиція','Учебная радарная машина · вымышленная позиция'));
  makeIcon();syncArmed();renderStudio();
 }
 el('radarKind').addEventListener('change',e=>{selectedKind=e.target.value;makeIcon();});
 el('radarSpawn').addEventListener('click',()=>createItem());
 el('radarPlace').addEventListener('click',()=>{armed=!armed;syncArmed();if(armed&&window.innerWidth<800){el('app').classList.remove('menu-open');}});
 map.on('click',e=>{if(!armed)return;armed=false;syncArmed();createItem(e.latlng);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&armed){armed=false;syncArmed();}});
 el('radarClear').addEventListener('click',clear);
 el('radarLocate').addEventListener('click',()=>map.flyTo(ORIGIN,Math.max(7,map.getZoom()),{duration:.6}));
 el('radarMapToggle').addEventListener('change',e=>{enabled=e.target.checked;machine.getElement()?.classList.toggle('is-off',!enabled);el('radarMapCaption').hidden=!enabled;lastAngle=null;if(!enabled){snapshots.clear();ctx.clearRect(0,0,width,height);}});
 window.addEventListener('atlas:language',updateLanguage);
 window.addEventListener('atlas:game-reset',()=>{clear();smoothTime=game.getTime();lastTime=smoothTime;lastAngle=null;});
 if('ResizeObserver'in window)new ResizeObserver(resize).observe(el('mapWrap'));
 window.addEventListener('resize',resize);
 // The animation loop redraws during pan; avoid additional work on every move event.
 map.on('resize zoomend',()=>render(smoothTime));
 resize();updateLanguage();requestAnimationFrame(animate);
 window.ATLAS_RADAR={spawn:()=>createItem(),clear,count:()=>items.length,snapshotCount:()=>snapshots.size,redraw:render,getOrigin:()=>({lat:ORIGIN.lat,lng:ORIGIN.lng}),getOriginPoint:()=>{const p=center();return{x:p.x,y:p.y};},getKinds:()=>kinds.map(({id,uk,ru})=>({id,uk,ru}))};
})();
