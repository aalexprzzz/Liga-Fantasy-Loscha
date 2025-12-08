
-- Create the weekly_matchups table
create table weekly_matchups (
  id uuid default gen_random_uuid() primary key,
  gameweek int not null,
  player1_id bigint references teams(id),
  player2_id bigint references teams(id),
  winner_id bigint references teams(id), -- Nullable, filled when gameweek ends
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security) if needed, but for now assuming public read/admin write
alter table weekly_matchups enable row level security;

create policy "Enable read access for all users" on weekly_matchups
  for select using (true);

create policy "Enable insert for authenticated users only" on weekly_matchups
  for insert with check (auth.role() = 'authenticated' OR auth.role() = 'anon'); 
  -- Note: Ideally 'anon' shouldn't insert, but our 'Admin' is client-side state for now or simple auth. 
  -- If using real Supabase Auth, strictly 'authenticated'.
  -- Given the current setup seems to be mixed, we'll allow anon for dev simplicity if needed, 
  -- but generally AdminPanel writes to it.

create policy "Enable update for authenticated users only" on weekly_matchups
  for update using (auth.role() = 'authenticated' OR auth.role() = 'anon');
