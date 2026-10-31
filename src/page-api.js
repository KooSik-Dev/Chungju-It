// The page owner designates this token as a public, write-only page token.
// It is intentionally shipped in client-side code and must never be used to protect private data.
export const PAGE_API_URL='https://www.koosik.kr/api/page/%EC%9D%BC%EB%8B%A8-%ED%85%8C%EC%8A%A4%ED%8A%B8%EC%9E%84-%EC%95%84%EB%A7%88';
const PAGE_API_TOKEN='10944426131c9b0c2abb13186ef9f80f8730bf244cab95271489679be22c7300';
export const IMAGE_LIMIT=5*1024*1024;
export const JSON_LIMIT=64*1024;
export const imageTypes=['image/png','image/jpeg','image/gif','image/webp','image/avif'];
export function safeImageUrl(value) {
  if(typeof value!=='string'||value.length>2048)return false;
  try { const url=new URL(value); return url.protocol==='https:'&&!url.username&&!url.password; } catch { return false; }
}
export class ApiError extends Error {
  constructor(message,{status,uncertain=false}={}){super(message);this.name='ApiError';this.status=status;this.uncertain=uncertain;}
}
const statusMessages={401:'인증 토큰이 올바르지 않습니다.',404:'페이지 또는 항목을 찾을 수 없습니다.',409:'다른 사용자가 먼저 변경했습니다.',413:'요청 크기가 제한을 초과했습니다.',503:'서비스 설정을 확인해야 합니다.'};
export async function pageRequest(path='',options={}) {
 const method=options.method||'GET',headers={Authorization:`Bearer ${PAGE_API_TOKEN}`};
 let body;
 if(options.json!==undefined){
  body=JSON.stringify(options.json);if(typeof body!=='string'||new TextEncoder().encode(body).length>JSON_LIMIT)throw new ApiError('요청 데이터가 64KiB를 초과합니다.',{status:413});
  headers['Content-Type']='application/json';
 } else if(options.body!==undefined)body=options.body;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  let response;try{response=await fetch(PAGE_API_URL+path,{method,headers,body,signal:controller.signal});}
  catch{throw new ApiError('연결을 확인할 수 없습니다. 저장 여부를 목록에서 확인해 주세요.',{uncertain:method!=='GET'});}
  let result;try{result=await response.json();}catch{if(response.ok)throw new ApiError('응답을 확인하지 못했습니다. 목록에서 저장 여부를 확인해 주세요.',{uncertain:method!=='GET'});result={};}
  if(!response.ok){const detail=typeof result?.error==='string'?result.error.slice(0,200):'';throw new ApiError(`${statusMessages[response.status]||'페이지 API 요청에 실패했습니다.'}${detail?' '+detail:''} (${response.status})`,{status:response.status,uncertain:method!=='GET'&&response.status>=500});}
  if(result?.ok===false)throw new ApiError('요청을 처리하지 못했습니다. 저장 여부를 확인해 주세요.',{status:response.status,uncertain:method!=='GET'});
  return result;
 }finally{clearTimeout(timer);}
}
function collectionPath(collection){if(typeof collection!=='string'||!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(collection))throw new Error('컬렉션 이름이 올바르지 않습니다.');return '/collections/'+encodeURIComponent(collection);}
export async function listItems(collection,limit=50,offset=0){
 if(!Number.isInteger(limit)||limit<1||limit>50||!Number.isSafeInteger(offset)||offset<0)throw new Error('목록 범위가 올바르지 않습니다.');
 const result=await pageRequest(collectionPath(collection)+`?limit=${limit}&offset=${offset}`);
 if(!Array.isArray(result.items)||!(result.next_offset===null||(Number.isSafeInteger(result.next_offset)&&result.next_offset>offset)))throw new ApiError('목록 응답 형식이 올바르지 않습니다.');
 return result;
}
export async function listAllItems(collection){
 const items=[],seen=new Set();let offset=0,pages=0;
 do{const page=await listItems(collection,50,offset);for(const item of page.items){if(!item||typeof item.id!=='string'||seen.has(item.id))continue;seen.add(item.id);items.push(item);}offset=page.next_offset;if(++pages>10000)throw new ApiError('목록이 너무 길어 불러올 수 없습니다.');}while(offset!==null);
 return items;
}
export async function getItem(collection,id){const result=await pageRequest(collectionPath(collection)+'/'+encodeURIComponent(id));if(!result.item)throw new ApiError('항목 응답이 올바르지 않습니다.');return result.item;}
function validData(data){if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('항목 데이터는 JSON 객체여야 합니다.');}
export async function createItem(collection,data){validData(data);const result=await pageRequest(collectionPath(collection),{method:'POST',json:data});if(!result.item)throw new ApiError('저장 응답을 확인하지 못했습니다. 목록에서 확인해 주세요.',{uncertain:true});return result.item;}
export async function updateItem(collection,id,revision,data){validData(data);const result=await pageRequest(collectionPath(collection)+'/'+encodeURIComponent(id),{method:'PUT',json:{revision,data}});if(!result.item)throw new ApiError('변경 응답을 확인하지 못했습니다. 목록에서 확인해 주세요.',{uncertain:true});return result.item;}
export async function deleteItem(collection,id,revision){return pageRequest(collectionPath(collection)+'/'+encodeURIComponent(id)+'?revision='+encodeURIComponent(revision),{method:'DELETE'});}
export const sendToInbox=data=>pageRequest('',{method:'POST',json:data});
export const saveData=sendToInbox;
export async function uploadImage(file) {
 if(!file||!imageTypes.includes(file.type)||file.size<=0||file.size>IMAGE_LIMIT)throw new ApiError('5MiB 이하의 PNG, JPG, GIF, WebP 또는 AVIF 이미지를 선택해 주세요.',{status:413});
 const form=new FormData();form.append('file',file);
 const result=await pageRequest('/upload',{method:'POST',body:form});
 if(typeof result?.url!=='string'||!result.url.trim())throw new ApiError('이미지 주소를 확인할 수 없습니다.',{uncertain:true});
 let image;try{image=new URL(result.url,PAGE_API_URL).href;}catch{throw new ApiError('이미지 주소를 확인할 수 없습니다.',{uncertain:true});}
 if(!safeImageUrl(image))throw new ApiError('이미지 주소를 확인할 수 없습니다.',{uncertain:true});return image;
}

// Migrate a previously saved local photo when an old report is submitted again.
export function localImageFile(value){
  const match=/^data:(image\/(?:jpeg|png|gif|webp|avif));base64,([a-zA-Z0-9+/=]+)$/.exec(value||'');
  if(!match)throw new Error('기존 사진 형식을 확인할 수 없습니다. 새 사진을 선택해 주세요.');
  const raw=atob(match[2]);if(!raw.length||raw.length>IMAGE_LIMIT)throw new Error('기존 사진의 크기를 확인해 주세요.');
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  return new File([bytes],'photo.'+({'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/avif':'avif'}[match[1]]),{type:match[1]});
}
