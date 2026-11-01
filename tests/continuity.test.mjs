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
