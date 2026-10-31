// API is mocked; this checks the standalone HTML's request and error handling.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.env.CHROMIUM_SINGLE_PROCESS==='1'?['--single-process','--no-zygote']:[])],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const page=await browser.newPage({viewport:{width:1100,height:900},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://tiles.openfreemap.org/styles/positron',route=>route.abort());
let uploads=0,posts=0;const bodies=[];let releaseUpload;const waiting=new Promise(resolve=>releaseUpload=resolve);
const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'POST,OPTIONS,GET'};
await page.route('https://www.koosik.kr/**',async route=>{
 const request=route.request();
 if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
 if(request.method()==='GET')return route.fulfill({status:200,headers,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XcAAAAASUVORK5CYII=','base64')});
 assert.match(request.headers().authorization,/^Bearer [a-f0-9]+$/);
 if(request.url().endsWith('/upload')){
  uploads++;assert.match(request.headers()['content-type'],/^multipart\/form-data; boundary=/);
  assert.match(request.postData(),/name="file"/);
  if(uploads===1){await waiting;return route.fulfill({status:413,headers,contentType:'application/json',body:JSON.stringify({error:'사진 업로드 실패'})});}
  return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({url:'/public/test.png'})});
 }
 posts++;bodies.push(JSON.parse(request.postData()));
 if(posts===1)return route.fulfill({status:503,headers,contentType:'application/json',body:JSON.stringify({error:'일시적으로 저장할 수 없습니다'})});
 return route.fulfill({status:200,headers,contentType:'application/json',body:'{"ok":true}'});
});
await page.goto(pathToFileURL(resolve('dist/index.html')).href);
await page.locator('.header [data-action=report]').click();
await page.locator('[name=category]').selectOption('청결');
await page.locator('[name=title]').fill('동네 청소 요청');
await page.locator('[name=detail]').fill('공원 입구를 확인해주세요');
await page.locator('[name=location]').fill('충주시 호암동');
await page.locator('[name=photo]').setInputFiles({name:'image.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XcAAAAASUVORK5CYII=','base64')});
await page.locator('#photo-preview:not(.hidden)').waitFor();
await page.locator('#report-form button[type=submit]').click();
await page.locator('#report-api-status').filter({hasText:'업로드'}).waitFor();
assert.equal(await page.locator('.modal-head button').isDisabled(),true);
await page.keyboard.press('Escape');assert.equal(await page.locator('.modal').count(),1);
releaseUpload();
await page.locator('#report-api-status').filter({hasText:'사진 업로드 실패'}).waitFor();
assert.equal(await page.locator('[name=title]').inputValue(),'동네 청소 요청');assert.equal(posts,0);
await page.locator('#report-form button[type=submit]').click();
await page.locator('#report-api-status').filter({hasText:'일시적으로 저장할 수 없습니다'}).waitFor();
assert.equal(uploads,2);assert.equal(posts,1);
await page.locator('#report-form button[type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
assert.equal(uploads,2);assert.equal(posts,2);
assert.equal(bodies[0].id,bodies[1].id);assert.equal(bodies[1].imageUrl,'https://www.koosik.kr/public/test.png');
assert.equal(bodies[1].title,'동네 청소 요청');assert.equal(bodies[1].type,'report.created');
assert.deepEqual(Object.keys(bodies[1]).sort(),['category','createdAt','detail','id','imageUrl','latitude','location','longitude','title','type'].sort());
assert.ok(!JSON.stringify(bodies).includes('password'));assert.ok(!JSON.stringify(bodies).includes('data:image'));
assert.match(await page.locator('#toast').innerText(),/전송했어요/);
await page.reload();
assert.equal(await page.locator('.report-card').filter({hasText:'동네 청소 요청'}).count(),1);

// Editing a report with a legacy local image must upload it before sending the update.
const reportId=bodies[1].id;
await page.evaluate(id=>{const key='chungju-eatda-v1',value=JSON.parse(localStorage.getItem(key));value.reports.find(r=>r.id===id).image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XcAAAAASUVORK5CYII=';localStorage.setItem(key,JSON.stringify(value));},reportId);
await page.reload();
await page.locator(`[data-detail="${reportId}"]`).first().click();
await page.locator(`[data-edit-report="${reportId}"]`).click();
await page.locator('#report-form button[type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
assert.equal(uploads,3);assert.equal(posts,3);assert.equal(bodies[2].type,'report.updated');assert.equal(bodies[2].imageUrl,'https://www.koosik.kr/public/test.png');

// Once the API accepted the report, local failure must not allow accidental resend.
await page.evaluate(()=>{const old=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='chungju-eatda-v1')throw new Error('quota');return old.call(this,key,value);};});
await page.locator('.header [data-action=report]').click();
await page.locator('[name=category]').selectOption('가로등');await page.locator('[name=title]').fill('로컬 저장 실패');await page.locator('[name=detail]').fill('내용');await page.locator('[name=location]').fill('충주시');
await page.locator('#report-form button[type=submit]').click();
await page.locator('#report-api-status').filter({hasText:'전송되었지만'}).waitFor();
assert.equal(await page.locator('#report-form button[type=submit]').isDisabled(),true);assert.equal(posts,4);
await page.locator('.modal-head button').click();assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: report/photo requests, failures, retry, upload reuse, privacy, local-save failure');
