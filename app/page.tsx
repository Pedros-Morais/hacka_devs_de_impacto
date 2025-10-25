'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Demand, Message, Status, SuggestedProblem } from '../types/supabase';
import { format } from 'date-fns';

// Icons (inline SVG)
function IconChat(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2z"/></svg>
  );
}
function IconPhone(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.05-.24 12.36 12.36 0 0 0 3.88.62 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 7a1 1 0 0 1 1-1h2.44a1 1 0 0 1 1 1 12.36 12.36 0 0 0 .62 3.88 1 1 0 0 1-.24 1.05l-1.2 1.2Z"/></svg>
  );
}
function IconCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconEye(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5c-7.2 0-10 7.5-10 7.5s2.8 7.5 10 7.5 10-7.5 10-7.5-2.8-7.5-10-7.5zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>
  );
}
function IconClose(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 6l12 12" strokeLinecap="round" />
      <path d="M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
function IconMore(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  );
}
function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm8.32 14.9-3.53-3.53" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  );
}
function IconTimeline(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h2v16H5zm6 5h2v11h-2zm6-3h2v14h-2z"/></svg>
  );
}
function IconBroom(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M15 3l6 6-9 9H6l-3 3 3-6v-6z"/></svg>
  );
}

// Util distância (Haversine)
function distanceKm(aLat?: number | null, aLng?: number | null, bLat?: number | null, bLng?: number | null) {
  if (aLat == null || aLng == null || bLat == null || bLng == null) return null;
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLng - aLng);
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return Math.round(R * c * 10) / 10; // 0.1 km
}

function StatusBadge({ status }: { status: Status }) {
  const label =
    status === "aguardando_voluntario" ? "Aguardando Voluntário" : status === "em_progresso" ? "Em Progresso" : "Concluída";
  const cls =
    status === "aguardando_voluntario" ? "badge badge-await" : status === "em_progresso" ? "badge badge-progress" : "badge badge-done";
  return <span className={cls} aria-label={`Status: ${label}`}>{label}</span>;
}

function RiskBar({ score }: { score: number | null }) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const color = pct < 34 ? "var(--rs-green)" : pct < 67 ? "var(--rs-yellow)" : "var(--rs-blue)";
  return (
    <div className="risk-bar" aria-label={`Risco: ${pct}%`}>
      <div className="risk-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function MapMini({ lat, lng }: { lat: number | null; lng: number | null }) {
  const minLat = -23.65, maxLat = -23.45; // SP aproximado
  const minLng = -46.75, maxLng = -46.50;
  const x = lat == null || lng == null ? 50 : ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = lat == null || lng == null ? 50 : (1 - (lat - minLat) / (maxLat - minLat)) * 100;
  return (
    <div className="mapmini" role="img" aria-label="Mini mapa">
      {lat != null && lng != null ? (
        <>
          <div className="mapmini-pin" style={{ left: `${x}%`, top: `${y}%` }} />
          <div className="mapmini-label">{lat.toFixed(4)}, {lng.toFixed(4)}</div>
        </>
      ) : (
        <div className="mapmini-empty">Localização não disponível</div>
      )}
    </div>
  );
}

function IconFilter(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 5h18M7 12h10M10 19h4" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash({ className = "icon" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}



function DemandCard({ d, distance, onDetails, onAccept, onDecline, onChat, onCall }: { d: Demand; distance: number | null; onDetails: () => void; onAccept: () => void; onDecline: () => void; onChat: () => void; onCall: () => void }) {
  return (
    <div className="card" role="article" aria-label={`Demanda de ${d.student_name}`} onClick={onDetails} style={{ cursor: "pointer" }}>
      <div className="card-header">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <strong>{d.student_name}</strong>
        </div>
        <StatusBadge status={d.status} />
      </div>
      <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.5rem" }}>
        <div style={{ display: "grid", gap: "0.25rem" }}>
          <span>{d.address_neighborhood ?? "—"} • {d.city ?? "—"}</span>
          <span>Escola: {d.school_name ?? "—"}</span>
          <span>Idade: {d.student_age} anos</span>
          <span>Tipo: {d.suggested_problem?.replace("_", " ") ?? "—"}</span>
          <span>Distância: {distance != null ? `${distance} km` : "—"}</span>
          {d.guardian_name && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              <span className="chip">Responsável: {d.guardian_name}</span>
            </div>
          )}
          <RiskBar score={d.risk_score ?? 0} />
        </div>

        <div className="section">
          <div className="section-title">Contato</div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span>Telefone: {d.contact_phone ?? "—"}</span>
            <span>Canal preferido: {d.preferred_channel ?? "—"}</span>
          </div>
        </div>

        <div className="section">
          <div className="section-title">Localização</div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span>Endereço: {d.address_street ?? "—"}</span>
            <MapMini lat={d.geo_lat} lng={d.geo_lng} />
          </div>
        </div>

        <div className="section">
          <div className="section-title">Escola e Presença</div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span>Presença 30d: {d.attendance_days_present_30d ?? 0} • Ausência 30d: {d.attendance_days_absent_30d ?? 0}</span>
            <span>
              Notas recentes: {d.grades_last_term ? Object.entries(d.grades_last_term).map(([k, v]) => `${k}: ${v}`).join(" • ") : "—"}
            </span>
            <span>Conduta: {d.behavior_notes ?? "—"}</span>
          </div>
        </div>

        <div className="section">
          <div className="section-title">Saúde (SUS)</div>
          <div>
            {(d.sus_visits ?? []).length === 0 ? "—" : (d.sus_visits ?? [])
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((v, i) => (
                <div key={i}>• {format(new Date(v.date), "dd/MM/yyyy")} — {v.type} — {v.notes ?? ""}</div>
              ))}
          </div>
        </div>
      </div>
      <div className="card-footer" style={{ marginTop: "0.75rem", justifyContent: "flex-end" }}>
        <button className="icon-plain" aria-label="Abrir chat" title="Abrir chat" onClick={(e) => { e.stopPropagation(); onChat(); }}>
          <IconChat className="icon" />
        </button>
        <button className="icon-plain" aria-label="Simular ligação" title="Simular ligação" onClick={(e) => { e.stopPropagation(); onCall(); }}>
          <IconPhone className="icon" />
        </button>
        <button className="icon-plain success" aria-label="Aceitar" title="Aceitar" onClick={(e) => { e.stopPropagation(); onAccept(); }}>
          <IconCheck className="icon" />
        </button>
        <button className="icon-plain danger" aria-label="Recusar" title="Recusar" onClick={(e) => { e.stopPropagation(); onDecline(); }}>
          <IconClose className="icon" />
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"todas" | "aguardando" | "minhas" | "concluidas">("todas");
  const [problemFilter, setProblemFilter] = useState<SuggestedProblem[]>([]);
  const [radiusKm, setRadiusKm] = useState(999);
  const [order, setOrder] = useState<"mais_proximas" | "maior_risco" | "mais_recentes">("mais_proximas");
  const [volLat, setVolLat] = useState<number | null>(null);
  const [volLng, setVolLng] = useState<number | null>(null);
  const [openDemand, setOpenDemand] = useState<Demand | null>(null);
  const [activeTab, setActiveTab] = useState<"detalhes" | "chat" | "timeline">("detalhes");
  const [messages, setMessages] = useState<Message[]>([]);
  const chatSubRef = useRef<any>(null);
  const [sending, setSending] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [dismissedIds, setDismissedIds] = useState<string[]>([]); // local recusa

  const supabaseMissing = !supabase;

  // Feed refs and scroll handler for TikTok-like experience
  const feedRef = useRef<HTMLDivElement | null>(null);
  const onFeedScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!loading && hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setPage((p) => p + 1);
    }
  };
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVolLat(pos.coords.latitude);
        setVolLng(pos.coords.longitude);
      },
      () => {
        setVolLat(-23.55052);
        setVolLng(-46.633308);
      },
      { enableHighAccuracy: true, timeout: 3000 }
    );
  }, []);

  async function fetchDemands(initial = false) {
    if (supabaseMissing) { setLoading(false); setHasMore(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("demands")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error) throw error;
      setDemands((prev) => {
        const nextList = initial ? (data as any) : [...prev, ...(data as any)];
        const byId = new Map<string, Demand>();
        for (const item of nextList as any[]) {
          if (item?.id) byId.set(item.id, item);
        }
        return Array.from(byId.values());
      });
      setHasMore(((data as any)?.length ?? 0) === pageSize);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Falha ao carregar demandas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDemands(true); }, []);
  useEffect(() => { if (page > 0) fetchDemands(false); }, [page]);


  const filtered = useMemo(() => {
    let list = demands.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        (d.student_name ?? "").toLowerCase().includes(q) ||
        (d.address_neighborhood ?? "").toLowerCase().includes(q) ||
        (d.school_name ?? "").toLowerCase().includes(q)
      );
    }
    if (status !== "todas") {
      list = list.filter((d) =>
        status === "aguardando" ? d.status === "aguardando_voluntario" :
        status === "minhas" ? d.status === "em_progresso" :
        d.status === "concluida"
      );
    }
    if (problemFilter.length > 0) list = list.filter((d) => d.suggested_problem && problemFilter.includes(d.suggested_problem));
    // remover recusadas localmente
    list = list.filter((d) => !dismissedIds.includes(d.id));
    // distância e ordenação
    list = list.filter((d) => {
      if (volLat == null || volLng == null) return true;
      const dist = distanceKm(volLat, volLng, d.geo_lat, d.geo_lng);
      return dist == null || dist <= radiusKm;
    });
    list.sort((a, b) => {
      if (order === "maior_risco") return (b.risk_score ?? 0) - (a.risk_score ?? 0);
      if (order === "mais_recentes") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      const da = distanceKm(volLat, volLng, a.geo_lat, a.geo_lng) ?? Infinity;
      const db = distanceKm(volLat, volLng, b.geo_lat, b.geo_lng) ?? Infinity;
      return da - db;
    });
    return list;
  }, [demands, search, status, problemFilter, volLat, volLng, radiusKm, order, dismissedIds]);

  function openDetails(d: Demand) {
    setOpenDemand(d);
    setActiveTab("detalhes");
    loadMessages(d.id);
    subscribeChat(d.id);
  }

  function openChat(d: Demand) {
    setOpenDemand(d);
    setActiveTab("chat");
    loadMessages(d.id);
    subscribeChat(d.id);
  }

  function closePanel() {
    setOpenDemand(null);
    setMessages([]);
    setActiveTab("detalhes");
    if (chatSubRef.current) chatSubRef.current.unsubscribe();
    chatSubRef.current = null;
  }

  // Fechar com tecla Escape para maior acessibilidade
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openDemand) {
        e.preventDefault();
        closePanel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDemand]);

  function getMockMessages(demandId: string): Message[] {
    const now = Date.now();
    const t = (mins: number) => new Date(now - mins * 60 * 1000).toISOString() as any;
    return [
      { id: `mock-${demandId}-1`, created_at: t(60 * 24 * 2), demand_id: demandId, sender: "familia", content: "Olá, bom dia! Precisamos de ajuda com transporte para as consultas." } as any,
      { id: `mock-${demandId}-2`, created_at: t(60 * 24 * 2 - 15), demand_id: demandId, sender: "voluntario", content: "Claro! Vou verificar disponibilidade para esta semana." } as any,
      { id: `mock-${demandId}-3`, created_at: t(60 * 24), demand_id: demandId, sender: "familia", content: "Muito obrigado! Segunda ou terça seria ótimo." } as any,
      { id: `mock-${demandId}-4`, created_at: t(60 * 24 - 30), demand_id: demandId, sender: "voluntario", content: "Perfeito, posso na terça às 14h. Combinado?" } as any,
    ];
  }

  async function loadMessages(demandId: string) {
    if (supabaseMissing) { setMessages(getMockMessages(demandId)); return; }
    const { data } = await supabase.from("messages").select("*").eq("demand_id", demandId).order("created_at", { ascending: true });
    setMessages((data as any) || []);
  }

  function subscribeChat(demandId: string) {
    if (chatSubRef.current) chatSubRef.current.unsubscribe();
    chatSubRef.current = supabase
      .channel(`messages:${demandId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `demand_id=eq.${demandId}` }, (payload: any) => {
        setMessages((prev) => [...prev, payload.new as any]);
      })
      .subscribe();
  }

  async function sendMessage() {
    if (!openDemand || !chatInput.trim()) return;
    setSending(true);
    if (supabaseMissing) {
      const msg: Message = {
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString() as any,
        demand_id: openDemand.id,
        sender: "voluntario",
        content: chatInput.trim(),
      } as any;
      setMessages((prev) => [...prev, msg]);
      setSending(false);
      setChatInput("");
      return;
    }
    const { error } = await supabase
      .from("messages")
      .insert({ demand_id: openDemand.id, sender: "voluntario", content: chatInput.trim() });
    setSending(false);
    if (!error) setChatInput("");
  }

  async function acceptDemand(d: Demand) {
    if (supabaseMissing) { alert("Configure Supabase para aceitar demandas."); return; }
    const name = prompt("Digite seu nome para aceitar a demanda:") || "";
    if (!name) return;
    const { error } = await supabase.from("demands").update({ status: "em_progresso", assigned_volunteer_name: name }).eq("id", d.id);
    if (error) return alert("Falha ao aceitar: " + error.message);
    setDemands((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: "em_progresso", assigned_volunteer_name: name } : x)));
  }

  async function concludeDemand(d: Demand) {
    if (supabaseMissing) { alert("Configure Supabase para concluir demandas."); return; }
    const { error } = await supabase.from("demands").update({ status: "concluida" }).eq("id", d.id);
    if (error) return alert("Falha ao concluir: " + error.message);
    setDemands((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: "concluida" } : x)));
  }

  async function simulateCall(d: Demand) {
    if (supabaseMissing) {
      const msg: Message = {
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString() as any,
        demand_id: d.id,
        sender: "sistema",
        content: "Ligação simulada ao responsável.",
      } as any;
      setMessages((prev) => [...prev, msg]);
      return;
    }
    await supabase.from("messages").insert({ demand_id: d.id, sender: "sistema", content: "Ligação simulada ao responsável." });
  }

  return (
    <div className="container" role="main" aria-label="Todas as Demandas">
      {supabaseMissing && (
        <div role="alert" style={{ background: "#fffaf0", border: "1px solid #faf089", padding: "0.5rem", borderRadius: 8, marginBottom: "0.75rem" }}>
          Configure as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para carregar dados.
        </div>
      )}
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--rs-blue)", marginBottom: "0.75rem" }}>RotaSocial — Conexões</h1>

      {loading && demands.length === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card" aria-busy="true" style={{ height: 140, background: "#f7fafc" }} />
          ))}
        </div>
      )}

      {error && <div role="alert" style={{ marginTop: "0.75rem", color: "#c53030" }}>Erro: {error}</div>}

      {!loading && filtered.length === 0 && (
        <div role="status" style={{ marginTop: "0.75rem" }}>Nenhuma demanda encontrada com os filtros atuais.</div>
      )}

      <div className="feed" onScroll={onFeedScroll} ref={feedRef} style={{ marginTop: "0.5rem" }}>
        {filtered.map((d) => {
          const dist = distanceKm(volLat, volLng, d.geo_lat, d.geo_lng);
          return (
            <div className="feed-item" key={d.id}>
              <DemandCard
                d={d}
                distance={dist}
                onDetails={() => openDetails(d)}
                onAccept={() => acceptDemand(d)}
                onDecline={() => setDismissedIds((prev) => [...prev, d.id])}
                onChat={() => openChat(d)}
                onCall={() => simulateCall(d)}
              />
            </div>
          );
        })}
      </div>



      {openDemand && (
        <div className="sidepanel" role="dialog" aria-modal="true" aria-label="Detalhe da Demanda">
          <div className="sidepanel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>{openDemand.student_name}</strong>
            <button className="btn btn-ghost" aria-label="Fechar" onClick={closePanel}><IconClose className="icon" />Fechar</button>
          </div>
          <div className="tabs">
            <button className={`tab ${activeTab === "detalhes" ? "tab-active" : ""}`} onClick={() => setActiveTab("detalhes")}><IconEye className="icon" />Detalhes</button>
            <button className={`tab ${activeTab === "chat" ? "tab-active" : ""}`} onClick={() => setActiveTab("chat")}><IconChat className="icon" />Chat</button>
            <button className={`tab ${activeTab === "timeline" ? "tab-active" : ""}`} onClick={() => setActiveTab("timeline")}><IconTimeline className="icon" />Linha do Tempo</button>
          </div>
          <div className="sidepanel-body">
            {activeTab === "detalhes" && (
              <>
                <div className="section">
                  <div className="section-title">Responsável e Contato</div>
                  <div style={{ display: "grid", gap: "0.25rem" }}>
                    <span>Idade: {openDemand.student_age} anos</span>
                    <span>Responsável: {openDemand.guardian_name}</span>
                    <span>Telefone: {openDemand.contact_phone} • Canal: {openDemand.preferred_channel}</span>
                  </div>
                </div>
                <div className="section">
                  <div className="section-title">Endereço e Localização</div>
                  <div style={{ display: "grid", gap: "0.25rem" }}>
                    <span>Endereço: {openDemand.address_street ?? "—"}</span>
                    <span>Bairro/Cidade: {openDemand.address_neighborhood ?? "—"} • {openDemand.city ?? "—"}</span>
                    <MapMini lat={openDemand.geo_lat} lng={openDemand.geo_lng} />
                    <span>Distância até você: {distanceKm(volLat, volLng, openDemand.geo_lat, openDemand.geo_lng) ?? "—"} km</span>
                  </div>
                </div>
                <div className="section">
                  <div className="section-title">Escola e Presença</div>
                  <div style={{ display: "grid", gap: "0.25rem" }}>
                    <span>Escola: {openDemand.school_name ?? "—"}</span>
                    <span>Presença 30d: {openDemand.attendance_days_present_30d ?? 0} • Ausência 30d: {openDemand.attendance_days_absent_30d ?? 0}</span>
                    <span>
                      Notas recentes: {openDemand.grades_last_term ? Object.entries(openDemand.grades_last_term).map(([k, v]) => `${k}: ${v}`).join(" • ") : "—"}
                    </span>
                    <span>Conduta: {openDemand.behavior_notes ?? "—"}</span>
                  </div>
                </div>
                <div className="section">
                  <div className="section-title">Saúde (SUS)</div>
                  <div>
                    {(openDemand.sus_visits ?? []).length === 0 ? "—" : (openDemand.sus_visits ?? [])
                      .slice()
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((v, i) => (
                        <div key={i}>• {format(new Date(v.date), "dd/MM/yyyy")} — {v.type} — {v.notes ?? ""}</div>
                      ))}
                  </div>
                </div>
                <div className="section">
                  <div className="section-title">Status e Consentimento</div>
                  <div style={{ display: "grid", gap: "0.25rem" }}>
                    <span>Problema sugerido: {openDemand.suggested_problem?.replace("_", " ") ?? "—"}</span>
                    <span>
                      Consentimento: {openDemand.consent_granted_at ? `Consentimento concedido em ${format(new Date(openDemand.consent_granted_at), "dd/MM/yyyy")}` : "Sem registro de consentimento"}
                    </span>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <StatusBadge status={openDemand.status} />
                    </div>
                  </div>
                </div>
              </>
            )}
            {activeTab === "chat" && (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div className="wa-messages">
                  {messages.map((m) => (
                    <div key={m.id} className={`wa-bubble ${m.sender === "voluntario" ? "wa-out" : "wa-in"}`}>
                      {m.content}
                      <div className="wa-time">{format(new Date(m.created_at), "HH:mm")}</div>
                    </div>
                  ))}
                </div>
                <div className="chat-bar">
                  <input
                    className="chat-input"
                    placeholder="Digite sua mensagem"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    aria-label="Mensagem"
                  />
                  <button className="btn btn-success chat-send" disabled={sending || !chatInput.trim()} onClick={sendMessage} aria-label="Enviar mensagem">
                    <IconChat className="icon" /> Enviar
                  </button>
                </div>
              </div>
            )}
            {activeTab === "timeline" && (
                <div className="timeline" role="feed" aria-label="Linha do Tempo">
                  <div className="timeline-line" />
                  {buildTimeline(openDemand, messages).map((ev, i) => (
                    <div key={i} className="timeline-item">
                      <div className={`timeline-dot ${ev.kind}`} />
                      <div className="timeline-card">
                        <div className="timeline-title">{ev.title}</div>
                        <div className="timeline-date">{format(ev.date, "dd/MM/yyyy HH:mm")}</div>
                        {ev.description && <div className="timeline-desc">{ev.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
          <div className="sidepanel-footer">
            {openDemand.status === "aguardando_voluntario" && (
              <button className="btn btn-success" onClick={() => acceptDemand(openDemand)}><IconCheck className="icon" />Aceitar Demanda</button>
            )}
            <button className="btn btn-success" onClick={() => setActiveTab("chat")}><IconChat className="icon" />Entrar em Contato (Chat)</button>
            <button className="btn btn-warning" onClick={() => simulateCall(openDemand)}><IconPhone className="icon" />Ligar</button>
            {openDemand.status !== "concluida" && (
              <button className="btn" style={{ background: "#718096", color: "#fff" }} onClick={() => concludeDemand(openDemand)}>
                <IconCheck className="icon" />Marcar como Concluída
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buildTimeline(d: Demand, msgs: Message[]) {
  const events: { title: string; description?: string; date: Date; kind: "success" | "warning" | "gray" | "neutral" }[] = [];
  if (d.created_at) events.push({ title: "Demanda criada", description: `${d.student_name} — ${d.city ?? ""}`.trim(), date: new Date(d.created_at), kind: "gray" });
  if (d.consent_granted_at) events.push({ title: "Consentimento concedido", description: "Responsável autorizou contato.", date: new Date(d.consent_granted_at), kind: "neutral" });
  if (d.status === "em_progresso" && d.assigned_volunteer_name) {
    events.push({ title: "Voluntário aceitou", description: d.assigned_volunteer_name, date: new Date(d.created_at), kind: "success" });
  }
  msgs.slice(0, 3).forEach((m) => {
    const author = m.sender === "voluntario" ? "Voluntário" : m.sender === "familia" ? "Família" : "Sistema";
    events.push({ title: `Mensagem — ${author}`, description: m.content, date: new Date(m.created_at as any), kind: "neutral" });
  });
  if (d.status === "concluida") {
    events.push({ title: "Demanda concluída", description: "Caso finalizado com sucesso.", date: new Date(), kind: "success" });
  }
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}
