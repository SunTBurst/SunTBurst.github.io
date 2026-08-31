import type { PortalIndexEntry } from '../types/portal';
import { normalizeSearchText } from './portalIndexCore';

export const PUBLIC_KNOWLEDGE_QUESTIONS = [
  '公开资料和私有资料应该怎样分开？',
  '知识整理后怎样发布？',
  'AI 回答为什么必须附来源？',
] as const;

export interface KnowledgeGuideSource extends PortalIndexEntry {
  matchedTerms: string[];
}

export interface KnowledgeGuideAnswer {
  status: 'idle' | 'answered' | 'unknown';
  summary: string;
  sources: KnowledgeGuideSource[];
}

const EDITORIAL_KINDS = new Set<PortalIndexEntry['kind']>(['knowledge', 'project', 'post', 'talk']);
const LATIN_WORD = /[a-z0-9]+/g;
const CJK_SEQUENCE = /[\u3400-\u9fff]+/g;

export function tokenizeKnowledgeQuestion(value: string): string[] {
  const normalized = normalizeSearchText(value).slice(0, 200);
  const tokens = new Set<string>();

  for (const word of normalized.match(LATIN_WORD) ?? []) {
    if (word.length >= 2) tokens.add(word);
  }

  for (const sequence of normalized.match(CJK_SEQUENCE) ?? []) {
    if (sequence.length === 1) tokens.add(sequence);
    if (sequence.length <= 8) tokens.add(sequence);
    for (let index = 0; index < sequence.length - 1; index += 1) {
      tokens.add(sequence.slice(index, index + 2));
    }
  }

  return [...tokens];
}

function scoreEntry(entry: PortalIndexEntry, tokens: string[]) {
  const title = normalizeSearchText(entry.title);
  const description = normalizeSearchText(entry.description);
  const topics = normalizeSearchText(entry.topics.join(' '));
  const matchedTerms: string[] = [];
  let score = entry.kind === 'knowledge' ? 2 : entry.kind === 'project' ? 1 : 0;

  for (const token of tokens) {
    let matched = false;
    if (title.includes(token)) {
      score += 6;
      matched = true;
    }
    if (topics.includes(token)) {
      score += 4;
      matched = true;
    }
    if (description.includes(token)) {
      score += 2;
      matched = true;
    }
    if (matched) matchedTerms.push(token);
  }

  return { entry, score, matchedTerms };
}

export function answerPublicKnowledgeQuestion(
  question: string,
  entries: PortalIndexEntry[],
): KnowledgeGuideAnswer {
  const tokens = tokenizeKnowledgeQuestion(question);
  if (tokens.length === 0) {
    return { status: 'idle', summary: '输入一个问题，或从下方示例开始。', sources: [] };
  }

  const ranked = entries
    .filter(({ kind }) => EDITORIAL_KINDS.has(kind))
    .map((entry) => scoreEntry(entry, tokens))
    .filter(({ matchedTerms }) => matchedTerms.length > 0)
    .sort((left, right) => right.score - left.score
      || right.matchedTerms.length - left.matchedTerms.length
      || right.entry.updatedAt.localeCompare(left.entry.updatedAt)
      || left.entry.href.localeCompare(right.entry.href))
    .slice(0, 3);

  if (ranked.length === 0) {
    return {
      status: 'unknown',
      summary: '当前公开资料无法回答这个问题。可以换一种说法，或前往知识地图查看已发布范围。',
      sources: [],
    };
  }

  const [primary] = ranked;
  return {
    status: 'answered',
    summary: `最相关的公开资料是《${primary.entry.title}》：${primary.entry.description}`,
    sources: ranked.map(({ entry, matchedTerms }) => ({ ...entry, matchedTerms })),
  };
}
