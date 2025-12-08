
-- Create the press_messages table
create table if not exists press_messages (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  avatar_seed int not null, -- Stores the index/seed for the emoji avatar
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table press_messages enable row level security;

-- Policies
-- Anyone can read
create policy "Enable read access for all users" on press_messages
  for select using (true);

-- Anyone can insert (since it's anonymous)
-- Warning: In a real production app, you might want some rate limiting or auth check.
-- For "Anónima", we allow public inserts or check for anon role if using Supabase Auth.
-- Assuming 'anon' role is used for unauthenticated visitors.
create policy "Enable insert for all users" on press_messages
  for insert with check (true);
