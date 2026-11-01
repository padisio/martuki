import {clamp,FUSION_BEATS,BOSS_BEATS,OFFICE_BOSS_BEATS,BOFE_BEATS} from './core.js?v=52';
import {pixelText,pixelTextWidth} from './pixel-font.js?v=52';
import {BEAR_BEATS} from './laboratory-combat.js?v=52';

// Current character masters, recovered from the project's design conversations.
export const SPLASH_CAST={
 elisa:{art:'elisa-approved-v6',names:['Elisa Martón'],name:'Elisa Martón',tag:'RESPONSABLE DEL LABORATORIO',color:'#b7e7ae'},
 martin:{art:'martin-approved-v5',names:['Elisa Martón'],name:'Elisa Martón y el Oso Martín',tag:'ENLACE BIOLÓGICO · SEGUNDA FASE',color:'#efb084'},
 dimitri:{art:'dimitri-v3',names:['Javier Armuña'],name:'Dimitri Tontotsky',russian:'ДМИТРИЙ ТОНТОЦКИЙ',tag:'IDENTIDAD COMPROMETIDA',color:'#f16a4c'},
 marixas:{before:'jasmin-maria',art:'marixas',names:['Jasmín Matamoros','María Giner'],name:'Marixásmin Matatodosk',russian:'МАРИКСАС МАТАТОДОВСКА',tag:'FUSIÓN BIOLÓGICA',color:'#79edbb'},
 mayrena:{before:'mayte-lorena',art:'mayrena-redesign-v3',names:['Mayte Aguilar','Lorena Aguayo'],name:'Mayrena Disenyostka',tag:'CERÁMICA VIVA',color:'#9ab9ff'},
 rost:{before:'rosi-david',art:'rost-vidf',names:['Rosi Rubio Rubio','David Muñoz Muñoz'],name:'Rost-Vidf Rubiñoz Rubiñoz',tag:'DOS CABEZAS · UNA AMENAZA',color:'#f4ba65'},
 bofe:{art:'bofe',names:['Josep Fabregat'],name:'Bofe Tónovich',tag:'ALIADO · JUDO',color:'#73dbff',ally:true}
};
export const SPLASH_FILES=[...new Set(Object.values(SPLASH_CAST).flatMap(c=>[c.before,c.art]).filter(Boolean))];
export async function loadSplashAssets(loadImage){
 return Object.fromEntries(await Promise.all(SPLASH_FILES.map(async key=>[key,await loadImage(`assets/boss-splashes-v1/${key}.jpg`)])));
}

export function splashTiming(key){
 return key==='dimitri'?OFFICE_BOSS_BEATS:key==='martin'?BEAR_BEATS:key==='bofe'?BOFE_BEATS:SPLASH_CAST[key]?.before?{splash:FUSION_BEATS.fusion,...FUSION_BEATS}:BOSS_BEATS;
}
export function splashPresentation(key,t){
 const cast=SPLASH_CAST[key];if(!cast)throw new Error('Unknown splash: '+key);
 const fusion=!!cast.before;
 const beats=splashTiming(key),start=beats.splash,cross=beats.nameCross,reveal=beats.nameDrop,exit=beats.nameExit;
 const visible=t>=start&&t<exit+.6;
 return {visible,start,reveal,exit,art:cast.before&&t<reveal?cast.before:cast.art,
  realNames:t<reveal+.25,strike:clamp((t-cross)/.34,0,1),
  bossName:t>=reveal,drop:clamp((t-reveal)/.65,0,1),
  opacity:clamp((t-start)/.18,0,1)*(1-clamp((t-exit)/.55,0,1))};
}

function strike(ctx,label,x,y,scale,q){
 if(!q)return;const w=pixelTextWidth(label,scale)+10,left=x-w/2;
 ctx.strokeStyle='#ff514e';ctx.lineWidth=2.5;ctx.lineCap='square';
 ctx.beginPath();ctx.moveTo(left,y+10);ctx.lineTo(left+w*q,y+10-7*q);ctx.stroke();
 ctx.beginPath();ctx.moveTo(left+3,y+2);ctx.lineTo(left+3+w*q,y+2+9*q);ctx.stroke();
}
export function drawBossSplash(ctx,assets,key,t){
 const cast=SPLASH_CAST[key],s=splashPresentation(key,t);if(!s.visible)return false;
 const img=assets[s.art];if(!img)throw new Error('Missing splash art: '+s.art);
 ctx.save();ctx.globalAlpha*=s.opacity;
 ctx.beginPath();ctx.rect(0,0,480,270);ctx.clip();
 ctx.fillStyle='#07101d';ctx.fillRect(0,0,480,270);
 const entering=clamp((t-s.start)/.55,0,1),reveal=clamp((t-s.reveal)/.7,0,1);
 const drift=(1-entering)*28;
 const zoom=1+(1-entering)*.12+(s.bossName?(1-reveal)*.09:0);
 ctx.save();ctx.imageSmoothingEnabled=true;
 if(cast.before&&s.bossName&&reveal<1){
  ctx.drawImage(assets[cast.before],0,0,480,270);
  ctx.beginPath();ctx.moveTo(240-320*reveal,0);ctx.lineTo(240+320*reveal,0);ctx.lineTo(240+360*reveal,270);ctx.lineTo(240-360*reveal,270);ctx.closePath();ctx.clip();
 }
 ctx.drawImage(img,240-240*zoom+drift,135-135*zoom,480*zoom,270*zoom);ctx.restore();
 // Animated speed lines sweep around the portraits, leaving their faces clear.
 const motion=1-entering,transform=cast.before?clamp((t-(s.reveal-1.15))/1.15,0,1):0;
 ctx.save();ctx.beginPath();ctx.rect(0,16,480,153);ctx.clip();
 for(let i=0;i<30;i++){
  const y=23+(i*47)%140,side=i%2?1:-1,travel=(t*(180+i%4*50)+i*37)%210;
  const x=side>0?480-travel:travel,len=20+i%6*9;
  ctx.globalAlpha=s.opacity*(.18+motion*.45+(s.bossName?(1-reveal)*.35:0));ctx.strokeStyle=i%3?cast.color:'#fff4d6';ctx.lineWidth=i%4===0?2:1;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+side*len,y-side*len*.08);ctx.stroke();
 }
 // Inward streaks and an expanding ring connect the two human forms to the boss.
 if(transform>0&&t<s.reveal+.7){
  const power=t<s.reveal?transform:1-reveal;
  ctx.globalAlpha*=Math.max(.2,power);ctx.strokeStyle=cast.color;
  for(let i=0;i<20;i++){const a=i*Math.PI/10+t*1.7,r=25+(1-power)*220;ctx.beginPath();ctx.moveTo(240+Math.cos(a)*r,127+Math.sin(a)*r*.6);ctx.lineTo(240+Math.cos(a)*(r+65),127+Math.sin(a)*(r+65)*.6);ctx.stroke();}
  ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(240,127,25+reveal*300,18+reveal*180,0,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
 // A gradient keeps text readable without covering the faces with an opaque card.
 const shade=ctx.createLinearGradient(0,169,0,270);shade.addColorStop(0,'#07101d00');shade.addColorStop(.48,'#07101dc9');shade.addColorStop(1,'#07101dfc');
 ctx.fillStyle=shade;ctx.fillRect(0,169,480,101);
 if(s.realNames){
  ctx.save();ctx.globalAlpha*=1-clamp((t-s.reveal)/.25,0,1);
  cast.names.forEach((label,i)=>{
   const x=cast.names.length===2?120+i*240:240,y=208;
   pixelText(ctx,label,x+1,y+1,2,'#050a15');pixelText(ctx,label,x,y,2,s.strike?'#c5b9ac':'#fff0d9');strike(ctx,label,x,y,2,s.strike);
  });ctx.restore();
 }
 if(s.bossName){
  const scale=pixelTextWidth(cast.name,3)<=448?3:2;
  let y=202-240*(1-s.drop)*(1-s.drop);
  const landed=t-(s.reveal+.65);if(landed>=0&&landed<.25)y-=Math.sin(landed/.25*Math.PI)*5;
  ctx.save();ctx.beginPath();ctx.rect(0,166,480,77);ctx.clip();
  pixelText(ctx,cast.name,242,y+2,scale,'#030a17');pixelText(ctx,cast.name,240,y,scale,cast.color);ctx.restore();
 }
 // Brief impact tint when the new identity slams into place.
 const impact=t-(s.reveal+.65);if(impact>=0&&impact<.09){ctx.globalAlpha*=.16*(1-impact/.09);ctx.fillStyle=cast.color;ctx.fillRect(0,0,480,270);}
 ctx.restore();return true;
}
