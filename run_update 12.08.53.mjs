/**
 * Executa a atualização na tabela de usuários para incluir bloqueio.
 */
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.pwgzdfklszjzqgqziaks:GK1sb4S509vqzWnX@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function run() {
  console.log('🔄 Atualizando tabela seg_usuarios...');
  const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

  try {
    await sql`ALTER TABLE seg_usuarios ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT false`;
    console.log('✅ Coluna "bloqueado" adicionada com sucesso!');
  } catch (err) {
    console.error('❌ Falha:', err.message);
  } finally {
    await sql.end();
  }
}

run();
