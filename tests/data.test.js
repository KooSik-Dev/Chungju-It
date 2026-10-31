import test from 'node:test';
import assert from 'node:assert/strict';
import { initialReports, correctSeedCoordinates } from '../src/data.js';

test('old default locations migrate without changing other fields', () => {
  for (const [id,lat,lng] of [['r1',36.9718,127.9121], ['r4',36.9789,127.9251], ['r9',36.9508,127.9294]]) {
    const report = {id,lat,lng,likes:999};
    const corrected = correctSeedCoordinates(report);
    const seed = initialReports.find(item => item.id === id);
    assert.deepEqual(corrected, {id,lat:seed.lat,lng:seed.lng,likes:999});
    assert.equal(report.lat,lat);
  }
});

test('user-created and changed locations are never migrated', () => {
  for (const report of [
    {id:'r1',lat:36.9718,lng:127.9121,test:true},
    {id:'r1',lat:36.975,lng:127.9121},
    {id:'other',lat:36.9718,lng:127.9121}
  ]) assert.equal(correctSeedCoordinates(report), report);
});
