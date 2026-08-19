import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwgzdfklszjzqgqziaks.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3Z3pkZmtsc3pqenFncXppYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1ODQ3NjQsImV4cCI6MjEwMjE2MDc2NH0.JYCo0ucY_p1kOimhEiROD9qR_yNoVrmnzSfHZkWYecs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const TABLE_NAME = 'leads_geral';
export const USERS_TABLE = 'seg_usuarios';

// Try to load dynamic status configs if saved locally, otherwise use standard defaults
const getSavedStatuses = () => {
  try {
    const saved = localStorage.getItem('seguro_statuses_config');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return {
    pendente: { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)' },
    bem_sucedida: { label: 'Bem Sucedida', color: '#10b981', bg: 'rgba(16, 185, 129, 0.18)' },
    tentar_novamente: { label: 'Ligar Novamente', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)' },
    sem_exito: { label: 'Sem Êxito', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)' },
  };
};

export const STATUS_LIGACAO = getSavedStatuses();
