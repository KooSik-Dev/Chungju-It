import { categories, statuses, imageFor } from './data.js';
import { safeImageUrl } from './page-api.js';

export const collections={reports:'reports',comments:'comments',supports:'supports',favorites:'favorites',rounds:'rounds',profiles:'profiles'};
const text=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max;
const validMeta=item=>item&&text(item.id,200)&&item.data&&typeof item.data==='object'&&!Array.isArray(item.data)&&(typeof item.revision==='number'||typeof item.revision==='string');
const owns=(item,user)=>!!user&&item.owner_id!=null&&String(item.owner_id)===String(user.id);
export function buildSharedData(lists,clientId,guest='충주시민5624',protectedLists={},user=null){
 const shared=key=>[...(lists[key]||[]).map(item=>({...item,protected:false})),...(protectedLists[key]||[]).map(item=>({...item,protected:true}))];
 const supports=new Map(),liked=new Set();
 for(const item of shared('supports')){
  if(!validMeta(item)||!text(item.data.reportId,220))continue;
  const actor=item.protected?(item.owner_id==null?'':`user:${item.owner_id}`):(text(item.data.clientId,100)?`device:${item.data.clientId}`:'');
  if(!actor)continue;const reportId=item.data.reportId;
  if(!supports.has(reportId))supports.set(reportId,new Set());supports.get(reportId).add(actor);
  if(item.protected?owns(item,user):(!user&&item.data.clientId===clientId))liked.add(reportId);
 }
 const reports=[];let skipped=0;
 for(const item of shared('reports')){
  if(!validMeta(item)){skipped++;continue;}
  const r=item.data;
  if(!text(r.title,80)||!text(r.detail,1000)||!text(r.location,100)||!categories.slice(1).includes(r.category)||!Number.isFinite(r.lat)||r.lat<33||r.lat>39||!Number.isFinite(r.lng)||r.lng<124||r.lng>132){skipped++;continue;}
  if(r.image&&!safeImageUrl(r.image)&&!Object.values(imageFor).includes(r.image)){skipped++;continue;}
  const id=item.protected?'protected:'+item.id:item.id,stamp=Date.parse(item.created_at);
  reports.push({id,rawId:item.id,protected:item.protected,ownerName:item.protected?String(item.owner_name||''):'' ,revision:item.revision,category:r.category,title:r.title,detail:r.detail,location:r.location,lat:r.lat,lng:r.lng,image:r.image||imageFor[r.category],status:statuses.slice(1).includes(r.status)?r.status:'공감모집',likes:supports.get(id)?.size||0,test:true,mine:item.protected?owns(item,user):(!user&&r.clientId===clientId),createdAt:Number.isFinite(stamp)?stamp:0});
 }
 reports.sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id));
 const reportIds=new Set(reports.map(r=>r.id)),favorites=[],favoriteItems=new Map();
 for(const item of shared('favorites')){if(validMeta(item)&&(item.protected?owns(item,user):(!user&&item.data.clientId===clientId))&&reportIds.has(item.data.reportId)){favoriteItems.set(item.data.reportId,item);if(!favorites.includes(item.data.reportId))favorites.push(item.data.reportId);}}
 const comments=Object.create(null);
 for(const item of shared('comments')){
  if(!validMeta(item)||!reportIds.has(item.data.reportId)||!text(item.data.text,300))continue;
  const author=item.protected?String(item.owner_name||item.data.author||'충주시민'):item.data.author;
  if(!text(author,64))continue;
  (comments[item.data.reportId]||=[]).push({id:item.id,protected:item.protected,mine:item.protected?owns(item,user):true,revision:item.revision,text:item.data.text,author,createdAt:Date.parse(item.created_at)||0});
 }
 return {data:{reports,liked:[...liked].filter(id=>reportIds.has(id)),favorites,comments,guest},favoriteItems,skipped};
}
