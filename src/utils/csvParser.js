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
            const keysCleaned = keys.map(k => ({ 
              original: k, 
              clean: k.trim().toLowerCase()
                .replace(/[àáâãä]/g, 'a')
                .replace(/[èéêë]/g, 'e')
                .replace(/[ìíîï]/g, 'i')
                .replace(/[òóôõö]/g, 'o')
                .replace(/[ùúûü]/g, 'u')
                .replace(/[ç]/g, 'c')
            }));

            const getVal = (possibleKeys) => {
              // Try exact match first
              let match = keysCleaned.find(k => possibleKeys.includes(k.clean));
              if (match) return row[match.original];
              
              // Fallback to strict check
              match = keysCleaned.find(k => possibleKeys.some(pk => {
                if ((pk === 'matr' || pk === 'matricula') && k.clean.includes('servidor')) return false;
                if (pk === 'servidor' && (k.clean.includes('matr') || k.clean.includes('cargo'))) return false;
                return k.clean.includes(pk);
              }));
              return match ? row[match.original] : '';
            };

            // Map variables based on the new CSV model layout
            let nomeVal = getVal(['nome', 'servidor', 'funcionario']);
            let cpfVal = getVal(['cpf', 'cpf/id']);
            let telefoneVal = getVal(['telefone', 'tel', 'celular', 'fone']);
            let localVal = getVal(['local', 'comarca/setor/vara (exercício)', 'cidade', 'comarca']);
            let cargoVal = getVal(['cargo', 'cargo efetivo']);
            let matriculaVal = getVal(['matricula', 'matr.', 'matr', 'id']);
            let empresaVal = getVal(['empresa', 'banco', 'banco ']);
            let valorVal = getVal(['valor', 'valor da venda', 'venda']);
            
            // Commissions check
            let pctComissaoVal = getVal(['comissao', 'comissao ']);
            let valorComissaoReceberVal = getVal(['comissao receber', 'comissao a receber', 'comissao receber ']);
            
            let statusVal = getVal(['status', 'situação', 'status_original']);
            let obsVal = getVal(['observacoes', 'observação', 'obs', 'observacao']);

            // Filter placeholder header rows
            if ((matriculaVal || '').trim().toLowerCase().startsWith('matr') || (nomeVal || '').trim().toLowerCase().startsWith('nome')) {
              return { cpf: '', nome: '' };
            }

            // Fallback generation for CPF if it is empty or '-'
            let cleanCpf = (cpfVal || '').replace(/[^\d]/g, '');
            let cleanMatricula = (matriculaVal || '').replace(/[^\d]/g, '');
            let finalCpf = cpfVal;
            if (!cleanCpf || cpfVal === '-') {
              if (cleanMatricula) {
                finalCpf = `MATR-${cleanMatricula}`;
              } else {
                finalCpf = `TEMP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
              }
            }

            let rawNome = (nomeVal || '').trim();
            let cleanNome = rawNome
              .replace(/^1so/i, 'Iso')
              .replace(/^1s/i, 'Is')
              .replace(/^3a/i, 'Ja')
              .replace(/^3e/i, 'Je')
              .replace(/^3o/i, 'Jo')
              .replace(/^3u/i, 'Ju')
              .replace(/^[0-9]+(?=[a-zA-ZÀ-ÿ])/, '')
              .replace(/\s+/g, ' ');

            let rawCargo = (cargoVal || '').trim();
            let cleanCargo = rawCargo
              .replace(/[\r\n]+/g, ' ')
              .replace(/\b[3215\u00e2ârR]UD/gi, 'JUD')
              .replace(/\b[3215\u00e2ârR]UIZ/gi, 'JUIZ')
              .replace(/\b[3215\u00e2ârR]UO/gi, 'JUO')
              .replace(/JUD1C/gi, 'JUDIC')
              .replace(/JUDICl/gi, 'JUDIC')
              .replace(/JUDICT/gi, 'JUDIC')
              .replace(/JUDIC1/gi, 'JUDIC')
              .replace(/\bIUDIC/gi, 'JUDIC')
              .replace(/\bIUDT/gi, 'JUDI')
              .replace(/\bIUD1/gi, 'JUDI')
              .replace(/\s+/g, ' ');

            return {
              nome: cleanNome,
              cpf: finalCpf.trim(),
              telefone: (telefoneVal || '').trim(),
              local: (localVal || '').trim(),
              cargo: cleanCargo,
              matricula: (matriculaVal || '').trim(),
              empresa: (empresaVal || '').trim(),
              valor: (valorVal || '').trim(),
              pct_comissao: pctComissaoVal ? parseFloat(pctComissaoVal.replace('%', '').trim()) : null,
              valor_comissao_receber: valorComissaoReceberVal ? parseFloat(valorComissaoReceberVal.replace(/[^\d.,]/g, '').replace(',', '.')) : null,
              status_original: (statusVal || 'PENDENTE').trim(),
              status_ligacao: 'pendente',
              observacao: (obsVal || '').trim(),
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
