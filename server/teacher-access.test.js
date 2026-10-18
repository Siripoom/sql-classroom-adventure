import test from 'node:test';
import assert from 'node:assert/strict';
import {isTeacher} from '../src/teacher-access.ts';

test('only administrator-assigned teacher role grants portal access',()=>{
  assert.equal(isTeacher({app_metadata:{role:'teacher'}}),true);
  assert.equal(isTeacher(null),false);
  assert.equal(isTeacher({}),false);
  assert.equal(isTeacher({app_metadata:{role:'student'}}),false);
  assert.equal(isTeacher({app_metadata:{},user_metadata:{role:'teacher'}}),false);
  assert.equal(isTeacher({role:'teacher',app_metadata:{}}),false);
});
