import test from 'node:test';
import assert from 'node:assert/strict';
const root=new URL(process.env.MARTUKI_DIST??'../dist/',import.meta.url);
const {Game}=await import(new URL('core.js',root));
const {captionLayout,speakerStyle}=await import(new URL('dialogue-style.js',root));
const {StoryPlayer}=await import(new URL('story.js',root));
const {SEQUENCES}=await import(new URL('story-data.js',root));
const {combatCharacters}=await import(new URL('combat-art.js',root));

test('all six levels and wave entrances omit objectives and premature boss reveals',()=>{
 for(let level=0;level<6;level++)for(let stage=0;stage<4;stage++){
  const game=new Game(()=>.5);game.reset(stage,level);assert.equal(game.banner,null);
  game.spawnStage();assert.equal(game.banner,null);
 }
});
test('pickup feedback stays short and preserves real health/ammunition changes',()=>{
 const g=new Game();g.reset();g.player.hp=60;
 for(const [kind,text] of [['coffee','+ VIDA'],['ammo','+ MUNICIÓN'],['smg','METRALLETA']]){
  g.drop(kind,g.player.x,g.player.y);g.pickup();assert.equal(g.banner.text,text);assert.equal(g.banner.sub,'');
 }
 assert.equal(g.player.hp,98);assert.equal(g.player.ammo,150);assert.equal(g.player.weapon,'smg');
 g.special();assert.equal(g.banner,null);
});
test('clearing a wave retains only the forward cue',()=>{
 const g=new Game(()=>.5);g.reset();g.spawnStage();g.clearStage();
 assert.equal(g.phase,'travel');assert.equal(g.banner.text,'CONTINÚA →');assert.equal(g.banner.sub,'');
});
test('every caption fits the full canvas with its speaker color intact',()=>{
 for(const id of Object.keys(SEQUENCES)){
  const player=new StoryPlayer();player.open([id]);
  for(const page of player.pages){
   if(['silent','screen','system','splash','gameplay'].includes(page.kind))continue;
   const layout=captionLayout(page);
   assert.ok(layout.top>=195,page.text);
   assert.ok(layout.top+layout.offset+(layout.lines.length-1)*14+10.5<=262,page.text);
   assert.ok(speakerStyle(page.speaker).color);
  }
 }
 const short=captionLayout({speaker:'Martuki',text:'Vamos.'});
 assert.ok(short.top>210,'Short dialogue should free more space for artwork');
});
test('fallen blonde fits an adult body length and keeps an unchanged atlas and pivot',()=>{
 const data=combatCharacters.spitter,down=data.frames[data.clips.down[0]],idle=data.frames[data.clips.idle[0]];
 const worldWidth=down.sw*(down.renderScale??1)/data.pixelRatio*4/3;
 assert.ok(worldWidth>80&&worldWidth<100,'Corpse should be near the 96px adult reference, not 133px');
 assert.equal(down.pivotY,down.sh);assert.equal(idle.renderScale,undefined);
});
