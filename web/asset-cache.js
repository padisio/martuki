// Cache immutable release assets on disk; code/HTML still update normally.
export const ASSET_CACHE='martuki-assets-0.18.0-v1';
export function createAssetFetch({fetcher=(...args)=>fetch(...args),storage=globalThis.caches,baseURL=()=>document.baseURI,local=()=>document.documentElement.classList.contains('android-app')}={}){
 let cachePromise,writeDisabled=false;
 const pending=new Set();
 const open=()=>cachePromise??=Promise.resolve().then(()=>storage?.open(ASSET_CACHE)).catch(()=>null);
 const cachedFetch=async(input,options)=>{
  const url=new URL(input,typeof baseURL==='function'?baseURL():baseURL);
  const base=new URL(typeof baseURL==='function'?baseURL():baseURL);
  if(local()||url.origin!==base.origin||!url.pathname.includes('/assets/'))return fetcher(input,options);
  const cache=await open();
  if(cache)try{
   const hit=await cache.match(url.href);
   if(hit){const headers=new Headers(hit.headers);headers.set('X-Martuki-Cache','disk');return new Response(hit.body,{status:hit.status,statusText:hit.statusText,headers});}
  }catch{/* Private mode or unavailable storage: keep playing from the network. */}
  const response=await fetcher(input,options);
  if(cache&&!writeDisabled&&response.ok&&response.status===200){
   const write=cache.put(url.href,response.clone()).catch(()=>{writeDisabled=true;}).finally(()=>pending.delete(write));
   pending.add(write);
  }
  return response;
 };
 cachedFetch.flush=()=>Promise.allSettled([...pending]);
 return cachedFetch;
}
export const assetFetch=createAssetFetch();
