-- Adiciona coluna is_active na tabela wards
alter table public.wards add column if not exists is_active boolean not null default true;

-- Atualiza get_public_wards para retornar apenas alas ativas
create or replace function public.get_public_wards(target_stake_slug text)
returns table (id uuid, name text)
language sql stable security definer
set search_path = ''
as $$
  select w.id, w.name
  from public.wards w
  join public.stakes s on s.id = w.stake_id
  where s.slug = target_stake_slug
    and s.is_active = true
    and w.is_active = true
  order by w.name;
$$;
