import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceAnimationTime} from '../src/student/animation-clock.ts';

test('opening playback cannot move before the first caption when a frame timestamp predates setup',()=>{
 assert.equal(advanceAnimationTime(0,null,90,false,24),0);
 assert.equal(advanceAnimationTime(0,100,90,false,24),0);
 assert.equal(advanceAnimationTime(0,90,110,false,24),0.02);
});
test('playback pauses while hidden and stops at the final frame',()=>{
 assert.equal(advanceAnimationTime(6,100,200,true,24),6);
 assert.equal(advanceAnimationTime(23.95,100,200,false,24),24);
 assert.equal(advanceAnimationTime(24,200,300,false,24),24);
 assert.equal(advanceAnimationTime(0,100,10000,false,24),0.1);
});
test('invalid clock values cannot produce an invalid caption index',()=>{
 for(const value of [NaN,Infinity,-1]){
  assert.equal(advanceAnimationTime(value,null,100,false,24),0);
 }
 assert.equal(advanceAnimationTime(6,100,NaN,false,24),6);
});
