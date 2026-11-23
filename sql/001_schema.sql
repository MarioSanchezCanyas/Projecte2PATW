-- ============================================================
-- PokéManager · Schema inicial
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. USERS
-- ------------------------------------------------------------
create table public.users (
  id             uuid primary key default gen_random_uuid(),
  username       text unique not null,
  email          text unique not null,
  password_hash  text not null,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. POKEMON_CACHE (datos de PokéAPI)
-- ------------------------------------------------------------
create table public.pokemon_cache (
  pokemon_id     int primary key,
  name           text not null,
  sprite_default text,
  sprite_shiny   text,
  types          jsonb not null default '[]',
  abilities      jsonb not null default '[]',
  base_hp        int not null,
  base_atk       int not null,
  base_def       int not null,
  base_spa       int not null,
  base_spd       int not null,
  base_spe       int not null,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. NATURES (25 naturalezas oficiales)
-- ------------------------------------------------------------
create table public.natures (
  id              serial primary key,
  name            text unique not null,
  increased_stat  text,
  decreased_stat  text
);

-- ------------------------------------------------------------
-- 4. ITEMS_CACHE (objetos equipables)
-- ------------------------------------------------------------
create table public.items_cache (
  item_id   int primary key,
  name      text not null,
  category  text
);

-- ------------------------------------------------------------
-- 5. FAVORITES
-- ------------------------------------------------------------
create table public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  pokemon_id  int  not null references public.pokemon_cache(pokemon_id) on delete cascade,
  is_shiny    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, pokemon_id)
);

-- ------------------------------------------------------------
-- 6. TEAMS
-- ------------------------------------------------------------
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null,
  max_size    int  not null default 6 check (max_size between 1 and 6),
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. TEAM_POKEMON (configuración competitiva)
-- ------------------------------------------------------------
create table public.team_pokemon (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams(id) on delete cascade,
  pokemon_id     int  not null references public.pokemon_cache(pokemon_id) on delete restrict,
  slot           int  not null check (slot between 1 and 6),
  level          int  not null default 50 check (level between 1 and 100),
  nature_id      int  not null references public.natures(id) on delete restrict,
  held_item_id   int  references public.items_cache(item_id) on delete set null,
  is_shiny       boolean not null default false,

  iv_hp   int not null default 31 check (iv_hp  between 0 and 31),
  iv_atk  int not null default 31 check (iv_atk between 0 and 31),
  iv_def  int not null default 31 check (iv_def between 0 and 31),
  iv_spa  int not null default 31 check (iv_spa between 0 and 31),
  iv_spd  int not null default 31 check (iv_spd between 0 and 31),
  iv_spe  int not null default 31 check (iv_spe between 0 and 31),

  ev_hp   int not null default 0 check (ev_hp  between 0 and 252),
  ev_atk  int not null default 0 check (ev_atk between 0 and 252),
  ev_def  int not null default 0 check (ev_def between 0 and 252),
  ev_spa  int not null default 0 check (ev_spa between 0 and 252),
  ev_spd  int not null default 0 check (ev_spd between 0 and 252),
  ev_spe  int not null default 0 check (ev_spe between 0 and 252),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (team_id, slot),

  -- Suma total de EVs ≤ 510
  constraint ev_total_max check (
    (ev_hp + ev_atk + ev_def + ev_spa + ev_spd + ev_spe) <= 510
  )
);

-- ------------------------------------------------------------
-- Índices sobre claves foráneas
-- ------------------------------------------------------------
create index idx_favorites_user      on public.favorites(user_id);
create index idx_favorites_pokemon   on public.favorites(pokemon_id);
create index idx_teams_user          on public.teams(user_id);
create index idx_team_pokemon_team   on public.team_pokemon(team_id);
create index idx_team_pokemon_poke   on public.team_pokemon(pokemon_id);
create index idx_team_pokemon_item   on public.team_pokemon(held_item_id);
create index idx_team_pokemon_nat    on public.team_pokemon(nature_id);

-- Solo si vas a llamar a Supabase desde el frontend con anon key
alter table public.users         enable row level security;
alter table public.favorites     enable row level security;
alter table public.teams         enable row level security;
alter table public.team_pokemon  enable row level security;
alter table public.pokemon_cache enable row level security;
alter table public.natures       enable row level security;
alter table public.items_cache   enable row level security;

-- Caché y catálogos: lectura pública (necesario para dropdowns)
create policy "read pokemon_cache" on public.pokemon_cache for select using (true);
create policy "read natures"       on public.natures       for select using (true);
create policy "read items_cache"   on public.items_cache   for select using (true);

-- Datos privados: solo el dueño
create policy "own favorites" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own teams" on public.teams
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own team_pokemon" on public.team_pokemon
  for all using (
    exists (
      select 1 from public.teams t
      where t.id = team_pokemon.team_id and t.user_id = auth.uid()
    )
  );