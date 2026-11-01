import {waitingCast} from './encounter-waiting.js?v=59';
import {loadRooftopAssets,rooftopBack,rooftopForeground,rooftopPose,rooftopWarning} from './rooftop.js?v=52';
import {loadFactoryAssets,loadCombatAssets,factoryBack,factoryForeground,combatPose,factoryWarning} from './factory.js?v=quiet-ui-1';
import {loadSewerAssets,sewerBack,sewerForeground,sewerPose,sewerWarning} from './sewers.js?v=52';
import {ACTOR_SCALE} from './scene-scale.js?v=52';
import {ARENAS,OFFICE_BOSS_BEATS,BOFE_BEATS,BOFE_COOLDOWN,BOFE_SUMMON,clamp} from './core.js?v=52';
import {foregroundLayout,stormFlash} from './scene-animation.js?v=52';
import {heroAnimation,enemyAnimation,officeBossIntroPose} from './animation-v6.js?v=52';
import {characterData} from './character-data-v6.js?v=52';
import {pickupFrames} from './props-data-v6.js?v=52';
import {pixelText,pixelTextWidth,wrapPixelText} from './pixel-font.js?v=52';
import {exhibitionCharacters} from './exhibition-data.js?v=52';
import {drawFusion} from './exhibition.js?v=52';
import {castCharacters} from './cast-data.js?v=60';
import {loadSplashAssets,drawBossSplash} from './boss-splashes.js?v=quiet-ui-1';
import {laboratoryCharacters} from './laboratory-data.js?v=52';
import {laboratoryTransformation} from './laboratory-cinematic.js?v=52';
import {loadLaboratoryAssets,laboratoryBack,laboratoryForeground,laboratoryAnimation,laboratoryWarning} from './laboratory.js?v=52';

const files={office:'office-night-v1/office.png',outside:'office-night-v1/outdoors.png',foreground:'scene-v10/foreground.png',splash:'scene-v2/storm-splash.png',logo:'title-v3/logo.png',pickups:'props-v6/pickups.png',exhibition:'exhibition-v1/showroom.png'};
export async function loadVisualAssets(loadImage,createCanvas){
 loadImage??=async url=>{const i=new Image();i.src=url;try{await i.decode();}catch(e){throw new Error(`No se puede decodificar ${url}: ${e.message}`);}return i;};
 const assets={};
 for(const [name,file]of Object.entries(files))assets[name]=await loadImage(`assets/${file}`);
 for(const [name,data]of Object.entries(characterData))assets[name]={...data,img:await loadImage(`assets/character-atlases-v6/${name}.png`)};
 for(const [name,data]of Object.entries(exhibitionCharacters))assets[name]={...data,img:await loadImage(`assets/exhibition-v2/${name}.png`)};
 for(const [name,data]of Object.entries(castCharacters))assets[name]={...data,img:await loadImage(`assets/cast-v1/${name}.png`)};
 assets.bossSplashes=await loadSplashAssets(loadImage);
 assets.laboratory=await loadLaboratoryAssets(loadImage);
 for(const [name,data]of Object.entries(laboratoryCharacters))assets[name]={...data,img:await loadImage(`assets/${data.folder??'laboratory-v1'}/${name}.png`)};
 assets.sewers=await loadSewerAssets(loadImage);
 for(const id of ['discarded','mayrena'])assets[id]=assets.sewers[id];
 assets.factory=await loadFactoryAssets(loadImage);Object.assign(assets,await loadCombatAssets(loadImage));
 assets.rooftop=await loadRooftopAssets(loadImage);for(const id of ['menina','breacher'])assets[id]=assets.rooftop[id];
 return assets;
}

export function createGameView(ctx,game,assets,{touch=false}={}){
 ctx.setTransform(ctx.canvas.width/480,0,0,ctx.canvas.height/270,0,0);
 let time=0,speeches=[];ctx.imageSmoothingEnabled=false;
 const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const text=(s,x,y,size=8,c='#f4e8cc',align='left')=>{const scale=Math.max(1,Math.floor(size/7)),spacing=1,w=pixelTextWidth(s,scale,spacing);pixelText(ctx,s,align==='center'?x:align==='right'?x-w/2:x+w/2,y,scale,c,spacing);};
 const px=(s,x,y,size,c)=>pixelText(ctx,s,x,y,size,c);
 function poly(points,c){ctx.fillStyle=c;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(Math.round(p[0]),Math.round(p[1])):ctx.moveTo(Math.round(p[0]),Math.round(p[1])));ctx.closePath();ctx.fill();}
 function tiled(image,sy,sh,y,height,tileWidth,offset,mirror=false){
  const start=Math.floor(offset/tileWidth);for(let n=start;n<=start+Math.ceil(480/tileWidth)+1;n++){const x=Math.floor(n*tileWidth-offset);ctx.save();if(mirror&&n%2){ctx.translate(x+tileWidth,y);ctx.scale(-1,1);ctx.drawImage(image,0,sy,image.width,sh,0,0,tileWidth,height);}else ctx.drawImage(image,0,sy,image.width,sh,x,y,tileWidth,height);ctx.restore();}
 }
 function environment(){
  if(game.level===5){rooftopBack(ctx,game,assets.rooftop,time);return;}
  if(game.level===4){factoryBack(ctx,game,assets.factory,time);return;}
  if(game.level===3){sewerBack(ctx,game,assets.sewers,time);return;}
  if(game.level===2){laboratoryBack(ctx,game,assets.laboratory,time);return;}
  if(game.level===1){
   tiled(assets.exhibition,0,assets.exhibition.height,29,241,720,Math.floor(game.camera),true);
   for(let n=0;n<4;n++){const x=100+n*720-game.camera;rect(x,99,88,13,'#13242d');px('WOW · EXPOSICIÓN',x+44,102,1,'#f3d5a8');}
   if(game.camera>1730){const x=2415-game.camera;rect(x,86,39,102,'#26313a');for(let y=88;y<188;y+=5)rect(x+2,y,35,1,'#52616a');rect(x+17,86,2,102,'#101b24');rect(x-15,71,69,12,'#142731');px('MONTACARGAS',x+20,74,1,'#a9e1c7');}
   return;
  }
  const cam=Math.floor(game.camera),a=assets.outside;rect(0,29,480,241,'#101c31');
  ctx.save();ctx.beginPath();ctx.rect(0,29,480,151);ctx.clip();
  tiled(a,0,a.height*.407,29,108,650,cam*.11);
  tiled(a,a.height*.407,a.height*.316,88,68,600,cam*.28);
  tiled(a,a.height*.723,a.height*.277,108,38,590,cam*.53);
  ctx.restore();
  tiled(assets.office,0,assets.office.height,29,241,482,cam,true);
  // Subtle animated fan glints and isolated loose paper retain a quiet living office.
  for(let i=Math.floor(cam/482);i<Math.floor(cam/482)+2;i++){const x=i*482+272-cam;if(Math.floor(time*8)%2)rect(x,142,2,1,'#e0d8bf');}
 }
 function drawSprite(sheet,index,x,y,height=72,face=1,opacity=1,tilt=0,castShadow=true){
  const a=assets[sheet],f=a.frames[index],scale=height*ACTOR_SCALE/a.base/(a.pixelRatio??1)*(f.renderScale??1),snap=a.pixelRatio>1?n=>n:Math.round;ctx.save();ctx.globalAlpha*=opacity;
  if(castShadow){
   // Contacts belong to this actual pose and follow all cinematic offsets/flips.
   const contacts=f.contacts??[{x:0,width:22/scale}];
   for(const foot of contacts)shadow(x+foot.x*scale*face,y+(foot.y??0)*scale,Math.max(3,foot.width*scale));
  }
  ctx.translate(x,y);ctx.scale(face,1);if(tilt)ctx.rotate(tilt);ctx.drawImage(a.img,f.sx,f.sy,f.sw,f.sh,snap(-f.pivotX*scale),snap(-f.pivotY*scale),snap(f.sw*scale),snap(f.sh*scale));ctx.restore();
 }
 function shadow(x,y,wide=26){ctx.save();ctx.fillStyle='#171b23';ctx.globalAlpha*=.30;ctx.beginPath();ctx.ellipse(x,y+.4,wide*.59,Math.max(1,Math.min(2.6,wide*.075)),0,0,Math.PI*2);ctx.fill();ctx.restore();}
 function reflection(anim,x,y,height,face){/* Matte office/lab tiles have no detached sprite reflection. */}
 function player(){const p=game.player,x=p.x-game.camera,anim=heroAnimation(p,time,game.deathTimer??0),face=p.action?.dir??(p.dodge>0?p.dodgeDir:p.facing);
  const blink=game.phase!=='intro'&&p.invuln>0&&!p.special&&p.hp>0&&Math.floor(time*14)%2===0;drawSprite(anim.sheet,anim.frame,x,p.y,72,face,blink?.52:1);
  if(p.action?.kind==='shoot'&&p.action.fired&&p.action.left>p.action.total*.35){const sx=x+face*32*ACTOR_SCALE;poly([[sx,p.y-57*ACTOR_SCALE],[sx+face*9,p.y-61*ACTOR_SCALE],[sx+face*5,p.y-55*ACTOR_SCALE],[sx+face*10,p.y-51*ACTOR_SCALE],[sx,p.y-52*ACTOR_SCALE]],'#ffe8b6');}
  if(p.special>0)special(x,p.y);
 }
 function special(x,y){
  for(let i=0;i<18;i++){const a=i*Math.PI/9+time*9;rect(x+Math.cos(a)*53,y-30+Math.sin(a)*21,3,2,i%2?'#f4c674':'#f77955');}
  // Tools are held by the drawn character. Only small impact sparks live here.
  const q=1-game.player.special/1.05;
  if(q>.12&&q<.83)for(let i=0;i<7;i++){const a=-1.2+i*.32;rect(x+Math.cos(a)*58*game.player.facing,y-34+Math.sin(a)*31,4,2,i%2?'#ffe4a2':'#ef8450');}

 }
 function bubble(s,x,y){
  const lines=wrapPixelText(s,300,2),w=Math.max(...lines.map(l=>pixelTextWidth(l,2)))+16,h=lines.length*20+12;
  const left=clamp(Math.round(x-w/2),5,475-w),top=Math.round(y+12-h),tail=clamp(Math.round(x),left+12,left+w-12);
  rect(left+2,top+2,w,h,'#101b2b');rect(left,top,w,h,'#172235');rect(left+1,top+1,w-2,h-2,'#fff1d4');
  poly([[tail-4,top+h-1],[tail+4,top+h-1],[tail,top+h+5]],'#fff1d4');
  lines.forEach((line,i)=>pixelText(ctx,line,left+w/2,top+8+i*20,2,'#172235'));
 }

 function enemy(e){if(e.hp<=0&&e.dead<=0)return;const x=e.x-game.camera;
  const waiting=e.boss?waitingCast(game,e):[];
  if(waiting.length){for(const actor of waiting)drawSprite(actor.sheet,0,actor.x-game.camera,actor.y,actor.height,actor.face);return;}
  if(e.sewer||e.mayrena){
   if(e.mayrena&&!game.previewCast&&(e.state==='waiting'||game.phase==='intro'))return;
   const a=sewerPose(e);sewerWarning(ctx,e,game.camera);
   drawSprite(a.sheet,a.frame,x,e.y,e.mayrena?88:72,e.facing,e.hp<=0?clamp(e.dead/.3,0,1):1);
   if(e.hp>0&&!e.mayrena){
    if(e.ranged){rect(x-3,e.y-99,6,3,'#c5dc6c');}
    if(e.hp<e.maxHp){rect(x-13,e.y-104,26,2,'#263e42');rect(x-13,e.y-104,26*e.hp/e.maxHp,2,'#e58768');}
   }
   if(e.mayrena&&e.sayingT>0&&game.phase==='fight')speeches.push([e.saying,x,e.y-127]);
   return;
  }
  if(e.menina||e.role==='breacher'){
   if(e.menina&&(e.state==='waiting'||game.phase==='intro'))return;
   const pose=rooftopPose(e);rooftopWarning(ctx,e,game.camera);
   drawSprite(pose.sheet,pose.frame,x,e.y,e.menina?126:72,e.facing,e.hp<=0?clamp(e.dead/.3,0,1):1);
   if(!e.menina&&e.hp<e.maxHp&&e.hp>0){rect(x-14,e.y-104,28,3,'#343c46');rect(x-14,e.y-104,28*e.hp/e.maxHp,2,'#e26855');}
   if(e.menina&&e.state==='recover'){const cy=e.y-103;for(let i=0;i<4;i++){const t=time*3+i*Math.PI/2;rect(x+Math.cos(t)*12,cy+Math.sin(t)*18,2,2,'#beffb5');}}
   return;
  }
  if(e.soldier||e.rost){
   if(e.rost&&(e.state==='waiting'||game.phase==='intro'))return;
   const anim=combatPose(e),h=e.rost?105:72;factoryWarning(ctx,e,game.camera);
   drawSprite(anim.sheet,anim.frame,x,e.y,h,e.facing,e.hp<=0?clamp(e.dead/.25,0,1):1);
   if(!e.rost&&e.hp>0&&e.hp<e.maxHp){rect(x-14,e.y-104,28,3,'#343c46');rect(x-14,e.y-104,28*e.hp/e.maxHp,2,'#e26855');}
   if(e.rost&&e.sayingT>0&&game.phase==='fight')speeches.push([e.saying,x,e.y-151]);return;
  }
  if(e.elisa){
   // Her first appearance belongs to the illustrated surprise, not the approach.
   if(!e.bear&&!e.transforming&&(e.state==='waiting'||game.phase==='intro'))return;
   if(e.transforming){
    const t=game.introDuration-game.introTimer,pose=laboratoryTransformation(t);
    if(pose.human){const a=assets.labElisa,c=a.clips[pose.humanClip];drawSprite('labElisa',c[(pose.humanFrame??0)%c.length],x+pose.humanOffset,e.y+(pose.humanDepth??0),72,pose.humanFacing??-1);}
    if(pose.sheet){const a=assets[pose.sheet],c=a.clips[pose.clip];drawSprite(pose.sheet,c[pose.frame%c.length],x+pose.offset,e.y,pose.height,-1);}
    return;
   }
   const anim=laboratoryAnimation(e,game,time),a=assets[anim.sheet],clip=a.clips[anim.clip]??a.clips.idle,index=clip[anim.frame%clip.length];
   laboratoryWarning(ctx,e,game.camera);drawSprite(anim.sheet,index,x,e.y,anim.bear?140:72,e.facing,e.hp<=0?clamp(e.dead/.25,0,1):1);
   if(e.sayingT>0&&!anim.bear&&game.phase!=='intro'&&game.phase!=='bossdown')speeches.push([e.saying,x,e.y-118]);
   return;
  }
  if(e.boss&&game.previewCast&&['mayrena','rost'].includes(game.previewCast)){
   const key=game.previewCast,formed=game.previewTransformed||game.introDuration-game.introTimer>=9.1;
   if(formed)drawSprite(key==='mayrena'?'castMayrena':'castRost',0,x,e.y,72,-1);
   else for(const [sheet,offset]of (key==='mayrena'?[['castMayte',-30],['castLorena',30]]:[['castRosi',-30],['castDavid',30]]))drawSprite(sheet,0,x+offset,e.y,72,-1);
   return;
  }
  if(e.fusion){drawFusion({ctx,game,e,time,drawSprite,rect,shadow:()=>{},bubble:(...args)=>speeches.push(args)});if(e.sayingT>0&&game.phase!=='intro'&&game.phase!=='bossdown')speeches.push([e.saying,x,e.y-119]);return;}
  if(e.boss&&e.state==='waiting'){drawSprite('boss',assets.boss.clips.intro[0],x,e.y,76,-1);return;}
  if(e.boss&&game.phase==='intro'){introBoss(e,x);return;}
  const a=enemyAnimation(e,time),h=e.boss?76:e.type===1?74:e.type===2?66:e.type===3?67:74;const opacity=e.hp<=0?clamp(e.dead/.22,0,1):1;
  reflection(a,x,e.y,h,e.facing);drawSprite(a.sheet,a.frame,x,e.y,h,e.facing,opacity,0);
  if(e.flash>0){rect(x-2,e.y-43,6,2,'#fff1c8');rect(x,e.y-45,2,7,'#fff1c8');}
  if(!e.boss&&e.hp<e.maxHp&&e.hp>0){rect(x-14,e.y-h*ACTOR_SCALE-8,28,3,'#343c46');rect(x-14,e.y-h*ACTOR_SCALE-8,Math.ceil(28*e.hp/e.maxHp),2,'#e26855');}
  if(e.state==='windup'){text('!',x,e.y-h*ACTOR_SCALE-10,11,'#f84b3f','center');}
  if(e.boss&&e.sayingT>0&&game.phase!=='bossdown')speeches.push([e.saying,x,e.y-124]);
 }
 function introBoss(e,x){const elapsed=game.introDuration-game.introTimer,a=officeBossIntroPose(elapsed);
  // Turn from the back toward Martuki on the left, with no last-frame flip.
  drawSprite(a.sheet,a.frame,x,e.y,76,-1);
 }
 function ally(){
  const a=game.bofeSummon,t=game.introDuration-game.introTimer;
  if(a){
   const q=a.elapsed,frame=q<.18?0:q<BOFE_SUMMON.impact?1:q<.87?2:0;
   const alpha=clamp(q/.13,0,1)*(1-clamp((q-1.0)/.4,0,1)),x=a.x-game.camera;
   drawSprite('castBofe',frame,x,a.y,72,a.face,alpha);
   if(q>=BOFE_SUMMON.impact){
    const progress=clamp((q-BOFE_SUMMON.impact)/.5,0,1);
    ctx.save();ctx.globalAlpha=(1-progress)*.8;ctx.strokeStyle='#9ceeff';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(x,a.y-4,20+progress*560,8+progress*60,0,0,Math.PI*2);ctx.stroke();ctx.restore();
   }
   for(let i=0;i<12;i++){const r=14+i%4*8,angle=i*Math.PI/6+q*5;rect(x+Math.cos(angle)*r,a.y-28+Math.sin(angle)*r,2,3,'#a9e9fb');}
  }else if(game.phase==='intro'&&game.level===1&&t>=BOFE_BEATS.arrive){
   const alpha=clamp((t-BOFE_BEATS.arrive)/.5,0,1)*(1-clamp((t-(game.introDuration-.7))/.7,0,1));
   const x=game.player.x-game.camera-42;drawSprite('castBofe',0,x,game.player.y,72,1,alpha);
  }
 }
 function foreground(){
  if(game.level===5){rooftopForeground(ctx,game,assets.rooftop);return;}
  if(game.level===4){factoryForeground(ctx,game,assets.factory);return;}
  if(game.level===3){sewerForeground(ctx,game,time);return;}
  if(game.level===2){laboratoryForeground(ctx,game,assets.laboratory,time);return;}
  if(game.level===1)return;
  const img=assets.foreground,width=610,height=241;
  // 20 cm steel profiles: 8 pixels wide beside a 72 pixel adult. Permanent
  // scenery with continuous parallax; no actor-dependent visibility or opacity.
  for(const {x,columnWidth,propsY}of foregroundLayout(game.camera)){
   // Neutral gray I-beam drawn independently: the old atlas crop included plant leaves.
   rect(x,29,columnWidth,height,'#55575b');rect(x+1,29,1,height,'#aaabad');rect(x+3,29,3,height,'#303236');rect(x+6,29,1,height,'#85878a');
   for(let y=51;y<270;y+=53){rect(x+1,y,2,2,'#37393c');rect(x+5,y,2,2,'#b0b1b2');}
   // Extend upward at the same vertical scale so none of the wire hooks are cropped.
   ctx.drawImage(img,img.width*.084,img.height*.46,img.width*.916,img.height*.54,x+32,propsY+32-70*.16/.38,width*.916,70*.54/.38);
  }
 }
 function pickup(a){const x=a.x-game.camera,y=a.y-4+Math.sin(time*4+a.id)*2;shadow(x,a.y,16);rect(x-10,y+3,20,1,'#dac17b');
  const f=pickupFrames[a.kind];ctx.drawImage(assets.pickups,f.sx,f.sy,f.sw,f.sh,Math.round(x-f.pivotX),Math.round(y-f.pivotY),f.sw,f.sh);
 }
 function effects(){
  for(const b of game.projectiles){const x=b.x-game.camera;if(b.rifle){rect(x,b.y-75,7*b.dir,1,'#ffe5a3');continue;}if(b.owner==='enemy'&&b.chemical){rect(x-3,b.y-76,6,5,'#c9dd74');rect(x-5*b.dir,b.y-75,3,3,'#5d8d56');continue;}if(b.owner==='player'){rect(x,b.y-55*ACTOR_SCALE,8*b.dir,1,'#fff0bb');rect(x-b.dir*5,b.y-55*ACTOR_SCALE,3,1,'#dfad60');}else{ctx.save();ctx.translate(Math.round(x),Math.round(b.y-(b.blue?105:32*ACTOR_SCALE)));ctx.rotate(time*9);rect(-5,-4,11,9,b.chemical?'#85eea9':b.blue?'#426cbd':b.ceramic?'#bc7860':'#f2e6cd');rect(-3,-2,7,1,b.ceramic?'#f3cfac':'#8a9a9e');rect(-3,0,4,1,b.ceramic?'#8b5147':'#8a9a9e');ctx.restore();}}
  for(const f of game.effects){const x=f.x-game.camera;if(f.kind==='shockwave'){ctx.save();ctx.strokeStyle='#b6f9cf';ctx.lineWidth=2;ctx.globalAlpha=f.ttl/f.total;ctx.beginPath();ctx.ellipse(x,f.y,100*(1-f.ttl/f.total),18,0,0,Math.PI*2);ctx.stroke();ctx.restore();}else if(f.kind==='hit'){const t=1-f.ttl/f.total;for(let i=0;i<8;i++){const a=i*Math.PI/4;rect(x+Math.cos(a)*(3+t*15),f.y+Math.sin(a)*(3+t*11),3,2,i%2?'#fff0c2':'#e47e52');}}else text(f.text,x,f.y-(1-f.ttl/f.total)*16,9,'#ffe0a2','center');}
 }
 function hud(){const p=game.player;rect(0,0,480,29,'#131f32');rect(0,28,480,1,'#40505b');text('MARTUKI',9,4,8);rect(9,15,102,6,'#45535c');rect(10,16,100*p.hp/p.maxHp,4,'#ef6b59');text(`${Math.ceil(p.hp)}`,116,14,7,'#d5dfd3');text(p.weapon==='smg'?'METRALLETA':'PISTOLA',142,4,7,'#a5bac2');text(`${p.ammo.toString().padStart(2,'0')} BALAS`,142,15,8);text(touch?'ESPECIAL':'U · ESPECIAL',236,4,7,p.specialCD<=0?'#f1d28b':'#97acb9');
  text(p.specialCD>0?`${Math.ceil(p.specialCD)}s`:'LISTO',236,14,7,'#f1d28b');
  rect(236,23,76,3,'#394b5b');rect(236,23,76*(1-p.specialCD/10),3,'#eec479');
  if(game.bofeUnlocked){
   text(touch?'BOFE':'B · BOFE',326,4,7,'#8ae5ff');
   text(game.bofeCooldown>0?`${Math.ceil(game.bofeCooldown)}s`:'LISTO',326,14,7,'#8ae5ff');
   rect(326,23,62,3,'#394b5b');rect(326,23,62*(1-game.bofeCooldown/BOFE_COOLDOWN),3,'#8ae5ff');
  }
  text(String(game.score).padStart(7,'0'),470,4,9,'#f5e6c9','right');text('PUNTOS',470,16,6,'#95a6b5','right');
  // Only actionable cues, drawn directly over the scene without notice cards.
  const notice=game.banner?.ttl>0&&!game.banner.text.startsWith('CONTIN')?game.banner:null;
  const cue=notice?.text??(game.phase==='travel'?'CONTINÚA →':null);
  if(cue&&game.mode==='playing'&&!['intro','playerdown','bossdown'].includes(game.phase)){
   ctx.save();ctx.globalAlpha=notice?Math.min(1,notice.ttl/.3):.85;
   const color=cue==='+ VIDA'?'#a9edb0':cue==='+ MUNICIÓN'?'#91e5ff':'#f6ce76';
   px(cue,241,51,2,'#07101d');px(cue,240,50,2,color);ctx.restore();
  }
  const b=game.enemies.find(e=>e.boss);if(b&&b.hp>0&&b.state!=='waiting'&&game.phase!=='intro'){rect(69,249,342,16,'#142136');text(game.level===5?'ME|NI|NA':game.level===4?'ROST-VIDF RUBIÑOZ RUBIÑOZ':game.level===3?'MAYRENA DISENYOSTKA':game.level===2?(b.bear?'ELISA Y OSO MARTÍN':'ELISA MARTÓN'):game.level===1?'MARIXÁSMIN MATATODOSK':'DIMITRI TONTOTSKY',77,251,6,'#efdab9');rect(77,260,326,3,'#46505a');rect(77,260,326*b.hp/b.maxHp,3,'#e56b56');}
 }
 function victory(campaignComplete=false){
  rect(0,29,480,241,'#080f1de8');rect(77,10,326,243,'#d2aa61');rect(78,11,324,241,'#142136');rect(81,14,318,235,'#101b2b');
  ctx.save();ctx.translate(240,33);
  const gold='#f6ce76';poly([[-17,-9],[-6,-20],[0,-14],[-11,-3]],gold);poly([[-7,-10],[-4,-13],[14,7],[11,10]],gold);
  poly([[4,-20],[13,-14],[18,-5],[18,5],[11,14],[1,18],[-10,15],[-18,8],[-15,4],[-8,11],[1,13],[9,9],[12,2],[12,-6],[7,-14]],gold);poly([[-8,8],[-4,11],[-16,24],[-20,20]],gold);ctx.restore();
  px(campaignComplete?'MISIÓN COMPLETADA':'NIVEL COMPLETADO',240,76,3,'#f6ce76');px(campaignComplete?'OPERACIÓN · VUELTA A CASA':['CAPÍTULO 01 · DEPARTAMENTO','CAPÍTULO 02 · EXPOSICIÓN WOW','CAPÍTULO 03 · LABORATORIO','CAPÍTULO 04 · ALCANTARILLAS','CAPÍTULO 05 · FÁBRICA','CAPÍTULO 06 · AZOTEA'][game.level],240,104,1,'#a8bccc');rect(99,117,282,1,'#485260');
  const r=game.result??{score:game.score,kills:game.kills,time:game.time,healthBonus:Math.round(game.player.hp)*20};
  text('PUNTUACIÓN TOTAL',102,128,7,'#e8d8ba');text(String(r.score).padStart(7,'0'),378,124,14,'#fff0ce','right');
  text('BONUS DE SALUD',102,154,7,'#aec2cc');text('+'+r.healthBonus,378,154,8,'#f1d28b','right');
  text('ENEMIGOS DERROTADOS',102,174,7,'#aec2cc');text(String(r.kills),378,174,8,'#f1d28b','right');
  text('TIEMPO DE MISIÓN',102,194,7,'#aec2cc');text(`${Math.floor(r.time/60)}:${Math.floor(r.time%60).toString().padStart(2,'0')}`,378,194,8,'#f1d28b','right');
 }
 function render(t,paused=false,{hideSplash=false,quiet=false,dialogue=false,showResults=false,campaignComplete=false}={}){time=t;speeches=[];ctx.save();ctx.fillStyle='#081321';ctx.fillRect(0,0,480,270);
  if(dialogue){ctx.fillStyle='#081321';ctx.fillRect(0,0,480,270);ctx.beginPath();ctx.rect(0,0,480,192);ctx.clip();ctx.translate(48,-22);ctx.scale(.8,.8);ctx.beginPath();ctx.rect(0,29,480,241);ctx.clip();}
  if(game.level===2&&game.stage===3&&!dialogue){ctx.translate(240,239);ctx.scale(.84,.84);ctx.translate(-240,-239);}
  if(game.shake>0&&!paused&&game.phase!=='intro')ctx.translate(Math.round(Math.sin(time*91)*game.shake),Math.round(Math.cos(time*83)*game.shake*.3));environment();
  if(game.phase==='fight'||game.phase==='clearing'){const x=game.arenas[game.stage].right-game.camera;for(let y=192;y<239;y+=9)rect(x,y,2,4,'#c86151');}
  game.pickups.forEach(pickup);const actors=[...game.enemies.map(e=>({y:e.y,draw:()=>enemy(e)})),{y:game.player.y,draw:player}].sort((a,b)=>a.y-b.y);actors.forEach(a=>a.draw());ally();effects();foreground();ctx.restore();if(!dialogue&&!['intro','bossdown'].includes(game.phase))hud();
  if(game.phase==='intro'&&game.level===0&&!hideSplash)drawBossSplash(ctx,assets.bossSplashes,'dimitri',game.introDuration-game.introTimer);
  if(game.phase==='intro'&&game.level===1&&!hideSplash){const elapsed=game.introDuration-game.introTimer;drawBossSplash(ctx,assets.bossSplashes,'marixas',elapsed);drawBossSplash(ctx,assets.bossSplashes,'bofe',elapsed);}
  if(game.phase==='intro'&&game.level===2&&!hideSplash){drawBossSplash(ctx,assets.bossSplashes,game.enemies.some(e=>e.transforming)?'martin':'elisa',game.introDuration-game.introTimer);}
  if(paused)rect(0,29,480,241,'#101b2a99');
  if(game.mode==='won'&&showResults)victory(campaignComplete);
 }
 function splash(t,{flashOverride=null,title=true}={}){time=t;const img=assets.splash,half=img.height/2,flash=flashOverride??stormFlash(t);ctx.drawImage(img,0,0,img.width,half,0,0,480,270);rect(0,0,480,270,'#07101d35');if(flash>0){ctx.save();ctx.globalAlpha=flash;ctx.drawImage(img,0,half,img.width,half,0,0,480,270);ctx.restore();}
  // Moving rain lives independently of the painted resting and lightning frames.
  for(let i=0;i<75;i++){const x=((i*73-t*31)%520+520)%520-20,y=((i*47+t*129)%310)-20;const alpha=.09+flash*.11;ctx.fillStyle=`rgba(163,198,225,${alpha})`;ctx.fillRect(Math.round(x),Math.round(y),1,4);ctx.fillRect(Math.round(x-1),Math.round(y+4),1,3);}
  // Martuki occupies x >= 307. Even the entrance overshoot stays left of x=300.
  if(title){const entry=clamp(t/.65,0,1),zoom=1+.025*Math.pow(1-entry,2),w=280*zoom,h=w/2,x=10,y=38+Math.sin(t*.65)*1.2-18*Math.pow(1-entry,2);ctx.save();ctx.globalAlpha=clamp(t/.18,0,1);ctx.drawImage(assets.logo,Math.round(x),Math.round(y),Math.round(w),Math.round(h));ctx.restore();}
 }
 return{render,splash,drawSprite,assets};
}
