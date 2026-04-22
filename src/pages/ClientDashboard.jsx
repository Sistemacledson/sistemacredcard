import { useState } from 'react';
import { Search, RotateCw, AlertCircle } from 'lucide-react';
import { formatCPFCNPJ, isValidDocument, formatDate } from '../utils/formatters';
import { getProcessosByDocumento, orgaosList } from '../services/processService';

const ClientDashboard = () => {
  const [documento, setDocumento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultados, setResultados] = useState(null);

  const handleDocumentChange = (e) => {
    setDocumento(formatCPFCNPJ(e.target.value));
    setError('');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!isValidDocument(documento)) {
      setError('Por favor, informe um CPF ou CNPJ válido.');
      return;
    }

    setLoading(true);
    setError('');
    
    // Buscar no Supabase
    const data = await getProcessosByDocumento(documento);
    
    setLoading(false);
    
    if (data === null) {
      setError('Erro de conexão com o banco de dados. Verifique as chaves do Supabase.');
      return;
    }

    if (data && data.length > 0) {
      setResultados(data);
    } else {
      setResultados([]); // Cliente não tem processos cadastrados ainda
    }
  };

  const getStatusIconTop = (status) => {
    switch(status) {
      case 'Baixado': return 'check_circle';
      case 'Baixas iniciadas': return 'pending_actions';
      case 'Processo em reprotocolo': return 'sync';
      default: return 'hourglass_empty';
    }
  };

  const getStatusIconBadge = (status) => {
    switch(status) {
      case 'Baixado': return 'done';
      case 'Baixas iniciadas': return 'hourglass_empty';
      case 'Processo em reprotocolo': return 'cycle';
      default: return 'pending';
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'Baixado': return 'status-baixado';
      case 'Baixas iniciadas': return 'status-iniciadas';
      case 'Processo em reprotocolo': return 'status-reprotocolo';
      default: return 'status-aguardando';
    }
  };

  const getStatusDescription = (status) => {
    switch(status) {
      case 'Baixado': 
        return 'Processo 100% concluído';
      case 'Baixas iniciadas': 
        return 'Isso significa que alguns nomes podem já constar como limpos em consultas atualizadas.';
      case 'Processo em reprotocolo': 
        return 'Alguns nomes podem retornar temporariamente aos órgãos devido a um ajuste processual estratégico. Já estamos incluindo todos novamente para refazer na próxima semana.';
      default: 
        return 'As informações detalhadas sobre este órgão serão atualizadas aqui pela coordenação';
    }
  };

  const descricoesEtapa = {
    '01 – Início Jurídico do Processo': 'É realizada a entrada da ação judicial, onde a associação protocola o pedido formal solicitando a nulidade das inscrições negativas junto à Vara competente.',
    '02 – Decisão Concedida': 'Após análise do juiz, sendo reconhecido o direito legal, é concedida decisão favorável, determinando a nulidade das restrições para todos os envolvidos no processo coletivo.',
    '03 – Protocolização nos Órgãos': 'Com a decisão em mãos, é feita a comunicação oficial aos órgãos de proteção ao crédito (Serasa, SPC e Boa Vista), que possuem prazo legal de até 5 dias úteis para cumprimento da ordem.',
    '04 – Início das Baixas': 'Os birôs de crédito iniciam a retirada das restrições negativas conforme determinação judicial.',
    '05 – Finalização das Baixas': 'Processo concluído com a exclusão dos apontamentos. A atualização pode ocorrer entre 24h a 72h nos sistemas, e o score tende a ser reprocessado em até 7 dias úteis.'
  };

  const getEtapaIcon = (etapa) => {
    if (!etapa) return 'info';
    if (etapa.startsWith('01')) return 'gavel';
    if (etapa.startsWith('02')) return 'verified';
    if (etapa.startsWith('03')) return 'send';
    if (etapa.startsWith('04')) return 'hourglass_top';
    if (etapa.startsWith('05')) return 'task_alt';
    return 'info';
  };

  const etapaAtual = (resultados && resultados.length > 0) ? (resultados[0].etapa || '01 – Início Jurídico do Processo') : null;
  const dataInicio = (resultados && resultados.length > 0 && resultados[0].data_inicio) ? formatDate(resultados[0].data_inicio) : null;

  return (
    <>
      {resultados === null ? (
        // Estado inicial: Split Screen / Centered Card Login
        <div className="login-wrapper">
          {/* Desktop Left Side */}
          <img src="/logoacred.webp" alt="Acredcard Logo" className="login-logo" />
          <div className="login-split-left">
            <div className="login-left-content">
              <h1 className="login-title">Acompanhe seus processos</h1>
              <p className="login-subtitle">Insira os dados abaixo, e acompanhe todas as atualizações do seu processo.</p>
            </div>
          </div>

          {/* Desktop Right Side / Mobile Card */}
          <div className="login-split-right">

            <div className="mobile-card-wrapper">
              <img src="/logoacred.webp" alt="Acredcard Logo" className="mobile-logo" />
              <h1 className="mobile-login-title">Acompanhe seus processos</h1>
              <p className="mobile-login-subtitle">Insira os dados abaixo, e acompanhe todas as atualizações do seu processo.</p>

              <div className="mobile-form-box">
                <h2 className="login-form-title">Consulta de Processos</h2>
                <form onSubmit={handleSearch}>
                  <div className="login-input-group">
                    <label className="login-input-label">CPF/CNPJ</label>
                    <input 
                      id="documento"
                      type="text"
                      className="login-input"
                      placeholder="Digite seu CPF ou CNPJ"
                      value={documento}
                      onChange={handleDocumentChange}
                      maxLength={18}
                    />
                    {error && <span className="error-text" style={{ display: 'block', marginTop: '0.25rem' }}>{error}</span>}
                  </div>
                  
                  <div className="login-input-group">
                    <label className="login-input-label">Últimos 4 dígitos do telefone</label>
                    <input 
                      type="text" 
                      className="login-input" 
                      placeholder="Digite os 4 últimos dígitos" 
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
                    />
                  </div>
                  
                  <button type="submit" className="login-btn" disabled={loading || !documento}>
                    {loading ? 'Consultando...' : 'Consultar'}
                  </button>
                </form>
              </div>
            </div>

            <div className="login-footer">
              <a href="#" style={{color: 'inherit', textDecoration: 'none'}}>Termos de Uso</a>
              <a href="#" style={{color: 'inherit', textDecoration: 'none'}}>Política de Privacidade</a>
            </div>
          </div>
        </div>
      ) : (
        // Estado de Resultados
        <div className="app-container">
          <header className="header">
            <img src="/logoacred.webp" alt="Acredcard Logo" className="header-logo" />
          </header>
          <main className="main-content">
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div className="results-header">
            <h1 className="results-title">
              {resultados.length > 0 && resultados[0].nome_cliente 
                ? `Resultados de ${resultados[0].nome_cliente}` 
                : 'Resultados para o documento'}
            </h1>
            <p className="results-subtitle">
              {documento}
            </p>
          </div>
          
          {resultados.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#9CA3AF' }} />
              <p>Nenhum andamento encontrado para este documento.</p>
            </div>
          ) : (
            <>
              {/* Visualização da Etapa */}
              {etapaAtual && (
                <div className="etapa-card">
                  <div className="etapa-icon-container">
                    <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', fontVariationSettings: "'FILL' 1" }}>
                      {getEtapaIcon(etapaAtual)}
                    </span>
                  </div>
                  <div className="etapa-content">
                    <h3 className="etapa-subtitle">
                      Etapa Atual do Processo
                    </h3>
                    <h4 className="etapa-title">
                      {etapaAtual}
                    </h4>
                    <p className="etapa-description">
                      {descricoesEtapa[etapaAtual] || 'Processo em andamento.'}
                    </p>
                    {dataInicio && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.875rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>calendar_today</span>
                        Processo iniciado em: <strong>{dataInicio}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Grid de Órgãos */}
              <div className="results-grid">
              {orgaosList.map((orgaoName) => {
                const orgaoData = resultados.find(r => r.orgao === orgaoName);
                const status = orgaoData?.status || 'Aguardando início das baixas';
                
                // Formatar data
                const dataAtualizacaoStr = orgaoData?.atualizado_em ? formatDate(orgaoData.atualizado_em) : '--/--/----';

                return (
                  <div key={orgaoName} className={`card-novo ${getStatusClass(status)}`}>
                    <div className="card-header-novo">
                      <h2 className="card-title-novo">{orgaoName}</h2>
                      <span className="material-symbols-outlined card-icon-top" style={{ fontSize: '1.5rem' }}>
                        {getStatusIconTop(status)}
                      </span>
                    </div>
                    <div className="card-content-novo">
                      <div className="badge-novo">
                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', fontVariationSettings: "'FILL' 1" }}>
                          {getStatusIconBadge(status)}
                        </span>
                        <span className="badge-text-novo">{status}</span>
                      </div>
                      
                      <p className="card-status-description">
                        {getStatusDescription(status)}
                      </p>
                      
                      <div className="card-date-novo">
                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>schedule</span>
                        <span className="date-text-novo">
                          Atualizado em: {dataAtualizacaoStr}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}

          <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}>
            <button 
              className="btn-primary" 
              onClick={() => { setResultados(null); setDocumento(''); setTelefone(''); }}
              style={{ background: 'var(--surface-container-highest)', color: 'var(--primary)', border: 'none' }}
            >
              <RotateCw size={18} />
              Fazer nova consulta
            </button>
          </div>
        </div>
        </main>
        </div>
      )}
    </>
  );
};

export default ClientDashboard;
