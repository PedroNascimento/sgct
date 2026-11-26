-- Migration: Spec 016 / D35
-- Adiciona documento alternativo opcional (tipo, número, órgão expedidor) em profiles
-- e quantidade de pessoas do grupo familiar (family_group_size) em reservations.

alter table public.profiles
  add column if not exists document_type text,
  add column if not exists document_number text,
  add column if not exists document_issuer text;

alter table public.reservations
  add column if not exists family_group_size int
    check (family_group_size is null or family_group_size >= 1);
