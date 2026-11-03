// 기기 시계 대신 서버 시각을 기준으로 남은 시간을 계산합니다.
// 서버가 알려준 시각(HTTP Date 헤더 또는 저장 응답의 created_at)과 기기 시계의 차이를 보관합니다.
const SKEW_KEY = 'chungju-eatda-server-skew';
const MAX_SKEW = 10 * 365 * 24 * 60 * 60 * 1000;
let skew = 0;
let synced = false;

const sane = value => Number.isFinite(value) && Math.abs(value) <= MAX_SKEW;

export function loadServerSkew(storage) {
  try {
    const raw = storage?.getItem?.(SKEW_KEY);
    if (typeof raw === 'string') {
      const value = Number(JSON.parse(raw)?.offset);
      if (sane(value)) { skew = value; synced = true; }
    }
  } catch {}
  return skew;
}

export function noteServerTime(serverMs, localMs = Date.now(), storage) {
  if (!Number.isFinite(serverMs) || !Number.isFinite(localMs) || serverMs <= 0) return skew;
  const next = Math.round(serverMs - localMs);
  if (!sane(next)) return skew;
  skew = next;
  synced = true;
  try { storage?.setItem?.(SKEW_KEY, JSON.stringify({ offset: next, at: localMs })); } catch {}
  return skew;
}

export function serverNow() { return Date.now() + skew; }
export function serverSkew() { return skew; }
export function serverTimeSynced() { return synced; }
