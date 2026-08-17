import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.pwgzdfklszjzqgqziaks:GK1sb4S509vqzWnX@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function run() {
  const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

  try {
    const results = await sql`
      DELETE FROM seg_bradesco_leads 
      WHERE tipo_lista = 'TJPB'
    `;
    console.log('✅ Leads com segmento TJPB removidos com sucesso direto do banco!');
  } catch (err) {
    console.error('❌ Erro ao remover:', err.message);
  } finally {
    await sql.end();
  }
}

run();
