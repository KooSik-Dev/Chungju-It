// Public, keyless MyMemory API. Submitted text is processed by a third party.
export const TRANSLATION_URL='https://api.mymemory.translated.net/get';
const supported=new Set(['ko','en','vi','km','zh-CN','th','ru','ja']);
const encoder=new TextEncoder();
const queue=[];let activeRequests=0;
function schedule(task,priority){return new Promise((resolve,reject)=>{queue.push({task,priority,resolve,reject});queue.sort((a,b)=>b.priority-a.priority);pump();});}
function pump(){while(activeRequests<2&&queue.length){const job=queue.shift();activeRequests++;Promise.resolve().then(job.task).then(job.resolve,job.reject).finally(()=>{activeRequests--;pump();});}}
export function splitTranslationText(text,maxBytes=450){
 const result=[];let chunk='';
 for(const ch of String(text)){if(chunk&&encoder.encode(chunk+ch).length>maxBytes){result.push(chunk);chunk='';}chunk+=ch;if(ch==='\n'){result.push(chunk);chunk='';}}
 if(chunk)result.push(chunk);return result;
}
export function createTranslator({fetcher=fetch,limit=50,priority=0}={}){
 const cache=new Map(),controllers=new Set();let requests=0,stopped=false;
 async function translate(text,target){
  if(!supported.has(target)||typeof text!=='string'||!text.trim())return text;
  const key=target+'\0'+text;if(cache.has(key))return cache.get(key);
  const work=(async()=>{
   let output='';for(const piece of splitTranslationText(text)){
    if(!piece.trim()){output+=piece;continue;}if(stopped)throw new Error('번역이 중지되었습니다.');if(++requests>limit)throw new Error('번역 요청 한도에 도달했습니다.');
    const result=await schedule(async()=>{
     if(stopped)throw new Error('번역이 중지되었습니다.');
     const url=new URL(TRANSLATION_URL);url.searchParams.set('q',piece);url.searchParams.set('langpair','autodetect|'+target);
     const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),10000);
     try{
      const response=await fetcher(url.href,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok)throw new Error('번역 서비스에 연결할 수 없습니다.');
      const data=await response.json(),translated=data?.responseData?.translatedText;
      // MyMemory reports identical detected source/target as a 403 payload, not a translation error.
      if(Number(data?.responseStatus)===403&&/PLEASE SELECT TWO DISTINCT LANGUAGES/i.test(String(data?.responseDetails||translated)))return piece;
      if(data?.quotaFinished||Number(data?.responseStatus)!==200||typeof translated!=='string'||!translated.trim()||/MYMEMORY WARNING|INVALID (?:SOURCE|TARGET) LANGUAGE|QUOTA EXCEEDED/i.test(translated))throw new Error('번역 서비스 한도 또는 응답을 확인해 주세요.');
      return translated;
     }catch(error){translate.cancel();throw error;}finally{clearTimeout(timer);controllers.delete(controller);}
    },priority);output+=result;
   }return output;
  })();cache.set(key,work);try{return await work;}catch(error){cache.delete(key);throw error;}
 }
 translate.cancel=()=>{stopped=true;for(const controller of controllers)controller.abort();};
 return translate;
}
