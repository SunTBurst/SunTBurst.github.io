import assert from 'node:assert/strict';
import test from 'node:test';
import {
  answerPublicKnowledgeQuestion,
  tokenizeKnowledgeQuestion,
} from '../../src/utils/knowledgeGuide';
import type { PortalIndexEntry } from '../../src/types/portal';

const entries: PortalIndexEntry[] = [
  {
    id: 'knowledge:boundary',
    kind: 'knowledge',
    title: '公开与私有：知识应该放在哪里',
    description: '先判断资料能否公开，再决定进入公开门户还是私有知识平台。',
    href: '/knowledge/knowledge-visibility-boundary/',
    updatedAt: '2026-08-31T00:00:00+03:00',
    topics: ['知识管理', '公开边界'],
  },
  {
    id: 'knowledge:ai',
    kind: 'knowledge',
    title: 'AI 回答的引用、权限与不确定性',
    description: '回答必须给出可打开的来源，资料不足时明确说明未知。',
    href: '/knowledge/ai-answer-contract/',
    updatedAt: '2026-08-31T00:00:00+03:00',
    topics: ['AI 与知识库'],
  },
  {
    id: 'update:noise',
    kind: 'update',
    title: '站点更新',
    description: 'AI 页面发生更新。',
    href: '/changelog#noise',
    updatedAt: '2026-09-01T00:00:00+03:00',
    topics: ['site'],
  },
];

test('question tokenizer keeps useful Chinese bigrams and Latin concepts', () => {
  const tokens = tokenizeKnowledgeQuestion('AI 回答为什么必须附来源？');
  assert.ok(tokens.includes('ai'));
  assert.ok(tokens.includes('回答'));
  assert.ok(tokens.includes('来源'));
  assert.equal(new Set(tokens).size, tokens.length);
});

test('public knowledge guide ranks editorial sources and excludes build updates', () => {
  const answer = answerPublicKnowledgeQuestion('公开资料和私有资料应该怎样分开？', entries);
  assert.equal(answer.status, 'answered');
  assert.equal(answer.sources[0]?.href, '/knowledge/knowledge-visibility-boundary/');
  assert.ok(answer.sources.every(({ kind }) => kind !== 'update'));
  assert.match(answer.summary, /公开与私有/);
});

test('public knowledge guide cites AI answer rules instead of composing unsupported claims', () => {
  const answer = answerPublicKnowledgeQuestion('AI 回答为什么必须附来源？', entries);
  assert.equal(answer.status, 'answered');
  assert.equal(answer.sources[0]?.href, '/knowledge/ai-answer-contract/');
  assert.match(answer.summary, /可打开的来源/);
});

test('public knowledge guide says unknown when no published source supports the question', () => {
  const answer = answerPublicKnowledgeQuestion('火星温室要种多少棵橄榄树？', entries);
  assert.equal(answer.status, 'unknown');
  assert.equal(answer.sources.length, 0);
  assert.match(answer.summary, /当前公开资料无法回答/);
});

test('blank questions stay idle and never expose a fabricated answer', () => {
  const answer = answerPublicKnowledgeQuestion('   ', entries);
  assert.equal(answer.status, 'idle');
  assert.equal(answer.sources.length, 0);
});
