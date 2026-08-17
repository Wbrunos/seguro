/**
 * Adiciona a coluna tipo_lista na tabela de leads
 */
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.pwgzdfklszjzqgqziaks:GK1sb4S509vqzWnX@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function run() {
  console.log('🔄 Adicionando coluna tipo_lista à tabela seg_bradesco_leads...');
  const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

  try {
    await sql`ALTER TABLE seg_bradesco_leads ADD COLUMN IF NOT EXISTS tipo_lista TEXT DEFAULT 'BRADESCO'`;
    console.log('✅ Coluna "tipo_lista" adicionada com sucesso!');
  } catch (err) {
    console.error('❌ Falha ao migrar banco:', err.message);
  } finally {
    await sql.end();
  }
}

run();
