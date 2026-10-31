import { safeImageUrl } from './page-api.js';
// Strictly validate untrusted local backup files before replacing any live data.
export const BACKUP_LIMIT = 25 * 1024 * 1024;
const text = (value, max) => typeof value === 'string' && value.length <= max;
export function validateBackup(payload, categories, statuses, imageNames) {
  if (!payload || payload.format !== 'chungju-eatda-backup' || payload.version !== 1 || !payload.data || typeof payload.data !== 'object') throw new Error('format');
  const source = payload.data;
  if (!Array.isArray(source.reports) || !source.reports.length || source.reports.length > 1000 || !Array.isArray(source.liked) || !Array.isArray(source.favorites) || !source.comments || typeof source.comments !== 'object' || Array.isArray(source.comments) || !text(source.guest, 100)) throw new Error('data');
  const ids = new Set();
  const reports = source.reports.map(r => {
    if (!r || !text(r.id, 100) || !/^(r[1-9]\d*|test-[a-zA-Z0-9-]+)$/.test(r.id) || ids.has(r.id) || !text(r.title, 200) || !r.title || !text(r.location, 200) || !r.location || !categories.slice(1).includes(r.category) || !statuses.slice(1).includes(r.status) || !Number.isSafeInteger(r.likes) || r.likes < 0 || !Number.isFinite(r.lat) || r.lat < 33 || r.lat > 39 || !Number.isFinite(r.lng) || r.lng < 124 || r.lng > 132 || (r.detail !== undefined && !text(r.detail, 4000)) || (r.test !== undefined && typeof r.test !== 'boolean') || (r.createdAt !== undefined && (!Number.isFinite(r.createdAt) || r.createdAt < 0)) || (r.image !== undefined && (!text(r.image, 2 * 1024 * 1024) || !(imageNames.includes(r.image) || safeImageUrl(r.image) || /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]+$/.test(r.image))))) throw new Error('report');
    ids.add(r.id);
    const result = {id:r.id, title:r.title, location:r.location, category:r.category, status:r.status, likes:r.likes, lat:r.lat, lng:r.lng};
    for (const key of ['detail','test','createdAt','image']) if (r[key] !== undefined) result[key]=r[key];
    return result;
  });
  const cleanIds = values => {
    if (values.length > 1000 || values.some(id => typeof id !== 'string' || !ids.has(id)) || new Set(values).size !== values.length) throw new Error('ids');
    return values.slice();
  };
  const comments=Object.create(null);
  for(const [id, notes] of Object.entries(source.comments)) {
    if(!ids.has(id) || !Array.isArray(notes) || notes.length > 1000) throw new Error('notes');
    comments[id]=notes.map(n=>{
      if(!n || !text(n.text, 300) || !text(n.author, 100) || (n.createdAt !== undefined && (!Number.isFinite(n.createdAt) || n.createdAt < 0))) throw new Error('note');
      return {text:n.text,author:n.author,...(n.createdAt === undefined ? {} : {createdAt:n.createdAt})};
    });
  }
  return {reports, liked:cleanIds(source.liked), favorites:cleanIds(source.favorites), comments, guest:source.guest || '충주시민5624'};
}
