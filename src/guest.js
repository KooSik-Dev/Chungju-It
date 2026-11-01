// Guest identity is a convenience identifier, not an authenticated account.
const cookieName='chungju_guest';
export function validGuestSuffix(value){return typeof value==='string'&&value.trim().length>0&&value.trim().length<=20&&!/[#\u0000-\u001f\u007f]/u.test(value);}
export function readGuest(){
 let raw='';try{raw=document.cookie.split('; ').find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';if(raw)raw=decodeURIComponent(raw);}catch{}
 if(!raw){try{raw=localStorage.getItem(cookieName)||'';}catch{}}
 try{const item=JSON.parse(raw);if(typeof item.id==='string'&&/^[0-9a-f-]{36}$/i.test(item.id)&&validGuestSuffix(item.suffix))return {id:item.id,suffix:item.suffix.trim()};}catch{}return null;
}
export function saveGuest(item){
 if(!validGuestSuffix(item?.suffix)||typeof item.id!=='string'||!/^[0-9a-f-]{36}$/i.test(item.id))throw new Error('게스트 이름을 확인해 주세요.');
 const raw=JSON.stringify({id:item.id,suffix:item.suffix.trim()});let stored=false;
 try{document.cookie=`${cookieName}=${encodeURIComponent(raw)}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;stored=document.cookie.split('; ').some(x=>x.startsWith(cookieName+'='));}catch{}
 try{localStorage.setItem(cookieName,raw);stored=true;}catch{}
 return stored;
}
export function newGuestSuffix(){const values=new Uint32Array(1);crypto.getRandomValues(values);return String(1000+values[0]%9000);}
