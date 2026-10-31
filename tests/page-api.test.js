import test from 'node:test';
import assert from 'node:assert/strict';
import { pageRequest, listItems, listAllItems, getItem, createItem, updateItem, deleteItem, sendToInbox, uploadImage, safeImageUrl, PAGE_API_URL, IMAGE_LIMIT, JSON_LIMIT } from '../src/page-api.js';

const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json'}});
test('collection operations, pagination, revision and inbox use the defined contract',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);const requests=[];
 globalThis.fetch=async(url,opts)=>{requests.push({url,opts});if(opts.method==='GET'&&url.includes('?')){const offset=new URL(url).searchParams.get('offset');return json(offset==='0'?{ok:true,items:[{id:'1',data:{},revision:1}],next_offset:1}:{ok:true,items:[{id:'2',data:{},revision:2}],next_offset:null});}return json({ok:true,item:{id:'1',revision:2,data:{title:'x'}}});};
 assert.deepEqual((await listAllItems('reports')).map(x=>x.id),['1','2']);
 await getItem('reports','item /');await createItem('reports',{title:'x'});await updateItem('reports','1',2,{title:'y',extra:1});await deleteItem('reports','1',3);await sendToInbox({hello:true});
 assert.match(requests[0].url,/collections\/reports\?limit=50&offset=0$/);assert.match(requests[2].url,/item%20%2F$/);
 assert.deepEqual(JSON.parse(requests[4].opts.body),{revision:2,data:{title:'y',extra:1}});assert.match(requests[5].url,/1\?revision=3$/);assert.equal(requests[6].url,PAGE_API_URL);
 for(const r of requests)assert.match(r.opts.headers.Authorization,/^Bearer [a-f0-9]+$/);
 await assert.rejects(listItems('../reports'),/컬렉션/);await assert.rejects(listItems('reports',51,0),/범위/);await assert.rejects(createItem('reports',{value:'한'.repeat(JSON_LIMIT)}),/64KiB/);
});
test('empty and malformed pages are distinguished and loops rejected',async t=>{
 const original=fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async()=>json({ok:true,items:[],next_offset:null});assert.deepEqual(await listAllItems('reports'),[]);
 globalThis.fetch=async()=>json({ok:true,items:[],next_offset:0});await assert.rejects(listAllItems('reports'),/형식/);
 globalThis.fetch=async()=>json({ok:true,items:'no',next_offset:null});await assert.rejects(listAllItems('reports'),/형식/);
});
test('HTTP and network errors keep status and distinguish uncertain mutation',async t=>{
 const original=fetch;t.after(()=>globalThis.fetch=original);
 for(const status of [401,404,409,413,503]){globalThis.fetch=async()=>json({error:'failure'},status);await assert.rejects(createItem('reports',{x:1}),e=>e.status===status&&e.message.includes(String(status))&&e.uncertain===(status>=500));}
 globalThis.fetch=async()=>{throw Error('offline')};await assert.rejects(createItem('reports',{x:1}),e=>e.uncertain===true);await assert.rejects(listItems('reports'),e=>e.uncertain===false);
 globalThis.fetch=async()=>new Response('not json',{status:200});await assert.rejects(createItem('reports',{x:1}),e=>e.uncertain===true);
 globalThis.fetch=async()=>json({ok:true});await assert.rejects(createItem('reports',{x:1}),e=>e.uncertain===true);
});
test('uploads file field, validates formats, size, and returned URL',async t=>{
 const original=fetch;t.after(()=>globalThis.fetch=original);let request;
 globalThis.fetch=async(url,opts)=>{request={url,opts};return json({url:'/uploads/photo.png'});};
 const file=new File(['abc'],'photo.avif',{type:'image/avif'});assert.equal(await uploadImage(file),'https://www.koosik.kr/uploads/photo.png');assert.equal(request.opts.body.get('file').name,'photo.avif');assert.equal('Content-Type' in request.opts.headers,false);
 await assert.rejects(uploadImage(new File(['x'],'a.svg',{type:'image/svg+xml'})),/5MiB/);await assert.rejects(uploadImage(new File([new Uint8Array(IMAGE_LIMIT+1)],'a.jpg',{type:'image/jpeg'})),/5MiB/);
 globalThis.fetch=async()=>json({url:'javascript:alert(1)'});await assert.rejects(uploadImage(file),/주소/);assert.equal(safeImageUrl('https://example.com/image.png'),true);assert.equal(safeImageUrl('http://example.com/image.png'),false);
});
