import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const root=new URL(process.env.MARTUKI_DIST??'../dist/',import.meta.url);
const {KEY_BINDINGS,cinematicDirection}=await import(new URL('keyboard-controls.js',root));
const source=await readFile(new URL('game.js',root),'utf8');
const start=source.indexOf("window.addEventListener('keydown',e=>",source.indexOf('// Browser fullscreen'));
const end=source.indexOf("window.addEventListener('blur'",start);
function harness(active='story'){
 const listeners={},keys=new Set(),story={active:active==='story',mode:'sequence',automatic:false,index:2,next(){if(!this.automatic)this.index++;},previous(){this.index--;}};
 const conversation={active:active==='conversation',index:2,previous(){this.index--;}};
 const env={window:{addEventListener:(name,fn)=>listeners[name]=fn},story,conversation,keys,mapping:KEY_BINDINGS,cinematicDirection,ready:true,clearInput:()=>keys.clear(),syncStoryUI(){},syncConversationUI(){},advanceConversation(){keys.clear();conversation.index++;},sound(){},pause(){},play(){},$:()=>({hidden:true})};
 runInNewContext(source.slice(start,end),env);
 return {story,conversation,keys,press:(code,extra={})=>listeners.keydown({code,preventDefault(){},...extra}),release:code=>listeners.keyup({code})};
}
for(const active of ['story','conversation'])test(`A/D navigate ${active} without adding movement or skipping on hold`,()=>{
 const h=harness(active),page=h[active];h.keys.add('left');h.press('KeyD');assert.equal(page.index,3);assert.equal(h.keys.size,0);
 h.press('KeyD',{repeat:true});assert.equal(page.index,3);h.press('KeyA');assert.equal(page.index,2);assert.equal(h.keys.size,0);
 h.press('ArrowRight');h.press('ArrowLeft');assert.equal(page.index,2);
 h.press('KeyD',{ctrlKey:true});assert.equal(page.index,2);
});
test('automatic shots retain their timing and A/D return to movement in combat',()=>{
 const h=harness();h.story.automatic=true;h.press('KeyD');h.press('KeyA');assert.equal(h.story.index,2);
 h.story.active=false;h.press('KeyD');assert.ok(h.keys.has('right'));h.release('KeyD');assert.equal(h.keys.size,0);
 h.press('KeyA');assert.ok(h.keys.has('left'));h.release('KeyA');assert.equal(h.keys.size,0);
});
