import {pixelText,pixelTextWidth,wrapPixelText} from './pixel-font.js?v=52';

// Identity belongs to the speaker, never to the boss/scene currently on screen.
export const SPEAKERS={
 Martuki:{name:'Martuki',color:'#91e5ff',side:'left'},
 Javi:{name:'Javi',color:'#ffc58b',side:'right'},
 Elisa:{name:'Elisa',color:'#a9edb0',side:'right'},
 'Aina · vídeo':{name:'Aina · vídeo',color:'#ffe59b',side:'right'},
 Rugido:{name:'Rugido',color:'#f3c5a0',side:'center'},
 Martín:{name:'Martín',color:'#edb491',side:'right'},
 María:{name:'María',color:'#d7b5ff',side:'right'},
 Jasmín:{name:'Jasmín',color:'#ff9eb7',side:'right'},
 Marixás:{name:'Marixás',color:'#a5f0df',side:'right'},
 Josep:{name:'Josep',color:'#f6e58c',side:'right'},
 Mayte:{name:'Mayte',color:'#ffc0aa',side:'right'},
 Lorena:{name:'Lorena',color:'#aebfff',side:'right'},
 Mayrena:{name:'Mayrena',color:'#e4c4ed',side:'right'},
 David:{name:'David',color:'#c1e996',side:'right'},
 Rosi:{name:'Rosi',color:'#f4b7d9',side:'right'},
 Rost:{name:'Rost',color:'#ddce9a',side:'right'},
 Central:{name:'Central',color:'#c2dfbd',side:'right'},
 Superior:{name:'Superior',color:'#b9cfcc',side:'right'},
 'Una voz':{name:'Una voz',color:'#bbcbc9',side:'right'},
 Onésimo:{name:'Onésimo',color:'#edca86',side:'right'},
 Narración:{name:'Narración',color:'#e5e1d8',side:'center'}
};
const aliases={Marta:'Martuki','Marta Aragó':'Martuki',Javier:'Javi','Javier Armuña':'Javi',Dimitri:'Javi','Dimitri Tontitsky':'Javi','Dimitri Tontotsky':'Javi','Elisa Martín':'Elisa','Elisa Marton':'Elisa','Oso Martín':'Martín',Bofe:'Josep','Bofe Tónovich':'Josep'};
export function speakerStyle(name){return SPEAKERS[aliases[name]??name]??SPEAKERS.Narración;}
export function conversationPartner(pages,index){
 const other=p=>p?.speaker&&speakerStyle(p.speaker).side==='right';
 if(other(pages[index]))return pages[index].speaker;
 for(let i=index-1;i>=0;i--)if(other(pages[i]))return pages[i].speaker;
 return pages.find(other)?.speaker??null;
}
// Reclaim the old navigation strip and reserve only the space this caption needs.
export function captionLayout(page){
 const lines=wrapPixelText(page.text,452,1.5),offset=speakerStyle(page.speaker).side==='center'?6:21;
 return {lines,offset,top:270-offset-Math.max(1,lines.length)*14-8};
}
export function drawDialogueCaption(ctx,page,{top=captionLayout(page).top}={}){
 const active=speakerStyle(page.speaker);
 ctx.save();ctx.fillStyle='#0b1424';ctx.fillRect(0,top,480,270-top);
 ctx.fillStyle='#536173';ctx.fillRect(12,top,456,.5);
 // A single clipped-corner nameplate: side + label + color identify the speaker.
 if(active.side!=='center'){
  const label=page.speakerLabel??active.name;
  const width=Math.max(80,Math.ceil(pixelTextWidth(label,1.25))+32);
  const x=active.side==='left'?14:466-width,y=top-10;
  ctx.fillStyle='#030914';ctx.fillRect(x+2,y+3,width,20);
  ctx.fillStyle=active.color;ctx.fillRect(x+2,y,width-4,20);ctx.fillRect(x,y+2,width,16);
  ctx.fillStyle='#17283c';ctx.fillRect(x+2,y+2,width-4,16);
  pixelText(ctx,label,x+width/2,y+5.5,1.25,active.color);
 }
 wrapPixelText(page.text,452,1.5).forEach((line,i)=>pixelText(ctx,line,14+pixelTextWidth(line,1.5)/2,top+(active.side==='center'?6:21)+i*14,1.5,active.color));
 ctx.restore();
}
