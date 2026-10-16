/* ATLAS UA 1.6 / Entirely fictional visual radar and moving training markers.
   This module is NOT a flight planner and does not model real sensors or weapons. */
'use strict';
(() => {
 const mapApi=window.ATLAS_MAP_API,game=window.ATLAS_GAME;
 if(!mapApi||!game)return;
 const $=id=>document.getElementById(id);
 const canvas=$('radarCanvas'),ctx=canvas?.getContext('2d');
 if(!ctx)return;
 const RAD=2*Math.PI, CENTER=260, RADIUS=219, REVO_GAME_SECONDS=12; // exactly 4 real seconds at 1×
 const variants=[
  {icon:'◆',kind:'probe',color:'#86e8e0',labelUk:'Навчальна мітка',labelRu:'Учебная отметка'},
  {icon:'▲',kind:'fast',color:'#e4be76',labelUk:'Швидкий маркер',labelRu:'Быстрый маркер'},
  {icon:'■',kind:'unknown',color:'#a0c6f4',labelUk:'Невідома мітка',labelRu:'Неизвестная отметка'}
 ];
 const objects=[],detections=new Map();
 let nextId=1,lastSweep=null,lastGameTime=game.getTime(),frame=0,lastDraw=0,visible=true;
 const isUk=()=>mapApi.getLanguage()==='uk';
 mapApi.map.createPane('trainingMarkerPane');
 const pane=mapApi.map.getPane('trainingMarkerPane');pane.style.zIndex='520';pane.style.pointerEvents='none';
 const text={
  uk:{radarHeading:'ІГРОВИЙ РАДАР',radarBadge:'МОДУЛЬ 03',radarTargetsLabel:'УМОВНІ ОБ’ЄКТИ',radarSpinLabel:'ОБЕРТ: 4 С НА 1×',radarSweepLabel:'МІТКИ ЗАТУХАЮТЬ',radarSpawnLabel:'Додати тестову ціль',radarClearLabel:'Очистити',radarShowMapLabel:'Показувати об’єкти на мапі',radarNote:'Навчальні мітки та умовний рух. Не відображає реальну повітряну обстановку.',simMultiHelp:'Ctrl + клік — вибрати кілька районів. Рівень зміниться для всіх.'},
  ru:{radarHeading:'ИГРОВОЙ РАДАР',radarBadge:'МОДУЛЬ 03',radarTargetsLabel:'УСЛОВНЫЕ ОБЪЕКТЫ',radarSpinLabel:'ОБОРОТ: 4 С НА 1×',radarSweepLabel:'МЕТКИ ЗАТУХАЮТ',radarSpawnLabel:'Добавить тестовую цель',radarClearLabel:'Очистить',radarShowMapLabel:'Показывать объекты на карте',radarNote:'Учебные отметки и условное движение. Не показывает реальную воздушную обстановку.',simMultiHelp:'Ctrl + клик — выбери несколько районов. Уровень изменится у всех.'}
 };
 function applyLanguage(){const t=text[isUk()?'uk':'ru'];for(const [id,label] of Object.entries(t))if($(id))$(id).textContent=label;for(const obj of objects)if(obj.marker)obj.marker.setTooltipContent(isUk()?obj.variant.labelUk:obj.variant.labelRu);}
 function position(obj,t){
  // Closed synthetic visual loops without endpoints, city targets, or real-world flight modeling.
  const phase=(t-obj.birth)*(.010+obj.variantIndex*.0025)+obj.seed;
  return {lat:48.5+Math.sin(obj.seed*2.2)*1.35+Math.sin(phase)*.48,lng:31.5+Math.cos(obj.seed*1.8)*3+Math.cos(phase*.79)*.92};
 }
 function normalized(obj,t){
  const p=position(obj,t);
  return {x:(p.lng-31.5)/8,y:-(p.lat-48.5)/4};
 }
 function markerIcon(variant){
  return L.divIcon({className:'training-marker',html:`<span class="training-marker-body ${variant.kind}" aria-label="SIMULATION">${variant.icon}</span>`,iconSize:[30,30],iconAnchor:[15,15]});
 }
 function spawn(){
  if(objects.length>=12)return;
  const variantIndex=(nextId-1)%variants.length,variant=variants[variantIndex];
  const id=nextId++,birth=game.getTime(),seed=id*2.04;
  const obj={id,variant,variantIndex,birth,seed,marker:null};
  const p=position(obj,birth);
  obj.marker=L.marker([p.lat,p.lng],{icon:markerIcon(variant),pane:'trainingMarkerPane',keyboard:false,interactive:false});
  obj.marker.bindTooltip(isUk()?variant.labelUk:variant.labelRu,{direction:'top'});
  if($('radarMapToggle').checked)obj.marker.addTo(mapApi.map);
  objects.push(obj);$('radarObjectCount').textContent=String(objects.length);
 }
 function clear(){for(const obj of objects)if(obj.marker)mapApi.map.removeLayer(obj.marker);objects.length=0;detections.clear();$('radarObjectCount').textContent='0';}
 function stepObjects(now){
  if(!visible)return;
  if(!$('radarMapToggle').checked)return;
  for(const obj of objects){const p=position(obj,now);obj.marker.setLatLng([p.lat,p.lng]);}
 }
 function circle(x,y,r,color,width=1){ctx.beginPath();ctx.arc(x,y,r,0,RAD);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
 function render(now){
  const w=520,h=520;ctx.clearRect(0,0,w,h);
  ctx.save();ctx.translate(CENTER,CENTER);
  const surface=ctx.createRadialGradient(0,0,5,0,0,260);
  surface.addColorStop(0,'#103b39');surface.addColorStop(1,'#06141e');
  ctx.fillStyle=surface;ctx.beginPath();ctx.arc(0,0,244,0,RAD);ctx.fill();
  ctx.strokeStyle='rgba(88,185,157,.12)';ctx.lineWidth=1;
  for(let i=1;i<=4;i++)circle(0,0,i*RADIUS/4,'rgba(96,185,156,.19)');
  ctx.beginPath();ctx.moveTo(-RADIUS,0);ctx.lineTo(RADIUS,0);ctx.moveTo(0,-RADIUS);ctx.lineTo(0,RADIUS);ctx.stroke();
  for(let i=0;i<12;i++){const a=i*RAD/12;ctx.beginPath();ctx.moveTo(Math.cos(a)*233,Math.sin(a)*233);ctx.lineTo(Math.cos(a)*242,Math.sin(a)*242);ctx.strokeStyle='rgba(109,212,165,.35)';ctx.stroke();}
  // Rotating green scan with gentle trail; its speed follows the simulation clock.
  const sweep=(now/REVO_GAME_SECONDS*RAD)%RAD;
  ctx.save();ctx.rotate(sweep);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,RADIUS,-.39,0);ctx.closePath();
  const grad=ctx.createLinearGradient(0,0,RADIUS,0);grad.addColorStop(0,'rgba(48,214,141,.02)');grad.addColorStop(1,'rgba(71,244,165,.26)');
  ctx.fillStyle=grad;ctx.fill();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(RADIUS,0);ctx.strokeStyle='#67f3ad';ctx.shadowBlur=17;ctx.shadowColor='#58ffbd';ctx.lineWidth=3;ctx.stroke();ctx.restore();
  // Snapshots only update after the moving scan crosses the *current* target direction.
  if(lastSweep!==null&&now>=lastGameTime){
   const move=(sweep-lastSweep+RAD)%RAD;
   if(move<=2){
    for(const obj of objects){
     const p=normalized(obj,now),x=p.x*RADIUS*.8,y=p.y*RADIUS*.8;
     if(Math.hypot(x,y)>RADIUS-10)continue;
     const a=(Math.atan2(y,x)+RAD)%RAD;
     if((a-lastSweep+RAD)%RAD<=move){detections.set(obj.id,{x,y,time:now,color:obj.variant.color});}
    }
   }
  }
  lastSweep=sweep;lastGameTime=now;
  for(const [id,d] of detections){
   if(!objects.find(obj=>obj.id===id)){detections.delete(id);continue;}
   const age=now-d.time,alpha=Math.max(0,1-age/27);
   if(alpha<=0){detections.delete(id);continue;}
   ctx.globalAlpha=alpha;ctx.fillStyle=d.color;ctx.shadowBlur=15*alpha;ctx.shadowColor=d.color;
   ctx.beginPath();ctx.arc(d.x,d.y,5.1,0,RAD);ctx.fill();ctx.shadowBlur=0;
   ctx.strokeStyle=d.color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(d.x,d.y,9,0,RAD);ctx.stroke();ctx.globalAlpha=1;
  }
  ctx.fillStyle='#8deebc';ctx.beginPath();ctx.arc(0,0,4,0,RAD);ctx.fill();ctx.restore();
 }
 function animation(nowMs){
  frame=requestAnimationFrame(animation);
  if(document.hidden||nowMs-lastDraw<42)return;
  lastDraw=nowMs;
  const t=game.getTime();
  stepObjects(t);
  if($('radarPanel').open)render(t);
 }
 $('radarSpawn').addEventListener('click',spawn);
 $('radarClear').addEventListener('click',clear);
 $('radarMapToggle').addEventListener('change',e=>{for(const obj of objects){if(e.target.checked){obj.marker.addTo(mapApi.map);}else{mapApi.map.removeLayer(obj.marker);}}});
 window.addEventListener('atlas:language',applyLanguage);
 window.addEventListener('atlas:game-reset',()=>{clear();lastSweep=null;lastGameTime=game.getTime();});
 window.ATLAS_RADAR={spawn,clear,count:()=>objects.length,snapshotCount:()=>detections.size};
 applyLanguage();frame=requestAnimationFrame(animation);
})();
