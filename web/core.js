import {COMBAT,MELEE as melee,combatInput,clearCombatInput,canEnemyAttack} from './combat-feel.js?v=52';
import {ACTOR_SCALE} from './scene-scale.js?v=52';
import {LABORATORY_ARENAS,BEAR_INTRO,BEAR_BEATS,summonMartin,updateLaboratoryBoss} from './laboratory-combat.js?v=boss-retry-1';
export {LABORATORY_ARENAS,BEAR_BEATS} from './laboratory-combat.js?v=boss-retry-1';
import {SEWER_ARENAS,sewerEnemy,updateSewerEnemy,updateMayrena} from './sewer-combat.js?v=52';
import {FACTORY_ARENAS,factoryEnemy,updateSoldier,updateRost} from './factory-combat.js?v=armed-scale-1';
import {ROOFTOP_ARENAS,rooftopEnemy,updateMenina} from './rooftop-combat.js?v=52';
export const WORLD=2520;
export const BOSS_INTRO=11.6;
export const OFFICE_BOSS_INTRO=12.5;
export const OFFICE_BOSS_BEATS={encounter:1.8,reveal:2.15,splash:4.8,nameCross:7.4,nameDrop:8.45,nameExit:11.8};
export const BOSS_BEATS={dialogue:3.35,splash:3.9,nameCross:6.5,nameDrop:7.55,nameExit:10.9};
export const FLOOR={top:190,bottom:239};
export const ARENAS=[
  {trigger:335,left:180,right:600,count:3,label:'CONTABILIDAD'},
  {trigger:995,left:840,right:1260,count:4,label:'RECURSOS INHUMANOS'},
  {trigger:1655,left:1500,right:1920,count:5,label:'ARCHIVO CONFIDENCIAL'},
  {trigger:2175,left:2020,right:2440,count:1,label:'ACCESO A LA EXPOSICIÓN',boss:true}
];
export const EXHIBITION_ARENAS=[
  {trigger:335,left:180,right:600,count:4,label:'GALERÍA DE MUESTRAS'},
  {trigger:995,left:840,right:1260,count:5,label:'CELOSÍAS CERÁMICAS'},
  {trigger:1655,left:1500,right:1920,count:5,label:'LA NUEVA COLECCIÓN'},
  {trigger:2175,left:2020,right:2440,count:1,label:'JASMÍN Y MARÍA',boss:true}
];
export const FUSION_INTRO=24.5;
export const FUSION_BEATS={drink:2.2,fusion:4.2,form:9.1,nameCross:7.1,nameDrop:9.1,nameExit:13.3};
export const BOFE_BEATS={arrive:14.3,dialogue:15.7,splash:16.3,nameCross:18.8,nameDrop:19.8,nameExit:23.7};
export const BOFE_COOLDOWN=22;
export const BOFE_SUMMON={duration:1.4,impact:.48,damage:80,bossDamage:45};
export const LEVELS=[{id:'office',name:'DEPARTAMENTO',arenas:ARENAS},{id:'exhibition',name:'EXPOSICIÓN WOW',arenas:EXHIBITION_ARENAS},{id:'laboratory',name:'LABORATORIO',arenas:LABORATORY_ARENAS},{id:'sewers',name:'ALCANTARILLAS',arenas:SEWER_ARENAS},{id:'factory',name:'FÁBRICA',arenas:FACTORY_ARENAS},{id:'rooftop',name:'AZOTEA',arenas:ROOFTOP_ARENAS}];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const towards=(a,b,amount)=>a<b?Math.min(b,a+amount):Math.max(b,a-amount);


export class Game {
 constructor(random=Math.random){this.random=random;this.reset();this.mode='attract';}
 get arenas(){return LEVELS[this.level].arenas;}
 get introDuration(){return this.level===0?OFFICE_BOSS_INTRO:this.level===2&&this.enemies.some(e=>e.transforming)?BEAR_INTRO:this.level===1?FUSION_INTRO:BOSS_INTRO;}
 nextLevel(){
  if(this.mode!=='won'||this.level>=LEVELS.length-1)return false;
  const campaign={score:this.score,kills:this.kills,time:this.time,bofeUnlocked:this.bofeUnlocked};
  this.reset(0,this.level+1);Object.assign(this,campaign);this.checkpointTotals={...campaign};return true;
 }
 retryStage(){
  const boss=this.enemies.find(e=>e.boss);
  const retryBoss=this.mode==='lost'&&this.arenas[this.stage].boss&&!!boss&&boss.state!=='waiting';
  const seenFusion=this.laboratoryFusionSeen||!!boss?.bear;
  const totals={...this.checkpointTotals,time:this.time},bofeUnlocked=this.bofeUnlocked;
  this.reset(this.stage,this.level);Object.assign(this,totals,{bofeUnlocked});this.checkpointTotals={...totals};
  if(retryBoss){
   // A death retries the encounter at full health, after its already-seen introduction.
   this.laboratoryFusionSeen=seenFusion;
   this.player.x=this.arenas[this.stage].trigger;this.camera=this.arenas[this.stage].left-30;
   this.spawnStage();
   const finish=['finishOfficeCinematic','finishExhibitionEncounter','finishLaboratoryCinematic','finishSewerCinematic','finishFactoryCinematic','finishRooftopCinematic'][this.level];
   this[finish]();
  }
 }
 finishExhibitionEncounter(){
  const boss=this.enemies.find(e=>e.boss&&e.fusion);
  if(this.level!==1||this.mode!=='playing'||this.phase!=='intro'||!boss)return false;
  // The approved film already contains the drink, fusion and both name reveals.
  // Resume the fight directly; never replay their legacy intro timers/sounds.
  this.introTimer=0;this.phase='fight';this.bofeUnlocked=true;
  Object.assign(boss,{state:'chase',timer:0,cd:1.1,moving:false,saying:'',sayingT:0});
  Object.assign(this.player,{moving:false,action:null});
  this.banner=null;
  return true;
 }
 finishOfficeCinematic(){
  this.introTimer=0;this.phase='fight';this.banner=null;this.emit('alarm');
 }
 finishLaboratoryCinematic(){
  const boss=this.enemies.find(e=>e.boss&&e.elisa);
  if(this.level!==2||this.mode!=='playing'||this.phase!=='intro'||!boss)return false;
  const fused=!!boss.transforming;
  if(fused)Object.assign(boss,{transforming:false,bear:true,hp:480,maxHp:480,attackIndex:0,walk:0});
  Object.assign(boss,{state:'chase',timer:0,cd:1.1,moving:false,saying:'',sayingT:0});
  Object.assign(this.player,{moving:false,action:null});
  this.introTimer=0;this.phase='fight';this.projectiles=[];this.effects=[];
  this.banner=null;
  return true;
 }
 finishSewerCinematic(){
  const boss=this.enemies.find(e=>e.mayrena);
  if(this.level!==3||this.mode!=='playing'||this.phase!=='intro'||!boss)return false;
  Object.assign(boss,{state:'chase',timer:0,cd:1.2,moving:false,saying:'',sayingT:0});
  this.introTimer=0;this.phase='fight';this.banner=null;this.projectiles=[];this.effects=[];
  Object.assign(this.player,{moving:false,action:null});return true;
 }
 finishFactoryCinematic(){
  const boss=this.enemies.find(e=>e.rost);
  if(this.level!==4||this.mode!=='playing'||this.phase!=='intro'||!boss)return false;
  Object.assign(boss,{state:'chase',timer:0,cd:1.2,moving:false,saying:'',sayingT:0});
  this.factoryFire=true;this.introTimer=0;this.phase='fight';this.banner=null;this.projectiles=[];this.effects=[];
  Object.assign(this.player,{moving:false,action:null});return true;
 }
 finishRooftopCinematic(){
  const boss=this.enemies.find(e=>e.menina);
  if(this.level!==5||this.mode!=='playing'||this.phase!=='intro'||!boss)return false;
  Object.assign(boss,{state:'chase',timer:0,cd:1.3,moving:false,saying:'',sayingT:0});
  this.rooftopWreck=true;this.introTimer=0;this.phase='fight';this.banner=null;this.projectiles=[];this.effects=[];
  Object.assign(this.player,{moving:false,action:null});return true;
 }
 reset(checkpoint=0,level=this.level??0){
  this.level=level;this.laboratoryFusionSeen=false;const ARENAS=this.arenas;this.pendingStory=null;this.coreSabotaged=false;this.factoryFire=false;this.factoryRunning=true;this.rooftopWreck=false;
  this.bofeUnlocked=false;this.bofeCooldown=0;this.bofeSummon=null;
  this.checkpointTotals={score:0,kills:0,time:0};
  this.mode='playing';this.phase='travel';this.stage=checkpoint;this.time=0;this.score=0;this.kills=0;this.combo=0;this.comboT=0;this.camera=checkpoint?ARENAS[checkpoint].left-180:0;this.enemies=[];this.projectiles=[];this.pickups=[];this.effects=[];this.events=[];this.uid=0;this.shake=0;this.banner=null;
  this.nextEnemyAttack=0;this.clearTimer=0;this.deathTimer=0;this.result=null;this.player={x:checkpoint?ARENAS[checkpoint].trigger-75:120,y:221,hp:120,maxHp:120,facing:1,moving:false,walk:0,action:null,attackCD:0,invuln:0,hurt:0,dodge:0,dodgeCD:0,dodgeDir:1,ammo:checkpoint?60:30,weapon:checkpoint?'smg':'pistol',specialCD:0,special:0,specialPulse:0,chain:0,chainT:0};
  this.prepareBoss();
  if(level===1){this.player.weapon='smg';this.player.ammo=90;this.banner=null;}
  if(level===5){this.bofeUnlocked=true;this.player.weapon='smg';this.player.ammo=180;this.banner=null;}
  if(level===4){this.bofeUnlocked=true;this.player.weapon='smg';this.player.ammo=150;this.banner=null;}
  if(level===3){this.bofeUnlocked=true;this.player.weapon='smg';this.player.ammo=120;this.banner=null;}
  if(level===2){this.bofeUnlocked=true;this.player.weapon='smg';this.player.ammo=120;this.banner=null;}
 }
 emit(type,data={}){this.events.push({type,...data});}
 message(text,sub='',ttl=2.5){this.banner={text,sub,ttl};this.emit('message',{text});}
 makeEnemy(type,x,y,boss=false){const hp=boss?330:[52,36,42,32][type];return{id:++this.uid,type,boss,x,y,hp,maxHp:hp,facing:-1,walk:0,moving:false,stun:0,flash:0,dead:0,cd:.8,state:'chase',timer:0,attackIndex:0,move:'',saying:'',sayingT:0,dir:-1};}
 prepareBoss(){if(this.stage===3&&!this.enemies.some(e=>e.boss)){const a=this.arenas[3],e=this.makeEnemy(4,a.right-75,221,true);e.state='waiting';if(this.level===1)Object.assign(e,{fusion:true,hp:440,maxHp:440});if(this.level===2)Object.assign(e,{elisa:true,bear:false,hp:240,maxHp:240});if(this.level===3)Object.assign(e,{mayrena:true,hp:520,maxHp:520});if(this.level===4)Object.assign(e,{rost:true,hp:600,maxHp:600});if(this.level===5)Object.assign(e,{menina:true,hp:840,maxHp:840,x:a.right-88});this.enemies.push(e);}}
 spawnStage(){
  clearCombatInput(this.player);
  const ARENAS=this.arenas;
  this.checkpointTotals={score:this.score,kills:this.kills,time:this.time};
  const a=ARENAS[this.stage];this.phase=a.boss?'intro':'fight';this.introTimer=a.boss?this.introDuration:0;this.cameraGoal=a.left-30;
  this.banner=null;
  if(a.boss){
   this.prepareBoss();const e=this.enemies.find(e=>e.boss);Object.assign(e,{state:'chase',flash:0,stun:0,moving:false,cd:.8});
   Object.assign(this.player,{moving:false,action:null,invuln:0,hurt:0,dodge:0,special:0});this.projectiles=[];this.effects=[];this.shake=0;
  }else for(let i=0;i<a.count;i++){
   const side=i%2?-1:1,type=(i+this.stage)%4;
   const x=side>0?Math.max(a.right+64,this.camera+544)+i*16:Math.min(a.left-64,this.camera-64)-i*16;
   const e=this.makeEnemy(type,x,(this.level===2?203:200)+(i*13+this.stage*7)%(this.level===2?33:36));
   if(this.level===3)sewerEnemy(e,this.stage,i);
   if(this.level===4)factoryEnemy(e,this.stage,i);
   if(this.level===5)rooftopEnemy(e,this.stage,i);
   Object.assign(e,{state:'enter',entryTargetX:side>0?a.right-52-Math.floor(i/2)*23:a.left+52+Math.floor(i/2)*23,entryDelay:i*.14,cd:.8+i*.45});this.enemies.push(e);
  }
  this.emit('alarm');
 }

 startAttack(kind){
  const p=this.player;if(!['punch','kick','knife','shoot'].includes(kind)||p.attackCD>0||p.action||p.dodge>0||p.hurt>0||p.special>0)return false;
  if(kind==='shoot'){
   if(p.ammo<=0){p.attackCD=.25;this.emit('empty');return false;}
   p.ammo--;const duration=p.weapon==='smg'?.14:.28;p.attackCD=duration;
   p.action={kind:'shoot',left:duration,total:duration,impact:p.weapon==='smg'?.025:.045,hits:new Set(),dir:p.facing,fired:false};return true;
  }
  if(kind==='punch'){p.chain=p.chainT>0?(p.chain+1)%3:0;p.chainT=1.05;if(p.chain===2)kind='kick';}
  const def=melee[kind];
  const target=this.enemies.filter(e=>e.hp>0&&e.state!=='waiting'&&Math.abs(e.y-p.y)<def.depth&&Math.abs(e.x-p.x)<def.reach+(e.menina?36:8)).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
  if(!p.intentX&&target)p.facing=Math.sign(target.x-p.x)||p.facing;
  const counter=(p.counter??0)>0;p.counter=0;
  p.action={kind,left:def.duration,total:def.duration,impact:def.impact,hits:new Set(),dir:p.facing,counter};p.attackCD=def.cd;
  this.emit(kind==='knife'?'slash':'swing');return true;
 }
 special(){const p=this.player;if(p.specialCD>0||p.dodge>0||p.hurt>0)return false;p.specialCD=10;p.special=1.05;p.specialPulse=0;p.action=null;p.invuln=1.1;this.shake=4;this.banner=null;this.emit('special');return true;}
 summonBofe(){
  if(!this.bofeUnlocked||this.bofeCooldown>0||this.bofeSummon||this.mode!=='playing'||this.phase!=='fight'||this.player.hp<=0)return false;
  this.bofeCooldown=BOFE_COOLDOWN;
  this.bofeSummon={elapsed:0,hit:false,x:clamp(this.player.x+this.player.facing*35,this.camera+38,this.camera+442),y:this.player.y,face:this.player.facing};
  this.player.invuln=Math.max(this.player.invuln,BOFE_SUMMON.duration);this.emit('bofeSummon');return true;
 }
 updateBofe(dt){
  this.bofeCooldown=Math.max(0,this.bofeCooldown-dt);
  const a=this.bofeSummon;if(!a)return;a.elapsed+=dt;
  if(!a.hit&&a.elapsed>=BOFE_SUMMON.impact){
   a.hit=true;for(const e of this.enemies)if(e.hp>0&&e.state!=='waiting')this.hurtEnemy(e,e.boss?BOFE_SUMMON.bossDamage:BOFE_SUMMON.damage,Math.sign(e.x-a.x)||a.face);
   this.projectiles=this.projectiles.filter(p=>p.owner==='player');this.shake=6;this.emit('bofeImpact');
  }
  if(a.elapsed>=BOFE_SUMMON.duration)this.bofeSummon=null;
 }
 hurtEnemy(e,damage,dir=1,impact={}){
  const ARENAS=this.arenas;
  if(e.hp<=0||e.state==='waiting')return;if(e.menina&&e.state==='recover')damage=Math.round(damage*1.35);e.hp=Math.max(0,e.hp-damage);e.flash=.12;e.stun=e.boss?.10:(impact.stun??.27);if(impact.melee&&!e.boss&&e.state!=='enter'){e.state='recover';e.timer=.22;e.cd=Math.max(e.cd,.45);}e.x=e.state==='enter'?e.x+dir*6:clamp(e.x+dir*(e.boss?2:(impact.push??6)),ARENAS[this.stage].left+8,ARENAS[this.stage].right-8);this.score+=damage*5;this.combo++;this.comboT=1.6;this.shake=Math.max(this.shake,impact.finisher?3.2:1.3);
  if(e.hp===0&&e.elisa&&!e.bear){summonMartin(this,e);return;}
  this.effects.push({kind:'hit',x:e.x,y:e.y-39*ACTOR_SCALE,ttl:.22,total:.22});this.emit(impact.finisher?'finisher':impact.counter?'counter':'hit');
  if(e.hp===0){e.dead=1.1;e.state='dead';this.score+=e.boss?2500:250;this.kills++;this.emit(e.boss?'bossDown':'down');}
 }
 hurtPlayer(damage,dir){const p=this.player;if(p.hp<=0)return false;
  if(p.dodge>0&&p.dodgeAge<=COMBAT.perfectWindow&&!p.perfectDodge){p.perfectDodge=true;p.counter=COMBAT.counterWindow;this.effects.push({kind:'text',text:'ESQUIVA PERFECTA',x:p.x,y:p.y-102,ttl:.65,total:.65});this.emit('perfectDodge');}
  if(p.invuln>0)return false;p.hp=Math.max(0,p.hp-damage);p.invuln=1.1;p.hurt=.14;p.action=null;p.x=clamp(p.x+dir*9,this.camera+12,this.camera+465);this.combo=0;this.shake=4;this.emit('hurt');if(p.hp<=0){this.phase='playerdown';this.deathTimer=1.15;p.dodge=0;p.special=0;}return true;}
 drop(kind,x,y){this.pickups.push({id:++this.uid,kind,x,y});}
 pickup(){const p=this.player;

  const near=this.pickups.filter(a=>Math.abs(a.x-p.x)<28&&Math.abs(a.y-p.y)<18);if(!near.length)return;for(const a of near){if(a.kind==='coffee'&&p.hp>=p.maxHp)continue;if(a.kind==='coffee'){p.hp=Math.min(p.maxHp,p.hp+38);this.message('+ VIDA','',1.8);}else if(a.kind==='smg'){p.weapon='smg';p.ammo+=75;this.message('METRALLETA','',2);}else{p.ammo+=45;this.message('+ MUNICIÓN','',1.7);}this.pickups.splice(this.pickups.indexOf(a),1);this.emit('pickup');}}
 update(dt,input={}){
  const ARENAS=this.arenas;
  if(this.mode!=='playing')return;dt=Math.min(dt,.05);this.time+=dt;const p=this.player;
  if(this.phase==='playerdown'||this.phase==='bossdown'){this.updateBofe(dt);this.deathTimer-=dt;this.shake=Math.max(0,this.shake-dt*13);for(const e of this.enemies)if(e.hp<=0)e.dead=Math.max(.1,e.dead-dt);for(const f of this.effects)f.ttl-=dt;this.effects=this.effects.filter(f=>f.ttl>0);if(this.deathTimer<=0){if(this.phase==='bossdown')this.clearStage();else{this.mode='lost';this.emit('lost');}}return;}
  if(this.phase==='intro'){
   // The sewer encounter is entirely illustrated; only its completion unlocks combat.
   if(this.level>=3){this.introTimer=Math.max(this.introDuration-.6,this.introTimer-dt);p.moving=false;p.action=null;this.camera=towards(this.camera,ARENAS[this.stage].left-30,dt*150);return;}
   this.shake=Math.max(0,this.shake-dt*13);const before=this.introDuration-this.introTimer;this.introTimer-=dt;const elapsed=this.introDuration-this.introTimer;
   const transforming=this.level===2&&this.enemies.some(e=>e.transforming);
   const singleBeats=this.level===0?OFFICE_BOSS_BEATS:BOSS_BEATS;
   const beats=transforming?[[BEAR_BEATS.summon,'fusion'],[BEAR_BEATS.nameCross,'nameCross'],[BEAR_BEATS.nameDrop,'nameDrop']]:this.level===1?[...Object.entries(FUSION_BEATS).filter(([event])=>['drink','fusion','nameCross','nameDrop'].includes(event)).map(([event,at])=>[at,event]),[BOFE_BEATS.nameCross,'bofeNameCross'],[BOFE_BEATS.nameDrop,'bofeJoin']]:[[singleBeats.nameCross,'nameCross'],[singleBeats.nameDrop,'nameDrop']];
   for(const [at,event]of beats)if(before<at&&elapsed>=at){this.emit(event);if(event==='nameDrop')this.shake=4;}
   if(this.level===1&&elapsed>=BOFE_BEATS.nameDrop)this.bofeUnlocked=true;
   p.moving=false;p.action=null;this.camera=towards(this.camera,ARENAS[this.stage].left-30,dt*150);
   if(this.introTimer<=0){
    if(transforming){const boss=this.enemies.find(e=>e.elisa);Object.assign(boss,{transforming:false,bear:true,hp:480,maxHp:480,state:'chase',cd:1.1,attackIndex:0,walk:0});}
    this.phase='fight';this.banner=null;this.emit('alarm');}return;
  }
  for(const k of ['attackCD','invuln','hurt','dodge','dodgeCD','specialCD','chainT','counter'])p[k]=Math.max(0,(p[k]??0)-dt);
  this.shake=Math.max(0,this.shake-dt*13);this.comboT=Math.max(0,this.comboT-dt);if(!this.comboT)this.combo=0;if(this.banner)this.banner.ttl-=dt;
  if(input.summon)this.summonBofe();this.updateBofe(dt);
  if(input.special)this.special();
  if(p.special>0){p.special=Math.max(0,p.special-dt);p.specialPulse-=dt;if(p.specialPulse<=0){p.specialPulse=.3;for(const e of this.enemies)if(e.hp>0&&Math.abs(e.x-p.x)<90&&Math.abs(e.y-p.y)<38)this.hurtEnemy(e,e.boss?19:22,Math.sign(e.x-p.x)||1);}}
  const attack=combatInput(p,input,dt);if(p.dodge>0)p.dodgeAge=(p.dodgeAge??0)+dt;
  const oldX=p.x,oldY=p.y;
  let mx=(input.right?1:0)-(input.left?1:0),my=(input.down?1:0)-(input.up?1:0);p.moving=!!(mx||my);
  if(p.dodgeBuffer>0&&p.dodgeCD<=0&&p.hurt<=.09&&p.special<=0){p.dodgeBuffer=0;p.dodge=COMBAT.dodgeDuration;p.dodgeAge=0;p.perfectDodge=false;p.dodgeCD=COMBAT.dodgeCooldown;p.invuln=Math.max(p.invuln,COMBAT.dodgeDuration+.02);p.dodgeDir=mx||p.facing;const length=Math.hypot(mx,my)||1;p.dodgeX=(mx||(!my?p.facing:0))/length;p.dodgeY=my/length;p.hurt=0;p.action=null;p.attackCD=0;this.emit('dodge');}
  if(p.dodge>0){p.x+=(p.dodgeX??p.dodgeDir)*255*dt;p.y+=(p.dodgeY??0)*115*dt;}
  else if(p.hurt<=0){if(mx)p.facing=mx;const slow=p.special>0?.80:p.action?(p.action.kind==='shoot'?.92:.80):1;const n=mx&&my?.7071:1;p.x+=mx*(this.phase==='travel'?COMBAT.travel:COMBAT.walk)*dt*n*slow;p.y+=my*COMBAT.depth*dt*n*slow;}
  p.y=clamp(p.y,this.level===2?203:FLOOR.top,FLOOR.bottom);
  if(this.phase==='fight'||this.phase==='clearing'){const a=ARENAS[this.stage];p.x=clamp(p.x,a.left+12,a.right-12);}else p.x=clamp(p.x,this.camera+12,WORLD-45);
  const distance=Math.hypot(p.x-oldX,(p.y-oldY)*1.6);p.moving=distance>.001&&p.dodge<=0&&p.hurt<=0&&p.special<=0;if(p.moving)p.walk+=distance/(56*ACTOR_SCALE)*8;
  if(attack&&this.startAttack(attack)){p.queuedAttack=null;p.attackBuffer=0;}this.pickup();
  if(p.action){
   const ac=p.action;ac.left-=dt;const def=melee[ac.kind],elapsed=ac.total-ac.left;
   if(ac.kind==='shoot'&&!ac.fired&&elapsed>=ac.impact){ac.fired=true;this.projectiles.push({id:++this.uid,x:p.x+ac.dir*23,y:p.y,dir:ac.dir,speed:500,ttl:1.3,owner:'player',damage:p.weapon==='smg'?9:15});this.emit('shoot');}
   if(def&&elapsed>=def.impact&&elapsed<=def.impact+def.active){
    for(const e of this.enemies){const dx=(e.x-p.x)*ac.dir;
     if(e.hp>0&&e.state!=='waiting'&&!ac.hits.has(e.id)&&dx>-8&&dx<def.reach+(e.menina?36:0)&&Math.abs(e.y-p.y)<def.depth){
      ac.hits.add(e.id);this.hurtEnemy(e,Math.round(def.damage*(ac.counter?1.5:1)),ac.dir,{melee:true,push:def.push,stun:def.stun,finisher:ac.kind==='kick',counter:ac.counter});
      if(ac.kind==='kick'||ac.counter)this.effects.push({kind:'text',text:ac.counter?'CONTRAATAQUE':'REMATE',x:e.x,y:e.y-100,ttl:.55,total:.55});
     }
    }
   }
   if(ac.left<=0)p.action=null;
  }
  // A hit can interrupt this update with the second boss introduction.
  if(this.phase==='intro')return;
  for(const e of this.enemies){e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);e.cd=Math.max(0,e.cd-dt);e.sayingT=Math.max(0,e.sayingT-dt);if(e.hp<=0){e.dead=Math.max(0,e.dead-dt);continue;}e.facing=p.x>=e.x?1:-1;e.moving=false;if(e.boss){this.updateBoss(e,dt);continue;}if(e.sewer){updateSewerEnemy(this,e,dt);continue;}if(e.soldier){updateSoldier(this,e,dt);continue;}if(e.stun>0)continue;
   if(e.state==='enter'){
    if(e.entryDelay>0){e.entryDelay-=dt;continue;}
    const ex=e.x;e.x=towards(e.x,e.entryTargetX,[76,86,80,92][e.type]*dt);e.facing=Math.sign(e.entryTargetX-ex)||e.facing;e.moving=e.x!==ex;e.walk+=Math.abs(e.x-ex)/([72,72,70,71][e.type]*ACTOR_SCALE)*8;
    if(e.x===e.entryTargetX){e.state='chase';e.cd=.5;}continue;
   }
   if(e.state==='windup'){e.timer-=dt;if(e.timer<=0){if((p.x-e.x)*e.dir>-8&&(p.x-e.x)*e.dir<46&&Math.abs((e.targetY??e.y)-p.y)<15)this.hurtPlayer(e.type===0?12:9,Math.sign(p.x-e.x)||1);e.state='strike';e.timer=.16;e.cd=.75+this.random()*.4;this.emit('enemySwing');}continue;}
   if(e.state==='strike'){e.timer-=dt;if(e.timer<=0){e.state='recover';e.timer=.26;}continue;}
   if(e.state==='recover'){e.timer-=dt;if(e.timer<=0)e.state='chase';continue;}
   const ex=e.x,ey=e.y,dx=p.x-e.x,dy=p.y-e.y;const speed=[45,68,54,77][e.type];if(Math.abs(dx)>29){e.x+=Math.sign(dx)*speed*dt;e.moving=true;}if(Math.abs(dy)>5){e.y+=Math.sign(dy)*31*dt;e.moving=true;}if(e.moving)e.walk+=Math.hypot(e.x-ex,(e.y-ey)*1.6)/([72,72,70,71][e.type]*ACTOR_SCALE)*8;
   if(Math.abs(dx)<35&&Math.abs(dy)<13&&e.cd<=0&&canEnemyAttack(this,e)){e.state='windup';e.timer=e.type===0?.60:.46;e.dir=Math.sign(dx)||-1;e.targetY=p.y;}
  }
  for(let i=0;i<this.enemies.length;i++)for(let j=i+1;j<this.enemies.length;j++){const a=this.enemies[i],b=this.enemies[j];if(a.hp<=0||b.hp<=0||a.state==='waiting'||b.state==='waiting')continue;if(Math.abs(a.x-b.x)<15&&Math.abs(a.y-b.y)<10){const sign=a.x>=b.x?1:-1;a.x+=sign*13*dt;b.x-=sign*13*dt;}}
  for(const b of this.projectiles){const prev=b.x;b.x+=b.dir*b.speed*dt;b.ttl-=dt;if(b.owner==='player'){const targets=this.enemies.filter(e=>e.hp>0&&e.state!=='waiting'&&Math.abs(e.y-b.y)<15&&e.x>=Math.min(prev,b.x)-(e.menina?36:9)&&e.x<=Math.max(prev,b.x)+(e.menina?36:9)).sort((a,c)=>Math.abs(a.x-prev)-Math.abs(c.x-prev));if(targets.length){this.hurtEnemy(targets[0],b.damage,b.dir,{push:2,stun:.07});b.ttl=0;}}else if(p.x>=Math.min(prev,b.x)-13&&p.x<=Math.max(prev,b.x)+13&&Math.abs(p.y-b.y)<12){this.hurtPlayer(b.damage,b.dir);b.ttl=0;}}
  this.projectiles=this.projectiles.filter(b=>b.ttl>0);
  for(const fx of this.effects)fx.ttl-=dt;this.effects=this.effects.filter(fx=>fx.ttl>0);
  if(this.phase==='intro'||this.mode!=='playing')return;
  if(this.level===2&&this.phase==='escape'&&p.x>=2465){this.finishLevel();return;}
  if(this.phase==='travel'&&this.stage<ARENAS.length&&p.x>=ARENAS[this.stage].trigger)this.spawnStage();
  if(this.phase==='fight'&&this.enemies.length&&this.enemies.every(e=>e.hp<=0)){if(ARENAS[this.stage].boss){this.phase='bossdown';this.deathTimer=1.2;p.action=null;}else{this.phase='clearing';this.clearTimer=.65;}}
  if(this.phase==='clearing'){this.clearTimer-=dt;if(this.clearTimer<=0)this.clearStage();}
  const target=this.phase==='fight'||this.phase==='clearing'?ARENAS[this.stage].left-30:Math.min(ARENAS[this.stage].left-30,clamp(p.x-175,this.camera,WORLD-480));this.camera=towards(this.camera,clamp(target,0,WORLD-480),dt*200);
 }
 updateBoss(e,dt){
  if(e.menina){updateMenina(this,e,dt);return;}
  if(e.rost){updateRost(this,e,dt);return;}
  if(e.mayrena){updateMayrena(this,e,dt);return;}
  if(e.elisa){updateLaboratoryBoss(this,e,dt);return;}
  if(e.fusion){this.updateFusion(e,dt);return;}
  const p=this.player;const a=this.arenas[this.stage];if(e.state==='waiting')return;if(e.stun>0&&e.state==='chase')return;
  if(e.state==='windup'){
   e.timer-=dt;if(e.timer<=0){if(e.move==='charge'){e.state='charge';e.timer=.82;e.dir=Math.sign(p.x-e.x)||-1;}else if(e.move==='papers'){for(let i=-1;i<=1;i++)this.projectiles.push({id:++this.uid,x:e.x+e.facing*18,y:clamp(p.y+i*17,FLOOR.top,FLOOR.bottom),dir:e.facing,speed:160,ttl:3,owner:'boss',damage:12});e.state='throw';e.timer=.22;this.emit('papers');}else{if(Math.abs(p.x-e.x)<53&&Math.abs(p.y-e.y)<20)this.hurtPlayer(20,e.facing);e.state='slap';e.timer=.22;this.emit('slap');}}return;
  }
  if(e.state==='charge'){e.walk+=230*dt/100*8;e.moving=true;e.x+=e.dir*230*dt;e.facing=e.dir;e.timer-=dt;if(Math.abs(p.x-e.x)<26&&Math.abs(p.y-e.y)<15)this.hurtPlayer(18,e.dir);if(e.timer<=0||e.x<a.left+20||e.x>a.right-20){e.x=clamp(e.x,a.left+20,a.right-20);e.state='recover';e.timer=1.65;e.saying='¡NO VAS A SALIR CON ESA COPIA!';e.sayingT=1.65;this.shake=4;this.emit('slip');}return;}
  if(e.state==='slap'||e.state==='throw'){e.timer-=dt;if(e.timer<=0){e.state='recover';e.timer=1.1;}return;}
  if(e.state==='recover'){e.timer-=dt;if(e.timer<=0){e.state='chase';e.cd=.6;}return;}
  const ex=e.x,ey=e.y,dx=p.x-e.x,dy=p.y-e.y;if(Math.abs(dx)>39){e.x+=Math.sign(dx)*48*dt;e.moving=true;}if(Math.abs(dy)>6){e.y+=Math.sign(dy)*27*dt;e.moving=true;}if(e.moving)e.walk+=Math.hypot(e.x-ex,(e.y-ey)*1.6)/78*8;
  if(e.cd<=0){const move=e.attackIndex++%3;e.move=['charge','slap','papers'][move];e.state='windup';e.timer=[1.05,.8,1][move];e.dir=e.facing;e.saying=['¡DAME EL PENDRIVE!','¡ESOS ARCHIVOS SE QUEDAN AQUÍ!','¡ESTA ES LA CARPETA BUENA!'][move];e.sayingT=e.timer;this.emit('bossTell');}
 }
 updateFusion(e,dt){
  if(e.state==='waiting')return;
  const p=this.player,a=this.arenas[this.stage];
  if(e.state==='windup'){
   e.timer-=dt;
   if(e.timer<=0){
    e.state='boxing';e.timer=e.move==='rush'?.56:.32;e.hit=false;
    // The whole attack commits to the telegraphed lane and direction.
    this.emit(e.move==='tiles'?'papers':'slap');
    if(e.move==='tiles')for(const dir of [-1,1])for(const y of [e.targetY-16,e.targetY,e.targetY+16])this.projectiles.push({id:++this.uid,x:e.x,y:clamp(y,FLOOR.top,FLOOR.bottom),dir,speed:185,ttl:2.8,owner:'boss',damage:13,ceramic:true});
   }return;
  }
  if(e.state==='boxing'){
   e.timer-=dt;
   if(e.move==='rush'&&e.timer>.22){const old=e.x;e.x=clamp(e.x+e.dir*260*dt,a.left+24,a.right-24);e.walk+=Math.abs(e.x-old)/26*4;e.y=towards(e.y,e.targetY,dt*90);}
   if(e.move!=='tiles'&&(e.move!=='rush'||e.timer<=.22)&&!e.hit&&(p.x-e.x)*e.dir>-8&&(p.x-e.x)*e.dir<(e.move==='uppercut'?63:47)&&Math.abs(p.y-e.y)<15){e.hit=this.hurtPlayer(e.move==='uppercut'?25:18,e.dir);}
   if(e.timer<=0){e.state='recover';e.timer=e.hp<e.maxHp*.5?.9:1.25;e.saying=e.move==='rush'?'¡QUE PIERDO EL VUELO!':e.move==='uppercut'?'¡HOY TOCABA DESCANSAR!':'¡NO TE LLEVAS LOS ARCHIVOS!';e.sayingT=e.timer;}
   return;
  }
  if(e.state==='recover'){e.timer-=dt;if(e.timer<=0){e.state='chase';e.cd=.65;}return;}
  // A short planted boxing shuffle: advance, gather the trailing foot, guard.
  if(e.state==='shuffle'){
   e.timer-=dt;const old=e.x;e.x=towards(e.x,e.stepTarget,dt*78);e.y=towards(e.y,e.stepY,dt*35);e.walk+=Math.abs(e.x-old)/26*4;e.moving=true;
   if(e.timer<=0){e.state='chase';e.moving=false;}return;
  }
  if(e.stun>0)return;
  if(e.cd<=0){
   e.move=['rush','uppercut','tiles'][e.attackIndex++%3];e.dir=Math.sign(p.x-e.x)||-1;e.facing=e.dir;e.targetY=p.y;
   e.state='windup';e.timer=e.move==='uppercut'?.8:1.05;e.saying=e.move==='rush'?'¡ESTO CUENTA COMO CARDIO!':e.move==='uppercut'?'¡TE DEJO COMO UNA PEGATINA!':'¡LOS ARCHIVOS, MARTA!';e.sayingT=e.timer;this.emit('bossTell');return;
  }
  if(Math.abs(p.x-e.x)>48||Math.abs(p.y-e.y)>10){e.state='shuffle';e.timer=.36;e.stepTarget=clamp(e.x+(Math.sign(p.x-e.x)||-1)*26,a.left+24,a.right-24);e.stepY=p.y;e.facing=Math.sign(p.x-e.x)||-1;e.walk=0;}
 }
 clearStage(){
  const ARENAS=this.arenas;
  const a=ARENAS[this.stage];if(a.boss){this.finishLevel();return;}
  const old=this.stage;this.phase='travel';this.stage++;this.enemies=[];this.prepareBoss();this.projectiles=this.projectiles.filter(p=>p.owner==='player');this.drop('coffee',a.right-45,204);this.drop(old===0?'smg':'ammo',a.right-83,218);this.score+=500;this.message('CONTINÚA →','',3);this.emit('clear');
 }
 finishLevel(){this.mode='won';const healthBonus=Math.round(this.player.hp)*20;this.score+=healthBonus;this.result={score:this.score,kills:this.kills,time:this.time,healthBonus};this.banner=null;this.emit('won');}
 snapshot(){return{mode:this.mode,phase:this.phase,level:this.level,chapter:LEVELS[this.level].id,stage:this.stage,player:{...this.player,action:this.player.action?{kind:this.player.action.kind}:null},bofe:{unlocked:this.bofeUnlocked,cooldown:this.bofeCooldown,active:!!this.bofeSummon},factory:{fire:this.factoryFire,running:this.factoryRunning},rooftop:{wreck:this.rooftopWreck},camera:this.camera,enemies:this.enemies.filter(e=>e.hp>0).length,score:this.score,kills:this.kills,time:this.time};}
}
