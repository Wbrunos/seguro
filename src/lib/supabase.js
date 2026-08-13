import { createClient } from '@supabase/supabase-js';

const getEnv = (key, fallback) => {
  let val = undefined;
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      val = import.meta.env[key];
    }
  } catch (e) {}
  
  if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
    console.log(`Supabase Setup: using fallback for ${key}`);
    return fallback;
  }
  
  console.log(`Supabase Setup: using configured env for ${key}`);
  return val;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://pwgzdfklszjzqgqziaks.supabase.co');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3Z3pkZmtsc3pqenFncXppYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1ODQ3NjQsImV4cCI6MjEwMjE2MDc2NH0.JYCo0ucY_p1kOimhEiROD9qR_yNoVrmnzSfHZkWYecs');

console.log('Supabase final URL used:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const TABLE_NAME = 'seg_bradesco_leads';
export const USERS_TABLE = 'seg_usuarios';

export const STATUS_LIGACAO = {
  pendente: { label: 'Pendente', color: '#b45309', bg: 'rgba(217, 119, 6, 0.12)' },
  bem_sucedida: { label: 'Bem Sucedida', color: '#15803d', bg: 'rgba(22, 163, 74, 0.12)' },
  tentar_novamente: { label: 'Tentar Novamente', color: '#0369a1', bg: 'rgba(2, 132, 199, 0.12)' },
  sem_exito: { label: 'Sem Êxito', color: '#b91c1c', bg: 'rgba(220, 38, 38, 0.12)' },
};
