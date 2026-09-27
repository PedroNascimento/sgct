-- ============================================================
-- Migration 002: Campo de Agrupamento Familiar (T002.9 / Spec 002)
-- ============================================================

alter table public.reservations
  add column if not exists family_group_label text;

comment on column public.reservations.family_group_label is
  'Identificador/nome da família para apoio à atribuição presencial de quartos em Recife (D18). Informação não-bloqueante.';
