-- Webhook dedupe for GitHub events
create table if not exists webhook_dedupe (
  id text primary key,
  created_at timestamptz default now()
);

-- RLS policies
alter table webhook_dedupe enable row level security;
create policy "Service role only" on webhook_dedupe
  using (auth.role() = 'service_role');
