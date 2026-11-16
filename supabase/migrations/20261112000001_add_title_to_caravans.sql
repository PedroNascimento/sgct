-- Migration: Add optional title column to caravans (Spec 002 extension)
alter table public.caravans
  add column if not exists title text;

comment on column public.caravans.title is 'Título ou nome descritivo opcional da caravana (ex: Caravana de Jovens, Caravana Especial de Fim de Ano).';

