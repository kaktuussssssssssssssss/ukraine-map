/* ATLAS UA 1.8 — fictional radar anchored to a map latitude/longitude.
   No real radar data, weapons specifications or strike planning. */
'use strict';
(() => {
 const api=window.ATLAS_MAP_API,game=window.ATLAS_GAME;
 const cvs=document.getElementById('radarOverlay');
 if(!cvs||!api||!game)return;
 const ctx=cvs.getContext('2d',{alpha:true});if(!ctx)return;
 const map=api.map;const el=id=>document.getElementById(id);
 const TWO=Math.PI*2,PERIOD=12; // 12 game seconds == 4 actual seconds at 1×
 // A stable, arbitrary *fictional* center in Ukraine. Not the location of a real radar.
 // It is stored as a LatLng, NEVER derived from the viewport/screen center.
 const ORIGIN=Object.freeze({lat:49.17,lng:31.31});
 function originPoint(){return map.latLngToContainerPoint(L.latLng(ORIGIN.lat,ORIGIN.lng));}
 const types=[
  {symbol:'◇',kind:'probe',color:'#3adcb0',uk:'Навчальний БПЛА',ru:'Учебный БПЛА'},
  {symbol:'▲',kind:'fast',color:'#f2cb77',uk:'Швидка мітка',ru:'Быстрая отметка'},
  {symbol:'◆',kind:'unknown',color:'#8dbfea',uk:'Невідома мітка',ru:'Неизвестная отметка'}
 ];
 const items=[],seen=new Map();let nextId=1,viewW=0,viewH=0,dpi=1,lastAngle=null,lastTime=game.getTime(),lastFrame=0;
 let enabled=true;let smoothTime=game.getTime(),lastAnimationMs=null;
 const language=()=>api.getLanguage()==='uk'?'uk':'ru';
 function resize(){
  const bounds=el('mapWrap').getBoundingClientRect();
  viewW=Math.max(1,Math.round(bounds.width));viewH=Math.max(1,Math.round(bounds.height));
  dpi=Math.min(1.5,window.devicePixelRatio||1);
  cvs.width=Math.round(viewW*dpi);cvs.height=Math.round(viewH*dpi);
  cvs.style.width=viewW+'px';cvs.style.height=viewH+'px';
  ctx.setTransform(dpi,0,0,dpi,0,0);
 }
 function pickedCenter(){return api.getSelectedCenter?.()||map.getCenter();}
 function spawn(){
  if(items.length>=24)return;
  const pos=pickedCenter(),id=nextId++;
  // Slight, purely visual fictional drift — no destinations or geographic flight routing.
  const item={id,base:L.latLng(pos.lat,pos.lng),birth:smoothTime,type:types[(id-1)%types.length],offset:Math.PI*id*.7};
  items.push(item);el('radarObjectCount').textContent=String(items.length);
  seen.delete(id); // invisible until the sweep actually reaches it
 }
 function clear(){items.length=0;seen.clear();el('radarObjectCount').textContent='0';}
 function coords(item,t){
  const dt=Math.max(0,t-item.birth)/55;
  // Small stationary-ish loops: purely aesthetic, not an actual weapons trajectory.
  return L.latLng(item.base.lat+Math.sin(dt*.7+item.offset)*.08,item.base.lng+Math.cos(dt*.8+item.offset)*.12);
 }
 function sweepCrossed(prev,now,a){return ((a-prev+TWO)%TWO)<=((now-prev+TWO)%TWO);}
 function drawMarker(point,item,opacity){
  const x=point.x,y=point.y;if(x<0||y<0||x>viewW||y>viewH)return;
  ctx.save();ctx.globalAlpha=opacity;
  ctx.shadowBlur=11;ctx.shadowColor=item.type.color;
  ctx.strokeStyle=item.type.color;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(x,y,10,0,TWO);ctx.stroke();
  ctx.fillStyle='#092c2a';ctx.beginPath();ctx.arc(x,y,8,0,TWO);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle=item.type.color;
  ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.type.symbol,x,y+.3);
  ctx.textAlign='left';ctx.fillStyle='#d4f6ee';ctx.font='700 10px system-ui';
  const text=(language()==='uk'?'МІТКА ':'МЕТКА ')+String(item.id).padStart(2,'0');
  ctx.fillText(text,x+14,y+3);
  ctx.restore();
 }
 function render(now=smoothTime){
  if(!viewW||!viewH)return;
  ctx.clearRect(0,0,viewW,viewH);if(!enabled)return;
  const angle=(now/PERIOD*TWO)%TWO;
  // Geographically anchored pivot: follows the map's pan and zoom projection.
  // The viewport may move independently, but the geographic origin stays fixed.
  const pivot=originPoint(),cx=pivot.x,cy=pivot.y;
  const far=Math.min(100000,Math.hypot(Math.max(Math.abs(cx),Math.abs(cx-viewW)),Math.max(Math.abs(cy),Math.abs(cy-viewH)))+80);
  // Minimal line avoids full-screen tint and expensive giant glow.

  ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(far,0);
  ctx.strokeStyle='rgba(69,240,148,.82)';ctx.lineWidth=1.4;ctx.shadowColor='#46eaa0';ctx.shadowBlur=5;ctx.stroke();ctx.restore();
  // A tiny unobtrusive geographic pivot, visible only while it is on-screen.
  if(cx>=0&&cy>=0&&cx<=viewW&&cy<=viewH){
   ctx.save();ctx.strokeStyle='rgba(61,231,159,.7)';ctx.lineWidth=1;
   ctx.beginPath();ctx.arc(cx,cy,4,0,TWO);ctx.stroke();ctx.restore();
  }
  // Continuous real positions remain hidden; only a discrete, fading snapshot is drawn.
  if(lastAngle!==null&&!game.isPaused()&&now>=lastTime){
   const travel=(now-lastTime)/PERIOD*TWO;
   if(travel>0&&travel<=TWO*1.2){
    for(const item of items){
     const ll=coords(item,now),p=map.latLngToContainerPoint(ll);
     if(p.x<0||p.y<0||p.x>viewW||p.y>viewH)continue;
     const direction=(Math.atan2(p.y-cy,p.x-cx)+TWO)%TWO;
     if(travel>=TWO||sweepCrossed(lastAngle,angle,direction))seen.set(item.id,{latlng:ll,at:now});
    }
   }
  }
  lastAngle=angle;lastTime=now;
  for(const item of items){
   const snap=seen.get(item.id);if(!snap)continue;
   const age=now-snap.at,alpha=Math.max(0,1-age/23);
   if(alpha<=0){seen.delete(item.id);continue;}
   drawMarker(map.latLngToContainerPoint(snap.latlng),item,Math.max(.05,alpha));
  }
 }
 function animation(ms){
  requestAnimationFrame(animation);
  if(lastAnimationMs===null){lastAnimationMs=ms;return;}
  const dt=Math.min(.12,Math.max(0,(ms-lastAnimationMs)/1000));lastAnimationMs=ms;
  if(!game.isPaused())smoothTime+=dt*3*game.getSpeed();
  if(document.hidden){lastAngle=null;return;}
  if(ms-lastFrame<33)return; // smooth 30fps overlay, independent of map vector layers
  lastFrame=ms;render(smoothTime);
 }
 function updateLanguage(){
  const uk=language()==='uk';
  const copy={
   radarHeading:uk?'РАДАР · ГЕОПРИВ’ЯЗКА':'РАДАР · ГЕОПРИВЯЗКА',radarBadge:uk?'МОДУЛЬ 03':'МОДУЛЬ 03',
   radarTargetsLabel:uk?'УМОВНІ ЦІЛІ':'УСЛОВНЫЕ ЦЕЛИ',radarVisibleLabel:uk?'Видно після сканування':'Видны после сканирования',
   radarSpinLabel:uk?'ЦЕНТР У КООРДИНАТАХ МАПИ · 4 С / 1×':'ЦЕНТР В КООРДИНАТАХ КАРТЫ · 4 С / 1×',
   radarSweepLabel:uk?'Мітки з’являються після проходу променя та згасають.':'Метки появляются после прохода луча и затухают.',
   radarSpawnLabel:uk?'Додати навчальну мітку':'Добавить учебную отметку',radarClearLabel:uk?'Очистити':'Очистить',
   radarShowMapLabel:uk?'Показати геоприв’язаний радар':'Показать геопривязанный радар',
   radarNote:uk?'Вигадані навчальні цілі. Не відображає реальні дрони та ракети.':'Вымышленные учебные цели. Не показывает реальные дроны и ракеты.',
   radarMapCaption:uk?'● РАДАР · ЦЕНТР УКРАЇНИ':'● РАДАР · ЦЕНТР УКРАИНЫ'
  };
  for(const [id,value] of Object.entries(copy))if(el(id))el(id).textContent=value;
 }
 el('radarSpawn').addEventListener('click',spawn);
 el('radarClear').addEventListener('click',clear);
 el('radarMapToggle').addEventListener('change',e=>{enabled=e.target.checked;if(!enabled)seen.clear();el('radarMapCaption').hidden=!enabled;lastAngle=null;});
 window.addEventListener('atlas:language',updateLanguage);
 window.addEventListener('atlas:game-reset',()=>{clear();smoothTime=game.getTime();lastAngle=null;lastTime=smoothTime;});
 if('ResizeObserver'in window)new ResizeObserver(resize).observe(el('mapWrap'));
 window.addEventListener('resize',resize);
 map.on('resize moveend zoomend',()=>{if(!el('mapWrap'))return;render();});
 resize();updateLanguage();requestAnimationFrame(animation);
 window.ATLAS_RADAR={spawn,clear,count:()=>items.length,snapshotCount:()=>seen.size,redraw:render,getOrigin:()=>({...ORIGIN}),getOriginPoint:()=>{const p=originPoint();return {x:p.x,y:p.y};}};
})();
