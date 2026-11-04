// 회차는 브라우저 내부의 모의 집계입니다. 서버 접수나 실제 전달 기능은 없습니다.
export const DAY = 24 * 60 * 60 * 1000;
import { CYCLE_DAYS } from './intakes.js';
export const roundDurations = [1, 7, 14, 30];
export function createRound(now = Date.now(), number = 1, days = CYCLE_DAYS, history = []) {
  return { number, start: now, end: now + days * DAY, nextDays: days, history };
}
export function validRound(value) {
  return !!value && Number.isSafeInteger(value.number) && value.number >= 1 && value.number < 1000000 &&
    Number.isFinite(value.start) && Number.isFinite(value.end) && value.end > value.start &&
    roundDurations.includes(value.nextDays) && Array.isArray(value.history) && value.history.length <= 30 &&
    value.history.every(h => h && Number.isSafeInteger(h.number) && Number.isFinite(h.start) &&
      Number.isFinite(h.end) && Number.isFinite(h.closedAt) && Array.isArray(h.top) && h.top.length <= 3 &&
      h.top.every(r => r && typeof r.id === 'string' && typeof r.title === 'string' &&
        typeof r.location === 'string' && Number.isFinite(r.likes)));
}
export function topThree(reports) {
  return reports.filter(r => r.status === '공감모집').slice().sort((a,b) => b.likes-a.likes || a.id.localeCompare(b.id)).slice(0,3)
    .map(({id,title,location,likes,test}) => ({id,title,location,likes,test:!!test}));
}
export function closeRound(round, reports, now = Date.now(), forced = false) {
  const end = forced ? now : round.end;
  const entry = {number:round.number,start:round.start,end,closedAt:now,forced,top:topThree(reports)};
  return createRound(now,round.number+1,round.nextDays,[entry,...round.history].slice(0,30));
}
export function remaining(end, now = Date.now()) {
  let seconds = Math.max(0, Math.ceil((end-now)/1000));
  const days = Math.floor(seconds/86400); seconds %= 86400;
  const hours = Math.floor(seconds/3600); seconds %= 3600;
  const minutes = Math.floor(seconds/60); seconds %= 60;
  return `${days}일 ${String(hours).padStart(2,'0')}시간 ${String(minutes).padStart(2,'0')}분 ${String(seconds).padStart(2,'0')}초`;
}
