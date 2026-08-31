begin;

select plan(6);

insert into auth.users (id, email)
values
  ('20000000-0000-0000-0000-000000000001', 'comment-rls-1@example.invalid'),
  ('20000000-0000-0000-0000-000000000002', 'comment-rls-2@example.invalid');

insert into public.comments (
  id, target_kind, target_path, author_id, author_github_id,
  author_login_snapshot, body, status, policy_version, idempotency_key, published_at
)
values
  (
    '30000000-0000-0000-0000-000000000001', 'post', '/posts/database-test/',
    '20000000-0000-0000-0000-000000000001', 200000001,
    'comment-rls-1', 'published body', 'published', 'comments-v1', 'rls-test-published-0001', now()
  ),
  (
    '30000000-0000-0000-0000-000000000002', 'post', '/posts/database-test/',
    '20000000-0000-0000-0000-000000000001', 200000001,
    'comment-rls-1', 'owner one pending', 'manual_review', 'comments-v1', 'rls-test-pending-000001', null
  ),
  (
    '30000000-0000-0000-0000-000000000003', 'post', '/posts/database-test/',
    '20000000-0000-0000-0000-000000000002', 200000002,
    'comment-rls-2', 'owner two pending', 'manual_review', 'comments-v1', 'rls-test-pending-000002', null
  );

set local role anon;

select results_eq(
  $$ select body from public.comments order by body $$,
  $$ values ('published body'::text) $$,
  'anonymous visitors see only published comments'
);

select ok(
  not has_column_privilege(current_user, 'public.comments', 'author_id', 'SELECT'),
  'anonymous visitors cannot select the private author UUID'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000001';

select is(
  (select count(*)::integer from public.comments),
  2,
  'an authenticated author sees published comments and their own pending comment'
);

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000002';

select is(
  (select count(*)::integer from public.comments),
  2,
  'a second author cannot see the first author pending comment'
);

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000099';

select is(
  (select count(*)::integer from public.comments),
  1,
  'an unrelated authenticated visitor sees only published comments'
);

select ok(
  not has_table_privilege(current_user, 'public.comments', 'INSERT,UPDATE,DELETE'),
  'authenticated sessions cannot bypass Edge Functions to mutate comments'
);

reset role;
select * from finish();
rollback;
