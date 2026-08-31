begin;

select plan(11);

insert into auth.users (id, email)
values ('10000000-0000-0000-0000-000000000001', 'comment-test-1@example.invalid');

insert into public.comment_targets (target_kind, target_path, title, summary)
values ('post', '/posts/database-test/', 'Database test', 'Local pgTAP fixture');

select results_eq(
  $$
    select status, reused
    from public.create_pending_comment(
      'post', '/posts/database-test/', null,
      '10000000-0000-0000-0000-000000000001', 100000001, 'comment-test-1',
      'A useful first comment.', 'comments-v1', 'database-test-key-0001'
    )
  $$,
  $$ values ('pending'::text, false) $$,
  'a registered target accepts one pending comment'
);

select results_eq(
  $$
    select status, reused
    from public.create_pending_comment(
      'post', '/posts/database-test/', null,
      '10000000-0000-0000-0000-000000000001', 100000001, 'comment-test-1',
      'A useful first comment.', 'comments-v1', 'database-test-key-0001'
    )
  $$,
  $$ values ('pending'::text, true) $$,
  'the same idempotency key reuses the existing comment'
);

select is(
  (select count(*)::integer from public.comments where idempotency_key = 'database-test-key-0001'),
  1,
  'idempotent retry does not create a duplicate row'
);

select throws_ok(
  $$
    select *
    from public.create_pending_comment(
      'post', '/posts/not-registered/', null,
      '10000000-0000-0000-0000-000000000001', 100000001, 'comment-test-1',
      'This target is missing.', 'comments-v1', 'database-test-key-0002'
    )
  $$,
  'P0001',
  'public_comment_target_missing',
  'an unregistered public route cannot receive a comment'
);

update public.comments
set status = 'ai_reviewing'
where idempotency_key = 'database-test-key-0001';

select results_eq(
  $$
    select status
    from public.finalize_comment_review(
      (select id from public.comments where idempotency_key = 'database-test-key-0001'),
      'openai', 'review-model', 'approve', array['safe'], 'comments-v1', null, 20, 'success'
    )
  $$,
  $$ values ('published'::text) $$,
  'a successful safe review publishes the reviewing comment'
);

select is(
  (
    select count(*)::integer
    from public.comment_reviews r
    join public.comments c on c.id = r.comment_id
    where c.idempotency_key = 'database-test-key-0001'
  ),
  1,
  'finalization writes one durable review record'
);

select ok(
  (select published_at is not null from public.comments where idempotency_key = 'database-test-key-0001'),
  'published comments receive a publication timestamp'
);

select results_eq(
  $$
    select status, reused
    from public.create_pending_comment(
      'post', '/posts/database-test/',
      (select id from public.comments where idempotency_key = 'database-test-key-0001'),
      '10000000-0000-0000-0000-000000000001', 100000001, 'comment-test-1',
      'A direct reply.', 'comments-v1', 'database-test-key-0003'
    )
  $$,
  $$ values ('pending'::text, false) $$,
  'a published root comment accepts one direct reply'
);

select throws_ok(
  $$
    select *
    from public.create_pending_comment(
      'post', '/posts/database-test/',
      (select id from public.comments where idempotency_key = 'database-test-key-0003'),
      '10000000-0000-0000-0000-000000000001', 100000001, 'comment-test-1',
      'A nested reply.', 'comments-v1', 'database-test-key-0004'
    )
  $$,
  '23514',
  'invalid comment parent',
  'nested or unpublished replies are rejected by the parent trigger'
);

select results_eq(
  $$
    select status
    from public.delete_own_comment_atomically(
      (select id from public.comments where idempotency_key = 'database-test-key-0003'),
      '10000000-0000-0000-0000-000000000001'
    )
  $$,
  $$ values ('deleted'::text) $$,
  'an author can delete their own comment through the server operation'
);

select ok(
  (
    select status = 'deleted' and body is null
    from public.comments
    where idempotency_key = 'database-test-key-0003'
  ),
  'author deletion clears the body and leaves an auditable tombstone'
);

select * from finish();
rollback;
