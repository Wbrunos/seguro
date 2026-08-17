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
            // Clean keys and find matches
            const keysCleaned = keys.map(k => ({ original: k, clean: k.trim().toLowerCase() }));

            const getVal = (possibleKeys) => {
              // Try exact match first
              let match = keysCleaned.find(k => possibleKeys.includes(k.clean));
              if (match) return row[match.original];
              
              // Fallback to strict check: does the column header start with or match key
              match = keysCleaned.find(k => possibleKeys.some(pk => k.clean.startsWith(pk) || k.clean === pk));
              return match ? row[match.original] : '';
            };

            // Map CPF / Matricula (Matr.)
            let cpfVal = getVal(['cpf', 'matr.', 'matr', 'matricula', 'id', 'matrícula']);
            
            // Map Nome / Servidor (Ensuring we don't accidentally match 'cargo' or 'matricula' as name)
            let nomeVal = getVal(['servidor', 'nome', 'nome completo', 'funcionario', 'funcionário']);
            
            // Map Valor
            let valorVal = getVal(['valor', 'valor da venda', 'venda']);
            
            // Map Cidade / Comarca / Setor
            let cidadeVal = getVal(['comarca/setor/vara (exercício)', 'cidade', 'comarca', 'setor', 'vara', 'exercicio', 'exercício']);
            
            // Map Telefone
            let telefoneVal = getVal(['telefone', 'tel', 'celular', 'fone']);
            
            // Map Orgao / Cargo Efetivo
            let orgaoVal = getVal(['cargo efetivo', 'cargo', 'função', 'funcao', 'orgão', 'orgao']);

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
