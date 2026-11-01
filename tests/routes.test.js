import test from 'node:test';
import assert from 'node:assert/strict';
import {routeInfo,pageUrl,pagePaths} from '../src/routes.js';
test('hosted root and deep links preserve a deployment subdirectory',()=>{
 let location=new URL('https://example.com/project/');assert.deepEqual(routeInfo(location),{page:'map',base:'/project'});assert.equal(pageUrl(location,'admin','/project'),'/project/admin');
 location=new URL('https://example.com/project/admin/');assert.deepEqual(routeInfo(location),{page:'admin',base:'/project'});assert.equal(pageUrl(location,'rank','/project'),'/project/ranking');
 location=new URL('https://example.com/project/status/index.html');assert.deepEqual(routeInfo(location),{page:'status',base:'/project'});
 for(const [page,path] of Object.entries(pagePaths))assert.equal(routeInfo(new URL('https://example.com/project/'+path)).page,page);
});
test('legacy hash and local files remain usable without rewriting file paths',()=>{
 const location=new URL('file:///tmp/site/index.html#admin');assert.equal(routeInfo(location).page,'admin');assert.equal(pageUrl(location,'map',routeInfo(location).base),'#map');
 assert.equal(routeInfo(new URL('https://example.com/project/index.html#rank')).page,'rank');
});
