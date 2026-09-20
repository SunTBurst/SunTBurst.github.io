import assert from 'node:assert/strict';
import test from 'node:test';
import { renderCmsMarkdown } from '../../src/utils/cmsMarkdown';

test('CMS markdown strips raw HTML and unsafe links', () => {
  const result = renderCmsMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1))');
  assert.doesNotMatch(result.html, /<script|href="javascript:/i);
  assert.match(result.html, /<p>/);
});

test('CMS markdown keeps approved media and remote images but rejects unsafe sources', () => {
  const result = renderCmsMarkdown('![local](/media/a.png) ![remote](https://example.test/a.jpg) ![bad](javascript:alert(1))');
  assert.match(result.html, /src="\/media\/a\.png"/);
  assert.match(result.html, /src="https:\/\/example\.test\/a\.jpg"/);
  assert.doesNotMatch(result.html, /src="javascript:/i);
});

test('CMS markdown creates unique headings on each independent render and preserves tables', () => {
  const source = '# Same\n## Same\n\n| A | B |\n| - | - |\n| 1 | 2 |';
  const first = renderCmsMarkdown(source);
  const second = renderCmsMarkdown(source);
  assert.deepEqual(first.headings.map((heading) => [heading.depth, heading.slug]), [[1, 'same'], [2, 'same-2']]);
  assert.deepEqual(second.headings.map((heading) => [heading.depth, heading.slug]), first.headings.map((heading) => [heading.depth, heading.slug]));
  assert.match(first.html, /<table>/);
});
