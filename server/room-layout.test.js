import test from 'node:test';
import assert from 'node:assert/strict';
import {DESK_SLOTS, ROOM, bodyOf, pathCurves} from '../src/student/room-layout.ts';

test('there is one slot for each of the 8 desks', () => {
 assert.equal(DESK_SLOTS.length, 8);
});

test('every desk body stays inside the room picture', () => {
 DESK_SLOTS.forEach((s, i) => {
  const b = bodyOf(i);
  assert.ok(s.x - b.left >= 0 && s.x + b.right <= ROOM.width, `desk ${i} x`);
  assert.ok(s.y - b.top >= 0 && s.y + b.bottom <= ROOM.height, `desk ${i} y`);
 });
});

test('desks run from left to right along the journey', () => {
 const xs = DESK_SLOTS.map(s => s.x);
 assert.deepEqual(xs, [...xs].sort((a, b) => a - b));
});

test('no two desk bodies overlap', () => {
 for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
  const a = bodyOf(i), b = bodyOf(j), p = DESK_SLOTS[i], q = DESK_SLOTS[j];
  const apart = p.x + a.right <= q.x - b.left || q.x + b.right <= p.x - a.left || p.y + a.bottom <= q.y - b.top || q.y + b.bottom <= p.y - a.top;
  assert.ok(apart, `desks ${i} and ${j} overlap`);
 }
});

test('the path has 7 curves and none starts or ends inside a desk body', () => {
 const curves = pathCurves(DESK_SLOTS);
 assert.equal(curves.length, 7);
 const inside = (pt, i) => { const s = DESK_SLOTS[i], b = bodyOf(i); return pt.x > s.x - b.left && pt.x < s.x + b.right && pt.y > s.y - b.top && pt.y < s.y + b.bottom; };
 curves.forEach((c, i) => {
  assert.ok(!inside(c.from, i), `curve ${i} start`);
  assert.ok(!inside(c.to, i + 1), `curve ${i} end`);
 });
});
