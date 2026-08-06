-- Public legal documents and versioned acceptance ledger.
-- Apply to the linked production project before enabling the UI gate.

create table if not exists public.legal_documents (
  document_key text not null,
  version text not null,
  title text not null,
  public_path text not null,
  published_at timestamptz not null,
  retired_at timestamptz,
  primary key (document_key, version),
  check (document_key in ('terms_of_use_ai', 'fair_use_policy')),
  check (public_path like '/legal/%')
);

create unique index if not exists legal_documents_one_current_version
  on public.legal_documents (document_key)
  where retired_at is null;

insert into public.legal_documents (document_key, version, title, public_path, published_at)
values
  ('terms_of_use_ai', '1.0', 'Termos de Uso — Adendo de Uso Justo de IA', '/legal/terms', '2026-08-06T00:00:00Z'),
  ('fair_use_policy', '1.0', 'Política de Uso Justo de Recursos de IA', '/legal/fair-use', '2026-08-06T00:00:00Z')
on conflict (document_key, version) do update
  set title = excluded.title,
      public_path = excluded.public_path,
      published_at = excluded.published_at;

create table if not exists public.legal_document_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_key text not null,
  document_version text not null,
  locale text not null default 'und' check (char_length(locale) between 2 and 10),
  accepted_at timestamptz not null default now(),
  unique (user_id, document_key, document_version),
  foreign key (document_key, document_version)
    references public.legal_documents (document_key, version)
);

create index if not exists legal_document_acceptances_user_created_idx
  on public.legal_document_acceptances (user_id, accepted_at desc);

alter table public.legal_documents enable row level security;
alter table public.legal_document_acceptances enable row level security;

drop policy if exists "public read legal documents" on public.legal_documents;
create policy "public read legal documents" on public.legal_documents
  for select using (retired_at is null);

drop policy if exists "users read own legal acceptances" on public.legal_document_acceptances;
create policy "users read own legal acceptances" on public.legal_document_acceptances
  for select to authenticated using (user_id = auth.uid());

create or replace function public.accept_current_legal_documents(p_locale text default 'und')
returns table (document_key text, document_version text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_locale text := coalesce(nullif(left(trim(p_locale), 10), ''), 'und');
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  return query
  with current_documents as (
    select ld.document_key, ld.version
    from public.legal_documents ld
    where ld.retired_at is null
      and ld.document_key in ('terms_of_use_ai', 'fair_use_policy')
  ),
  accepted as (
    insert into public.legal_document_acceptances (
      user_id, document_key, document_version, locale
    )
    select v_user_id, document_key, version, v_locale
    from current_documents
    on conflict (user_id, document_key, document_version) do nothing
    returning legal_document_acceptances.document_key, legal_document_acceptances.document_version
  )
  select document_key, document_version from accepted;
end;
$$;

revoke all on function public.accept_current_legal_documents(text) from public;
grant execute on function public.accept_current_legal_documents(text) to authenticated;
