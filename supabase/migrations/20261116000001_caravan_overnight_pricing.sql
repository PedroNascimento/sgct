-- Migration: Precificação por tipo de caravana (com/sem pernoite) — Spec 002 extension / D33
--
-- Regras:
--   * SEM pernoite: valor = passagem (alojamento = 0).
--   * COM pernoite: valor = passagem + alojamento.
--   * Oficiante: 50% de desconto SOMENTE no alojamento; passagem integral.
--
-- price_standard e price_officiant continuam existindo como valores FINAIS derivados
-- (mantidos por trigger), de modo que o trigger de reservas, relatórios e telas
-- que já leem esses campos continuam corretos sem alteração.

alter table public.caravans
  add column if not exists overnight boolean not null default true,
  add column if not exists price_ticket numeric(10,2),
  add column if not exists price_lodging numeric(10,2) not null default 0;

-- Backfill: caravanas existentes eram "com pernoite" com alojamento de R$ 26,00.
update public.caravans
set price_lodging = case when price_standard >= 26 then 26 else 0 end,
    price_ticket  = case when price_standard >= 26 then price_standard - 26 else price_standard end,
    overnight     = (price_standard >= 26)
where price_ticket is null;

alter table public.caravans
  alter column price_ticket set not null;

alter table public.caravans
  drop constraint if exists caravans_pricing_non_negative;
alter table public.caravans
  add constraint caravans_pricing_non_negative
  check (price_ticket >= 0 and price_lodging >= 0);

alter table public.caravans
  drop constraint if exists caravans_no_lodging_without_overnight;
alter table public.caravans
  add constraint caravans_no_lodging_without_overnight
  check (overnight or price_lodging = 0);

comment on column public.caravans.overnight is 'TRUE = caravana com pernoite (inclui alojamento); FALSE = sem pernoite.';
comment on column public.caravans.price_ticket is 'Valor da passagem/ônibus (R$). Igual para padrão e oficiante.';
comment on column public.caravans.price_lodging is 'Valor do alojamento (R$). Sempre 0 em caravana sem pernoite.';
comment on column public.caravans.price_standard is 'Valor final categoria padrão = price_ticket + price_lodging. Derivado por trigger.';
comment on column public.caravans.price_officiant is 'Valor final oficiante = price_ticket + 50% de price_lodging. Derivado por trigger.';

create or replace function public.compute_caravan_prices()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Compatibilidade: inserts legados que informam só price_standard/price_officiant.
  if new.price_ticket is null then
    new.price_lodging := coalesce(new.price_lodging, 0);
    new.price_ticket := greatest(0, new.price_standard - new.price_lodging);
    return new;
  end if;

  if not new.overnight then
    new.price_lodging := 0;
  end if;

  new.price_standard := new.price_ticket + new.price_lodging;
  new.price_officiant := new.price_ticket + round(new.price_lodging * 0.5, 2);
  return new;
end;
$$;

drop trigger if exists trg_caravans_compute_prices on public.caravans;
create trigger trg_caravans_compute_prices
  before insert or update on public.caravans
  for each row execute function public.compute_caravan_prices();
