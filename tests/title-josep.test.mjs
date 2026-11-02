import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL(process.env.MARTUKI_DIST??'../dist/',import.meta.url);
const {TRACKS,MusicDirector}=await import(new URL('music.js',root));
const {storyMusic}=await import(new URL('music-cues.js',root));
const {sequencePages}=await import(new URL('story-data.js',root));
const {buildMovie}=await import(new URL('movie-data.js',root));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('title and Josep match the packaged recordings and retain their original tempos',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('assets/music-title-josep-v1/manifest.json',root)));
 assert.equal(TRACKS.title.bpm,84);assert.equal(TRACKS.josep.bpm,80);
 assert.equal(TRACKS.title.seconds,102.85715625);assert.equal(TRACKS.josep.seconds,98.5);
 for(const file of manifest.files){const bytes=fs.readFileSync(new URL('assets/music-title-josep-v1/'+file.file,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);assert.equal(bytes.length,file.bytes);}
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL(TRACKS.title.urls[1],root))).digest('hex'),'3bda2fb977dc5ba1425fb8e7a57c78676e9d118d847df7fcf97d6e194c00456f');
 assert.equal(TRACKS.josep.loopStart,36);assert.equal(TRACKS.josep.loopEnd,96);
});
test('both game and movie start Josep exactly at the fall and retain it until Moscow, including rewind',()=>{
 for(const pages of [sequencePages(['rooftopAftermath','epilogue']),buildMovie()]){
  const fall=pages.findIndex(p=>p.sceneId==='v2-81b-cae-josep'),moscow=pages.findIndex(p=>p.sceneId==='01-moscu');assert.ok(fall>0&&moscow>fall);
  assert.equal(storyMusic({pages,index:fall-1,page:pages[fall-1]}),'catastrophe');
  for(let index=fall;index<moscow;index++)assert.equal(storyMusic({pages,index,page:pages[index]}),'josep',pages[index].sceneId);
  assert.equal(storyMusic({pages,index:moscow,page:pages[moscow]}),'russia');
  assert.equal(storyMusic({pages,index:moscow-1,page:pages[moscow-1]}),'josep');
 }
});
test('long reading loops the development without repeating the fall; pause retains playhead',async()=>{
 const parameter=()=>({value:0,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}});
 const c={currentTime:0,destination:{},createGain:()=>({gain:parameter(),connect(){},disconnect(){}}),createBufferSource:()=>({connect(){},disconnect(){},start(t,offset){this.offset=offset;},stop(){}}),decodeAudioData:async()=>({duration:120})};
 const requests=[],m=new MusicDirector(async url=>{requests.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};});m.start(c);
 m.sync('catastrophe');await flush();assert.ok(requests.some(url=>url.includes('/josep.')),'preload before the fall');
 m.sync('josep');await flush();const source=m.current.source;assert.equal(source.offset,0);assert.equal(source.loopStart,36);assert.equal(source.loopEnd,96);
 for(let i=0;i<40;i++)m.sync('josep');assert.equal(m.current.source,source);
 c.currentTime=108;assert.equal(m.snapshot().position,48);m.sync('josep',{paused:true});assert.equal(m.position,48);
 c.currentTime=200;m.sync('josep');await flush();assert.equal(m.current.source.offset,48);
 m.sync('russia');await flush();assert.equal(m.current.scene,'russia');
});
