import { useState, useEffect } from 'react';
import { supabase, TABLE_NAME } from '../lib/supabase';

export default function ManualLeadForm({ onLeadAdded }) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [valor, setValor] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefone, setTelefone] = useState('');
  const [orgao, setOrgao] = useState('');
  const [operadores, setOperadores] = useState([]);
  const [selectedOperador, setSelectedOperador] = useState('');
  const [pctComissao, setPctComissao] = useState('10');
  const [dataLote, setDataLote] = useState(new Date().toISOString().split('T')[0]);
  const [loteName, setLoteName] = useState('Inserção Manual');
  const [tipoLista, setTipoLista] = useState('BRADESCO');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const fetchOps = async () => {
      try {
        const { data, error } = await supabase
          .from('seg_usuarios')
          .select('id, nome')
          .eq('funcao', 'operador')
          .order('nome', { ascending: true });
        if (error) throw error;
        setOperadores(data || []);
        if (data && data.length > 0) {
          setSelectedOperador(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchOps();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!nome.trim() || !cpf.trim()) {
      setMsg({ type: 'error', text: 'Nome e CPF são obrigatórios.' });
      return;
    }

    setLoading(true);

    try {
      // Parse valor to float
      let numVal = 0;
      if (valor) {
        let cleanVal = valor.replace(/[^\d.,]/g, '');
        if (cleanVal.includes('.') && cleanVal.includes(',')) {
          cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
        } else if (cleanVal.includes(',')) {
          cleanVal = cleanVal.replace(',', '.');
        }
        numVal = parseFloat(cleanVal) || 0;
      }

      const pct = parseFloat(pctComissao) || 0;
      const commVal = numVal * (pct / 100);

      const newLead = {
        nome: nome.trim(),
        cpf: cpf.trim(),
        valor: valor.trim() ? `R$ ${valor.trim()}` : null,
        cidade: cidade.trim() || null,
        telefone: telefone.trim() || null,
        orgao: orgao.trim() || null,
        banco: 'BRADESCO',
        status_ligacao: 'pendente',
        lote_upload: loteName.trim() || 'Manual',
        usuario_designado_id: selectedOperador || null,
        data_lote: dataLote,
        pct_comissao: pct,
        valor_comissao: commVal,
        tipo_lista: tipoLista,
      };

      const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(newLead, { onConflict: 'cpf' });

      if (error) throw error;

      setMsg({ type: 'success', text: 'Lead cadastrado com sucesso!' });
      setNome('');
      setCpf('');
      setValor('');
      setCidade('');
      setTelefone('');
      setOrgao('');
      onLeadAdded?.();
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Erro ao cadastrar lead: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '4px' }}>Adicionar Lead Manualmente</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Preencha os campos para cadastrar e designar um lead único.</p>
      </div>

      {msg && (
        <div className={`upload-result ${msg.type}`} style={{ gridColumn: '1 / -1', margin: 0, padding: '8px 12px' }}>
          {msg.text}
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Nome *</label>
        <input type="text" className="search-input" style={{ padding: '6px 12px' }} placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>CPF * (Único)</label>
        <input type="text" className="search-input" style={{ padding: '6px 12px' }} placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Valor da Venda</label>
        <input type="text" className="search-input" style={{ padding: '6px 12px' }} placeholder="Ex: 5000,00" value={valor} onChange={(e) => setValor(e.target.value)} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Telefone</label>
        <input type="text" className="search-input" style={{ padding: '6px 12px' }} placeholder="83 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Cidade</label>
        <input type="text" className="search-input" style={{ padding: '6px 12px' }} placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Órgão</label>
        <input type="text" className="search-input" style={{ padding: '6px 12px' }} placeholder="Órgão público" value={orgao} onChange={(e) => setOrgao(e.target.value)} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Designar Operador</label>
        <div className="status-select-wrapper">
          <select className="status-select" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} value={selectedOperador} onChange={(e) => setSelectedOperador(e.target.value)}>
            <option value="">Nenhum (Livre)</option>
            {operadores.map(op => <option key={op.id} value={op.id}>{op.nome}</option>)}
          </select>
          <span className="status-select-arrow" style={{ color: 'var(--text-muted)' }}>▼</span>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Comissão (%)</label>
        <input type="number" className="search-input" style={{ padding: '6px 12px' }} value={pctComissao} onChange={(e) => setPctComissao(e.target.value)} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Nome da Planilha / Lote</label>
        <input type="text" className="search-input" style={{ padding: '6px 12px' }} value={loteName} onChange={(e) => setLoteName(e.target.value)} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Data Referência</label>
        <input type="date" className="search-input" style={{ padding: '6px 12px' }} value={dataLote} onChange={(e) => setDataLote(e.target.value)} />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Tipo de Lista / Segmento</label>
        <input
          type="text"
          className="search-input"
          style={{ padding: '6px 12px' }}
          placeholder="Ex: TJPB, Geral, UEPB..."
          value={tipoLista}
          onChange={(e) => setTipoLista(e.target.value.toUpperCase())}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gridColumn: 'span 2' }}>
        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '10px' }} disabled={loading}>
          {loading ? 'Cadastrando...' : '➕ Adicionar Registro'}
        </button>
      </div>
    </form>
  );
}
