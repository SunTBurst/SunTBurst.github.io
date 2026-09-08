import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { buildAppearanceBootstrap, normalizeAppearanceSelection, persistAppearancePreference } from '../../src/utils/appearancePreference';

const options = {
  palettes: ['paper', 'ocean', 'forest', 'coffee', 'graphite'],
  layouts: ['paper', 'compact', 'cards'],
  defaults: { palette: 'paper', layout: 'paper' },
};

function runBootstrap(saved: string | null, mode: string | null, systemDark = false, blocked = false) {
  const root = { dataset: {} as Record<string, string>, dark: false, classList: { toggle(_name: string, value: boolean) { root.dark = value; } } };
  const storage = { getItem(key: string) { if (blocked) throw new Error('storage denied'); return key === 'theme' ? mode : saved; } };
  const context = { document: { documentElement: root }, window: { localStorage: storage, matchMedia: () => ({ matches: systemDark }) } };
  vm.runInNewContext(buildAppearanceBootstrap(options), context);
  return root;
}

test('appearance preferences accept only known independent choices and discard unrelated fields', () => {
  assert.deepEqual(normalizeAppearanceSelection({ palette: 'forest', layout: 'cards', content: 'unused' }, options), { palette: 'forest', layout: 'cards' });
  assert.deepEqual(normalizeAppearanceSelection({ palette: '__proto__', layout: 'compact' }, options), { palette: 'paper', layout: 'compact' });
  assert.deepEqual(normalizeAppearanceSelection(['ocean', 'cards'], options), options.defaults);
  assert.deepEqual(normalizeAppearanceSelection(null, options), options.defaults);
});

test('head bootstrap restores palette, layout and legacy dark-mode state before toolbar initialization', () => {
  const root = runBootstrap('{"palette":"coffee","layout":"compact"}', 'dark');
  assert.deepEqual(root.dataset, { palette: 'coffee', layout: 'compact' });
  assert.equal(root.dark, true);
  assert.equal(runBootstrap('{"palette":"ocean","layout":"cards"}', 'light', true).dark, false);
});

test('malformed or unavailable preference storage falls back without breaking the page', () => {
  assert.deepEqual(runBootstrap('{broken', 'light').dataset, options.defaults);
  assert.deepEqual(runBootstrap('{"palette":"bad","layout":"cards"}', null).dataset, { palette: 'paper', layout: 'cards' });
  const blocked = runBootstrap(null, null, true, true);
  assert.deepEqual(blocked.dataset, options.defaults);
  assert.equal(blocked.dark, true);
});

test('appearance saving uses a dedicated small record and handles denied storage', () => {
  const saved = new Map<string, string>();
  assert.equal(persistAppearancePreference({ palette: 'graphite', layout: 'cards', content: 'discard' }, options, () => ({ setItem: (key, value) => saved.set(key, value) })), true);
  assert.deepEqual([...saved], [['suntburst:appearance:v1', '{"palette":"graphite","layout":"cards"}']]);
  assert.equal(persistAppearancePreference(options.defaults, options, () => { throw new Error('denied'); }), false);
});
