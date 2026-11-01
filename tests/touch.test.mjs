import test from 'node:test';
import assert from 'node:assert/strict';
const root=new URL(process.env.MARTUKI_DIST??'../dist/',import.meta.url);
const {stickDirections,installTouchControls}=await import(new URL('touch-controls.js',root));
const {Game}=await import(new URL('core.js',root));
function node(action){const events=new Map(),classes=new Set();return {events,dataset:{hold:action},style:{setProperty(){}},classList:{add(c){classes.add(c);},remove(c){classes.delete(c);}},addEventListener(e,handler){events.set(e,handler);},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}};}
const fire=(n,type,id=1,x=50,y=50)=>n.events.get(type)({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
test('stick has a dead zone and coherent eight-way diagonals',()=>{
 assert.deepEqual(stickDirections(.1,.1),[]);assert.deepEqual(stickDirections(1,0),['right']);assert.deepEqual(stickDirections(-1,-1),['left','up']);assert.deepEqual(stickDirections(100,100),['right','down']);
});

test('every angle outside the dead zone yields movement, including light drags',()=>{
 for(let a=0;a<Math.PI*2;a+=.05)assert.ok(stickDirections(Math.cos(a)*.21,Math.sin(a)*.21).length>0);
 assert.deepEqual(stickDirections(.25,0),['right']);assert.deepEqual(stickDirections(0,-.25),['up']);
});
test('movement and two action fingers release independently, including capture loss',()=>{
 const joystick=node(),knob=node(),shoot=node('shoot'),punch=node('punch');let input;
 const controller=installTouchControls({joystick,knob,buttons:[shoot,punch],onChange:value=>input=value});
 fire(joystick,'pointerdown',1,82,50);fire(shoot,'pointerdown',2);fire(punch,'pointerdown',3);assert.deepEqual([...input],['right','shoot','punch']);
 fire(shoot,'pointerup',2);assert.deepEqual([...input],['right','punch']);
 fire(joystick,'lostpointercapture',1);assert.deepEqual([...input],['punch']);
 fire(punch,'pointercancel',3);assert.equal(input.size,0);
 fire(joystick,'pointerdown',1,20,50);fire(shoot,'pointerdown',2);controller.clear();assert.equal(input.size,0);
 fire(joystick,'pointermove',1,80,50);assert.equal(input.size,0);
});
test('a second stick finger cannot steal movement and releasing one duplicate action keeps the other',()=>{
 const joystick=node(),shoot=node('shoot');let input;installTouchControls({joystick,knob:node(),buttons:[shoot],onChange:value=>input=value});
 fire(joystick,'pointerdown',1,82,50);fire(joystick,'pointerdown',2,18,50);fire(joystick,'pointerup',2);assert.deepEqual([...input],['right']);
 fire(shoot,'pointerdown',3);fire(shoot,'pointerdown',4);fire(shoot,'pointerup',3);assert.ok(input.has('shoot'));fire(shoot,'pointerup',4);assert.deepEqual([...input],['right']);
});


test('document releases clear only their own finger even when an ability becomes disabled',()=>{
 const document=node(),joystick=node(),ability=node('summon');joystick.ownerDocument=document;let input;
 installTouchControls({joystick,knob:node(),buttons:[ability],onChange:value=>input=value});
 fire(joystick,'pointerdown',1,82,50);fire(ability,'pointerdown',2);ability.disabled=true;
 fire(document,'pointerup',2);assert.deepEqual([...input],['right']);
 fire(document,'pointercancel',1);assert.equal(input.size,0);
 fire(joystick,'pointerdown',3,18,50);assert.deepEqual([...input],['left']);
});
test('capture failure still allows moving outside the stick and releasing without a stuck owner',()=>{
 const document=node(),joystick=node();joystick.ownerDocument=document;joystick.setPointerCapture=()=>{throw Error('capture lost');};let input;
 installTouchControls({joystick,knob:node(),buttons:[],onChange:value=>input=value});
 fire(joystick,'pointerdown',1,82,50);assert.deepEqual([...input],['right']);
 fire(document,'pointermove',1,-20,50);assert.deepEqual([...input],['left']);
 fire(document,'pointerup',1);assert.equal(input.size,0);
 fire(joystick,'pointerdown',2,82,50);assert.deepEqual([...input],['right']);
});
test('pausing clears and releases every captured finger before the next gesture',()=>{
 const joystick=node(),shoot=node('shoot'),released=[];let input;
 for(const n of [joystick,shoot]){n.hasPointerCapture=()=>true;n.releasePointerCapture=id=>released.push(id);}
 const c=installTouchControls({joystick,knob:node(),buttons:[shoot],onChange:value=>input=value});
 fire(joystick,'pointerdown',1,82,50);fire(shoot,'pointerdown',2);c.clear();
 assert.deepEqual(released,[1,2]);assert.equal(input.size,0);
 fire(joystick,'pointerdown',3,18,50);fire(shoot,'lostpointercapture',2);assert.deepEqual([...input],['left']);
});
test('movement reaches the combat engine while another finger holds any attack or ability',()=>{
 for(const action of ['punch','shoot','knife','special','summon','dodge']){
  const g=new Game(()=>.5);g.reset();g.phase='fight';g.player.x=335;g.camera=180;g.bofeUnlocked=true;
  const joystick=node(),button=node(action);let input;
  installTouchControls({joystick,knob:node(),buttons:[button],onChange:value=>input=Object.fromEntries([...value].map(k=>[k,true]))});
  fire(joystick,'pointerdown',1,82,50);fire(button,'pointerdown',2);
  for(let i=0;i<30;i++)g.update(1/60,input);
  assert.ok(g.player.x>375,action+' must not lock walking');
  fire(button,'pointerup',2);assert.deepEqual(input,{right:true});
  fire(joystick,'pointerup',1);assert.deepEqual(input,{});
 }
});
