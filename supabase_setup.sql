-- ============================================================
-- Tabela: seg_bradesco_leads
-- Upload de planilhas Bradesco com controle de ligação
-- ============================================================

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

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_seg_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seg_bradesco_leads_updated
  BEFORE UPDATE ON seg_bradesco_leads
  FOR EACH ROW EXECUTE FUNCTION update_seg_updated_at();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_seg_bradesco_cpf ON seg_bradesco_leads(cpf);
CREATE INDEX IF NOT EXISTS idx_seg_bradesco_status ON seg_bradesco_leads(status_ligacao);
CREATE INDEX IF NOT EXISTS idx_seg_bradesco_lote ON seg_bradesco_leads(lote_upload);

-- RLS (Row Level Security)
ALTER TABLE seg_bradesco_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_seg_bradesco" ON seg_bradesco_leads
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_seg_bradesco" ON seg_bradesco_leads
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_seg_bradesco" ON seg_bradesco_leads
  FOR UPDATE TO anon USING (true);

CREATE POLICY "auth_select_seg_bradesco" ON seg_bradesco_leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_seg_bradesco" ON seg_bradesco_leads
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_seg_bradesco" ON seg_bradesco_leads
  FOR UPDATE TO authenticated USING (true);
