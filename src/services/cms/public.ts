import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CmsConnection, CmsKind, CmsPublication, CmsSettingsRow } from '../../features/cms/types';
import { cmsEnvironment, readCmsConnection } from '../../features/cms/config';
import { AsyncLocalStorage } from 'node:async_hooks';

let connection: CmsConnection | null | undefined;
let client: SupabaseClient | null = null;
const requestStore = new AsyncLocalStorage<Map<string, Promise<unknown>>>();

/** Memoize a CMS read only for the active server request; never across requests. */
export function withCmsRequest<T>(fn: () => Promise<T>): Promise<T> {
  const active = requestStore.getStore();
  if (active) {
    const key = fn.toString();
    const existing = active.get(key);
    if (existing) return existing as Promise<T>;
    const pending = fn();
    active.set(key, pending as Promise<unknown>);
    return pending;
  }
  return requestStore.run(new Map(), fn);
}
function memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const active = requestStore.getStore();
  if (!active) return fn();
  const existing = active.get(key);
  if (existing) return existing as Promise<T>;
  const pending = fn();
  active.set(key, pending as Promise<unknown>);
  return pending;
}

function readConnection(): CmsConnection | null {
  return connection ??= readCmsConnection(cmsEnvironment());
}

function publicClient(): SupabaseClient {
  const config = readConnection();
  if (!config) throw new Error('CMS 未启用');
  return client ??= createClient(config.endpoint, config.publishableKey, { auth: { persistSession: false } });
}

/** Read the public publication snapshot. No service key or stale fallback is used. */
export async function getCmsPublications(kind?: CmsKind): Promise<CmsPublication[]> {
  if (!readConnection()) return [];
  return memo(`publications:${kind ?? 'all'}`, async () => {
  const rows: CmsPublication[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = publicClient().from('cms_publications').select('*').order('published_at', { ascending: false }).order('id').range(offset, offset + 499);
    if (kind) query = query.eq('kind', kind);
    const result = await query;
    if (result.error) throw new Error(`CMS 公开内容读取失败：${result.error.message}`);
    const batch = (result.data ?? []) as CmsPublication[];
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
  });
}

export async function getCmsPublicRoutes(kind?: CmsKind) {
  if (!readConnection()) return [] as Array<{ kind: CmsKind; slug: string; is_published: boolean }>;
  return memo(`routes:${kind ?? 'all'}`, async () => {
    const rows: Array<{ kind: CmsKind; slug: string; is_published: boolean }> = [];
    for (let offset = 0; ; offset += 500) {
      let query = publicClient().from('cms_public_routes').select('kind,slug,is_published').order('kind').order('slug').range(offset, offset + 499);
      if (kind) query = query.eq('kind', kind);
      const result = await query;
      if (result.error) throw new Error(`CMS 公开路由读取失败：${result.error.message}`);
      const batch = (result.data ?? []) as Array<{ kind: CmsKind; slug: string; is_published: boolean }>;
      rows.push(...batch);
      if (batch.length < 500) return rows;
    }
  });
}

export async function getCmsSettingsRow(): Promise<CmsSettingsRow | null> {
  if (!readConnection()) return null;
  return memo('settings', async () => {
    const result = await publicClient().from('cms_settings').select('id,value,version,updated_at').eq('id', true).maybeSingle();
    if (result.error) throw new Error(`CMS 设置读取失败：${result.error.message}`);
    return (result.data ?? null) as CmsSettingsRow | null;
  });
}
