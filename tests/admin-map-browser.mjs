// Admin workspace: report map, detail links, photo lightbox, map focus and ranking UI.
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
const photo=index=>`https://www.koosik.kr/public/pin-${index}.png`;

// Five reports with real coordinates, different support counts, one with two photos.
const seed=[
  {id:'map-a',likes:0,coords:[36.9701,127.9321],title:'공감 적은 신고',sev:'inconvenience',images:[photo(1)]},
  {id:'map-b',likes:0,coords:[36.9512,127.8712],title:'공감 많은 신고',sev:'critical',images:[photo(2),photo(3)]},
  {id:'map-c',likes:0,coords:[36.9912,127.9255],title:'중간 공감 신고',sev:'caution',images:[photo(4)]},
  {id:'map-d',likes:0,coords:[37.0121,127.8899],title:'처리 완료 신고',sev:'',images:[photo(5)],status:'처리완료'},
];
for(const item of seed){
  db.reports.push({id:item.id,revision:1,created_at:new Date(Date.now()-serial*3600000).toISOString(),updated_at:now(),data:{category:'청결',title:item.title,detail:`${item.title} 상세 내용입니다.`,location:`충주시 ${item.id}`,lat:item.coords[0],lng:item.coords[1],status:item.status||'공감모집',clientId:'device-'+item.id,image:item.images[0],images:item.images,...(item.sev?{severity:item.sev}:{})}});
  serial++;
}
// 공감(supports)은 사용자 화면과 같은 방식으로 집계된다.
const supportCounts={'map-a':1,'map-b':2,'map-c':3,'map-d':1};
for(const [reportId,count] of Object.entries(supportCounts)){
  for(let index=0;index<count;index++)db.supports.push({id:`sup-${reportId}-${index}`,revision:1,created_at:now(),data:{reportId,clientId:`supporter-${reportId}-${index}`}});
}


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
  if(url.pathname.endsWith('/upload')){serial++;return send({ok:true,url:photo(serial)});}
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
const ctx=await context({width:1280,height:1000},false);
const page=await ctx.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
await page.goto(APP+'#admin');
await page.locator('.admin-page[data-admin-ready="true"]').waitFor();

// 1) 지도가 관리자 첫 화면에 있고, 실제 좌표가 있는 민원만 표시한다.
await page.locator('#admin-map[data-map-ready="true"]').waitFor();
assert.equal(await page.locator('#admin-map .maplibregl-canvas').count(),1);
assert.equal(await page.locator('#admin-map [data-admin-marker]').count(),seed.length);
assert.equal(await page.locator('#admin-map .admin-map-empty').count(),0);
assert.match(await page.locator('.admin-map-meta').innerText(),/지도 표시\s*4\s*건/);

// 2) 순위: 사용자 화면과 같은 TOP 3 로직(공감 수)이 관리자 기본 정렬로 적용된다.
const rankedIds=await page.locator('#admin-results [data-admin-select]').evaluateAll(nodes=>nodes.map(node=>node.dataset.adminSelect));
assert.deepEqual(rankedIds.slice(0,3),['map-c','map-b','map-a'],'ranked by support in the citizen ranking order');
assert.equal(await page.locator('#admin-results .admin-rank-badge').count(),3);
assert.match(await page.locator('[data-admin-select="map-c"]').innerText(),/1위/);
assert.match(await page.locator('[data-admin-select="map-d"]').innerText(),/순위권 밖/);
// 사용자 화면 순위 UI와 같은 배지 문구·색을 쓴다.
assert.equal(await page.locator('#admin-results .rank-badge.rank-2').count(),0);
assert.match(await page.locator('[data-admin-select="map-b"] .rank-badge').innerText(),/2위/);
// 같은 순위 기준으로 지도 마커에도 번호가 표시된다.
assert.equal((await page.locator('#admin-map [data-admin-marker="map-c"]').innerText()).trim(),'1');
assert.equal((await page.locator('#admin-map .map-pin.ranked').count()),3);
// 기존 정렬 옵션은 그대로 남아 있고, 순위순은 기본값으로 선택되어 있다.
assert.equal(await page.locator('#admin-sort').inputValue(),'rank');
await page.locator('#admin-sort').selectOption('recent');
assert.equal(await page.locator('[data-admin-select]').first().getAttribute('data-admin-select'),'map-a');
await page.locator('#admin-sort').selectOption('rank');
assert.equal(await page.locator('[data-admin-select]').first().getAttribute('data-admin-select'),'map-c');

// 3) 마커를 누르면 목록·상세가 같은 민원으로 연결된다.
await page.locator('#admin-map [data-admin-marker="map-b"]').click();
await page.locator('#admin-inspector h2').filter({hasText:'공감 많은 신고'}).waitFor();
assert.equal(await page.locator('[data-admin-select="map-b"]').getAttribute('class').then(value=>value.includes('selected')),true);
assert.equal(await page.locator('#admin-map [data-admin-marker="map-b"]').getAttribute('class').then(value=>value.includes('selected')),true);

// 3-1) 마커를 고르면 요약 팝업이 뜨고, '상세 확인'은 화면 이동 없이 상세 팝업을 연다.
await page.locator('#admin-map .maplibregl-popup').filter({hasText:'공감 많은 신고'}).waitFor();
assert.equal(await page.locator('[data-admin-map-open="map-b"]').count(),1);
const mapView=()=>page.evaluate(()=>{const marker=document.querySelector('#admin-map [data-admin-marker="map-b"]');const canvas=document.querySelector('#admin-map .maplibregl-canvas');if(!marker||!canvas)return '';const box=marker.getBoundingClientRect();return [Math.round(box.x),Math.round(box.y),Math.round(canvas.getBoundingClientRect().width)].join('/');});
await page.waitForTimeout(700);
const viewBefore=await mapView();
const scrollBefore=await page.evaluate(()=>window.scrollY);
await page.locator('[data-admin-map-open="map-b"]').click();
await page.locator('#modal-root .modal.admin-detail-modal').waitFor();
assert.equal(await page.locator('#modal-root .modal-backdrop').count(),1);
assert.equal(await page.evaluate(()=>window.scrollY),scrollBefore,'상세 보기는 페이지를 아래로 스크롤하지 않는다');
assert.equal(await mapView(),viewBefore,'상세 팝업을 열어도 지도 중심·확대는 그대로다');
const detailText=await page.locator('#modal-root .admin-detail-modal').innerText();
assert.match(detailText,/공감 많은 신고/,'제목');
assert.match(detailText,/공감 많은 신고 상세 내용입니다/,'전체 내용');
assert.match(detailText,/🔴 매우 심각/,'심각도');
assert.match(detailText,/충주시 map-b/,'위치');
assert.match(detailText,/36\.9512, 127\.8712/,'좌표');
assert.match(detailText,/\d{2}\.\s*\d{2}\./,'날짜');
assert.equal(await page.locator('#modal-root [data-admin-modal-photo]').count(),2,'첨부 사진을 모두 보여 준다');
assert.equal(await page.locator('#modal-root #admin-modal-map').count(),1,'팝업 안에도 위치 지도를 보여 준다');
assert.equal(await page.locator('#admin-inspector .admin-detail-head h2').count(),1,'기존 상세 화면은 그대로 유지된다');
assert.equal(await page.locator('#admin-inspector [data-admin-photo]').count(),2,'상세에는 저장된 사진이 모두 보인다');

// 3-1b) 팝업 안 사진도 눌러서 크게 볼 수 있고, 닫으면 팝업으로 돌아온다.
await page.locator('#modal-root [data-admin-modal-photo="0"]').click();
await page.locator('#photo-lightbox').waitFor();
assert.match(await page.locator('#photo-lightbox .lightbox-bar span').innerText(),/^1 \/ 2$/);
assert.ok(await page.locator('#photo-lightbox img').evaluate(img=>img.src.includes('pin-2.png')));
await page.locator('#photo-lightbox [data-lightbox-step="1"]').click();
assert.match(await page.locator('#photo-lightbox .lightbox-bar span').innerText(),/^2 \/ 2$/);
assert.ok(await page.locator('#photo-lightbox img').evaluate(img=>img.src.includes('pin-3.png')));
await page.locator('#photo-lightbox [data-lightbox-close]').click();
await page.locator('#photo-lightbox').waitFor({state:'detached'});
await page.locator('#modal-root .modal.admin-detail-modal').waitFor();

// 3-1c) 닫으면 같은 지도로 돌아온다(중심·확대·선택·요약 팝업 유지). 배경을 눌러도 닫힌다.
await page.locator('#modal-root .modal-head [data-action=close-modal]').click();
await page.locator('#modal-root .modal.admin-detail-modal').waitFor({state:'detached'});
assert.equal(await mapView(),viewBefore,'닫은 뒤에도 지도 상태가 유지된다');
assert.equal(await page.locator('#admin-map [data-admin-marker="map-b"]').getAttribute('class').then(value=>value.includes('selected')),true,'선택 표시가 유지된다');
assert.equal(await page.locator('#admin-map .maplibregl-popup').filter({hasText:'공감 많은 신고'}).count(),1,'요약 팝업이 유지된다');
await page.locator('[data-admin-map-open="map-b"]').click();
await page.locator('#modal-root .modal.admin-detail-modal').waitFor();
await page.locator('#modal-root .modal-backdrop').click({position:{x:6,y:6}});
await page.locator('#modal-root .modal.admin-detail-modal').waitFor({state:'detached'});
assert.equal(await mapView(),viewBefore,'배경 클릭으로 닫아도 지도 상태가 유지된다');

// 3-2) 좌표 복사 UI는 사진 영역 아래에 있고 기존 복사 기능은 그대로 동작한다. (팝업의 좌표 복사도 같은 값을 쓴다)
const photoArea=await page.locator('#admin-inspector .admin-evidence-photos').boundingBox();
const coordArea=await page.locator('#admin-inspector .admin-evidence-coords').boundingBox();
assert.ok(coordArea.y>=photoArea.y+photoArea.height-1,'좌표 복사는 사진 영역 아래에 있다');
assert.ok(coordArea.y>photoArea.y,'사진과 겹치지 않는다');
assert.ok(Math.abs(coordArea.x-photoArea.x)<=2,'사진과 같은 폭 기준으로 정렬된다');
assert.equal(await page.locator('#admin-inspector .admin-report-evidence button[data-action="copy-admin-location"]').count(),1);
await page.evaluate(()=>{window.__copied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copied=value;}}});});
await page.locator('#admin-inspector [data-action=copy-admin-location]').click();
await page.waitForFunction(()=>typeof window.__copied==='string');
assert.equal(await page.evaluate(()=>window.__copied),'36.9512, 127.8712','저장된 좌표를 그대로 복사한다');
await page.locator('#toast').filter({hasText:'복사'}).waitFor();

// 4) 목록에서 민원을 클릭하면 지도가 그 위치로 이동·확대되고 팝업이 열린다.
await page.locator('[data-admin-select="map-c"]').click();
await page.locator('#admin-inspector h2').filter({hasText:'중간 공감 신고'}).waitFor();
await page.locator('#admin-map .maplibregl-popup').filter({hasText:'중간 공감 신고'}).waitFor();
assert.equal(await page.locator('#admin-map [data-admin-marker="map-c"]').getAttribute('class').then(value=>value.includes('selected')),true);

// 5) 상세 정보: 제목·내용·날짜·위치·심각도·사진이 모두 보인다.
const inspectorText=await page.locator('#admin-inspector').innerText();
assert.match(inspectorText,/중간 공감 신고/);
assert.match(inspectorText,/상세 내용입니다/);
assert.match(inspectorText,/충주시 map-c/);
assert.match(inspectorText,/🟠 주의가 필요함/);
assert.match(inspectorText,/위도 36\.\d+/);

// 6) 첨부 사진 확대: 여러 장을 각각 열고, 닫으면 상세로 돌아온다.
await page.locator('[data-admin-select="map-b"]').click();
await page.locator('#admin-inspector h2').filter({hasText:'공감 많은 신고'}).waitFor();
assert.equal(await page.locator('#admin-inspector .admin-evidence-photo').count(),2);
await page.locator('#admin-inspector [data-admin-photo="0"]').click();
await page.locator('#photo-lightbox').waitFor();
assert.match(await page.locator('#photo-lightbox .lightbox-bar span').innerText(),/^1 \/ 2$/);
assert.ok(await page.locator('#photo-lightbox img').evaluate(img=>img.src.includes('pin-2.png')));
await page.locator('#photo-lightbox [data-lightbox-step="1"]').click();
assert.match(await page.locator('#photo-lightbox .lightbox-bar span').innerText(),/^2 \/ 2$/);
assert.ok(await page.locator('#photo-lightbox img').evaluate(img=>img.src.includes('pin-3.png')));
await page.keyboard.press('Escape');
await page.locator('#photo-lightbox').waitFor({state:'detached'});
await page.locator('#admin-inspector h2').filter({hasText:'공감 많은 신고'}).waitFor();
await page.locator('#admin-inspector [data-admin-photo="1"]').click();
await page.locator('#photo-lightbox').waitFor();
assert.match(await page.locator('#photo-lightbox .lightbox-bar span').innerText(),/^2 \/ 2$/);
await page.locator('#photo-lightbox [data-lightbox-close]').click();
await page.locator('#photo-lightbox').waitFor({state:'detached'});

// 6-1) 목록에서 고른 민원도 상세 화면의 '자세히보기'로 같은 팝업을 연다.
await page.locator('[data-admin-select="map-a"]').click();
await page.locator('#admin-inspector h2').filter({hasText:'공감 적은 신고'}).waitFor();
await page.locator('#admin-inspector [data-action=admin-detail-view]').click();
await page.locator('#modal-root .modal.admin-detail-modal').waitFor();
assert.match(await page.locator('#modal-root .admin-modal-head h3').innerText(),/공감 적은 신고/);
await page.locator('#modal-root .modal-head [data-action=close-modal]').click();
await page.locator('#modal-root .modal.admin-detail-modal').waitFor({state:'detached'});

// 7) 기존 관리자 기능은 그대로 동작한다(상태 변경 폼·삭제 버튼·CSV·필터).
await page.locator('#admin-search').fill('공감 많은');
assert.equal(await page.locator('[data-admin-select]').count(),1);
await page.locator('#admin-search').fill('');
await page.locator('[data-action=admin-reset]').click();
assert.equal(await page.locator('[data-admin-select]').count(),4);
assert.equal(await page.locator('#admin-report-status-filter').count(),1);
assert.equal(await page.locator('[data-action=admin-export]').count(),1);

// 8) 모바일: 지도·마커·상세 팝업·사진 확대가 동작하고 가로 넘침이 없다.
const mobileCtx=await context({width:390,height:820},true);
const mobile=await mobileCtx.newPage();mobile.setDefaultTimeout(20000);mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(APP+'#admin');
await mobile.locator('#admin-map[data-map-ready="true"]').waitFor();
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await mobile.locator('#admin-map [data-admin-marker="map-c"]').tap();
await mobile.locator('#admin-map .maplibregl-popup').filter({hasText:'중간 공감 신고'}).waitFor();
await mobile.waitForTimeout(900);
const mScrollBefore=await mobile.evaluate(()=>window.scrollY);
// 실제 탭과 같은 클릭을 페이지 스크롤 없이 보내, 앱이 스스로 스크롤하는지 확인한다.
await mobile.locator('[data-admin-map-open="map-c"]').evaluate(button=>button.click());
await mobile.locator('#modal-root .modal.admin-detail-modal').waitFor();
assert.equal(await mobile.evaluate(()=>window.scrollY),mScrollBefore,'모바일에서도 상세 팝업은 페이지를 스크롤하지 않는다');
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'팝업이 가로로 넘치지 않는다');
const sheetBox=await mobile.locator('#modal-root .modal').boundingBox();
assert.ok(sheetBox.width<=390&&sheetBox.height<=820,'팝업이 화면 안에 들어온다');
assert.equal(await mobile.locator('#modal-root .modal').evaluate(el=>el.scrollHeight>el.clientHeight+4),true,'팝업 내용은 팝업 내부에서 스크롤된다');
assert.equal(await mobile.locator('#modal-root [data-admin-modal-photo]').count(),1);
await mobile.locator('#modal-root [data-admin-modal-photo="0"]').tap();
await mobile.locator('#photo-lightbox').waitFor();
assert.match(await mobile.locator('#photo-lightbox .lightbox-bar span').innerText(),/^1 \/ 1$/);
await mobile.locator('#photo-lightbox [data-lightbox-close]').tap();
await mobile.locator('#photo-lightbox').waitFor({state:'detached'});
await mobile.locator('#modal-root .modal-head [data-action=close-modal]').tap();
await mobile.locator('#modal-root .modal.admin-detail-modal').waitFor({state:'detached'});
assert.equal(await mobile.locator('.admin-map-section').evaluate(el=>{const box=el.getBoundingClientRect();return box.bottom>0&&box.top<innerHeight;}),true,'닫으면 같은 지도 화면으로 돌아온다');
assert.equal(await mobile.locator('#admin-map [data-admin-marker="map-c"]').getAttribute('class').then(value=>value.includes('selected')),true,'닫은 뒤 선택 표시가 유지된다');
// 목록에서 고르면 기존처럼 상세 화면으로 이동하고, 사진·좌표·지도 이동 기능은 그대로다.
await mobile.locator('[data-admin-select="map-b"]').tap();
await mobile.locator('#admin-inspector .admin-detail-head').waitFor();
await mobile.waitForTimeout(1200);
assert.equal(await mobile.locator('#admin-inspector').evaluate(el=>{const box=el.getBoundingClientRect();return box.top<innerHeight&&box.bottom>0;}),true,'목록 선택 시 상세로 이동한다');
const mPhotos=await mobile.locator('#admin-inspector .admin-evidence-photos').boundingBox();
const mCoords=await mobile.locator('#admin-inspector .admin-evidence-coords').boundingBox();
assert.ok(mCoords.y>=mPhotos.y+mPhotos.height-1,'모바일에서도 좌표 복사는 사진 아래에 있다');
await mobile.locator('[data-action=admin-map-back]').tap();
await mobile.waitForTimeout(500);
assert.equal(await mobile.locator('.admin-map-section').evaluate(el=>{const box=el.getBoundingClientRect();return box.bottom>0&&box.top<innerHeight;}),true,'지도로 돌아갈 수 있다');
await mobile.locator('#admin-inspector [data-admin-photo="0"]').tap();
await mobile.locator('#photo-lightbox').waitFor();
assert.match(await mobile.locator('#photo-lightbox .lightbox-bar span').innerText(),/^1 \/ 2$/);
await mobile.locator('#photo-lightbox [data-lightbox-close]').tap();
await mobile.locator('#photo-lightbox').waitFor({state:'detached'});
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: admin map on the first screen, marker/list detail links, photo lightbox, map focus and citizen ranking order');
