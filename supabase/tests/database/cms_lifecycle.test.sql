begin;

select plan(12);

select has_table('public', 'cms_profiles', 'CMS profiles exist');
select has_table('public', 'cms_documents', 'CMS working documents exist');
select has_table('public', 'cms_publications', 'CMS public snapshots exist');
select has_table('public', 'cms_revisions', 'CMS revisions exist');
select has_table('public', 'cms_public_routes', 'CMS route tombstones exist');
select has_table('public', 'cms_media', 'CMS media metadata exists');
select has_table('public', 'cms_publication_media', 'CMS publication media links exist');
select has_table('public', 'cms_settings', 'CMS settings exist');
select has_table('public', 'cms_audit_log', 'CMS audit log exists');

select has_function('public', 'cms_bootstrap_profile', array[]::text[], 'GitHub profile bootstrap RPC exists');
select has_function('public', 'cms_save_document', array['jsonb', 'integer'], 'Document save RPC exists');
select has_function('public', 'cms_public_media', array['uuid'], 'Public media lookup RPC exists');

select * from finish();
rollback;
