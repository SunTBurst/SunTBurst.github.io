import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildProject } from './helpers/build-project.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('built appearance control restores all palette, layout and mode combinations in the document head', () => {
  const result = buildProject(projectRoot);
  assert.equal(result.status, 0, `expected appearance build to succeed:\n${result.output}`);
  const html = readFileSync(path.join(projectRoot, 'dist', 'index.html'), 'utf8');
  assert.equal((html.match(/\bdata-appearance-picker(?:\s|>)/g) ?? []).length, 1);
  assert.equal((html.match(/<input\b[^>]*\bname="appearance-palette"/g) ?? []).length, 5);
  assert.equal((html.match(/<input\b[^>]*\bname="appearance-layout"/g) ?? []).length, 3);
  assert.match(html, /选择配色和版式/);
  assert.match(html, /恢复默认配色和版式/);
  const bootstrap = html.match(/<script\b[^>]*\bdata-appearance-bootstrap[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(bootstrap, 'expected an immediate appearance bootstrap');
  assert.ok(bootstrap.index < html.indexOf('</head>'), 'preferences must apply before the page body appears');
  assert.doesNotMatch(bootstrap[0], /type="module"|\bdefer\b|\basync\b/, 'first-paint initialization must not wait for a component module');

  for (const palette of ['paper', 'ocean', 'forest', 'coffee', 'graphite']) {
    assert.ok(html.includes(`:root[data-palette="${palette}"]`));
    for (const layout of ['paper', 'compact', 'cards']) {
      for (const mode of ['light', 'dark']) {
        const root = { dataset: {}, dark: false, classList: { toggle(_name, value) { root.dark = value; } } };
        vm.runInNewContext(bootstrap[1], {
          document: { documentElement: root },
          window: { localStorage: { getItem: (key) => key === 'theme' ? mode : JSON.stringify({ palette, layout }) }, matchMedia: () => ({ matches: false }) },
        });
        assert.deepEqual(root.dataset, { palette, layout });
        assert.equal(root.dark, mode === 'dark');
      }
    }
  }
  for (const route of ['posts/hello-world', 'posts', 'talks', 'write']) {
    const page = readFileSync(path.join(projectRoot, 'dist', route, 'index.html'), 'utf8');
    assert.match(page, /data-appearance-bootstrap/);
    assert.match(page, /data-appearance-picker/);
    assert.match(page, /src="\/images\/avatar.svg"/, 'each page keeps the original logo asset');
  }
});
