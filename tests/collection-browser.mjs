// In-memory API emulates the supplied public collections contract. No live writes.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.env.CHROMIUM_SINGLE_PROCESS==='1'?['--single-process','--no-zygote']:[])],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const db=Object.fromEntries(['reports','comments','supports','favorites','profiles','rounds','updates','admin-tasks'].map(n=>[n,[]]));
let serial=0,mode='',uploaded=0;const requests=[];const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'POST,OPTIONS,GET,PUT,DELETE'};
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XcAAAAASUVORK5CYII=','base64');
async function prepare(){
 const ctx=await browser.newContext({viewport:{width:1100,height:900},reducedMotion:'reduce'});const page=await ctx.newPage();const errors=[];await ctx.addInitScript(()=>{try{localStorage.setItem('chungju-entry-seen','1');}catch{}});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
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
// Legacy public collections remain readable but every in-app mutation requires a session.
for(let i=0;i<52;i++)db.reports.push({id:'bulk-'+i,revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),data:{category:'청결',title:'목록 '+i,detail:'내용',location:'충주시',lat:36.99,lng:127.92,status:'공감모집',clientId:'someone',image:'river.jpg'}});
db.comments.push({id:'old-comment',revision:1,created_at:new Date().toISOString(),data:{reportId:'bulk-51',text:'기존 댓글',author:'이웃'}});
const a=await prepare(),p=a.page;
assert.equal(await p.locator('.remote-bar, #remote-status').count(),0);assert.ok(requests.some(x=>x.url.includes('offset=50')));
await p.locator('.header [data-action=report]').click();await p.locator('#guest-form').waitFor();assert.ok(await p.locator('[data-action=guest-back]').isVisible());assert.equal(await p.locator('#report-form').count(),0);await p.locator('.modal-head button').click();
await p.locator('[data-detail="bulk-51"]').first().click();assert.match(await p.locator('.notes').innerText(),/기존 댓글/);assert.equal(await p.locator('[data-edit-report],[data-delete-report],[data-delete-note],#note-form').count(),0);
await p.locator('.detail-actions [data-like]').click();await p.locator('#guest-form').waitFor();assert.equal(db.supports.length,0);await p.locator('.modal-head button').click();
await p.locator('[data-detail="bulk-51"]').first().click();await p.locator('.detail-actions [data-favorite]').click();await p.locator('#guest-form').waitFor();assert.equal(db.favorites.length,0);await p.locator('.modal-head button').click();
await p.locator('[data-detail="bulk-51"]').first().click();await p.locator('[data-login-comment]').click();await p.locator('#guest-form').waitFor();assert.equal(db.comments.length,1);await p.locator('.modal-head button').click();
await p.locator('[data-action=rounds]').first().click();assert.equal(await p.locator('[data-action=start-round]').count(),0);await p.locator('[data-action=round-login]').click();await p.locator('#auth-form').waitFor();assert.equal(db.rounds.length,0);await p.locator('.modal-head button').click();
await p.locator('.utility [data-action=font]').click();await p.waitForTimeout(200);assert.equal(db.profiles.length,0);
mode='load401';await p.locator('footer [data-action=reload-remote]').click();await p.locator('#remote-error').filter({hasText:'401'}).waitFor();await p.locator('#remote-error [data-action=reload-remote]').click();await p.locator('.list-panel[data-remote-ready="true"]').waitFor();assert.equal(await p.locator('#remote-error').isHidden(),true);
await p.setViewportSize({width:360,height:780});await p.locator('#search').fill('목록 51');assert.ok(await p.locator('[data-detail="bulk-51"]').count()>0);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.locator('#language').selectOption('en');await p.locator('.header').getByText('Report',{exact:false}).first().waitFor();
assert.equal(uploaded,0);assert.ok(requests.every(x=>x.method==='GET'));assert.deepEqual(a.errors,[]);await browser.close();console.log('PASS: guest read, pagination, login gates, no anonymous mutations, error recovery and mobile');
