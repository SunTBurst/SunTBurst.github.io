begin;

select plan(11);

insert into auth.users (id,email) values ('91000000-0000-0000-0000-000000000001','cms-media-owner@example.invalid');
insert into auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
values ('105589585','91000000-0000-0000-0000-000000000001','{"sub":"105589585","user_name":"cms-media-owner"}'::jsonb,'github',now(),now(),now());
insert into storage.objects(bucket_id,name,owner_id,metadata)
values ('cms-media','91000000-0000-0000-0000-000000000001/91000000-0000-0000-0000-000000000011','91000000-0000-0000-0000-000000000001','{"size":1,"mimetype":"image/png"}'::jsonb),
       ('cms-media','91000000-0000-0000-0000-000000000001/91000000-0000-0000-0000-000000000012','91000000-0000-0000-0000-000000000001','{"size":1,"mimetype":"image/png"}'::jsonb);
insert into public.cms_media(id,owner_id,object_path,name,mime,size) values
 ('91000000-0000-0000-0000-000000000011','91000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001/91000000-0000-0000-0000-000000000011','settings.png','image/png',1),
 ('91000000-0000-0000-0000-000000000012','91000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001/91000000-0000-0000-0000-000000000012','reserved.png','image/png',1);

set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-0000-0000-000000000001';
select is((public.cms_bootstrap_profile()->>'role'),'owner','media fixture bootstraps owner');
with before as materialized (select version from public.cms_settings where id),
saved as (select public.cms_save_settings('{"avatar":"/media/91000000-0000-0000-0000-000000000011"}'::jsonb,(select version from before)) as row)
select is((select (row->>'version')::integer from saved), (select version+1 from before), 'settings save records its media reference');
select ok(public.cms_public_media('91000000-0000-0000-0000-000000000011') is not null,'settings media becomes publicly resolvable');
select throws_ok($$ select public.cms_prepare_media_delete('91000000-0000-0000-0000-000000000011') $$,'42501','media_is_published','settings media cannot be reserved for deletion');
select is((public.cms_prepare_media_delete('91000000-0000-0000-0000-000000000012')->>'id'),'91000000-0000-0000-0000-000000000012','unpublished media receives a delete reservation');
select throws_ok($$ select public.cms_save_settings('{"avatar":"/media/91000000-0000-0000-0000-000000000012"}'::jsonb, (select version from public.cms_settings where id)) $$,'42501','invalid_settings_media_reference','reserved media cannot become a settings reference');
select throws_ok(
  $$ select public.cms_document_action((public.cms_save_document('{"kind":"post","slug":"reserved-media","title":"Reserved media","body":"/media/91000000-0000-0000-0000-000000000012"}'::jsonb,null)->>'id')::uuid,'publish',1,null) $$,
  '42501','invalid_public_media_reference','reserved media cannot become a publication reference'
);
select throws_ok(
  $$ delete from storage.objects where bucket_id='cms-media' and name='91000000-0000-0000-0000-000000000001/91000000-0000-0000-0000-000000000012' $$,
  '42501','Direct deletion from storage tables is not allowed. Use the Storage API instead.',
  'raw SQL storage deletion is rejected; production deletion must use the Storage API'
);
select is((public.cms_prepare_media_delete('91000000-0000-0000-0000-000000000012')->>'id'),'91000000-0000-0000-0000-000000000012','repeated prepare returns the existing reservation');
select lives_ok($$ select public.cms_delete_media('91000000-0000-0000-0000-000000000099') $$,'finalize missing metadata is idempotent after an already-completed delete');
select lives_ok($$ select public.cms_delete_media('91000000-0000-0000-0000-000000000099') $$,'repeated missing-metadata finalization stays idempotent');

reset role;
select * from finish();
rollback;
