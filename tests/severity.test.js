import test from 'node:test';
import assert from 'node:assert/strict';
import { severities, severityById, severityLabel, severityText, severityIds, severityRank } from '../src/data.js';
import { buildSharedData } from '../src/remote-store.js';
import { adminResults, adminInspector, filteredAdmin } from '../src/admin.js';

const base = {category:'청결',title:'심각도 신고',detail:'상세 내용입니다',location:'충주시 호암동',lat:36.96,lng:127.92,status:'공감모집'};
const record = (data, id='r-sev-1') => ({id,revision:1,created_at:new Date().toISOString(),data});
const shared = (...reports) => buildSharedData({reports}, 'device-severity');

test('five severity levels keep the requested emoji, name and description', () => {
  assert.deepEqual(severities.map(item => item.emoji), ['🔴','🆘','⚠️','🟠','🟡']);
  assert.deepEqual(severities.map(item => item.label), ['매우 심각','빠른 조치 시급','위험함','주의가 필요함','불편함']);
  assert.match(severities[0].desc, /즉각적인 확인과 조치/);
  assert.match(severities[1].desc, /신속한 대응/);
  assert.match(severities[2].desc, /안전이나 주변 환경에 위험/);
  assert.match(severities[3].desc, /지속적인 관심과 확인/);
  assert.match(severities[4].desc, /일상생활에서 불편/);
  assert.equal(severityById('critical').label, '매우 심각');
  assert.equal(severityById('unknown'), null);
  assert.equal(severityLabel('urgent','en'), 'Urgent');
  assert.equal(severityLabel('','en'), '');
  assert.equal(severityText('danger','ko'), '⚠️ 위험함');
  assert.equal(severityIds.length, 5);
});

test('severity rank orders severe reports first and unset reports last', () => {
  assert.deepEqual([...severityIds].sort((a,b)=>severityRank(a)-severityRank(b)), severityIds);
  assert.equal(severityRank('critical'), 0);
  assert.ok(severityRank(undefined) > severityRank('inconvenience'));
});

test('remote reports keep the stored severity', () => {
  const sharedData = shared(record({...base,severity:'danger'}));
  assert.equal(sharedData.data.reports[0].severity, 'danger');
});

test('reports written before the severity field still load without a value', () => {
  const sharedData = shared(record({...base}, 'r-sev-legacy'));
  assert.equal(sharedData.data.reports[0].severity, '');
  assert.equal(sharedData.skipped, 0);
});

test('unknown severity values are ignored instead of breaking the report', () => {
  const sharedData = shared(record({...base,severity:'apocalypse'}));
  assert.equal(sharedData.data.reports[0].severity, '');
});

test('admin list shows severity, date and summary, and sorts by severity', () => {
  const data = shared(
    record({...base,title:'가벼운 불편',detail:'자전거 거치대가 없어요',severity:'inconvenience'}, 'r-sev-a'),
    record({...base,title:'즉시 조치',detail:'맨홀 뚜껑이 열려 있어요',severity:'critical'}, 'r-sev-b'),
  ).data;
  const ui = {search:'',stage:'전체',category:'전체',sort:'severity',work:'all',reportStatus:'all',selected:null};
  const html = adminResults({data,updates:[],tasks:new Map(),ui,esc:value=>String(value)});
  assert.match(html, /🔴 매우 심각/);
  assert.match(html, /🟡 불편함/);
  assert.match(html, /맨홀 뚜껑이 열려 있어요/);
  assert.ok(html.indexOf('즉시 조치') < html.indexOf('가벼운 불편'), 'severe report comes first');
  const filtered = filteredAdmin({data,updates:[],tasks:new Map(),ui});
  assert.deepEqual(filtered.map(report=>report.title), ['즉시 조치','가벼운 불편']);
});

test('admin list marks reports without severity', () => {
  const data = shared(record({...base,title:'예전 신고'}, 'r-sev-old')).data;
  const html = adminResults({data,updates:[],tasks:new Map(),ui:{search:'',stage:'전체',category:'전체',sort:'recent',work:'all',reportStatus:'all',selected:null},esc:value=>String(value)});
  assert.match(html, /심각도 미지정/);
});

test('admin inspector shows the severity and a map only when coordinates exist', () => {
  const data = shared(record({...base,severity:'urgent'})).data;
  const report = data.reports[0];
  const ui = {search:'',stage:'전체',category:'전체',sort:'recent',work:'all',reportStatus:'all',selected:report.id};
  const html = adminInspector({data,updates:[],tasks:new Map(),ui,signedIn:false,user:null,imageUrl:value=>value,esc:value=>String(value)});
  assert.match(html, /🆘 빠른 조치 시급/);
  assert.match(html, /id="admin-detail-map"/);
  assert.match(html, new RegExp(`data-lat="${report.lat}"`));

  const withoutCoords = {...report, lat: undefined, lng: undefined};
  const fallback = adminInspector({data:{...data,reports:[withoutCoords]},updates:[],tasks:new Map(),ui,signedIn:false,user:null,imageUrl:value=>value,esc:value=>String(value)});
  assert.match(fallback, /위치 정보 없음/);
  assert.doesNotMatch(fallback, /id="admin-detail-map"/);
});

test('backup validation keeps the severity field', async () => {
  const { validateBackup } = await import('../src/backup.js');
  const { categories, statuses, initialReports, imageFor } = await import('../src/data.js');
  const payload = {format:'chungju-eatda-backup',version:1,data:{reports:[...initialReports.map(report=>({...report})),{...initialReports[0],id:'r99',title:'백업 심각도',severity:'critical'}],liked:[],favorites:[],comments:{},guest:'게스트'}};
  const validated = validateBackup(payload, categories, statuses, Object.values(imageFor));
  assert.equal(validated.reports.find(report=>report.id==='r99').severity, 'critical');
});
