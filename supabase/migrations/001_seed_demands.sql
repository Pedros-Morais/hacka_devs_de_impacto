-- Seed de 100 demandas para RotaSocial
-- Execute este arquivo no Supabase SQL Editor (ou via CLI) após aplicar o schema.

insert into public.demands (
  student_name,
  student_age,
  guardian_name,
  contact_phone,
  preferred_channel,
  address_street,
  address_neighborhood,
  city,
  state,
  zip,
  geo_lat,
  geo_lng,
  school_name,
  attendance_days_present_30d,
  attendance_days_absent_30d,
  grades_last_term,
  behavior_notes,
  sus_visits,
  suggested_problem,
  risk_score,
  consent_granted_at,
  status,
  assigned_volunteer_name
)
select
  -- nomes aleatórios
  (
    (ARRAY['Ana','Bruno','Carla','Daniel','Eduarda','Felipe','Gabriela','Helena','Igor','Julia','Kauã','Larissa','Marcos','Nina','Otávio','Paula','Rafael','Sofia','Thiago','Vitória'])[floor(random()*20)::int + 1]
    || ' '
    || (ARRAY['Silva','Santos','Oliveira','Souza','Lima','Pereira','Ferreira','Almeida','Costa','Gomes','Martins','Araujo'])[floor(random()*12)::int + 1]
  ) as student_name,
  10 + floor(random()*8)::int as student_age,
  (
    (ARRAY['Maria','José','Patrícia','André','Cláudia','Rodrigo','Simone','Carlos','Fernanda','Luís'])[floor(random()*10)::int + 1]
    || ' '
    || (ARRAY['Silva','Santos','Oliveira','Souza','Lima','Pereira','Ferreira','Almeida','Costa','Gomes'])[floor(random()*10)::int + 1]
  ) as guardian_name,
  ('11 9' || (10000000 + floor(random()*90000000))::int)::text as contact_phone,
  (ARRAY['whatsapp','ligacao','sms'])[floor(random()*3)::int + 1]::preferred_channel_enum as preferred_channel,
  ('Rua ' || (ARRAY['das Flores','dos Pinheiros','da Praia','da Liberdade','dos Limoeiros','São João'])[floor(random()*6)::int + 1]) as address_street,
  (ARRAY['Jardim Paulista','Pinheiros','Copacabana','Boa Viagem','Centro','Liberdade','Savassi','Asa Sul'])[floor(random()*8)::int + 1] as address_neighborhood,
  (ARRAY['São Paulo','Rio de Janeiro','Recife','Fortaleza','Curitiba','Porto Alegre','Salvador','Belo Horizonte','Brasília'])[floor(random()*9)::int + 1] as city,
  (ARRAY['SP','RJ','PE','CE','PR','RS','BA','MG','DF'])[floor(random()*9)::int + 1] as state,
  (to_char(10000000 + floor(random()*90000000), 'FM99999999')) as zip,
  (-23.6 + (random()*0.4)) as geo_lat,
  (-46.7 + (random()*0.4)) as geo_lng,
  (ARRAY['EE João XXIII','EM Maria da Penha','CE Antônio Vieira','Colégio Horizonte','EMEF Vila Nova'])[floor(random()*5)::int + 1] as school_name,
  floor(random()*25)::int as attendance_days_present_30d,
  floor(random()*10)::int as attendance_days_absent_30d,
  jsonb_build_object(
    'matematica', 5 + floor(random()*6)::int,
    'portugues', 5 + floor(random()*6)::int,
    'ciencias', 5 + floor(random()*6)::int
  ) as grades_last_term,
  (ARRAY['Precisa de apoio em reforço escolar','Bom rendimento no último bimestre','Assiduidade precisa melhorar','Dificuldades de socialização observadas','Família solicita ajuda de transporte'])[floor(random()*5)::int + 1] as behavior_notes,
  case when random() < 0.5 then
    jsonb_build_array(
      jsonb_build_object('date', (now() - (floor(random()*60)::int)*interval '1 day')::date, 'type','consulta', 'notes','Acompanhamento SUS'),
      jsonb_build_object('date', (now() - (floor(random()*30)::int)*interval '1 day')::date, 'type','exame', 'notes','Exame de rotina')
    )
  else '[]'::jsonb end as sus_visits,
  (ARRAY['transporte','terapia_emocional','fisioterapia','inseguranca_alimentar','apoio_financeiro','reforco_escolar','outro'])[floor(random()*7)::int + 1]::suggested_problem_enum as suggested_problem,
  floor(random()*101)::int as risk_score,
  (now() - (floor(random()*90)::int)*interval '1 day')::date as consent_granted_at,
  (ARRAY['aguardando_voluntario','em_progresso','concluida'])[floor(random()*3)::int + 1]::status_enum as status,
  case when random() < 0.35 then (
    (ARRAY['Alice','Bruno','Cristina','Diego','Eduardo','Fabiana','Guilherme','Heloisa','Isabel','João'])[floor(random()*10)::int + 1]
    || ' '
    || (ARRAY['Silva','Santos','Oliveira','Souza','Lima','Pereira','Ferreira','Almeida','Costa','Gomes'])[floor(random()*10)::int + 1]
  ) else null end as assigned_volunteer_name
from generate_series(1, 100);