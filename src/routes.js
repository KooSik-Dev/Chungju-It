export const pagePaths={map:'main',rank:'ranking',status:'status',research:'research',guide:'guide',activity:'activity',admin:'admin'};
export const validPages=Object.keys(pagePaths);
export function routeInfo(location){
 const parts=location.pathname.split('/').filter(Boolean);
 if(parts.at(-1)==='index.html')parts.pop();
 const last=parts.at(-1),pathEntry=Object.entries(pagePaths).find(([,path])=>path===last);
 if(pathEntry)parts.pop();
 const hash=location.hash?.slice(1),legacy=validPages.includes(hash)?hash:null;
 return {page:location.protocol==='file:'?(legacy||pathEntry?.[0]||'map'):(pathEntry?.[0]||legacy||'map'),base:parts.length?'/'+parts.join('/'):''};
}
export function pageUrl(location,page,base){
 const name=pagePaths[page]||pagePaths.map;
 return location.protocol==='file:'?`#${page}`:`${base}/${name}${location.search||''}`;
}
