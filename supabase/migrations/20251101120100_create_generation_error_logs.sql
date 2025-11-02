-- migration: create generation_error_logs table capturing failed generation attempts
-- purpose: persist error details for observability while keeping records scoped per user via rls
-- affects: table public.generation_error_logs, index generation_error_logs_user_id_idx, rls policies
-- considerations: references auth.users, reuses source_text_length constraint, denies anonymous access entirely

begin;

create table if not exists public.generation_error_logs (
    id bigserial primary key,
    user_id uuid not null references auth.users (id),
    model varchar not null,
    source_text_hash varchar not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    error_code varchar(100) not null,
    error_message text not null,
    created_at timestamptz not null default now()
);

comment on table public.generation_error_logs is 'error telemetry for ai generation attempts, scoped to each user';
comment on column public.generation_error_logs.user_id is 'owner reference to auth.users.id';
comment on column public.generation_error_logs.model is 'model identifier involved in the failure';
comment on column public.generation_error_logs.source_text_hash is 'hash of input text to correlate failures';
comment on column public.generation_error_logs.source_text_length is 'validated length of the source text for guardrails';
comment on column public.generation_error_logs.error_code is 'short code categorising the failure';
comment on column public.generation_error_logs.error_message is 'detailed message captured from the failing pipeline';

create index if not exists generation_error_logs_user_id_idx on public.generation_error_logs (user_id);

alter table public.generation_error_logs enable row level security;

create policy generation_error_logs_select_auth on public.generation_error_logs
    for select
    to authenticated
    using (auth.uid() = user_id);

comment on policy generation_error_logs_select_auth on public.generation_error_logs is 'allow authenticated users to read only their own error telemetry';

create policy generation_error_logs_select_anon on public.generation_error_logs
    for select
    to anon
    using (false);

comment on policy generation_error_logs_select_anon on public.generation_error_logs is 'deny anonymous role from accessing error telemetry';

create policy generation_error_logs_insert_auth on public.generation_error_logs
    for insert
    to authenticated
    with check (auth.uid() = user_id);

comment on policy generation_error_logs_insert_auth on public.generation_error_logs is 'ensure inserts are scoped to the caller''s user id';

create policy generation_error_logs_insert_anon on public.generation_error_logs
    for insert
    to anon
    with check (false);

comment on policy generation_error_logs_insert_anon on public.generation_error_logs is 'prevent anonymous insertions of error logs';

create policy generation_error_logs_update_auth on public.generation_error_logs
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

comment on policy generation_error_logs_update_auth on public.generation_error_logs is 'allow authenticated updates only on self-owned records';

create policy generation_error_logs_update_anon on public.generation_error_logs
    for update
    to anon
    using (false)
    with check (false);

comment on policy generation_error_logs_update_anon on public.generation_error_logs is 'explicitly disallow anonymous updates';

create policy generation_error_logs_delete_auth on public.generation_error_logs
    for delete
    to authenticated
    using (auth.uid() = user_id);

comment on policy generation_error_logs_delete_auth on public.generation_error_logs is 'allow authenticated users to prune their own error records';

create policy generation_error_logs_delete_anon on public.generation_error_logs
    for delete
    to anon
    using (false);

comment on policy generation_error_logs_delete_anon on public.generation_error_logs is 'block anonymous deletion of error logs';

commit;
