import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID, createHmac } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { createCmsClient } from '../src/services/cms/client';
import { newCmsDraft } from '../src/features/cms/types';

// Local integration only: never accepts a remote URL or production credentials.
const status = spawnSync('pnpm exec supabase status -o json', { shell: true, encoding: 'utf8' });
if (status.status !== 0) throw new Error('Start the local Supabase stack before running cms:smoke');
const local = JSON.parse(status.stdout);
assert.equal(local.API_URL, 'http://127.0.0.1:54321', 'This test is restricted to local Supabase');
const config = { endpoint: local.API_URL, publishableKey: local.ANON_KEY };
const service = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(config.endpoint, config.publishableKey, { auth: { persistSession: false } });
function sql(statement: string) {
  const result = spawnSync('docker', ['exec', '-i', 'supabase_db_suntburst-comments', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], { input: statement, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
assert.equal(sql("select count(*) from auth.identities where provider='github' and provider_id='105589585';"), '0', 'Reserved local owner identity exists; refusing to modify existing users');
const suffix = randomUUID().slice(0, 8);
const userIds: string[] = []; const documentIds: string[] = []; const mediaIds: string[] = [];
let processServer: ReturnType<typeof spawn> | undefined;
let uiProxy: Server | undefined;
const originalSettings = (await service.from('cms_settings').select('*').eq('id', true).single()).data;
let settingsChanged = false;
const site = 'http://127.0.0.1:4327';

async function testUser(githubId: string, name: string) {
  const email = `cms-smoke-${name}-${suffix}@example.invalid`;
  const { data, error } = await service.auth.admin.createUser({ email, email_confirm: true, app_metadata: { provider: 'github', providers: ['github'] } });
  assert.equal(error, null);
  const id = data.user!.id; userIds.push(id);
  sql(`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at,last_sign_in_at) values ('${githubId}','${id}','{"sub":"${githubId}","user_name":"cms-${name}","name":"CMS Test ${name}"}','github',now(),now(),now());`);
  const sessionId = randomUUID();
  sql(`insert into auth.sessions(id,user_id,created_at,updated_at,aal) values ('${sessionId}','${id}',now(),now(),'aal1');`);
  // A short-lived JWT signed with the LOCAL stack key exercises real Auth/RLS
  // without weakening GitHub-only provider settings or depending on external OAuth.
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, role: 'authenticated', aud: 'authenticated', session_id: sessionId, aal: 'aal1', exp: now + 1800, iat: now })}`;
  const accessToken = `${payload}.${createHmac('sha256', local.JWT_SECRET).update(payload).digest('base64url')}`;
  const db = createClient(config.endpoint, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await db.auth.setSession({ access_token: accessToken, refresh_token: 'local-smoke-not-refreshable' });
  assert.equal(login.error, null);
  return { client: createCmsClient(config, db), db };
}
async function html(path: string, expected = 200) {
  const response = await fetch(site + path);
  assert.equal(response.status, expected, `HTTP ${path}`);
  return response.text();
}

try {
  const owner = await testUser('105589585', 'owner');
  const member = await testUser(`98765${Date.now()}`, 'member');
  assert.equal((await owner.client.profile())?.role, 'owner');
  assert.equal((await member.client.profile())?.role, 'member');
  const draft = { ...newCmsDraft(), slug: `cms-smoke-${suffix}`, title: `CMS smoke ${suffix}`, body: 'initial confidential working copy', summary: 'integration test', category: 'CMS测试', tags: ['CMS测试'] };
  await assert.rejects(member.client.save(draft, null));
  let document = await owner.client.save(draft, null); documentIds.push(document.id);
  assert.equal((await anon.from('cms_publications').select('*').eq('id', document.id)).data?.length, 0);
  const directDraft = await anon.from('cms_documents').select('*');
  assert(directDraft.error || directDraft.data?.length === 0, 'Anonymous draft reads must fail');
  console.log('PASS GitHub identity bootstrap, member writes denied, draft isolation');

  processServer = spawn(process.execPath, ['dist/server/entry.mjs'], { env: { ...process.env, CMS_ENABLED: 'true', PUBLIC_SUPABASE_URL: config.endpoint, PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.publishableKey, HOST: '127.0.0.1', PORT: '4327' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = ''; processServer.stdout?.on('data', (part) => { serverLog += part; }); processServer.stderr?.on('data', (part) => { serverLog += part; });
  for (let i = 0; i < 80; i++) {
    try { await fetch(site + '/admin/'); break; } catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
    if (i === 79) throw new Error(`Local server did not start: ${serverLog.slice(-1500)}`);
  }
  assert.match(await html('/admin/'), /内容后台/);
  await html(`/posts/${draft.slug}/`, 404);
  await html('/posts/hello-world/', 404); // CMS must not resurrect file content.

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHfoAAAAASUVORK5CYII=', 'base64');
  const media = await owner.client.upload(new File([png], 'cms-smoke.png', { type: 'image/png' })); mediaIds.push(media.id);
  assert(media.previewUrl, 'private image has a signed author preview');
  assert.equal((await fetch(media.previewUrl)).status, 200);
  await html(`/media/${media.id}`, 404);
  document = await owner.client.save({ ...draft, id: document.id, body: `Published version\n\n![test](/media/${media.id})`, image: `/media/${media.id}` }, document.version);
  document = await owner.client.action(document, 'publish');
  assert.match(await html(`/posts/${draft.slug}/`), /Published version/);
  for (const url of ['/', '/posts/', '/search/', '/rss.xml', '/sitemap.xml', '/category/CMS%E6%B5%8B%E8%AF%95/', '/tag/CMS%E6%B5%8B%E8%AF%95/']) assert((await html(url)).includes(draft.slug), `Publication appears in ${url}`);
  assert.equal((await fetch(site + `/media/${media.id}`)).status, 200);
  await assert.rejects(owner.client.deleteMedia(media));
  console.log('PASS upload/private preview, publish, public HTML/list/search/RSS/sitemap, referenced-media protection');

  const publishedVersion = document.version;
  document = await owner.client.save({ ...draft, id: document.id, body: 'SECOND_PRIVATE_DRAFT_SENTINEL' }, document.version);
  const stillPublic = await html(`/posts/${draft.slug}/`);
  assert.match(stillPublic, /Published version/); assert(!stillPublic.includes('SECOND_PRIVATE_DRAFT_SENTINEL'));
  await assert.rejects(owner.client.save({ ...draft, id: document.id }, publishedVersion));
  const revisions = await owner.client.revisions(document.id);
  document = await owner.client.action(document, 'restore_revision', revisions.find((r) => r.version === 1)!.id);
  assert.equal(document.body, draft.body);
  assert.match(await html(`/posts/${draft.slug}/`), /Published version/);
  console.log('PASS saved drafts preserve public snapshots, optimistic conflict, revision restore');

  const settings = await owner.client.settings();
  await owner.client.saveSettings({ ...settings.value, title: 'CMS smoke setting', avatar: `/media/${media.id}` }, settings.version); settingsChanged = true;
  assert.match(await html('/'), /CMS smoke setting/);
  document = await owner.client.action(document, 'unpublish');
  await html(`/posts/${draft.slug}/`, 404);
  assert(!(await html('/search/')).includes(draft.slug));
  assert.equal((await fetch(site + `/media/${media.id}`)).status, 200, 'Site avatar independently keeps media public');
  const restoredSettings = await owner.client.settings();
  await owner.client.saveSettings(originalSettings.value, restoredSettings.version); settingsChanged = false;
  await html(`/media/${media.id}`, 404);
  await owner.client.deleteMedia(media); mediaIds.length = 0;
  const backup = JSON.parse((await owner.client.backup('json')).content);
  assert(backup.documents.some((row: { id: string }) => row.id === document.id));
  const imported = await owner.client.importContent(backup); assert.equal(imported.imported, 0); assert(imported.skipped > 0);
  document = await owner.client.action(document, 'trash');
  document = await owner.client.action(document, 'restore'); assert.equal(document.status, 'draft');
  console.log('PASS settings/avatar, unpublish isolation, media deletion, backup/import idempotency, trash/restore');
  console.log('CMS_LOCAL_HTTP_SMOKE_OK (local Auth fixtures; real external GitHub OAuth is not exercised)');
  if (process.argv.includes('--ui')) {
    // Test harness only. This localhost proxy is not part of the production app
    // and never accepts production accounts or keys. Stop removes the fixtures.
    const session = (await owner.db.auth.getSession()).data.session;
    const storageKey = `sb-${new URL(config.endpoint).hostname.split('.')[0]}-auth-token`;
    let stopUi: () => void = () => {};
    const uiFinished = new Promise<void>((resolve) => { stopUi = resolve; });
    uiProxy = createServer(async (request, response) => {
      if (request.url === '/__cms-test-login') {
        response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(`<script>localStorage.setItem(${JSON.stringify(storageKey)},${JSON.stringify(JSON.stringify(session)).replaceAll('<', '\\u003c')});location.replace('/admin/');</script>`);
      } else if (request.url === '/__cms-test-stop') {
        response.end('Local fixtures will be removed.'); stopUi();
      } else {
        try {
          const upstream = await fetch(site + request.url, { redirect: 'manual' });
          response.writeHead(upstream.status, Object.fromEntries([...upstream.headers].filter(([key]) => !['content-encoding', 'transfer-encoding', 'content-length'].includes(key))));
          response.end(Buffer.from(await upstream.arrayBuffer()));
        } catch { response.writeHead(503); response.end('Local test server unavailable'); }
      }
    });
    await new Promise<void>((resolve) => uiProxy!.listen(4329, '127.0.0.1', resolve));
    console.log('LOCAL_CMS_UI=http://127.0.0.1:4329/__cms-test-login');
    const timeout = setTimeout(stopUi, 15 * 60 * 1000);
    await uiFinished; clearTimeout(timeout);
  }
} finally {
  uiProxy?.closeAllConnections(); uiProxy?.close();
  processServer?.kill();
  // Only UUIDs created by this run are removed. Never reset the user's database.
  if (userIds.length) {
    const ownedDocs = await service.from('cms_documents').select('id').in('author_id', userIds);
    for (const row of ownedDocs.data ?? []) if (!documentIds.includes(row.id)) documentIds.push(row.id);
    const ownedMedia = await service.from('cms_media').select('id').in('owner_id', userIds);
    for (const row of ownedMedia.data ?? []) if (!mediaIds.includes(row.id)) mediaIds.push(row.id);
  }
  for (const id of documentIds) {
    await service.from('cms_public_routes').delete().eq('document_id', id);
    await service.from('cms_documents').delete().eq('id', id);
  }
  if (settingsChanged && originalSettings) await service.from('cms_settings').update(originalSettings).eq('id', true);
  for (const id of mediaIds) {
    await service.from('cms_settings_media').delete().eq('media_id', id);
    const row = (await service.from('cms_media').select('object_path').eq('id', id).single()).data;
    if (row) await service.storage.from('cms-media').remove([row.object_path]);
    await service.from('cms_media').delete().eq('id', id);
  }
  for (const id of userIds) {
    await service.from('cms_audit_log').delete().eq('actor_id', id);
    const removal = await service.auth.admin.deleteUser(id);
    if (removal.error) sql(`delete from auth.users where id='${id}' and email like 'cms-smoke-%-${suffix}@example.invalid';`);
  }
  for (const id of documentIds) await service.from('comment_targets').delete().eq('target_path', `/posts/cms-smoke-${suffix}/`);
}
