-- api_keys: one row per user, maps a hashed API key to a Futurykon user.
-- Used by the MCP Edge Function to authenticate tool calls.

create table if not exists api_keys (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  key_hash    text        not null,
  created_at  timestamptz not null default now(),
  unique (user_id)
);

alter table api_keys enable row level security;

-- Users can read their own key metadata (never the hash itself — that's server-only)
create policy "Users can view own api key"
  on api_keys for select
  using (auth.uid() = user_id);

-- Users can insert their own key
create policy "Users can insert own api key"
  on api_keys for insert
  with check (auth.uid() = user_id);

-- Users can update (cycle) their own key
create policy "Users can update own api key"
  on api_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own key
create policy "Users can delete own api key"
  on api_keys for delete
  using (auth.uid() = user_id);
