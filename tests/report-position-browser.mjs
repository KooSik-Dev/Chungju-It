// 민원 신고: 지도 좌표 필수 지정(화면 검증 + 저장 단계 검증)과 관리자 전달.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { POSITION_MESSAGE } from '../src/report-position.js';

const APP = pathToFileURL('/home/user/Chungju-It/dist/index.html').href;
const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type,x-page-session','access-control-allow-methods':'POST,OPTIONS,GET,PUT,DELETE'};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XcAAAAASUVORK5CYII=','base64');
const mapStyle={version:8,sources:{},layers:[]};
const db=Object.fromEntries(['reports','comments','supports','favorites','profiles','rounds','updates','admin-tasks'].map(name=>[name,[]]));
const protectedDb=Object.fromEntries(Object.keys(db).map(name=>[name,[]]));
const users=new Map(),sessions=new Map();
const posted=[];
let serial=0,sequence=0;
const now=()=>new Date().toISOString();

async function apiRoute(route){
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
    posted.push({collection:match[2],value});
    const next={id:'p'+(++serial),data:value,revision:1,created_at:now(),updated_at:now(),...(isProtected?{owner_id:user.id,owner_name:user.username,visibility:body.visibility}:{})};
    list.unshift(next);return send({ok:true,item:next});
  }
  if(!item||!visible(item))return send({error:'not found'},404);
  if(method==='PUT'){const body=JSON.parse(req.postData());if(item.revision!==body.revision)return send({error:'conflict'},409);item.data=body.data;item.revision++;item.updated_at=now();return send({ok:true,item});}
  if(method==='DELETE'){list.splice(list.indexOf(item),1);return send({ok:true});}
  return send({error:'unsupported'},404);
}

async function context(viewport,hasTouch){
  const ctx=await browser.newContext({viewport,hasTouch,isMobile:hasTouch,reducedMotion:'reduce'});
  await ctx.route('https://tiles.openfreemap.org/**',route=>route.request().url().includes('/styles/')?route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(mapStyle)}):route.abort());
  await ctx.route('https://api.mymemory.translated.net/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({responseStatus:200,responseData:{translatedText:new URL(route.request().url()).searchParams.get('q')||''}})}));
  await ctx.route('https://www.koosik.kr/**',apiRoute);
  await ctx.addInitScript(()=>{try{localStorage.setItem('chungju-entry-seen','1');localStorage.setItem('chungju-language-chosen','1');}catch{}});
  return ctx;
}

const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const errors=[];
const ctx=await context({width:1200,height:950},false);
const page=await ctx.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
await page.goto(APP);

// 회원으로 로그인(민원 신고는 로그인/게스트 필요).
await page.locator('.list-panel[data-remote-ready="true"]').waitFor();
await page.locator('.header [data-action=report]').click();
await page.locator('#guest-form').waitFor();
await page.locator('[data-action=guest-back]').click();
await page.locator('[data-action=auth-mode]').click();
await page.locator('[name=username]').fill('position-user');
await page.locator('[name=password]').fill('position-password');
await page.locator('[name=confirm]').fill('position-password');
await page.locator('#auth-form [type=submit]').click();
await page.locator('#report-form').waitFor();

const fillReport=async(title)=>{
  await page.locator('[name=category]').selectOption('청결');
  await page.locator('[name=title]').fill(title);
  await page.locator('[name=detail]').fill(`${title} 상세 내용입니다.`);
  await page.locator('[name=location]').fill('충주시 호암동 산책로');
};
const reportPosts=()=>posted.filter(entry=>entry.collection==='reports');

// 1) 지도에서 위치를 지정하지 않으면 좌표가 비어 있고 안내 문구만 보인다.
assert.equal(await page.locator('#report-form [name=lat]').inputValue(),'');
assert.equal(await page.locator('#report-form [name=lng]').inputValue(),'');
assert.equal(await page.locator('#picker-status').getAttribute('class').then(v=>String(v).includes('is-set')),false);
await page.locator('#picker-map .maplibregl-canvas').waitFor();
assert.equal(await page.locator('#picker-map .maplibregl-marker').count(),0,'좌표를 고르기 전에는 마커가 없다');

// 2) 좌표 없이 제출하면 저장되지 않고 안내 문구가 표시된다.
await fillReport('좌표 없는 신고');
await page.locator('#report-form [type=submit]').click();
await page.locator('#picker-error').waitFor();
assert.equal((await page.locator('#picker-error').innerText()).trim(),POSITION_MESSAGE);
assert.equal(await page.locator('#picker-error').isVisible(),true);
assert.equal(await page.locator('.modal').count(),1,'신고 창은 그대로 열려 있어야 한다');
assert.equal(reportPosts().length,0,'좌표가 없으면 저장 요청을 보내지 않는다');
assert.equal(await page.locator('#report-form [type=submit]').isDisabled(),false,'다시 시도할 수 있어야 한다');

// 3) 지도를 눌러 위치를 지정하면 좌표와 마커가 생긴다.
await page.locator('#picker-map').click({position:{x:150,y:90}});
await page.waitForFunction(()=>document.querySelector('#picker-status')?.classList.contains('is-set'));
const chosenLat=await page.locator('#report-form [name=lat]').inputValue();
const chosenLng=await page.locator('#report-form [name=lng]').inputValue();
assert.ok(Number(chosenLat)>=33&&Number(chosenLat)<=39,`lat ${chosenLat}`);
assert.ok(Number(chosenLng)>=124&&Number(chosenLng)<=132,`lng ${chosenLng}`);
assert.equal(await page.locator('#picker-error').isVisible(),false);
assert.match(await page.locator('#picker-status').innerText(),/선택한 위치/);
assert.equal(await page.locator('#picker-map .maplibregl-marker').count(),1,'선택한 위치에 마커가 표시된다');

// 4) 지정한 좌표 그대로 저장되고 관리자 화면에도 같은 좌표가 전달된다.
await page.locator('#report-form [type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
const created=db.reports.find(entry=>entry.data.title==='좌표 없는 신고');
assert.ok(created,'신고가 저장되어야 한다');
assert.equal(Number(created.data.lat).toFixed(6),Number(chosenLat).toFixed(6));
assert.equal(Number(created.data.lng).toFixed(6),Number(chosenLng).toFixed(6));
assert.ok(Number(created.data.lat)>=33&&Number(created.data.lat)<=39);
const stored=reportPosts().at(-1).value;
assert.equal(Number(stored.lat),Number(chosenLat));
assert.equal(Number(stored.lng),Number(chosenLng));
await page.locator(`[data-card="${created.id}"]`).waitFor();
assert.match(await page.locator(`[data-card="${created.id}"]`).innerText(),/좌표 없는 신고/);

// 5) 새로고침해도 저장된 좌표가 바뀌지 않는다(임의 좌표 생성 없음).
await page.reload();
await page.locator('.list-panel[data-remote-ready="true"]').waitFor();
await page.locator(`[data-card="${created.id}"]`).waitFor();
assert.equal(Number(db.reports.find(entry=>entry.id===created.id).data.lat),Number(chosenLat));

// 6) 관리자 지도/상세에서 같은 좌표를 확인할 수 있다.
await page.goto(APP+'#admin');
await page.locator('.admin-page[data-admin-ready="true"]').waitFor();
await page.locator('#admin-map[data-map-ready="true"]').waitFor();
assert.equal(await page.locator('#admin-map [data-admin-marker]').count(),1);
await page.locator('#admin-map [data-admin-marker]').click();
await page.locator('#admin-inspector h2').filter({hasText:'좌표 없는 신고'}).waitFor();
assert.match(await page.locator('#admin-inspector').innerText(),new RegExp(`${Number(chosenLat).toFixed(5)}`));

// 7) 좌표를 지우면 다시 제출이 막힌다.
await page.goto(APP+'#main');await page.reload();
await page.locator('.list-panel[data-remote-ready="true"]').waitFor();
await page.locator('.header [data-action=report]').click();
await page.locator('#report-form').waitFor();
await fillReport('좌표 지운 신고');
await page.locator('#report-form [name=lat]').fill('36.9921');
await page.locator('#report-form [name=lng]').fill('127.9261');
await page.waitForFunction(()=>document.querySelector('#picker-status')?.classList.contains('is-set'));
const beforeClear=reportPosts().length;
await page.locator('#report-form [name=lat]').fill('');
await page.locator('#report-form [type=submit]').click();
await page.locator('#picker-error').waitFor();
assert.equal((await page.locator('#picker-error').innerText()).trim(),POSITION_MESSAGE);
assert.equal(reportPosts().length,beforeClear,'좌표가 없으면 저장하지 않는다');

// 8) 다시 좌표를 입력하면 저장할 수 있다(위치 변경·확인 가능).
await page.locator('#report-form [name=lat]').fill('36.9931');
await page.locator('#report-form [name=lng]').fill('127.9281');
await page.waitForFunction(()=>document.querySelector('#picker-status')?.classList.contains('is-set'));
await page.locator('#report-form [type=submit]').click();
await page.locator('.modal').waitFor({state:'detached'});
const edited=db.reports.find(entry=>entry.data.title==='좌표 지운 신고');
assert.ok(edited);
assert.equal(Number(edited.data.lat).toFixed(6),'36.993100');

// 9) 모바일에서도 좌표 없이는 제출되지 않고, 지도 탭으로 지정할 수 있다.
const mobileCtx=await context({width:390,height:820},true);
const mobile=await mobileCtx.newPage();mobile.setDefaultTimeout(20000);mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(APP);
await mobile.locator('.list-panel[data-remote-ready="true"]').waitFor();
await mobile.locator('.mobile-nav [data-action=report]').click();
await mobile.locator('#guest-form').waitFor();
await mobile.locator('[data-action=guest-back]').click();
await mobile.locator('[data-action=auth-mode]').click();
await mobile.locator('[name=username]').fill('position-mobile');
await mobile.locator('[name=password]').fill('position-mobile-password');
await mobile.locator('[name=confirm]').fill('position-mobile-password');
await mobile.locator('#auth-form [type=submit]').click();
await mobile.locator('#report-form').waitFor();
await mobile.locator('[name=category]').selectOption('가로등');
await mobile.locator('[name=title]').fill('모바일 좌표 신고');
await mobile.locator('[name=detail]').fill('모바일 좌표 확인');
await mobile.locator('[name=location]').fill('충주시 연수동');
const mobileBefore=reportPosts().length;
await mobile.locator('#report-form [type=submit]').click();
await mobile.locator('#picker-error').waitFor();
assert.equal((await mobile.locator('#picker-error').innerText()).trim(),POSITION_MESSAGE);
assert.equal(reportPosts().length,mobileBefore);
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await mobile.locator('#picker-map').tap({position:{x:110,y:80}});
await mobile.waitForFunction(()=>document.querySelector('#picker-status')?.classList.contains('is-set'));
assert.ok(Number(await mobile.locator('#report-form [name=lat]').inputValue())>=33);
await mobile.locator('#report-form [type=submit]').click();
await mobile.locator('.modal').waitFor({state:'detached'});
assert.ok(db.reports.some(entry=>entry.data.title==='모바일 좌표 신고'&&Number.isFinite(entry.data.lat)&&Number.isFinite(entry.data.lng)));
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: report map position required (screen + save), stored coordinates and admin handoff');
