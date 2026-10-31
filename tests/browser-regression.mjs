// Run after `npm run build` with a local Chromium/Chrome executable.
// The basemap style is mocked so the suite also runs without map network access.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const app = pathToFileURL(resolve('dist/index.html')).href;
const style = JSON.stringify({version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#f0f4f7'}}]});
const browser = await chromium.launch({
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.env.CHROMIUM_SINGLE_PROCESS === '1' ? ['--single-process','--no-zygote'] : [])],
  ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})
});

async function mockPageApi(page){
 await page.route('https://www.koosik.kr/**',async route=>{
  const request=route.request(),headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'POST,OPTIONS,GET'};
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(request.method()==='POST')return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(request.url().endsWith('/upload')?{url:'/public/mock.png'}:{ok:true})});
  return route.fulfill({status:200,headers,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XcAAAAASUVORK5CYII=','base64')});
 });
}
const page = await browser.newPage({viewport:{width:390,height:800},reducedMotion:'reduce'});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let requests = 0, releasePicker;
const pickerWait = new Promise(resolve => { releasePicker = resolve; });
await page.route('https://tiles.openfreemap.org/styles/positron', async route => {
  requests++;
  if(requests === 2) await pickerWait;
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:style});
});
await mockPageApi(page);
await page.goto(app);
await page.locator('.report-card').first().waitFor();

// Focus and the actual input element must survive IME composition updates.
await page.locator('#search').focus();
await page.evaluate(() => { window.originalSearch = document.querySelector('#search'); });
await page.locator('#search').dispatchEvent('compositionstart', {data:''});
await page.locator('#search').fill('가');
await page.locator('#search').fill('가로');
await page.locator('#search').dispatchEvent('compositionend', {data:'가로'});
assert.equal(await page.evaluate(() => window.originalSearch === document.querySelector('#search')), true);
assert.equal(await page.evaluate(() => document.activeElement === window.originalSearch), true);
assert.equal(await page.locator('.report-card').count(), 2);
await page.locator('[data-action=clear-search]').click();
assert.equal(await page.locator('#search').inputValue(), '');
assert.equal(await page.locator('.report-card').count(), 9);

// A related story outside the active filter must still be visible on the map.
await page.locator('[data-category="가로등"]').click();
await page.locator('[data-detail=r2]').click();
await page.locator('.related-list [data-detail=r1]').click();
await page.locator('[data-map-detail=r1]').click();
await page.locator('[data-marker-id=r1]').waitFor();
assert.equal(await page.locator('[data-category="전체"]').getAttribute('aria-pressed'), 'true');
assert.equal(await page.locator('[data-mobile=map]').getAttribute('aria-pressed'), 'true');

// A delayed picker must respect coordinates entered before it loaded.
await page.locator('[data-mobile=list]').click();
await page.locator('.mobile-nav [data-action=report]').click();
await page.locator('[name=category]').selectOption('가로등');
await page.locator('[name=title]').fill('위치 점검');
await page.locator('[name=detail]').fill('위치 내용');
await page.locator('[name=location]').fill('충주시');
await page.locator('[name=lat]').fill('36.955');
await page.locator('[name=lng]').fill('127.900');
releasePicker();
await page.locator('#picker-message').waitFor({state:'hidden'});
await page.waitForTimeout(100);
const center = await page.evaluate(() => {
  const map = document.querySelector('#picker-map').getBoundingClientRect();
  const marker = document.querySelector('#picker-map .maplibregl-marker').getBoundingClientRect();
  return {dx:Math.abs(marker.left+marker.width/2-(map.left+map.width/2)),dy:Math.abs(marker.bottom-(map.top+map.height/2))};
});
assert.ok(center.dx < 8 && center.dy < 8, `picker marker: ${JSON.stringify(center)}`);
await page.locator('[data-action=review-report]').click();
assert.equal(await page.locator('#report-review').isVisible(), true);
await page.locator('#picker-map canvas').click({position:{x:70,y:70}});
assert.equal(await page.locator('#report-review').isHidden(), true);

// A late file-read callback must not override a newer photo or an invalid selection.
await page.evaluate(() => {
  window.readers = [];
  window.FileReader = class {
    readAsDataURL(file) { this.file=file; window.readers.push(this); }
    finish(result) { this.result=result; this.onload?.(); }
  };
});
const file = page.locator('[name=photo]');
await file.setInputFiles({name:'one.png',mimeType:'image/png',buffer:Buffer.from('one')});
await file.setInputFiles({name:'two.png',mimeType:'image/png',buffer:Buffer.from('two')});
await page.evaluate(() => window.readers[0].finish('data:image/png;base64,b25l'));
assert.equal(await page.locator('#photo-preview').isHidden(), true);
await page.evaluate(() => window.readers[1].finish('data:image/png;base64,dHdv'));
assert.match(await page.locator('#photo-preview').getAttribute('src'), /dHdv$/);
await file.setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('bad')});
assert.equal(await page.locator('#photo-preview').isHidden(), true);
await page.locator('.modal-head button').click();
assert.deepEqual(errors, []);

// Map failure must not block other features, and retry must use the current filters.
const offline = await browser.newPage({viewport:{width:1024,height:850},reducedMotion:'reduce'});
let failMap = true;
const offlineErrors = [];
offline.on('pageerror', error => offlineErrors.push(error.message));
offline.on('dialog', dialog => dialog.accept());
await offline.route('https://tiles.openfreemap.org/styles/positron', route => failMap ? route.abort() : route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:style}));
await mockPageApi(offline);
await offline.goto(app);
await offline.locator('#map-error-title').filter({hasText:'지도를 불러올 수 없어요'}).waitFor();
await offline.locator('#search').fill('가로등');
assert.equal(await offline.locator('.report-card').count(), 2);
await offline.locator('[data-like=r2]').click();
assert.match(await offline.locator('[data-like=r2]').innerText(), /343/);
failMap = false;
await offline.locator('[data-action=retry-map]').click();
await offline.locator('.map-pin').first().waitFor();
assert.equal(await offline.locator('.map-pin').count(), 2);
await offline.reload();
assert.match(await offline.locator('[data-like=r2]').innerText(), /343/);

// The standalone HTML also supports language, photo reports and local rounds.
await offline.locator('#language').selectOption('en');
await offline.locator('.header [data-action=report]').click();
await offline.locator('[name=category]').selectOption('청결');
await offline.locator('[name=title]').fill('청결');
await offline.locator('[name=detail]').fill('My local details');
await offline.locator('[name=location]').fill('Hoam-dong');
await offline.locator('[name=photo]').setInputFiles(resolve('public/images/river.jpg'));
await offline.locator('#photo-preview:not(.hidden)').waitFor();
await offline.locator('#report-form button[type=submit]').click();
await offline.locator('.modal').waitFor({state:'detached'});
const first = offline.locator('.report-card').first();
assert.equal(await first.locator('h3').innerText(), '청결');
const reportId = await first.getAttribute('data-card');
await first.locator('[data-detail]').click();
assert.equal(await offline.locator('.detail-content h3').innerText(), '청결');
await offline.locator('.modal-head button').click();
// Force a user-created story into the top three to exercise English round rendering.
await offline.evaluate(id => {
  const key='chungju-eatda-v1', data=JSON.parse(localStorage.getItem(key));
  data.reports.find(report => report.id === id).likes=1000;
  localStorage.setItem(key,JSON.stringify(data));
}, reportId);
await offline.reload();
await offline.locator('[data-action=rounds]').first().click();
assert.equal(await offline.locator('.round-item strong').first().innerText(), '청결');
await offline.locator('[data-action=finish-round]').click();
await offline.locator('.round-history summary').first().click();
assert.match(await offline.locator('.round-history').innerText(), /청결/);
await offline.locator('.modal-head button').click();
await offline.locator(`[data-detail="${reportId}"]`).first().click();
await offline.locator(`[data-delete-report="${reportId}"]`).click();
assert.equal(await offline.locator('.report-card').count(), 9);
assert.deepEqual(offlineErrors, []);
await browser.close();
console.log('PASS: search, IME, filters, map/picker, photos, offline retry, language, reports and rounds');
