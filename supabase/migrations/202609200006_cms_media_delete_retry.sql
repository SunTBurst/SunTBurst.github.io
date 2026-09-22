drop policy cms_media_storage_delete on storage.objects;
create policy cms_media_storage_delete on storage.objects for delete to authenticated using (
  bucket_id='cms-media' and not public.cms_media_object_is_public(storage.objects.name)
  and exists(
    select 1 from public.cms_media m
    where m.object_path=storage.objects.name and m.deleting_at is not null
  )
  and ((public.cms_is_active_role(array['editor']) and storage.objects.name like auth.uid()::text || '/%')
    or public.cms_is_active_role(array['owner','admin']))
);

create or replace function public.cms_prepare_media_delete(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare actor public.cms_profiles; media_row public.cms_media;
begin
  actor := public.cms_require_role(array['owner','admin','editor']);
  select * into media_row from public.cms_media where id=p_id for update;
  if not found then return null; end if;
  if actor.role='editor' and media_row.owner_id<>actor.user_id then raise exception 'forbidden' using errcode='42501'; end if;
  if public.cms_media_object_is_public(media_row.object_path) then raise exception 'media_is_published' using errcode='42501'; end if;
  if media_row.deleting_at is not null then
    return jsonb_build_object('id',media_row.id,'object_path',media_row.object_path);
  end if;
  if not exists(select 1 from storage.objects where bucket_id='cms-media' and name=media_row.object_path) then
    raise exception 'media_object_missing' using errcode='P0001';
  end if;
  update public.cms_media set deleting_at=now() where id=p_id;
  return jsonb_build_object('id',media_row.id,'object_path',media_row.object_path);
end;
$$;

create or replace function public.cms_delete_media(p_id uuid)
returns void language plpgsql security definer set search_path = public, storage as $$
declare actor public.cms_profiles; media_row public.cms_media;
begin
  actor := public.cms_require_role(array['owner','admin','editor']);
  select * into media_row from public.cms_media where id=p_id for update;
  if not found then return; end if;
  if actor.role='editor' and media_row.owner_id<>actor.user_id then raise exception 'forbidden' using errcode='42501'; end if;
  if media_row.deleting_at is null then raise exception 'media_not_reserved' using errcode='P0001'; end if;
  if public.cms_media_object_is_public(media_row.object_path) then raise exception 'media_is_published' using errcode='42501'; end if;
  if exists(select 1 from storage.objects where bucket_id='cms-media' and name=media_row.object_path) then raise exception 'media_object_still_exists' using errcode='P0001'; end if;
  delete from public.cms_media where id=p_id;
  insert into public.cms_audit_log(actor_id,action,entity_type,entity_id) values(actor.user_id,'delete','media',p_id);
end;
$$;
