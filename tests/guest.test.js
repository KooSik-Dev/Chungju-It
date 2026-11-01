import test from 'node:test';
import assert from 'node:assert/strict';
import {newGuestSecret,makeGuestCode,parseGuestCode,guestAccount,validGuestSuffix} from '../src/guest.js';

test('guest names normalize consistently and reserve an API-compatible username',async()=>{
 assert.equal(await guestAccount('  Ａlice '),await guestAccount('alice'));
 assert.match(await guestAccount('단풍'),/^g\.[0-9a-f]{56}$/);
 assert.equal(validGuestSuffix('  '),false);assert.equal(validGuestSuffix('x#y'),false);
});
test('recovery code round trips without exposing its secret to the username',async()=>{
 const secret=newGuestSecret(),id=crypto.randomUUID(),suffix='단풍',code=makeGuestCode({id,suffix,secret});
 assert.deepEqual(parseGuestCode(code),{id,suffix,secret,code});assert.doesNotMatch(await guestAccount(suffix),new RegExp(secret));assert.throws(()=>parseGuestCode('CJI1.invalid'));
});
