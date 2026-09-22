create or replace function public.cms_register_media(p_id uuid, p_name text, p_mime text, p_size bigint)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare actor public.cms_profiles; object_row storage.objects; saved public.cms_media; expected_path text;
begin
  actor := public.cms_require_role(array['owner','admin','editor']);
  if p_id is null or p_name is null or char_length(p_name) not between 1 and 240
     or p_mime not in ('image/png','image/jpeg','image/webp','image/gif') or p_size not between 1 and 10485760 then
    raise exception 'invalid_media' using errcode='22023';
  end if;
  expected_path := actor.user_id::text || '/' || p_id::text;
  select * into object_row from storage.objects where bucket_id='cms-media' and name=expected_path;
  if not found then raise exception 'media_object_missing' using errcode='P0001'; end if;
  if coalesce(object_row.metadata ->> 'mimetype','') <> p_mime
     or coalesce((object_row.metadata ->> 'size')::bigint,-1) <> p_size then
    raise exception 'media_metadata_mismatch' using errcode='22023';
  end if;
  insert into public.cms_media(id,owner_id,object_path,name,mime,size)
  values(p_id,actor.user_id,expected_path,p_name,p_mime,p_size)
  returning * into saved;
  insert into public.cms_audit_log(actor_id,action,entity_type,entity_id) values(actor.user_id,'register','media',saved.id);
  return jsonb_build_object('id',saved.id,'owner_id',saved.owner_id,'object_path',saved.object_path,'name',saved.name,
    'mime',saved.mime,'size',saved.size,'created_at',saved.created_at);
end;
$$;

revoke all on function public.cms_register_media(uuid,text,text,bigint) from public, anon, authenticated;
grant execute on function public.cms_register_media(uuid,text,text,bigint) to authenticated;
