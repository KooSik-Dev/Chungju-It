// 민원접수기간 표시용 계산입니다. 접수 기간 값은 서버(rounds)에 저장된 회차 데이터를 그대로 씁니다.
export const INTAKE_NOTE = '접수 기간 동안 시민들의 공감을 많이 받은 민원부터 순차적으로 접수됩니다.';
const DAY = 24 * 60 * 60 * 1000;
const ANCHOR_LIMIT = 30 * 60 * 1000;

// 회차 항목의 서버 생성 시각(created_at)이 저장된 시작 시각과 비슷하면 그 시각을 기준으로 삼는다.
// 기기 시계가 어긋나도 두 계정이 같은 기간을 보게 하기 위한 보정이며, 기간 길이는 저장 값을 유지한다.
export function intakeWindow(round, createdAt) {
  if (!round || !Number.isFinite(round.start) || !Number.isFinite(round.end) || round.end <= round.start) return null;
  const length = round.end - round.start;
  if (!(length > 0) || length > 31 * DAY) return null;
  const stamp = typeof createdAt === 'string' ? Date.parse(createdAt) : NaN;
  const anchored = Number.isFinite(stamp) && stamp > 0 && Math.abs(stamp - round.start) <= ANCHOR_LIMIT;
  const start = anchored ? stamp : round.start;
  return { number: round.number, start, end: start + length, length, serverAnchored: anchored };
}

// 접수 기간 한 주기는 2주(14일)입니다. 새 회차와 회차 기록이 없을 때의 기본값으로 씁니다.
export const CYCLE_DAYS = 14;

// 접수 기간은 회차에 저장된 기간(기본 2주)을 한 주기로 반복됩니다. 서버에 저장된 회차 시작 시각을 기준으로
// 현재 주기를 계산하므로 접속 시점·기기와 무관하게 모두 같은 주기와 남은 시간을 봅니다.
// (2주보다 짧게 저장된 옛 회차는 저장된 길이 그대로 반복해 기간 표시가 데이터와 어긋나지 않게 합니다.)
export function intakeCycle(round, createdAt, now = Date.now()) {
  const base = intakeWindow(round, createdAt);
  if (!base) return null;
  const cycle = base.length;
  const anchor = base.start;
  const elapsed = Number(now) - anchor;
  const index = Number.isFinite(elapsed) && elapsed > 0 ? Math.floor(elapsed / cycle) : 0;
  const start = anchor + index * cycle;
  return { index, start, end: start + cycle, length: cycle, anchor, base };
}

// 서버에 회차 기록이 아직 없을 때 쓰는 기준 시각입니다(2026-01-05 00:00 KST, 월요일).
// 브라우저마다 값이 달라지지 않도록 고정값을 쓰며, 서버 회차 기록이 생기면 그 값이 우선합니다.
// 회차 기록이 없을 때도 2주(14일) 주기로 접수 기간을 보여 주며, 주기는 항상 월요일에 시작합니다.
export const FALLBACK_ANCHOR = Date.UTC(2026, 0, 4, 15, 0, 0);

export function fallbackCycle(now = Date.now()) {
  const cycle = CYCLE_DAYS * DAY;
  const elapsed = Number(now) - FALLBACK_ANCHOR;
  const index = Number.isFinite(elapsed) && elapsed > 0 ? Math.floor(elapsed / cycle) : 0;
  const start = FALLBACK_ANCHOR + index * cycle;
  return { index, start, end: start + cycle, length: cycle, anchor: FALLBACK_ANCHOR, fallback: true };
}

export function countdownParts(end, now = Date.now()) {
  const remaining = Math.max(0, Number(end) - Number(now));
  const totalSeconds = Number.isFinite(remaining) ? Math.ceil(remaining / 1000) : 0;
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    expired: totalSeconds <= 0
  };
}

export function periodText(value) {
  const time = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(time)) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(time)).replace(/-/g, '.');
}
