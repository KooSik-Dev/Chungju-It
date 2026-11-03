// Language gate/switcher, report severity, admin list + location map, collection scroll and mobile tabs.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const APP = pathToFileURL('/home/user/Chungju-It/dist/index.html').href;
const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type,x-page-session','access-control-allow-methods':'POST,OPTIONS,GET,PUT,DELETE'};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XcAAAAASUVORK5CYII=','base64');
const mapStyle={version:8,sources:{},layers:[]};

const db=Object.fromEntries(['reports','comments','supports','favorites','profiles','rounds','updates','admin-tasks'].map(name=>[name,[]]));
const protectedDb=Object.fromEntries(Object.keys(db).map(name=>[name,[]]));
const users=new Map(),sessions=new Map();
let serial=0,sequence=0;
const now=()=>new Date().toISOString();
const noSeverityReport={id:'legacy-severity',revision:1,created_at:new Date(Date.now()-86400000).toISOString(),data:{category:'가로등',title:'심각도 없는 예전 신고',detail:'예전에 작성된 신고입니다.',location:'충주시 성서동',lat:36.97,lng:127.93,status:'공감모집',clientId:'old-device',image:'streetlight.jpg'}};
db.reports.push(noSeverityReport);
for(let i=1;i<=4;i++)db.reports.push({id:'fav-'+i,revision:1,created_at:new Date(Date.now()-i*3600000).toISOString(),data:{category:['청결','주차','공공시설','신호등'][i-1],title:`보관함 신고 ${i}`,detail:`보관함 확인용 신고 ${i}`,location:`충주시 ${i}동`,lat:36.96+i/1000,lng:127.92,status:'공감모집',clientId:'seed-'+i,image:'river.jpg',severity:['critical','caution','inconvenience','danger'][i-1]}});
const errors=[];

function apiRoute(){
  return async route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method();
    if(method==='OPTIONS')return route.fulfill({status:204,headers});
    const send=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
    if(url.pathname.startsWith('/public/'))return route.fulfill({status:200,headers,contentType:'image/png',body:png});
    if(!/^Bearer /.test(req.headers().authorization||''))return send({error:'unauthorized'},401);
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
    if(url.pathname.endsWith('/upload')){serial++;return send({ok:true,url:`https://www.koosik.kr/public/up-${serial}.png`});}
    const match=url.pathname.match(/\/(protected\/)?collections\/([^/]+)(?:\/([^/]+))?$/);
    if(!match)return send({error:'missing'},404);
    const isProtected=!!match[1],list=(isProtected?protectedDb:db)[match[2]];
    if(!list)return send({error:'missing'},404);
    const id=match[3]&&decodeURIComponent(match[3]),item=list.find(entry=>entry.id===id);
    const visible=entry=>!isProtected||entry.visibility==='public'||(user&&String(entry.owner_id)===String(user.id));
    if(method==='GET'&&!id)return send({ok:true,items:list.filter(visible),next_offset:null});
    if(method==='GET')return item&&visible(item)?send({ok:true,item}):send({error:'not found'},404);
    if(isProtected&&!user)return send({error:'login required'},401);
    if(method==='POST'){
      const body=JSON.parse(req.postData()),value=isProtected?body.data:body;
      const next={id:'p'+(++serial),data:value,revision:1,created_at:now(),updated_at:now(),...(isProtected?{owner_id:user.id,owner_name:user.username,visibility:body.visibility}:{})};
      list.unshift(next);return send({ok:true,item:next});
    }
    if(!item||!visible(item))return send({error:'not found'},404);
    if(method==='PUT'){const body=JSON.parse(req.postData());if(item.revision!==body.revision)return send({error:'conflict'},409);item.data=body.data;item.revision++;item.updated_at=now();return send({ok:true,item});}
    if(method==='DELETE'){list.splice(list.indexOf(item),1);return send({ok:true});}
    return send({error:'unsupported'},404);
  };
}

async function mock(context){
  await context.route('https://tiles.openfreemap.org/**',route=>{
    if(route.request().url().includes('/styles/'))return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(mapStyle)});
    return route.abort();
  });
  await context.route('https://api.mymemory.translated.net/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({responseStatus:200,responseData:{translatedText:new URL(route.request().url()).searchParams.get('q')||''}})}));
  await context.route('https://www.koosik.kr/**',apiRoute());
}

const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});

// ── 1. 첫 실행 언어 선택 + 재실행 유지 + 지구본 변경 ──
const freshCtx=await browser.newContext({viewport:{width:1100,height:900},reducedMotion:'reduce'});
await mock(freshCtx);
const fresh=await freshCtx.newPage();fresh.setDefaultTimeout(15000);fresh.on('pageerror',e=>errors.push(e.message));
await fresh.goto(APP);
await fresh.locator('#language-gate').waitFor();
assert.equal(await fresh.locator('#language-gate [data-language-option]').count(),8);
assert.match(await fresh.locator('#language-gate').innerText(),/언어를 선택해 주세요/);
assert.equal(await fresh.locator('.language-gate-globe').innerText(),'🌐');
await fresh.locator('#language-gate [data-language-option="en"]').click();
await fresh.locator('#language-gate').waitFor({state:'detached'});
assert.equal(await fresh.evaluate(()=>document.documentElement.lang),'en');
assert.equal(await fresh.evaluate(()=>localStorage.getItem('chungju-language-chosen')),'1');
assert.equal(await fresh.evaluate(()=>localStorage.getItem('chungju-eatda-language')),'en');
await fresh.locator('.modal [data-action=close-modal], .modal-head button').first().click().catch(()=>{});
await fresh.locator('.nav [data-page=map]').filter({hasText:'Issue map'}).waitFor();
await fresh.reload();
await fresh.locator('.list-panel[data-remote-ready="true"]').waitFor();
assert.equal(await fresh.locator('#language-gate').count(),0,'gate is only shown once');
await fresh.locator('.nav [data-page=map]').filter({hasText:'Issue map'}).waitFor();
const globe=fresh.locator('.header-actions [data-action=language-menu]');
assert.equal(await globe.count(),1);
await globe.click();
await fresh.locator('.language-menu').waitFor();
assert.equal(await fresh.locator('.language-menu .language-option.active').innerText().then(text=>text.trim().startsWith('English')),true);
await fresh.locator('[data-language-option="ko"]').click();
await fresh.locator('.language-menu').waitFor({state:'detached'});
assert.equal(await fresh.evaluate(()=>document.documentElement.lang),'ko');
assert.equal(await fresh.evaluate(()=>localStorage.getItem('chungju-eatda-language')),'ko');
await fresh.locator('.nav [data-page=map]').filter({hasText:'민원지도'}).waitFor();

// ── 2. 심각도 선택·저장·상세 표시·수정 ──
const ctx=await browser.newContext({viewport:{width:1100,height:900},reducedMotion:'reduce'});
await mock(ctx);
await ctx.addInitScript(()=>{try{localStorage.setItem('chungju-entry-seen','1');localStorage.setItem('chungju-language-chosen','1');}catch{}});
const page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
await page.goto(APP);
await page.locator('.list-panel[data-remote-ready="true"]').waitFor();
await page.locator('.header [data-action=report]').click();
await page.locator('#guest-form').waitFor();
await page.locator('[data-action=guest-back]').click();
await page.locator('[data-action=auth-mode]').click();
await page.locator('[name=username]').fill('severity-user');
await page.locator('[name=password]').fill('severity-password');
await page.locator('[name=confirm]').fill('severity-password');
await page.locator('#auth-form [type=submit]').click();
await page.locator('#report-form').waitFor();
assert.equal(await page.locator('#severity-field [data-severity]').count(),5);
const severityTexts=await page.locator('#severity-field [data-severity]').allInnerTexts();
assert.match(severityTexts[0],/🔴\s*매우 심각/);
assert.match(severityTexts[0],/즉각적인 확인과 조치/);
assert.match(severityTexts[4],/🟡\s*불편함/);
await page.locator('[data-severity=critical]').click();
assert.equal(await page.locator('[data-severity=critical]').getAttribute('aria-checked'),'true');
await page.locator('[data-severity=urgent]').click();
assert.equal(await page.locator('[data-severity=critical]').getAttribute('aria-checked'),'false');
assert.equal(await page.locator('.severity-option.active').count(),1);
await page.locator('[name=category]').selectOption('청결');
await page.locator('[name=title]').fill('심각도 점검 신고');
await page.locator('[name=detail]').fill('가스 냄새가 심하게 납니다.');
await page.locator('[name=location]').fill('충주시 호암동');
await page.locator('#report-form [type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
const created=db.reports.find(entry=>entry.data.title==='심각도 점검 신고');
assert.equal(created.data.severity,'urgent');
const createdId=created.id;
await page.locator(`[data-detail="${createdId}"]`).first().click();
await page.locator('.detail-severity').waitFor();
assert.match(await page.locator('.detail-severity').innerText(),/🆘\s*빠른 조치 시급/);
await page.locator('[data-edit-report]').click();
await page.locator('#report-form').waitFor();
assert.equal(await page.locator('[data-severity=urgent]').getAttribute('aria-checked'),'true');
await page.locator('[data-severity=inconvenience]').click();
await page.locator('#report-form [type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
await page.waitForTimeout(300);
assert.equal(db.reports.find(entry=>entry.id===createdId).data.severity,'inconvenience');
await page.locator('[data-detail="legacy-severity"]').first().click();
await page.locator('.detail-content h3').waitFor();
assert.equal(await page.locator('.detail-severity').count(),0,'legacy reports simply omit the badge');
await page.locator('.modal-head button').click();

// ── 3. 관리자 전체신고 목록·심각도·상세 지도 ──
await page.goto(APP+'#admin');
await page.locator('.admin-page[data-admin-ready="true"]').waitFor();
const rowText=await page.locator(`[data-admin-select="${createdId}"]`).innerText();
assert.match(rowText,/🟡 불편함/);
assert.match(rowText,/\d{2}\.\s*\d{2}\.\s*(오전|오후)?\s*\d{1,2}:\d{2}/);
assert.match(rowText,/가스 냄새가 심하게 납니다/);
assert.match(await page.locator('[data-admin-select="legacy-severity"]').innerText(),/심각도 미지정/);
await page.locator('#admin-sort').selectOption('severity');
assert.match(await page.locator('[data-admin-select]').first().innerText(),/🔴 매우 심각/);
await page.locator(`[data-admin-select="${createdId}"]`).click();
await page.locator('#admin-detail-map').waitFor();
assert.equal(await page.locator('#admin-detail-map').getAttribute('data-lat'),String(db.reports.find(entry=>entry.id===createdId).data.lat));
await page.locator('#admin-detail-map .maplibregl-marker').waitFor();
assert.match(await page.locator('#admin-inspector').innerText(),/위도 36\.\d+/);
await page.locator('[data-admin-select="legacy-severity"]').click();
await page.locator('#admin-inspector').filter({hasText:'심각도 미지정'}).waitFor();
await page.waitForTimeout(300);
assert.equal(await page.locator('#admin-detail-map').count(),1,'legacy report still has coordinates');

// ── 4. 동네 보관함 가로 스크롤 (드래그) ──
await page.setViewportSize({width:320,height:760});
await page.goto(APP);
await page.locator('.list-panel[data-remote-ready="true"]').waitFor();
for(const id of ['fav-1','fav-2']){
  await page.locator(`[data-detail="${id}"]`).first().click();
  await page.locator('.detail-actions [data-favorite]').click();
  await page.locator('.detail-save.is-saved').waitFor();
  await page.locator('.modal-head button').click();
}
await page.locator('.collection-entry').click();
await page.locator('.activity-page').waitFor();
const scrollBox=await page.locator('.activity-tabs').evaluate(el=>({scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
assert.ok(scrollBox.scrollWidth>scrollBox.clientWidth,'category row overflows at 320px');
const box=await page.locator('.activity-tabs').boundingBox();
await page.mouse.move(box.x+box.width-30,box.y+box.height/2);
await page.mouse.down();
await page.mouse.move(box.x+60,box.y+box.height/2,{steps:12});
await page.mouse.up();
const scrolled=await page.locator('.activity-tabs').evaluate(el=>el.scrollLeft);
assert.ok(scrolled>20,`drag scrolled the row (scrollLeft=${scrolled})`);
await page.locator('[data-activity-tab=mine]').click();
assert.equal(await page.locator('[data-activity-tab=mine]').getAttribute('aria-pressed'),'true');
await page.locator('[data-activity-tab=favorites]').click();
assert.equal(await page.locator('[data-activity-tab=favorites]').getAttribute('aria-pressed'),'true');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

// ── 5. 모바일 탭·지구본·레이아웃 ──
const mobileCtx=await browser.newContext({viewport:{width:390,height:820},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
await mock(mobileCtx);
await mobileCtx.addInitScript(()=>{try{localStorage.setItem('chungju-entry-seen','1');localStorage.setItem('chungju-language-chosen','1');}catch{}});
const mobile=await mobileCtx.newPage();mobile.setDefaultTimeout(15000);mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(APP);
await mobile.locator('.list-panel[data-remote-ready="true"]').waitFor({state:'attached'});
for(const [label,expected] of [['순위','공감순위'],['현황','처리현황'],['동네','민원지도']]){
  await mobile.locator('.mobile-nav>button').filter({hasText:label}).first().tap();
  await mobile.waitForFunction(text=>document.title.includes(text),expected);
}
await mobile.locator('.mobile-nav>button').filter({hasText:'순위'}).first().tap();
await mobile.locator('.ranking-tabs [data-rank-scope="all"]').tap();
assert.equal(await mobile.locator('[data-rank-scope="all"]').getAttribute('aria-pressed'),'true');
assert.ok(await mobile.locator('.ranked-row').count()>0);
await mobile.locator('.ranking-tabs [data-rank-scope="open"]').tap();
assert.equal(await mobile.locator('[data-rank-scope="open"]').getAttribute('aria-pressed'),'true');
await mobile.locator('.mobile-nav>button').filter({hasText:'동네'}).first().tap();
await mobile.locator('.mobile-switch [data-mobile=map]').tap();
await mobile.locator('.map-column:not(.mobile-hidden)').waitFor();
await mobile.locator('.mobile-switch [data-mobile=list]').tap();
await mobile.locator('.list-panel:not(.mobile-hidden)').waitFor();
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await mobile.locator('.header-actions [data-action=language-menu]').tap();
await mobile.locator('.language-menu').waitFor();
await mobile.locator('[data-language-option="ja"]').tap();
await mobile.waitForFunction(()=>document.documentElement.lang==='ja');
await mobile.locator('.mobile-nav>button').first().waitFor();
await mobile.goto(APP+'#admin');
await mobile.locator('.admin-page[data-admin-ready="true"]').waitFor();
await mobile.locator(`[data-admin-select="${createdId}"]`).tap();
await mobile.locator('#admin-detail-map').waitFor();
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.match(await mobile.locator('#admin-inspector').innerText(),/🟡|Inconvenient|불편함/);

assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: first-run language gate, globe switcher, report severity, admin list and location map, collection scroll, mobile tabs');
