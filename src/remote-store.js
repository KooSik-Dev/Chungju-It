import { categories, statuses, imageFor } from './data.js';
import { safeImageUrl } from './page-api.js';

export const collections={reports:'reports',comments:'comments',supports:'supports',favorites:'favorites',rounds:'rounds',profiles:'profiles'};
const text=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max;
const validMeta=item=>item&&text(item.id,200)&&item.data&&typeof item.data==='object'&&!Array.isArray(item.data)&&(typeof item.revision==='number'||typeof item.revision==='string');
export function buildSharedData(lists,clientId,guest='충주시민5624'){
 const supports=new Map(),liked=new Set();
 for(const item of lists.supports){
  if(!validMeta(item)||!text(item.data.reportId,200)||!text(item.data.clientId,100))continue;
  const {reportId,clientId:actor}=item.data;
  if(!supports.has(reportId))supports.set(reportId,new Set());supports.get(reportId).add(actor);
  if(actor===clientId)liked.add(reportId);
 }
 const reports=[];let skipped=0;
 for(const item of lists.reports){
  if(!validMeta(item)){skipped++;continue;}
  const r=item.data;
  if(!text(r.title,80)||!text(r.detail,1000)||!text(r.location,100)||!categories.slice(1).includes(r.category)||!Number.isFinite(r.lat)||r.lat<33||r.lat>39||!Number.isFinite(r.lng)||r.lng<124||r.lng>132){skipped++;continue;}
  if(r.image && !safeImageUrl(r.image) && !Object.values(imageFor).includes(r.image)){skipped++;continue;}
  const stamp=Date.parse(item.created_at);reports.push({id:item.id,revision:item.revision,category:r.category,title:r.title,detail:r.detail,location:r.location,lat:r.lat,lng:r.lng,image:r.image||imageFor[r.category],status:statuses.slice(1).includes(r.status)?r.status:'공감모집',likes:supports.get(item.id)?.size||0,test:true,mine:r.clientId===clientId,createdAt:Number.isFinite(stamp)?stamp:0,clientId:typeof r.clientId==='string'?r.clientId:''});
 }
 const reportIds=new Set(reports.map(r=>r.id));
 const favorites=[],favoriteItems=new Map();
 for(const item of lists.favorites){if(validMeta(item)&&item.data.clientId===clientId&&reportIds.has(item.data.reportId)){favoriteItems.set(item.data.reportId,item);if(!favorites.includes(item.data.reportId))favorites.push(item.data.reportId);}}
 const comments=Object.create(null);
 for(const item of lists.comments){
  if(!validMeta(item)||!reportIds.has(item.data.reportId)||!text(item.data.text,300)||!text(item.data.author,20))continue;
  (comments[item.data.reportId]||=[]).push({id:item.id,revision:item.revision,text:item.data.text,author:item.data.author,createdAt:Date.parse(item.created_at)||0});
 }
 return {data:{reports,liked:[...liked].filter(id=>reportIds.has(id)),favorites,comments,guest},favoriteItems,skipped};
}
export function validSharedReport(item){return buildSharedData({reports:[item],supports:[],favorites:[],comments:[]},'').data.reports[0]||null;}
