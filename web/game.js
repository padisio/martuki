import {SoundDirector,storyEffect} from './sfx.js?v=2';
import {KEY_BINDINGS,cinematicDirection} from './keyboard-controls.js?v=1';
import {updateAbilityButton} from './ability-ui.js?v=1';
import {assetFetch} from './asset-cache.js?v=1';
import {captureSession,readSession,writeSession,restoreGame} from './save-state.js?v=1';
import {prepareGameAssets} from './asset-loader.js?v=cache-1';
import {clearCombatInput} from './combat-feel.js?v=52';
import {Game,ARENAS,OFFICE_BOSS_BEATS,BOFE_COOLDOWN} from './core.js?v=armed-scale-1';
import {loadVisualAssets,createGameView} from './view-v2.js?v=armed-scale-1';
import {StoryPlayer,loadStoryAssets,createStoryView} from './story.js?v=keyboard-1';
import {BossConversation,pendingBossConversation,drawBossConversation} from './boss-dialogue.js?v=quiet-ui-1';
import {CHAPTERS,SEQUENCES} from './story-data.js?v=moscow-1';
import {stormFlash} from './scene-animation.js?v=52';
import {installTouchControls} from './touch-controls.js?v=stick-1';
import {MusicDirector,musicScene,musicOptions} from './music.js?v=transitions-1';
import './access-cue.js?v=52';

const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;
const game=new Game(),keys=new Set(),touch=new Set();
const touchMode=!!window.matchMedia?.('(pointer:coarse)').matches||!!document.documentElement?.classList.contains('android-app');
if(touchMode)document.documentElement?.classList.add('touch-layout');
let touchControls=null;
let ready=false,paused=false,last=0,accum=0,sceneTime=0,overlayMode='start',shownEnd=false,campaignComplete=false;
const mapping=KEY_BINDINGS;
const input=()=>Object.fromEntries([...new Set([...keys,...touch])].map(k=>[k,true]));

const sfx=new SoundDirector(assetFetch,{natural:new URLSearchParams(location.search).get('sonido')==='realista'});
class AudioEngine{
 constructor(){this.enabled=true;this.context=null;}
 start(){if(!this.enabled)return;try{if(!this.context){this.context=new (window.AudioContext||window.webkitAudioContext)();this.context.addEventListener('statechange',renderSoundButton);}sfx.start(this.context);music.start(this.context);this.context.resume().then(renderSoundButton).catch(renderSoundButton);renderSoundButton();}catch{this.enabled=false;renderSoundButton();}}
 effect(type,options){if(this.enabled)void sfx.play(type,options);}
}
const audio=new AudioEngine(),music=new MusicDirector(assetFetch);
// The sound button handles its own gesture: unlocking on pointerdown and then
// toggling on click used to silence that very first activation.
function unlockAudio(e){if(e.target?.closest?.('#sound')||e.code==='KeyM')return;if(audio.enabled&&audio.context?.state!=='running')audio.start();}
window.addEventListener('pointerdown',unlockAudio);
window.addEventListener('keydown',unlockAudio);

 let view=null,storyView=null,galleryReturn='start',lastStoryToken='',lastStorySoundToken='',lastConversationToken='';
const story=new StoryPlayer(),conversation=new BossConversation();

let savedSession=null,lastSave=0;
try{savedSession=readSession(localStorage);}catch{}
function saveSession(){
 if(!ready)return;
 const data=captureSession(game,story,conversation,{paused,overlayMode,shownEnd,campaignComplete,galleryReturn});
 if(!data)return;
 savedSession=data;
 try{writeSession(localStorage,data);}catch{}
}
function finishRestoredStory(){
 const {origin,routeId}=storyResume;
 if(origin==='encounter'){
  const finish={javiPresentation:'finishOfficeCinematic',expoEncounter:'finishExhibitionEncounter',laboratoryEncounter:'finishLaboratoryCinematic',laboratoryFusion:'finishLaboratoryCinematic',sewersEncounter:'finishSewerCinematic',factoryEncounter:'finishFactoryCinematic',rooftopEncounter:'finishRooftopCinematic'}[routeId];
  if(finish)game[finish]();else game.introTimer=game.introDuration-OFFICE_BOSS_BEATS.reveal;
  enterGameplay();return;
 }
 if(origin==='intro'){
  if(game.mode==='won'){game.nextLevel();shownEnd=false;music.restart();enterGameplay();}
  else startRun(0,({intro:0,laboratoryIntro:2,sewersIntro:3,factoryIntro:4,rooftopIntro:5})[routeId]??0);
  return;
 }
 if(origin==='outro'){
  if(game.level===4)game.factoryRunning=false;if(game.level===5)campaignComplete=true;showOverlay('won');saveSession();
 }
}
let storyResume=null;
function resumeSession(){
 const data=savedSession;if(!data||!restoreGame(game,data))return false;
 clearInput();story.close();conversation.close();
 Object.assign(story,JSON.parse(JSON.stringify(data.story)));
 // Old saves carry dialogue text: update this revised line without moving the
 // saved reading position or discarding the player's progress.
 const moscowLine=SEQUENCES.epilogue.find(page=>page.sceneId==='22-probeta'&&page.speaker==='Martuki');
 for(const page of story.pages)if(page.sequence==='epilogue'&&page.sceneId==='22-probeta'&&page.speaker==='Martuki')page.text=moscowLine.text;
 Object.assign(conversation,JSON.parse(JSON.stringify(data.conversation)));
 storyResume={origin:story.origin,routeId:story.routeId};
 story.onComplete=finishRestoredStory;story.onCancel=returnToTitle;
 ({shownEnd=false,campaignComplete=false,galleryReturn='start'}=data.ui??{});
 paused=game.mode==='playing';lastStoryToken='';lastStorySoundToken='';lastConversationToken='';last=performance.now();accum=0;
 $('#overlay').hidden=true;$('#chapterSelect').close();
 if(!story.active&&!conversation.active)showOverlay(game.mode==='playing'?'pause':game.mode==='won'?'won':game.mode==='lost'?'lost':'start');
 syncStoryUI();syncConversationUI();return true;
}
function suspendSession(){
 if(!ready)return;
 clearInput();if(game.mode==='playing'&&!paused&&!story.active&&!conversation.active)pause();
 saveSession();sfx.stop();audio.context?.suspend();
}
window.addEventListener('pagehide',suspendSession);
document.addEventListener('freeze',suspendSession);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendSession();else{last=performance.now();accum=0;}});
$('#resumeGame').addEventListener('click',()=>{audio.start();resumeSession();});
$('#chooseChapter').addEventListener('click',()=>$('#chapterSelect').showModal());
$('#closeChapters').addEventListener('click',()=>$('#chapterSelect').close());
$('#playOffice').addEventListener('click',play);
$('#chapterSelect').addEventListener('click',event=>{if(event.target.closest('button[id^="play"]'))$('#chapterSelect').close();},{capture:true});


function showOverlay(kind){
 overlayMode=kind;
 $('#chooseChapter').hidden=kind!=='start';$('#resumeGame').hidden=kind!=='start'||!savedSession;
 const win=kind==='won',lost=kind==='lost',pause=kind==='pause',final=win&&campaignComplete;
 $('#overlay').hidden=false;
 $('#overlay').classList.toggle('splash-panel',kind==='start');
 $('#overlay').classList.toggle('victory-panel',win);
 $('#returnTitle').hidden=kind==='start';
 $('#returnTitle').textContent='VOLVER A PORTADA';
 $('.screen-corner').hidden=kind==='start'||win;
 $('#overlayTag').textContent=final?'OPERACIÓN COMPLETADA':win?['DEPARTAMENTO ASEGURADO','EXPOSICIÓN ASEGURADA','LABORATORIO ASEGURADO','ALCANTARILLAS SUPERADAS','FÁBRICA DETENIDA','AZOTEA ASEGURADA'][game.level]:lost?'AGENTE FUERA DE COMBATE':pause?'MISIÓN EN PAUSA':'OPERACIÓN · TURNO DE OFICINA';
 $('#overlayTitle').innerHTML=win?(game.level===4&&!final?'FÁBRICA<br>DETENIDA':'MISIÓN<br>COMPLETADA'):lost?'No fiches<br>todavía.':pause?'Pausa para<br>respirar.':'Tu tapadera<br>acaba de saltar.';
 const conclusions=['Acreditación recuperada. Continúa hacia la exposición WOW.','La muestra ha vuelto al laboratorio. Josep te acompaña.','Muestra recuperada. La fábrica sigue activa. Continúa por las alcantarillas.','Has llegado al comedor. Continúa a la fábrica para detener la producción.','Producción detenida y envíos cancelados. Alcanza la azotea e impide que escape con el maletín.'];
 $('#overlayText').textContent=final?'Operación terminada. Volvemos a casa.':win?conclusions[game.level]:lost?'La tapadera ha salido regular. Vuelve a intentarlo desde esta zona con la salud y la munición recuperadas.':pause?'La conspiración puede esperar un momento. Vuelve cuando estés lista.':'Entraste como empleada. Descubriste una conspiración. Ahora todo el departamento quiere impedir que salgas.';
 $('#missionNote').textContent=win?`${game.score.toLocaleString('es-ES')} puntos · ${game.kills} derrotados · ${Math.floor(game.time/60)}:${Math.floor(game.time%60).toString().padStart(2,'0')}`:lost?`Punto de control · ${game.arenas[game.stage].label}`:pause?(touchMode?'PULSA CONTINUAR MISIÓN':'P o Esc para continuar'):'3 oleadas · 1 jefe · especial con U';
 const continuations=['CONTINUAR A LA EXPOSICIÓN','CONTINUAR AL LABORATORIO','CONTINUAR A LAS ALCANTARILLAS','CONTINUAR A LA FÁBRICA','CONTINUAR A LA AZOTEA'];
 $('#play').innerHTML=(final?'JUGAR OTRA VEZ':win?continuations[game.level]:lost?'REINTENTAR ZONA':pause?'CONTINUAR MISIÓN':'COMENZAR INFILTRACIÓN')+' <span>→</span>';
 $('#play').disabled=!ready;
 for(const id of ['playExhibition','playLaboratory','playSewers','playFactory','playRooftop']){$('#'+id).hidden=kind!=='start';$('#'+id).disabled=!ready;}
 $('#pause').disabled=!ready||kind==='start'||lost||win;
 if(win)canvas.setAttribute('aria-label',`${final?'Operación completada':'Tramo completado'}. ${game.score} puntos. ${game.kills} enemigos derrotados. Tiempo ${Math.floor(game.time/60)} minutos y ${Math.floor(game.time%60)} segundos.`);
 $('#status').textContent=final?'Operación completada':win?'Tramo completado':lost?'Punto de control disponible':pause?'En pausa':'Lista para infiltrarse';
}
function clearInput(){keys.clear();touch.clear();touchControls?.clear();clearCombatInput(game.player);}
function enterGameplay(){clearInput();paused=false;$('#overlay').classList.remove('victory-panel');$('#overlay').hidden=true;$('#pause').disabled=false;$('#pause').setAttribute('aria-label','Pausar');$('#status').textContent=['Infiltración en curso','Exposición WOW · Nivel 02','Laboratorio · Nivel 03','Alcantarillas · Nivel 04','Fábrica · Nivel 05','Azotea · Nivel 06'][game.level];$('.screen-corner').textContent=['01 / OFICINA CENTRAL','02 / EXPOSICIÓN WOW','03 / LABORATORIO','04 / ALCANTARILLAS','05 / FÁBRICA','06 / AZOTEA'][game.level];canvas.focus();last=performance.now();accum=0;saveSession();}
function startRun(checkpoint=0,level=game.level){campaignComplete=false;conversation.close();game.reset(checkpoint,level);music.restart();shownEnd=false;endTimer=0;enterGameplay();}
function returnToTitle(){saveSession();campaignComplete=false;clearInput();story.close();conversation.close();game.mode='attract';paused=false;showOverlay('start');syncStoryUI();}
function play(){
 if(!ready||story.active)return;audio.start();
 if(overlayMode==='pause'){enterGameplay();return;}
 if(overlayMode==='lost'){game.retryStage();music.restart();shownEnd=false;endTimer=0;enterGameplay();return;}
 if(overlayMode==='won'&&game.level<5){
  clearInput();
  const continueLevel=()=>{game.nextLevel();shownEnd=false;endTimer=0;music.restart();enterGameplay();};
  if(game.level>=1&&game.level<=4){$('#overlay').hidden=true;story.route(game.level===4?'rooftopIntro':game.level===3?'factoryIntro':game.level===2?'sewersIntro':'laboratoryIntro',{origin:'intro',onComplete:continueLevel,onCancel:returnToTitle});syncStoryUI();}
  else continueLevel();
  return;
 }
 if(!window.dispatchEvent(new CustomEvent('martuki:keyboard-intro',{cancelable:true,detail:{resume:play}})))return;
 clearInput();game.mode='attract';paused=false;$('#overlay').hidden=true;
 story.route('intro',{origin:'intro',onComplete:()=>startRun(0,0),onCancel:returnToTitle});syncStoryUI();
}
$('#playExhibition').addEventListener('click',()=>{if(!ready||story.active)return;audio.start();clearInput();$('#overlay').hidden=true;startRun(0,1);syncStoryUI();});
$('#playLaboratory').addEventListener('click',()=>{if(!ready||story.active)return;audio.start();clearInput();$('#overlay').hidden=true;story.route('laboratoryIntro',{origin:'intro',onComplete:()=>startRun(0,2),onCancel:returnToTitle});syncStoryUI();});
$('#playSewers').addEventListener('click',()=>{if(!ready||story.active)return;audio.start();clearInput();$('#overlay').hidden=true;story.route('sewersIntro',{origin:'intro',onComplete:()=>startRun(0,3),onCancel:returnToTitle});syncStoryUI();});
$('#playFactory').addEventListener('click',()=>{if(!ready||story.active)return;audio.start();clearInput();$('#overlay').hidden=true;story.route('factoryIntro',{origin:'intro',onComplete:()=>startRun(0,4),onCancel:returnToTitle});syncStoryUI();});
$('#playRooftop').addEventListener('click',()=>{if(!ready||story.active)return;audio.start();clearInput();$('#overlay').hidden=true;story.route('rooftopIntro',{origin:'intro',onComplete:()=>startRun(0,5),onCancel:returnToTitle});syncStoryUI();});
function pause(){if(conversation.active||story.active||game.mode!=='playing'||!ready)return;if(paused){play();return;}paused=true;syncMusic();clearInput();showOverlay('pause');$('#pause').setAttribute('aria-label','Continuar');}
$('#returnTitle').addEventListener('click',returnToTitle);
$('#play').addEventListener('click',play);$('#pause').addEventListener('click',pause);
function renderSoundButton(){const playing=audio.enabled&&audio.context?.state==='running',pending=audio.enabled&&!playing;$('#sound').setAttribute('aria-pressed',String(playing));$('#sound').setAttribute('aria-label',playing?'Silenciar sonido':'Activar sonido');$('#sound').innerHTML=(playing?'♫':'♪')+` <span>${playing?'SONIDO':pending?'ACTIVAR SONIDO':'SILENCIO'}</span>`;}
function sound(){audio.enabled=!(audio.enabled&&audio.context?.state==='running');if(audio.enabled)audio.start();syncMusic();renderSoundButton();}
$('#sound').addEventListener('click',sound);

function syncConversationUI(){
 const token=[conversation.active,conversation.id,conversation.index].join(':');
 if(token===lastConversationToken)return;lastConversationToken=token;
 $('#bossDialogueUI').hidden=!conversation.active;
 saveSession();if(!conversation.active)return;
 const page=conversation.page;
 $('#bossDialogueText').textContent=(page.speaker?(page.speakerLabel??page.speaker)+': ':'')+page.text;
 $('#bossDialoguePrevious').disabled=conversation.index===0;

}
function advanceConversation(){clearInput();conversation.next();syncConversationUI();last=performance.now();accum=0;}
$('#bossDialogueNext').addEventListener('click',advanceConversation);
$('#bossDialoguePrevious').addEventListener('click',()=>{conversation.previous();syncConversationUI();});
function beginBossConversation(){
 const beat=pendingBossConversation(game);if(!beat)return false;
 if(beat.route){
  clearInput();accum=0;
  story.route(beat.route,{origin:'encounter',onComplete:()=>{
   if(beat.route==='javiPresentation')game.finishOfficeCinematic();
   else if(beat.route==='expoEncounter')game.finishExhibitionEncounter();
   else if(beat.route==='laboratoryEncounter'||beat.route==='laboratoryFusion')game.finishLaboratoryCinematic();
   else if(beat.route==='sewersEncounter')game.finishSewerCinematic();
   else if(beat.route==='factoryEncounter')game.finishFactoryCinematic();
   else if(beat.route==='rooftopEncounter')game.finishRooftopCinematic();
   else game.introTimer=game.introDuration-OFFICE_BOSS_BEATS.reveal;
   last=performance.now();accum=0;enterGameplay();
  },onCancel:returnToTitle});syncStoryUI();return true;
 }
 clearInput();conversation.open(beat.cast,beat.id);accum=0;syncConversationUI();$('#bossDialogueNext').focus();return true;
}
function syncStoryUI(){
 if(game.level===4&&story.origin==='outro'&&story.page?.sceneId==='41-parada')game.factoryRunning=false;
 const token=[story.mode,story.origin,story.index,story.page?.chapterId,story.showArt].join(':');
 $('#storyMenu').disabled=!ready||story.active;
 $('#pause').disabled=!ready||story.active||game.mode!=='playing';
 if(token===lastStoryToken)return;lastStoryToken=token;saveSession();
 const soundToken=[story.mode,story.origin,story.page?.sequence,story.page?.sceneId??story.index,storyEffect(story.page)].join(':');
 if(soundToken!==lastStorySoundToken){
  lastStorySoundToken=soundToken;
  const effect=storyEffect(story.page);if(effect)audio.effect(effect,{narrative:true});
 }
 $('#storyUI').hidden=story.mode!=='sequence';$('#storyGallery').hidden=story.mode!=='gallery';
 $('#storyUI').classList.toggle('automatic',story.automatic);$('#storyUI').classList.toggle('inspect-art',story.showArt);
 if(story.page){
  $('#storyNarration').textContent=story.page.screenTitle??((story.page.speaker&&story.page.speaker!=='Narración'?(story.page.speakerLabel??story.page.speaker)+': ':'')+story.page.text);
  $('#storyPrevious').disabled=story.index===0;
  $('#storyNext').disabled=story.automatic;

  $('#storyNext').focus();
 }else{
  $('#storyNarration').textContent='';if(story.mode==='gallery')$('#storyClose').focus();
 }
}
function openStoryGallery(){
 if(!ready||story.active)return;audio.start();clearInput();
 if(game.mode==='playing'&&!paused)pause();
 galleryReturn=overlayMode;$('#overlay').hidden=true;story.openGallery();syncStoryUI();
}
function closeStoryGallery(){story.close();showOverlay(galleryReturn);syncStoryUI();}
function cancelStory(){if(story.automatic)return;if(story.origin==='encounter'){story.previous();syncStoryUI();return;}if(story.mode==='gallery')closeStoryGallery();else{story.cancel();syncStoryUI();}}
$('#storyMenu').addEventListener('click',openStoryGallery);
$('#storyClose').addEventListener('click',closeStoryGallery);
$('#storyNext').addEventListener('click',()=>{story.next();syncStoryUI();});
$('#storyPrevious').addEventListener('click',()=>{story.previous();syncStoryUI();});
$('#storyAll').addEventListener('click',()=>{story.route('campaign');syncStoryUI();});
for(const chapter of CHAPTERS)$('#chapter-'+chapter.id).addEventListener('click',()=>{story.chapter(chapter.id);syncStoryUI();});

// Browser fullscreen is handled by web-shell.js; Android is already immersive.
window.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.altKey||e.metaKey)return;
 const direction=cinematicDirection(e.code);
 if(conversation.active){
  if(e.code==='KeyM'){if(!e.repeat)sound();return;}
  e.preventDefault();if(e.repeat)return;
  if(direction===1||['KeyJ','KeyZ'].includes(e.code))advanceConversation();
  if(direction===-1){clearInput();conversation.previous();syncConversationUI();}return;
 }
 if(story.active){
  if(e.code==='KeyM'){if(!e.repeat)sound();return;}
  if(e.code==='Escape'){e.preventDefault();if(!e.repeat)cancelStory();return;}
  if(story.mode==='sequence'&&direction){
   e.preventDefault();if(e.repeat)return;clearInput();
   if(direction===1)story.next();
   if(direction===-1&&!story.automatic)story.previous();syncStoryUI();
  }else if(mapping[e.code]||e.code==='KeyP')e.preventDefault();return;
 }
 if(mapping[e.code]){if(ready)e.preventDefault();keys.add(mapping[e.code]);}
 if(e.repeat)return;
 if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();pause();}
 if(e.code==='KeyM')sound();if(e.code==='Enter'&&!$('#overlay').hidden)play();
});
window.addEventListener('keyup',e=>{if(mapping[e.code])keys.delete(mapping[e.code]);});
window.addEventListener('blur',()=>{keys.clear();touch.clear();touchControls?.clear();if(game.mode==='playing'&&!paused)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.mode==='playing'&&!paused)pause();});
canvas.addEventListener('pointerdown',()=>canvas.focus());
touchControls=installTouchControls({joystick:$('#joystick'),knob:$('#stickKnob'),buttons:document.querySelectorAll('[data-hold]'),onChange:held=>{touch.clear();for(const action of held)touch.add(action);}});
// A read-only snapshot helps diagnostics without changing gameplay.
window.martukiState=()=>({...game.snapshot(),build:'0.21.0',campaignComplete,paused,music:music.snapshot(),sfx:sfx.snapshot(),story:story.snapshot(),dialogue:conversation.snapshot()});
window.martukiLifecycle=state=>{if(state==='pause'){if(game.mode==='playing'&&!paused)pause();audio.context?.suspend().catch(()=>{});}else if(audio.enabled)audio.start();};
window.martukiBack=()=>{if(conversation.active){conversation.previous();syncConversationUI();return true;}if(story.active){cancelStory();return true;}if(game.mode==='attract')return false;if(game.mode==='playing'&&!paused)pause();else{keys.clear();touchControls.clear();game.mode='attract';paused=false;showOverlay('start');}return true;};
function syncMusic(){sfx.sync({enabled:audio.enabled,paused:document.hidden||(paused&&!story.active)});music.sync(musicScene(game,{story,conversation}),{paused:document.hidden||(paused&&!story.active),enabled:audio.enabled,...musicOptions(story,conversation)});}
let endTimer=0,lastThunder=-1;
function loop(t){
 if(ready&&t-lastSave>2000){saveSession();lastSave=t;}
 const dt=Math.min((t-(last||t))/1000,.05);last=t;sceneTime+=dt;
 if(ready&&story.active&&!document.hidden)story.update(dt);

 if(ready&&!paused&&!story.active&&!conversation.active&&game.mode==='playing'){
  accum+=dt;while(accum>=1/60){if(beginBossConversation())break;game.update(1/60,input());accum-=1/60;if(beginBossConversation())break;}
  for(const e of game.events.splice(0))audio.effect(e.type);
 }
 if(ready&&!story.active&&(game.mode==='won'||game.mode==='lost')&&!shownEnd){
  shownEnd=true;clearInput();$('#overlay').hidden=true;
  if(game.mode==='won'){
   const finishOutro=()=>{if(game.level===4)game.factoryRunning=false;if(game.level===5)campaignComplete=true;showOverlay('won');};
   story.route(['officeExit','exhibitionExit','laboratoryExit','sewersExit','factoryExit','rooftopConclusion'][game.level],{origin:'outro',onComplete:finishOutro,onCancel:finishOutro});
  }
  else showOverlay('lost');
 }

 if(view){if(game.mode==='attract'){
  view.splash(sceneTime);const cycle=Math.floor(sceneTime/7.1);if(!story.active&&stormFlash(sceneTime)>.7&&cycle!==lastThunder){lastThunder=cycle;audio.effect('thunder');}
 }else view.render(sceneTime,paused,{hideSplash:conversation.active||story.active,quiet:conversation.active||story.active||game.phase==='intro',dialogue:conversation.active,campaignComplete,showResults:shownEnd&&!story.active&&overlayMode==='won'&&!$('#overlay').hidden});}
 if(conversation.active&&view)drawBossConversation(ctx,view.assets,conversation);
 if(storyView&&story.mode==='sequence')storyView.render(story);
 const hideControls=game.mode!=='playing'||paused||story.active||conversation.active||['intro','bossdown','playerdown'].includes(game.phase);
 if(hideControls&&!$('#touchControls').hidden)clearInput();
 $('#touchControls').hidden=hideControls;
 document.documentElement?.classList.toggle('cinematic',story.active||conversation.active||game.mode==='playing'&&['intro','bossdown','playerdown'].includes(game.phase));
 $('#summonBofe').hidden=!game.bofeUnlocked;$('#summonBofe').disabled=game.bofeCooldown>0;
 if($('#keyboardSummon'))$('#keyboardSummon').hidden=!game.bofeUnlocked;
 updateAbilityButton($('#summonBofe'),game.bofeCooldown,BOFE_COOLDOWN,'Bofe');
 updateAbilityButton($('#specialAbility'),game.player.specialCD,10,'Hoz y martillo');
 syncStoryUI();syncConversationUI();
 syncMusic();
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
renderSoundButton();
let startupResources;
try{
 startupResources=await prepareGameAssets(loadVisualAssets,loadStoryAssets);const {assets,illustrations}=startupResources;storyView=createStoryView(ctx,illustrations);view=createGameView(ctx,game,assets,{touch:touchMode});startupResources.complete();ready=true;$('#loading').hidden=true;if(!resumeSession())showOverlay('start');if(document.documentElement.classList.contains('android-app'))audio.start();
}catch(err){startupResources?.fail(err);console.error('Error al cargar los recursos',err);}
