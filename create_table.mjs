/**
 * Script para criar a tabela seg_bradesco_leads no Supabase
 * Usa a API SQL-over-HTTP com a service_role key
 */

const SUPABASE_URL = 'https://pwgzdfklszjzqgqziaks.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3Z3pkZmtsc3pqenFncXppYWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU4NDc2NCwiZXhwIjoyMTAyMTYwNzY0fQ.kMWUxJpAZKWDkWrvv4xRRy3C8dJfZ1KJ91R_OeX4tZc';

const SQL = `
CREATE TABLE IF NOT EXISTS seg_bradesco_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  valor TEXT,
  cidade TEXT,
  telefone TEXT,
  orgao TEXT,
  banco TEXT DEFAULT 'BRADESCO',
  status_original TEXT,
  status_ligacao TEXT DEFAULT 'pendente'
    CHECK (status_ligacao IN ('pendente', 'bem_sucedida', 'tentar_novamente', 'sem_exito')),
  observacao TEXT,
  lote_upload TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_seg_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS seg_bradesco_leads_updated ON seg_bradesco_leads;
CREATE TRIGGER seg_bradesco_leads_updated
  BEFORE UPDATE ON seg_bradesco_leads
  FOR EACH ROW EXECUTE FUNCTION update_seg_updated_at();

-- Indices
CREATE INDEX IF NOT EXISTS idx_seg_bradesco_cpf ON seg_bradesco_leads(cpf);
CREATE INDEX IF NOT EXISTS idx_seg_bradesco_status ON seg_bradesco_leads(status_ligacao);
CREATE INDEX IF NOT EXISTS idx_seg_bradesco_lote ON seg_bradesco_leads(lote_upload);

-- RLS
ALTER TABLE seg_bradesco_leads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_select_seg_bradesco') THEN
    CREATE POLICY "anon_select_seg_bradesco" ON seg_bradesco_leads FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_seg_bradesco') THEN
    CREATE POLICY "anon_insert_seg_bradesco" ON seg_bradesco_leads FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_update_seg_bradesco') THEN
    CREATE POLICY "anon_update_seg_bradesco" ON seg_bradesco_leads FOR UPDATE TO anon USING (true);
  END IF;
END $$;
`;

async function createTable() {
  console.log('🔄 Tentando criar tabela via SQL-over-HTTP...');
  
  // Try the /pg endpoint (Supabase SQL over HTTP)
  const endpoints = [
    `${SUPABASE_URL}/pg`,
    `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
  ];
  
  // Method 1: Try /pg endpoint (newer Supabase instances)
  try {
    console.log('\\n📡 Tentativa 1: /pg endpoint...');
    const res = await fetch(`${SUPABASE_URL}/pg`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: SQL }),
    });
    
    const text = await res.text();
    console.log(`  Status: ${res.status}`);
    console.log(`  Response: ${text.substring(0, 500)}`);
    
    if (res.ok) {
      console.log('\\n✅ Tabela criada com sucesso via /pg!');
      return;
    }
  } catch (err) {
    console.log(`  Erro: ${err.message}`);
  }

  // Method 2: Try individual statements via /pg/query
  try {
    console.log('\\n📡 Tentativa 2: /pg/query endpoint...');
    const res = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: SQL }),
    });
    
    const text = await res.text();
    console.log(`  Status: ${res.status}`);
    console.log(`  Response: ${text.substring(0, 500)}`);
    
    if (res.ok) {
      console.log('\\n✅ Tabela criada com sucesso via /pg/query!');
      return;
    }
  } catch (err) {
    console.log(`  Erro: ${err.message}`);
  }

  // Method 3: Try Supabase Management API-style SQL endpoint
  try {
    console.log('\\n📡 Tentativa 3: /sql endpoint...');
    const res = await fetch(`${SUPABASE_URL}/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: SQL }),
    });
    
    const text = await res.text();
    console.log(`  Status: ${res.status}`);
    console.log(`  Response: ${text.substring(0, 500)}`);
    
    if (res.ok) {
      console.log('\\n✅ Tabela criada com sucesso via /sql!');
      return;
    }
  } catch (err) {
    console.log(`  Erro: ${err.message}`);
  }

  console.log('\\n⚠️ Nenhum endpoint SQL-over-HTTP funcionou.');
  console.log('\\n📋 O SQL deve ser executado manualmente no Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/pwgzdfklszjzqgqziaks/sql/new');
  console.log('\\n   Cole o conteúdo do arquivo supabase_setup.sql');
}

createTable();
