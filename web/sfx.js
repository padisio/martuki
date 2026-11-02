const files=(...names)=>names;
export const SFX={
 swing:{files:files('swing-1','swing-2','swing-3'),gain:.24,gap:.09},
 enemySwing:{files:files('swing-2','swing-3'),gain:.17,gap:.15},
 hit:{files:files('punch-1','punch-2','punch-3'),gain:.54,gap:.055,priority:2},
 hurt:{files:files('punch-2','impact-heavy'),gain:.48,gap:.16,priority:3},
 slash:{files:files('cutter-1','cutter-2','cutter-3'),gain:.4,gap:.10},
 dodge:{files:files('dash'),gain:.37,gap:.22},
 perfectDodge:{files:files('metal'),gain:.22,gap:.25},
 shoot:{files:files('shot'),gain:.34,gap:.065},
 empty:{files:files('empty'),gain:.24,gap:.35},
 down:{files:files('impact-heavy'),gain:.38,gap:.16,priority:2},
 finisher:{files:files('impact-heavy'),gain:.57,gap:.12,priority:2},
 counter:{files:files('impact-heavy'),gain:.52,gap:.12,priority:2},
 slap:{files:files('punch-3','impact-heavy'),gain:.44,gap:.13},
 slip:{files:files('cloth'),gain:.3,gap:.3},
 papers:{files:files('cloth'),gain:.28,gap:.18},
 drink:{files:files('drink'),gain:.36,gap:.6},
 pickup:{files:files('pickup'),gain:.3,gap:.16},
 clear:{files:files('metal'),gain:.2,gap:1},
 bossDown:{files:files('collapse'),gain:.4,gap:1,priority:3},
 // Wave starts get a small cue; the siren belongs to an actual story alarm.
 alarm:{files:files('metal'),gain:.16,gap:1.4},
 storyAlarm:{files:files('alarm'),gain:.38,gap:1.8,priority:3},
 bossTell:{files:files('cloth'),gain:.2,gap:.65},
 bearRumble:{files:files('roar'),gain:.56,gap:1.8,priority:3},
 growl:{files:files('growl'),gain:.3,gap:1.3,priority:2},
 fusion:{files:files('transformation'),gain:.45,gap:1.6,priority:3},
 collapse:{files:files('collapse'),gain:.48,gap:1.5,priority:3},
 nameCross:{files:files('cutter-2'),gain:.2,gap:.4},
 nameDrop:{files:files('impact-heavy'),gain:.4,gap:.6,priority:2},
 bofeNameCross:{files:files('cutter-2'),gain:.2,gap:.4},
 bofeJoin:{files:files('metal'),gain:.28,gap:1},
 bofeSummon:{files:files('dash'),gain:.36,gap:1},
 bofeImpact:{files:files('impact-heavy'),gain:.5,gap:.3,priority:2},
 special:{files:files('metal'),gain:.34,gap:1},
 thunder:{files:files('collapse'),gain:.18,gap:7,rate:.7},
 'access-authorized':{files:files('pickup'),gain:.3,gap:.5,rate:1.25}
};

export function storyEffect(page){
 if(!page)return null;
 const cues={factoryAftermath:{'44-alarma':'storyAlarm'},rooftopEncounter:{'48-crece':'fusion','v2-48b-rugido':'bearRumble'},rooftopAftermath:{'54-regenera':'fusion','72-colapso':'collapse','v2-80a-explosion':'collapse'},sewersEncounter:{'25c-beben-probetas':'drink'}};
 return page.soundCue??cues[page.sequence]?.[page.sceneId]??null;
}

export class SoundDirector{
 constructor(fetcher=(...args)=>fetch(...args)){
  this.fetcher=fetcher;this.context=null;this.buffers=new Map();this.voices=[];this.last=new Map();this.variants=new Map();this.enabled=true;this.paused=false;this.epoch=0;this.failed=new Set();
 }
 start(context){
  if(this.context)return this.ready;this.context=context;
  this.bus=context.createGain();this.bus.gain.value=.72;
  this.compressor=context.createDynamicsCompressor();
  Object.assign(this.compressor.threshold,{value:-12});this.compressor.knee.value=12;this.compressor.ratio.value=6;this.compressor.attack.value=.003;this.compressor.release.value=.12;
  this.bus.connect(this.compressor);this.compressor.connect(context.destination);
  // <600 KB encoded, cached on disk by assetFetch. Decode only once per visit.
  return this.ready=Promise.allSettled([...new Set(Object.values(SFX).flatMap(c=>c.files))].map(id=>this.load(id)));
 }
 async load(id){
  if(!this.buffers.has(id))this.buffers.set(id,(async()=>{
   const r=await this.fetcher(`assets/sfx-v1/${id}.wav`);if(!r.ok)throw Error(id);
   const buffer=await this.context.decodeAudioData(await r.arrayBuffer());this.failed.delete(id);return buffer;
  })().catch(error=>{this.failed.add(id);this.buffers.delete(id);throw error;}));
  return this.buffers.get(id);
 }
 stop(){
  this.epoch++;
  for(const voice of this.voices){try{voice.source.stop();}catch{}}
  this.voices=[];this.last.clear();
 }
 sync({enabled=true,paused=false}={}){
  if((!enabled||paused)&&(this.enabled&&!this.paused))this.stop();
  this.enabled=enabled;this.paused=paused;
 }
 async play(type,{narrative=false}={}){
  const cue=SFX[type],c=this.context;
  if(!cue||!c||c.state!=='running'||!this.enabled||this.paused)return false;
  const now=c.currentTime,epoch=this.epoch;
  if(now-(this.last.get(type)??-Infinity)<cue.gap)return false;
  this.last.set(type,now);
  const index=this.variants.get(type)??0;this.variants.set(type,index+1);
  let buffer;try{buffer=await this.load(cue.files[index%cue.files.length]);}catch{return false;}
  // A late download must never play a punch after its action or after pause.
  if(epoch!==this.epoch||!this.enabled||this.paused||c.state!=='running'||c.currentTime-now>(narrative?.8:.15))return false;
  const priority=cue.priority??1;
  const same=this.voices.filter(v=>v.type===type);
  if(same.length>=2){same[0].source.stop();this.voices=this.voices.filter(v=>v!==same[0]);}
  if(this.voices.length>=6){
   const quietest=this.voices.reduce((a,b)=>a.priority<=b.priority?a:b);
   if(quietest.priority>priority)return false;
   quietest.source.stop();this.voices=this.voices.filter(v=>v!==quietest);
  }
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;
  source.playbackRate.value=cue.rate??(narrative?1:.98+(index%3)*.02);
  gain.gain.value=cue.gain*(narrative?.88:1);source.connect(gain);gain.connect(this.bus);
  const voice={source,gain,type,priority};this.voices.push(voice);
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices=this.voices.filter(v=>v!==voice);};
  source.start();return true;
 }
 snapshot(){return {voices:this.voices.length,cached:this.buffers.size,failed:[...this.failed]};}
}
