import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.pwgzdfklszjzqgqziaks:GK1sb4S509vqzWnX@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function run() {
  const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

  try {
    console.log('🗑️ Apagando tabela leads_geral...');
    await sql`DROP TABLE IF EXISTS leads_geral`;

    console.log('🆕 Criando nova tabela leads_geral com índice UNIQUE...');
    await sql`
      CREATE TABLE leads_geral (
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
    console.log('✅ Recriação concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.end();
  }
}

run();
