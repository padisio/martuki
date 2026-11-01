// Real image transfer + decoding progress. Shared by the browser and offline APK.
export function formatBytes(bytes){
 if(bytes<1e6)return `${(bytes/1e3).toFixed(0)} KB`;
 return `${(bytes/1e6).toFixed(1)} MB`;
}
async function decodeBlob(blob){
 const url=URL.createObjectURL(blob),image=new Image();
 try{image.src=url;await image.decode();return image;}finally{URL.revokeObjectURL(url);}
}
export class AssetLoader{
 constructor(urls,{fetcher=(...args)=>fetch(...args),decode=decodeBlob,now=()=>performance.now(),timing=url=>performance.getEntriesByName(url).at(-1),baseURL='http://localhost/',local=false,idleMs=45000}={}){
  this.fetcher=fetcher;this.decode=decode;this.now=now;this.timing=timing;this.baseURL=baseURL;this.local=local;this.idleMs=idleMs;
  this.entries=new Map([...new Set(urls)].map(url=>[url,{url,bytes:0,total:0,state:'queued',source:null,image:null}]));
  this.started=this.lastActivity=now();this.finished=false;this.error=null;this.controller=new AbortController();
 }
 snapshot(){
  const entries=[...this.entries.values()],done=entries.filter(e=>e.state==='done').length;
  const weight=entries.reduce((n,e)=>n+(e.state==='done'?1:e.state==='decoding'? .9:e.total?Math.min(.9,.9*e.bytes/e.total):0),0);
  const bytes=entries.reduce((n,e)=>n+e.bytes,0),networkBytes=entries.reduce((n,e)=>n+(e.source==='network'?e.networkBytes:0),0);
  const cached=entries.filter(e=>e.source==='cache').length,unknown=entries.filter(e=>e.source==='unknown').length;
  const active=entries.filter(e=>['fetching','decoding'].includes(e.state));
  const elapsed=Math.max(.001,(this.now()-this.started)/1000);
  return {total:entries.length,done,bytes,networkBytes,cached,unknown,local:this.local,
   percent:this.finished?100:Math.min(99,Math.floor(weight/Math.max(1,entries.length)*100)),
   speed:(this.local?bytes:networkBytes)/elapsed,elapsed,
   stalled:!this.finished&&!this.error&&this.now()-this.lastActivity>10000,
   phase:this.error?'error':this.finished?'ready':active.some(e=>e.state==='fetching')?'transfer':active.length?'decoding':'preparing',
   file:active.at(-1)?.url??'',error:this.error?.message??null};
 }
 async transfer(entry){
  entry.state='fetching';let timeout;
  const arm=()=>{clearTimeout(timeout);timeout=setTimeout(()=>{
   const error=new Error(`Sin respuesta al cargar ${entry.url}. Comprueba la conexión y reintenta.`);
   this.error??=error;this.controller.abort(error);
  },this.idleMs);};
  try{
   arm();const response=await this.fetcher(entry.url,{signal:this.controller.signal});
   if(!response.ok)throw new Error(`No se pudo cargar ${entry.url} (HTTP ${response.status}).`);
   entry.total=Number(response.headers.get('content-length'))||0;
   let blob;
   if(response.body?.getReader){
    const reader=response.body.getReader(),chunks=[];
    for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);entry.bytes+=value.byteLength;this.lastActivity=this.now();arm();}
    blob=new Blob(chunks,{type:response.headers.get('content-type')||'image/png'});
   }else{blob=await response.blob();entry.bytes=blob.size;this.lastActivity=this.now();}
   clearTimeout(timeout);
   const resource=this.timing(new URL(entry.url,this.baseURL).href);
   if(this.local)entry.source='local';
   else if(resource?.transferSize===0&&resource.decodedBodySize>0)entry.source='cache';
   else if(resource?.transferSize>0){entry.source='network';entry.networkBytes=resource.transferSize===300?0:(resource.encodedBodySize||entry.bytes);}
   else entry.source='unknown';
   entry.state='decoding';
   // A decoded image can also stall; never leave an indefinite loading screen.
   entry.image=await Promise.race([this.decode(blob,entry.url),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error(`No se pudo preparar ${entry.url}. Reintenta la carga.`)),this.idleMs);})]);
   entry.state='done';this.lastActivity=this.now();
  }catch(error){this.error??=error;entry.state='error';this.controller.abort(this.error);throw this.error;}
  finally{clearTimeout(timeout);}
 }
 async preload(concurrency=6){
  const entries=[...this.entries.values()];let cursor=0;
  await Promise.all(Array.from({length:Math.min(concurrency,entries.length)},async()=>{
   while(cursor<entries.length){if(this.controller.signal.aborted)throw this.error;await this.transfer(entries[cursor++]);}
  }));
 }
 load=url=>{const entry=this.entries.get(url);if(entry?.state!=='done')throw new Error(`Recurso sin preparar: ${url}`);return entry.image;};
 ready(){if([...this.entries.values()].some(e=>e.state!=='done'))throw new Error('Todavía quedan recursos pendientes');this.finished=true;}
}

export function loadingView(state){
 const status=state.phase==='error'?'NO SE HA PODIDO COMPLETAR LA CARGA':state.phase==='ready'?'TODO LISTO':state.stalled?'LA CARGA ESTÁ TARDANDO MÁS DE LO HABITUAL':state.local?'LEYENDO RECURSOS DE LA APP':state.phase==='decoding'?'PREPARANDO IMÁGENES':state.phase==='preparing'?'PREPARANDO LA MISIÓN':'RECIBIENDO IMÁGENES';
 const speed=state.local?`${formatBytes(state.speed)}/s`:state.networkBytes?`${formatBytes(state.speed)}/s`:state.cached?'Desde caché':'Midiendo…';
 const detail=state.error??(state.stalled?'Sin datos nuevos en los últimos 10 s. Esperando respuesta…':state.local?'Carga local · no requiere descargar archivos':state.cached||state.networkBytes?`${formatBytes(state.networkBytes)} descargados · ${state.cached} archivos desde caché`:'Comprobando conexión y caché del navegador…');
 return {status,speed,detail,speedLabel:state.local?'LECTURA MEDIA':'DESCARGA MEDIA',file:state.file.replace(/^assets\//,'')};
}

export async function prepareGameAssets(loadVisualAssets,loadStoryAssets){
 const $=id=>document.getElementById(id),urls=new Set();
 // Enumerate through the actual loaders so the denominator cannot omit a chapter.
 const collect=async url=>{urls.add(url);return {};};
 await Promise.all([loadVisualAssets(collect),loadStoryAssets(collect)]);
 performance.setResourceTimingBufferSize?.(2000);
 const loader=new AssetLoader(urls,{baseURL:document.baseURI,local:document.documentElement.classList.contains('android-app')});
 const render=()=>{
  const state=loader.snapshot(),view=loadingView(state);
  $('loadingPercent').textContent=`${state.percent}%`;$('loadingBar').value=state.percent;
  $('loadingStatus').textContent=view.status;$('loadingDetail').textContent=view.detail;
  $('loadingFiles').textContent=`${state.done} / ${state.total}`;$('loadingBytes').textContent=formatBytes(state.bytes);
  $('loadingSpeed').textContent=view.speed;$('loadingSpeedLabel').textContent=view.speedLabel;
  $('loadingFile').textContent=view.file;$('loadingRetry').hidden=!state.error&&!state.stalled;
  $('loading').classList.toggle('loading-error',!!state.error);
 };
 $('loadingRetry').onclick=()=>location.reload();
 render();const timer=setInterval(render,200);
 try{
  await loader.preload();
  const [assets,illustrations]=await Promise.all([loadVisualAssets(loader.load),loadStoryAssets(loader.load)]);
  return {assets,illustrations,complete(){loader.ready();render();clearInterval(timer);},fail(error){loader.error=error;render();clearInterval(timer);}};
 }catch(error){loader.error??=error;render();clearInterval(timer);throw error;}
}
