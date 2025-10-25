'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Demand, Message, Status, SuggestedProblem } from '../types/supabase';
import { format } from 'date-fns';

// Util distância (Haversine)
function distanceKm(aLat?: number | null, aLng?: number | null, bLat?: number | null, bLng?: number | null) {
  if (aLat == null || aLng == null || bLat == null || bLng == null) return null;
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLng - aLng);
  const aa = Math.sin(dLat/2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return Math.round(R * c * 10) / 10; // 0.1 km
}

function StatusBadge({ status }: { status: Status }) {
  const label = status === 'aguardando_voluntario' ? 'Aguardando Voluntário' : status === 'em_progresso' ? 'Em Progresso' : 'Concluída';
  const cls = status === 'aguardando_voluntario' ? 'badge badge-await' : status === 'em_progresso' ? 'badge badge-progress' : 'badge badge-done';
  return <span className={cls} aria-label={`Status: ${label}`}>{label}</span>;
}

function RiskBar({ score }: { score: number | null }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const color = pct < 34 ? 'var(--rs-green)' : pct < 67 ? 'var(--rs-yellow)' : 'var(--rs-blue)';
  return (
    <div className="risk-bar" aria-label={`Risco: ${pct}%`}>
      <div className="risk-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function MapMini({ lat, lng }: { lat: number | null; lng: number | null }) {
  // Mini-map fake: coloca pino em posição relativa ao bounding box da região
  const minLat = -23.65, maxLat = -23.45; // SP aproximado
  const minLng = -46.75, maxLng = -46.50;
  const x = lat == null || lng == null ? 50 : ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = lat == null || lng == null ? 50 : (1 - (lat - minLat) / (maxLat - minLat)) * 100;
  return (
    <div className="mapmini" role="img" aria-label="Mini mapa">
      <div className="mapmini-pin" style={{ left: `${x}%`, top: `${y}%` }} />
    </div>
  );
}

function Toolbar({
  search,
  setSearch,
  status,
  setStatus,
  problemFilter,
  setProblemFilter,
  radiusKm,
  setRadiusKm,
  order,
  setOrder,
  myName,
  setMyName,
}: {
  search: string; setSearch: (v: string) => void;
  status: 'todas' | 'aguardando' | 'minhas' | 'concluidas'; setStatus: (v: 'todas' | 'aguardando' | 'minhas' | 'concluidas') => void;
  problemFilter: SuggestedProblem[]; setProblemFilter: (v: SuggestedProblem[]) => void;
  radiusKm: number; setRadiusKm: (v: number) => void;
  order: 'mais_proximas' | 'maior_risco' | 'mais_recentes'; setOrder: (v: 'mais_proximas' | 'maior_risco' | 'mais_recentes') => void;
  myName: string; setMyName: (v: string) => void;
}) {
  const problems: SuggestedProblem[] = ['transporte','terapia_emocional','fisioterapia','inseguranca_alimentar','apoio_financeiro','reforco_escolar','outro'];
  const problemColors: Record<SuggestedProblem, string> = {
    transporte: 'var(--rs-blue)',
    terapia_emocional: 'var(--rs-green)',
    fisioterapia: 'var(--rs-green)',
    inseguranca_alimentar: 'var(--rs-yellow)',
    apoio_financeiro: 'var(--rs-yellow)',
    reforco_escolar: 'var(--rs-blue)',
    outro: 'var(--rs-gray-dark)'
  } as const;

  const toggleProblem = (p: SuggestedProblem) => {
    if (problemFilter.includes(p)) setProblemFilter(problemFilter.filter(x => x !== p));
    else setProblemFilter([...problemFilter, p]);
  };

  const onClear = () => {
    setSearch('');
    setStatus('todas');
    setProblemFilter([]);
    setRadiusKm(20);
    setOrder('mais_proximas');
    setMyName('');
  };

  return (
    <div className="toolbar" aria-label="Ferramentas de busca e filtro">
      <input className="input" placeholder="Buscar (nome/bairro/escola)" value={search} onChange={e => setSearch(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <select className="select" value={status} onChange={e => setStatus(e.target.value as any)} aria-label="Filtrar por Status">
          <option value="todas">Todas</option>
          <option value="aguardando">Aguardando Voluntário</option>
          <option value="minhas">Minhas em Progresso</option>
          <option value="concluidas">Concluídas</option>
        </select>
        <select className="select" value={order} onChange={e => setOrder(e.target.value as any)} aria-label="Ordenar">
          <option value="mais_proximas">Mais próximas</option>
          <option value="maior_risco">Maior risco</option>
          <option value="mais_recentes">Mais recentes</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }} aria-label="Tipos (problema sugerido)">
        {problems.map(p => (
          <button key={p} className="chip" aria-pressed={problemFilter.includes(p)} onClick={() => toggleProblem(p)}>
            <span className="chip-dot" style={{ background: problemColors[p] }} />
            {p.replace('_',' ')}
          </button>
        ))}
        <button className="btn btn-warning" onClick={onClear} aria-label="Limpar filtros">Limpar</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <input className="input" type="number" min={1} max={50} value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))} placeholder="Raio (km)" aria-label="Raio (km)" />
        <input className="input" value={myName} onChange={e => setMyName(e.target.value)} placeholder="Seu nome (para Minhas em Progresso)" aria-label="Seu nome" />
      </div>
    </div>
  );
}

function DemandCard({ d, distance, onDetails, onAccept }: { d: Demand; distance: number | null; onDetails: () => void; onAccept: () => void; }) {
  return (
    <div className="card" role="article" aria-label={`Demanda de ${d.student_name}`}>
      <div className="card-header">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <strong>{d.student_name}</strong>
          <span aria-label="Idade">{d.student_age} anos</span>
        </div>
        <StatusBadge status={d.status} />
      </div>
      <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.25rem' }}>
        <span>{d.address_neighborhood ?? '—'} • {d.city ?? '—'}</span>
        <span>Escola: {d.school_name ?? '—'}</span>
        <span>Tipo: {d.suggested_problem?.replace('_',' ') ?? '—'}</span>
        <span>Distância: {distance != null ? `${distance} km` : '—'}</span>
        <RiskBar score={d.risk_score ?? 0} />
      </div>
      <div className="card-footer" style={{ marginTop: '0.5rem' }}>
        <button className="btn btn-ghost" onClick={onDetails}>Ver detalhes</button>
        {d.status === 'aguardando_voluntario' && (
          <button className="btn btn-success" onClick={onAccept}>Aceitar</button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 40;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'todas' | 'aguardando' | 'minhas' | 'concluidas'>('todas');
  const [problemFilter, setProblemFilter] = useState<SuggestedProblem[]>([]);
  const [radiusKm, setRadiusKm] = useState(20);
  const [order, setOrder] = useState<'mais_proximas' | 'maior_risco' | 'mais_recentes'>('mais_proximas');
  const [myName, setMyName] = useState('');

  const [volLat, setVolLat] = useState<number | null>(null);
  const [volLng, setVolLng] = useState<number | null>(null);

  const [openDemand, setOpenDemand] = useState<Demand | null>(null);
  const [activeTab, setActiveTab] = useState<'detalhes' | 'chat' | 'timeline'>('detalhes');
  const [messages, setMessages] = useState<Message[]>([]);
  const chatSubRef = useRef<any>(null);
  const [sending, setSending] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const supabaseMissing = !supabase;

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVolLat(pos.coords.latitude);
        setVolLng(pos.coords.longitude);
      },
      () => {
        // fallback para centro de SP
        setVolLat(-23.55052);
        setVolLng(-46.633308);
      },
      { enableHighAccuracy: true, timeout: 3000 }
    );
  }, []);

  async function fetchDemands(initial = false) {
    if (supabaseMissing) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('demands')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error) throw error;
      setDemands(initial ? (data as any) : [...demands, ...(data as any)]);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Falha ao carregar demandas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDemands(true); /* initial */ }, []);
  useEffect(() => { if (page > 0) fetchDemands(false); }, [page]);

  const filtered = useMemo(() => {
    let list = demands.slice();
    // Busca
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(d => (
        (d.student_name?.toLowerCase().includes(q)) ||
        (d.address_neighborhood?.toLowerCase().includes(q)) ||
        (d.school_name?.toLowerCase().includes(q))
      ));
    }
    // Status
    list = list.filter(d => {
      if (status === 'todas') return true;
      if (status === 'aguardando') return d.status === 'aguardando_voluntario';
      if (status === 'concluidas') return d.status === 'concluida';
      if (status === 'minhas') return d.status === 'em_progresso' && myName && d.assigned_volunteer_name?.toLowerCase() === myName.toLowerCase();
      return true;
    });
    // Tipo sugerido
    if (problemFilter.length > 0) list = list.filter(d => d.suggested_problem && problemFilter.includes(d.suggested_problem));
    // Raio
    if (volLat != null && volLng != null && radiusKm > 0) {
      list = list.filter(d => {
        const dist = distanceKm(volLat, volLng, d.geo_lat, d.geo_lng);
        return dist == null ? false : dist <= radiusKm;
      });
    }
    // Ordenação
    list.sort((a, b) => {
      if (order === 'maior_risco') return (b.risk_score ?? 0) - (a.risk_score ?? 0);
      if (order === 'mais_recentes') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      // mais próximas
      const da = distanceKm(volLat, volLng, a.geo_lat, a.geo_lng) ?? Infinity;
      const db = distanceKm(volLat, volLng, b.geo_lat, b.geo_lng) ?? Infinity;
      return da - db;
    });
    return list;
  }, [demands, search, status, problemFilter, volLat, volLng, radiusKm, order, myName]);

  function openDetails(d: Demand) {
    setOpenDemand(d);
    setActiveTab('detalhes');
    loadMessages(d.id);
    subscribeChat(d.id);
  }

  function closePanel() {
    setOpenDemand(null);
    setMessages([]);
    setActiveTab('detalhes');
    if (chatSubRef.current) chatSubRef.current.unsubscribe();
    chatSubRef.current = null;
  }

  async function loadMessages(demandId: string) {
    if (supabaseMissing) { setMessages([]); return; }
    const { data } = await supabase.from('messages').select('*').eq('demand_id', demandId).order('created_at', { ascending: true });
    setMessages((data as any) || []);
  }

  function subscribeChat(demandId: string) {
    if (chatSubRef.current) chatSubRef.current.unsubscribe();
    chatSubRef.current = supabase
      .channel(`messages:${demandId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `demand_id=eq.${demandId}` }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as any]);
      })
      .subscribe();
  }

  async function sendMessage() {
    if (!openDemand || !chatInput.trim()) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({ demand_id: openDemand.id, sender: 'voluntario', content: chatInput.trim() });
    setSending(false);
    if (!error) setChatInput('');
  }

  async function acceptDemand(d: Demand) {
    if (supabaseMissing) { alert('Configure Supabase para aceitar demandas.'); return; }
    const name = myName || prompt('Digite seu nome para aceitar a demanda:') || '';
    if (!name) return;
    const { error } = await supabase.from('demands').update({ status: 'em_progresso', assigned_volunteer_name: name }).eq('id', d.id);
    if (error) return alert('Falha ao aceitar: ' + error.message);
    setDemands(prev => prev.map(x => x.id === d.id ? { ...x, status: 'em_progresso', assigned_volunteer_name: name } : x));
  }

  async function concludeDemand(d: Demand) {
    if (supabaseMissing) { alert('Configure Supabase para concluir demandas.'); return; }
    const { error } = await supabase.from('demands').update({ status: 'concluida' }).eq('id', d.id);
    if (error) return alert('Falha ao concluir: ' + error.message);
    setDemands(prev => prev.map(x => x.id === d.id ? { ...x, status: 'concluida' } : x));
  }

  async function simulateCall(d: Demand) {
    if (supabaseMissing) { alert(`Simulação: ligação para ${d.guardian_name} (${d.contact_phone})`); return; }
    await supabase.from('messages').insert({ demand_id: d.id, sender: 'sistema', content: 'Ligação simulada ao responsável.' });
  }

  return (
    <div className="container" role="main" aria-label="Todas as Demandas">
      {supabaseMissing && (
        <div role="alert" style={{ background: '#fffaf0', border: '1px solid #faf089', padding: '0.5rem', borderRadius: 8, marginBottom: '0.75rem' }}>
          Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para carregar dados.
        </div>
      )}
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--rs-blue)', marginBottom: '0.75rem' }}>RotaSocial — Todas as Demandas</h1>
      <Toolbar
        search={search} setSearch={setSearch}
        status={status} setStatus={setStatus}
        problemFilter={problemFilter} setProblemFilter={setProblemFilter}
        radiusKm={radiusKm} setRadiusKm={setRadiusKm}
        order={order} setOrder={setOrder}
        myName={myName} setMyName={setMyName}
      />

      {loading && demands.length === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card" aria-busy="true" style={{ height: 140, background: '#f7fafc' }} />
          ))}
        </div>
      )}

      {error && <div role="alert" style={{ marginTop: '0.75rem', color: '#c53030' }}>Erro: {error}</div>}

      {!loading && filtered.length === 0 && (
        <div role="status" style={{ marginTop: '0.75rem' }}>Nenhuma demanda encontrada com os filtros atuais.</div>
      )}

      <div className="grid" style={{ marginTop: '1rem' }}>
        {filtered.map(d => {
          const dist = distanceKm(volLat, volLng, d.geo_lat, d.geo_lng);
          return (
            <DemandCard key={d.id} d={d} distance={dist} onDetails={() => openDetails(d)} onAccept={() => acceptDemand(d)} />
          );
        })}
      </div>

      {!loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={() => setPage(p => p + 1)}>Carregar mais</button>
        </div>
      )}

      {openDemand && (
        <div className="sidepanel" role="dialog" aria-modal="true" aria-label="Detalhe da Demanda">
          <div className="sidepanel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>{openDemand.student_name}</strong>
            <button className="btn btn-ghost" onClick={closePanel}>Fechar</button>
          </div>
          <div className="tabs">
            <button className={`tab ${activeTab === 'detalhes' ? 'tab-active' : ''}`} onClick={() => setActiveTab('detalhes')}>Detalhes</button>
            <button className={`tab ${activeTab === 'chat' ? 'tab-active' : ''}`} onClick={() => setActiveTab('chat')}>Chat</button>
            <button className={`tab ${activeTab === 'timeline' ? 'tab-active' : ''}`} onClick={() => setActiveTab('timeline')}>Linha do Tempo</button>
          </div>
          <div className="sidepanel-body">
            {activeTab === 'detalhes' && (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gap: '0.25rem' }}>
                  <span>Idade: {openDemand.student_age} anos</span>
                  <span>Responsável: {openDemand.guardian_name}</span>
                  <span>Telefone: {openDemand.contact_phone} • Canal: {openDemand.preferred_channel}</span>
                </div>
                <div style={{ display: 'grid', gap: '0.25rem' }}>
                  <span>Endereço: {openDemand.address_street ?? '—'}</span>
                  <span>Bairro/Cidade: {openDemand.address_neighborhood ?? '—'} • {openDemand.city ?? '—'}</span>
                  <MapMini lat={openDemand.geo_lat} lng={openDemand.geo_lng} />
                  <span>Distância até você: {distanceKm(volLat, volLng, openDemand.geo_lat, openDemand.geo_lng) ?? '—'} km</span>
                </div>
                <div style={{ display: 'grid', gap: '0.25rem' }}>
                  <span>Escola: {openDemand.school_name ?? '—'}</span>
                  <span>Presença 30d: {openDemand.attendance_days_present_30d ?? 0} • Ausência 30d: {openDemand.attendance_days_absent_30d ?? 0}</span>
                  <span>Notas recentes: {openDemand.grades_last_term ? Object.entries(openDemand.grades_last_term).map(([k,v]) => `${k}: ${v}`).join(' • ') : '—'}</span>
                  <span>Conduta: {openDemand.behavior_notes ?? '—'}</span>
                </div>
                <div style={{ display: 'grid', gap: '0.25rem' }}>
                  <span>Últimas consultas SUS:</span>
                  <div>
                    {(openDemand.sus_visits ?? []).length === 0 ? '—' : (openDemand.sus_visits ?? []).slice().sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map((v,i)=> (
                      <div key={i}>• {format(new Date(v.date), 'dd/MM/yyyy')} — {v.type} — {v.notes ?? ''}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <span>Problema sugerido: {openDemand.suggested_problem?.replace('_',' ') ?? '—'}</span>
                </div>
                <div>
                  <span>Consentimento: {openDemand.consent_granted_at ? `Consentimento concedido em ${format(new Date(openDemand.consent_granted_at), 'dd/MM/yyyy')}` : 'Sem registro de consentimento'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <StatusBadge status={openDemand.status} />
                </div>
              </div>
            )}
            {activeTab === 'chat' && (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div className="messages">
                  {messages.map(m => (
                    <div key={m.id} className={`message message-${m.sender}`}>{m.content}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                  <input className="input" placeholder="Digite sua mensagem" value={chatInput} onChange={e => setChatInput(e.target.value)} />
                  <button className="btn btn-primary" disabled={sending || !chatInput.trim()} onClick={sendMessage}>Enviar</button>
                </div>
              </div>
            )}
            {activeTab === 'timeline' && (
              <div>
                <div>Eventos (aceite, mensagens, conclusão) — simplificado no momento.</div>
              </div>
            )}
          </div>
          <div className="sidepanel-footer">
            {openDemand.status === 'aguardando_voluntario' && (
              <button className="btn btn-success" onClick={() => acceptDemand(openDemand)}>Aceitar Demanda</button>
            )}
            <button className="btn btn-primary" onClick={() => setActiveTab('chat')}>Entrar em Contato (Chat)</button>
            <button className="btn btn-warning" onClick={() => simulateCall(openDemand)}>Ligar</button>
            {openDemand.status !== 'concluida' && (
              <button className="btn" style={{ background: '#718096', color: '#fff' }} onClick={() => concludeDemand(openDemand)}>Marcar como Concluída</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
