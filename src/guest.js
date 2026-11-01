// Guest recovery codes are bearer secrets. Never include them in public collections or logs.
const cookieName='chungju_guest';
export function normalizeGuestSuffix(value){return typeof value==='string'?value.normalize('NFKC').trim():'';}
export function validGuestSuffix(value){const text=normalizeGuestSuffix(value);return text.length>0&&text.length<=20&&!/[#\u0000-\u001f\u007f]/u.test(text);}
const uuid=value=>typeof value==='string'&&/^[0-9a-f-]{36}$/i.test(value);
const enc=new TextEncoder(),dec=new TextDecoder();
function toBase64(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function fromBase64(text){if(!/^[A-Za-z0-9_-]+$/.test(text))throw new Error('복구 코드가 올바르지 않습니다.');const padded=text.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-text.length%4)%4);return Uint8Array.from(atob(padded),x=>x.charCodeAt(0));}
export function makeGuestCode({id,suffix,secret}){
 suffix=normalizeGuestSuffix(suffix);if(!uuid(id)||!validGuestSuffix(suffix)||typeof secret!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(secret))throw new Error('게스트 정보를 확인해 주세요.');
 return 'CJI1.'+toBase64(enc.encode(JSON.stringify({id,suffix,secret})));
}
export function parseGuestCode(code){
 try{if(typeof code!=='string'||!code.startsWith('CJI1.')||code.length>500)throw Error();const item=JSON.parse(dec.decode(fromBase64(code.slice(5))));const clean=makeGuestCode(item);if(clean!==code)throw Error();return {...item,code:clean};}catch{throw new Error('복구 코드가 올바르지 않습니다.');}
}
export function newGuestSecret(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return toBase64(bytes);}
export async function guestAccount(suffix){if(!validGuestSuffix(suffix))throw new Error('게스트 이름을 확인해 주세요.');const digest=await crypto.subtle.digest('SHA-256',enc.encode('chungju-guest-name-v1:'+normalizeGuestSuffix(suffix).toLowerCase()));return 'g.'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('').slice(0,56);}
export function readGuest(){
 let raw='';try{raw=document.cookie.split('; ').find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';if(raw)raw=decodeURIComponent(raw);}catch{}
 if(!raw){try{raw=localStorage.getItem(cookieName)||'';}catch{}}
 try{const item=JSON.parse(raw);if(item.code){const guest=parseGuestCode(item.code);if(item.id===guest.id&&item.suffix===guest.suffix)return guest;}if(uuid(item.id)&&validGuestSuffix(item.suffix))return {id:item.id,suffix:normalizeGuestSuffix(item.suffix)};}catch{}return null;
}
export function saveGuest(item){
 const guest=parseGuestCode(item?.code);const raw=JSON.stringify({id:guest.id,suffix:guest.suffix,code:guest.code});let stored=false;
 try{document.cookie=`${cookieName}=${encodeURIComponent(raw)}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;stored=document.cookie.split('; ').some(x=>x.startsWith(cookieName+'='));}catch{}
 try{localStorage.setItem(cookieName,raw);stored=true;}catch{}return stored;
}
export function newGuestSuffix(){const values=new Uint32Array(1);crypto.getRandomValues(values);return String(1000+values[0]%9000);}

export function clearGuest(){
 let ok=true;
 try{document.cookie=`${cookieName}=; Max-Age=0; Path=/; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;if(document.cookie.split('; ').some(x=>x.startsWith(cookieName+'=')))ok=false;}catch{}
 try{localStorage.removeItem(cookieName);if(localStorage.getItem(cookieName))ok=false;}catch{}
 return ok;
}
