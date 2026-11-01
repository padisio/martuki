import {ACTOR_SCALE} from './scene-scale.js?v=52';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const LABORATORY_ARENAS=[
 {trigger:335,left:180,right:600,count:4,label:'PUESTOS DE TRABAJO'},
 {trigger:995,left:840,right:1260,count:5,label:'MUESTRARIOS CERÁMICOS'},
 {trigger:1655,left:1500,right:1920,count:6,label:'SUJETOS DESCARTADOS'},
 {trigger:2175,left:2020,right:2440,count:1,label:'ELISA MARTÓN',boss:true}
];
export const BEAR_INTRO=22.8;
export const BEAR_BEATS={dialogue:.6,summon:3.4,arrive:6.2,contact:6.4,growth:7.4,merge:8.4,formed:9.5,roar:10.5,splash:12.2,nameCross:15,nameDrop:16,nameExit:22};
export function laboratoryAttack(e){
 if(!e.bear)return {windup:.85,strike:e.move==='serum'?.4:.34,impact:.10,recovery:1.05};
 return e.move==='slam'?{windup:1.5,strike:.72,impact:.22,recovery:1.7}:e.move==='charge'?{windup:1.15,strike:.74,impact:.04,recovery:1.4}:{windup:1,strike:.56,impact:.16,recovery:1.25};
}

// The first defeat is a phase change, not a kill or a completed arena.
export function summonMartin(game,e){
 Object.assign(e,{hp:1,state:'waiting',transforming:true,flash:0,stun:0,moving:false});
 game.phase='intro';game.introTimer=BEAR_INTRO;game.projectiles=[];game.effects=[];game.bofeSummon=null;
 Object.assign(game.player,{action:null,moving:false,special:0,dodge:0,hurt:0,invuln:0});
 if(game.laboratoryFusionSeen)game.finishLaboratoryCinematic();else game.emit('bossTell');
}

export function updateLaboratoryBoss(game,e,dt){
 if(e.state==='waiting')return;
 const p=game.player,a=game.arenas[game.stage],bear=!!e.bear,spec=laboratoryAttack(e);
 if(['windup','labStrike','recover'].includes(e.state))e.facing=e.dir;
 if(e.state==='windup'){
  e.timer-=dt;if(e.timer>0)return;
  e.state='labStrike';e.timer=spec.strike;e.attackElapsed=0;e.hit=false;e.impacted=false;return;
 }
 if(e.state==='labStrike'){
  e.timer-=dt;e.attackElapsed=(e.attackElapsed??0)+dt;
  if(!e.impacted&&e.attackElapsed>=spec.impact){
   e.impacted=true;game.emit(e.move==='serum'?'papers':'slap');
   if(e.move==='serum')for(const y of [e.targetY-17,e.targetY,e.targetY+17])game.projectiles.push({id:++game.uid,x:e.x+e.dir*20,y:clamp(y,190,239),dir:e.dir,speed:175,ttl:3,owner:'boss',damage:13,chemical:true});
   if(e.move==='slam'){
    game.effects.push({kind:'shockwave',x:e.x,y:e.y,ttl:.6,total:.6});game.shake=6;
    if(Math.abs(p.x-e.x)<100&&Math.abs(p.y-e.targetY)<18)e.hit=game.hurtPlayer(26,Math.sign(p.x-e.x)||e.dir);
   }
  }
  if(e.move==='charge'){
   const old=e.x;e.x=clamp(e.x+e.dir*215*dt,a.left+38,a.right-38);e.walk+=Math.abs(e.x-old)/(76*ACTOR_SCALE)*8;e.moving=true;
  }
  const active=e.attackElapsed>=spec.impact&&(e.move==='charge'||e.attackElapsed<spec.impact+.18);
  if(active&&['punch','swipe','charge'].includes(e.move)&&!e.hit&&(p.x-e.x)*e.dir>-10&&(p.x-e.x)*e.dir<(bear?72:43)&&Math.abs(p.y-e.targetY)<(bear?18:14))e.hit=game.hurtPlayer(bear?24:16,e.dir);
  if(e.timer<=0){e.state='recover';e.timer=spec.recovery;}return;
 }
 if(e.state==='recover'){e.timer-=dt;if(e.timer<=0){e.state='chase';e.cd=bear?.7:.6;}return;}
 if(e.stun>0)return;
 const dx=p.x-e.x,dy=p.y-e.y,oldX=e.x,oldY=e.y;
 if(Math.abs(dx)>(bear?62:34))e.x=clamp(e.x+Math.sign(dx)*(bear?64:48)*dt,a.left+30,a.right-30);
 if(Math.abs(dy)>5)e.y=clamp(e.y+Math.sign(dy)*24*dt,203,239);
 e.moving=e.x!==oldX||e.y!==oldY;
 if(e.moving)e.walk+=Math.hypot(e.x-oldX,(e.y-oldY)*1.6)/((bear?96:64)*ACTOR_SCALE)*8;
 if(e.cd<=0){
  const moves=bear?['swipe','charge','slam']:['punch','serum','punch'];e.move=moves[e.attackIndex++%moves.length];
  e.dir=Math.sign(dx)||-1;e.facing=e.dir;e.targetY=p.y;e.state='windup';e.timer=laboratoryAttack(e).windup;
  e.saying=bear?(e.move==='slam'?'¡MARTÍN, AL SUELO!':e.move==='charge'?'¡QUE NO SALGA!':'¡ARRÁNCALE LA CABEZA!'):(e.move==='serum'?'¡LA MUESTRA SE QUEDA AQUÍ!':'¡PUES POR LAS MALAS!');e.sayingT=e.timer;game.emit('bossTell');
 }
}
