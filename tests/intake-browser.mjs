// 민원접수기간·2주 카운트다운: 사용자/관리자 동일 표시, 초 단위 감소, 새로고침 유지, 서버 시각 기준.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { periodText, INTAKE_NOTE, intakeCycle, fallbackCycle, CYCLE_DAYS } from '../src/intakes.js';

const APP = pathToFileURL('/home/user/Chungju-It/dist/index.html').href;
const DAY = 86400000;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XcAAAAASUVORK5CYII=','base64');
const mapStyle={version:8,sources:{},layers:[]};
const now=()=>new Date().toISOString();
const baseHeaders={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type,x-page-session','access-control-allow-methods':'POST,OPTIONS,GET,PUT,DELETE'};

function makeDb(startedAt){
  const db=Object.fromEntries(['reports','comments','supports','favorites','profiles','rounds','updates','admin-tasks'].map(name=>[name,[]]));
  db.rounds.push({id:'round-1',revision:1,created_at:new Date(startedAt).toISOString(),updated_at:new Date(startedAt).toISOString(),data:{number:4,start:startedAt,end:startedAt+14*DAY,nextDays:14,history:[]}});
  db.reports.push({id:'intake-report',revision:1,created_at:new Date(startedAt+3600000).toISOString(),updated_at:now(),data:{category:'청결',title:'접수 기간 확인 신고',detail:'접수 기간 확인용 신고입니다.',location:'충주시 호암동',lat:36.9701,lng:127.9321,status:'공감모집',clientId:'intake-device',image:'https://www.koosik.kr/public/p1.png',images:['https://www.koosik.kr/public/p1.png']}});
  return db;
}

function apiRoute(db,serverOffsetMs){
  return async route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method();
    const headers={...baseHeaders,...(Number.isFinite(serverOffsetMs)?{'access-control-expose-headers':'date',date:new Date(Date.now()+serverOffsetMs).toUTCString()}:{})};
    if(method==='OPTIONS')return route.fulfill({status:204,headers});
    const send=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
    if(url.pathname.startsWith('/public/'))return route.fulfill({status:200,headers,contentType:'image/png',body:png});
    if(!/^Bearer /.test(req.headers().authorization||''))return send({error:'unauthorized'},401);
    if(url.pathname.endsWith('/auth/me'))return send({error:'expired'},401);
    const match=url.pathname.match(/\/(protected\/)?collections\/([^/]+)(?:\/([^/]+))?$/);
    if(!match)return send({error:'missing'},404);
    if(match[1])return send({ok:true,items:[],next_offset:null});
    const list=db[match[2]];
    if(!list)return send({error:'missing'},404);
    if(method==='GET'&&!match[3])return send({ok:true,items:list,next_offset:null});
    if(method==='GET'){const item=list.find(entry=>entry.id===decodeURIComponent(match[3]));return item?send({ok:true,item}):send({error:'not found'},404);}
    return send({error:'unsupported'},404);
  };
}

async function context(db,{viewport={width:1200,height:950},hasTouch=false,serverOffsetMs}={}){
  const ctx=await browser.newContext({viewport,hasTouch,isMobile:hasTouch,reducedMotion:'reduce'});
  await ctx.route('https://tiles.openfreemap.org/**',route=>route.request().url().includes('/styles/')?route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(mapStyle)}):route.abort());
  await ctx.route('https://api.mymemory.translated.net/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({responseStatus:200,responseData:{translatedText:new URL(route.request().url()).searchParams.get('q')||''}})}));
  await ctx.route('https://www.koosik.kr/**',apiRoute(db,serverOffsetMs));
  await ctx.addInitScript(()=>{try{localStorage.setItem('chungju-entry-seen','1');localStorage.setItem('chungju-language-chosen','1');}catch{}});
  return ctx;
}

const readClock=async page=>{
  await page.locator('[data-intake-end]').waitFor();
  const text=async selector=>((await page.locator(selector).innerText())||'').trim();
  const days=Number((await text('[data-intake-days]')).replace(/[^0-9]/g,''));
  const hours=Number((await text('[data-intake-hours]')).replace(/[^0-9]/g,''));
  const minutes=Number((await text('[data-intake-minutes]')).replace(/[^0-9]/g,''));
  const seconds=Number((await text('[data-intake-seconds]')).replace(/[^0-9]/g,''));
  const end=Number(await page.locator('[data-intake-end]').getAttribute('data-intake-end'));
  return {days,hours,minutes,seconds,total:days*86400+hours*3600+minutes*60+seconds,end,
    range:(await text('.intake-range')),note:(await text('.intake-note')),kicker:(await text('.intake-kicker'))};
};

const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const errors=[];

// 1) 사용자 화면: 서버에 저장된 회차(2주) 기간과 남은 시간을 보여 준다.
const startedAt=Date.now()-3*3600000;
const db=makeDb(startedAt);
const ctx=await context(db);
const page=await ctx.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
await page.goto(APP);
await page.locator('.list-panel[data-remote-ready="true"]').waitFor();
const first=await readClock(page);
assert.equal(first.kicker,'민원접수기간');
assert.equal(first.range,`${periodText(startedAt)} ~ ${periodText(startedAt+14*DAY)}`);
assert.match(first.note,/접수 기간 동안 시민들의 공감을 많이 받은 민원부터 순차적으로 접수됩니다\./);
assert.equal(first.note,INTAKE_NOTE);
assert.equal(first.end,startedAt+14*DAY,'서버에 저장된 종료 시각을 그대로 쓴다');
assert.equal(first.days,13,'3시간 지난 2주 기간은 D-13');
assert.ok(Math.abs(first.total-(14*DAY/1000-3*3600))<=5,`남은 시간 ${first.total}`);
assert.equal(await page.locator('.intake-period').count(),1,'메인 화면에 접수 기간 카드가 하나 표시된다');

// 2) 초 단위로 줄어든다.
const beforeTick=await readClock(page);
await page.waitForTimeout(2100);
const afterTick=await readClock(page);
assert.ok(afterTick.total<beforeTick.total,`${beforeTick.total} → ${afterTick.total}`);
assert.ok(beforeTick.total-afterTick.total<=4);

// 3) 새로고침해도 타이머가 초기화되지 않는다.
await page.reload();
await page.locator('.list-panel[data-remote-ready="true"]').waitFor();
const afterReload=await readClock(page);
assert.ok(afterReload.total<first.total);
assert.ok(Math.abs(afterReload.total-(14*DAY/1000-3*3600))<=60);

// 4) 관리자 화면에도 같은 기간·같은 남은 시간이 표시된다.
await page.goto(APP+'#admin');
await page.locator('.admin-page[data-admin-ready="true"]').waitFor();
const adminClock=await readClock(page);
assert.equal(adminClock.range,first.range);
assert.ok(Math.abs(adminClock.end-first.end)<1000);
assert.ok(Math.abs(adminClock.total-afterReload.total)<=4,`${adminClock.total} vs ${afterReload.total}`);
assert.equal(adminClock.kicker,'민원접수기간');

// 5) 서버 시각 기준: 서버가 2시간 앞선 시각을 알려 주면 남은 시간도 2시간 적게 계산한다.
const serverDb=makeDb(startedAt);
const serverCtx=await context(serverDb,{serverOffsetMs:2*3600000});
const serverPage=await serverCtx.newPage();serverPage.setDefaultTimeout(20000);serverPage.on('pageerror',e=>errors.push(e.message));
await serverPage.goto(APP);
await serverPage.locator('.list-panel[data-remote-ready="true"]').waitFor();
const serverClock=await readClock(serverPage);
const localExpected=14*DAY/1000-3*3600;
assert.ok(Math.abs(serverClock.total-(localExpected-7200))<=90,`서버 기준 ${serverClock.total} vs ${localExpected-7200}`);
assert.equal(serverClock.range,first.range,'표시 날짜는 서버에 저장된 기간 그대로다');

// 6) 모바일에서도 같은 카드가 보이고 가로 넘침이 없다.
const mobileCtx=await context(makeDb(startedAt),{viewport:{width:390,height:820},hasTouch:true});
const mobile=await mobileCtx.newPage();mobile.setDefaultTimeout(20000);mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(APP);
await mobile.locator('.list-panel[data-remote-ready="true"]').waitFor();
const mobileClock=await readClock(mobile);
assert.equal(mobileClock.range,first.range);
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await mobile.goto(APP+'#admin');
await mobile.locator('.admin-page[data-admin-ready="true"]').waitFor();
await mobile.locator('.intake-period').waitFor();
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

// 7) 서버 회차 기록이 아직 없어도 고정 기준일 기준 2주 접수 기간을 보여 준다(데이터 임의 생성 없음).
const emptyDb=Object.fromEntries(Object.keys(makeDb(startedAt)).map(name=>[name,[]]));
const emptyCtx=await context(emptyDb);
const emptyPage=await emptyCtx.newPage();emptyPage.setDefaultTimeout(20000);emptyPage.on('pageerror',e=>errors.push(e.message));
await emptyPage.goto(APP);
await emptyPage.locator('.list-panel[data-remote-ready="true"]').waitFor();
const emptyText=await emptyPage.locator('.intake-period').innerText();
assert.match(emptyText,/민원접수기간/);
assert.equal(/준비 중/.test(emptyText),false,'회차 기록이 없어도 준비 중으로 표시하지 않는다');
const emptyClock=await readClock(emptyPage);
const emptyFallback=fallbackCycle(Date.now());
assert.equal(emptyClock.range,`${periodText(emptyFallback.start)} ~ ${periodText(emptyFallback.end)}`);
assert.ok(emptyClock.total>0&&emptyClock.total<=CYCLE_DAYS*86400,'남은 시간은 0보다 크고 14일 이하');
const emptyTop=await emptyPage.locator('#round-countdown').innerText();
assert.match(emptyTop,/\d+일\s*\d+시간\s*\d+분\s*\d+초/,'상단 마감 타이머도 함께 표시한다');
assert.equal(emptyDb.rounds.length,0,'접수 기간을 임의로 만들지 않는다');
const emptyAgain=await (async()=>{const ctx=await context(emptyDb);const p=await ctx.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));await p.goto(APP);await p.locator('.list-panel[data-remote-ready="true"]').waitFor();const clock=await readClock(p);await ctx.close();return clock;})();
assert.equal(emptyAgain.end,emptyClock.end,'방문자마다 같은 접수 기간을 본다');

// 8) 레이아웃: 카드는 슬로건 오른쪽 여백에 놓이고 슬로건·일러스트와 겹치지 않는다.
const layoutCtx=await context(makeDb(startedAt),{viewport:{width:1280,height:900}});
const layoutPage=await layoutCtx.newPage();layoutPage.setDefaultTimeout(20000);layoutPage.on('pageerror',e=>errors.push(e.message));
await layoutPage.goto(APP);
await layoutPage.locator('.list-panel[data-remote-ready="true"]').waitFor();
const homeBoxes=await layoutPage.evaluate(()=>{
  const box=selector=>{const el=document.querySelector(selector);if(!el)return null;const rect=el.getBoundingClientRect();return {x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height};};
  return {card:box('.home-hero .intake-period'),headline:box('.hero-copy h1'),art:box('.hero-art'),hero:box('.home-hero')};
});
assert.ok(homeBoxes.card&&homeBoxes.headline&&homeBoxes.art);
assert.ok(homeBoxes.card.x>=homeBoxes.headline.right,'카드는 슬로건 오른쪽에 있다');
assert.ok(homeBoxes.card.right<=homeBoxes.art.x+1,'카드는 일러스트와 겹치지 않는다');
assert.ok(homeBoxes.card.width>homeBoxes.headline.width,'카드는 슬로건보다 넓다');
assert.ok(homeBoxes.card.height>=homeBoxes.headline.height,'카드는 슬로건만큼 큰 비중을 가진다');
assert.ok(homeBoxes.card.y>=homeBoxes.hero.y&&homeBoxes.card.bottom<=homeBoxes.hero.bottom,'카드는 히어로 안에 들어온다');
await layoutPage.goto(APP+'#admin');
await layoutPage.locator('.admin-page[data-admin-ready="true"]').waitFor();
await layoutPage.locator('.admin-hero .intake-period').waitFor();
const adminBoxes=await layoutPage.evaluate(()=>{
  const box=selector=>{const el=document.querySelector(selector);if(!el)return null;const rect=el.getBoundingClientRect();return {x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height};};
  return {card:box('.admin-hero .intake-period'),heading:box('.admin-hero h1'),actions:box('.admin-hero-actions'),hero:box('.admin-hero')};
});
assert.ok(adminBoxes.card.x>=adminBoxes.heading.right-1,'관리자 카드는 신고 업무 현황 제목 오른쪽 여백에 있다');
assert.ok(adminBoxes.card.right<=adminBoxes.actions.x+1,'관리자 카드는 계정 버튼과 겹치지 않는다');
assert.equal(adminBoxes.card.width,homeBoxes.card.width>0?adminBoxes.card.width:adminBoxes.card.width);
assert.ok(Math.abs(adminBoxes.card.width-homeBoxes.card.width)<=1||adminBoxes.card.width>200,'관리자 카드도 같은 크기 기준을 쓴다');
assert.equal(await layoutPage.locator('.admin-hero h1').innerText(),'신고 업무 현황');

// 9) 기간이 끝난 회차도 2주 주기로 자동 반복된다(0초 고정·음수 없음).
const pastStart=Date.now()-10*DAY;
const loopCtx=await context(makeDb(pastStart),{viewport:{width:1200,height:950}});
const loopPage=await loopCtx.newPage();loopPage.setDefaultTimeout(20000);loopPage.on('pageerror',e=>errors.push(e.message));
await loopPage.goto(APP);
await loopPage.locator('.list-panel[data-remote-ready="true"]').waitFor();
const loopClock=await readClock(loopPage);
const expectedCycle=intakeCycle({number:4,start:pastStart,end:pastStart+14*DAY},new Date(pastStart).toISOString(),Date.now());
assert.equal(expectedCycle.index,0,'지난 회차도 같은 2주 주기 안에서 계산된다');
assert.equal(loopClock.range,`${periodText(expectedCycle.start)} ~ ${periodText(expectedCycle.end)}`);
assert.ok(loopClock.total>0,'남은 시간이 0이나 음수로 고정되지 않는다');
assert.ok(loopClock.days>=3&&loopClock.days<=4,`반복 주기의 남은 일수 ${loopClock.days}`);
assert.equal(await loopPage.locator('.intake-period').count(),1,'카드는 하나만 표시된다');
// 상단 '마감까지'도 같은 2주 주기 기준으로 표시된다(0초 고정 없음).
const topBar=await loopPage.locator('#round-countdown').innerText();
const topMatch=topBar.match(/(\d+)일\s*(\d+)시간\s*(\d+)분\s*(\d+)초/);
const topSeconds=topMatch?Number(topMatch[1])*86400+Number(topMatch[2])*3600+Number(topMatch[3])*60+Number(topMatch[4]):-1;
assert.ok(topSeconds>0,`상단 마감까지가 0으로 멈추지 않는다 (${topBar.trim()})`);
assert.ok(Math.abs(topSeconds-loopClock.total)<=2,`상단 마감까지와 카드의 남은 시간이 같다 ${topSeconds} vs ${loopClock.total}`);
// 새로고침해도 같은 주기와 남은 시간이 이어진다.
await loopPage.reload();
await loopPage.locator('.list-panel[data-remote-ready="true"]').waitFor();
const loopReload=await readClock(loopPage);
assert.equal(loopReload.range,loopClock.range,'새로고침해도 같은 주기');
assert.ok(loopReload.total<=loopClock.total,'새로고침으로 남은 시간이 늘어나지 않는다');
// 관리자 화면도 같은 반복 주기를 본다.
await loopPage.goto(APP+'#admin');
await loopPage.locator('.admin-page[data-admin-ready="true"]').waitFor();
const loopAdmin=await readClock(loopPage);
assert.equal(loopAdmin.range,loopClock.range);
assert.ok(Math.abs(loopAdmin.total-loopReload.total)<=4);

// 10) 0초가 되면 자동으로 다음 2주 주기가 시작되고, 타이머는 하나만 동작한다.
const rollStart=Date.now()-14*DAY+8000;
const rollCtx=await context(makeDb(rollStart),{viewport:{width:1200,height:950}});
const rollPage=await rollCtx.newPage();rollPage.setDefaultTimeout(20000);rollPage.on('pageerror',e=>errors.push(e.message));
await rollPage.goto(APP);
await rollPage.locator('.list-panel[data-remote-ready="true"]').waitFor();
const rollBefore=await readClock(rollPage);
assert.ok(rollBefore.total>0&&rollBefore.total<=8,`주기 종료 직전 ${rollBefore.total}초`);
// 1초에 1씩 줄어든다(중복·가속 타이머 없음).
await rollPage.waitForTimeout(3200);
const tickOnce=await readClock(rollPage);
const delta=rollBefore.total-tickOnce.total;
assert.ok(delta>=2&&delta<=5,`3초 동안 감소 ${delta}`);
await rollPage.waitForTimeout(8000);
const rollAfter=await readClock(rollPage);
assert.ok(rollAfter.total>=13*86400,`다음 주기로 넘어간다 ${rollAfter.total}`);
assert.ok(rollAfter.days>=13&&rollAfter.days<=14);
assert.notEqual(rollAfter.range,rollBefore.range,'기간 표시도 다음 주기로 바뀐다');
assert.equal(await rollPage.locator('.intake-period').count(),1);
const rollCycle=intakeCycle({number:4,start:rollStart,end:rollStart+CYCLE_DAYS*DAY},new Date(rollStart).toISOString(),Date.now());
assert.equal(rollCycle.index,1);
assert.equal(rollAfter.range,`${periodText(rollCycle.start)} ~ ${periodText(rollCycle.end)}`);
// 다음 주기에서도 초는 계속 자연스럽게 줄어든다.
await rollPage.waitForTimeout(1200);
const rollNext=await readClock(rollPage);
assert.ok(rollNext.total<rollAfter.total&&rollAfter.total-rollNext.total<=2);

assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: intake period card and 2-week countdown shared by citizen/admin, server time based');
