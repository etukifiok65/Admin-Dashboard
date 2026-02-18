-- =====================================================
-- Remove FK Constraint on created_by
-- Migration: 20260218002300_remove_broadcast_notifications_fk.sql
-- Purpose: Remove strict FK requirement on created_by (use auth.uid instead)
-- =====================================================

-- Drop the foreign key constraint
ALTER TABLE public.broadcast_notifications 
DROP CONSTRAINT IF EXISTS broadcast_notifications_created_by_fkey;

-- Make created_by nullable so RPC function can set it to auth.uid() safely
ALTER TABLE public.broadcast_notifications 
ALTER COLUMN created_by DROP NOT NULL,
ALTER COLUMN created_by SET DEFAULT auth.uid();

