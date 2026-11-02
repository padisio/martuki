import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL(process.env.MARTUKI_DIST??'../dist/',import.meta.url);
const {SFX,SoundDirector,storyEffect}=await import(new URL('sfx.js',root));
function context(){
 const param=()=>({value:0});const node=()=>({connect(){},disconnect(){},gain:param()});
 return {currentTime:0,state:'running',destination:{},decodeAudioData:async()=>({duration:.3}),createGain:node,createDynamicsCompressor:()=>({...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()}),createBufferSource:()=>({...node(),playbackRate:param(),start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}})};
}
test('every effect has a verified short recording, with headroom and a small total download',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('assets/sfx-v1/manifest.json',root)));
 const ids=new Set(manifest.map(r=>r.id));
 assert.ok(manifest.reduce((n,r)=>n+r.bytes,0)<700000);
 for(const cue of Object.values(SFX)){assert.ok(cue.gain<=.6&&cue.gap>=.05);for(const id of cue.files)assert.ok(ids.has(id),id);}
 for(const r of manifest){const bytes=fs.readFileSync(new URL('assets/sfx-v1/'+r.id+'.wav',root));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);assert.ok(r.peak<=.65);assert.ok(r.seconds<=2.5);}
});
test('rapid attacks have bounded overlap; pause and mute stop all voices',async()=>{
 const c=context(),d=new SoundDirector(async()=>new Response(new ArrayBuffer(8)));await d.start(c);
 for(let i=0;i<20;i++){c.currentTime+=.08;await d.play('shoot');assert.ok(d.voices.length<=2);}
 for(const type of ['hit','swing','slash','dodge','bearRumble','fusion','collapse']){c.currentTime+=.2;await d.play(type);assert.ok(d.voices.length<=6);}
 const voices=[...d.voices];d.sync({paused:true});assert.equal(d.voices.length,0);assert.ok(voices.every(v=>v.source.stopped));assert.equal(await d.play('hit'),false);
 d.sync({paused:false});c.currentTime+=1;assert.equal(await d.play('hit'),true);d.sync({enabled:false});assert.equal(d.voices.length,0);
});
test('late loading never queues a hit after its action or after a pause',async()=>{
 let resolve;const gate=new Promise(r=>resolve=r),c=context(),d=new SoundDirector(async()=>{await gate;return new Response(new ArrayBuffer(8));});d.start(c);
 const hit=d.play('hit');c.currentTime=.3;resolve();assert.equal(await hit,false);await d.ready;assert.equal(d.voices.length,0);
 c.currentTime=1;const next=d.play('hit');d.sync({paused:true});assert.equal(await next,false);
});
test('narrative sirens and roars match their actual shots, with explicit cues preserved',()=>{
 assert.equal(storyEffect({sequence:'factoryAftermath',sceneId:'44-alarma'}),'storyAlarm');
 assert.equal(storyEffect({sequence:'rooftopEncounter',sceneId:'v2-48b-rugido'}),'bearRumble');
 assert.equal(storyEffect({sequence:'rooftopAftermath',sceneId:'72-colapso'}),'collapse');
 assert.equal(storyEffect({sequence:'intro',sceneId:'hello'}),null);
 assert.equal(storyEffect({soundCue:'drink'}),'drink');
});
