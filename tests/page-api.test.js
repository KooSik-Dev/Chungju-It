import test from 'node:test';
import assert from 'node:assert/strict';
import { saveData, uploadImage, safeImageUrl, PAGE_API_URL, IMAGE_LIMIT, JSON_LIMIT } from '../src/page-api.js';

test('sends bounded JSON with authorization and preserves errors',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 let request;globalThis.fetch=async (url,opts)=>{request={url,opts};return new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}});};
 await saveData({type:'report.created',title:'가로등'});
 assert.equal(request.url,PAGE_API_URL);assert.equal(request.opts.method,'POST');assert.match(request.opts.headers.Authorization,/^Bearer [a-f0-9]+$/);
 assert.equal(request.opts.headers['Content-Type'],'application/json');assert.deepEqual(JSON.parse(request.opts.body),{type:'report.created',title:'가로등'});
 await assert.rejects(saveData({large:'한'.repeat(JSON_LIMIT)}),/64KB/);
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'용량 초과'}),{status:413});await assert.rejects(saveData({a:1}),/용량 초과/);
 globalThis.fetch=async()=>new Response('bad json',{status:500});await assert.rejects(saveData({a:1}),/응답을 확인/);
 globalThis.fetch=async()=>{throw Error('offline');};await assert.rejects(saveData({a:1}),/중복/);
});
test('uploads file field, accepts five formats and validates result URL and size',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let req;
 globalThis.fetch=async(url,opts)=>{req={url,opts};return new Response(JSON.stringify({url:'/uploads/photo.png'}),{status:200});};
 const file=new File(['abc'],'photo.avif',{type:'image/avif'});
 assert.equal(await uploadImage(file),'https://www.koosik.kr/uploads/photo.png');
 assert.equal(req.url,`${PAGE_API_URL}/upload`);assert.equal(req.opts.body.get('file').name,'photo.avif');
 assert.equal('Content-Type' in req.opts.headers,false);
 await assert.rejects(uploadImage(new File(['x'],'a.svg',{type:'image/svg+xml'})),/5MB/);
 await assert.rejects(uploadImage(new File([new Uint8Array(IMAGE_LIMIT+1)],'a.jpg',{type:'image/jpeg'})),/5MB/);
 globalThis.fetch=async()=>new Response('{}',{status:200});await assert.rejects(uploadImage(file),/주소/);
 globalThis.fetch=async()=>new Response(JSON.stringify({url:'javascript:alert(1)'}),{status:200});await assert.rejects(uploadImage(file),/주소/);
 assert.equal(safeImageUrl('https://example.com/image.png'),true);assert.equal(safeImageUrl('http://example.com/image.png'),false);assert.equal(safeImageUrl('https://u:p@example.com/a'),false);
});
