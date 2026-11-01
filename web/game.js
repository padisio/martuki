import {updateAbilityButton} from './ability-ui.js?v=1';
import {assetFetch} from './asset-cache.js?v=1';
import {captureSession,readSession,writeSession,restoreGame} from './save-state.js?v=1';
import {prepareGameAssets} from './asset-loader.js?v=cache-1';
import {clearCombatInput} from './combat-feel.js?v=52';
import {Game,ARENAS,OFFICE_BOSS_BEATS,BOFE_COOLDOWN} from './core.js?v=armed-scale-1';
import {loadVisualAssets,createGameView} from './view-v2.js?v=armed-scale-1';
import {StoryPlayer,loadStoryAssets,createStoryView} from './story.js?v=quiet-ui-1';
import {BossConversation,pendingBossConversation,drawBossConversation} from './boss-dialogue.js?v=quiet-ui-1';
import {CHAPTERS} from './story-data.js?v=57-sale';
import {stormFlash} from './scene-animation.js?v=52';
import {installTouchControls} from './touch-controls.js?v=stick-1';
import {MusicDirector,musicScene,musicOptions} from './music.js?v=campaign-4';
import './access-cue.js?v=52';

const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;
const game=new Game(),keys=new Set(),touch=new Set();
const touchMode=!!window.matchMedia?.('(pointer:coarse)').matches||!!document.documentElement?.classList.contains('android-app');
if(touchMode)document.documentElement?.classList.add('touch-layout');
let touchControls=null;
let ready=false,paused=false,last=0,accum=0,sceneTime=0,overlayMode='start',shownEnd=false,campaignComplete=false;
const mapping={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyJ:'punch',KeyZ:'punch',KeyK:'knife',KeyX:'knife',KeyL:'shoot',KeyC:'shoot',Space:'dodge',KeyE:'pickup',KeyU:'special',KeyV:'special',KeyB:'summon',KeyN:'summon'};
const input=()=>Object.fromEntries([...new Set([...keys,...touch])].map(k=>[k,true]));

class AudioEngine{
 constructor(){this.enabled=true;this.context=null;}
 start(){try{this.context??=new (window.AudioContext||window.webkitAudioContext)();this.context.resume();music.start(this.context);}catch{this.enabled=false;}}
 tone(freq,duration=.09,type='square',volume=.035,slide=0,delay=0){if(!this.enabled||!this.context)return;const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(30,freq),t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration);}
 effect(type){if(type==='bearRumble'){this.tone(42,1.05,'sawtooth',.035,38);this.tone(68,.7,'triangle',.025,-30,.15);return;}if(type==='bofeNameCross')type='nameCross';const presets={finisher:[65,.18,'square',.06,-40],counter:[220,.16,'triangle',.06,330],perfectDodge:[660,.16,'sine',.05,440],swing:[180,.06,'triangle',.04,-110],slash:[580,.08,'sawtooth',.025,-430],hit:[95,.1,'square',.05,-55],hurt:[150,.18,'sawtooth',.035,-100],shoot:[850,.065,'sawtooth',.025,-790],empty:[80,.04,'square',.02],dodge:[360,.11,'triangle',.03,240],down:[170,.2,'triangle',.04,-120],alarm:[440,.18,'square',.018,-110],bossTell:[150,.22,'sawtooth',.022,70],slap:[130,.1,'square',.04,-80],slip:[700,.3,'triangle',.04,-600],drink:[520,.35,'sine',.04,300],fusion:[80,1.2,'sawtooth',.04,620],papers:[420,.08,'triangle',.03,-100],enemySwing:[100,.045,'triangle',.02],nameCross:[730,.18,'sawtooth',.025,-600],nameDrop:[75,.25,'square',.05,-40],bofeJoin:[440,.5,'triangle',.05,440],bofeSummon:[270,.3,'sawtooth',.04,500],bofeImpact:[65,.35,'square',.06,-35]};if(presets[type])this.tone(...presets[type]);if(type==='nameDrop'){this.tone(42,.65,'sine',.09,-10);this.tone(110,.4,'triangle',.035,-55,.03);}if(['pickup','clear','special','bossDown'].includes(type)){[330,440,550,660].forEach((f,i)=>this.tone(f,.13,'square',.025,0,i*.075));}}

}
const audio=new AudioEngine(),music=new MusicDirector(assetFetch);
// Browsers require a user gesture before any music or sound can be heard.
window.addEventListener('pointerdown',()=>{if(audio.enabled)audio.start();},{once:true});

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
 saveSession();audio.context?.suspend();
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
function sound(){audio.enabled=!audio.enabled;if(audio.enabled)audio.start();syncMusic();$('#sound').setAttribute('aria-pressed',String(audio.enabled));$('#sound').innerHTML=(audio.enabled?'♫':'♪')+` <span>${audio.enabled?'SONIDO':'SILENCIO'}</span>`;}
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
 const soundToken=[story.mode,story.origin,story.index,story.page?.sequence].join(':');
 if(soundToken!==lastStorySoundToken){
  lastStorySoundToken=soundToken;
  if(story.page?.soundCue==='access-authorized')globalThis.MartukiAccessCue.play(audio.context,{enabled:audio.enabled});
  else if(story.page?.soundCue)audio.effect(story.page.soundCue);
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
window.addEventListener('keydown',e=>{if(conversation.active){if(e.code==='KeyM'){if(!e.repeat)sound();return;}e.preventDefault();if(e.repeat)return;if(['Enter','Space','ArrowRight','KeyJ','KeyZ'].includes(e.code))advanceConversation();if(e.code==='ArrowLeft'){conversation.previous();syncConversationUI();}return;}if(story.active){if(e.code==='KeyM'){if(!e.repeat)sound();return;}if(e.code==='Escape'){e.preventDefault();if(!e.repeat)cancelStory();return;}if(story.mode==='sequence'&&['Enter','Space','ArrowRight','ArrowLeft'].includes(e.code)){e.preventDefault();if(e.repeat)return;if(['Enter','Space','ArrowRight'].includes(e.code))story.next();if(e.code==='ArrowLeft'&&!story.automatic)story.previous();syncStoryUI();}else if(mapping[e.code]||e.code==='KeyP')e.preventDefault();return;}if(mapping[e.code]){if(ready)e.preventDefault();keys.add(mapping[e.code]);}if(e.repeat)return;if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();pause();}if(e.code==='KeyM')sound();if(e.code==='Enter'&&!$('#overlay').hidden)play();});
window.addEventListener('keyup',e=>{if(mapping[e.code])keys.delete(mapping[e.code]);});
window.addEventListener('blur',()=>{keys.clear();touch.clear();touchControls?.clear();if(game.mode==='playing'&&!paused)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.mode==='playing'&&!paused)pause();});
canvas.addEventListener('pointerdown',()=>canvas.focus());
touchControls=installTouchControls({joystick:$('#joystick'),knob:$('#stickKnob'),buttons:document.querySelectorAll('[data-hold]'),onChange:held=>{touch.clear();for(const action of held)touch.add(action);}});
// A read-only snapshot helps diagnostics without changing gameplay.
window.martukiState=()=>({...game.snapshot(),build:'0.17.1',campaignComplete,paused,music:music.snapshot(),story:story.snapshot(),dialogue:conversation.snapshot()});
window.martukiLifecycle=state=>{if(state==='pause'){if(game.mode==='playing'&&!paused)pause();audio.context?.suspend();}else if(audio.enabled)audio.context?.resume();};
window.martukiBack=()=>{if(conversation.active){conversation.previous();syncConversationUI();return true;}if(story.active){cancelStory();return true;}if(game.mode==='attract')return false;if(game.mode==='playing'&&!paused)pause();else{keys.clear();touchControls.clear();game.mode='attract';paused=false;showOverlay('start');}return true;};
function syncMusic(){music.sync(musicScene(game,{story,conversation}),{paused:document.hidden||(paused&&!story.active),enabled:audio.enabled,...musicOptions(story,conversation)});}
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
  view.splash(sceneTime);const cycle=Math.floor(sceneTime/7.1);if(!story.active&&stormFlash(sceneTime)>.7&&cycle!==lastThunder){lastThunder=cycle;audio.tone(48,1.1,'sawtooth',.028,-15);}
 }else view.render(sceneTime,paused,{hideSplash:conversation.active||story.active,quiet:conversation.active||story.active||game.phase==='intro',dialogue:conversation.active,campaignComplete,showResults:shownEnd&&!story.active&&overlayMode==='won'&&!$('#overlay').hidden});}
 if(conversation.active&&view)drawBossConversation(ctx,view.assets,conversation);
 if(storyView&&story.mode==='sequence')storyView.render(story);
 const hideControls=game.mode!=='playing'||paused||story.active||conversation.active||['intro','bossdown','playerdown'].includes(game.phase);
 if(hideControls&&!$('#touchControls').hidden)clearInput();
 $('#touchControls').hidden=hideControls;
 document.documentElement?.classList.toggle('cinematic',story.active||conversation.active||game.mode==='playing'&&['intro','bossdown','playerdown'].includes(game.phase));
 $('#summonBofe').hidden=!game.bofeUnlocked;$('#summonBofe').disabled=game.bofeCooldown>0;
 updateAbilityButton($('#summonBofe'),game.bofeCooldown,BOFE_COOLDOWN,'Bofe');
 updateAbilityButton($('#specialAbility'),game.player.specialCD,10,'Hoz y martillo');
 syncStoryUI();syncConversationUI();
 syncMusic();
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
let startupResources;
try{
 startupResources=await prepareGameAssets(loadVisualAssets,loadStoryAssets);const {assets,illustrations}=startupResources;storyView=createStoryView(ctx,illustrations);view=createGameView(ctx,game,assets,{touch:touchMode});startupResources.complete();ready=true;$('#loading').hidden=true;if(!resumeSession())showOverlay('start');
}catch(err){startupResources?.fail(err);console.error('Error al cargar los recursos',err);}
