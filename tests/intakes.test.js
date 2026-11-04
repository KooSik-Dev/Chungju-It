import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intakeWindow, intakeCycle, fallbackCycle, FALLBACK_ANCHOR, countdownParts, periodText, INTAKE_NOTE, CYCLE_DAYS } from '../src/intakes.js';

const DAY = 24 * 60 * 60 * 1000;
const start = Date.UTC(2026, 10, 2, 15, 0, 0); // 2026-11-03 00:00 KST
const round = { number: 3, start, end: start + 7 * DAY, nextDays: 7, history: [] };

test('접수 기간은 서버에 저장된 7일 회차를 그대로 사용한다', () => {
  const window = intakeWindow(round, new Date(start).toISOString());
  assert.equal(window.length, 7 * DAY);
  assert.equal(window.start, start);
  assert.equal(window.end, start + 7 * DAY);
  assert.equal(window.serverAnchored, true);
});

test('회차 항목의 서버 생성 시각이 있으면 그 시각을 기간 시작으로 보정한다', () => {
  const skewed = { ...round, start: start - 5 * 60 * 1000, end: start - 5 * 60 * 1000 + 7 * DAY };
  const window = intakeWindow(skewed, new Date(start).toISOString());
  assert.equal(window.start, start, '서버 시각을 기준으로 삼는다');
  assert.equal(window.end, start + 7 * DAY, '기간 길이는 저장 값을 유지한다');
});

test('서버 시각이 저장 시각과 크게 다르면 저장 값을 그대로 쓴다', () => {
  const window = intakeWindow(round, new Date(start + 6 * 60 * 60 * 1000).toISOString());
  assert.equal(window.serverAnchored, false);
  assert.equal(window.start, round.start);
  assert.equal(window.end, round.end);
});

test('회차 데이터가 없거나 잘못되면 기간을 만들지 않는다', () => {
  assert.equal(intakeWindow(null), null);
  assert.equal(intakeWindow({ start, end: start }), null);
  assert.equal(intakeWindow({ start: NaN, end: start }), null);
  assert.equal(intakeWindow({ start, end: start + 400 * DAY }), null);
});

test('남은 시간은 일·시간·분·초로 나뉘고 음수가 되지 않는다', () => {
  const parts = countdownParts(start + 7 * DAY, start);
  assert.deepEqual([parts.days, parts.hours, parts.minutes, parts.seconds], [7, 0, 0, 0]);
  const almost = countdownParts(start + 7 * DAY - 1000, start);
  assert.deepEqual([almost.days, almost.hours, almost.minutes, almost.seconds], [6, 23, 59, 59]);
  const done = countdownParts(start, start + DAY);
  assert.deepEqual([done.days, done.hours, done.minutes, done.seconds, done.expired], [0, 0, 0, 0, true]);
});

test('접수 기간 날짜는 한국 시간 기준 YYYY.MM.DD 로 표시한다', () => {
  assert.equal(periodText(start), '2026.11.03');
  assert.equal(periodText(start + 7 * DAY), '2026.11.10');
  assert.equal(periodText('잘못된 값'), '');
  assert.match(INTAKE_NOTE, /공감을 많이 받은 민원부터/);
});

test('접수 기간은 7일 주기로 반복되고 주기 계산은 서버 시작 시각을 기준으로 한다', () => {
  assert.equal(CYCLE_DAYS, 7);
  const created = new Date(start).toISOString();
  // 첫 주기
  const first = intakeCycle(round, created, start + 3 * 3600 * 1000);
  assert.deepEqual([first.index, first.start, first.end], [0, start, start + 7 * DAY]);
  // 주기가 끝난 뒤에는 다음 주기로 넘어가고 남은 시간은 다시 7일에서 줄어든다.
  const second = intakeCycle(round, created, start + 7 * DAY + 3 * 3600 * 1000);
  assert.deepEqual([second.index, second.start, second.end], [1, start + 7 * DAY, start + 14 * DAY]);
  const parts = countdownParts(second.end, start + 7 * DAY + 3 * 3600 * 1000);
  assert.deepEqual([parts.days, parts.hours], [6, 21]);
  // 여러 주기가 지나도 같은 규칙으로 계산된다(음수·0초 고정 없음).
  const far = intakeCycle(round, created, start + 30 * DAY);
  assert.equal(far.index, 4);
  assert.equal(far.start, start + 28 * DAY);
  assert.ok(countdownParts(far.end, start + 30 * DAY).days >= 5);
  // 같은 주기 안에서는 접속 시점이 달라도 기간은 같고 남은 시간만 줄어든다.
  const atSameTime = intakeCycle(round, created, start + 9 * DAY);
  const later = intakeCycle(round, created, start + 9 * DAY + 3600 * 1000);
  assert.deepEqual([later.index, later.start, later.end], [atSameTime.index, atSameTime.start, atSameTime.end]);
  assert.equal(countdownParts(later.end, start + 9 * DAY + 3600 * 1000).totalSeconds + 3600, countdownParts(atSameTime.end, start + 9 * DAY).totalSeconds);
});

test('주기 기준 시각이 없으면 기간을 만들지 않는다', () => {
  assert.equal(intakeCycle(null, new Date(start).toISOString(), start), null);
  assert.equal(intakeCycle({ start, end: start }, new Date(start).toISOString(), start), null);
  // 기기 시계가 시작 시각보다 이전이어도 첫 주기로 계산한다.
  const early = intakeCycle(round, new Date(start).toISOString(), start - DAY);
  assert.deepEqual([early.index, early.start, early.end], [0, start, start + 7 * DAY]);
});

test('서버 회차 기록이 없을 때는 고정 기준일로 7일 주기를 계산한다', () => {
  const anchor = fallbackCycle(FALLBACK_ANCHOR);
  assert.deepEqual([anchor.index, anchor.start, anchor.end], [0, FALLBACK_ANCHOR, FALLBACK_ANCHOR + 7 * DAY]);
  assert.equal(anchor.fallback, true);
  // 어떤 시각이든 7일 주기 안의 같은 기간을 가리키고, 남은 시간은 7일을 넘지 않는다.
  const sample = FALLBACK_ANCHOR + 123 * DAY + 5 * 3600 * 1000;
  const win = fallbackCycle(sample);
  assert.equal(win.start, FALLBACK_ANCHOR + Math.floor(123 / 7) * 7 * DAY);
  assert.equal(win.end - win.start, 7 * DAY);
  assert.ok(sample >= win.start && sample < win.end);
  assert.ok(countdownParts(win.end, sample).totalSeconds > 0 && countdownParts(win.end, sample).totalSeconds <= 7 * 86400);
  // 브라우저(기기) 시계와 무관하게 같은 값이 나온다.
  assert.deepEqual(fallbackCycle(sample), fallbackCycle(sample));
  // 기준일 이전이어도 첫 주기로 계산해 기간이 비지 않는다.
  assert.deepEqual([fallbackCycle(FALLBACK_ANCHOR - DAY).index], [0]);
});
