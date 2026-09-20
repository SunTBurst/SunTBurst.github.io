begin;

select plan(16);

select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cms_profiles'), 'profiles use RLS');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cms_documents'), 'documents use RLS');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cms_publications'), 'publications use RLS');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cms_revisions'), 'revisions use RLS');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cms_settings'), 'settings use RLS');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cms_media'), 'media use RLS');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cms_publication_media'), 'publication-media uses RLS');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cms_audit_log'), 'audit log uses RLS');

select ok(not has_table_privilege('anon', 'public.cms_documents', 'SELECT,INSERT,UPDATE,DELETE'), 'anonymous users cannot access working copies');
select ok(not has_table_privilege('authenticated', 'public.cms_documents', 'INSERT,UPDATE,DELETE'), 'authenticated users cannot directly write working copies');
select ok(has_column_privilege('anon', 'public.cms_settings', 'value', 'SELECT'), 'anonymous users can read the public settings value');
select ok(not has_column_privilege('anon', 'public.cms_settings', 'updated_by', 'SELECT'), 'anonymous users cannot read settings editor identity');
select ok(has_column_privilege('anon', 'public.cms_public_routes', 'is_published', 'SELECT'), 'anonymous users can read route tombstones');
select ok(not has_column_privilege('anon', 'public.cms_public_routes', 'document_id', 'SELECT'), 'anonymous users cannot read private route document IDs');

set local role anon;
select is(public.cms_public_media('00000000-0000-0000-0000-000000000001'), null::jsonb, 'anonymous media lookup reveals nothing without a publication link');
select is((select value from public.cms_settings where id), '{}'::jsonb, 'anonymous users can read the initialized public settings singleton');
reset role;

select * from finish();
rollback;
