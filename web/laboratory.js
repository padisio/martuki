import {attackCue} from './attack-cues.js?v=52';
import {laboratoryAttack} from './laboratory-combat.js?v=52';
import {pixelText} from './pixel-font.js?v=52';
import {LAB_ROOMS,LAB_ROOM_WIDTH,LAB_FURNITURE,laboratoryScreenX} from './laboratory-layout.js?v=52';
// Keep the tallest raised-arm pose below the HUD, even at the back of the lane.
export const LAB_BEAR_HEIGHT=112;
export const LAB_SCENES=['windows','samples','restricted','containment','foreground-table','foreground-boxes','wow-logo'];
export const laboratoryAssetPath=id=>`assets/laboratory-v3/${id}.png`;
export async function loadLaboratoryAssets(loadImage){return Object.fromEntries(await Promise.all(LAB_SCENES.map(async id=>[id,await loadImage(laboratoryAssetPath(id))])));}
export function laboratoryBack(ctx,game,assets,time){
 const cam=game.camera;ctx.fillStyle='#aea596';ctx.fillRect(-60,-25,600,315);
 for(const room of LAB_ROOMS){
  const x=room.start-cam;if(x>540||room.end-cam< -60)continue;
  ctx.save();ctx.beginPath();ctx.rect(x,29,room.end-room.start,241);ctx.clip();
  // Uniform 640px architecture. Never squash each room to a different width.
  ctx.drawImage(assets[room.id],x,29,LAB_ROOM_WIDTH,241);
  if(room.end-room.start>LAB_ROOM_WIDTH)ctx.drawImage(assets[room.id],assets[room.id].width-2,0,2,assets[room.id].height,x+LAB_ROOM_WIDTH,29,room.end-room.start-LAB_ROOM_WIDTH,241);
  ctx.restore();
 }
 // Expansion joints mark the actual room boundary and share floor coordinates.
 for(const room of LAB_ROOMS.slice(1)){const x=room.start-cam;ctx.fillStyle='#8a6953';ctx.fillRect(x-1,174,3,116);ctx.fillStyle='#bea082';ctx.fillRect(x,174,1,116);}
 // No duplicate miniature tables, detached floor grid or artificial service bays.

}
// The supplied original bitmap is mapped directly to the box surface.
function decal(ctx,img,p0,p1,p2){
 ctx.save();ctx.transform((p1[0]-p0[0])/img.width,(p1[1]-p0[1])/img.width,(p2[0]-p0[0])/img.height,(p2[1]-p0[1])/img.height,p0[0],p0[1]);ctx.drawImage(img,0,0);ctx.restore();
}
export function laboratoryForeground(ctx,game,assets,time){
 for(const item of LAB_FURNITURE){
  const image=assets[item.id],x=laboratoryScreenX(item.x,game.camera)-item.width/2,h=image.height/image.width*item.width,y=item.footY-h;
  if(x>480||x+item.width<0)continue;
  ctx.save();ctx.translate(x,y);ctx.scale(item.width/image.width,item.width/image.width);ctx.drawImage(image,0,0);
  const w=image.width,hh=image.height,logo=assets['wow-logo'];
  if(item.id==='foreground-boxes'){
   decal(ctx,logo,[w*.31,hh*.16],[w*.51,hh*.18],[w*.31,hh*.36]);
   decal(ctx,logo,[w*.06,hh*.65],[w*.24,hh*.66],[w*.06,hh*.83]);
  }else{
   decal(ctx,logo,[w*.73,hh*.12],[w*.80,hh*.12],[w*.73,hh*.21]);
   decal(ctx,logo,[w*.73,hh*.27],[w*.80,hh*.27],[w*.73,hh*.36]);
  }
  ctx.restore();
 }
}
export function laboratoryAnimation(e,game,time){
 const bear=!!e.bear,spec=laboratoryAttack(e);let clip='idle',frame=0;
 if(e.hp<=0)clip='down';
 else if(e.flash>0&&['chase','recover'].includes(e.state))clip='hurt';
 else if(e.state==='windup'){
  clip=e.move==='slam'?'slamLoad':'load';
  if(bear&&e.move==='slam'){const p=1-e.timer/spec.windup;frame=p<.22?0:p<.48?1:2;}
 }else if(e.state==='labStrike'){
  clip=e.move==='slam'?'slam':e.move==='serum'?'serum':e.move==='charge'?(bear?'charge':'walk'):'hit';
  frame=e.move==='charge'?Math.floor(e.walk)%4:bear?((e.attackElapsed??0)<spec.impact?0:1):0;
 }else if(e.state==='recover'){
  clip=bear&&e.move==='slam'?'slamRecover':'recover';
  if(bear){const p=1-e.timer/spec.recovery;frame=p<.25?0:p<.55?1:2;}
 }else if(e.moving){clip='walk';frame=Math.floor(e.walk)%8;}
 return {sheet:bear?'labBear':'labElisa',clip,frame,bear};
}
export function laboratoryWarning(ctx,e,cam){attackCue(ctx,e,cam,{height:e.bear?160:104,ranged:e.move==='serum'});}
