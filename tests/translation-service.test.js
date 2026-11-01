import test from 'node:test';
import assert from 'node:assert/strict';
import {createTranslator,splitTranslationText} from '../src/translation-service.js';

test('splits on UTF-8 byte boundaries and preserves the text',()=>{
 const text='안녕하세요 '.repeat(100)+'\nhello';const parts=splitTranslationText(text);
 assert.equal(parts.join(''),text);assert.ok(parts.every(p=>new TextEncoder().encode(p).length<=450));
});
test('uses anonymous auto-detection, deduplicates and checks response',async()=>{
 let calls=0;const translate=createTranslator({fetcher:async url=>{calls++;const u=new URL(url);assert.equal(u.searchParams.get('langpair'),'autodetect|ko');return {ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:'번역문'}})};}});
 assert.deepEqual(await Promise.all([translate('hello','ko'),translate('hello','ko')]),['번역문','번역문']);assert.equal(calls,1);
});
test('returns error for quota failures and HTTP failures rather than displaying service warnings',async()=>{
 for(const response of [{ok:false},{ok:true,json:async()=>({responseStatus:200,quotaFinished:true,responseData:{translatedText:'MYMEMORY WARNING'}})}]){
  const translate=createTranslator({fetcher:async()=>response});await assert.rejects(()=>translate('hello','ko'));
 }
});
test('limits concurrency and cancels queued requests when translation is turned off',async()=>{
 let calls=0,release;const waiting=new Promise(r=>{release=r;});
 const translate=createTranslator({fetcher:async()=>{calls++;await waiting;return {ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:'ok'}})};}});
 const pending=Array.from({length:5},(_,i)=>translate('content '+i,'en').catch(()=>null));
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(calls,2);translate.cancel();release();await Promise.all(pending);assert.equal(calls,2);
});
test('preserves same-language text when MyMemory returns its distinct-languages response',async()=>{
 const translate=createTranslator({fetcher:async()=>({ok:true,json:async()=>({responseStatus:'403',responseDetails:'PLEASE SELECT TWO DISTINCT LANGUAGES',responseData:{translatedText:'PLEASE SELECT TWO DISTINCT LANGUAGES'}})})});
 assert.equal(await translate('안녕하세요','ko'),'안녕하세요');
});
