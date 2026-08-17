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
      skipEmptyLines: 'greedy',
      encoding: 'UTF-8',
      delimiter: "", // Auto-detect delimiter
      complete: (results) => {
        // Clean lines: TJPB might have a few empty header rows, filter them
        const cleaned = results.data
          .map((row) => {
            // Read keys ignoring casing and spaces
            const keys = Object.keys(row);
            
            // If the row is parsed as a single string due to delimiter mismatch, or has no keys, getVal will check
            const getVal = (possibleKeys) => {
              const foundKey = keys.find(k => {
                const kClean = k.trim().toLowerCase();
                return possibleKeys.some(pk => kClean.includes(pk) || pk.includes(kClean));
              });
              return foundKey ? row[foundKey] : '';
            };

            // Map CPF / Matricula (Matr.)
            let cpfVal = getVal(['cpf', 'matr.', 'matr', 'matricula', 'id']);
            // Map Nome / Servidor
            let nomeVal = getVal(['nome', 'servidor', 'funcionario']);
            // Map Valor
            let valorVal = getVal(['valor']);
            // Map Cidade / Comarca / Setor
            let cidadeVal = getVal(['cidade', 'comarca/setor/vara', 'comarca', 'setor', 'exercício']);
            // Map Telefone
            let telefoneVal = getVal(['telefone', 'tel']);
            // Map Orgao / Cargo Efetivo
            let orgaoVal = getVal(['orgão', 'orgao', 'cargo efetivo', 'cargo']);

            return {
              cpf: (cpfVal || '').trim(),
              nome: (nomeVal || '').trim(),
              valor: (valorVal || '').trim(),
              cidade: (cidadeVal || '').trim(),
              telefone: (telefoneVal || '').trim(),
              orgao: (orgaoVal || '').trim(),
              banco: 'TJPB',
              status_original: getVal(['status', 'situação']) || 'PENDENTE',
              status_ligacao: 'pendente',
            };
          })
          // Filter out rows that don't have at least a Name or CPF/ID
          .filter((row) => (row.nome && row.nome.trim() !== '') || (row.cpf && row.cpf.trim() !== ''));
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
