import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound, validRound, closeRound, remaining, topThree, DAY } from '../src/rounds.js';
const reports = [
 {id:'z',title:'Z',location:'A',likes:20,status:'공감모집'},
 {id:'a',title:'A',location:'A',likes:20,status:'공감모집'},
 {id:'b',title:'B',location:'A',likes:5,status:'공감모집'},
 {id:'c',title:'C',location:'A',likes:100,status:'처리완료'}
];
test('ranks only open stories with deterministic tie-breaks',()=>assert.deepEqual(topThree(reports).map(r=>r.id),['a','z','b']));
test('closing freezes results and applies next round duration',()=>{const round=createRound(1000,1,7);round.nextDays=14;const next=closeRound(round,reports,2000,true);assert.equal(next.end,2000+14*DAY);assert.equal(next.history[0].end,2000);assert.equal(next.history[0].top[0].likes,20);reports[1].likes=25;assert.equal(next.history[0].top[0].likes,20);reports[1].likes=20;assert.ok(validRound(next));});
test('history is bounded and corrupt rounds are rejected',()=>{let r=createRound(1);for(let i=0;i<35;i++)r=closeRound(r,reports,100+i,true);assert.equal(r.history.length,30);assert.ok(validRound(r));assert.equal(validRound({...r,end:r.start}),false);assert.equal(validRound({...r,nextDays:99}),false);});
test('countdown never becomes negative',()=>{assert.equal(remaining(0,1),'0일 00시간 00분 00초');assert.equal(remaining(DAY+61000,0),'1일 00시간 01분 01초');});
