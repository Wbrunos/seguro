import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.pwgzdfklszjzqgqziaks:GK1sb4S509vqzWnX@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function run() {
  const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

  try {
    const results = await sql`
      DELETE FROM seg_bradesco_leads
    `;
    console.log('✅ Todos os leads de qualquer segmento foram removidos do Supabase!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.end();
  }
}

run();
