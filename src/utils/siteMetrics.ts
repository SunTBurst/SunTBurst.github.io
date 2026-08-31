import type { PortalIndexEntry, PortalKind } from '../types/portal';

interface ToolStateItem {
  state: 'ready' | 'preview';
}

export interface SiteMetrics {
  indexedRoutes: number;
  publicRecords: number;
  byKind: Record<PortalKind, number>;
  readyTools: number;
  previewTools: number;
  latestPublishedAt: string | null;
}

export interface SiteStatusSnapshot {
  schemaVersion: 1;
  buildState: 'verified-at-build';
  generatedAt: string;
  buildSha: string | null;
  githubSnapshot: 'build-cache' | 'fallback';
  metrics: SiteMetrics;
}

const kinds: PortalKind[] = ['page', 'post', 'talk', 'knowledge', 'project', 'update'];

export function buildSiteMetrics(entries: PortalIndexEntry[], tools: ToolStateItem[]): SiteMetrics {
  const byKind = Object.fromEntries(kinds.map((kind) => [kind, 0])) as Record<PortalKind, number>;
  for (const entry of entries) byKind[entry.kind] += 1;
  const latestPublishedAt = entries.length > 0
    ? entries.map(({ updatedAt }) => updatedAt).sort((left, right) => right.localeCompare(left))[0] ?? null
    : null;

  return {
    indexedRoutes: entries.length,
    publicRecords: entries.length - byKind.page,
    byKind,
    readyTools: tools.filter(({ state }) => state === 'ready').length,
    previewTools: tools.filter(({ state }) => state === 'preview').length,
    latestPublishedAt,
  };
}

export function buildSiteStatusSnapshot(
  metrics: SiteMetrics,
  rawBuildSha: string | undefined,
  generatedAt: string,
  githubSnapshot: 'build-cache' | 'fallback',
): SiteStatusSnapshot {
  const timestamp = Date.parse(generatedAt);
  if (!Number.isFinite(timestamp)) throw new Error('构建状态时间无效');
  const buildSha = typeof rawBuildSha === 'string' && /^[a-f0-9]{40}$/i.test(rawBuildSha)
    ? rawBuildSha.toLowerCase()
    : null;

  return {
    schemaVersion: 1,
    buildState: 'verified-at-build',
    generatedAt: new Date(timestamp).toISOString(),
    buildSha,
    githubSnapshot,
    metrics,
  };
}
