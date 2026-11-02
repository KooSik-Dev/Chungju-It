import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSharedData } from '../src/remote-store.js';
import { validateBackup } from '../src/backup.js';
import { categories, statuses, imageFor } from '../src/data.js';

const base = {category:'청결',title:'여러 장 사진',detail:'내용',location:'충주시',lat:36.99,lng:127.92};
const record = (data, id='r-photo-1') => ({id,revision:1,created_at:new Date().toISOString(),data});
const photoUrls = ['https://cdn.example.com/a.png','https://cdn.example.com/b.png','https://cdn.example.com/c.png'];

test('remote reports keep every photo URL and fall back to the first one', () => {
  const shared = buildSharedData({reports:[record({...base,image:photoUrls[0],images:photoUrls})]},'device-photos');
  assert.deepEqual(shared.data.reports[0].images, photoUrls);
  assert.equal(shared.data.reports[0].image, photoUrls[0]);
});

test('remote reports without a photo array keep the legacy single image', () => {
  const shared = buildSharedData({reports:[record({...base,image:'https://cdn.example.com/legacy.png'})]},'device-photos');
  assert.equal(shared.data.reports[0].images, undefined);
  assert.equal(shared.data.reports[0].image, 'https://cdn.example.com/legacy.png');
  assert.equal(buildSharedData({reports:[record({...base,image:'station.jpg'})]},'d').data.reports[0].image, 'station.jpg');
});

test('remote reports drop invalid photo entries but keep the rest', () => {
  const shared = buildSharedData({reports:[record({...base,images:['javascript:alert(1)',photoUrls[1],'http://insecure.example.com/x.png',42]})]},'device-photos');
  assert.deepEqual(shared.data.reports[0].images, [photoUrls[1]]);
  assert.equal(shared.data.reports[0].image, photoUrls[1]);
});

test('remote reports cap photos at five', () => {
  const many = Array.from({length:9},(_,i)=>`https://cdn.example.com/${i}.png`);
  const shared = buildSharedData({reports:[record({...base,images:many})]},'device-photos');
  assert.equal(shared.data.reports[0].images.length, 5);
});

const backupPayload = images => ({format:'chungju-eatda-backup',version:1,data:{reports:[{id:'test-1',title:'제목',location:'위치',category:'청결',status:'공감모집',likes:0,lat:36,lng:127,...(images===undefined?{}:{images})}],liked:[],favorites:[],comments:{},guest:'충주시민5624'}});
const names = Object.values(imageFor);

test('backup validation accepts a photo array', () => {
  const restored = validateBackup(backupPayload(photoUrls), categories, statuses, names);
  assert.deepEqual(restored.reports[0].images, photoUrls);
});

test('backup validation rejects unsafe or oversized photo arrays', () => {
  assert.throws(() => validateBackup(backupPayload(['javascript:alert(1)']), categories, statuses, names), /report/);
  assert.throws(() => validateBackup(backupPayload(['http://insecure.example.com/a.png']), categories, statuses, names), /report/);
  assert.throws(() => validateBackup(backupPayload(Array(6).fill(photoUrls[0])), categories, statuses, names), /report/);
  assert.throws(() => validateBackup(backupPayload('https://cdn.example.com/a.png'), categories, statuses, names), /report/);
});
