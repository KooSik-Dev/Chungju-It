// Multiple photo upload/edit/gallery coverage against the built app and a mocked page API.
import { chromium } from 'playwright-core';
import { pickReportPosition } from './helpers/position.mjs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const db=Object.fromEntries(['reports','comments','supports','favorites','profiles','rounds','updates','admin-tasks'].map(n=>[n,[]]));
const protectedDb=Object.fromEntries(Object.keys(db).map(n=>[n,[]]));
const users=new Map(),sessions=new Map();let serial=0,sequence=0,uploads=0,uploadMode='ok';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XcAAAAASUVORK5CYII=','base64');
const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type,x-page-session','access-control-allow-methods':'POST,OPTIONS,GET,PUT,DELETE'};
const errors=[];

const ctx=await browser.newContext({viewport:{width:1100,height:900},reducedMotion:'reduce'});
const page=await ctx.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror',e=>errors.push(e.message));
await ctx.addInitScript(()=>{try{localStorage.setItem('chungju-entry-seen','1');localStorage.setItem('chungju-language-chosen','1');}catch{}});
await page.route('https://tiles.openfreemap.org/**',r=>r.abort());
await page.route('https://api.mymemory.translated.net/**',r=>r.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({responseStatus:200,responseData:{translatedText:'x'}})}));
await page.route('https://www.koosik.kr/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method();
  if(method==='OPTIONS')return route.fulfill({status:204,headers});
  const send=(o,s=200)=>route.fulfill({status:s,headers,contentType:'application/json',body:JSON.stringify(o)});
  if(url.pathname.startsWith('/public/'))return route.fulfill({status:200,headers,contentType:'image/png',body:png});
  if(!/^Bearer [a-f0-9]+$/.test(req.headers().authorization||''))return send({error:'unauthorized'},401);
  let user=sessions.get(req.headers()['x-page-session']);
  if(url.pathname.endsWith('/auth/register')||url.pathname.endsWith('/auth/login')){
    const {username,credential}=JSON.parse(req.postData()),name=username.normalize('NFKC').trim().toLowerCase();
    if(url.pathname.endsWith('register')){if(users.has(name))return send({error:'exists'},409);user={id:'u'+(++serial),username:name,credential};users.set(name,user);}
    else{user=users.get(name);if(!user||user.credential!==credential)return send({error:'invalid'},401);}
    const token='session-'+(++sequence);sessions.set(token,user);
    return send({ok:true,user:{id:user.id,username:user.username},session:token,expires_at:'2099-01-01T00:00:00Z'});
  }
  if(url.pathname.endsWith('/auth/me'))return user?send({ok:true,user:{id:user.id,username:user.username}}):send({error:'expired'},401);
  if(url.pathname.endsWith('/auth/logout')){sessions.delete(req.headers()['x-page-session']);return send({ok:true});}
  if(url.pathname.endsWith('/upload')){
    if(uploadMode==='413'){uploadMode='ok';return send({error:'too large'},413);}
    uploads++;return send({ok:true,url:`https://www.koosik.kr/public/up-${uploads}.png`});
  }
  const match=url.pathname.match(/\/(protected\/)?collections\/([^/]+)(?:\/([^/]+))?$/);
  if(!match)return send({error:'missing'},404);
  const isProtected=!!match[1],list=(isProtected?protectedDb:db)[match[2]];
  if(!list)return send({error:'missing'},404);
  const id=match[3]&&decodeURIComponent(match[3]),item=list.find(x=>x.id===id);
  const visible=x=>!isProtected||x.visibility==='public'||(user&&String(x.owner_id)===String(user.id));
  if(method==='GET'&&!id){const filtered=list.filter(visible),offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||50);return send({ok:true,items:filtered.slice(offset,offset+limit),next_offset:offset+limit<filtered.length?offset+limit:null});}
  if(method==='GET')return item&&visible(item)?send({ok:true,item}):send({error:'not found'},404);
  if(isProtected&&!user)return send({error:'login required'},401);
  if(method==='POST'){
    const body=JSON.parse(req.postData()),value=isProtected?body.data:body;
    const next={id:'p'+(++serial),data:value,revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...(isProtected?{owner_id:user.id,owner_name:user.username,visibility:body.visibility}:{})};
    list.unshift(next);return send({ok:true,item:next});
  }
  if(!item||!visible(item))return send({error:'not found'},404);
  if(isProtected&&user&&String(item.owner_id)!==String(user.id))return send({error:'forbidden'},403);
  if(method==='PUT'){const body=JSON.parse(req.postData());if(item.revision!==body.revision)return send({error:'conflict'},409);item.data=body.data;item.revision++;return send({ok:true,item});}
  if(method==='DELETE'){if(String(item.revision)!==url.searchParams.get('revision'))return send({error:'conflict'},409);list.splice(list.indexOf(item),1);return send({ok:true});}
  return send({error:'unsupported'},404);
});

// Legacy single-photo report (no images array) written by an older build.
const legacyImage='https://www.koosik.kr/public/up-legacy.png';
db.reports.push({id:'legacy-photo',revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),data:{category:'주차',title:'예전 단일 사진 신고',detail:'기존 사진 유지 확인',location:'충주시 칠금동',lat:36.98,lng:127.91,status:'공감모집',clientId:'old',image:legacyImage}});

await page.goto(pathToFileURL('/home/user/Chungju-It/dist/index.html').href);
await page.locator('.list-panel[data-remote-ready="true"]').waitFor();

// Sign up so the report form opens.
await page.locator('.header [data-action=report]').click();
await page.locator('#guest-form').waitFor();
await page.locator('[data-action=guest-back]').click();
await page.locator('[data-action=auth-mode]').click();
await page.locator('[name=username]').fill('photo-user');
await page.locator('[name=password]').fill('photo-password');
await page.locator('[name=confirm]').fill('photo-password');
await page.locator('#auth-form [type=submit]').click();
await page.locator('#report-form').waitFor();

const file=n=>({name:`shot-${n}.png`,mimeType:'image/png',buffer:png});
const thumbs=()=>page.locator('#photo-previews .photo-thumb').count();

// Rejections
await page.locator('#photo-input').setInputFiles([{name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')}]);
await page.locator('#toast').filter({hasText:'PNG, JPG'}).waitFor({state:'visible'});
assert.equal(await thumbs(),0);
await page.locator('#photo-input').setInputFiles([{name:'huge.png',mimeType:'image/png',buffer:Buffer.alloc(6*1024*1024)}]);
await page.locator('#toast').filter({hasText:'5MB'}).waitFor({state:'visible'});
assert.equal(await thumbs(),0);

// Maximum five
await page.locator('#photo-input').setInputFiles([1,2,3,4,5,6].map(file));
await page.waitForFunction(()=>document.querySelectorAll('#photo-previews .photo-thumb').length===5);
assert.match(await page.locator('#photo-status').innerText(),/사진 5장 선택됨 · 최대 5장/);
assert.equal(await page.locator('#photo-input').isDisabled(),true);
await page.locator('[data-photo-remove-new="4"]').click();
assert.equal(await thumbs(),4);
assert.equal(await page.locator('#photo-input').isEnabled(),true);

// Save four photos
await page.locator('[name=category]').selectOption('청결');
await page.locator('[name=title]').fill('사진 점검 신고');
await page.locator('[name=detail]').fill('사진 4장');
await page.locator('[name=location]').fill('충주시 호암동');
await pickReportPosition(page);await page.locator('[data-action=review-report]').click();
assert.match(await page.locator('#report-review').innerText(),/사진\s*4장/);
await pickReportPosition(page);await page.locator('#report-form [type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
const created=db.reports.find(r=>r.data.title==='사진 점검 신고');
assert.equal(created.data.images.length,4);
assert.equal(created.data.image,created.data.images[0]);
assert.equal(new Set(created.data.images).size,4);
assert.equal(uploads,4);

// Gallery
await page.locator(`[data-detail="${created.id}"]`).first().click();
await page.locator('#photo-counter').waitFor();
assert.equal(await page.locator('.photo-strip-item').count(),4);
assert.match(await page.locator('#photo-counter').innerText(),/^1 \/ 4$/);
const first=await page.locator('#detail-photo').getAttribute('src');
await page.locator('[data-photo-step="1"]').click();
assert.match(await page.locator('#photo-counter').innerText(),/^2 \/ 4$/);
await page.locator('[data-photo-index="3"]').click();
assert.match(await page.locator('#photo-counter').innerText(),/^4 \/ 4$/);
assert.equal(await page.locator('#detail-photo').getAttribute('src')!==first,true);
await page.locator('[data-lightbox-open]').click();
await page.locator('#photo-lightbox').waitFor();
assert.match(await page.locator('#photo-lightbox .lightbox-bar span').innerText(),/^4 \/ 4$/);
await page.locator('#photo-lightbox [data-lightbox-step="1"]').click();
assert.match(await page.locator('#photo-lightbox .lightbox-bar span').innerText(),/^1 \/ 4$/);
await page.keyboard.press('Escape');
assert.equal(await page.locator('#photo-lightbox').count(),0);
assert.equal(await page.locator('.modal').count(),1);

// Remove every photo, then save: images empty and bundled fallback
await page.locator('[data-edit-report]').click();
assert.equal(await thumbs(),4);
for(let i=0;i<4;i++)await page.locator('[data-photo-remove-existing="0"]').click();
assert.equal(await thumbs(),0);
await pickReportPosition(page);await page.locator('#report-form [type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
const cleaned=db.reports.find(r=>r.id===created.id);
assert.deepEqual(cleaned.data.images,[]);
assert.equal(cleaned.data.image,'river.jpg');

// Upload failure keeps input and allows retry
await page.locator(`[data-detail="${created.id}"]`).first().click();
await page.locator('[data-edit-report]').click();
uploadMode='413';
await page.locator('#photo-input').setInputFiles([file(8),file(9)]);
await pickReportPosition(page);await page.locator('#report-form [type=submit]').click();
await page.locator('#report-api-status').filter({hasText:/초과|확인/}).waitFor();
assert.equal(await page.locator('#report-form [type=submit]').isDisabled(),false);
await pickReportPosition(page);await page.locator('#report-form [type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
assert.equal(db.reports.find(r=>r.id===created.id).data.images.length,2);

// Legacy single photo survives an edit that adds a new photo
await page.locator('[data-detail="legacy-photo"]').first().click();
await page.locator('.detail-content h3').waitFor();
assert.equal(await page.locator('#photo-counter').count(),0);
await page.locator('[data-edit-report]').click();
assert.equal(await thumbs(),1);
assert.equal(await page.locator('#photo-previews .photo-thumb img').first().getAttribute('src'),legacyImage);
await page.locator('[name=title]').fill('예전 단일 사진 신고 수정');
await page.locator('#photo-input').setInputFiles([file(10)]);
assert.equal(await thumbs(),2);
await pickReportPosition(page);await page.locator('#report-form [type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
const legacy=db.reports.find(r=>r.id==='legacy-photo');
assert.equal(legacy.data.images.length,2);
assert.equal(legacy.data.images[0],legacyImage);
assert.equal(legacy.data.image,legacyImage);

// A legacy report edited without touching photos keeps its single image untouched
await page.locator('[data-detail="legacy-photo"]').first().click();
await page.locator('[data-edit-report]').click();
await page.locator('[name=location]').fill('충주시 칠금동 2');
await pickReportPosition(page);await page.locator('#report-form [type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
assert.equal(db.reports.find(r=>r.id==='legacy-photo').data.image,legacyImage);

// Existing photos count toward the five-photo limit
await page.locator(`[data-detail="${created.id}"]`).first().click();
await page.locator('[data-edit-report]').click();
await page.locator('#photo-input').setInputFiles([file(11),file(12),file(13)]);
assert.equal(await thumbs(),5);
assert.equal(await page.locator('#photo-input').isDisabled(),true);
await page.locator('[data-photo-remove-new="2"]').click();
assert.equal(await page.locator('#photo-input').isEnabled(),true);
await page.locator('.modal-head button').click();

assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: multi-photo limits, upload/edit, gallery, lightbox, legacy photo preservation and retry');
