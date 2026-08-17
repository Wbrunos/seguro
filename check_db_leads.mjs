import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.pwgzdfklszjzqgqziaks:GK1sb4S509vqzWnX@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function run() {
  const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

  try {
    const results = await sql`
      SELECT id, cpf, nome, valor, tipo_lista, lote_upload 
      FROM seg_bradesco_leads 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    console.log('📋 Últimos 10 registros salvos no Supabase:');
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.end();
  }
}

run();
