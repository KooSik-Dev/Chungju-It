import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadServerSkew, noteServerTime, serverNow, serverSkew, serverTimeSynced } from '../src/server-clock.js';

const memory = () => {
  const store = new Map();
  return { store, getItem: key => (store.has(key) ? store.get(key) : null), setItem: (key, value) => store.set(key, String(value)) };
};

test('서버 시각과 기기 시계의 차이를 기억하고 남은 시간 계산에 쓴다', () => {
  const storage = memory();
  const local = 1_800_000_000_000;
  assert.equal(noteServerTime(local + 3_600_000, local, storage), 3_600_000);
  assert.equal(serverSkew(), 3_600_000);
  assert.equal(serverTimeSynced(), true);
  const now = serverNow();
  assert.ok(now - Date.now() > 3_500_000 && now - Date.now() < 3_700_000);
  assert.match(storage.getItem('chungju-eatda-server-skew'), /"offset":3600000/);
});

test('저장된 보정 값을 새로고침 뒤에 다시 불러온다', () => {
  const storage = memory();
  storage.setItem('chungju-eatda-server-skew', JSON.stringify({ offset: -90_000, at: 1 }));
  assert.equal(loadServerSkew(storage), -90_000);
  assert.equal(serverSkew(), -90_000);
});

test('잘못된 서버 시각과 손상된 저장 값은 무시한다', () => {
  const storage = memory();
  const before = serverSkew();
  assert.equal(noteServerTime(NaN, 1_000, storage), before);
  assert.equal(noteServerTime(0, 1_000, storage), before);
  assert.equal(noteServerTime(Date.now() + 20 * 365 * 24 * 60 * 60 * 1000, Date.now(), storage), before);
  storage.setItem('chungju-eatda-server-skew', '{not json');
  assert.equal(loadServerSkew(storage), before);
  assert.equal(noteServerTime(1_700_000_000_000, 1_700_000_000_500), -500);
  assert.ok(Number.isFinite(serverNow()));
});
