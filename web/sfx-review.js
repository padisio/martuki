import {SoundDirector} from './sfx.js?v=2';
import {MusicDirector} from './music.js?v=title-josep-1';
import {assetFetch} from './asset-cache.js?v=1';
const rows=[
 ['Puñetazo','hit','Tres golpes distintos contra un saco.'],
 ['Golpe fuerte','finisher','Una toma de impacto más contundente.'],
 ['Cutter','slash','Cortes reales sobre cartón; sin el silbido de espada.'],
 ['Esquiva','dodge','Roce y movimiento de un abrigo.'],
 ['Movimiento de ataque','swing','Ropa en movimiento, a volumen discreto.'],
 ['Disparo','shoot','Grabación de un disparo, con su caída natural.'],
 ['Metal','special','Movimiento de una cadena pequeña.'],
 ['Alarma','storyAlarm','Alarma de evacuación grabada en un edificio.'],
 ['Rugido','bearRumble','Vocalizaciones de osos grizzly de Yellowstone.'],
 ['Gruñido','growl','Otro fragmento de la grabación de los osos.'],
 ['Transformación','fusion','Tela que se rasga; una textura física breve.'],
 ['Derrumbe','collapse','Dos barras de acero que caen al suelo.'],
 ['Trueno','thunder','Trueno real, sin convertir un impacto en tormenta.'],
 ['Beber','drink','Una toma de una persona bebiendo de un recipiente.']
];
const $=id=>document.getElementById(id),directors=[new SoundDirector(assetFetch),new SoundDirector(assetFetch,{natural:true})],music=new MusicDirector(assetFetch);
let context,revision=0;
function stop(){revision++;directors.forEach(d=>d.stop());music.sync(null);$('status').textContent='Detenido.';}
async function prepare(which){
 stop();const token=revision;context??=new (window.AudioContext||window.webkitAudioContext)();await context.resume();
 const director=directors[which];director.sync({enabled:true});$('status').textContent='Preparando sonidos…';await director.start(context);music.start(context);
 if(token!==revision)return null;
 if(director.failed.size){$('status').textContent='Faltan sonidos por cargar. Recarga la página para reintentar.';return null;}
 music.sync($('withMusic').checked?'boss':null,{duck:true});return {director,token};
}
async function play(which,type,label){
 try{const ready=await prepare(which);if(!ready)return;await ready.director.play(type,{narrative:true});if(ready.token===revision)$('status').textContent=`${label} · ${which?'grabación nueva':'versión anterior'}`;}
 catch{$('status').textContent='No se pudo activar el sonido. Pulsa otra vez para reintentar.';}
}
for(const [label,type,description] of rows){
 const card=document.createElement('article'),title=document.createElement('h2'),text=document.createElement('p');title.textContent=label;text.textContent=description;card.append(title,text);
 for(const which of [0,1]){const button=document.createElement('button');button.textContent=which?'▶ Nueva':'▶ Anterior';button.className=which?'new':'';button.setAttribute('aria-label',`${label}: ${which?'nueva':'anterior'}`);button.onclick=()=>play(which,type,label);card.append(button);}
 $('samples').append(card);
}
async function demo(which){
 try{const ready=await prepare(which);if(!ready)return;$('status').textContent=`Secuencia de combate · ${which?'nueva':'anterior'}`;
  for(const [delay,type] of [[0,'swing'],[160,'hit'],[460,'slash'],[640,'hit'],[700,'dodge'],[850,'shoot'],[240,'shoot'],[1000,'finisher']]){
   await new Promise(resolve=>setTimeout(resolve,delay));if(revision!==ready.token)return;await ready.director.play(type);
  }
 }catch{$('status').textContent='No se pudo preparar la secuencia. Reintenta.';}
}
$('demoOld').onclick=()=>demo(0);$('demoNew').onclick=()=>demo(1);$('stop').onclick=stop;
$('withMusic').onchange=()=>music.sync($('withMusic').checked?'boss':null,{duck:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();context?.suspend();}});
window.addEventListener('pagehide',stop);
