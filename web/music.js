import {TRACKS} from './music-tracks.js?v=campaign-7';
import {storyMusic} from './music-cues.js?v=campaign-7';
export {TRACKS};
const LEVEL_MUSIC=['office','exhibition','laboratory','sewers','factory','rooftop'];
export function musicOptions(story,conversation){
 return {duck:!!(story?.active||conversation?.active),radioNear:story?.page?.sceneId!=='05a-marta-escucha'};
}
export function musicScene(game,{story=null,conversation=null}={}){
 if(story?.active)return storyMusic(story);
 if(game.mode==='attract')return 'title';
 if(game.mode==='won')return 'epilogue';
 if(game.mode!=='playing')return null;
 if(game.phase==='bossdown')return game.level===5?'catastrophe':'boss';
 if(game.phase==='escape')return game.level===5?'catastrophe':'escape';
 if(game.stage===3&&game.phase!=='travel'){
  if(game.phase==='intro'){
   const boss=game.enemies?.find(e=>e.boss);
   if(boss?.transforming||boss?.bear)return 'transformation';
   // The illustrated threat can end before the in-game entrance does (Javi's
   // jacket). Keep its final cue across that bridge, including restored saves.
   const encounter=['dimitri','marixas','elisa','mayrena','rost','menina'][game.level];
   if(boss?.conversations?.includes(encounter))return ['boss','transformation','boss','transformation','transformation','catastrophe'][game.level];
   return LEVEL_MUSIC[game.level??0]??'office';
  }
  if(game.level===5)return 'finalBoss';
  return 'boss';
 }
 // Travel, waves, clearing and recovery all share the uninterrupted level cue.
 return LEVEL_MUSIC[game.level??0]??'office';
}

// Independent effects/music buses. Keep the outgoing cue until decoding the
// next one finishes; stale requests cannot replace a newer scene.
export class MusicDirector{
 constructor(fetcher=(...args)=>fetch(...args)){
  this.fetcher=fetcher;this.context=null;this.bus=null;this.cache=new Map();
  this.scene=null;this.current=null;this.position=0;this.paused=false;
  this.enabled=true;this.duck=false;this.revision=0;this.failed=new Set();
  this.positions=new Map();
 }
 unlock(context){
  if(this.context)return;
  this.context=context;this.bus=context.createGain();this.bus.gain.value=0;
  this.bus.connect(context.destination);
 }
 async load(scene){
  if(this.cache.has(scene)){
   const promise=this.cache.get(scene);this.cache.delete(scene);this.cache.set(scene,promise);return promise;
  }
  const promise=(async()=>{
   for(const url of TRACKS[scene].urls){
    try{const response=await this.fetcher(url);if(!response.ok)continue;
     return await this.context.decodeAudioData(await response.arrayBuffer());
    }catch{/* MP3 fallback for browsers without Ogg decoding. */}
   }
   throw new Error('Music track could not be decoded: '+scene);
  })();
  this.cache.set(scene,promise);
  // Bound decoded music memory on mobile instead of retaining the soundtrack.
  while(this.cache.size>3)this.cache.delete(this.cache.keys().next().value);
  try{return await promise;}catch(error){if(this.cache.get(scene)===promise)this.cache.delete(scene);throw error;}
 }
 gain(value,seconds=.14){
  if(!this.bus)return;
  const t=this.context.currentTime,g=this.bus.gain;
  g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(value,t+seconds);
 }
 playhead(old){
  let position=old.offset+Math.max(0,this.context.currentTime-old.started);
  const track=TRACKS[old.scene],start=track.loopStart??0,end=track.loopEnd??old.duration;
  if(track.loop&&position>=end)position=start+(position-start)%(end-start);
  return Math.min(position,old.duration);
 }
 retire(keepPosition=false,fade=.65){
  const old=this.current;if(!old)return;
  const position=this.playhead(old);this.positions.set(old.scene,position);
  if(keepPosition&&old.scene===this.scene)this.position=position;
  const t=this.context.currentTime,g=old.gain.gain;
  g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0,t+fade);
  old.source.stop(t+fade+.01);this.current=null;
 }
 async begin(scene,revision){
  try{
   const buffer=await this.load(scene);
   if(revision!==this.revision||this.scene!==scene||this.paused||!this.enabled)return;
   const track=TRACKS[scene],duration=Math.min(track.seconds,buffer.duration);
   if(!track.loop&&this.position>=duration)return;
   const c=this.context,source=c.createBufferSource(),gain=c.createGain();
   source.buffer=buffer;source.loop=track.loop;source.loopStart=track.loopStart??0;source.loopEnd=track.loopEnd??duration;
   const offset=track.loop?this.position%duration:this.position;
   this.retire(false,.65);
   const started=c.currentTime;
   gain.gain.setValueAtTime(0,c.currentTime);gain.gain.linearRampToValueAtTime(1,started+.65);
   source.connect(gain);gain.connect(this.bus);
   const playing={source,gain,scene,started,offset,duration};this.current=playing;
   source.onended=()=>{source.disconnect();gain.disconnect();
    if(this.current===playing){this.position=duration;this.current=null;}
   };
   source.start(started,offset);this.failed.delete(scene);
   // Predict just one next cue; the decoded cache contains at most three.
   const next=scene==='title'?'intro':scene==='rooftop'?'finalBoss':
    scene==='radio'||scene==='comedy'?'transformation':LEVEL_MUSIC.includes(scene)?'boss':
    scene==='finalBoss'?'catastrophe':scene==='transformation'?'boss':null;
   if(next&&revision===this.revision)this.load(next).catch(()=>{});
  }catch(err){this.failed.add(scene);console.warn('Música no disponible; los efectos siguen activos.',err);}
 }
 sync(scene,{paused=false,enabled=true,duck=false,radioNear=true}={}){
  if(scene&&!TRACKS[scene])throw new Error('Unknown music scene: '+scene);
  const changed=scene!==this.scene,blocked=paused||!enabled,wasBlocked=this.paused||!this.enabled;
  if(changed){
   this.revision++;
   // The radio stops at its source; other narrative changes crossfade.
   if(!scene||blocked||this.scene==='radio')this.retire(false,.06);
   this.scene=scene;this.position=this.current?.scene===scene?this.playhead(this.current):TRACKS[scene]?.resume?(this.positions.get(scene)??0):0;
  }
  else if(blocked&&!wasBlocked){this.revision++;this.retire(true,.045);}
  this.paused=paused;this.enabled=enabled;this.duck=duck;
  if(this.context){
   if(changed||blocked!==wasBlocked||this.lastDuck!==duck||this.radioNear!==radioNear||this.justUnlocked){
    this.gain(blocked?0:(duck?.38:scene==='title'?.50:.56)*(scene==='radio'&&!radioNear?.4:1),.6);this.lastDuck=duck;this.radioNear=radioNear;
   }
   if(scene&&!blocked&&(changed||wasBlocked||this.justUnlocked)){
    this.justUnlocked=false;this.begin(scene,++this.revision);
   }
  }
 }
 start(context){if(!this.context){this.unlock(context);this.justUnlocked=true;}}
 restart(){this.revision++;this.retire(false,.04);this.positions.clear();this.scene=null;this.position=0;}
 snapshot(){return {scene:this.scene,playing:this.current?.scene??null,position:this.current?this.playhead(this.current):this.position,enabled:this.enabled,paused:this.paused,duck:this.duck,cached:this.cache.size,failed:[...this.failed]};}
}
