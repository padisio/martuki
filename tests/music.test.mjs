import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL(process.env.MARTUKI_DIST??'../dist/',import.meta.url);
const {TRACKS,musicScene}=await import(new URL('music.js',root));
const {storyMusic}=await import(new URL('music-cues.js',root));
const {sequencePages}=await import(new URL('story-data.js',root));

test('all 17 active cues have both real audio formats and the approved title is unchanged',()=>{
 assert.equal(Object.keys(TRACKS).length,17);
 for(const [key,t] of Object.entries(TRACKS))for(const url of t.urls){
  assert.ok(fs.statSync(new URL(url,root)).size>5000,key+': '+url);
  if(key!=='title')assert.match(url,/music-campaign-v[67]\//);
 }
 const expected=['00f9f07000ce6c8038ef0df9b16fa4f923cad6fb81ed8995b74074ec26533123','3c4fd80d04ee95ae7fbd333f21f6e363dec6f26bb738f244417e5da320caa95b'];
 TRACKS.title.urls.forEach((url,i)=>assert.equal(createHash('sha256').update(fs.readFileSync(new URL(url,root))).digest('hex'),expected[i]));
 assert.equal(TRACKS.finalBoss.bpm,124);
});

test('Mayrena, Marixas, the bear and Rosi/David remain threatening after transformation',()=>{
 for(const [id,scene] of [['sewersEncounter','25c-beben-probetas'],['exhibition','12-maria-bebe'],['laboratoryFusion','18-elisa-en-el-suelo'],['factoryEncounter','32a-mano-rosi']]){
  const pages=sequencePages([id]),first=pages.findIndex(p=>p.sceneId===scene);assert.ok(first>=0);
  for(let index=first;index<pages.length;index++)assert.equal(storyMusic({pages,index,page:pages[index]}),'transformation',id+': '+pages[index].sceneId);
 }
 const pages=sequencePages(['sewersEncounter']),first=pages.findIndex(p=>p.sceneId==='25c-beben-probetas');
 assert.equal(storyMusic({pages,index:first-1,page:pages[first-1]}),'radio');
});

test('giant Menina, regeneration and Josep climax retain danger; helicopter departure has action',()=>{
 const pages=sequencePages(['rooftopEncounter']),first=pages.findIndex(p=>p.sceneId==='48-crece');assert.ok(first>=0);
 for(let index=first;index<pages.length;index++)assert.equal(storyMusic({pages,index,page:pages[index]}),'catastrophe');
 const after=sequencePages(['rooftopAftermath']);
 after.forEach((page,index)=>assert.equal(storyMusic({pages:after,index,page}),'catastrophe'));
 assert.equal(musicScene({mode:'playing',level:5,stage:3,phase:'fight'}),'finalBoss');
 assert.equal(musicScene({mode:'playing',level:5,stage:3,phase:'bossdown'}),'catastrophe');
 const ep=sequencePages(['epilogue']);assert.equal(storyMusic({pages:ep,index:0,page:ep[0]}),'escape');
});

test('level cues are continuous between waves and combat dialogue cannot restore comedy',()=>{
 for(let level=0;level<6;level++){
  const game={mode:'playing',level,stage:0,phase:'travel'},cue=musicScene(game);
  for(const phase of ['fight','clearing','playerdown','travel'])assert.equal(musicScene({...game,phase}),cue);
  assert.equal(musicScene({...game,stage:3,phase:'fight'},{conversation:{active:true}}),level===5?'finalBoss':'boss');
 }
});
