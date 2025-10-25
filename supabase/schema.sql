-- RotaSocial Supabase Schema
-- Extensões necessárias
create extension if not exists pgcrypto;

-- Enums
create type preferred_channel_enum as enum ('whatsapp','ligacao','sms');
create type suggested_problem_enum as enum (
  'transporte','terapia_emocional','fisioterapia','inseguranca_alimentar','apoio_financeiro','reforco_escolar','outro'
);
create type status_enum as enum ('aguardando_voluntario','em_progresso','concluida');
create type sender_enum as enum ('voluntario','familia','sistema');

-- Tabela demands
create table if not exists public.demands (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  student_name text not null,
  student_age int not null check (student_age between 10 and 17),

  guardian_name text not null,
  contact_phone text not null,
  preferred_channel preferred_channel_enum not null,

  address_street text,
  address_neighborhood text,
  city text,
  state text,
  zip text,

  geo_lat float8,
  geo_lng float8,

  school_name text,

  attendance_days_present_30d int default 0 check (attendance_days_present_30d >= 0),
  attendance_days_absent_30d int default 0 check (attendance_days_absent_30d >= 0),
  grades_last_term jsonb,
  behavior_notes text,

  sus_visits jsonb, -- array de { date, type, notes }

  suggested_problem suggested_problem_enum,
  risk_score int check (risk_score between 0 and 100),
  consent_granted_at date,

  status status_enum not null default 'aguardando_voluntario',
  assigned_volunteer_name text
);

-- Índices úteis
create index if not exists demands_status_idx on public.demands (status);
create index if not exists demands_risk_idx on public.demands (risk_score desc);
create index if not exists demands_city_neighborhood_idx on public.demands (city, address_neighborhood);
create index if not exists demands_geo_lat_idx on public.demands (geo_lat);
create index if not exists demands_geo_lng_idx on public.demands (geo_lng);

-- Tabela messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  demand_id uuid not null references public.demands(id) on delete cascade,
  sender sender_enum not null,
  content text not null
);

create index if not exists messages_demand_id_idx on public.messages (demand_id);
create index if not exists messages_created_at_idx on public.messages (created_at desc);

-- RLS
alter table public.demands enable row level security;
alter table public.messages enable row level security;

-- Demands policies
-- Leitura pública
drop policy if exists demands_select_public on public.demands;
create policy demands_select_public on public.demands
  for select
  using (true);

-- Atualizações controladas: permitir mudança de status e preenchimento de assigned_volunteer_name
-- Regra: status só pode ser 'em_progresso' ou 'concluida';
-- Se 'em_progresso', exigir assigned_volunteer_name não nulo.
drop policy if exists demands_update_flow on public.demands;
create policy demands_update_flow on public.demands
  for update
  using (true)
  with check (
    (
      status = 'em_progresso' and assigned_volunteer_name is not null
    )
    or status = 'concluida'
    or status = 'aguardando_voluntario' -- permitir ajustes de dados mantendo status
  );

-- Opcional: permitir inserts administrados (seeds); para produção, usar service role.
drop policy if exists demands_insert_admin on public.demands;
create policy demands_insert_admin on public.demands
  for insert
  with check (true);

-- Messages policies
-- Leitura pública
drop policy if exists messages_select_public on public.messages;
create policy messages_select_public on public.messages
  for select
  using (true);

-- Inserção pública controlada (conteúdo não vazio e sender válido)
drop policy if exists messages_insert_public on public.messages;
create policy messages_insert_public on public.messages
  for insert
  with check (
    content is not null and length(content) > 0
  );

-- Bloquear updates e deletes para mensagens por padrão (sem políticas específicas)
-- Administradores podem operar via service role.

-- Views auxiliares (opcional)
-- Exemplo: última mensagem por demanda
create or replace view public.latest_message_per_demand as
select distinct on (demand_id)
  demand_id, id, created_at, sender, content
from public.messages
order by demand_id, created_at desc;