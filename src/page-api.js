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
async function post(url, options) {
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),25000);
  try {
    let response;
    try { response=await fetch(url,{...options,signal:controller.signal}); }
    catch { throw new Error('연결을 확인하지 못했습니다. 다시 보내면 중복될 수 있으니 관리자에게 확인해 주세요.'); }
    let result;try{result=await response.json();}catch{throw new Error('응답을 확인하지 못했습니다. 다시 보내면 중복될 수 있으니 관리자에게 확인해 주세요.');}
    if(!response.ok)throw new Error(typeof result?.error==='string'?result.error.slice(0,200):'전송에 실패했습니다.');
    return result;
  } finally { clearTimeout(timer); }
}
export async function saveData(data) {
  const body=JSON.stringify(data);
  if(typeof body!=='string'||new TextEncoder().encode(body).length>JSON_LIMIT)throw new Error('신고 데이터가 64KB를 초과합니다.');
  return post(PAGE_API_URL,{method:'POST',headers:{Authorization:`Bearer ${PAGE_API_TOKEN}`,'Content-Type':'application/json'},body});
}
export async function uploadImage(file) {
  if(!file || !imageTypes.includes(file.type) || file.size<=0 || file.size>IMAGE_LIMIT)throw new Error('5MB 이하의 PNG, JPG, GIF, WebP 또는 AVIF 이미지를 선택해 주세요.');
  const form=new FormData();form.append('file',file);
  const result=await post(`${PAGE_API_URL}/upload`,{method:'POST',headers:{Authorization:`Bearer ${PAGE_API_TOKEN}`},body:form});
  if(typeof result?.url!=='string'||!result.url.trim())throw new Error('이미지 주소를 확인할 수 없습니다.');
  let image;try{image=new URL(result.url,PAGE_API_URL).href;}catch{throw new Error('이미지 주소를 확인할 수 없습니다.');}
  if(!safeImageUrl(image))throw new Error('이미지 주소를 확인할 수 없습니다.');
  return image;
}

// Migrate a previously saved local photo when an old report is submitted again.
export function localImageFile(value){
  const match=/^data:(image\/(?:jpeg|png|gif|webp|avif));base64,([a-zA-Z0-9+/=]+)$/.exec(value||'');
  if(!match)throw new Error('기존 사진 형식을 확인할 수 없습니다. 새 사진을 선택해 주세요.');
  const raw=atob(match[2]);if(!raw.length||raw.length>IMAGE_LIMIT)throw new Error('기존 사진의 크기를 확인해 주세요.');
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  return new File([bytes],'photo.'+({'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/avif':'avif'}[match[1]]),{type:match[1]});
}
