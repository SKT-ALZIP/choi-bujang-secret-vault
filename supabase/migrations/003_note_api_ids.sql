alter table public.vault_notes
  add column if not exists api_id uuid
  default gen_random_uuid();

update public.vault_notes
set api_id = gen_random_uuid()
where api_id is null;

alter table public.vault_notes
  alter column api_id set not null;

create unique index if not exists vault_notes_api_id_key
  on public.vault_notes (api_id);

grant insert, update, delete
on table public.vault_notes
to service_role;

grant usage, select
on sequence public.vault_notes_id_seq
to service_role;