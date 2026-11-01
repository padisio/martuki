import {FACTORY_ENCOUNTER_PAGES} from './factory-data.js?v=8';
import {SEWER_ENCOUNTER_PAGES} from './sewer-data.js?v=9';
import {LAB_ENCOUNTER_PAGES,LAB_FUSION_PAGES} from './lab-data.js?v=52';
import {EXPO_ENCOUNTER_PAGES} from './expo-data.js?v=52';
import {JAVI_PAGES} from './javi-data.js?v=5-reveal';
import {drawDialogueCaption,conversationPartner,speakerStyle} from './dialogue-style.js?v=quiet-ui-1';
import {OFFICE_BOSS_BEATS} from './core.js?v=56';
import {wrapPixelText} from './pixel-font.js?v=52';

const line=(speaker,text)=>({speaker,text});
// Playable encounters share their approved narrative with the archive.
// Factory also uses the final illustrated encounter, without extra dialogue.
export const BOSS_DIALOGUES={
 elisa:LAB_ENCOUNTER_PAGES.filter(p=>p.kind==='dialogue').map(({speaker,text})=>line(speaker,text)),
 martin:LAB_FUSION_PAGES.filter(p=>p.kind==='dialogue').map(({speaker,text})=>line(speaker,text)),
 dimitri:JAVI_PAGES.map(({speaker,text,speakerLabel})=>({...line(speaker,text),...(speakerLabel?{speakerLabel}:{})})),
 // The archive uses the same approved dialogue as the playable cinematic.
 marixas:EXPO_ENCOUNTER_PAGES.slice(0,27).filter(p=>p.kind==='dialogue').map(({speaker,text})=>line(speaker,text)),
 drink:EXPO_ENCOUNTER_PAGES.filter(p=>p.kind==='dialogue'&&p.approvedStep>=30&&p.approvedStep<35).map(({speaker,text})=>line(speaker,text)),
 bofe:EXPO_ENCOUNTER_PAGES.filter(p=>p.kind==='dialogue'&&p.approvedStep>=40).map(({speaker,text})=>line(speaker,text)),
 mayrena:SEWER_ENCOUNTER_PAGES.filter(p=>p.kind==='dialogue').map(({speaker,text})=>line(speaker,text)),
 rost:FACTORY_ENCOUNTER_PAGES.filter(p=>p.kind==='dialogue').map(({speaker,text})=>line(speaker,text))
};

export function paginateBossPages(pages){
 return pages.flatMap(page=>{
  if(page.kind)return [page];
  const lines=wrapPixelText(page.text,452,1.5),parts=[];
  for(let i=0;i<lines.length;i+=2)parts.push({...page,text:lines.slice(i,i+2).join(' ')});
  return parts;
 });
}

export class BossConversation{
 constructor(){this.close();}
 get active(){return this.pages.length>0;}
 get page(){return this.pages[this.index]??null;}
 open(cast,id=cast,onComplete=null){
  if(!BOSS_DIALOGUES[id])throw new Error('Unknown boss conversation: '+id);
  this.cast=cast;this.id=id;this.pages=paginateBossPages(BOSS_DIALOGUES[id]);this.index=0;this.onComplete=onComplete;
 }
 next(){if(!this.active)return;if(this.index<this.pages.length-1)this.index++;else{const done=this.onComplete;this.close();done?.();}}
 previous(){this.index=Math.max(0,this.index-1);}
 close(){this.pages=[];this.index=0;this.cast=null;this.id=null;this.onComplete=null;}
 snapshot(){return {active:this.active,id:this.id,index:this.index,total:this.pages.length,speaker:this.page?.speaker??null,speakerColor:speakerStyle(this.page?.speaker).color,speakerSide:speakerStyle(this.page?.speaker).side};}
}

// The actor is recreated on retry, so each attempt gets its conversations once.
export function pendingBossConversation(game){
 if(game.phase!=='intro'||game.mode!=='playing')return null;
 const boss=game.enemies.find(e=>e.boss);if(!boss)return null;
 const elapsed=game.introDuration-game.introTimer;
 const beats=game.level===5?[[.59,'menina','menina']]:game.level===4?[[.59,'rost','rost']]:game.level===3?[[.59,'mayrena','mayrena']]:game.level===2?(boss.transforming?[[.6,'martin','martin']]:[[.6,'elisa','elisa']]):game.level===0?[[OFFICE_BOSS_BEATS.encounter,'dimitri','dimitri'],[OFFICE_BOSS_BEATS.splash,'dimitriPresentation','dimitri']]:[[.6,'marixas','marixas']];
 const beat=beats.find(([at,id])=>elapsed>=at&&!boss.conversations?.includes(id));if(!beat)return null;
 (boss.conversations??=[]).push(beat[1]);return {id:beat[1],cast:beat[2],route:game.level===5?'rooftopEncounter':game.level===4?'factoryEncounter':game.level===3?'sewersEncounter':game.level===0?(beat[1]==='dimitriPresentation'?'javiPresentation':'javiEncounter'):game.level===1?'expoEncounter':boss.transforming?'laboratoryFusion':'laboratoryEncounter'};
}

export function drawBossConversation(ctx,assets,conversation){
 const page=conversation.page;if(!page)return;
 drawDialogueCaption(ctx,page,{partner:conversationPartner(conversation.pages,conversation.index)});
}
