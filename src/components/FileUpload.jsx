import { useState, useRef, useCallback } from 'react';
import { parseCSV, extractLoteName } from '../utils/csvParser';
import { supabase, TABLE_NAME } from '../lib/supabase';

export default function FileUpload({ onUploadComplete }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [operadores, setOperadores] = useState([]);
  const [selectedOperador, setSelectedOperador] = useState('');
  const [dataLote, setDataLote] = useState(new Date().toISOString().split('T')[0]);
  const [pctComissao, setPctComissao] = useState('10');
  const [selectedTipoLista, setSelectedTipoLista] = useState('BRADESCO');
  const fileInputRef = useRef(null);

  // Fetch operators list when preview is loaded
  const fetchOperadores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('seg_usuarios')
        .select('id, nome')
        .eq('funcao', 'operador')
        .order('nome', { ascending: true });
      if (error) throw error;
      setOperadores(data || []);
    } catch (err) {
      console.error('Error fetching operators:', err);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const processFile = useCallback(async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      setResult({ type: 'error', message: 'Por favor, selecione um arquivo CSV.' });
      return;
    }

    setResult(null);
    setPreview(null);

    try {
      const data = await parseCSV(file);
      if (data.length === 0) {
        setResult({ type: 'error', message: 'Nenhum dado válido encontrado no CSV.' });
        return;
      }

      const loteName = extractLoteName(file.name);
      setPreview({ data, loteName, fileName: file.name });
      fetchOperadores();
    } catch (err) {
      setResult({ type: 'error', message: `Erro ao ler CSV: ${err.message}` });
    }
  }, [fetchOperadores]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const uploadToSupabase = useCallback(async () => {
    if (!preview) return;

    setIsUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const { data, loteName } = preview;
      const batchSize = 10;
      let uploaded = 0;
      let errors = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map((row) => {
          // Clean value to numeric for commission calculations (e.g. "R$ 5.012,14" -> 5012.14)
          let numVal = 0;
          if (row.valor) {
            let cleanVal = row.valor.replace(/[^\d.,]/g, '');
            if (cleanVal.includes('.') && cleanVal.includes(',')) {
              cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
            } else if (cleanVal.includes(',')) {
              cleanVal = cleanVal.replace(',', '.');
            }
            numVal = parseFloat(cleanVal) || 0;
          }

          // Use row specific commission pct if parsed from CSV, else use user input default
          const pct = row.pct_comissao !== undefined && row.pct_comissao !== null ? row.pct_comissao : (parseFloat(pctComissao) || 0);
          const commVal = numVal * (pct / 100);

          return {
            nome: row.nome,
            cpf: row.cpf,
            telefone: row.telefone,
            local: row.local,
            cargo: row.cargo,
            matricula: row.matricula,
            empresa: row.empresa,
            valor: row.valor,
            pct_comissao: pct,
            valor_comissao: commVal,
            valor_comissao_receber: row.valor_comissao_receber !== undefined && row.valor_comissao_receber !== null ? row.valor_comissao_receber : null,
            status_original: row.status_original,
            status_ligacao: 'pendente',
            observacao: row.observacao,
            lote_upload: loteName,
            usuario_designado_id: selectedOperador || null,
            data_lote: dataLote,
            tipo_lista: selectedTipoLista,
          };
        });

        const { error } = await supabase
          .from(TABLE_NAME)
          .upsert(batch, {
            onConflict: 'cpf',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error('Batch error:', error);
          errors += batch.length;
        } else {
          uploaded += batch.length;
        }

        setUploadProgress(Math.round(((i + batch.length) / data.length) * 100));
      }

      if (errors > 0) {
        setResult({
          type: 'error',
          message: `Upload parcial: ${uploaded} enviados, ${errors} com erro.`,
        });
      } else {
        setResult({
          type: 'success',
          message: `✓ ${uploaded} leads importados com sucesso! Lote: "${loteName}"`,
        });
      }

      setPreview(null);
      onUploadComplete?.();
    } catch (err) {
      setResult({ type: 'error', message: `Erro no upload: ${err.message}` });
    } finally {
      setIsUploading(false);
    }
  }, [preview, selectedOperador, dataLote, pctComissao, selectedTipoLista, onUploadComplete]);

  return (
    <div className="upload-section">
      <div
        className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="upload-icon">📄</span>
        <div className="upload-title">
          Arraste a planilha Bradesco aqui
        </div>
        <div className="upload-subtitle">
          ou clique para selecionar um arquivo CSV
        </div>
        <button
          className="upload-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          📁 Selecionar Arquivo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Preview */}
      {preview && !isUploading && (
        <div className="upload-progress" style={{ marginTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-primary)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Designar para Operador
              </label>
              <div className="status-select-wrapper">
                <select
                  className="status-select"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                  value={selectedOperador}
                  onChange={(e) => setSelectedOperador(e.target.value)}
                >
                  <option value="">Nenhum (Livre)</option>
                  {operadores.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.nome}
                    </option>
                  ))}
                </select>
                <span className="status-select-arrow" style={{ color: 'var(--text-muted)' }}>▼</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Data de Referência
              </label>
              <input
                type="date"
                className="search-input"
                style={{ padding: '6px 12px' }}
                value={dataLote}
                onChange={(e) => setDataLote(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Comissão (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="search-input"
                style={{ padding: '6px 12px' }}
                placeholder="Ex: 10"
                value={pctComissao}
                onChange={(e) => setPctComissao(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Tipo de Lista / Segmento
              </label>
              <input
                type="text"
                className="search-input"
                style={{ padding: '6px 12px' }}
                placeholder="Ex: TJPB, Geral, UEPB..."
                value={selectedTipoLista}
                onChange={(e) => setSelectedTipoLista(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>
                {preview.data.length} leads
              </strong>
              <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.85rem' }}>
                encontrados em "{preview.fileName}"
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-ghost"
                onClick={() => setPreview(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={uploadToSupabase}
              >
                🚀 Enviar para Supabase
              </button>
            </div>
          </div>

          {/* Mini table preview */}
          <div style={{ marginTop: '12px', maxHeight: '200px', overflow: 'auto' }}>
            <table className="leads-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Valor</th>
                  <th>Local</th>
                  <th>Telefone</th>
                  <th>Matrícula</th>
                  <th>Empresa</th>
                </tr>
              </thead>
              <tbody>
                {preview.data.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td className="cell-name">{row.nome}</td>
                    <td className="cell-cpf">{row.cpf}</td>
                    <td className="cell-valor">{row.valor}</td>
                    <td>{row.local || '—'}</td>
                    <td className="cell-telefone">{row.telefone}</td>
                    <td>{row.matricula || '—'}</td>
                    <td>{row.empresa || '—'}</td>
                  </tr>
                ))}
                {preview.data.length > 5 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      ... e mais {preview.data.length - 5} leads
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="upload-progress" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Enviando para Supabase...</span>
            <span style={{ color: 'var(--accent-primary-hover)', fontWeight: '600' }}>
              {uploadProgress}%
            </span>
          </div>
          <div className="upload-progress-bar">
            <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`upload-result ${result.type}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
