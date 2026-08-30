import assert from 'node:assert/strict';
import test from 'node:test';
import { decideUnifiedSearchKey } from '../../src/utils/unifiedSearchCore';

test('search arrow keys move focus through result boundaries and Enter chooses the active result', () => {
  assert.deepEqual(decideUnifiedSearchKey({ key: 'ArrowDown' }, -1, 3), { action: 'focus', index: 0 });
  assert.deepEqual(decideUnifiedSearchKey({ key: 'ArrowDown' }, 2, 3), { action: 'focus', index: 0 });
  assert.deepEqual(decideUnifiedSearchKey({ key: 'ArrowUp' }, -1, 3), { action: 'focus', index: 2 });
  assert.deepEqual(decideUnifiedSearchKey({ key: 'ArrowUp' }, 0, 3), { action: 'focus', index: 2 });
  assert.deepEqual(decideUnifiedSearchKey({ key: 'Enter' }, 1, 3), { action: 'navigate', index: 1 });
  assert.deepEqual(decideUnifiedSearchKey({ key: 'Enter' }, -1, 3), { action: 'navigate', index: 0 });
});

test('search keyboard handling ignores IME composition including legacy keyCode 229', () => {
  for (const keyboard of [
    { key: 'Enter', isComposing: true },
    { key: 'Enter', keyCode: 229 },
    { key: 'ArrowDown', isComposing: true },
    { key: 'ArrowUp', keyCode: 229 },
  ]) {
    assert.deepEqual(decideUnifiedSearchKey(keyboard, 1, 3), { action: 'none', index: 1 });
  }
});

test('search keyboard handling leaves unrelated keys and empty results untouched', () => {
  assert.deepEqual(decideUnifiedSearchKey({ key: 'Tab' }, 0, 3), { action: 'none', index: 0 });
  assert.deepEqual(decideUnifiedSearchKey({ key: 'Enter' }, 0, 0), { action: 'none', index: -1 });
});
