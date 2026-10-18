-- Run only as an administrator in the Supabase SQL Editor.
-- Create the email/password user in Authentication > Users first.
-- Replace the placeholder email; no password belongs in this file.
do $$
declare
  teacher_email text := 'admin@gmail.com';
  changed integer;
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'teacher')
  where lower(email) = lower(teacher_email);
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'Expected one existing teacher account, found %', changed;
  end if;
end $$;

-- Verify the assigned role without returning credentials.
select id, email, raw_app_meta_data->>'role' as role
from auth.users
where lower(email) = 'admin@gmail.com';
