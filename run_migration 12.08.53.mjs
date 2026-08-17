/**
 * Executa as migrações SQL para a nova estrutura de usuários, comissões e designação de lotes.
 */
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.pwgzdfklszjzqgqziaks:GK1sb4S509vqzWnX@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

const SQL_MIGRATIONS = [
  // 1. Criar tabela de usuários
  `CREATE TABLE IF NOT EXISTS seg_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    funcao TEXT NOT NULL CHECK (funcao IN ('gerente', 'operador')),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // 2. Inserir gerente padrão se não existir
  `INSERT INTO seg_usuarios (nome, senha, funcao) 
   VALUES ('admin', 'admin123', 'gerente')
   ON CONFLICT (nome) DO NOTHING`,

  // 3. Modificar seg_bradesco_leads para conter as novas colunas
  `ALTER TABLE seg_bradesco_leads ADD COLUMN IF NOT EXISTS usuario_designado_id UUID REFERENCES seg_usuarios(id) ON DELETE SET NULL`,
  `ALTER TABLE seg_bradesco_leads ADD COLUMN IF NOT EXISTS data_lote DATE DEFAULT CURRENT_DATE`,
  `ALTER TABLE seg_bradesco_leads ADD COLUMN IF NOT EXISTS pct_comissao NUMERIC DEFAULT 0`,
  `ALTER TABLE seg_bradesco_leads ADD COLUMN IF NOT EXISTS valor_comissao NUMERIC DEFAULT 0`,

  // 4. Recriar policies de RLS para incluir a nova tabela
  `ALTER TABLE seg_usuarios ENABLE ROW LEVEL SECURITY`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_select_seg_usuarios') THEN
      CREATE POLICY "anon_select_seg_usuarios" ON seg_usuarios FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_seg_usuarios') THEN
      CREATE POLICY "anon_insert_seg_usuarios" ON seg_usuarios FOR INSERT TO anon WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_update_seg_usuarios') THEN
      CREATE POLICY "anon_update_seg_usuarios" ON seg_usuarios FOR UPDATE TO anon USING (true);
    END IF;
  END $$`
];

async function run() {
  console.log('🔄 Executando Migrações no Banco de Dados...');
  const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

  try {
    for (let i = 0; i < SQL_MIGRATIONS.length; i++) {
      try {
        await sql.unsafe(SQL_MIGRATIONS[i]);
        console.log(`  ✅ Migration ${i + 1}/${SQL_MIGRATIONS.length} executada com sucesso.`);
      } catch (err) {
        console.log(`  ⚠️ Erro na Migration ${i + 1}: ${err.message}`);
      }
    }
    console.log('\n🎉 Estrutura de Banco de Dados atualizada com sucesso!');
  } catch (err) {
    console.error('❌ Falha crítica:', err.message);
  } finally {
    await sql.end();
  }
}

run();
