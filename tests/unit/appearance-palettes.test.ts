import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAppearanceCss, palettePresets } from '../../src/config/appearance';

const defaults = { backgroundColor: '#f7f5ef', surfaceColor: '#fffdf8', articleColor: '#fffdf8' };

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/../g)!.map((channel) => parseInt(channel, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function declarations(css: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  assert.ok(rule, `missing generated rule: ${selector}`);
  return Object.fromEntries(Array.from(rule[1].matchAll(/(--[\w-]+):\s*(#[\da-f]{6})\s*;/gi), ([, key, value]) => [key, value]));
}

test('every selectable palette emits complete independent light and dark rules', () => {
  const css = buildAppearanceCss(defaults);
  for (const id of ['paper', 'ocean', 'forest', 'coffee', 'graphite']) {
    assert.ok(palettePresets.some((preset) => preset.id === id), `${id} can be selected`);
    for (const suffix of ['', '.dark']) {
      const values = declarations(css, `:root[data-palette="${id}"]${suffix}`);
      for (const token of ['site-background', 'site-surface', 'article-background', 'site-text', 'site-text-muted', 'site-link', 'site-primary', 'site-accent', 'site-tint', 'site-highlight', 'site-highlight-text', 'site-border']) {
        assert.match(values[`--${token}`] ?? '', /^#[\da-f]{6}$/i, `${id}${suffix}: ${token}`);
      }
    }
  }
});

test('all preset reading surfaces, links and button pairs have readable contrast', () => {
  const css = buildAppearanceCss(defaults);
  for (const preset of palettePresets) {
    for (const suffix of ['', '.dark']) {
      const values = declarations(css, `:root[data-palette="${preset.id}"]${suffix}`);
      const check = (foreground: string, background: string) => {
        const ratio = contrast(values[`--${foreground}`], values[`--${background}`]);
        assert.ok(ratio >= 4.5, `${preset.id}${suffix}: ${foreground} on ${background} has ${ratio.toFixed(2)} contrast`);
      };
      for (const background of ['site-background', 'site-surface', 'article-background', 'site-tint']) {
        for (const foreground of ['site-text', 'site-text-muted', 'site-link']) check(foreground, background);
      }
      check('site-primary-text', 'site-primary');
      check('site-highlight-text', 'site-highlight');
    }
  }
});

test('custom paper colors affect only its light reading surfaces', () => {
  const css = buildAppearanceCss({ backgroundColor: '#F1F2F3', surfaceColor: '#FAFBFC', articleColor: '#FEFDFC' });
  const paper = declarations(css, ':root[data-palette="paper"]');
  assert.equal(paper['--site-background'], '#F1F2F3');
  assert.equal(paper['--site-surface'], '#FAFBFC');
  assert.equal(paper['--article-background'], '#FEFDFC');
  for (const selector of [':root[data-palette="paper"].dark', ':root[data-palette="ocean"]']) {
    assert.deepEqual(declarations(css, selector), declarations(buildAppearanceCss(defaults), selector));
  }
  assert.equal(palettePresets[0].light['--site-background'], '#f7f5ef', 'generation must not mutate shared defaults');
});

test('the existing appearance configuration may include unrelated settings', () => {
  const config = { ...defaults, homeImage: '', defaultPalette: 'forest', defaultLayout: 'compact' };
  assert.equal(buildAppearanceCss(config), buildAppearanceCss(defaults));
});

test('unsafe or malformed configured colors never become inline CSS', () => {
  for (const invalid of ['', '#fff', 'red', '#123456; color:red', '#123456</style><script>alert(1)</script>', 'var(--surface)']) {
    for (const key of ['backgroundColor', 'surfaceColor', 'articleColor']) {
      assert.throws(() => buildAppearanceCss({ ...defaults, [key]: invalid }), /颜色|color/i);
    }
  }
});
