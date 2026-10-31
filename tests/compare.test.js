import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareContent } from '../src/compare.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reports=[{id:'r1',title:'<script>alert(1)</script>',location:'Here',category:'Road',status:'open',likes:12,test:true}];
const render=(ids,language='en')=>compareContent({ids,reports,language,esc,t:x=>x,imageUrl:()=> 'data:image/png;base64,YWJj',statusLabel:x=>x});
test('empty comparison provides three invitation slots',()=>assert.equal((render([]).match(/class="compare-placeholder"/g)||[]).length,3));
test('comparison escapes user-provided text and ignores missing stories',()=>{const html=render(['r1','unknown']);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.equal((html.match(/class="compare-card"/g)||[]).length,1);assert.equal((html.match(/class="compare-placeholder"/g)||[]).length,2);});
test('comparison offers Korean and English controls',()=>{assert.match(render(['r1'],'ko'),/이야기 열기/);assert.match(render(['r1'],'en'),/Open story/);});
