-- Dog Go! -- esquema con LOGIN REAL + MULTIPLES MASCOTAS POR DUENO
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > pegar todo > Run
-- Reemplaza cualquier esquema anterior (clients de 1 mascota por cuenta).

drop table if exists notifications cascade;
drop table if exists walks cascade;
drop table if exists packages cascade;
drop table if exists walkers cascade;
drop table if exists pets cascade;
drop table if exists clients cascade;
drop table if exists profiles cascade;
drop table if exists app_state cascade;

-- Un perfil por cada persona que se registra (cliente o paseador). El id
-- es el mismo id que genera Supabase Auth al crear la cuenta.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('cliente', 'paseador', 'admin')),
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

-- Una fila por CADA MASCOTA. Un mismo dueno (owner_id) puede tener varias.
create table pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  dog jsonb not null default '{}'::jsonb,
  hotel jsonb not null default '{"medications":[],"meals":[],"complications":"","quirks":"","behaviorPeople":"","behaviorAnimals":"","stays":[]}'::jsonb,
  preferred_walker_id uuid references profiles(id),
  notify_before jsonb not null default '{"enabled":false,"minutes":15}'::jsonb,
  created_at timestamptz not null default now()
);

create table walkers (
  id uuid primary key references profiles(id) on delete cascade,
  zone text,
  experience_years int,
  bio text,
  photo text
);

create table packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_weeks int not null,
  days_per_week int not null,
  times_per_day int not null,
  duration int not null,
  price numeric not null,
  created_at timestamptz not null default now()
);

create table walks (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  walker_id uuid references walkers(id),
  type text not null check (type in ('individual', 'paquete')),
  package_id uuid references packages(id),
  date date not null,
  time text not null,
  duration int not null,
  price numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  reminded_sent boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  start_photo text,
  end_photo text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  walk_id uuid,
  type text not null,
  message text not null,
  photo text,
  created_at timestamptz not null default now()
);

create table settings (
  id int primary key default 1,
  hourly_rate numeric not null default 1500,
  check (id = 1)
);
insert into settings (id, hourly_rate) values (1, 1500);

-- ===================== Row Level Security =====================
alter table profiles enable row level security;
alter table pets enable row level security;
alter table walkers enable row level security;
alter table packages enable row level security;
alter table walks enable row level security;
alter table notifications enable row level security;
alter table settings enable row level security;

create policy "profiles select" on profiles for select to authenticated using (true);
create policy "profiles insert own" on profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on profiles for update to authenticated using (id = auth.uid());

create policy "pets select" on pets for select to authenticated using (true);
create policy "pets insert own" on pets for insert to authenticated with check (owner_id = auth.uid());
create policy "pets update own" on pets for update to authenticated using (owner_id = auth.uid());

create policy "walkers select" on walkers for select to authenticated using (true);
create policy "walkers insert own" on walkers for insert to authenticated with check (id = auth.uid());
create policy "walkers update own" on walkers for update to authenticated using (id = auth.uid());

create policy "packages select" on packages for select to authenticated using (true);
create policy "packages admin write" on packages for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "walks select" on walks for select to authenticated using (true);
create policy "walks insert own pet" on walks for insert to authenticated
  with check (
    exists (select 1 from pets where pets.id = pet_id and pets.owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "walks update own" on walks for update to authenticated
  using (
    walker_id = auth.uid()
    or exists (select 1 from pets where pets.id = pet_id and pets.owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "notifications select own" on notifications for select to authenticated
  using (
    exists (select 1 from pets where pets.id = pet_id and pets.owner_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role in ('paseador', 'admin'))
  );
create policy "notifications insert" on notifications for insert to authenticated with check (true);

create policy "settings select" on settings for select to authenticated using (true);
create policy "settings admin write" on settings for update to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ===================== Como convertirte en administradora =====================
-- 1. Registrate normalmente en la app (cliente o paseador, da igual).
-- 2. Corre esto aca, reemplazando el email por el tuyo:
--
--    update profiles set role = 'admin' where email = 'tu-email@gmail.com';
