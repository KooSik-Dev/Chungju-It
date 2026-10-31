// Integration test: mock browser directory permission, inspect saved files and UI.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.env.CHROMIUM_SINGLE_PROCESS==='1'?['--single-process','--no-zygote']:[])],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const page=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.addInitScript(() => {
  const key='test-fake-folder';
  const get=()=>JSON.parse(localStorage.getItem(key)||'{"dirs":[""],"files":{}}');
  const set=value=>localStorage.setItem(key,JSON.stringify(value));
  const missing=()=>new DOMException('not found','NotFoundError');
  const dir=path=>({name:path.split('/').pop()||'내 저장 폴더',
    async getDirectoryHandle(name,{create=false}={}) {const current=get(),next=[path,name].filter(Boolean).join('/');if(!current.dirs.includes(next)){if(!create)throw missing();current.dirs.push(next);set(current);}return dir(next);},
    async getFileHandle(name,{create=false}={}){const target=[path,name].filter(Boolean).join('/');if(!create&&!(target in get().files))throw missing();return {
      async getFile(){const value=get().files[target];if(!value)throw missing();const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));return new File([bytes],name);},
      async createWritable(){let value;return {async write(data){value=data instanceof Blob?new Uint8Array(await data.arrayBuffer()):new TextEncoder().encode(data);},async close(){if(window.failWrites)throw new Error('write denied');let text='';for(let i=0;i<value.length;i+=32768)text+=String.fromCharCode(...value.subarray(i,i+32768));const current=get();current.files[target]=btoa(text);set(current);},async abort(){}};}
    };}
  });
  window.showDirectoryPicker=async()=>dir('');
});
await page.route('https://tiles.openfreemap.org/styles/positron',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({version:8,sources:{},layers:[]})}));
await page.goto(pathToFileURL(resolve('dist/index.html')).href);
await page.locator('.header [data-action=login]').click();
await page.locator('[data-action=auth-mode]').click();
await page.locator('[data-action=choose-folder]').click();
await page.locator('[name=username]').fill('충주시민');
await page.locator('[name=password]').fill('password123');
await page.locator('[name=confirm]').fill('password123');
await page.locator('#account-form button[type=submit]').click();
await page.locator('.header .signed-in').waitFor();
let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('test-fake-folder')));
const accounts=JSON.parse(Buffer.from(stored.files['data/accounts.json'],'base64').toString());
assert.equal(accounts.accounts.length,1);assert.equal(accounts.accounts[0].name,'충주시민');
assert.ok(!JSON.stringify(accounts).includes('password123'));
const id=accounts.accounts[0].id;
assert.ok(stored.files[`data/users/${id}.json`]);

// Activity, report and photo are written separately and survive logout/login and reload.
await page.locator('[data-like=r2]').first().click();
await page.locator('.header [data-action=report]').click();
await page.locator('[name=category]').selectOption('청결');
await page.locator('[name=title]').fill('테스트 사진 신고');
await page.locator('[name=detail]').fill('저장 확인');
await page.locator('[name=location]').fill('충주시 호암동');
await page.locator('[name=photo]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XcAAAAASUVORK5CYII=','base64')});
await page.locator('#photo-preview:not(.hidden)').waitFor();
await page.locator('#report-form button[type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
await page.locator('.folder-save-bar [data-folder-save-status]').filter({hasText:'폴더에 저장됨'}).waitFor();
stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('test-fake-folder')));
const record=JSON.parse(Buffer.from(stored.files[`data/users/${id}.json`],'base64').toString());
const report=record.data.reports.find(r=>r.title==='테스트 사진 신고');
assert.ok(report);assert.match(report.image,/^img\/[a-f0-9]{64}\.png$/);assert.ok(stored.files[report.image]);assert.ok(record.data.liked.includes('r2'));
assert.ok(!Buffer.from(stored.files[`data/users/${id}.json`],'base64').toString().includes('data:image'));

// Folder write failure is visible and logout is blocked until retry succeeds.
await page.evaluate(()=>window.failWrites=true);
await page.locator('[data-like=r3]').first().click();
await page.locator('.folder-save-bar [data-status=error]').waitFor();
await page.locator('.header [data-action=login]').click();
await page.locator('[data-action=logout]').click();
assert.equal(await page.locator('.header .signed-in').count(),1);
await page.evaluate(()=>window.failWrites=false);
await page.locator('[data-action=retry-folder-save]').click();
await page.locator('.profile-explain [data-folder-save-status]').filter({hasText:'폴더에 저장됨'}).waitFor();
await page.locator('[data-action=logout]').click();
await page.locator('.header .signed-in').waitFor({state:'detached'});
await page.reload();
await page.locator('.header [data-action=login]').click();
await page.locator('[name=username]').fill('충주시민');
await page.locator('[name=password]').fill('wrongpassword');
await page.locator('#account-form button[type=submit]').click();
assert.match(await page.locator('#account-error').innerText(),/폴더/);
await page.locator('[data-action=choose-folder]').click();
await page.locator('#account-form button[type=submit]').click();
await page.locator('#account-error').filter({hasText:'올바르지'}).waitFor();
assert.match(await page.locator('#account-error').innerText(),/올바르지/);
await page.locator('[name=password]').fill('password123');
await page.locator('#account-form button[type=submit]').click();
await page.locator('.header .signed-in').waitFor();
assert.equal(await page.locator('.report-card').filter({hasText:'테스트 사진 신고'}).count(),1);
assert.match(await page.locator('[data-like=r3]').first().getAttribute('class'),/liked/);
assert.match(await page.locator('.report-card').filter({hasText:'테스트 사진 신고'}).locator('img').first().getAttribute('src'),/^data:image\/png/);
// A second account has separate activity and duplicate names are rejected.
await page.locator('.header [data-action=login]').click();
await page.locator('[data-action=logout]').click();
await page.locator('.header [data-action=login]').click();
await page.locator('[data-action=auth-mode]').click();
await page.locator('[name=username]').fill('충주시민');
await page.locator('[name=password]').fill('password123');
await page.locator('[name=confirm]').fill('password123');
await page.locator('#account-form button[type=submit]').click();
await page.locator('#account-error:not([hidden])').waitFor();
assert.match(await page.locator('#account-error').innerText(),/이미 사용/);
await page.locator('[name=username]').fill('다른시민');
await page.locator('#account-form button[type=submit]').click();
await page.locator('.header .signed-in').waitFor();
assert.equal(await page.locator('.report-card').filter({hasText:'테스트 사진 신고'}).count(),0);
await page.locator('.header [data-action=login]').click();
await page.locator('[data-action=logout]').click();
for(const width of [320,375,768,1200]) {
  await page.setViewportSize({width,height:900});
  await page.locator('.header [data-action=login]').click({force:true});
  await page.waitForTimeout(100);
  const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth-innerWidth,modal:document.querySelector('.modal').scrollWidth-document.querySelector('.modal').clientWidth}));
  assert.ok(overflow.page<=1 && overflow.modal<=1,`login overflow ${width}: ${JSON.stringify(overflow)}`);
  await page.locator('.modal-head button').click();
}
assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: signup, credentials, separate image, JSON, retry, logout, reload and login');
