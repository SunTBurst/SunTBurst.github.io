import { defineMiddleware } from 'astro:middleware';
import { readCmsConnection, cmsEnvironment } from './features/cms/config';
import { resolveCmsSettings } from './features/cms/settings';
import { getCmsSettingsRow, withCmsRequest } from './services/cms/public';

export const onRequest = defineMiddleware(async (context, next) => {
  const isAccountPage = ['/admin', '/account'].includes(context.url.pathname.replace(/\/$/, ''));
  try {
    if (!readCmsConnection(cmsEnvironment())) return next();
  } catch (error) {
    if (isAccountPage) return next();
    throw error;
  }
  return withCmsRequest(async () => {
    try {
      const settings = await getCmsSettingsRow();
      context.locals.cmsSettings = resolveCmsSettings(settings?.value);
      const response = await next();
      // Withdrawing a publication must not leave stale public responses in a CDN.
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      return response;
    } catch {
      // The owner must still be able to reach setup/auth diagnostics when the
      // database is unavailable. Public content never falls back to old files.
      if (isAccountPage) return next();
      return new Response('<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>暂时无法连接博客</title><main style="max-width:40rem;margin:10vh auto;padding:2rem;font-family:system-ui"><h1>博客暂时无法连接数据库</h1><p>请稍后刷新。文章和草稿不会因此丢失。</p><a href="/admin/">返回管理后台</a></main></html>', {
        status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '30' },
      });
    }
  });
});
