/**
 * Executa SQL diretamente no Supabase via connection string (Postgres.js)
 * Ref do projeto: pwgzdfklszjzqgqziaks
 */
import postgres from 'postgres';

// Connection string do Supabase (pooler mode - transaction)
// Formato: postgresql://postgres.[ref]:[password]@[host]:6543/postgres
const DATABASE_URL = 'postgresql://postgres.pwgzdfklszjzqgqziaks:GK1sb4S509vqzWnX@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

// Também tenta a connection string direta (porta 5432)
const DATABASE_URL_DIRECT = 'postgresql://postgres.pwgzdfklszjzqgqziaks:GK1sb4S509vqzWnX@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

const SQL_STATEMENTS = [
  // 1. Criar tabela
  `CREATE TABLE IF NOT EXISTS seg_bradesco_leads (
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
  )`,

  // 2. Função trigger
  `CREATE OR REPLACE FUNCTION update_seg_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

  // 3. Drop trigger antigo (se existir)
  `DROP TRIGGER IF EXISTS seg_bradesco_leads_updated ON seg_bradesco_leads`,

  // 4. Criar trigger
  `CREATE TRIGGER seg_bradesco_leads_updated
    BEFORE UPDATE ON seg_bradesco_leads
    FOR EACH ROW EXECUTE FUNCTION update_seg_updated_at()`,

  // 5. Índices
  `CREATE INDEX IF NOT EXISTS idx_seg_bradesco_cpf ON seg_bradesco_leads(cpf)`,
  `CREATE INDEX IF NOT EXISTS idx_seg_bradesco_status ON seg_bradesco_leads(status_ligacao)`,
  `CREATE INDEX IF NOT EXISTS idx_seg_bradesco_lote ON seg_bradesco_leads(lote_upload)`,

  // 6. RLS
  `ALTER TABLE seg_bradesco_leads ENABLE ROW LEVEL SECURITY`,

  // 7. Policies
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_select_seg_bradesco') THEN
      CREATE POLICY "anon_select_seg_bradesco" ON seg_bradesco_leads FOR SELECT TO anon USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_seg_bradesco') THEN
      CREATE POLICY "anon_insert_seg_bradesco" ON seg_bradesco_leads FOR INSERT TO anon WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_update_seg_bradesco') THEN
      CREATE POLICY "anon_update_seg_bradesco" ON seg_bradesco_leads FOR UPDATE TO anon USING (true);
    END IF;
  END $$`,
];

async function run() {
  // Tenta com pooler primeiro, depois direto
  const urls = [DATABASE_URL, DATABASE_URL_DIRECT];

  for (const url of urls) {
    const label = url.includes(':6543') ? 'Pooler (6543)' : 'Direto (5432)';
    console.log(`\n🔄 Tentando conexão: ${label}...`);

    try {
      const sql = postgres(url, {
        ssl: { rejectUnauthorized: false },
        connect_timeout: 10,
        idle_timeout: 5,
      });

      // Teste de conexão
      const test = await sql`SELECT NOW() as time`;
      console.log(`✅ Conectado! Hora do servidor: ${test[0].time}`);

      // Executar cada statement
      for (let i = 0; i < SQL_STATEMENTS.length; i++) {
        try {
          await sql.unsafe(SQL_STATEMENTS[i]);
          console.log(`  ✅ Statement ${i + 1}/${SQL_STATEMENTS.length} executado`);
        } catch (err) {
          console.log(`  ⚠️ Statement ${i + 1}: ${err.message}`);
        }
      }

      // Verificar se a tabela foi criada
      const tables = await sql`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'seg_bradesco_leads'
      `;
      
      if (tables.length > 0) {
        console.log('\n🎉 Tabela seg_bradesco_leads criada/confirmada com sucesso!');
        
        // Mostrar colunas
        const cols = await sql`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'seg_bradesco_leads' 
          ORDER BY ordinal_position
        `;
        console.log('\n📋 Colunas da tabela:');
        cols.forEach(c => console.log(`   ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`));
      }

      await sql.end();
      console.log('\n✅ Conexão encerrada.');
      return;
    } catch (err) {
      console.log(`  ❌ Falha: ${err.message}`);
    }
  }

  console.log('\n❌ Não foi possível conectar ao banco. Verifique a senha do banco de dados.');
  console.log('   Vá em: Supabase Dashboard > Settings > Database > Database Password');
}

run();
