import {ARMED_ENEMY_SCALE} from './scene-scale.js?v=armed-scale-1';
import {canEnemyAttack} from './combat-feel.js?v=52';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const FACTORY_ARENAS=[
 {trigger:335,left:180,right:600,count:3,label:'LÍNEA DE PRODUCCIÓN'},
 {trigger:995,left:840,right:1260,count:4,label:'CONTROL DE ENVÍOS'},
 {trigger:1655,left:1500,right:1920,count:5,label:'ACCESO A LOS HORNOS'},
 {trigger:2175,left:2020,right:2440,count:1,label:'CUADRO DE PRODUCCIÓN',boss:true}
];
export function factoryEnemy(e,stage,index){
 Object.assign(e,{soldier:true,role:index%2?'assault':'rifle',hp:index%2?68:54,maxHp:index%2?68:54,rounds:0});
}
function advance(e,dx,dy,dt,speed,stride=68){
 const ox=e.x,oy=e.y;e.x+=dx*speed*dt;e.y+=dy*25*dt;
 e.moving=Math.abs(e.x-ox)+Math.abs(e.y-oy)>.001;
 e.walk+=Math.hypot(e.x-ox,(e.y-oy)*1.6)/stride*(e.role==='breacher'?4:6);
}
export function updateSoldier(game,e,dt){
 const p=game.player,a=game.arenas[game.stage];if(e.stun>0)return;
 if(e.state==='enter'){
  if(e.entryDelay>0){e.entryDelay-=dt;return;}
  const dx=e.entryTargetX-e.x;advance(e,Math.sign(dx),0,dt,Math.min(92,Math.abs(dx)/dt));e.facing=Math.sign(dx)||e.facing;
  if(Math.abs(e.entryTargetX-e.x)<1){e.state='chase';e.cd=.9;}return;
 }
 if(e.state==='windup'){
  e.facing=e.dir;e.timer-=dt;
  if(e.timer<=0){e.state='strike';e.timer=.3;
   if(e.move==='butt'){
    if((p.x-e.x)*e.dir>-8&&(p.x-e.x)*e.dir<48&&Math.abs(p.y-e.targetY)<13)game.hurtPlayer(14,e.dir);
    game.emit('enemySwing');
   }else{
    for(const offset of (e.role==='breacher'?[-9,0,9]:[0]))game.projectiles.push({id:++game.uid,x:e.x+e.dir*34*ARMED_ENEMY_SCALE,y:clamp(e.targetY+offset,190,239),dir:e.dir,speed:e.role==='breacher'?185:240,ttl:e.role==='breacher'?.8:2.2,owner:'enemy',damage:e.role==='breacher'?8:12,rifle:true});game.emit('shoot');
   }
  }return;
 }
 if(e.state==='strike'||e.state==='recover'){
  e.facing=e.dir;e.timer-=dt;
  if(e.timer<=0){if(e.state==='strike'){e.state='recover';e.timer=e.move==='butt'?.8:1.15;}else{e.state='chase';e.cd=.6;}}return;
 }
 const dx=p.x-e.x,dy=p.y-e.y,range=e.role==='breacher'?78:e.role==='marksman'?195:e.role==='assault'?90:155;
 advance(e,Math.abs(dx)>range?Math.sign(dx):Math.abs(dx)<65?-Math.sign(dx):0,Math.abs(dy)>5?Math.sign(dy):0,dt,e.role==='breacher'?57:e.role==='assault'?56:40);
 e.x=clamp(e.x,a.left+22,a.right-22);e.y=clamp(e.y,194,239);
 if(e.cd<=0&&Math.abs(dx)<range+24&&Math.abs(dy)<12&&canEnemyAttack(game,e)){
  e.move=Math.abs(dx)<44?'butt':'rifle';e.state='windup';e.timer=e.move==='butt'?.7:e.role==='marksman'?1.35:1.05;e.dir=Math.sign(dx)||-1;e.targetY=e.y;game.emit('bossTell');
 }
}
export function updateRost(game,e,dt){
 if(e.state==='waiting')return;
 const p=game.player,a=game.arenas[3];
 if(e.state!=='chase')e.facing=e.dir;
 if(e.state==='windup'){
  e.timer-=dt;
  if(e.timer<=0){e.state='strike';e.timer=.32;e.hit=false;game.emit('slap');
   if(e.move==='shards'){
    for(const y of [e.targetY-16,e.targetY,e.targetY+16])game.projectiles.push({id:++game.uid,x:e.x+e.dir*78,y:clamp(y,190,239),dir:e.dir,speed:155,ttl:3,owner:'boss',damage:14,ceramic:true,blue:true});game.emit('papers');
   }else if(e.move==='slam'){game.shake=5;game.effects.push({kind:'shockwave',x:e.x+e.dir*36,y:e.targetY,ttl:.5,total:.5});}
  }return;
 }
 if(e.state==='strike'){
  e.timer-=dt;
  const reach=e.move==='slam'?105:78;
  if(e.move!=='shards'&&!e.hit&&(p.x-e.x)*e.dir>-10&&(p.x-e.x)*e.dir<reach&&Math.abs(p.y-e.targetY)<(e.move==='slam'?19:13))e.hit=game.hurtPlayer(e.move==='slam'?26:22,e.dir);
  if(e.timer<=0){e.state='recover';e.timer=e.move==='slam'?1.7:1.25;e.saying='';}return;
 }
 if(e.state==='recover'){e.timer-=dt;if(e.timer<=0){e.state='chase';e.cd=.6;}return;}
 if(e.stun>0)return;
 const dx=p.x-e.x,dy=p.y-e.y;
 advance(e,Math.abs(dx)>65?Math.sign(dx):0,Math.abs(dy)>5?Math.sign(dy):0,dt,46,88);
 e.x=clamp(e.x,a.left+32,a.right-32);e.y=clamp(e.y,194,239);
 if(e.cd<=0&&(Math.abs(dx)<110||e.attackIndex%3===2)){
  e.move=['punch','slam','shards'][e.attackIndex++%3];e.state='windup';e.timer=e.move==='punch'?.95:1.25;e.dir=Math.sign(dx)||-1;e.targetY=p.y;
  e.saying=['¡APÁRTATE DE LOS CONTROLES!','¡LA PRODUCCIÓN NO SE PARA!','¡ESOS ENVÍOS SALEN HOY!'][(e.attackIndex-1)%3];e.sayingT=e.timer;game.emit('bossTell');
 }
}
