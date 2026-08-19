import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.pwgzdfklszjzqgqziaks:GK1sb4S509vqzWnX@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function run() {
  const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

  try {
    console.log('🗑️ Removendo tabela antiga seg_bradesco_leads...');
    await sql`DROP TABLE IF EXISTS seg_bradesco_leads`;

    console.log('🆕 Criando nova tabela leads_geral...');
    await sql`
      CREATE TABLE IF NOT EXISTS leads_geral (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE,
        telefone TEXT,
        local TEXT,
        cargo TEXT,
        matricula TEXT,
        empresa TEXT,
        valor TEXT,
        pct_comissao NUMERIC,
        valor_comissao NUMERIC,
        valor_comissao_receber NUMERIC,
        status_original TEXT,
        status_ligacao TEXT DEFAULT 'pendente',
        observacao TEXT,
        lote_upload TEXT,
        data_lote DATE,
        tipo_lista TEXT,
        usuario_designado_id UUID REFERENCES seg_usuarios(id) ON DELETE SET NULL,
        usuario_designado_nome TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    console.log('🆕 Criando tabela de configurações seg_configuracoes...');
    await sql`
      CREATE TABLE IF NOT EXISTS seg_configuracoes (
        chave TEXT PRIMARY KEY,
        valor JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Insert default columns visibility configuration
    const defaultCols = {
      operador: ['nome', 'cpf', 'telefone', 'empresa', 'valor', 'status', 'observacao'],
      gerente: ['nome', 'cpf', 'telefone', 'local', 'cargo', 'matricula', 'empresa', 'valor', 'comissao', 'comissao_receber', 'status', 'observacao']
    };
    
    await sql`
      INSERT INTO seg_configuracoes (chave, valor)
      VALUES ('colunas_visiveis', ${JSON.stringify(defaultCols)})
      ON CONFLICT (chave) DO NOTHING
    `;

    console.log('✅ Migração concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
  } finally {
    await sql.end();
  }
}

run();
