import Papa from 'papaparse';

/**
 * Parses a CSV file (Bradesco format) and returns cleaned JSON data.
 * Handles quoted fields with commas (e.g., "R$1.193,36").
 * Skips rows with empty CPF.
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const cleaned = results.data
          .filter((row) => row.CPF && row.CPF.trim() !== '')
          .map((row) => ({
            cpf: (row.CPF || '').trim(),
            nome: (row['NOME '] || row.NOME || '').trim(),
            valor: (row['VALOR '] || row.VALOR || '').trim(),
            cidade: (row['CIDADE '] || row.CIDADE || '').trim(),
            telefone: (row.TELEFONE || '').trim(),
            orgao: (row['ORGÃO'] || row.ORGAO || '').trim(),
            banco: (row['BANCO '] || row.BANCO || 'BRADESCO').trim(),
            status_original: (row.STATUS || '').trim(),
            status_ligacao: 'pendente',
          }));
        resolve(cleaned);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Extracts lote name from filename.
 * Example: "Bradesco 12:08:2026 .csv" -> "Bradesco 12/08/2026"
 */
export function extractLoteName(filename) {
  const name = filename.replace(/\.csv$/i, '').trim();
  // Replace colons with slashes for date formatting
  return name.replace(/:/g, '/');
}
