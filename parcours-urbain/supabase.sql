-- Classement partagé gratuit (Supabase). A coller dans : Supabase > SQL Editor > Run.
-- 1) Remplacez MON_CODE_ADMIN par votre code secret (celui que vous taperez pour supprimer une ligne).
create table if not exists scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 24),
  gender text,
  time int not null check (time > 0),
  distance int,
  created_at timestamptz default now()
);
alter table scores enable row level security;
create policy "tout le monde lit"    on scores for select using (true);
create policy "tout le monde ajoute" on scores for insert with check (true);
-- pas de politique update/delete : seule la fonction ci-dessous peut supprimer.
create or replace function supprimer_score(p_id bigint, p_code text) returns void
language plpgsql security definer as $$
begin
  if p_code = 'MON_CODE_ADMIN' then delete from scores where id = p_id; end if;
end $$;
grant execute on function supprimer_score(bigint,text) to anon;
-- 2) Puis dans config.js :  classement: { supabaseUrl:"https://xxxx.supabase.co", supabaseCle:"clé anon public" }
