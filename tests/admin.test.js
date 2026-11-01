import test from 'node:test';
import assert from 'node:assert/strict';
import { filteredAdmin, seoulToday, dueInDays } from '../src/admin.js';

test('Seoul date and due window handle timezone and year rollover',()=>{
 const now=new Date('2026-12-31T16:00:00Z');
 assert.equal(seoulToday(now),'2027-01-01');
 assert.equal(dueInDays(7,now),'2027-01-08');
});
test('personal work filters and due sorting exclude completed items from overdue and urgent',()=>{
 const data={reports:[{id:'a',title:'공원',detail:'',location:'충주',category:'청결',createdAt:1,likes:1},{id:'b',title:'도로',detail:'',location:'충주',category:'안전',createdAt:2,likes:2},{id:'c',title:'버스',detail:'',location:'충주',category:'교통',createdAt:3,likes:0}],comments:{}};
 const tasks=new Map([['a',{priority:'긴급',workState:'진행 중',due:'2000-01-01',tags:'현장확인'}],['b',{priority:'긴급',workState:'완료',due:'2001-01-01'}]]);
 const ui={search:'',stage:'전체',category:'전체',sort:'recent',work:'overdue'};
 const run=()=>filteredAdmin({data,updates:[],tasks,ui}).map(x=>x.id);
 assert.deepEqual(run(),['a']);ui.work='urgent';assert.deepEqual(run(),['a']);ui.work='done';assert.deepEqual(run(),['b']);ui.work='unset';assert.deepEqual(run(),['c']);ui.work='all';ui.sort='due';assert.deepEqual(run(),['a','b','c']);ui.search='현장확인';assert.deepEqual(run(),['a']);
});

test('public status changes control completed and reopened reports deterministically',async()=>{
 const {applyReportStatuses}=await import('../src/admin.js');
 const reports=[{id:'a',status:'공감모집'},{id:'b',status:'공감모집'}];
 const updates=[{id:'1',reportId:'a',reportStatus:'처리완료',statusSeq:1,createdAt:'2026-01-01T00:00:00Z'},{id:'3',reportId:'a',reportStatus:'처리중',statusSeq:2,createdAt:'2026-01-01T00:00:00Z'},{id:'2',reportId:'b',reportStatus:'처리완료',statusSeq:1,createdAt:'2026-01-01T00:00:00Z'},{id:'bad',reportId:'a',reportStatus:'처리완료',statusSeq:'999'}];
 applyReportStatuses(reports,updates);assert.equal(reports[0].status,'처리중');assert.equal(reports[1].status,'처리완료');
 const data={reports:reports.map(r=>({...r,title:'제목',detail:'',location:'',category:'청결',likes:0,createdAt:0})),comments:{}};
 const ui={search:'',stage:'전체',category:'전체',sort:'recent',work:'all',reportStatus:'done'};
 assert.deepEqual(filteredAdmin({data,updates:[],ui}).map(r=>r.id),['b']);ui.reportStatus='open';assert.deepEqual(filteredAdmin({data,updates:[],ui}).map(r=>r.id),['a']);
});
