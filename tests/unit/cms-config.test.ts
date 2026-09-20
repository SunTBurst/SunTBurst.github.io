import assert from 'node:assert/strict';
import test from 'node:test';
import { readCmsConnection } from '../../src/features/cms/config';

test('CMS config stays disabled without an explicit flag', () => {
  assert.equal(readCmsConnection({}), null);
  assert.equal(readCmsConnection({ CMS_ENABLED: 'false', PUBLIC_SUPABASE_URL: 'https://x.supabase.co', PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' }), null);
});

test('CMS config rejects missing and service-role credentials', () => {
  assert.throws(() => readCmsConnection({ CMS_ENABLED: 'true' }), /PUBLIC_SUPABASE_URL/);
  assert.throws(() => readCmsConnection({ CMS_ENABLED: 'true', PUBLIC_SUPABASE_URL: 'https://x.supabase.co', PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'service_role_secret' }), /publishable key|anon key/);
});

test('CMS config accepts local development and synthetic public credentials', () => {
  assert.deepEqual(readCmsConnection({ CMS_ENABLED: 'true', PUBLIC_SUPABASE_URL: 'http://localhost:54321/', PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }), { endpoint: 'http://localhost:54321', publishableKey: 'sb_publishable_test' });
  assert.deepEqual(readCmsConnection({ CMS_ENABLED: 'true', PUBLIC_SUPABASE_URL: 'https://project-ref.supabase.co/', PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }), { endpoint: 'https://project-ref.supabase.co', publishableKey: 'sb_publishable_test' });
});
