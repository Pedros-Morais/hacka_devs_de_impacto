export type PreferredChannel = 'whatsapp' | 'ligacao' | 'sms';
export type SuggestedProblem = 'transporte' | 'terapia_emocional' | 'fisioterapia' | 'inseguranca_alimentar' | 'apoio_financeiro' | 'reforco_escolar' | 'outro';
export type Status = 'aguardando_voluntario' | 'em_progresso' | 'concluida';
export type Sender = 'voluntario' | 'familia' | 'sistema';

export interface Demand {
  id: string;
  created_at: string;
  student_name: string;
  student_age: number;
  guardian_name: string;
  contact_phone: string;
  preferred_channel: PreferredChannel;
  address_street: string | null;
  address_neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  school_name: string | null;
  attendance_days_present_30d: number | null;
  attendance_days_absent_30d: number | null;
  grades_last_term: Record<string, number> | null;
  behavior_notes: string | null;
  sus_visits: Array<{ date: string; type: string; notes?: string }> | null;
  suggested_problem: SuggestedProblem | null;
  risk_score: number | null;
  consent_granted_at: string | null; // date string
  status: Status;
  assigned_volunteer_name: string | null;
}

export interface Message {
  id: string;
  created_at: string;
  demand_id: string;
  sender: Sender;
  content: string;
}