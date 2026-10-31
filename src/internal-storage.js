// No file picker: use the browser's origin-private file system, falling back to
// an IndexedDB-backed virtual file system where OPFS is unavailable (e.g. file://).
const dbName='chungju-eatda-internal-files-v1';
let database;
function openDatabase(){
 if(database)return database;
 database=new Promise((resolve,reject)=>{
  const request=indexedDB.open(dbName,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('files');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(new Error('브라우저 저장소를 열 수 없습니다. 다른 탭을 닫고 다시 시도해 주세요.'));
 });
 return database;
}
async function dbRead(key){
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const transaction=db.transaction('files','readonly'),request=transaction.objectStore('files').get(key);
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
async function dbWrite(key,value){
 const db=await openDatabase();return new Promise((resolve,reject)=>{
  const transaction=db.transaction('files','readwrite');transaction.objectStore('files').put(value,key);
  transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||new Error('저장 취소'));
 });
}
function checkName(name){if(typeof name!=='string'||!name||name==='.'||name==='..'||/[\\/\0]/.test(name))throw new TypeError('Invalid file name');}
const notFound=()=>new DOMException('File not found','NotFoundError');
class IndexedDirectory {
 constructor(path=''){this.path=path;this.name=path.split('/').pop()||'browser-storage';}
 async getDirectoryHandle(name,{create=false}={}){
  checkName(name);const path=this.path?`${this.path}/${name}`:name,key=`dir:${path}`;
  if(!await dbRead(key)){if(!create)throw notFound();await dbWrite(key,true);}
  return new IndexedDirectory(path);
 }
 async getFileHandle(name,{create=false}={}){
  checkName(name);const key=`file:${this.path?`${this.path}/`:''}${name}`;
  if(!create && !(await dbRead(key)))throw notFound();
  return {
   name,
   async getFile(){const content=await dbRead(key);if(!content)throw notFound();return new File([content],name,{type:content.type});},
   async createWritable(){let content,done=false;return {
    async write(value){if(done)throw new Error('File is closed');content=value instanceof Blob?value:new Blob([value]);},
    async close(){if(done)throw new Error('File is closed');await dbWrite(key,content||new Blob([]));done=true;},
    async abort(){done=true;}
   };}
  };
 }
}
export async function internalRoot(){
 if(navigator.storage?.getDirectory){
  try{return {root:await navigator.storage.getDirectory(),kind:'opfs'};}catch(error){console.info('Origin-private files unavailable; using browser database.',error.name);}
 }
 if(!window.indexedDB)throw new Error('이 브라우저에서는 저장 공간을 사용할 수 없습니다.');
 await openDatabase();return {root:new IndexedDirectory(),kind:'indexeddb'};
}

// Protect account creation/initialisation from other tabs when Web Locks is available.
export function withAccountLock(action){
 return navigator.locks?.request ? navigator.locks.request('chungju-eatda-accounts-v1',action) : action();
}
