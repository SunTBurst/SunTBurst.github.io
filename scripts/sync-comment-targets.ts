import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type PublicKind = 'post' | 'talk' | 'knowledge' | 'project';

interface PortalIndexRow {
  kind?: unknown;
  href?: unknown;
  title?: unknown;
  description?: unknown;
}

const allowedKinds = new Set<PublicKind>(['post', 'talk', 'knowledge', 'project']);
const endpoint = process.env.SUPABASE_URL?.trim() ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/iu.test(endpoint)) {
  throw new Error('SUPABASE_URL must be the bare HTTPS origin of the target project');
}
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

const indexPath = path.join(process.cwd(), 'dist', 'portal-index.json');
const raw = JSON.parse(readFileSync(indexPath, 'utf8')) as unknown;
if (!Array.isArray(raw)) throw new Error('dist/portal-index.json must contain an array');

const targets = (raw as PortalIndexRow[]).flatMap((entry) => {
  if (!allowedKinds.has(entry.kind as PublicKind)
    || typeof entry.href !== 'string'
    || typeof entry.title !== 'string'
    || typeof entry.description !== 'string') return [];
  return [{
    target_kind: entry.kind as PublicKind,
    target_path: entry.href,
    title: entry.title.slice(0, 160),
    summary: entry.description.slice(0, 500) || '公开页面',
    active: true,
    updated_at: new Date().toISOString(),
  }];
});
if (targets.length === 0) throw new Error('No public comment targets were found; refusing to update');

const client = createClient(endpoint, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: existing, error: readError } = await client
  .from('comment_targets')
  .select('target_kind,target_path');
if (readError) throw new Error('Unable to read existing comment targets');

const { error: upsertError } = await client
  .from('comment_targets')
  .upsert(targets, { onConflict: 'target_kind,target_path' });
if (upsertError) throw new Error('Unable to synchronize public comment targets');

const activeKeys = new Set(targets.map((item) => `${item.target_kind}:${item.target_path}`));
const stale = (existing ?? []).filter((item) => !activeKeys.has(`${item.target_kind}:${item.target_path}`));
for (const item of stale) {
  const { error } = await client
    .from('comment_targets')
    .update({ active: false })
    .eq('target_kind', item.target_kind)
    .eq('target_path', item.target_path);
  if (error) throw new Error('Unable to deactivate a removed comment target');
}

process.stdout.write(`COMMENT_TARGET_SYNC_OK active=${targets.length} inactive=${stale.length}\n`);
