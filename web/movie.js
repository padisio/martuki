import {buildMovie,movieDuration,readMoviePosition,saveMoviePosition,captureGame} from './movie-data.js?v=1';
import {loadVisualAssets,createGameView} from './view-v2.js?v=movie-1';
import {loadStoryAssets,createStoryView} from './story.js?v=keyboard-1';
import {prepareGameAssets} from './asset-loader.js?v=cache-1';
import {assetFetch} from './asset-cache.js?v=1';
import {MusicDirector} from './music.js?v=title-josep-1';
import {storyMusic} from './music-cues.js?v=title-josep-1';
import {SoundDirector,storyEffect} from './sfx.js?v=2';

const $=id=>document.getElementById(id),pages=buildMovie(),canvas=$('movieCanvas'),ctx=canvas.getContext('2d',{alpha:false});
const music=new MusicDirector(assetFetch),sfx=new SoundDirector(assetFetch,{natural:new URLSearchParams(location.search).get('sonido')==='realista'});
let lastSoundToken=null;
let index=0,elapsed=0,last=performance.now(),playing=false,ready=false,finished=false,muted=false,context,assets,images,storyView,clip,clipView;
try{index=readMoviePosition(localStorage,pages);}catch{}
const initialPosition=index;
function persist(){try{saveMoviePosition(localStorage,pages[index]);}catch{}}
function syncAudio(){
 const page=pages[index],paused=!playing||document.hidden;
 music.sync(page.music??storyMusic({page,pages,index}),{paused,enabled:!muted,duck:page.movieKind!=='clip',radioNear:page.sceneId!=='05a-marta-escucha'});
 sfx.sync({paused,enabled:!muted});
}
function unlock(){
 try{context??=new (window.AudioContext||window.webkitAudioContext)();music.start(context);sfx.start(context);context.resume().catch(()=>{});}catch{}
}
function soundPage(){const page=pages[index],effect=storyEffect(page),token=[page.sequence,page.sceneId,effect].join(':');if(effect&&playing&&token!==lastSoundToken)sfx.play(effect,{narrative:true});lastSoundToken=token;}
function display(){
 const page=pages[index];elapsed=0;finished=false;sfx.stop();clip=null;clipView=null;
 if(page.movieKind==='summary'){
  const capture=document.createElement('canvas');capture.width=960;capture.height=540;
  const game=captureGame(page),view=createGameView(capture.getContext('2d'),game,assets,{touch:true});
  view.render(game.time,false,{hideSplash:true,quiet:true,hideHud:true});images['movie-capture']=capture;
 }else if(page.movieKind==='clip'){
  clip=captureGame(page);clipView=createGameView(ctx,clip,assets,{touch:true});
 }
 $('movieNarration').textContent=(page.speaker&&page.speaker!=='Narración'?(page.speakerLabel??page.speaker)+': ':'')+(page.screenTitle??page.text??'');
 $('moviePrevious').disabled=index===0;
 $('movieNext').disabled=index===pages.length-1;
 $('moviePosition').textContent=`${index+1} / ${pages.length}`;
 $('movieEnd').hidden=true;persist();syncAudio();soundPage();render();
}
function render(){
 if(!ready)return;
 if(clipView)clipView.render(elapsed,false,{hideSplash:true,quiet:true,hideHud:true});
 else storyView.render({page:pages[index],showArt:false,autoElapsed:elapsed});
}
function setPlaying(value){playing=!!value;last=performance.now();$('moviePause').textContent=playing?'Ⅱ':'▶';$('moviePause').setAttribute('aria-label',playing?'Pausar película':'Reproducir película');$('moviePause').setAttribute('aria-pressed',String(playing));syncAudio();}
function move(direction){
 if(!ready)return;unlock();const next=Math.max(0,Math.min(pages.length-1,index+direction));
 if(next!==index){index=next;display();}
 else if(direction>0){finished=true;setPlaying(false);$('movieEnd').hidden=false;}
}
function start(fromBeginning=false){if(!ready)return;unlock();if(fromBeginning)index=0;$('movieStart').hidden=true;setPlaying(true);display();}
function suspend(){if(!ready)return;setPlaying(false);persist();sfx.stop();context?.suspend();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else last=performance.now();});
window.addEventListener('pagehide',suspend);
document.addEventListener('freeze',suspend);
$('movieBegin').onclick=()=>start(false);
$('movieRestart').onclick=()=>start(true);
$('movieAgain').onclick=()=>start(true);
$('moviePrevious').onclick=()=>move(-1);
$('movieNext').onclick=()=>move(1);
$('moviePause').onclick=()=>{if(!ready)return;unlock();if(finished){start(true);return;}setPlaying(!playing);};
$('movieSound').onclick=()=>{unlock();muted=!muted;$('movieSound').textContent=muted?'♪':'♫';$('movieSound').setAttribute('aria-label',muted?'Activar sonido':'Silenciar sonido');syncAudio();};
function fullscreen(){if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});}
$('movieFullscreen').onclick=fullscreen;
document.addEventListener('fullscreenchange',()=>{$('movieFullscreen').setAttribute('aria-label',document.fullscreenElement?'Salir de pantalla completa':'Pantalla completa');});
window.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.altKey||e.metaKey||e.repeat||!ready)return;
 if(!$('movieStart').hidden){if(e.code==='Enter'){e.preventDefault();start();}return;}
 if(['KeyA','ArrowLeft','KeyD','ArrowRight','Space','KeyP'].includes(e.code))e.preventDefault();
 if(['KeyA','ArrowLeft'].includes(e.code))move(-1);
 if(['KeyD','ArrowRight'].includes(e.code))move(1);
 if(['Space','KeyP'].includes(e.code))$('moviePause').click();
 if(e.code==='KeyM')$('movieSound').click();if(e.code==='KeyF')fullscreen();
});
function tick(now){
 const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
 if(ready&&playing&&!document.hidden){
  elapsed+=dt;
  if(clip)for(let remaining=dt;remaining>0;remaining-=1/60)clip.update(Math.min(1/60,remaining),{});
  if(elapsed>=movieDuration(pages[index]))move(1);
  render();
 }
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
try{
 const resources=await prepareGameAssets(loadVisualAssets,loadStoryAssets);
 ({assets,illustrations:images}=resources);storyView=createStoryView(ctx,images);resources.complete();ready=true;$('loading').hidden=true;
 $('movieBegin').disabled=false;$('movieBegin').textContent=initialPosition?'CONTINUAR PELÍCULA':'VER PELÍCULA';$('movieRestart').hidden=!initialPosition;
 display();
}catch(error){console.error('No se pudo preparar la película',error);}
