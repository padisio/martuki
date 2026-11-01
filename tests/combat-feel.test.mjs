import test from 'node:test';
import assert from 'node:assert/strict';
const root=new URL(process.env.MARTUKI_DIST??'../dist/',import.meta.url);
const {Game}=await import(new URL('core.js',root));
const {clearCombatInput,canEnemyAttack}=await import(new URL('combat-feel.js',root));
const step=(g,n,input={})=>{for(let i=0;i<n;i++)g.update(1/60,input);};
function fresh(){const g=new Game(()=>.5);g.reset();return g;}
function target(g){g.player.x=335;g.spawnStage();g.enemies=g.enemies.slice(0,1);const e=g.enemies[0];Object.assign(e,{x:362,y:g.player.y,state:'chase',hp:1000,maxHp:1000,cd:100,stun:10});return e;}
test('a released tap during recovery chains into the next attack',()=>{const g=fresh();g.update(1/60,{punch:true});step(g,11);g.update(1/60,{punch:true});step(g,8);assert.equal(g.player.action?.kind,'punch');assert.equal(g.player.chain,1);});
test('expired and cleared taps never attack on their own',()=>{const g=fresh();g.player.attackCD=1;g.update(1/60,{punch:true});step(g,70);assert.equal(g.player.action,null);g.player.attackCD=.1;g.update(1/60,{punch:true});clearCombatInput(g.player);step(g,15);assert.equal(g.player.action,null);});
test('holding punch gives two punches then a stronger interrupting finisher',()=>{const g=fresh(),e=target(g);step(g,52,{punch:true});assert.equal(e.hp,944);assert.equal(g.player.action.kind,'kick');assert.equal(e.state,'recover');assert.ok(e.x>390);assert.ok(e.stun>.3);});
test('a melee hit cancels an enemy windup before it connects',()=>{const g=fresh(),e=target(g);Object.assign(e,{state:'windup',timer:.20,stun:0,dir:-1,targetY:g.player.y});step(g,12,{punch:true});assert.equal(g.player.hp,120);assert.equal(e.state,'recover');assert.ok(e.hp<1000);});
test('late recovery cannot damage an enemy entering the old hitbox',()=>{const g=fresh(),e=target(g);e.x=430;g.startAttack('punch');step(g,14);e.x=355;step(g,5);assert.equal(e.hp,1000);});
test('holding dodge does not repeatedly take movement control',()=>{const g=fresh();step(g,100,{dodge:true});assert.equal(g.events.filter(e=>e.type==='dodge').length,1);g.update(1/60);g.update(1/60,{dodge:true});assert.equal(g.events.filter(e=>e.type==='dodge').length,2);});
test('a timed dodge grants exactly one counter and consumes it on a strike',()=>{const g=fresh();g.update(1/60,{dodge:true});assert.equal(g.hurtPlayer(20,1),false);assert.ok(g.player.counter>1);g.hurtPlayer(20,1);assert.equal(g.events.filter(e=>e.type==='perfectDodge').length,1);step(g,18);g.startAttack('knife');assert.equal(g.player.action.counter,true);assert.equal(g.player.counter,0);});
test('a late dodge is safe but grants no counter',()=>{const g=fresh();g.update(1/60,{dodge:true});step(g,9);g.hurtPlayer(20,1);assert.equal(g.player.hp,120);assert.equal(g.player.counter,0);});
test('enemy attack slots prevent simultaneous windups and offscreen attacks',()=>{const g=fresh();g.camera=200;g.time=1;const a=g.makeEnemy(0,330,220),b=g.makeEnemy(1,360,220),c=g.makeEnemy(2,380,220);g.enemies=[a,b,c];assert.equal(canEnemyAttack(g,a),true);a.state='windup';assert.equal(canEnemyAttack(g,b),false);g.time+=.25;assert.equal(canEnemyAttack(g,b),true);b.state='strike';g.time+=.25;assert.equal(canEnemyAttack(g,c),false);a.state='recover';c.x=800;assert.equal(canEnemyAttack(g,c),false);});
test('travel is brisk and movement remains available during attacks',()=>{const g=fresh();step(g,60,{right:true});assert.ok(g.player.x>=264);const h=fresh();target(h);h.enemies[0].x=600;const x=h.player.x;step(h,30,{right:true,punch:true});assert.ok(h.player.x-x>48);});


test('the stick keeps steering throughout the special instead of freezing for a second',()=>{
 const g=fresh();g.phase='fight';g.player.x=335;g.camera=180;g.enemies=[];
 g.update(1/60,{special:true,right:true});const x=g.player.x;
 step(g,30,{right:true});assert.ok(g.player.special>0);assert.ok(g.player.x-x>40);
 const y=g.player.y;step(g,10,{up:true});assert.ok(g.player.y<y-8);
 assert.ok(g.player.specialCD>9);assert.ok(g.player.invuln>0);
});
