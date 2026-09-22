import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { cmsEnvironment, readCmsConnection } from '../../features/cms/config';

export function getStaticPaths() { return []; }

export const GET: APIRoute = async ({ params }) => {
  const config = readCmsConnection(cmsEnvironment());
  if (!config || !/^[0-9a-f-]{36}$/i.test(params.id ?? '')) return new Response('Not found', { status: 404 });
  const db = createClient(config.endpoint, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: item, error } = await db.rpc('cms_public_media', { p_id: params.id });
  if (error) return new Response('Media unavailable', { status: 503 });
  if (!item) return new Response('Not found', { status: 404 });
  const { data, error: downloadError } = await db.storage.from('cms-media').download(item.object_path);
  if (downloadError || !data) return new Response('Not found', { status: 404 });
  const mime = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(item.mime) ? item.mime : 'application/octet-stream';
  return new Response(data, { headers: { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
};
