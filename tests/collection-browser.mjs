// In-memory API emulates the supplied public collections contract. No live writes.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.env.CHROMIUM_SINGLE_PROCESS==='1'?['--single-process','--no-zygote']:[])],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const db=Object.fromEntries(['reports','comments','supports','favorites','profiles','rounds'].map(n=>[n,[]]));
let serial=0,mode='',uploaded=0;const requests=[];const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'POST,OPTIONS,GET,PUT,DELETE'};
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XcAAAAASUVORK5CYII=','base64');
async function prepare(){
 const ctx=await browser.newContext({viewport:{width:1100,height:900},reducedMotion:'reduce'});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
 await page.route('https://tiles.openfreemap.org/**',r=>r.abort());
 await page.route('https://www.koosik.kr/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method();if(method==='OPTIONS')return route.fulfill({status:204,headers});
  if(url.pathname==='/public/test.png')return route.fulfill({status:200,headers,contentType:'image/png',body:image});
  assert.match(req.headers().authorization||'',/^Bearer [a-f0-9]+$/);requests.push({method,url:url.pathname+url.search,body:req.postData()});
  const send=(obj,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(obj)});
  if(url.pathname.endsWith('/upload')){uploaded++;return send({ok:true,url:'/public/test.png'});}
  if(url.pathname.includes('/protected/'))return send({ok:true,items:[],next_offset:null});
  const match=url.pathname.match(/\/collections\/([^/]+)(?:\/([^/]+))?$/);if(!match)return send({error:'not found'},404);
  const [,col,rawId]=match;const list=db[col];assert.ok(list);const id=rawId&&decodeURIComponent(rawId),item=list.find(x=>x.id===id);
  if(method==='GET'&&!id){if(mode==='load401'){mode='';return send({error:'unauthorized'},401);}const offset=Number(url.searchParams.get('offset')),limit=Number(url.searchParams.get('limit'));return send({ok:true,items:list.slice(offset,offset+limit),next_offset:offset+limit<list.length?offset+limit:null});}
  if(method==='GET')return item?send({ok:true,item}):send({error:'not found'},404);
  if(method==='POST'){
   const data=JSON.parse(req.postData());if(mode==='413'){mode='';return send({error:'too large'},413);}if(mode==='503'){mode='';return send({error:'unavailable'},503);}
   const next={id:`item-${++serial}`,data,revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};list.unshift(next);
   if(mode==='lost'){mode='';return route.abort();}return send({ok:true,item:next});
  }
  if(method==='PUT'){const body=JSON.parse(req.postData());if(mode==='conflict'){mode='';item.revision++;item.data.extra='other change';item.data.status='처리중';return send({error:'conflict'},409);}if(!item)return send({error:'not found'},404);if(item.revision!==body.revision)return send({error:'conflict'},409);item.data=body.data;item.revision++;return send({ok:true,item});}
  if(method==='DELETE'){if(mode==='delete-conflict'&&item){mode='';item.revision++;return send({error:'conflict'},409);}if(!item)return send({error:'not found'},404);if(String(item.revision)!==url.searchParams.get('revision'))return send({error:'conflict'},409);list.splice(list.indexOf(item),1);return send({ok:true});}
  return send({error:'unsupported'},404);
 });
 await page.goto(pathToFileURL(resolve('dist/index.html')).href);await page.locator('.list-panel[data-remote-ready="true"]').waitFor();return {ctx,page,errors};
}
const a=await prepare();const p=a.page;assert.equal(await p.locator('.remote-bar, #remote-status').count(),0);assert.equal(await p.getByText('목록이 연결되었습니다.').count(),0);
assert.equal(db.reports.length,0);assert.equal(await p.locator('.report-card').count(),0);
await p.locator('.header [data-action=report]').click();await p.locator('[name=category]').selectOption('청결');await p.locator('[name=title]').fill('공원 정리');await p.locator('[name=detail]').fill('공원 입구를 확인해주세요');await p.locator('[name=location]').fill('충주시 호암동');
await p.locator('[name=photo]').setInputFiles({name:'image.png',mimeType:'image/png',buffer:image});await p.locator('#photo-preview:not(.hidden)').waitFor();await p.locator('#report-form [type=submit]').click();await p.locator('.modal').waitFor({state:'detached'});await p.locator('[data-detail="item-1"]').first().waitFor();
assert.equal(uploaded,1);assert.equal(db.reports[0].data.image,'https://www.koosik.kr/public/test.png');assert.equal(db.reports[0].data.title,'공원 정리');
const b=await prepare(),q=b.page;await q.locator('[data-detail="item-1"]').first().click();assert.match(await q.locator('.detail-description').innerText(),/공원 입구/);assert.match(await q.locator('.detail-hero img').getAttribute('src'),/public\/test.png/);
await q.locator('.detail-actions [data-like]').click();await q.locator('.detail-actions .liked').waitFor();assert.equal(db.supports.length,1);await q.locator('.detail-actions [data-like]').click();assert.equal(db.supports.length,1);
await q.locator('.detail-actions [data-favorite="item-1"]').click();await q.locator('.detail-save.is-saved').waitFor();assert.equal(db.favorites.length,1);
await q.locator('#note-form input').fill('함께 확인해요');await q.locator('#note-form [type=submit]').click();await q.locator('.notes').filter({hasText:'함께 확인해요'}).waitFor();assert.equal(db.comments.length,1);
// Shared round settings remain available to guests.
await q.locator('.modal-head button').click();
await q.locator('[data-action=rounds]').first().click();await q.locator('[data-action=start-round]').click();await q.locator('[data-action=finish-round]').waitFor();assert.equal(db.rounds.length,1);await q.locator('#round-duration').selectOption('14');await q.waitForFunction(()=>document.querySelector('#round-duration')?.value==='14');await q.waitForTimeout(100);assert.equal(db.rounds[0].data.nextDays,14);await q.locator('[data-action=finish-round]').click();await q.waitForFunction(()=>document.querySelector('.round-banner h3')?.textContent.includes('2회'));assert.equal(db.rounds[0].data.history.length,1);await q.locator('.modal-head button').click();
await q.locator('[data-detail="item-1"]').first().click();
// Conflict must keep the editing input and merge fields from the latest record on explicit retry.
await q.locator('[data-edit-report="item-1"]').click();await q.locator('[name=title]').fill('수정한 제목');mode='conflict';await q.locator('#report-form [type=submit]').click();await q.locator('#report-api-status').filter({hasText:'최신 신고'}).waitFor();assert.equal(await q.locator('[name=title]').inputValue(),'수정한 제목');await q.locator('#report-form [type=submit]').click();await q.locator('.modal').waitFor({state:'detached'});assert.equal(db.reports[0].data.extra,'other change');assert.equal(db.reports[0].data.status,'처리중');assert.equal(db.reports[0].data.image,'https://www.koosik.kr/public/test.png');assert.equal(db.reports[0].data.title,'수정한 제목');
// A committed creation with a lost response is never automatically sent twice.
await q.locator('.header [data-action=report]').click();await q.locator('[name=category]').selectOption('가로등');await q.locator('[name=title]').fill('응답 유실 신고');await q.locator('[name=detail]').fill('확인할 내용');await q.locator('[name=location]').fill('충주시');mode='lost';await q.locator('#report-form [type=submit]').click();await q.locator('[data-action=check-report]:visible').waitFor();assert.equal(await q.locator('#report-form [type=submit]').isDisabled(),true);assert.equal(await q.locator('[name=title]').inputValue(),'응답 유실 신고');assert.equal(db.reports.filter(x=>x.data.title==='응답 유실 신고').length,1);await q.locator('[data-action=check-report]').click();await q.locator('.modal').waitFor({state:'detached'});assert.equal(db.reports.filter(x=>x.data.title==='응답 유실 신고').length,1);
// 413 and 503 preserve text and provide an explicit check before retry.
await q.locator('.header [data-action=report]').click();await q.locator('[name=category]').selectOption('청결');await q.locator('[name=title]').fill('오류 시 보존');await q.locator('[name=detail]').fill('보존할 상세');await q.locator('[name=location]').fill('충주시');mode='413';await q.locator('#report-form [type=submit]').click();await q.locator('#report-api-status').filter({hasText:'413'}).waitFor();assert.equal(await q.locator('[name=detail]').inputValue(),'보존할 상세');mode='503';await q.locator('#report-form [type=submit]').click();await q.locator('#report-api-status').filter({hasText:'503'}).waitFor();assert.equal(await q.locator('#report-form [type=submit]').isDisabled(),true);await q.locator('[data-action=check-report]').click();await q.locator('#report-form [type=submit]:enabled').waitFor();await q.locator('.modal-head button').click();
// Delete and revision query.
await q.locator('[data-detail="item-1"]').first().click();mode='delete-conflict';await q.locator('[data-delete-report="item-1"]').click();await q.locator('#toast').filter({hasText:'최신 신고'}).waitFor();assert.ok(db.reports.some(x=>x.id==='item-1'));await q.locator('[data-delete-report="item-1"]').click();await q.locator('.modal').waitFor({state:'detached'});assert.equal(db.reports.some(x=>x.id==='item-1'),false);assert.ok(requests.some(x=>x.method==='DELETE'&&x.url.includes('revision=4')));
// Pagination, independent browser reread, load error and recovery.
for(let i=0;i<52;i++)db.reports.push({id:'bulk-'+i,revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),data:{category:'청결',title:'목록 '+i,detail:'내용',location:'충주시',lat:36.99,lng:127.92,status:'공감모집',clientId:'someone',image:'river.jpg'}});
mode='load401';await q.locator('footer [data-action=reload-remote]').click();await q.locator('#remote-error').filter({hasText:'401'}).waitFor();await q.locator('#remote-error [data-action=reload-remote]').click();await q.locator('.list-panel[data-remote-ready="true"]').waitFor();assert.equal(await q.locator('#remote-error').isHidden(),true);assert.ok(requests.some(x=>x.url.includes('offset=50')));assert.ok(await q.locator('[data-detail="bulk-51"]').count()>0);
await q.setViewportSize({width:360,height:780});await q.locator('#search').fill('목록 51');assert.ok(await q.locator('[data-detail="bulk-51"]').count()>0);assert.equal(await q.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);await q.locator('#search').fill('');await q.locator('#language').selectOption('en');await q.locator('.header').getByText('Report', {exact:false}).first().waitFor();
assert.ok(requests.every(x=>!x.body||!x.body.toLowerCase().includes('password')));assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);
await browser.close();console.log('PASS: empty, paging, shared CRUD, photo, revision conflict, error input preservation and lost response');
