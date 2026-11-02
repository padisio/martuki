import {StoryPlayer} from './story.js?v=onesimo-1';
import {CHAPTERS} from './story-data.js?v=onesimo-1';
import {Game,OFFICE_BOSS_BEATS} from './core.js?v=armed-scale-1';

// Only describe the action already reached. Boss names belong after their reveal.
const passages=[
 ['Marta avanza por el departamento de diseño.','Sus compañeros salen a su encuentro e intentan detenerla.','Hasta que una figura misteriosa le corta el paso.'],
 ['Marta entra en la exposición.','Otros empleados salen a su encuentro entre los expositores.','Tras abrirse paso, continúa por la sala.'],
 ['Marta se adentra en el laboratorio.','Los ocupantes del laboratorio salen a detenerla.','Tras superar a sus atacantes, continúa entre los puestos de trabajo.'],
 ['Marta comienza a recorrer las alcantarillas.','Los infectados salen a su encuentro en el túnel.','Marta se abre paso y continúa por el conducto.'],
 ['Marta se adentra en la fábrica.','Los guardias aparecen entre las máquinas y le cierran el paso.','Tras superar la resistencia, continúa por la nave.'],
 ['Marta sale a la azotea.','Los guardias aparecen en la cubierta e intentan detenerla.','Marta se abre paso y continúa por la azotea.']
];
const fights=[
 ['Marta se enfrenta a Dimitri Tontotsky.','Se aparta para esquivar sus ataques.','Encuentra una abertura y responde con sus disparos.'],
 ['Marta se enfrenta a Marixásmin Matatodosk.','Se aparta de sus ataques y busca espacio.','Responde con sus disparos y mantiene a su rival a distancia.'],
 ['Marta se enfrenta a Elisa Martón.','Se aparta para evitar sus ataques.','Responde a Elisa con una ráfaga.'],
 ['Marta se enfrenta a Mayrena Disenyostka.','Esquiva sus ataques en el túnel.','Encuentra espacio para responder con sus disparos.'],
 ['Marta se enfrenta a Rost-Vidf Rubiñoz Rubiñoz.','Se aparta de sus ataques entre las máquinas.','Responde con una ráfaga desde la distancia.'],
 ['Marta se enfrenta a Me|Ni|Na.','Se aparta de los ataques de su enorme adversario.','Busca una abertura y responde con sus disparos.']
];
const bearFight=['Marta se enfrenta a Elisa y el Oso Martín.','Se aparta de los ataques de su enorme adversario.','Responde con una ráfaga desde la distancia.'];
const stageMusic=['office','exhibition','laboratory','sewers','factory','rooftop'];
export const MOVIE_PLAN=[
 {route:'intro'}, {summary:'travel',level:0}, {route:'javiEncounter'},
 {clip:'jacket',level:0}, {route:'javiPresentation'}, {summary:'boss',level:0}, {route:'officeExit'},
 {summary:'travel',level:1}, {route:'expoEncounter'}, {summary:'boss',level:1}, {route:'exhibitionExit'},
 {route:'laboratoryIntro'}, {summary:'travel',level:2}, {route:'laboratoryEncounter'},
 {summary:'boss',level:2}, {route:'laboratoryFusion'}, {summary:'bear',level:2}, {route:'laboratoryExit'},
 {route:'sewersIntro'}, {summary:'travel',level:3}, {route:'sewersEncounter'}, {summary:'boss',level:3}, {route:'sewersExit'},
 {route:'factoryIntro'}, {summary:'travel',level:4}, {route:'factoryEncounter'}, {summary:'boss',level:4}, {route:'factoryExit'},
 {route:'rooftopIntro'}, {summary:'travel',level:5}, {route:'rooftopEncounter'}, {summary:'boss',level:5}, {route:'rooftopConclusion'}
];
export function buildMovie(){
 const reader=new StoryPlayer(),pages=[];
 for(const part of MOVIE_PLAN){
  if(part.route){
   reader.route(part.route,{origin:'movie'});
   pages.push(...reader.pages.filter(p=>p.kind!=='transition'&&!(p.kind==='splash'&&['cross','cross2'].includes(p.state))).map((p,i)=>({...p,movieId:`${part.route}:${i}`,movieKind:'story'})));
  }else if(part.clip){
   pages.push({...part,movieId:'jacket',movieKind:'clip',seconds:OFFICE_BOSS_BEATS.splash-OFFICE_BOSS_BEATS.reveal,music:'boss',text:'Javi se quita la chaqueta.'});
  }else{
   const texts=part.summary==='travel'?passages[part.level]:part.summary==='bear'?bearFight:fights[part.level];
   texts.forEach((text,shot)=>pages.push({...part,shot,captureMoment:part.summary==='travel'?['arrival','enemy-entry',part.level===0?'blocked-path':'cleared-path'][shot]:['face-off','evade','counterfire'][shot],movieId:`${part.level}:${part.summary}:${shot}`,movieKind:'summary',art:'movie-capture',speaker:'Narración',text,illustratedIntro:true,music:part.summary==='travel'?stageMusic[part.level]:part.level===5?'finalBoss':'boss'}));
  }
 }
 for(const page of pages)page.chapterId=page.movieKind==='story'?CHAPTERS.find(c=>c.sequences.includes(page.sequence))?.id:CHAPTERS[page.level+1].id;
 return pages;
}
export function movieChapterTarget(pages,index,direction){
 const starts=pages.flatMap((page,i)=>i===0||page.chapterId!==pages[i-1].chapterId?[i]:[]);
 const current=starts.findLastIndex(start=>start<=index),target=current+direction;
 return target<0||target>=starts.length?null:starts[target];
}
export function movieDuration(page){
 if(page.movieKind==='clip')return page.seconds;
 if(page.movieKind==='summary')return Math.max(6,page.text.split(/\s+/).length/2.6+1.5);
 if(page.kind==='splash')return 2.8;
 if(!page.text)return page.kind==='screen'?3.5:2.8;
 return Math.max(4,page.text.split(/\s+/).length/2.6+1.7);
}
export const MOVIE_SAVE_KEY='martuki.movie.v1';
export function readMoviePosition(storage,pages){
 try{const saved=JSON.parse(storage.getItem(MOVIE_SAVE_KEY));return Math.max(0,pages.findIndex(p=>p.movieId===saved?.id));}catch{return 0;}
}
export function saveMoviePosition(storage,page){try{storage.setItem(MOVIE_SAVE_KEY,JSON.stringify({id:page.movieId}));}catch{}}

// The same actors, combat simulation and native renderer as the playable game.
// Each summary frame is a frozen capture; there is no player-controlled combat.
export function captureGame(page){
 let seed=1701+page.level*31+(page.shot??0);
 const game=new Game(()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;});
 const run=(frames,input={})=>{for(let n=0;n<frames;n++)game.update(1/60,input);};
 if(page.summary==='travel'){
  if(page.shot===0){
   // The actual opening walk, before the first encounter trigger.
   game.reset(0,page.level);run(35,{right:true});
  }else if(page.shot===1){
   // Let the wave enter from its original edges. Never teleport a crowd around Marta.
   game.reset(0,page.level);game.player.x=game.arenas[0].trigger;
   game.camera=game.arenas[0].left-30;game.spawnStage();run(100);
  }else if(page.level===0){
   // This is the native waiting pose: coat and hat, before Javi reveals himself.
   game.reset(3,0);game.camera=game.arenas[3].left-30;
   game.player.x=game.arenas[3].trigger-35;
  }else{
   // The cleared last wave, still before the boss entrance and its identities.
   game.reset(2,page.level);game.phase='clearing';game.clearTimer=5;game.camera=game.arenas[2].left-30;
   game.player.x=game.arenas[2].right-140;run(24,{right:true});
  }
 }else{
  game.reset(3,page.level);game.player.x=game.arenas[3].trigger;game.spawnStage();
  game.camera=game.arenas[3].left-30;game.player.y=225;
  if(page.movieKind==='clip'){
   game.introTimer=game.introDuration-OFFICE_BOSS_BEATS.reveal;
   game.enemies[0].conversations=['dimitri'];return game;
  }
  const boss=game.enemies.find(e=>e.boss);
  if(page.summary==='bear')boss.transforming=true;
  game[['finishOfficeCinematic','finishExhibitionEncounter','finishLaboratoryCinematic','finishSewerCinematic','finishFactoryCinematic','finishRooftopCinematic'][page.level]]();
  game.player.x=game.camera+150;boss.x=game.camera+350;boss.y=225;
  if(page.level===0){game.player.weapon='pistol';game.player.ammo=30;}
  if(page.shot===1){
   // Capture a real telegraphed attack and a real dodge, not the aftermath of a pile-up.
   game.player.x=game.camera+205;boss.x=game.camera+330;
   for(let n=0;n<300&&boss.state!=='windup';n++)run(1);
   for(let n=0;n<100&&boss.state==='windup'&&boss.timer>.12;n++)run(1);
   run(10,{left:true,dodge:true});
  }else if(page.shot===2){
   game.startAttack('shoot');run(6);
  }
 }
 game.player.invuln=0;game.enemies.forEach(e=>{e.flash=0;e.saying='';e.sayingT=0;});
 game.events=[];game.effects=game.effects.filter(e=>e.kind!=='text');game.shake=0;game.banner=null;return game;
}
