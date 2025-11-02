-- migration: disable all rls policies on flashcards, generations, and generation_error_logs
-- purpose: remove granular access control policies while keeping rls enabled on tables
-- affects: policies on public.flashcards, public.generations, public.generation_error_logs
-- considerations: destructive operation - drops all existing policies; rls remains enabled but no policies allow access

begin;

-- drop all policies on public.generations
drop policy if exists generations_select_auth on public.generations;
drop policy if exists generations_select_anon on public.generations;
drop policy if exists generations_insert_auth on public.generations;
drop policy if exists generations_insert_anon on public.generations;
drop policy if exists generations_update_auth on public.generations;
drop policy if exists generations_update_anon on public.generations;
drop policy if exists generations_delete_auth on public.generations;
drop policy if exists generations_delete_anon on public.generations;

-- drop all policies on public.flashcards
drop policy if exists flashcards_select_auth on public.flashcards;
drop policy if exists flashcards_select_anon on public.flashcards;
drop policy if exists flashcards_insert_auth on public.flashcards;
drop policy if exists flashcards_insert_anon on public.flashcards;
drop policy if exists flashcards_update_auth on public.flashcards;
drop policy if exists flashcards_update_anon on public.flashcards;
drop policy if exists flashcards_delete_auth on public.flashcards;
drop policy if exists flashcards_delete_anon on public.flashcards;

-- drop all policies on public.generation_error_logs
drop policy if exists generation_error_logs_select_auth on public.generation_error_logs;
drop policy if exists generation_error_logs_select_anon on public.generation_error_logs;
drop policy if exists generation_error_logs_insert_auth on public.generation_error_logs;
drop policy if exists generation_error_logs_insert_anon on public.generation_error_logs;
drop policy if exists generation_error_logs_update_auth on public.generation_error_logs;
drop policy if exists generation_error_logs_update_anon on public.generation_error_logs;
drop policy if exists generation_error_logs_delete_auth on public.generation_error_logs;
drop policy if exists generation_error_logs_delete_anon on public.generation_error_logs;

commit;
