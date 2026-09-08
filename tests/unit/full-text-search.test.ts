import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSearchText } from '../../src/utils/searchText';
import { matchesPortalSearch } from '../../src/utils/unifiedSearchCore';

test('正文深处和代码块的内容可以检索，图片地址不作为正文', () => {
  const source = '普通内容。'.repeat(60)
    + '\n正文深处独有检索词\n\n```ts\nconst BODY_CODE_ONLY_9F = 1;\n```\n'
    + '![配图](/images/private-filename-marker.png)';
  const body = extractSearchText(source);
  const entry = { title: '普通文章', description: '普通摘要', kind: 'post', topics: [] };
  assert.equal(matchesPortalSearch(entry, '正文深处独有检索词', body), true);
  assert.equal(matchesPortalSearch(entry, 'body_code_only_9f', body), true);
  assert.equal(matchesPortalSearch(entry, '没有这个词', body), false);
  assert.doesNotMatch(body, /private-filename-marker/);
});

test('正文 HTML 图片属性不进入索引，但前后文字和代码中的 HTML 示例保留', () => {
  const source = [
    '可见前文 <img src="/images/HTML_IMAGE_ONLY.png" alt="HTML_IMAGE_ALT_ONLY"> 可见后文',
    '',
    '`<img src="/images/INLINE_CODE_IMAGE.png">`',
    '',
    '```html',
    '<img src="/images/FENCED_CODE_IMAGE.png">',
    '```',
  ].join('\n');
  const body = extractSearchText(source);

  assert.match(body, /可见前文/);
  assert.match(body, /可见后文/);
  assert.doesNotMatch(body, /HTML_IMAGE_(?:ONLY|ALT_ONLY)/);
  assert.match(body, /INLINE_CODE_IMAGE/);
  assert.match(body, /FENCED_CODE_IMAGE/);
});

test('跨行 HTML 图片和含大于号的属性不进入索引，同形代码仍保留', () => {
  const source = [
    '跨行图片前文',
    '<img',
    ' src="/images/MULTILINE_HTML_IMAGE_ONLY.png"',
    ' title="arrow > edge">',
    '跨行图片后文',
    '',
    '```html',
    '<img',
    ' src="/images/MULTILINE_CODE_IMAGE.png"',
    ' title="arrow > edge">',
    '```',
  ].join('\n');
  const body = extractSearchText(source);

  assert.match(body, /跨行图片前文/);
  assert.match(body, /跨行图片后文/);
  assert.doesNotMatch(body, /MULTILINE_HTML_IMAGE_ONLY/);
  assert.match(body, /MULTILINE_CODE_IMAGE/);
});

test('Markdown 标记不拆漏图片属性，并保留 HTML 块文字和缩进代码', () => {
  const body = extractSearchText([
    '标记图片前文 <img src="/images/_marked_.png"> 标记图片后文',
    '',
    '**Markdown加粗文字** 与 _Markdown斜体文字_',
    '',
    '<section>',
    'HTML块可见文字 <strong>HTML块加粗文字</strong>',
    '<img src="/images/_block_marked_.png" title="arrow > edge">',
    '</section>',
  ].join('\n'));
  const codeBody = extractSearchText('    <img src="/images/_marked_.png" title="arrow > edge">\n');

  assert.match(body, /标记图片前文/);
  assert.match(body, /标记图片后文/);
  assert.match(body, /Markdown加粗文字/);
  assert.match(body, /Markdown斜体文字/);
  assert.match(body, /HTML块可见文字/);
  assert.match(body, /HTML块加粗文字/);
  assert.doesNotMatch(body, /marked/i);
  assert.match(codeBody, /_marked_/);
});
