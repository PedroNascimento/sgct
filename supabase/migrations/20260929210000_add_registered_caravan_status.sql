-- ============================================================
-- Migration: Add 'registered' (Cadastrada) status to caravans
-- ============================================================

ALTER TABLE caravans DROP CONSTRAINT IF EXISTS caravans_status_check;

ALTER TABLE caravans ADD CONSTRAINT caravans_status_check
  CHECK (status IN ('registered', 'draft', 'open', 'quorum_pending', 'confirmed', 'cancelled', 'completed'));
