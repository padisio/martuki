// A small synchronous save survives mobile tab discard without relying on unload.
export const SAVE_KEY='martuki-session-v1';
export function captureSession(game,story,conversation,ui={}){
 if(game.mode==='attract'&&!story.active)return null;
 return JSON.parse(JSON.stringify({version:1,savedAt:Date.now(),game,
  story:{mode:story.mode,pages:story.pages,index:story.index,origin:story.origin,routeId:story.routeId,showArt:story.showArt,autoElapsed:story.autoElapsed},
  conversation:{pages:conversation.pages,index:conversation.index,cast:conversation.cast,id:conversation.id},ui}));
}
export function validSession(data){
 const g=data?.game,s=data?.story;
 return data?.version===1&&Number.isInteger(g?.level)&&g.level>=0&&g.level<6&&Number.isInteger(g.stage)&&g.stage>=0&&g.stage<4&&
  ['attract','playing','won','lost'].includes(g.mode)&&Number.isFinite(g.player?.hp)&&Number.isFinite(g.player?.x)&&
  Array.isArray(g.enemies)&&Array.isArray(g.pickups)&&Array.isArray(g.effects)&&Array.isArray(g.projectiles)&&
  ['closed','sequence','gallery'].includes(s?.mode)&&Array.isArray(s.pages)&&Number.isInteger(s.index)&&s.index>=0&&
  (s.mode!=='sequence'||s.index<s.pages.length)&&Array.isArray(data.conversation?.pages);
}
export function readSession(storage){try{const data=JSON.parse(storage.getItem(SAVE_KEY));return validSession(data)?data:null;}catch{return null;}}
export function writeSession(storage,data){if(!data)return false;try{storage.setItem(SAVE_KEY,JSON.stringify(data));return true;}catch{return false;}}
export function restoreGame(game,data){
 if(!validSession(data))return false;
 game.reset(data.game.stage,data.game.level);
 for(const [key,value]of Object.entries(data.game)){
  if(['__proto__','constructor','prototype','random'].includes(key)||key in Object.getPrototypeOf(game))continue;
  game[key]=JSON.parse(JSON.stringify(value));
 }
 game.events=[];return true;
}
