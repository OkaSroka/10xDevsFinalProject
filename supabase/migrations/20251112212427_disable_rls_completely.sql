-- Disable RLS completely on all tables for development
-- This allows unrestricted access to tables

BEGIN;

-- Disable RLS on all tables
ALTER TABLE public.generations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_error_logs DISABLE ROW LEVEL SECURITY;

COMMIT;
