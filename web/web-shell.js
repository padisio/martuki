import {keyboardDiagram} from './keyboard-controls.js?v=1';
const root=document.documentElement;
if(!root.classList.contains('android-app')){
 root.classList.add('web-app');
 const $=s=>document.querySelector(s),button=$('#fullscreen'),dialog=$('#webHelpDialog');
 // Keep this control outside the toolbar, which cinematics intentionally hide.
 // Open dialogs live in the browser's top layer, so host the button there too.
 function placeFullscreenButton(){
  const host=[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;
  if(button.parentElement!==host)host.append(button);
 }
 button.type='button';placeFullscreenButton();
 new MutationObserver(placeFullscreenButton).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 let autoAttempted=false,noticeTimer;
 const active=()=>document.fullscreenElement||document.webkitFullscreenElement;
 function notice(message){$('#webNotice').textContent=message;$('#webNotice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('#webNotice').hidden=true;},6000);}
 async function enter(){
  if(active())return;
  try{
   const request=root.requestFullscreen||root.webkitRequestFullscreen;
   if(!request)throw new Error('Fullscreen unavailable');
   await request.call(root);
   if(root.classList.contains('touch-layout'))try{await screen.orientation?.lock?.('landscape');}catch{}
  }catch{notice('El juego ya ocupa la ventana. Tu navegador no permite ocultar sus barras ahora.');}
  finally{sync();}
 }
 async function toggle(){
  autoAttempted=true;
  if(active()){try{await (document.exitFullscreen||document.webkitExitFullscreen).call(document);}catch{notice('Usa Esc para salir de pantalla completa.');}}
  else await enter();
 }
 function sync(){const on=!!active();button.hidden=on;root.classList.toggle('web-windowed',!on);button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label','Pantalla completa');button.title='Pantalla completa (F)';placeFullscreenButton();}
 button.addEventListener('click',event=>{event.stopPropagation();void toggle();});
 document.addEventListener('fullscreenchange',sync);document.addEventListener('webkitfullscreenchange',sync);sync();
 window.addEventListener('pageshow',sync);window.addEventListener('focus',sync);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
 function autoEnter(){if(!autoAttempted){autoAttempted=true;void enter();}}
 for(const id of ['play','playExhibition','playLaboratory','playSewers','playFactory','playRooftop'])$('#'+id).addEventListener('click',autoEnter,{capture:true});
 $('#webHelpKeys').innerHTML=keyboardDiagram();
 // Keep the full textual legend accessible below the keyboard.
 $('#webHelpKeys').append($('.controls'));
 const legend=document.createElement('aside');legend.id='keyboardLegend';legend.setAttribute('aria-label','Controles de teclado');
 legend.innerHTML='<span><kbd>WASD / ↑↓←→</kbd> mover</span><span><kbd>J</kbd> golpe</span><span><kbd>K</kbd> cutter</span><span><kbd>L</kbd> disparo</span><span><kbd>Espacio</kbd> esquiva</span><span><kbd>U</kbd> hoz y martillo</span><span id="keyboardSummon" hidden><kbd>B</kbd> apoyo</span><button type="button" id="keyboardHelp"><kbd>H</kbd> controles</button>';
 document.body.append(legend);
 $('#webHelp').hidden=false;
 let introShown=false,pendingStart=null,resumeAfterHelp=false;
 function help(start=null){
  const state=window.martukiState?.();
  if(dialog.open||state?.story?.mode==='sequence'||state?.dialogue?.active)return;
  pendingStart=start;resumeAfterHelp=!start&&state?.mode==='playing'&&!state.paused;
  if(resumeAfterHelp)$('#pause').click();
  $('#webHelpTitle').textContent=start?'ANTES DE INFILTRARTE':'CONTROLES DE TECLADO';
  $('#webHelpContinue').textContent=start?'ENTENDIDO · COMENZAR':'VOLVER AL JUEGO';
  dialog.returnValue='';
  root.classList.add('web-help-open');dialog.showModal();
 }
 $('#webHelp').addEventListener('click',()=>help());
 $('#keyboardHelp').addEventListener('click',()=>help());
 window.addEventListener('martuki:keyboard-intro',event=>{
  if(root.classList.contains('touch-layout')||introShown)return;
  event.preventDefault();help(event.detail.resume);
 });
 dialog.addEventListener('close',()=>{
  root.classList.remove('web-help-open');$('#game').focus();
  const start=pendingStart,resume=resumeAfterHelp;pendingStart=null;resumeAfterHelp=false;
  if(start&&dialog.returnValue==='continue'){introShown=true;start();}
  else if(resume)$('#play').click();
 });
 window.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.altKey||e.metaKey)return;
  if(e.code==='KeyF'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)void toggle();return;}
  if(dialog.open){
   e.stopImmediatePropagation();
   if(['KeyD','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat)dialog.close('continue');}
   else if(e.code!=='Escape'&&e.code!=='Tab')e.preventDefault();
   return;
  }
  if(e.code==='KeyH'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)help();}
  if(e.code==='Enter'&&!e.repeat&&!$('#overlay').hidden&&!$('#play').disabled)autoEnter();
 },{capture:true});
}
