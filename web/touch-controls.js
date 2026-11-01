// One pointer owns the stick; action fingers have independent ownership.
export function stickDirections(x,y,deadZone=.20){
 const length=Math.hypot(x,y);if(length<deadZone)return [];
 x/=length;y/=length;
 return [x<-.38?'left':x>.38?'right':null,y<-.38?'up':y>.38?'down':null].filter(Boolean);
}
export function installTouchControls({joystick,knob,buttons,onChange}){
 const held=new Map(),owners=new Map(),root=joystick.ownerDocument;let stickPointer=null,move=[];
 function capture(node,id){try{node.setPointerCapture(id);}catch{/* Document listeners keep the gesture usable if capture is unavailable. */}}
 function releaseCapture(node,id){try{if(node.hasPointerCapture?.(id))node.releasePointerCapture(id);}catch{}}
 function emit(){onChange(new Set([...move,...held.values()].flat()));}
 function position(x=0,y=0){
  const length=Math.hypot(x,y),scale=Math.max(1,length);
  knob.style?.setProperty('--stick-x',`${x/scale*32}%`);
  knob.style?.setProperty('--stick-y',`${y/scale*32}%`);
 }
 function update(e){
  const r=joystick.getBoundingClientRect();
  const x=(e.clientX-r.left-r.width/2)/(r.width*.32),y=(e.clientY-r.top-r.height/2)/(r.height*.32);
  move=stickDirections(x,y);position(x,y);emit();
 }
 joystick.addEventListener('pointerdown',e=>{
  if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;
  capture(joystick,e.pointerId);joystick.classList.add('held');update(e);
 });
 (root??joystick).addEventListener('pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();update(e);}});
 function releaseStick(e){if(e.pointerId!==stickPointer)return;stickPointer=null;move=[];position();joystick.classList.remove('held');releaseCapture(joystick,e.pointerId);emit();}
 function releaseButton(e,button=owners.get(e.pointerId)){
  if(!button||owners.get(e.pointerId)!==button)return;
  const action=held.get(e.pointerId);held.delete(e.pointerId);owners.delete(e.pointerId);
  if(![...held.values()].includes(action))button.classList.remove('held');releaseCapture(button,e.pointerId);emit();
 }
 // A release outside a control (including a newly disabled ability) must not leave it held.
 for(const event of ['pointerup','pointercancel'])root?.addEventListener(event,e=>{releaseStick(e);releaseButton(e);},{capture:true});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,releaseStick);
 for(const button of buttons){
  const action=button.dataset.hold;
  button.addEventListener('pointerdown',e=>{e.preventDefault();capture(button,e.pointerId);held.set(e.pointerId,action);owners.set(e.pointerId,button);button.classList.add('held');emit();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{
   releaseButton(e,button);
  });
 }
 return {clear(){const captured=[...owners.entries()],stick=stickPointer;held.clear();owners.clear();move=[];stickPointer=null;position();joystick.classList.remove('held');for(const b of buttons)b.classList.remove('held');
  if(stick!==null)releaseCapture(joystick,stick);for(const [id,button]of captured)releaseCapture(button,id);emit();}};
}
