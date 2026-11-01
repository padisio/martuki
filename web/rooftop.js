import {ARMED_ENEMY_SCALE,ARMED_MARKER_HEIGHT} from './scene-scale.js?v=armed-scale-1';
import {rooftopCharacters} from './rooftop-art.js?v=52';
import {attackCue} from './attack-cues.js?v=52';
export async function loadRooftopAssets(load){
 const a={};for(const key of ['roof','wreck'])a[key]=await load(`assets/rooftop-v1/${key}.png`);
 for(const [key,data]of Object.entries(rooftopCharacters))a[key]={...data,img:await load(`assets/rooftop-v1/${key}.png`)};
 return a;
}
function repeat(ctx,im,sy,sh,y,h,w,offset){
 for(let n=Math.floor((offset-60)/w);n<=Math.ceil((offset+540)/w);n++){
  const x=n*w-offset;ctx.save();ctx.translate(x+(n%2?w:0),y);if(n%2)ctx.scale(-1,1);ctx.drawImage(im,0,sy,im.width,sh,0,0,w,h);ctx.restore();
 }
}
export function rooftopBack(ctx,game,a,time){
 const im=a.roof,cam=Math.round(game.camera),split=Math.round(im.height*.615);
 // Distant skyline and machinery occupy the same source, split along a straight
 // ledge. The actor lane and front panels remain locked to world coordinates.
 repeat(ctx,im,0,split,29,159,780,Math.round(cam*.75));
 repeat(ctx,im,split,im.height-split,188,100,780,cam);
 // Helipad markings lie on the common floor: no new background or floor seam.
 const pad=2230-cam;
 ctx.save();ctx.strokeStyle='#c3c6b65c';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(pad,222,155,22,0,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#c3c6b666';ctx.fillRect(pad-17,208,5,29);ctx.fillRect(pad+12,208,5,29);ctx.fillRect(pad-12,220,24,4);ctx.restore();
 if(game.rooftopWreck){const wreck=a.wreck,w=225,h=w*wreck.height/wreck.width;ctx.drawImage(wreck,2310-cam-w/2,190-h,w,h);}
 // Wind-driven embers are sparse and remain behind actors.
 for(let n=0;n<18;n++){const x=((n*83+time*18-cam*.18)%530+530)%530-25,y=40+(n*43-time*9)%140;ctx.fillStyle=n%3?'#da793a80':'#ffd78799';ctx.fillRect(Math.round(x),Math.round(y),1,1);}
}
export function rooftopForeground(ctx,game,a){
 const im=a.roof;
 // Close solar-panel lips only below the playable lane, using the same artwork.
 for(const wx of [70,650,1210,1820,2590]){const x=Math.round(wx-game.camera*1.05);if(x< -220||x>500)continue;ctx.drawImage(im,310,348,610,80,x,257,215,28);}
}
export function rooftopPose(e){
 const sheet=e.menina?'menina':'breacher',a=rooftopCharacters[sheet];let clip='idle',index=0;
 if(e.hp<=0)clip='down';
 else if(e.state==='windup')clip=e.menina?(e.move==='slam'?'slamLoad':'load'):'load';
 else if(e.state==='strike')clip=e.menina?(e.move==='slam'?'slam':e.move==='shards'?'cast':e.move==='rush'?'walk':'hit'):(e.move==='butt'?'butt':'hit');
 else if(e.state==='recover')clip='recover';
 else if(e.moving)clip='walk';
 if(clip==='walk')index=Math.floor(e.walk/(e.menina?1:ARMED_ENEMY_SCALE))%4;
 const frames=a.clips[clip]??a.clips.idle;return {sheet,frame:frames[index%frames.length]};
}
export function rooftopWarning(ctx,e,cam){attackCue(ctx,e,cam,{height:e.menina?190:ARMED_MARKER_HEIGHT,ranged:!e.menina&&e.move!=='butt'});}
