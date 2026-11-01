import test from 'node:test';
import assert from 'node:assert/strict';
import { languageOptions } from '../src/languages.js';
import { translateText } from '../src/i18n.js';
test('offline interface options translate known terms and preserve unknown content',()=>{
 assert.deepEqual(languageOptions.map(([id])=>id),['ko','en','vi','km','zh-CN','th','ru','ja']);
 for(const id of ['en','vi','km','zh-CN','th','ru','ja'])assert.notEqual(translateText('민원지도',id),'민원지도');
 assert.equal(translateText('원문 그대로 유지할 임의 게시물', 'vi'),'원문 그대로 유지할 임의 게시물');
});

test('prewritten interface phrases and dynamic counts cover every added language',()=>{
 for(const id of ['vi','km','zh-CN','th','ru','ja']) for(const phrase of ['저장 전 미리 보기 →','불편한 상황을 자세히 적어주세요','개인정보나 민감한 사진은 입력하지 마세요.','0건 표시','제 2회','일부 번역을 불러오지 못해 원문을 표시합니다.']) assert.notEqual(translateText(phrase,id),phrase,`${id}: ${phrase}`);
});
