import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validReportPosition, positionFrom, assertReportPosition, POSITION_MESSAGE } from '../src/report-position.js';

test('좌표가 없으면(빈 값·null·0) 유효하지 않다', () => {
  for (const [lat, lng] of [[undefined, undefined], [null, null], ['', ''], ['', 127.9], ['36.9', ''], [0, 0], [36.9, null]]) {
    assert.equal(validReportPosition(lat, lng), false, `${lat},${lng}`);
    assert.equal(positionFrom({ lat, lng }), null);
  }
});

test('충주시 범위를 벗어난 좌표는 저장할 수 없다', () => {
  for (const [lat, lng] of [[32.9, 127.9], [39.01, 127.9], [36.9, 123.9], [36.9, 132.01], [NaN, 127.9], ['abc', '127.9']]) {
    assert.equal(validReportPosition(lat, lng), false, `${lat},${lng}`);
  }
});

test('범위 안의 좌표는 숫자로 정규화한다', () => {
  assert.equal(validReportPosition('36.991', ' 127.926 '), true);
  assert.deepEqual(positionFrom({ lat: '36.991', lng: '127.926' }), { lat: 36.991, lng: 127.926 });
});

test('저장 단계 검증은 좌표가 없으면 안내 문구와 함께 중단된다', () => {
  assert.throws(() => assertReportPosition({ title: '신고' }), error => error.message === POSITION_MESSAGE);
  assert.throws(() => assertReportPosition({ lat: '', lng: '' }), /지도에서 신고 위치를 먼저 지정/);
  assert.deepEqual(assertReportPosition({ lat: 36.99, lng: 127.92 }), { lat: 36.99, lng: 127.92 });
  assert.equal(POSITION_MESSAGE, '민원 접수를 위해 지도에서 신고 위치를 먼저 지정해 주세요.');
});
