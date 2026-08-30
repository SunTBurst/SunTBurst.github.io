import type { KnowledgeTopic, PortalIndexEntry } from '../types/portal';

export const normalizeSearchText = (value: string) => value.trim().toLocaleLowerCase('zh-CN');

export function matchesPortalTopic(entryTopics: string[], topic: Pick<KnowledgeTopic, 'slug' | 'title'>): boolean {
  const configuredNames = new Set([normalizeSearchText(topic.slug), normalizeSearchText(topic.title)]);
  return entryTopics.some((entryTopic) => configuredNames.has(normalizeSearchText(entryTopic)));
}

export function pickRandomEntry(entries: PortalIndexEntry[], randomValue = Math.random()): PortalIndexEntry | null {
  if (entries.length === 0) return null;
  const safe = Math.min(Math.max(randomValue, 0), 0.999999999);
  return entries[Math.floor(safe * entries.length)] ?? null;
}

export function assertUniqueLocalEntries(entries: PortalIndexEntry[]): PortalIndexEntry[] {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry.href.startsWith('/') || entry.href.startsWith('//')) {
      throw new Error(`non-local portal href: ${entry.href}`);
    }
    if (seen.has(entry.href)) throw new Error(`duplicate portal href: ${entry.href}`);
    seen.add(entry.href);
  }
  return entries;
}

export function plainTextSummary(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/[^\s<>()]+/g, ' ')
    .replace(/[#>*_`\[\]()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
