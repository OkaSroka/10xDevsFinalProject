-- migration: create flashcards table with ownership isolation and stale timestamp guard
-- purpose: store ai and manual flashcards while automatically maintaining updated_at and rls boundaries
-- affects: table public.flashcards, indexes, trigger function, rls policies on public.flashcards
-- considerations: references auth.users and public.generations, enforces enumerated source values, manages trigger safely

begin;

create table if not exists public.flashcards (
    id bigserial primary key,
    front varchar(200) not null,
    back varchar(500) not null,
    source varchar not null check (source in ('ai-full', 'ai-edited', 'manual')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    generation_id bigint references public.generations (id) on delete set null,
    user_id uuid not null references auth.users (id)
);

comment on table public.flashcards is 'user-owned flashcards sourced from ai or manual input';
comment on column public.flashcards.front is 'prompt or question side of the flashcard';
comment on column public.flashcards.back is 'answer side of the flashcard';
comment on column public.flashcards.source is 'origin of the flashcard content with a controlled vocabulary';
comment on column public.flashcards.generation_id is 'optional link back to the generation that produced the flashcard';
comment on column public.flashcards.user_id is 'supabase auth user who owns the flashcard';

create index if not exists flashcards_user_id_idx on public.flashcards (user_id);
create index if not exists flashcards_generation_id_idx on public.flashcards (generation_id);

create or replace function public.flashcards_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    -- maintain audit trail by keeping updated_at in sync with modifications
    new.updated_at := now();
    return new;
end;
$$;

comment on function public.flashcards_set_updated_at() is 'ensures flashcards.updated_at reflects the latest update moment';

-- drop and recreate to guarantee consistent trigger definition during re-runs
drop trigger if exists flashcards_set_updated_at on public.flashcards;

create trigger flashcards_set_updated_at
    before update on public.flashcards
    for each row
    execute procedure public.flashcards_set_updated_at();

comment on trigger flashcards_set_updated_at on public.flashcards is 'refresh updated_at whenever a flashcard changes';

alter table public.flashcards enable row level security;

create policy flashcards_select_auth on public.flashcards
    for select
    to authenticated
    using (auth.uid() = user_id);

comment on policy flashcards_select_auth on public.flashcards is 'allow authenticated users to read only their own flashcards';

create policy flashcards_select_anon on public.flashcards
    for select
    to anon
    using (false);

comment on policy flashcards_select_anon on public.flashcards is 'prevent anonymous reads of flashcard content';

create policy flashcards_insert_auth on public.flashcards
    for insert
    to authenticated
    with check (auth.uid() = user_id);

comment on policy flashcards_insert_auth on public.flashcards is 'ensure inserts are scoped to the caller''s user id';

create policy flashcards_insert_anon on public.flashcards
    for insert
    to anon
    with check (false);

comment on policy flashcards_insert_anon on public.flashcards is 'block anonymous creation of flashcards';

create policy flashcards_update_auth on public.flashcards
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

comment on policy flashcards_update_auth on public.flashcards is 'allow authenticated users to update only their own flashcards';

create policy flashcards_update_anon on public.flashcards
    for update
    to anon
    using (false)
    with check (false);

comment on policy flashcards_update_anon on public.flashcards is 'explicitly deny anonymous updates';

create policy flashcards_delete_auth on public.flashcards
    for delete
    to authenticated
    using (auth.uid() = user_id);

comment on policy flashcards_delete_auth on public.flashcards is 'allow authenticated users to delete only their own flashcards';

create policy flashcards_delete_anon on public.flashcards
    for delete
    to anon
    using (false);

comment on policy flashcards_delete_anon on public.flashcards is 'prevent anonymous deletion of flashcards';

commit;
