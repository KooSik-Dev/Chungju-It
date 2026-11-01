import test from 'node:test';
import assert from 'node:assert/strict';
import { languageOptions } from '../src/languages.js';
import { translateText } from '../src/i18n.js';
test('offline interface options translate known terms and preserve unknown content',()=>{
 assert.deepEqual(languageOptions.map(([id])=>id),['ko','en','vi','km','zh-CN','th','ru','ja']);
 for(const id of ['en','vi','km','zh-CN','th','ru','ja'])assert.notEqual(translateText('민원지도',id),'민원지도');
 assert.equal(translateText('원문 그대로 유지할 임의 게시물', 'vi'),'원문 그대로 유지할 임의 게시물');
});
