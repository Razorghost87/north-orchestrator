create table if not exists memory_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  source text not null,
  user_id text,
  trace_id text,
  content text not null
);

create index if not exists memory_entries_content_idx on memory_entries using gin (to_tsvector('english', content));

alter table memory_entries enable row level security;
create policy "Service role only" on memory_entries
  using (auth.role() = 'service_role');
