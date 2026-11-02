import {StoryPlayer} from './story.js?v=keyboard-1';
import {Game,OFFICE_BOSS_BEATS} from './core.js?v=armed-scale-1';

// Only describe the action already reached. Boss names belong after their reveal.
const passages=[
 ['Marta avanza por el departamento de diseño enfrentándose a sus compañeros.','Se abre paso entre las mesas y los archivos del departamento.','Una figura misteriosa le corta el paso.'],
 ['Marta recorre la exposición mientras otros empleados intentan detenerla.','Se enfrenta a quienes le cierran el paso entre los expositores.','Consigue avanzar hasta el fondo de la sala.'],
 ['Marta se adentra en el laboratorio y se enfrenta a sus ocupantes.','Cruza los puestos de trabajo y los muestrarios entre nuevos ataques.','Tras superar la última oleada, continúa hacia el fondo del laboratorio.'],
 ['Marta avanza por las alcantarillas entre los infectados.','Se abre paso por los túneles, manteniendo a sus atacantes a distancia.','Supera el último grupo y prosigue por el conducto.'],
 ['Marta entra en la fábrica y se enfrenta a quienes protegen sus instalaciones.','Avanza entre la maquinaria bajo el fuego de los guardias.','Tras superar la resistencia, alcanza el otro extremo de la nave.'],
 ['Marta recorre la azotea mientras los guardias intentan frenar su avance.','Se abre paso bajo el fuego enemigo.','Supera la última línea de defensa y continúa por la cubierta.']
];
const fights=[
 ['Marta se enfrenta a Dimitri Tontotsky en el departamento de diseño.','Esquiva sus ataques y responde a corta distancia.','El combate continúa junto al acceso a la exposición.'],
 ['Marta se enfrenta a Marixásmin Matatodosk en la exposición.','Mantiene la distancia entre sus ataques y busca una abertura.','Intercambian golpes entre los expositores.'],
 ['Marta se enfrenta a Elisa Martón en el laboratorio.','Esquiva sus ataques y responde antes de que vuelva a acercarse.','La presión de Marta obliga a Elisa a retroceder.'],
 ['Marta se enfrenta a Mayrena Disenyostka en las alcantarillas.','Se mueve por el estrecho túnel para evitar sus ataques.','Busca huecos en su defensa y contraataca.'],
 ['Marta se enfrenta a Rost-Vidf Rubiñoz Rubiñoz en la fábrica.','Esquiva sus ataques entre las máquinas.','El enfrentamiento continúa en el interior de la nave.'],
 ['Marta se enfrenta a Me|Ni|Na en la azotea.','Se aparta de sus ataques y responde mientras recorre la cubierta.','El combate continúa entre los restos de la azotea.']
];
const bearFight=['Marta vuelve a la carga contra Elisa y el Oso Martín.','Se aparta de las embestidas y los golpes de su enorme adversario.','Aprovecha las pausas entre sus ataques para contraatacar.'];
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
   texts.forEach((text,shot)=>pages.push({...part,shot,movieId:`${part.level}:${part.summary}:${shot}`,movieKind:'summary',art:'movie-capture',speaker:'Narración',text,illustratedIntro:true,music:part.summary==='travel'?stageMusic[part.level]:part.level===5?'finalBoss':'boss'}));
  }
 }
 return pages;
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
 const stage=page.summary==='travel'?page.shot:3;
 game.reset(stage,page.level);game.player.x=game.arenas[stage].trigger;game.spawnStage();
 game.camera=game.arenas[stage].left-30;game.player.y=225;
 if(page.movieKind==='clip'){
  game.introTimer=game.introDuration-OFFICE_BOSS_BEATS.reveal;
  game.enemies[0].conversations=['dimitri'];return game;
 }
 if(stage===3){
  if(page.summary==='bear')game.enemies.find(e=>e.boss).transforming=true;
  game[['finishOfficeCinematic','finishExhibitionEncounter','finishLaboratoryCinematic','finishSewerCinematic','finishFactoryCinematic','finishRooftopCinematic'][page.level]]();
 }
 const targets=game.enemies.filter(e=>e.hp>0);
 targets.forEach((e,i)=>Object.assign(e,{x:game.camera+285+i*28,y:211+(i%3)*10,state:'chase',entryDelay:0,cd:.5+i*.2}));
 game.player.x=game.camera+205;
 for(let frame=0;frame<75+(page.shot??0)*23;frame++){
  const target=game.enemies.find(e=>e.hp>0);if(!target)break;
  const gap=target.x-game.player.x;
  game.update(1/60,{right:gap>42,left:gap< -42,punch:frame%32<14,knife:frame%56>42,shoot:page.shot===2&&Math.abs(gap)>60});
 }
 game.player.invuln=0;game.enemies.forEach(e=>e.flash=0);game.events=[];game.effects=game.effects.filter(e=>e.kind!=='text');game.shake=0;game.banner=null;return game;
}
