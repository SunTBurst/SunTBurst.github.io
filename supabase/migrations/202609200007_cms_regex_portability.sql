create or replace function public.cms_validate_document_fields(p_document jsonb)
returns void language plpgsql immutable set search_path = public as $$
declare image_value text := coalesce(p_document ->> 'image',''); metadata_value jsonb := coalesce(p_document -> 'metadata','{}'::jsonb);
begin
  if coalesce(p_document ->> 'kind','') not in ('post','talk','knowledge','project')
     or char_length(coalesce(p_document ->> 'title','')) not between 1 and 240
     or char_length(coalesce(p_document ->> 'summary','')) > 1000
     or char_length(coalesce(p_document ->> 'body','')) > 200000
     or char_length(coalesce(p_document ->> 'category','')) > 120
     or char_length(image_value) > 500
     or jsonb_typeof(metadata_value) <> 'object'
     or metadata_value::text ~* 'javascript:'
     or (image_value <> '' and image_value !~ '^/media/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$' and image_value !~ '^/images/[^?#[:space:]]+$' and image_value !~ '^https?://[^[:space:]]+$')
     or (p_document ? 'tags' and (jsonb_typeof(p_document -> 'tags') <> 'array' or jsonb_array_length(p_document -> 'tags') > 30
       or exists(select 1 from jsonb_array_elements_text(p_document -> 'tags') tag where char_length(tag) not between 1 and 80))) then
    raise exception 'invalid_document_fields' using errcode='22023';
  end if;
end;
$$;

create or replace function public.cms_validate_settings(p_settings jsonb)
returns void language plpgsql immutable set search_path = public as $$
declare key text; value text;
begin
  foreach key in array array['title','subtitle','author','avatar','about','announcement','defaultPalette','defaultLayout'] loop
    if p_settings ? key then
      if jsonb_typeof(p_settings -> key) <> 'string' then raise exception 'invalid_settings' using errcode='22023'; end if;
      value := p_settings ->> key;
      if (key in ('title','subtitle','author','avatar','announcement') and char_length(value)>500)
         or (key='about' and char_length(value)>20000)
         or (key in ('defaultPalette','defaultLayout') and value !~ '^[A-Za-z0-9_-]{0,80}$')
         or (key='avatar' and value<>'' and value !~ '^/media/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$' and value !~ '^/images/[^?#[:space:]]+$' and value !~ '^https://[^[:space:]]+$') then
        raise exception 'invalid_settings' using errcode='22023';
      end if;
    end if;
  end loop;
end;
$$;
