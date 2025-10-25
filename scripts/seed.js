/*
  RotaSocial Seed Script
  Uso:
  - Configure env:
    SUPABASE_SERVICE_ROLE_KEY=<chave>
    NEXT_PUBLIC_SUPABASE_URL=<url>
  - Execute: npm run seed:supabase
*/

const { createClient } = require('@supabase/supabase-js');
const { faker } = require('@faker-js/faker');

faker.locale = 'pt_BR';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Erro: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const neighborhoods = [
  'Bela Vista','Pinheiros','Moema','Tatuapé','Itaquera','Santana','Vila Mariana','Vila Prudente','Lapa','Perdizes',
  'Butantã','Campo Belo','Consolação','Liberdade','Sé','Jardim Paulista','Vila Madalena','Ipiranga','Jabaquara','Pompéia'
];
const cities = ['São Paulo','Osasco','Santo André','São Bernardo do Campo','São Caetano','Guarulhos','Barueri'];
const states = ['SP'];
const schools = [
  'EE José Bonifácio', 'EMEF Almirante Tamandaré', 'EE Maria Firmina dos Reis', 'EMEF Professor Paulo Freire',
  'EMEF Monteiro Lobato', 'EE Castro Alves', 'EMEF Cecília Meireles', 'EE João XXIII', 'EMEF Machado de Assis'
];
const problems = ['transporte','terapia_emocional','fisioterapia','inseguranca_alimentar','apoio_financeiro','reforco_escolar','outro'];
const channels = ['whatsapp','ligacao','sms'];
const susTypes = ['psicologia','ortopedia','clinica_geral'];
const volunteers = ['Ana Souza','Pedro Lima','Mariana Alves','João Santos','Camila Rocha','Ricardo Nunes','Beatriz Oliveira'];

// Centro aproximado de São Paulo
const centerLat = -23.55052;
const centerLng = -46.633308;
function randomCoord() {
  // ~10-15km de raio (0.1 ~ 11km lat)
  const lat = centerLat + (Math.random() - 0.5) * 0.20; // +-0.1
  const lng = centerLng + (Math.random() - 0.5) * 0.20;
  return { lat, lng };
}

function randomConsentDate() {
  if (Math.random() < 0.1) return null; // alguns sem consentimento
  const date = faker.date.recent({ days: 180 });
  return date.toISOString().slice(0, 10);
}

function randomAttendance() {
  const present = faker.number.int({ min: 15, max: 26 });
  const absent = faker.number.int({ min: 0, max: 10 });
  return { present, absent };
}

function randomGrades() {
  const subjects = ['Português','Matemática','Ciências','História','Geografia'];
  const obj = {};
  subjects.forEach(s => { obj[s] = faker.number.int({ min: 5, max: 10 }); });
  return obj;
}

function randomSusVisits() {
  const count = faker.number.int({ min: 0, max: 3 });
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      date: faker.date.recent({ days: 120 }).toISOString(),
      type: susTypes[faker.number.int({ min: 0, max: susTypes.length - 1 })],
      notes: faker.lorem.sentence()
    });
  }
  return arr;
}

function randomStatus() {
  const r = Math.random();
  if (r < 0.6) return 'aguardando_voluntario';
  if (r < 0.9) return 'em_progresso';
  return 'concluida';
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function seedDemands(count) {
  const batch = [];
  for (let i = 0; i < count; i++) {
    const { lat, lng } = randomCoord();
    const att = randomAttendance();
    const status = randomStatus();
    const neighborhood = neighborhoods[faker.number.int({ min: 0, max: neighborhoods.length - 1 })];
    const city = cities[faker.number.int({ min: 0, max: cities.length - 1 })];
    const preferred_channel = channels[faker.number.int({ min: 0, max: channels.length - 1 })];
    const assigned_volunteer_name = (status === 'em_progresso' || status === 'concluida') ? volunteers[faker.number.int({ min: 0, max: volunteers.length - 1 })] : null;

    batch.push({
      student_name: faker.person.fullName(),
      student_age: faker.number.int({ min: 10, max: 17 }),
      guardian_name: faker.person.fullName(),
      contact_phone: faker.phone.number('+55 ## #####-####'),
      preferred_channel,
      address_street: faker.location.streetAddress(),
      address_neighborhood: neighborhood,
      city,
      state: states[0],
      zip: faker.location.zipCode('#####-###'),
      geo_lat: lat,
      geo_lng: lng,
      school_name: schools[faker.number.int({ min: 0, max: schools.length - 1 })],
      attendance_days_present_30d: att.present,
      attendance_days_absent_30d: att.absent,
      grades_last_term: randomGrades(),
      behavior_notes: faker.lorem.sentence(),
      sus_visits: randomSusVisits(),
      suggested_problem: problems[faker.number.int({ min: 0, max: problems.length - 1 })],
      risk_score: faker.number.int({ min: 0, max: 100 }),
      consent_granted_at: randomConsentDate(),
      status,
      assigned_volunteer_name,
    });
  }

  const { data, error } = await supabase.from('demands').insert(batch).select('id');
  if (error) {
    console.error('Erro ao inserir demands:', error);
    process.exit(1);
  }
  return data.map(d => d.id);
}

const ptChatSamples = [
  'Olá! Poderia me ajudar com transporte para a consulta?',
  'Bom dia! Temos exame amanhã, consegue apoio?',
  'Obrigado pelo retorno! Podemos combinar para terça?',
  'Podemos falar por aqui? Qual o melhor horário?',
  'Conseguimos vaga na clínica, preciso confirmar horário.',
  'Tudo bem? Preciso de ajuda com reforço escolar.'
];
async function seedMessages(demandIds) {
  const rows = [];
  demandIds.slice(0, Math.min(30, demandIds.length)).forEach((id) => {
    const mCount = faker.number.int({ min: 1, max: 3 });
    rows.push({ demand_id: id, sender: 'sistema', content: 'Demanda registrada no sistema.' });
    for (let i = 0; i < mCount; i++) {
      const sample = ptChatSamples[faker.number.int({ min: 0, max: ptChatSamples.length - 1 })];
      rows.push({ demand_id: id, sender: 'familia', content: sample });
    }
  });
  if (rows.length > 0) {
    const { error } = await supabase.from('messages').insert(rows);
    if (error) {
      console.error('Erro ao inserir messages:', error);
    }
  }
}

(async () => {
  try {
    const count = faker.number.int({ min: 120, max: 180 });
    console.log(`Inserindo ${count} demandas...`);
    const ids = await seedDemands(count);
    console.log('Demandas inseridas:', ids.length);

    console.log('Inserindo mensagens iniciais...');
    await seedMessages(ids);

    console.log('Seed concluído com sucesso.');
    process.exit(0);
  } catch (e) {
    console.error('Falha no seed:', e);
    process.exit(1);
  }
})();