
-- Fix permissions for Zona Mixta (press_messages)

-- 1. Ensure RLS is enabled
alter table press_messages enable row level security;

-- 2. Drop existing policies to avoid conflicts/duplicates
drop policy if exists "Enable read access for all users" on press_messages;
drop policy if exists "Enable insert for all users" on press_messages;

-- 3. Re-create policies explicitly for public/anon access

-- ALLOW READ (Select) for everyone (anon and authenticated)
create policy "Enable read access for all users" 
on press_messages for select 
using (true);

-- ALLOW INSERT for everyone (anon and authenticated)
create policy "Enable insert for all users" 
on press_messages for insert 
with check (true);

-- Optional: Allow delete for admin if needed, but for now stick to read/write.
