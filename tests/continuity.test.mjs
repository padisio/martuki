import test from 'node:test';
import assert from 'node:assert/strict';
const root=new URL(process.env.MARTUKI_DIST??'../dist/',import.meta.url);
const {Game}=await import(new URL('core.js',root));
const {StoryPlayer}=await import(new URL('story.js',root));
const {BossConversation}=await import(new URL('boss-dialogue.js',root));
const {captureSession,readSession,writeSession,restoreGame,SAVE_KEY}=await import(new URL('save-state.js',root));
const {createAssetFetch}=await import(new URL('asset-cache.js',root));
const memory=()=>{const m=new Map();return {getItem:key=>m.get(key)??null,setItem:(key,value)=>m.set(key,value)};};

test('a discarded session restores the exact battle, not the beginning of a level',()=>{
 const original=new Game(()=>.5);original.reset(0,3);original.spawnStage();
 for(let i=0;i<100;i++)original.update(1/60,{right:true,shoot:true});
 original.player.hp=67;original.score=750;original.enemies[0].hp=12;
 const store=memory(),saved=captureSession(original,new StoryPlayer(),new BossConversation(),{paused:true});
 assert.equal(writeSession(store,saved),true);
 const restored=new Game(()=>.5);assert.equal(restoreGame(restored,readSession(store)),true);
 assert.deepEqual(restored.snapshot(),original.snapshot());assert.deepEqual(restored.enemies,original.enemies);
 original.events=[];
 for(let i=0;i<30;i++){original.update(1/60,{});restored.update(1/60,{});}
 assert.deepEqual(restored.snapshot(),original.snapshot());assert.deepEqual(restored.enemies,original.enemies);
});
test('cinematics retain the exact page and continuation route',()=>{
 const game=new Game(),story=new StoryPlayer();story.route('laboratoryEncounter',{origin:'encounter'});story.next();story.next();
 const saved=captureSession(game,story,new BossConversation(),{}),store=memory();writeSession(store,saved);
 const result=readSession(store);
 assert.equal(result.story.index,story.index);assert.equal(result.story.routeId,'laboratoryEncounter');assert.equal(result.story.origin,'encounter');assert.deepEqual(result.story.pages[story.index],story.page);
});
test('title screens cannot overwrite a useful save; corrupt/blocked storage is harmless',()=>{
 assert.equal(captureSession(new Game(),new StoryPlayer(),new BossConversation()),null);
 const store=memory();store.setItem(SAVE_KEY,'not json');assert.equal(readSession(store),null);
 store.setItem(SAVE_KEY,JSON.stringify({version:99}));assert.equal(readSession(store),null);
 const blocked={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};
 assert.equal(readSession(blocked),null);assert.equal(writeSession(blocked,{}),false);
});
const base='https://example.test/martuki/';
function disk(){const entries=new Map();return {entries,storage:{open:async()=>({match:async url=>entries.get(url)?.clone(),put:async(url,response)=>{entries.set(url,new Response(await response.arrayBuffer(),{status:response.status,headers:response.headers}));}})}};}
test('images and music survive a new loader instance without another network request',async()=>{
 const d=disk();let requests=0;const fetcher=async()=>{requests++;return new Response('asset data',{headers:{'content-type':'application/octet-stream'}});};
 const options={storage:d.storage,fetcher,baseURL:base,local:()=>false};
 const first=createAssetFetch(options);
 for(const url of ['assets/picture.png','assets/music/song.ogg'])assert.equal(await(await first(url)).text(),'asset data');
 await first.flush();assert.equal(requests,2);
 const next=createAssetFetch(options);
 for(const url of ['assets/picture.png','assets/music/song.ogg']){const response=await next(url);assert.equal(response.headers.get('X-Martuki-Cache'),'disk');assert.equal(await response.text(),'asset data');}
 assert.equal(requests,2);
});
test('cache misses and failures remain recoverable without caching HTML or failed responses',async()=>{
 const d=disk();let requests=0;const fetcher=async()=>{requests++;return new Response('missing',{status:404});};
 const cached=createAssetFetch({storage:d.storage,fetcher,baseURL:base,local:()=>false});
 await cached('assets/missing.png');await cached('game.js');await cached('assets/missing.png');await cached.flush();
 assert.equal(requests,3);assert.equal(d.entries.size,0);
 const fallback=createAssetFetch({storage:{open:async()=>{throw Error('unavailable');}},fetcher:async()=>new Response('ok'),baseURL:base,local:()=>false});
 assert.equal(await(await fallback('assets/file.png')).text(),'ok');
});
test('storage quota does not interrupt loading or repeatedly attempt writes',async()=>{
 let writes=0;const cache=createAssetFetch({storage:{open:async()=>({match:async()=>null,put:async()=>{writes++;throw Error('quota');}})},fetcher:async()=>new Response('ok'),baseURL:base,local:()=>false});
 assert.equal(await(await cache('assets/one.png')).text(),'ok');await cache.flush();
 assert.equal(await(await cache('assets/two.png')).text(),'ok');await cache.flush();assert.equal(writes,1);
});


const {pendingBossConversation}=await import(new URL('boss-dialogue.js',root));
const finishes=['finishOfficeCinematic','finishExhibitionEncounter','finishLaboratoryCinematic','finishSewerCinematic','finishFactoryCinematic','finishRooftopCinematic'];
function defeat(g){g.player.invuln=0;g.hurtPlayer(999,1);for(let i=0;i<25;i++)g.update(.05,{});assert.equal(g.mode,'lost');}
for(let level=0;level<6;level++)test(`boss ${level+1}: death retries the fight without its film, at full health`,()=>{
 const g=new Game(()=>.5);g.reset(3,level);g.score=500;g.kills=8;g.spawnStage();g[finishes[level]]();
 g.player.ammo=0;g.player.specialCD=8;g.bofeCooldown=20;g.score=900;defeat(g);
 g.retryStage();
 assert.equal(g.mode,'playing');assert.equal(g.phase,'fight');assert.equal(g.introTimer,0);assert.equal(pendingBossConversation(g),null);
 assert.equal(g.player.hp,g.player.maxHp);assert.ok(g.player.ammo>0);assert.equal(g.player.specialCD,0);assert.equal(g.bofeCooldown,0);
 assert.equal(g.score,500);assert.equal(g.kills,8);assert.equal(g.enemies[0].hp,g.enemies[0].maxHp);assert.equal(g.enemies[0].state,'chase');
 assert.ok(g.player.x>=g.arenas[3].left&&g.player.x<=g.arenas[3].right);
 if(level===1)assert.equal(g.bofeUnlocked,true);
 if(level===4)assert.equal(g.factoryFire,true);
 if(level===5)assert.equal(g.rooftopWreck,true);
 defeat(g);g.retryStage();assert.equal(g.phase,'fight');assert.equal(pendingBossConversation(g),null);
});
test('a saved boss defeat still skips the film, while a new chapter retains it',()=>{
 const g=new Game();g.reset(3,3);g.spawnStage();g.finishSewerCinematic();defeat(g);
 const restored=new Game();restoreGame(restored,captureSession(g,new StoryPlayer(),new BossConversation()));
 restored.retryStage();assert.equal(restored.phase,'fight');assert.equal(pendingBossConversation(restored),null);
 restored.reset(3,3);restored.spawnStage();for(let i=0;i<15;i++)restored.update(.05,{});
 assert.equal(pendingBossConversation(restored).route,'sewersEncounter');
 g.reset(1,3);g.spawnStage();defeat(g);g.retryStage();assert.equal(g.phase,'travel');assert.equal(g.enemies.length,0);
});
test('laboratory retries skip only a transformation that was already seen, including after saving',()=>{
 const g=new Game();g.reset(3,2);g.spawnStage();g.finishLaboratoryCinematic();defeat(g);g.retryStage();
 g.hurtEnemy(g.enemies[0],999);assert.equal(g.phase,'intro');g.update(.05,{});g.introTimer=g.introDuration-.7;
 assert.equal(pendingBossConversation(g).route,'laboratoryFusion');g.finishLaboratoryCinematic();defeat(g);
 const restored=new Game();restoreGame(restored,captureSession(g,new StoryPlayer(),new BossConversation()));restored.retryStage();
 assert.equal(restored.enemies[0].bear,false);assert.equal(restored.enemies[0].hp,240);
 // Dying in the first phase again must not forget the previously seen transformation.
 defeat(restored);restored.retryStage();restored.hurtEnemy(restored.enemies[0],999);
 assert.equal(restored.phase,'fight');assert.equal(restored.enemies[0].bear,true);assert.equal(restored.enemies[0].hp,480);assert.equal(pendingBossConversation(restored),null);
 restored.reset(3,2);assert.equal(restored.laboratoryFusionSeen,false);
});
