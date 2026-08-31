export interface DailyTrailCandidate {
  id: string;
  title: string;
  description: string;
  href: `/${string}`;
}

export interface DailyTrailPools {
  knowledge: DailyTrailCandidate[];
  practice: DailyTrailCandidate[];
  tools: DailyTrailCandidate[];
}

export interface DailyTrailStop extends DailyTrailCandidate {
  stage: 'knowledge' | 'practice' | 'tool';
  label: '读一条知识' | '看一项实践' | '打开一个工具';
  prompt: string;
}

const stages: Array<{
  pool: keyof DailyTrailPools;
  stage: DailyTrailStop['stage'];
  label: DailyTrailStop['label'];
  prompt: string;
}> = [
  { pool: 'knowledge', stage: 'knowledge', label: '读一条知识', prompt: '先用一个可复用的框架热身。' },
  { pool: 'practice', stage: 'practice', label: '看一项实践', prompt: '再看看想法怎样落到真实记录里。' },
  { pool: 'tools', stage: 'tool', label: '打开一个工具', prompt: '最后用一个小工具结束今天的漫游。' },
];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function safeCandidates(candidates: DailyTrailCandidate[]) {
  const seen = new Set<string>();
  return candidates
    .filter(({ href }) => href.startsWith('/') && !href.startsWith('//'))
    .sort((left, right) => left.href.localeCompare(right.href))
    .filter(({ href }) => {
      if (seen.has(href)) return false;
      seen.add(href);
      return true;
    });
}

export function riyadhDateKey(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error('invalid Riyadh date');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function selectDailyTrail(dateKey: string, pools: DailyTrailPools): DailyTrailStop[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error('invalid daily trail date');

  return stages.flatMap(({ pool, stage, label, prompt }) => {
    const candidates = safeCandidates(pools[pool]);
    if (candidates.length === 0) return [];
    const selected = candidates[hashString(`${dateKey}:${stage}`) % candidates.length];
    return [{ ...selected, stage, label, prompt }];
  });
}
