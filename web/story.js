import {drawDialogueCaption,captionLayout,speakerStyle} from './dialogue-style.js?v=quiet-ui-1';
import {CHAPTERS,ROUTES,STORY_ART,storyAssetPath,sequencePages} from './story-data.js?v=onesimo-1';
import {wrapPixelText,pixelText,pixelTextWidth} from './pixel-font.js?v=52';
import './cinematic-timing.js?v=manual-2';

export class StoryPlayer{
 constructor(){this.mode='closed';this.pages=[];this.index=0;this.origin=null;this.onComplete=null;this.onCancel=null;this.showArt=false;this.autoElapsed=0;}
 get active(){return this.mode!=='closed';}
 get page(){return this.mode==='sequence'?this.pages[this.index]:null;}
 get automatic(){return !!globalThis.MartukiCinematicTiming.duration(this.page);}
 openGallery(){this.mode='gallery';this.pages=[];this.index=0;this.origin='gallery';}
 open(ids,{origin='gallery',onComplete=null,onCancel=null}={}){
  this.routeId=null;this.showArt=false;this.pages=sequencePages(ids).flatMap(page=>{
   if(['silent','screen','system','splash','gameplay'].includes(page.kind))return [page];
   const lines=wrapPixelText(page.text,452,1.5),parts=[],perPage=(page.illustratedIntro||page.illustratedAftermath||page.illustratedExpo||page.illustratedLaboratory||page.illustratedSewers||page.illustratedFactory||page.illustratedRooftop||page.illustratedEpilogue)?3:2;
   for(let i=0;i<lines.length;i+=perPage)parts.push({...page,text:lines.slice(i,i+perPage).join(' ')});
   return parts;
  });if(!this.pages.length)throw new Error('Empty story sequence');
  this.mode='sequence';this.index=0;this.origin=origin;this.onComplete=onComplete;this.onCancel=onCancel;this.autoElapsed=0;
 }
 chapter(id){const ch=CHAPTERS.find(c=>c.id===id);if(!ch)throw new Error('Unknown chapter: '+id);this.open(ch.sequences);}
 route(id,options){if(!ROUTES[id])throw new Error('Unknown route: '+id);this.open(ROUTES[id],options);this.routeId=id;}
 previous(){this.showArt=false;if(this.mode==='sequence'){this.index=globalThis.MartukiCinematicTiming.readingIndex(this.pages,Math.max(0,this.index-1),-1);this.autoElapsed=0;}}
 next(){if(this.automatic)return;this.showArt=false;this.advance();}
 advance(){if(this.mode!=='sequence')return;this.autoElapsed=0;const next=globalThis.MartukiCinematicTiming.readingIndex(this.pages,this.index+1);if(next<this.pages.length)this.index=next;else this.finish();}
 update(dt){
  if(!this.active||this.showArt)return;
  if(this.page?.kind==='splash'&&!this.automatic){this.autoElapsed+=Math.max(0,dt);return;}
  if(!this.automatic)return;
  this.autoElapsed+=Math.max(0,dt);
  while(this.active&&this.automatic){const seconds=globalThis.MartukiCinematicTiming.duration(this.page);if(this.autoElapsed<seconds)break;const remaining=this.autoElapsed-seconds;this.advance();this.autoElapsed=remaining;}
 }
 toggleArt(){if(this.mode==='sequence')this.showArt=!this.showArt;}
 finish(){if(this.mode!=='sequence')return;const origin=this.origin,complete=this.onComplete;this.close();if(origin==='gallery')this.openGallery();else complete?.();}
 cancel(){if(this.mode==='gallery'){this.close();return;}if(this.mode!=='sequence')return;
  const origin=this.origin,cancel=this.onCancel;this.close();if(origin==='gallery')this.openGallery();else cancel?.();
 }
 close(){this.mode='closed';this.pages=[];this.index=0;this.origin=null;this.onComplete=null;this.onCancel=null;this.autoElapsed=0;}
 snapshot(){return {automatic:this.automatic,kind:this.page?.kind??null,autoElapsed:this.autoElapsed,mode:this.mode,origin:this.origin,index:this.index,total:this.pages.length,chapter:this.page?.chapterId??null,showArt:this.showArt,sceneId:this.page?.sceneId??null,approvedStep:this.page?.approvedStep??null,speaker:this.page?.speaker??null,speakerLabel:this.page?.speakerLabel??this.page?.speaker??null,speakerColor:speakerStyle(this.page?.speaker).color,speakerSide:speakerStyle(this.page?.speaker).side};}
}

function drawStorySplash(ctx,page,elapsed=1){
 const cast=page.splash,secondReveal=page.revealStage==='reveal',boss=page.state==='boss'||secondReveal,names=secondReveal?['Jorge Besnard']:cast.names,finalName=secondReveal?'Javier Armuña':cast.name;
 const shade=ctx.createLinearGradient(0,145,0,270);shade.addColorStop(0,'#07101d00');shade.addColorStop(.7,'#07101de8');shade.addColorStop(1,'#07101dff');ctx.fillStyle=shade;ctx.fillRect(0,145,480,125);
 names.forEach((name,i)=>{
  const x=names.length===2?120+i*240:240,y=boss?187:210,scale=boss?1:1.5;
  pixelText(ctx,name,x,y,scale,boss?'#bfc7c7':'#fff0db');
  if(page.state==='cross'||boss){const w=pixelTextWidth(name,scale),t=Math.min(1,elapsed/.3);ctx.strokeStyle='#fa4d46';ctx.lineWidth=boss?2:3;ctx.beginPath();ctx.moveTo(x-w/2-3,y+9);ctx.lineTo(x-w/2-3+(w+6)*t,y+9-7*t);ctx.stroke();}
 });
 if(cast.showTag&&cast.tag)pixelText(ctx,cast.tag,240,239,1,cast.color);
 if(boss){const scale=pixelTextWidth(finalName,2.5)<=450?2.5:2,t=Math.min(1,elapsed/.2);pixelText(ctx,finalName,240,210+6*(1-t),scale,cast.color);}
}

export async function loadStoryAssets(loadImage){
 loadImage??=async url=>{const image=new Image();image.src=url;try{await image.decode();}catch(e){throw new Error(`No se puede decodificar ${url}: ${e.message}`);}return image;};
 const images={};for(const id of STORY_ART)images[id]=await loadImage(storyAssetPath(id));return images;
}
export function createStoryView(ctx,images){
 ctx.setTransform(ctx.canvas.width/480,0,0,ctx.canvas.height/270,0,0);
 return {render(player){
  const page=player.page;if(!page||page.kind==='gameplay')return;
  ctx.save();ctx.imageSmoothingEnabled=!!(page.illustratedIntro||page.illustratedEncounter||page.illustratedAftermath||page.illustratedExpo||page.illustratedLaboratory||page.illustratedSewers||page.illustratedFactory||page.illustratedRooftop||page.illustratedEpilogue);
  // These illustrations remain completely still. All typography is drawn by
  // the pixel font rather than generated into the artwork.
  const {top:captionTop}=captionLayout(page);
  const artOnly=player.showArt||['silent','screen','system','splash'].includes(page.kind);
  const img=images[page.art],height=artOnly?270:captionTop;
  const scale=Math.min(480/img.width,height/img.height),w=img.width*scale,h=img.height*scale;
  ctx.fillStyle='#080f1b';ctx.fillRect(0,0,480,270);
  ctx.drawImage(img,(480-w)/2,(height-h)/2,w,h);
  if(page.kind==='splash'&&!player.showArt)drawStorySplash(ctx,page,player.autoElapsed);
  if(page.screenTitle&&!player.showArt){
   ctx.fillStyle='#0006';ctx.fillRect(0,0,480,270);
   const lines=page.screenTitle.split('\n');
   lines.forEach((line,i)=>pixelText(ctx,line,240,124+(i-(lines.length-1)/2)*34,3,'#f8edda'));
  }
  if(page.kind==='system'&&!player.showArt){
   ctx.fillStyle='#081b19';ctx.fillRect(233,230,233,26);
   ctx.strokeStyle='#71ef9d';ctx.lineWidth=1;ctx.strokeRect(233,230,233,26);
   pixelText(ctx,page.text,350,238,1.5,'#a0ffc0');
  }
  if(artOnly){ctx.restore();return;}
  drawDialogueCaption(ctx,page,{top:captionTop,partner:page.partner});
  ctx.restore();
 }};
}
