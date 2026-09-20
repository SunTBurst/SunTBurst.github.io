alter table public.cms_media add column deleting_at timestamptz;

create table public.cms_settings_media (
  media_id uuid primary key references public.cms_media(id) on delete restrict
);

alter table public.cms_settings_media enable row level security;
revoke all on table public.cms_settings_media from anon, authenticated;

create or replace function public.cms_media_object_is_public(p_object_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cms_media m
    where m.object_path = p_object_path and (
      exists (select 1 from public.cms_publication_media pm where pm.media_id=m.id)
      or exists (select 1 from public.cms_settings_media sm where sm.media_id=m.id)
    )
  );
$$;

create or replace function public.cms_public_media(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('object_path',m.object_path,'mime',m.mime,'name',m.name)
  from public.cms_media m
  where m.id=p_id and (
    exists (select 1 from public.cms_publication_media pm where pm.media_id=m.id)
    or exists (select 1 from public.cms_settings_media sm where sm.media_id=m.id)
  )
  limit 1;
$$;

create or replace function public.cms_sync_publication_media(p_publication_id uuid, p_body text, p_image text, p_actor public.cms_profiles)
returns void language plpgsql security definer set search_path = public, storage as $$
begin
  perform 1 from public.cms_media m
  where m.id in (
    select distinct (match)[1]::uuid from regexp_matches(coalesce(p_body,'') || E'\n' || coalesce(p_image,''),
      '/media/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})','g') as match
  ) order by m.id for update;
  if exists (
    with requested as (
      select distinct (match)[1]::uuid as id from regexp_matches(coalesce(p_body,'') || E'\n' || coalesce(p_image,''),
        '/media/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})','g') as match
    ) select 1 from requested r left join public.cms_media m on m.id=r.id
    where m.id is null or m.deleting_at is not null
      or (p_actor.role='editor' and m.owner_id<>p_actor.user_id)
      or not exists(select 1 from storage.objects o where o.bucket_id='cms-media' and o.name=m.object_path)
  ) then raise exception 'invalid_public_media_reference' using errcode='42501'; end if;
  delete from public.cms_publication_media where document_id=p_publication_id;
  insert into public.cms_publication_media(document_id,media_id)
  select p_publication_id,m.id from public.cms_media m
  where p_body like '%/media/' || m.id::text || '%' or p_image='/media/' || m.id::text;
end;
$$;

create or replace function public.cms_save_settings(p_settings jsonb, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare actor public.cms_profiles; saved public.cms_settings;
declare allowed_keys text[] := array['title','subtitle','author','avatar','about','announcement','defaultPalette','defaultLayout'];
begin
  actor := public.cms_require_role(array['owner','admin']);
  if p_settings is null or jsonb_typeof(p_settings)<>'object' or exists(select 1 from jsonb_object_keys(p_settings) key where not key=any(allowed_keys)) then raise exception 'invalid_settings' using errcode='22023'; end if;
  perform public.cms_validate_settings(p_settings);
  perform 1 from public.cms_media m where m.id in (
    select media_id from public.cms_settings_media
    union
    select distinct (match)[1]::uuid from regexp_matches(coalesce(p_settings->>'avatar','') || E'\n' || coalesce(p_settings->>'about',''),
      '/media/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})','g') as match
  ) order by m.id for update;
  if exists (
    with requested as (
      select distinct (match)[1]::uuid as id from regexp_matches(coalesce(p_settings->>'avatar','') || E'\n' || coalesce(p_settings->>'about',''),
        '/media/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})','g') as match
    ) select 1 from requested r left join public.cms_media m on m.id=r.id
    where m.id is null or m.deleting_at is not null
      or not exists(select 1 from storage.objects o where o.bucket_id='cms-media' and o.name=m.object_path)
  ) then raise exception 'invalid_settings_media_reference' using errcode='42501'; end if;
  insert into public.cms_settings(id,value,version,updated_by) values(true,p_settings,1,actor.user_id)
  on conflict(id) do update set value=excluded.value,version=public.cms_settings.version+1,updated_at=now(),updated_by=excluded.updated_by
    where public.cms_settings.version=p_expected_version
  returning * into saved;
  if not found then raise exception 'version_conflict' using errcode='P0001'; end if;
  delete from public.cms_settings_media;
  insert into public.cms_settings_media(media_id)
  select distinct (match)[1]::uuid from regexp_matches(coalesce(p_settings->>'avatar','') || E'\n' || coalesce(p_settings->>'about',''),
    '/media/([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})','g') as match;
  insert into public.cms_audit_log(actor_id,action,entity_type,detail) values(actor.user_id,'save','settings',jsonb_build_object('version',saved.version));
  return jsonb_build_object('id',saved.id,'value',saved.value,'version',saved.version,'updated_at',saved.updated_at);
end;
$$;

create or replace function public.cms_prepare_media_delete(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare actor public.cms_profiles; media_row public.cms_media;
begin
  actor := public.cms_require_role(array['owner','admin','editor']);
  select * into media_row from public.cms_media where id=p_id for update;
  if not found then raise exception 'media_not_found' using errcode='P0001'; end if;
  if actor.role='editor' and media_row.owner_id<>actor.user_id then raise exception 'forbidden' using errcode='42501'; end if;
  if public.cms_media_object_is_public(media_row.object_path) then raise exception 'media_is_published' using errcode='42501'; end if;
  if media_row.deleting_at is not null then raise exception 'media_delete_in_progress' using errcode='P0001'; end if;
  if not exists(select 1 from storage.objects where bucket_id='cms-media' and name=media_row.object_path) then raise exception 'media_object_missing' using errcode='P0001'; end if;
  update public.cms_media set deleting_at=now() where id=p_id;
  return jsonb_build_object('id',media_row.id,'object_path',media_row.object_path);
end;
$$;

create or replace function public.cms_cancel_media_delete(p_id uuid)
returns void language plpgsql security definer set search_path = public, storage as $$
declare actor public.cms_profiles; media_row public.cms_media;
begin
  actor := public.cms_require_role(array['owner','admin','editor']);
  select * into media_row from public.cms_media where id=p_id for update;
  if not found then raise exception 'media_not_found' using errcode='P0001'; end if;
  if actor.role='editor' and media_row.owner_id<>actor.user_id then raise exception 'forbidden' using errcode='42501'; end if;
  if media_row.deleting_at is null then raise exception 'media_not_reserved' using errcode='P0001'; end if;
  if not exists(select 1 from storage.objects where bucket_id='cms-media' and name=media_row.object_path) then raise exception 'media_object_missing' using errcode='P0001'; end if;
  update public.cms_media set deleting_at=null where id=p_id;
end;
$$;

create or replace function public.cms_delete_media(p_id uuid)
returns void language plpgsql security definer set search_path = public, storage as $$
declare actor public.cms_profiles; media_row public.cms_media;
begin
  actor := public.cms_require_role(array['owner','admin','editor']);
  select * into media_row from public.cms_media where id=p_id for update;
  if not found then raise exception 'media_not_found' using errcode='P0001'; end if;
  if actor.role='editor' and media_row.owner_id<>actor.user_id then raise exception 'forbidden' using errcode='42501'; end if;
  if media_row.deleting_at is null then raise exception 'media_not_reserved' using errcode='P0001'; end if;
  if public.cms_media_object_is_public(media_row.object_path) then raise exception 'media_is_published' using errcode='42501'; end if;
  if exists(select 1 from storage.objects where bucket_id='cms-media' and name=media_row.object_path) then raise exception 'media_object_still_exists' using errcode='P0001'; end if;
  delete from public.cms_media where id=p_id;
  insert into public.cms_audit_log(actor_id,action,entity_type,entity_id) values(actor.user_id,'delete','media',p_id);
end;
$$;

drop policy cms_media_storage_delete on storage.objects;
create policy cms_media_storage_delete on storage.objects for delete to authenticated using (
  bucket_id='cms-media' and not public.cms_media_object_is_public(name)
  and exists(select 1 from public.cms_media m where m.object_path=name and m.deleting_at is not null)
  and ((public.cms_is_active_role(array['editor']) and name like auth.uid()::text || '/%') or public.cms_is_active_role(array['owner','admin']))
);

revoke all on function public.cms_prepare_media_delete(uuid), public.cms_cancel_media_delete(uuid) from public, anon, authenticated;
grant execute on function public.cms_prepare_media_delete(uuid), public.cms_cancel_media_delete(uuid) to authenticated;
