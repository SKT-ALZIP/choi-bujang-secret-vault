begin;

alter table public.vault_notes
  enable row level security;

revoke all
on table public.vault_notes
from public, anon, authenticated;

revoke all
on sequence public.vault_notes_id_seq
from public, anon, authenticated;

commit;