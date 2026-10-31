// Local folder storage. The browser must grant access to a user-selected directory.
const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
const unhex = value => Uint8Array.from(value.match(/../g), byte => parseInt(byte,16));
const randomHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const iterations = 210000;
const userPattern = /^[\p{L}\p{N}_ .-]{2,20}$/u;
const safeId = id => typeof id === 'string' && /^[a-f0-9]{32}$/.test(id);

export function normalizeName(name) { return String(name).normalize('NFKC').trim(); }
export function validCredentials(name, password) {
  return userPattern.test(normalizeName(name)) && typeof password === 'string' && password.length >= 8 && password.length <= 128;
}
async function passwordHash(password, salt, count=iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(salt),iterations:count},key,256));
}
async function folder(root, path, create=false) {
  let current=root;
  for(const name of path) current=await current.getDirectoryHandle(name,{create});
  return current;
}
async function readText(dir, name, missing=false) {
  try {
    const file=await (await dir.getFileHandle(name)).getFile();
    if(file.size>25*1024*1024) throw Error('파일이 너무 큽니다.');
    return await file.text();
  } catch(error) { if(missing && error.name==='NotFoundError') return null; throw error; }
}
async function write(dir, name, contents) {
  const handle=await dir.getFileHandle(name,{create:true});
  const writer=await handle.createWritable();
  try { await writer.write(contents); await writer.close(); }
  catch(error) { try { await writer.abort(); } catch {} throw error; }
}
async function readAccounts(root) {
  const dir=await folder(root,['data'],true), text=await readText(dir,'accounts.json',true);
  if(text===null) return [];
  let value; try { value=JSON.parse(text); } catch { throw Error('계정 파일이 손상되었습니다.'); }
  if(!value || value.version!==1 || !Array.isArray(value.accounts) || value.accounts.length>1000 || value.accounts.some(a=>!a || !safeId(a.id) || typeof a.name!=='string' || !userPattern.test(a.name) || !/^[a-f0-9]{32}$/.test(a.salt) || !/^[a-f0-9]{64}$/.test(a.hash) || a.iterations!==iterations)) throw Error('계정 파일이 올바르지 않습니다.');
  return value.accounts;
}
// Create the initial directory structure and account file without replacing existing data.
export async function initializeStore(root) {
 const data=await folder(root,['data'],true);
 await folder(root,['data','users'],true);
 await folder(root,['img'],true);
 const text=await readText(data,'accounts.json',true);
 if(text===null) await write(data,'accounts.json',JSON.stringify({version:1,accounts:[]},null,2));
 else await readAccounts(root); // Never replace a damaged account file silently.
}
export async function register(root, rawName, password, initialSnapshot) {
  const name=normalizeName(rawName);
  if(!validCredentials(name,password)) throw Error('이름은 2~20자, 비밀번호는 8~128자로 입력해 주세요.');
  const accounts=await readAccounts(root);
  if(accounts.some(a=>normalizeName(a.name).toLocaleLowerCase('en-US')===name.toLocaleLowerCase('en-US'))) throw Error('이미 사용 중인 이름입니다.');
  const salt=randomHex(16), id=randomHex(16), hash=await passwordHash(password,salt);
  const account={id,name,salt,hash,iterations,createdAt:new Date().toISOString()};
  // Commit the profile first so an account is never created without its data.
  await writeSnapshot(root,id,initialSnapshot);
  await write(await folder(root,['data'],true),'accounts.json',JSON.stringify({version:1,accounts:[...accounts,account]},null,2));
  return {id,name};
}
export async function authenticate(root, rawName, password) {
  const name=normalizeName(rawName), accounts=await readAccounts(root);
  const account=accounts.find(a=>normalizeName(a.name).toLocaleLowerCase('en-US')===name.toLocaleLowerCase('en-US'));
  if(!account || typeof password!=='string' || password.length>128) throw Error('이름 또는 비밀번호가 올바르지 않습니다.');
  const actual=await passwordHash(password,account.salt,account.iterations);
  let diff=0; for(let i=0;i<actual.length;i++) diff|=actual.charCodeAt(i)^account.hash.charCodeAt(i);
  if(diff) throw Error('이름 또는 비밀번호가 올바르지 않습니다.');
  return {id:account.id,name:account.name};
}
const mimeExtensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
function decodeDataImage(value) {
  const match=/^data:(image\/(?:jpeg|png|webp|gif));base64,([a-zA-Z0-9+/=]+)$/.exec(value);
  if(!match) throw Error('사진은 JPG, PNG, WEBP, GIF 파일만 저장할 수 있습니다.');
  const raw=atob(match[2]); if(raw.length>1024*1024) throw Error('사진은 1MB 이하여야 합니다.');
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  return {bytes,type:match[1],ext:mimeExtensions[match[1]]};
}
export async function writeSnapshot(root,id,snapshot) {
  if(!safeId(id)) throw Error('계정 식별자가 올바르지 않습니다.');
  const copy=JSON.parse(JSON.stringify(snapshot));
  if(!copy?.data?.reports || !Array.isArray(copy.data.reports)) throw Error('기록 형식이 올바르지 않습니다.');
  for(const report of copy.data.reports) {
    if(typeof report.image==='string' && report.image.startsWith('data:')) {
      const photo=decodeDataImage(report.image);
      const hash=hex(await crypto.subtle.digest('SHA-256',photo.bytes));
      const name=`${hash}.${photo.ext}`;
      const dir=await folder(root,['img'],true);
      await write(dir,name,new Blob([photo.bytes],{type:photo.type}));
      report.image=`img/${name}`;
    }
  }
  await write(await folder(root,['data','users'],true),`${id}.json`,JSON.stringify(copy,null,2));
}
export async function readSnapshot(root,id) {
  if(!safeId(id)) throw Error('계정 식별자가 올바르지 않습니다.');
  const text=await readText(await folder(root,['data','users']),`${id}.json`);
  let snapshot; try { snapshot=JSON.parse(text); } catch { throw Error('기록 파일이 손상되었습니다.'); }
  if(!snapshot || snapshot.version!==1 || !snapshot.data || !Array.isArray(snapshot.data.reports)) throw Error('기록 파일 형식이 올바르지 않습니다.');
  for(const report of snapshot.data.reports) {
    if(typeof report.image==='string' && report.image.startsWith('img/')) {
      const match=/^img\/([a-f0-9]{64})\.(jpg|png|webp|gif)$/.exec(report.image);
      if(!match) throw Error('사진 경로가 올바르지 않습니다.');
      const file=await (await (await folder(root,['img'])).getFileHandle(`${match[1]}.${match[2]}`)).getFile();
      if(file.size>1024*1024) throw Error('저장된 사진이 너무 큽니다.');
      const bytes=new Uint8Array(await file.arrayBuffer());
      const digest=hex(await crypto.subtle.digest('SHA-256',bytes));
      if(digest!==match[1]) throw Error('저장된 사진이 손상되었습니다.');
      let binary=''; for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
      const mime={jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'}[match[2]];
      report.image=`data:${mime};base64,${btoa(binary)}`;
    }
  }
  return snapshot;
}
