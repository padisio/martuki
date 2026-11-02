import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL(process.env.MARTUKI_DIST??'../dist/',import.meta.url);
const {buildMovie,MOVIE_PLAN,captureGame,movieDuration,readMoviePosition,saveMoviePosition,MOVIE_SAVE_KEY,movieChapterTarget}=await import(new URL('movie-data.js',root));
const {CHAPTERS,SEQUENCES}=await import(new URL('story-data.js',root));
const pages=buildMovie();
test('movie includes the complete campaign, summaries and the native jacket scene in order',()=>{
 const sequences=[...new Set(pages.filter(p=>p.movieKind==='story').map(p=>p.sequence))];
 assert.deepEqual(sequences,CHAPTERS.flatMap(c=>c.sequences));
 assert.equal(new Set(pages.map(p=>p.movieId)).size,pages.length);
 assert.equal(pages.filter(p=>p.movieKind==='summary').length,39);
 assert.ok(pages.every(p=>movieDuration(p)>0&&Number.isFinite(movieDuration(p))));
 assert.equal(pages.filter(p=>p.kind==='transition').length,0);
 const jacket=pages.findIndex(p=>p.clip==='jacket');
 assert.equal(pages[jacket-1].sequence,'javiEncounter');assert.equal(pages[jacket+1].sequence,'javiPresentation');
 const bear=MOVIE_PLAN.findIndex(p=>p.summary==='bear');assert.equal(MOVIE_PLAN[bear-1].route,'laboratoryFusion');
 assert.equal(MOVIE_PLAN[bear-2].summary,'boss');
});
test('summaries never reveal future boss identities and each fight follows its presentation',()=>{
 const travel=pages.filter(p=>p.summary==='travel');
 for(const page of travel){assert.doesNotMatch(page.text,/Elisa|Dimitri|Javi|Marix|Mayrena|Rost|Ni\|Na|Martín|muestra\b|fusión/i);const game=captureGame(page);if(page.captureMoment==='blocked-path'){assert.equal(page.level,0);assert.equal(game.enemies[0].state,'waiting');assert.equal(game.phase,'travel');}else assert.equal(game.enemies.some(e=>e.boss),false);}
 const encounters=['javiPresentation','expoEncounter','laboratoryEncounter','sewersEncounter','factoryEncounter','rooftopEncounter'];
 for(let level=0;level<6;level++){
  const at=MOVIE_PLAN.findIndex(p=>p.level===level&&p.summary==='boss');assert.equal(MOVIE_PLAN[at-1].route,encounters[level]);
 }
});
test('captures use valid deterministic game states, including both laboratory phases',()=>{
 for(const page of pages.filter(p=>p.movieKind!=='story')){
  const game=captureGame(page);assert.equal(game.mode,'playing',page.movieId);assert.ok(game.player.hp>0,page.movieId);
  assert.deepEqual(game.player,captureGame(page).player,page.movieId);
  if(page.summary==='boss'||page.summary==='bear'){
   const boss=game.enemies.find(e=>e.boss);assert.ok(boss);assert.ok(boss.hp>0);assert.equal(game.phase,'fight');
   if(page.level===2)assert.equal(boss.bear,page.summary==='bear');
  }
  if(page.clip){assert.equal(game.phase,'intro');assert.deepEqual(game.enemies[0].conversations,['dimitri']);}
 }
});
test('each caption has its own matching moment instead of repeating clustered combat',()=>{
 for(const page of pages.filter(p=>p.movieKind==='summary')){
  const game=captureGame(page);
  if(['arrival','cleared-path'].includes(page.captureMoment))assert.equal(game.enemies.length,0,page.movieId);
  if(page.captureMoment==='arrival')assert.ok(game.player.x<game.arenas[0].trigger);
  if(page.captureMoment==='enemy-entry'){
   assert.ok(game.enemies.length>=3);assert.ok(game.enemies.every(e=>['enter','chase'].includes(e.state)));
   assert.ok(game.enemies.every(e=>Math.abs(e.x-game.player.x)>100),page.movieId);
  }
  if(page.captureMoment==='blocked-path'){
   assert.equal(game.enemies.length,1);assert.equal(game.enemies[0].state,'waiting');
   assert.ok(game.enemies[0].x>game.player.x+150);assert.equal(game.enemies[0].conversations,undefined);
  }
  if(page.captureMoment==='face-off')assert.ok(game.enemies[0].x-game.player.x>=190);
  if(page.captureMoment==='evade')assert.ok(game.player.dodge>0,page.movieId);
  if(page.captureMoment==='counterfire')assert.ok(game.projectiles.some(p=>p.owner==='player'),page.movieId);
  if(page.level===0)assert.doesNotMatch(page.text,/exposición/i);
 }
});
test('movie resume has its own key, rejects corrupt positions and preserves intentional dialogue',()=>{
 const values=new Map([['martuki.session','unchanged']]),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 saveMoviePosition(storage,pages[80]);assert.equal(readMoviePosition(storage,pages),80);assert.equal(values.get('martuki.session'),'unchanged');
 storage.setItem(MOVIE_SAVE_KEY,'{broken');assert.equal(readMoviePosition(storage,pages),0);
 storage.setItem(MOVIE_SAVE_KEY,JSON.stringify({id:'nonexistent'}));assert.equal(readMoviePosition(storage,pages),0);
 assert.ok(pages.some(p=>p.text?.includes('salgar')));
 const marta=pages.find(p=>p.speaker==='Martuki');assert.equal(marta.speaker,SEQUENCES[marta.sequence][marta.page].speaker);
});
test('automatic playback reaches the ending, pauses when hidden and resumes without entering gameplay',async()=>{
 const elements=new Map(),listeners={},values=new Map();let frame;
 function element(id){if(!elements.has(id))elements.set(id,{hidden:['movieEnd','movieRestart'].includes(id),textContent:'',setAttribute(){},getContext:()=>({}),click(){this.onclick?.();}});return elements.get(id);}
 const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const audio=class{constructor(){this.failed=new Set();}start(){}sync(){}stop(){}play(){}resume(){return Promise.resolve();}suspend(){}};
 const document={hidden:false,getElementById:element,createElement:()=>element('capture'),addEventListener:(n,fn)=>listeners[n]=fn,documentElement:{}};
 const env={document,window:{addEventListener:(n,fn)=>listeners[n]=fn,AudioContext:audio},performance:{now:()=>0},location:{search:''},URLSearchParams,requestAnimationFrame:fn=>frame=fn,localStorage:storage,console,buildMovie,movieDuration,readMoviePosition,saveMoviePosition,captureGame,movieChapterTarget,
  MusicDirector:audio,SoundDirector:audio,assetFetch(){},storyMusic:()=>null,storyEffect:()=>null,createGameView:()=>({render(){}}),createStoryView:()=>({render(){}}),loadVisualAssets(){},loadStoryAssets(){},prepareGameAssets:async()=>({assets:{},illustrations:{},complete(){}})};
 const code=readFileSync(new URL('movie.js',root),'utf8').replace(/^import .*;\r?\n/gm,'');
 await runInNewContext(`(async()=>{${code}})()`,env);
 element('movieBegin').click();let now=0;
 for(let i=0;i<100;i++)frame(now+=100);
 const before=element('moviePosition').textContent;document.hidden=true;listeners.visibilitychange();
 for(let i=0;i<100;i++)frame(now+=100);
 assert.equal(element('moviePosition').textContent,before);
 document.hidden=false;listeners.visibilitychange();for(let i=0;i<100;i++)frame(now+=100);
 assert.equal(element('moviePosition').textContent,before,'returning keeps playback paused');
 element('moviePause').click();
 for(let i=0;i<40000&&element('movieEnd').hidden;i++)frame(now+=100);
 assert.equal(element('movieEnd').hidden,false);assert.equal(element('moviePosition').textContent,`${pages.length} / ${pages.length}`);
 assert.equal(values.size,1);assert.ok(values.has(MOVIE_SAVE_KEY));
 element('movieAgain').click();assert.equal(element('moviePosition').textContent,`1 / ${pages.length}`);assert.equal(element('movieEnd').hidden,true);
});

test('chapter navigation starts each chapter before its own reveals and respects both ends',()=>{
 let index=0;const visited=[];
 while(index!==null){visited.push(index);index=movieChapterTarget(pages,index,1);}
 assert.deepEqual(visited.map(i=>pages[i].chapterId),CHAPTERS.map(c=>c.id));
 assert.equal(pages[visited[1]].movieId,'0:travel:0');assert.equal(pages[visited[2]].movieId,'1:travel:0');
 assert.equal(movieChapterTarget(pages,0,-1),null);
 for(let i=visited.length-1;i>0;i--)assert.equal(movieChapterTarget(pages,visited[i]+1,-1),visited[i-1]);
 const splash=pages.find(p=>p.sceneId==='v3-splash-onesimo');
 assert.equal(splash.splash.tag,'LÍDER DE LA UNIÓN SOVIÉTICA');assert.equal(splash.splash.showTag,true);
});
