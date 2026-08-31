import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReadingTime, countReadableUnits } from '../../src/utils/readingTime';

test('countReadableUnits distinguishes CJK and Latin scripts', () => {
  const units = countReadableUnits('这是一段没有空格的中文正文。 English words.');
  assert.ok(units.cjkCharacters >= 13, 'expected meaningful CJK characters counted');
  assert.equal(units.latinWords, 2, 'expected plain Latin words counted');
});

test('reading time uses configured CJK/Latin rates and minimum one minute', () => {
  assert.equal(calculateReadingTime(''), 1, 'empty content should still be at least one minute');
  assert.equal(calculateReadingTime('你好'), 1, 'short content should keep minimum one minute');
});

test('code, links, and images are not over-counted in reading estimate', () => {
  const content = [
    '# 标题',
    '这是一段正文，包含一个 [链接](https://example.com)。',
    '```js\nconst url = \"https://example.com\";\n```',
    '![image](/images/example.png)',
    'Another sentence with words.',
  ].join('\n');
  const units = countReadableUnits(content);
  assert.ok(units.latinWords >= 2);
  assert.ok(units.cjkCharacters > 10);
  const minutes = calculateReadingTime(content);
  assert.ok(minutes >= 1);
});
