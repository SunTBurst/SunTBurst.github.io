import assert from 'node:assert/strict';
import test from 'node:test';
import { persistThemePreference } from '../../src/utils/themePreference';

test('persists the selected theme through a browser-safe storage factory', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };

  assert.equal(persistThemePreference('dark', () => storage), true);
  assert.equal(storage.getItem('theme'), 'dark');
});

test('returns false without throwing when the storage getter is unavailable', () => {
  assert.doesNotThrow(() => {
    assert.equal(persistThemePreference('light', () => {
      throw new Error('storage disabled');
    }), false);
  });
});

test('returns false without throwing when theme persistence fails', () => {
  const storage = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error('quota exceeded');
    },
  };

  assert.doesNotThrow(() => {
    assert.equal(persistThemePreference('light', () => storage), false);
  });
});
