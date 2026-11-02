import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { register, authenticate, writeSnapshot, readSnapshot, initializeStore } from '../src/local-files.js';

// Adapter exercises the exact File System Access calls against actual temporary files.
class Dir {
  constructor(path){this.path=path;this.name='test-folder';}
  async getDirectoryHandle(name,{create=false}={}){
    const path=join(this.path,name); if(create) await mkdir(path,{recursive:true});
    try { await stat(path); } catch { throw new DOMException('missing','NotFoundError'); }
    return new Dir(path);
  }
  async getFileHandle(name,{create=false}={}){
    const path=join(this.path,name); if(!create){try{await stat(path);}catch{throw new DOMException('missing','NotFoundError');}}
    return {
      async getFile(){const b=await readFile(path);return new File([b],name);},
      async createWritable(){let body;return {async write(value){body=value instanceof Blob ? Buffer.from(await value.arrayBuffer()) : value;},async close(){await writeFile(path,body);},async abort(){}};}
    };
  }
}
const snapshot = () => ({version:1,data:{reports:[{id:'test-123',image:'data:image/png;base64,iVBORw0KGgo=',images:['data:image/png;base64,iVBORw0KGgo=','data:image/gif;base64,R0lGODlhAQABAAAAACw=']}],liked:[],favorites:[],comments:{},guest:'Local'},round:{},compareIds:[]});

test('accounts, photos and changes persist as files with no plaintext password',async t=>{
  const path=await mkdtemp(join(tmpdir(),'chungju-files-'));t.after(()=>rm(path,{recursive:true,force:true}));
  const root=new Dir(path), one=await register(root,'홍길동','password123',snapshot());
  const accounts=await readFile(join(path,'data','accounts.json'),'utf8');
  assert.doesNotMatch(accounts,/password123/);assert.match(accounts,/"hash"/);
  assert.equal((await authenticate(root,'홍길동','password123')).id,one.id);
  await assert.rejects(authenticate(root,'홍길동','wrong123'),/올바르지/);
  await assert.rejects(register(root,'홍길동','password123',snapshot()),/이미 사용/);
  const files=await readdir(join(path,'img'));
  assert.equal(files.length,2);
  const img=files.find(name=>name.endsWith('.png'));
  assert.match(img,/^[a-f0-9]{64}\.png$/);assert.deepEqual(await readFile(join(path,'img',img)),Buffer.from('iVBORw0KGgo=','base64'));
  assert.ok(files.some(name=>/^[a-f0-9]{64}\.gif$/.test(name)));
  const json=await readFile(join(path,'data','users',one.id+'.json'),'utf8');
  assert.match(json,/img\//);assert.doesNotMatch(json,/base64/);
  const restored=await readSnapshot(root,one.id);assert.equal(restored.data.reports[0].image,'data:image/png;base64,iVBORw0KGgo=');assert.deepEqual(restored.data.reports[0].images,['data:image/png;base64,iVBORw0KGgo=','data:image/gif;base64,R0lGODlhAQABAAAAACw=']);
  restored.data.liked.push('test-123');await writeSnapshot(root,one.id,restored);
  assert.deepEqual((await readSnapshot(root,one.id)).data.liked,['test-123']);
  await writeFile(join(path,'img',img),'corrupt');await assert.rejects(readSnapshot(root,one.id),/손상/);
});

test('rejects unsafe account names and weak passwords',async t=>{
 const path=await mkdtemp(join(tmpdir(),'chungju-files-'));t.after(()=>rm(path,{recursive:true,force:true}));const root=new Dir(path);
 for(const [name,pass] of [['../bad','password123'],['ok','123'],['a','password123']]) await assert.rejects(register(root,name,pass,snapshot()),/이름은/);
});

test('initialization creates empty files and never overwrites malformed accounts',async t=>{
 const path=await mkdtemp(join(tmpdir(),'chungju-init-'));t.after(()=>rm(path,{recursive:true,force:true}));const root=new Dir(path);
 await initializeStore(root);assert.deepEqual(JSON.parse(await readFile(join(path,'data','accounts.json'),'utf8')).accounts,[]);
 await writeFile(join(path,'data','accounts.json'),'{broken');
 await assert.rejects(initializeStore(root),/손상/);
 assert.equal(await readFile(join(path,'data','accounts.json'),'utf8'),'{broken');
});
