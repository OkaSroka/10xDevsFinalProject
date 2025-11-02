-- migration: create generations table storing per-user ai generation metadata
-- purpose: track ai model runs and enforce per-user isolation through rls
-- affects: table public.generations, index generations_user_id_idx, rls policies on public.generations
-- considerations: references auth.users, enforces source_text_length bounds, rls denies anon access

begin;

create table if not exists public.generations (
    id bigserial primary key,
    user_id uuid not null references auth.users (id),
    model varchar not null,
    generated_count integer not null,
    accepted_unedited_count integer,
    accepted_edited_count integer,
    source_text_hash varchar not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    generation_duration integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.generations is 'ai generation runs per user; protected via row level security';
comment on column public.generations.user_id is 'owner reference to auth.users.id';
comment on column public.generations.model is 'model identifier used for the generation run';
comment on column public.generations.generated_count is 'number of flashcards generated in this run';
comment on column public.generations.accepted_unedited_count is 'count of generated flashcards accepted without edits';
comment on column public.generations.accepted_edited_count is 'count of generated flashcards accepted after edits';
comment on column public.generations.source_text_hash is 'hash of the source text used to deduplicate requests';
comment on column public.generations.source_text_length is 'length of the source text validated to stay within allowed bounds';
comment on column public.generations.generation_duration is 'duration in milliseconds recorded for observability';
comment on column public.generations.created_at is 'timestamp when the generation run record was created';
comment on column public.generations.updated_at is 'timestamp refreshed by application logic upon updates';

create index if not exists generations_user_id_idx on public.generations (user_id);

alter table public.generations enable row level security;

create policy generations_select_auth on public.generations
    for select
    to authenticated
    using (auth.uid() = user_id);

comment on policy generations_select_auth on public.generations is 'allow authenticated users to read only their own generation runs';

create policy generations_select_anon on public.generations
    for select
    to anon
    using (false);

comment on policy generations_select_anon on public.generations is 'deny anonymous role from reading generation data';

create policy generations_insert_auth on public.generations
    for insert
    to authenticated
    with check (auth.uid() = user_id);

comment on policy generations_insert_auth on public.generations is 'ensure authenticated inserts are scoped to the caller''s user id';

create policy generations_insert_anon on public.generations
    for insert
    to anon
    with check (false);

comment on policy generations_insert_anon on public.generations is 'prevent anonymous inserts to protect data integrity';

create policy generations_update_auth on public.generations
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

comment on policy generations_update_auth on public.generations is 'allow authenticated users to update only their own generation records';

create policy generations_update_anon on public.generations
    for update
    to anon
    using (false)
    with check (false);

comment on policy generations_update_anon on public.generations is 'explicitly block anonymous updates';

create policy generations_delete_auth on public.generations
    for delete
    to authenticated
    using (auth.uid() = user_id);

comment on policy generations_delete_auth on public.generations is 'allow authenticated users to delete only their own generation records';

create policy generations_delete_anon on public.generations
    for delete
    to anon
    using (false);

comment on policy generations_delete_anon on public.generations is 'prevent anonymous role from deleting any generation data';

commit;
