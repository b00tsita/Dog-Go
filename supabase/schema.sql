-- Dog Go! — esquema de base de datos para Supabase
-- Ejecutar esto en: Supabase Dashboard > SQL Editor > New query > pegar todo > Run

create table if not exists app_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Habilita Row Level Security
alter table app_state enable row level security;

-- Como esta es una app sin login de usuarios individuales (prototipo -> producción simple),
-- permitimos lectura y escritura pública a través de la anon key.
-- Esto es aceptable para un MVP interno, pero si más adelante quieres restringir
-- quién puede escribir (por ejemplo solo el admin), aquí es donde se ajustaría.
drop policy if exists "public read" on app_state;
create policy "public read" on app_state for select using (true);

drop policy if exists "public write" on app_state;
create policy "public write" on app_state for insert with check (true);

drop policy if exists "public update" on app_state;
create policy "public update" on app_state for update using (true);

-- Filas iniciales (una por cada "tabla" lógica de la app)
insert into app_state (key, value) values
  ('doggo-clients', '[]'),
  ('doggo-walkers', '[]'),
  ('doggo-packages', '[]'),
  ('doggo-walks', '[]'),
  ('doggo-notifications', '[]'),
  ('doggo-settings', '{"hourlyRate": 1500}')
on conflict (key) do nothing;
