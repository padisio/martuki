import {ARMED_ENEMY_SCALE,ARMED_MARKER_HEIGHT} from './scene-scale.js?v=armed-scale-1';
import {attackCue} from './attack-cues.js?v=52';
import {combatCharacters} from './combat-art.js?v=quiet-ui-1';
export async function loadFactoryAssets(loadImage){
 const a={};for(const id of ['production','storage','kiln-control','kiln-after-impact','torito','pallet'])a[id]=await loadImage(`assets/factory-v1/${id}.png`);
 for(const id of ['service-bay','continuous-floor'])a[id]=await loadImage(`assets/factory-v2/${id}.png`);
 a.logo=await loadImage('assets/laboratory-v3/wow-logo.png');return a;
}
export async function loadCombatAssets(loadImage){
 return Object.fromEntries(await Promise.all(Object.entries(combatCharacters).map(async([id,data])=>[id,{...data,img:await loadImage(`assets/combat-v1/${id}.png`)}])));
}
function prop(ctx,im,box,x,y,w){const [l,t,r,b]=box,h=w*(b-t)/(r-l);ctx.drawImage(im,l,t,r-l,b-t,Math.round(x),Math.round(y-h),w,h);}
export const FACTORY_LAYOUT={baySpacing:840,floorY:198,connectorWidth:156,connectorTop:-10};
function continuousFloor(ctx,im,cam){
 const y=FACTORY_LAYOUT.floorY,h=108,w=Math.round(h*im.width/im.height);
 const first=Math.floor((cam-60)/w),last=Math.ceil((cam+540)/w);
 // Mirrored texture pairs share exactly the same edge pixels. No room owns a floor.
 for(let i=first;i<=last;i++){
  const x=i*w-cam;ctx.save();ctx.translate(x+(i%2?w:0),y);
  if(i%2)ctx.scale(-1,1);ctx.drawImage(im,0,0,w,h);ctx.restore();
 }
}
export function factoryBack(ctx,game,a,time){
 const cam=Math.round(game.camera);ctx.fillStyle='#5d6464';ctx.fillRect(-60,-25,600,320);
 const rooms=[['production',-15],['storage',-24],[game.factoryFire?'kiln-after-impact':'kiln-control',-15]];
 for(const [i,[id,y]]of rooms.entries()){
  const x=i*840-cam;if(x>540||x+840< -60)continue;
  ctx.save();ctx.beginPath();ctx.rect(x,-25,840,FACTORY_LAYOUT.floorY+25);ctx.clip();ctx.drawImage(a[id],x,y,900,300);ctx.restore();
 }
 // Wide rear service bays give the adjoining production lines a physical ending.
 // Their posts stop behind the walking lane; no divider cuts across the floor.
 for(const wx of [840,1680]){
  const {connectorWidth:w,connectorTop:y,floorY}=FACTORY_LAYOUT,x=wx-w/2-cam;
  if(x>540||x+w< -60)continue;
  const bay=a['service-bay'];
  // Register the actual steel feet at the shared rear floor edge, excluding
  // the small ground margin painted below them in the source illustration.
  ctx.drawImage(bay,bay.width*.04,0,bay.width*.92,bay.height*.93,x,y,w,floorY-y);
 }
 continuousFloor(ctx,a['continuous-floor'],cam);
 // The logistics vehicle stays behind the walking lane, on its own service route.
 const tick=game.factoryRunning?game.time:0,route=(tick*13)%360,x=1000+route-cam;
 if(x> -140&&x<500){
  ctx.fillStyle='#10181c66';ctx.beginPath();ctx.ellipse(x+60,190,56,2,0,0,Math.PI*2);ctx.fill();
  prop(ctx,a.torito,[41,113,1510,909],x,190,124);
 }
 // Lights and embers belong to the damaged kiln, only after the film's first blow.
 if(game.factoryFire){
  for(let i=0;i<14;i++){const x=1830+(i*23)%160-cam,y=182-((time*27+i*13)%82);ctx.fillStyle=i%3?'#e68048':'#ffd489';ctx.fillRect(Math.round(x),Math.round(y),1,2);}
 }
}
export function factoryForeground(ctx,game,a){
 for(const wx of [90,760,1440,2040,2600]){
  const x=Math.round(wx-game.camera*1.06);if(x< -145||x>490)continue;
  prop(ctx,a.pallet,[21,115,1759,820],x,308,140);
  ctx.drawImage(a.logo,x+65,263,17,8);
 }
}
export function combatPose(e){
 const sheet=e.rost?'rost':e.soldier?'soldier':e.variant,data=combatCharacters[sheet];
 let clip='idle',index=0;
 if(e.hp<=0)clip='down';
 else if(e.state==='windup')clip=e.move==='slam'?'slamLoad':'load';
 else if(e.state==='strike')clip=e.move==='butt'?'butt':e.move==='slam'?'slam':e.move==='shards'?'throw':'hit';
 else if(e.moving){clip='walk';index=Math.floor(e.walk/(e.soldier?ARMED_ENEMY_SCALE:1))%6;}
 const frames=data.clips[clip]??data.clips.load??data.clips.idle;
 return {sheet,frame:frames[index%frames.length]};
}
export function factoryWarning(ctx,e,cam){attackCue(ctx,e,cam,{height:e.rost?148:ARMED_MARKER_HEIGHT,ranged:!e.rost&&e.move!=='butt'});}
