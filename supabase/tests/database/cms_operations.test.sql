begin;

select plan(23);

insert into auth.users (id, email) values
  ('90000000-0000-0000-0000-000000000001', 'cms-owner@example.invalid'),
  ('90000000-0000-0000-0000-000000000002', 'cms-editor@example.invalid'),
  ('90000000-0000-0000-0000-000000000003', 'cms-member@example.invalid');

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('900000001', '90000000-0000-0000-0000-000000000001', '{"sub":"900000001","user_name":"cms-owner","name":"CMS Owner"}'::jsonb, 'github', now(), now(), now()),
  ('200000002', '90000000-0000-0000-0000-000000000002', '{"sub":"200000002","user_name":"cms-editor","name":"CMS Editor"}'::jsonb, 'github', now(), now(), now()),
  ('200000003', '90000000-0000-0000-0000-000000000003', '{"sub":"200000003","user_name":"cms-member","name":"CMS Member"}'::jsonb, 'github', now(), now(), now());

insert into public.cms_profiles (user_id,github_id,login,display_name,role)
values ('90000000-0000-0000-0000-000000000001','900000001','cms-owner','CMS Owner','owner');

set local role authenticated;
set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000001';

select is((public.cms_bootstrap_profile() ->> 'role'), 'owner', 'a seeded owner profile remains bound to its GitHub identity');

set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000002';
select is((public.cms_bootstrap_profile() ->> 'role'), 'member', 'other GitHub identities bootstrap as members');

set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000003';
select is((public.cms_bootstrap_profile() ->> 'role'), 'member', 'a third GitHub identity also starts as member');
select throws_ok(
  $$ select public.cms_save_document('{"kind":"post","slug":"forbidden-member","title":"No write"}'::jsonb, null) $$,
  '42501', 'forbidden', 'a member cannot create documents'
);
select throws_ok(
  $$ select public.cms_register_media('00000000-0000-0000-0000-000000000003', 'nope.png', 'image/png', 1) $$,
  '42501', 'forbidden', 'a member cannot register media metadata'
);

set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000001';
select is((public.cms_set_member_role('90000000-0000-0000-0000-000000000002', 'editor', true) ->> 'role'), 'editor', 'owner can grant editor role');
with before as materialized (select version from public.cms_settings where id),
saved as (select public.cms_save_settings('{"title":"CMS","subtitle":"A practical site","author":"SunTBurst","avatar":"/images/avatar.svg","about":"Standard site settings body","announcement":"Welcome","defaultPalette":"paper","defaultLayout":"classic"}'::jsonb,(select version from before)) as row)
select is((select (row->>'version')::integer from saved), (select version+1 from before), 'owner can save settings with optimistic version');
select throws_ok(
  $$ select public.cms_save_settings('{"title":"stale"}'::jsonb, (select version - 1 from public.cms_settings where id)) $$,
  'P0001', 'version_conflict', 'stale settings writes are rejected'
);

set local request.jwt.claim.sub = '90000000-0000-0000-0000-000000000002';
select throws_ok(
  $$ select public.cms_save_settings('{"title":"editor cannot set site"}'::jsonb, (select version from public.cms_settings where id)) $$,
  '42501', 'forbidden', 'an editor cannot save site settings'
);
select throws_ok(
  $$ select public.cms_set_member_role('90000000-0000-0000-0000-000000000003', 'editor', true) $$,
  '42501', 'forbidden', 'an editor cannot grant member roles'
);
select is(
  public.cms_save_document('{"kind":"post","slug":"external-image","title":"External image","image":"https://example.invalid/cover.png"}'::jsonb, null) ->> 'image',
  'https://example.invalid/cover.png',
  'an HTTPS document image passes portable validation'
);
select is(
  (public.cms_save_document('{"kind":"post","slug":"database-cms","title":"First","body":"private draft","image":"/images/cover.svg"}'::jsonb, null) ->> 'version')::integer,
  1,
  'editor saves a first private working copy'
);

select is((select count(*)::integer from public.cms_publications where slug='database-cms'), 0, 'saving a draft does not create a public snapshot');

select is(
  (public.cms_document_action((select id from public.cms_documents where slug='database-cms'), 'publish', 1, null) ->> 'status'),
  'published',
  'publishing creates the public state'
);

select is((select body from public.cms_publications where slug='database-cms'), 'private draft', 'publication uses a snapshot of the saved body');
select ok((select is_published from public.cms_public_routes where slug='database-cms'), 'first publication creates a public route');

select is(
  (public.cms_save_document((select to_jsonb(d) - 'version' - 'author_id' - 'created_at' - 'updated_at' from public.cms_documents d where slug='database-cms') || '{"body":"next private draft"}'::jsonb, 2) ->> 'status'),
  'published',
  'editing a published document preserves the live-state marker while keeping the old public snapshot'
);

select is((select body from public.cms_publications where slug='database-cms'), 'private draft', 'new draft text cannot overwrite the public snapshot');

select throws_ok(
  $$ select public.cms_save_document((select to_jsonb(d) - 'version' - 'author_id' - 'created_at' - 'updated_at' from public.cms_documents d where slug='database-cms'), 2) $$,
  'P0001', 'version_conflict', 'stale document saves are rejected'
);

select is(
  (public.cms_document_action((select id from public.cms_documents where slug='database-cms'), 'unpublish', 3, null) ->> 'status'),
  'draft',
  'unpublish returns the working state to draft'
);

select is((select count(*)::integer from public.cms_publications where slug='database-cms'), 0, 'unpublish removes the anonymous snapshot');
select ok(not (select is_published from public.cms_public_routes where slug='database-cms'), 'unpublish leaves a route tombstone');

reset role;
set local role anon;
select is((select count(*)::integer from public.cms_public_routes where slug='database-cms'), 1, 'anonymous route reads retain an unpublished tombstone');

reset role;
select * from finish();
rollback;
