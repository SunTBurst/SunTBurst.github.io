import type { CmsConnection } from './types';

export function readCmsConnection(env: Record<string, string | undefined>): CmsConnection | null {
  if (env.CMS_ENABLED !== 'true') return null;
  const endpoint = env.PUBLIC_SUPABASE_URL?.trim() ?? '';
  const publishableKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new Error('CMS 缺少有效的 PUBLIC_SUPABASE_URL'); }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:';
  if ((!local && (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')))
    || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('CMS 数据库地址必须是 Supabase 项目根地址或本地开发地址');
  }
  let anonJwt = false;
  try { anonJwt = JSON.parse(atob(publishableKey.split('.')[1])).role === 'anon'; } catch { /* Publishable keys are not JWTs. */ }
  if (!publishableKey.startsWith('sb_publishable_') && !anonJwt) {
    throw new Error('CMS 只接受 publishable key 或 anon key，不接受服务端密钥');
  }
  return { endpoint: url.origin, publishableKey };
}

/** Server-side only callers pass process.env explicitly; no service credential enters the UI. */
export function cmsEnvironment(): Record<string, string | undefined> {
  return { ...import.meta.env, ...(typeof process !== 'undefined' ? process.env : {}) };
}
