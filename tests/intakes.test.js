import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intakeWindow, countdownParts, periodText, INTAKE_NOTE } from '../src/intakes.js';

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
