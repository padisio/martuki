import test from 'node:test';
import assert from 'node:assert/strict';
import {AssetLoader,loadingView,formatBytes} from '../web/asset-loader.js';

const response=(size=100)=>new Response(new Uint8Array(size),{headers:{'content-length':String(size),'content-type':'image/png'}});
const network=size=>({transferSize:size+300,encodedBodySize:size,decodedBodySize:size});
const defaults={decode:async()=>({decoded:true}),timing:()=>network(100)};

test('progress includes streamed bytes, waits for decode and never finishes before ready',async()=>{
 let stream,finishDecode;const decoded=new Promise(resolve=>finishDecode=resolve);
 const loader=new AssetLoader(['a.png'],{...defaults,fetcher:async()=>new Response(new ReadableStream({start(c){stream=c;}}),{headers:{'content-length':'100'}}),decode:()=>decoded});
 const loading=loader.preload();await new Promise(r=>setImmediate(r));
 stream.enqueue(new Uint8Array(50));await new Promise(r=>setImmediate(r));
 assert.equal(loader.snapshot().bytes,50);assert.equal(loader.snapshot().percent,45);assert.equal(loader.snapshot().done,0);
 stream.enqueue(new Uint8Array(50));stream.close();await new Promise(r=>setImmediate(r));
 assert.equal(loader.snapshot().phase,'decoding');assert.equal(loader.snapshot().percent,90);
 finishDecode({decoded:true});await loading;
 assert.equal(loader.snapshot().percent,99);assert.equal(loader.snapshot().done,1);assert.equal(loader.load('a.png').decoded,true);
 loader.ready();assert.equal(loader.snapshot().percent,100);
});

test('bounded concurrency deduplicates assets and returns every decoded image',async()=>{
 let active=0,maximum=0,calls=0;
 const loader=new AssetLoader(['a','b','c','a','d'],{...defaults,fetcher:async()=>{calls++;return response();},decode:async()=>{active++;maximum=Math.max(active,maximum);await new Promise(r=>setTimeout(r,5));active--;return {};}});
 await loader.preload(2);assert.equal(maximum,2);assert.equal(calls,4);assert.equal(loader.snapshot().done,4);
});

test('cached bytes never become fictitious download speed',async()=>{
 let time=0;const loader=new AssetLoader(['cached'],{...defaults,fetcher:async()=>response(),now:()=>time,timing:()=>({transferSize:0,decodedBodySize:100})});
 await loader.preload();time=2000;
 assert.equal(loader.snapshot().bytes,100);assert.equal(loader.snapshot().networkBytes,0);assert.equal(loader.snapshot().speed,0);
 assert.equal(loadingView(loader.snapshot()).speed,'Desde caché');
});

test('network average uses confirmed transferred payload, not cache or 304 body sizes',async()=>{
 let time=0;const loader=new AssetLoader(['net','cached','validated'],{...defaults,now:()=>time,fetcher:async()=>response(),timing:url=>url.endsWith('/cached')?{transferSize:0,decodedBodySize:100}:url.endsWith('/validated')?{transferSize:300,encodedBodySize:100,decodedBodySize:100}:network(100)});
 await loader.preload();time=2000;assert.equal(loader.snapshot().networkBytes,100);assert.equal(loader.snapshot().speed,50);assert.equal(loader.snapshot().cached,1);
});

test('missing timing data is not falsely classified as cached or downloaded',async()=>{
 const loader=new AssetLoader(['a'],{...defaults,fetcher:async()=>response(),timing:()=>undefined});
 await loader.preload();assert.equal(loader.snapshot().unknown,1);assert.equal(loader.snapshot().networkBytes,0);assert.equal(loader.snapshot().cached,0);
});

test('APK reports local reading, not an Internet download',async()=>{
 let time=0;const loader=new AssetLoader(['a'],{...defaults,local:true,now:()=>time,fetcher:async()=>response()});
 await loader.preload();time=1000;const state=loader.snapshot();
 assert.equal(state.speed,100);assert.equal(state.networkBytes,0);assert.equal(loadingView(state).speedLabel,'LECTURA MEDIA');
 assert.match(loadingView(state).detail,/no requiere descargar/);
});

test('unknown length and no streaming body still load correctly',async()=>{
 const loader=new AssetLoader(['a'],{...defaults,fetcher:async()=>({ok:true,headers:new Headers(),body:null,blob:async()=>new Blob([new Uint8Array(100)])})});
 await loader.preload();assert.equal(loader.snapshot().bytes,100);assert.equal(loader.snapshot().done,1);
});

test('HTTP and decode errors give a recoverable failure instead of a hanging screen',async()=>{
 const badHttp=new AssetLoader(['missing.png'],{...defaults,fetcher:async()=>new Response('',{status:404})});
 await assert.rejects(badHttp.preload(),/HTTP 404/);assert.equal(badHttp.snapshot().phase,'error');assert.equal(badHttp.snapshot().percent,0);
 const badImage=new AssetLoader(['bad.png'],{...defaults,fetcher:async()=>response(),decode:async()=>{throw new Error('Imagen dañada');}});
 await assert.rejects(badImage.preload(),/Imagen dañada/);assert.match(loadingView(badImage.snapshot()).detail,/Imagen dañada/);
});

test('stalled connections are visible and time out with retry guidance',async()=>{
 let time=0;const loader=new AssetLoader(['slow.png'],{...defaults,idleMs:30,now:()=>time,fetcher:(_, {signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))});
 const pending=assert.rejects(loader.preload(),/Sin respuesta/);time=11000;
 assert.equal(loader.snapshot().stalled,true);assert.match(loadingView(loader.snapshot()).detail,/10 s/);
 await pending;assert.equal(loader.snapshot().phase,'error');
});

test('a stalled decoder also terminates with an error',async()=>{
 const loader=new AssetLoader(['bad.png'],{...defaults,idleMs:20,fetcher:async()=>response(),decode:()=>new Promise(()=>{})});
 await assert.rejects(loader.preload(),/No se pudo preparar/);
});

test('human-readable data units use decimal KB and MB',()=>{
 assert.equal(formatBytes(12000),'12 KB');assert.equal(formatBytes(2500000),'2.5 MB');
});
