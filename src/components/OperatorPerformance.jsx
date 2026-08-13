import { useMemo } from 'react';

export default function OperatorPerformance({ leads }) {
  // Consolidate performance stats per operator
  const performanceData = useMemo(() => {
    const stats = {};

    leads.forEach((lead) => {
      const opName = lead.usuario_designado_nome || 'Não Designado (Livre)';
      const opId = lead.usuario_designado_id || 'livre';

      if (!stats[opId]) {
        stats[opId] = {
          nome: opName,
          totalLeads: 0,
          conversasBemSucedidas: 0,
          valorVendido: 0,
          comissaoGerada: 0,
        };
      }

      stats[opId].totalLeads += 1;

      if (lead.status_ligacao === 'bem_sucedida') {
        stats[opId].conversasBemSucedidas += 1;
        
        // Clean value to numeric
        let numVal = 0;
        if (lead.valor) {
          let cleanVal = lead.valor.replace(/[^\d.,]/g, '');
          if (cleanVal.includes('.') && cleanVal.includes(',')) {
            cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
          } else if (cleanVal.includes(',')) {
            cleanVal = cleanVal.replace(',', '.');
          }
          numVal = parseFloat(cleanVal) || 0;
        }

        stats[opId].valorVendido += numVal;
        stats[opId].comissaoGerada += parseFloat(lead.valor_comissao) || 0;
      }
    });

    return Object.values(stats).sort((a, b) => b.valorVendido - a.valorVendido);
  }, [leads]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getConversionRate = (success, total) => {
    if (!total) return '0%';
    return `${((success / total) * 100).toFixed(1)}%`;
  };

  return (
    <div style={{ marginTop: 'var(--space-md)' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: 'var(--space-md)' }}>
        Desempenho Geral dos Operadores
      </h3>
      
      <div className="table-wrapper">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Operador</th>
              <th>Total de Leads</th>
              <th>Ligaç. Sucesso</th>
              <th>Taxa Conversão</th>
              <th>Valor Convertido</th>
              <th>Total Comissão</th>
            </tr>
          </thead>
          <tbody>
            {performanceData.map((op) => (
              <tr key={op.nome}>
                <td style={{ fontWeight: '600' }}>{op.nome}</td>
                <td>{op.totalLeads}</td>
                <td>{op.conversasBemSucedidas}</td>
                <td style={{ color: 'var(--info)', fontWeight: '600' }}>
                  {getConversionRate(op.conversasBemSucedidas, op.totalLeads)}
                </td>
                <td style={{ color: 'var(--success)', fontWeight: '600' }}>
                  {formatCurrency(op.valorVendido)}
                </td>
                <td style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                  {formatCurrency(op.comissaoGerada)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
