import { useState, useEffect } from 'react';
import { Search, Save, Check, RotateCw, List, User, LayoutDashboard, Plus, Edit2, Calendar, Trash2, ChevronDown, ChevronUp, AlertTriangle, LogIn, LogOut, Eye, EyeOff } from 'lucide-react';
import { formatCPFCNPJ, isValidDocument, formatDate } from '../utils/formatters';
import { getProcessosByDocumento, saveProcessos, saveProcessosEmMassa, orgaosList, statusList, etapasList, getAllClientes, deleteProcessoByDocumento, getClientesByData, updateProcessosByData } from '../services/processService';
import { supabase } from '../lib/supabase';

const AdminArea = () => {
  // Auth
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'cadastrar' | 'editar'
  const [cadastrarModo, setCadastrarModo] = useState('manual'); // 'manual' | 'massa'
  
  // Dashboard
  const [dashboardData, setDashboardData] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  
  // Exclusão
  const [clienteParaExcluir, setClienteParaExcluir] = useState(null);
  const [deletando, setDeletando] = useState(false);

  // Estados para Edição / Cadastro Manual Único
  const [documentoBusca, setDocumentoBusca] = useState('');
  const [nomeClienteBusca, setNomeClienteBusca] = useState('');
  const [clienteAtual, setClienteAtual] = useState(null);
  const [processosEditaveis, setProcessosEditaveis] = useState([]);
  const [etapaProcesso, setEtapaProcesso] = useState('');
  
  // Estados para Inserção em Massa
  const [listaMassa, setListaMassa] = useState('');
  const [statusMassa, setStatusMassa] = useState(statusList[0]);
  const [dataMassa, setDataMassa] = useState(new Date().toISOString().split('T')[0]);
  const [etapaMassa, setEtapaMassa] = useState(etapasList[0]);

  // Estados para Atualização em Lote por Data
  const [dataLote, setDataLote] = useState('');
  const [clientesLote, setClientesLote] = useState(null);
  const [loadingLote, setLoadingLote] = useState(false);
  const [statusLote, setStatusLote] = useState('');
  const [etapaLote, setEtapaLote] = useState('');
  const [novaDataLote, setNovaDataLote] = useState('');
  const [savingLote, setSavingLote] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Auth: verificar sessão
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoginLoading(false);
    if (error) setLoginError('E-mail ou senha incorretos.');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Carregar Dashboard ao montar
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboard();
    }
  }, [activeTab]);

  const loadDashboard = async () => {
    setLoadingDashboard(true);
    const clientes = await getAllClientes();
    
    // Agrupar por Mês/Ano
    const agrupado = {};
    clientes.forEach(c => {
      if (!c.atualizado_em) return;
      const dataObj = new Date(c.atualizado_em);
      // Pega o nome do mês e ano
      const mesAno = dataObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      const mesAnoFormatado = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
      
      if (!agrupado[mesAnoFormatado]) {
        agrupado[mesAnoFormatado] = [];
      }
      agrupado[mesAnoFormatado].push(c);
    });

    setDashboardData(agrupado);
    
    // Expandir apenas o primeiro mês por padrão
    const initialExpanded = {};
    if (Object.keys(agrupado).length > 0) {
      initialExpanded[Object.keys(agrupado)[0]] = true;
    }
    setExpandedMonths(initialExpanded);
    setLoadingDashboard(false);
  };

  const toggleMonth = (mesAno) => {
    setExpandedMonths(prev => ({
      ...prev,
      [mesAno]: !prev[mesAno]
    }));
  };

  const confirmarExclusao = async () => {
    setDeletando(true);
    const success = await deleteProcessoByDocumento(clienteParaExcluir);
    setDeletando(false);
    setClienteParaExcluir(null);
    
    if (success) {
      setMessage({ text: 'Cliente excluído com sucesso.', type: 'success' });
      loadDashboard(); // Recarrega a lista
    } else {
      setMessage({ text: 'Erro ao excluir o cliente.', type: 'error' });
    }
  };

  const initEditaveis = (dadosBanco, defaultDoc = null, prefilledName = '') => {
    const nomeExistente = (dadosBanco && dadosBanco.length > 0 && dadosBanco[0].nome_cliente) ? dadosBanco[0].nome_cliente : prefilledName;
    setNomeClienteBusca(nomeExistente || '');

    const etapaExistente = (dadosBanco && dadosBanco.length > 0 && dadosBanco[0].etapa) ? dadosBanco[0].etapa : etapasList[0];
    setEtapaProcesso(etapaExistente);

    const editaveis = orgaosList.map(orgao => {
      const orgaoExistente = dadosBanco?.find(p => p.orgao === orgao);
      return {
        orgao: orgao,
        status: orgaoExistente?.status || statusList[0],
        atualizado_em: orgaoExistente?.atualizado_em || new Date().toISOString().split('T')[0]
      };
    });
    setProcessosEditaveis(editaveis);
    if (defaultDoc) setClienteAtual(defaultDoc);
  };

  const handleEditClick = async (documento, prefilledName = '') => {
    setMessage({ text: '', type: '' });
    setActiveTab('editar');
    setLoading(true);
    const data = await getProcessosByDocumento(documento);
    setLoading(false);

    if (data === null) {
      setMessage({ text: 'Erro ao conectar com Supabase. Verifique as chaves.', type: 'error' });
      return;
    }

    initEditaveis(data, documento, prefilledName);
  };

  const handleCadastrarUnico = () => {
    if (!nomeClienteBusca.trim()) {
      setMessage({ text: 'O Nome ou Razão Social é obrigatório.', type: 'error' });
      return;
    }
    if (!isValidDocument(documentoBusca)) {
      setMessage({ text: 'Documento inválido.', type: 'error' });
      return;
    }
    handleEditClick(documentoBusca, nomeClienteBusca);
  };

  const handleStatusChange = (orgao, newStatus) => {
    setProcessosEditaveis(prev => 
      prev.map(p => p.orgao === orgao ? { ...p, status: newStatus } : p)
    );
  };

  const handleDateChange = (orgao, newDate) => {
    setProcessosEditaveis(prev => 
      prev.map(p => p.orgao === orgao ? { ...p, atualizado_em: newDate } : p)
    );
  };

  const handleSaveManual = async () => {
    if (!nomeClienteBusca.trim()) {
      setMessage({ text: 'O Nome do Cliente é obrigatório.', type: 'error' });
      return;
    }

    setSaving(true);
    setMessage({ text: '', type: '' });
    
    // Injeta o nomeClienteBusca e etapaProcesso em todos os processos
    const processosComNome = processosEditaveis.map(p => ({
      ...p,
      nome_cliente: nomeClienteBusca,
      etapa: etapaProcesso
    }));

    const success = await saveProcessos(clienteAtual, processosComNome);
    
    setSaving(false);
    
    if (success) {
      setMessage({ text: 'Dados atualizados com sucesso no Supabase!', type: 'success' });
      setActiveTab('dashboard'); // Volta pro dashboard após salvar
    } else {
      setMessage({ text: 'Erro ao salvar. Verifique se o banco está configurado.', type: 'error' });
    }
  };

  // === LÓGICA: INSERÇÃO EM MASSA ===
  const handleSaveMassa = async () => {
    if (!listaMassa.trim()) {
      setMessage({ text: 'Cole ao menos um documento na lista.', type: 'error' });
      return;
    }

    setSaving(true);
    setMessage({ text: '', type: '' });

    // Divide a string por quebras de linha e remove linhas vazias
    const documentosArray = listaMassa.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const success = await saveProcessosEmMassa(documentosArray, statusMassa, dataMassa, etapaMassa);

    setSaving(false);

    if (success) {
      setMessage({ text: `Sucesso! ${documentosArray.length} documento(s) processado(s) em lote.`, type: 'success' });
      setListaMassa(''); // Limpa o campo
    } else {
      setMessage({ text: 'Erro ao processar em massa. Verifique os dados ou o Supabase.', type: 'error' });
    }
  };

  // === LÓGICA: ATUALIZAÇÃO EM LOTE POR DATA ===
  const handleBuscarPorData = async () => {
    if (!dataLote) return;
    setLoadingLote(true);
    setClientesLote(null);
    const clientes = await getClientesByData(dataLote);
    setClientesLote(clientes);
    setLoadingLote(false);
  };

  const handleAtualizarLote = async () => {
    if (!dataLote || !clientesLote || clientesLote.length === 0) return;
    if (!statusLote && !etapaLote && !novaDataLote) {
      setMessage({ text: 'Selecione ao menos um campo para atualizar.', type: 'error' });
      return;
    }
    setSavingLote(true);
    setMessage({ text: '', type: '' });
    const updates = {};
    if (statusLote) updates.status = statusLote;
    if (etapaLote) updates.etapa = etapaLote;
    if (novaDataLote) updates.novaData = novaDataLote;
    const success = await updateProcessosByData(dataLote, updates);
    setSavingLote(false);
    if (success) {
      setMessage({ text: `${clientesLote.length} cliente(s) atualizados com sucesso!`, type: 'success' });
      setClientesLote(null);
      setDataLote('');
      setStatusLote('');
      setEtapaLote('');
      setNovaDataLote('');
      loadDashboard();
    } else {
      setMessage({ text: 'Erro ao atualizar. Tente novamente.', type: 'error' });
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <RotateCw className="spinner" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
        <div style={{ background: '#fff', borderRadius: '1rem', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border-color)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/logoacred.webp" alt="Acredcard Logo" style={{ height: '48px', marginBottom: '1.25rem' }} />
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.375rem' }}>Área Administrativa</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Acesso restrito. Faça login para continuar.</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div className="input-group">
              <label className="input-label" htmlFor="loginEmail">E-mail</label>
              <input
                id="loginEmail"
                type="email"
                className="input-field"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="loginPassword">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="loginPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', fontSize: '0.875rem' }}>
                {loginError}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loginLoading} style={{ justifyContent: 'center', marginTop: '0.25rem' }}>
              {loginLoading ? <RotateCw className="spinner" size={18} /> : <LogIn size={18} />}
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <img src="/logoacred.webp" alt="Acredcard Logo" className="header-logo" />
      </header>
      
      <main className="main-content">
        <div className="admin-panel" style={{ position: 'relative' }}>
          
          {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {clienteParaExcluir && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', maxWidth: '450px', width: '90%', boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.2s ease' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#111827', fontSize: '1.25rem' }}>
              <div style={{ background: '#FEE2E2', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <AlertTriangle color="#DC2626" size={24} />
              </div>
              Confirmar Exclusão
            </h3>
            <p style={{ marginTop: '1rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
              Tem certeza que deseja excluir todos os processos do documento <strong>{formatCPFCNPJ(clienteParaExcluir)}</strong>?
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Esta ação removerá os status de todos os 5 órgãos e não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button 
                className="btn-primary" 
                style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                onClick={() => setClienteParaExcluir(null)} 
                disabled={deletando}
              >
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                style={{ background: '#DC2626' }} 
                onClick={confirmarExclusao}
                disabled={deletando}
              >
                {deletando ? <RotateCw className="spinner" size={18} /> : <Trash2 size={18} />}
                {deletando ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-header">
        <h1 style={{ textAlign: 'left', marginBottom: 0 }}>Área Administrativa</h1>
        <button
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem' }}
        >
          <LogOut size={16} /> Sair
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          onClick={() => { setActiveTab('dashboard'); setMessage({ text: '', type: '' }); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'dashboard' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'dashboard' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === 'dashboard' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1rem'
          }}
        >
          <LayoutDashboard size={18} /> Dashboard de Clientes
        </button>
        <button 
          onClick={() => { setActiveTab('cadastrar'); setCadastrarModo('manual'); setMessage({ text: '', type: '' }); setNomeClienteBusca(''); setDocumentoBusca(''); setEtapaProcesso(etapasList[0]); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'cadastrar' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'cadastrar' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === 'cadastrar' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1rem'
          }}
        >
          <Plus size={18} /> Cadastrar Novo
        </button>
        <button
          onClick={() => { setActiveTab('lote'); setMessage({ text: '', type: '' }); setClientesLote(null); setDataLote(''); setStatusLote(''); setEtapaLote(''); setNovaDataLote(''); }}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'lote' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'lote' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === 'lote' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1rem'
          }}
        >
          <Edit2 size={18} /> Atualizar em Lote
        </button>
        {activeTab === 'editar' && (
          <button 
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: '2px solid var(--primary-color)',
              color: 'var(--primary-color)',
              fontWeight: 600,
              cursor: 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '1rem'
            }}
          >
            <Edit2 size={18} /> Editando Cliente
          </button>
        )}
      </div>

      {message.text && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '2rem',
          backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          color: message.type === 'success' ? '#065F46' : '#991B1B',
          border: `1px solid ${message.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
          animation: 'fadeIn 0.3s ease'
        }}>
          {message.text}
        </div>
      )}

      {/* ABA DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          {loadingDashboard ? (
            <div className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
              <RotateCw className="spinner" size={32} style={{ margin: '0 auto 1rem' }} />
              <p>Carregando lista de clientes...</p>
            </div>
          ) : Object.keys(dashboardData).length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} style={{ margin: '0 auto 1rem', color: '#9CA3AF' }} />
              <p>Nenhum cliente cadastrado no sistema ainda.</p>
              <button 
                className="btn-primary mt-4" 
                style={{ margin: '1rem auto 0' }}
                onClick={() => setActiveTab('cadastrar')}
              >
                Cadastrar Primeiro Cliente
              </button>
            </div>
          ) : (
            <div>
              {Object.entries(dashboardData).map(([mesAno, clientes]) => (
                <div key={mesAno} style={{ marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  
                  {/* Cabeçalho do Mês (Clicável) */}
                  <div 
                    onClick={() => toggleMonth(mesAno)}
                    style={{ 
                      padding: '1.25rem 1.5rem', 
                      background: '#F9FAFB', 
                      cursor: 'pointer',
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      userSelect: 'none'
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Calendar size={20} color="var(--primary-color)" /> {mesAno}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', background: '#E5E7EB', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
                        {clientes.length} cliente{clientes.length > 1 ? 's' : ''}
                      </span>
                      {expandedMonths[mesAno] ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                    </div>
                  </div>
                  
                  {/* Lista de Clientes (Expansível) */}
                  {expandedMonths[mesAno] && (
                    <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.2s ease', background: '#FFFFFF' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                        {clientes.map(cliente => (
                          <div key={cliente.documento} style={{ 
                            background: '#F9FAFB', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '0.5rem', 
                            padding: '1.25rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'box-shadow 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                          >
                            <div style={{ flex: 1, minWidth: 0, paddingRight: '1rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1.125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {cliente.nome_cliente || formatCPFCNPJ(cliente.documento)}
                              </div>
                              {cliente.nome_cliente && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                  {formatCPFCNPJ(cliente.documento)}
                                </div>
                              )}
                              {cliente.etapa && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--primary-color)', marginTop: '0.25rem', fontWeight: 500 }}>
                                  {cliente.etapa}
                                </div>
                              )}
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Última atualização: {formatDate(cliente.atualizado_em)}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                onClick={() => handleEditClick(cliente.documento)}
                                style={{
                                  background: 'white', border: '1px solid var(--border-color)', borderRadius: '0.375rem',
                                  padding: '0.5rem', cursor: 'pointer', color: 'var(--primary-color)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                }}
                                title="Editar andamento"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => setClienteParaExcluir(cliente.documento)}
                                style={{
                                  background: 'white', border: '1px solid var(--border-color)', borderRadius: '0.375rem',
                                  padding: '0.5rem', cursor: 'pointer', color: '#EF4444',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                }}
                                title="Excluir cliente"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA CADASTRAR */}
      {activeTab === 'cadastrar' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button 
              className={cadastrarModo === 'manual' ? "btn-primary" : "btn-outline"}
              onClick={() => { setCadastrarModo('manual'); setMessage({ text: '', type: '' }); }}
              style={cadastrarModo !== 'manual' ? { background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-color)' } : {}}
            >
              <User size={18} /> Inserção de 1 Cliente
            </button>
            <button 
              className={cadastrarModo === 'massa' ? "btn-primary" : "btn-outline"}
              onClick={() => { setCadastrarModo('massa'); setMessage({ text: '', type: '' }); }}
              style={cadastrarModo !== 'massa' ? { background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-color)' } : {}}
            >
              <List size={18} /> Inserção em Massa (Excel)
            </button>
          </div>

          {cadastrarModo === 'manual' && (
            <div style={{ maxWidth: '500px', background: '#F9FAFB', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>Cadastrar Cliente Unitário</h2>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label className="input-label" htmlFor="nomeCadastro">
                  Nome do Cliente <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="nomeCadastro"
                  type="text"
                  className="input-field"
                  placeholder="Nome Completo ou Razão Social"
                  value={nomeClienteBusca}
                  onChange={(e) => setNomeClienteBusca(e.target.value)}
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label className="input-label" htmlFor="docCadastro">
                  CPF ou CNPJ do Cliente <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="docCadastro"
                  type="text"
                  className="input-field"
                  placeholder="000.000.000-00"
                  value={documentoBusca}
                  onChange={(e) => setDocumentoBusca(formatCPFCNPJ(e.target.value))}
                  maxLength={18}
                />
              </div>
              <button 
                className="btn-primary" 
                onClick={handleCadastrarUnico} 
                style={{ width: '100%' }}
              >
                Prosseguir para Configuração <Search size={18} style={{ marginLeft: '0.5rem' }} />
              </button>
            </div>
          )}

          {cadastrarModo === 'massa' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Inserção Rápida via Planilha</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Copie a coluna de CPFs ou CNPJs do Excel e cole na caixa abaixo. O sistema irá registrar todos os documentos de uma vez, aplicando o mesmo status e data selecionados para todos os 5 órgãos.
              </p>

              <div className="admin-card-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '2rem' }}>
                <div className="input-group">
                  <label className="input-label">Etapa Geral</label>
                  <select 
                    className="select-field"
                    value={etapaMassa}
                    onChange={(e) => setEtapaMassa(e.target.value)}
                  >
                    {etapasList.map(etapa => (
                      <option key={etapa} value={etapa}>{etapa}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Status Base (para todos os órgãos)</label>
                  <select 
                    className="select-field"
                    value={statusMassa}
                    onChange={(e) => setStatusMassa(e.target.value)}
                  >
                    {statusList.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                
                <div className="input-group">
                  <label className="input-label">Data de Atualização</label>
                  <input 
                    type="date"
                    className="input-field"
                    value={dataMassa}
                    onChange={(e) => setDataMassa(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: '2rem' }}>
                <label className="input-label">Lista de CPFs/CNPJs (um por linha)</label>
                <textarea 
                  className="input-field"
                  style={{ minHeight: '200px', resize: 'vertical', fontFamily: 'monospace' }}
                  placeholder={`Exemplo:\n123.456.789-00\n987.654.321-11\n...`}
                  value={listaMassa}
                  onChange={(e) => setListaMassa(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={handleSaveMassa} disabled={saving || !listaMassa.trim()}>
                  {saving ? <RotateCw className="spinner" size={20} /> : <Save size={20} />}
                  {saving ? 'Processando Lote...' : 'Salvar Lista em Massa'}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ABA ATUALIZAR EM LOTE */}
      {activeTab === 'lote' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Atualizar em Lote por Data</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Selecione uma data de cadastro para visualizar todos os clientes daquele dia e atualizar todos de uma vez.
          </p>

          {/* Seletor de data */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', maxWidth: '500px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Data de cadastro</label>
              <input
                type="date"
                className="input-field"
                value={dataLote}
                onChange={(e) => { setDataLote(e.target.value); setClientesLote(null); }}
              />
            </div>
            <button className="btn-primary" onClick={handleBuscarPorData} disabled={!dataLote || loadingLote}>
              {loadingLote ? <RotateCw className="spinner" size={18} /> : <Search size={18} />}
              Buscar
            </button>
          </div>

          {/* Lista de clientes encontrados */}
          {clientesLote !== null && (
            <>
              {clientesLote.length === 0 ? (
                <div className="empty-state">
                  <Calendar size={40} style={{ margin: '0 auto 1rem', color: '#9CA3AF' }} />
                  <p>Nenhum cliente encontrado para esta data.</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.5rem', color: '#1D4ED8', fontSize: '0.9rem' }}>
                    <strong>{clientesLote.length} cliente(s)</strong> encontrados para <strong>{formatDate(dataLote)}</strong>. Defina o que deseja alterar e clique em Aplicar.
                  </div>

                  {/* Cards dos clientes */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
                    {clientesLote.map(c => (
                      <div key={c.documento} style={{ background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.nome_cliente || formatCPFCNPJ(c.documento)}</div>
                        {c.nome_cliente && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{formatCPFCNPJ(c.documento)}</div>}
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', marginTop: '0.4rem' }}>{c.etapa}</div>
                      </div>
                    ))}
                  </div>

                  {/* Campos de atualização */}
                  <div style={{ background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem', maxWidth: '700px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', color: 'var(--text-main)' }}>O que deseja alterar? (deixe em branco o que não quiser mudar)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="input-group">
                        <label className="input-label">Novo Status (todos os órgãos)</label>
                        <select className="select-field" value={statusLote} onChange={(e) => setStatusLote(e.target.value)}>
                          <option value="">— Manter atual —</option>
                          {statusList.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Nova Etapa do Processo</label>
                        <select className="select-field" value={etapaLote} onChange={(e) => setEtapaLote(e.target.value)}>
                          <option value="">— Manter atual —</option>
                          {etapasList.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="input-group" style={{ maxWidth: '260px', marginBottom: '1.5rem' }}>
                      <label className="input-label">Nova Data de Atualização</label>
                      <input
                        type="date"
                        className="input-field"
                        value={novaDataLote}
                        onChange={(e) => setNovaDataLote(e.target.value)}
                        placeholder="Deixe vazio para manter"
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn-primary" onClick={handleAtualizarLote} disabled={savingLote}>
                        {savingLote ? <RotateCw className="spinner" size={18} /> : <Save size={18} />}
                        {savingLote ? 'Aplicando...' : `Aplicar para ${clientesLote.length} cliente(s)`}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ABA EDITAR (FORMULÁRIO MANUAL) */}
      {activeTab === 'editar' && clienteAtual && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', margin: 0 }}>
              Editando Cliente: <span style={{ color: 'var(--primary-color)' }}>{formatCPFCNPJ(clienteAtual)}</span>
            </h2>
            <button 
              onClick={() => setActiveTab('dashboard')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Voltar ao Dashboard
            </button>
          </div>
          
          <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#F9FAFB', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label" htmlFor="nomeEditar">
                Nome do Cliente <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                id="nomeEditar"
                type="text"
                className="input-field"
                placeholder="Ex: João da Silva"
                value={nomeClienteBusca}
                onChange={(e) => setNomeClienteBusca(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="etapaGlobal">
                Etapa Global do Processo
              </label>
              <select 
                id="etapaGlobal"
                className="select-field"
                value={etapaProcesso}
                onChange={(e) => setEtapaProcesso(e.target.value)}
              >
                {etapasList.map(etapa => (
                  <option key={etapa} value={etapa}>{etapa}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="admin-form-grid mb-8">
            {processosEditaveis.map((processo) => (
              <div key={processo.orgao} className="admin-card-row">
                <div>
                  <label className="input-label">Órgão</label>
                  <div style={{ fontWeight: 600, padding: '0.875rem 0' }}>{processo.orgao}</div>
                </div>
                
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select 
                    className="select-field"
                    value={processo.status}
                    onChange={(e) => handleStatusChange(processo.orgao, e.target.value)}
                  >
                    {statusList.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                
                <div className="input-group">
                  <label className="input-label">Data de Atualização</label>
                  <input 
                    type="date"
                    className="input-field"
                    value={processo.atualizado_em}
                    onChange={(e) => handleDateChange(processo.orgao, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button 
              className="btn-primary" 
              style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
              onClick={() => setActiveTab('dashboard')}
            >
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSaveManual} disabled={saving}>
              {saving ? <RotateCw className="spinner" size={20} /> : <Save size={20} />}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      )}

    </div>
      </main>
    </div>
  );
};

export default AdminArea;
