import { supabase } from '../lib/supabase';
import { cleanDocument } from '../utils/formatters';

// Estrutura esperada no banco (Tabela 'processos'):
// id (uuid, pk)
// documento (text) - CPF/CNPJ apenas números
// orgao (text) - Nome do órgão (ex: 'SERASA', 'SPC', etc)
// status (text) - Status atual
// atualizado_em (date) - Data da última atualização

export const orgaosList = [
  'Boa Vista',
  'SPC',
  'CENPROT Nacional',
  'CENPROT SP',
  'Serasa'
];

export const etapasList = [
  '01 – Início Jurídico do Processo',
  '02 – Decisão Concedida',
  '03 – Protocolização nos Órgãos',
  '04 – Início das Baixas',
  '05 – Finalização das Baixas'
];

export const statusList = [
  'Aguardando início das baixas',
  'Baixas iniciadas',
  'Baixado',
  'Processo em reprotocolo'
];

// Busca os processos de um cliente pelo CPF/CNPJ
export const getProcessosByDocumento = async (documento) => {
  const docLimpo = cleanDocument(documento);
  
  try {
    const { data, error } = await supabase
      .from('processos')
      .select('*')
      .eq('documento', docLimpo);

    if (error) {
      console.error('Erro ao buscar processos:', error);
      // Para demonstração se o Supabase não estiver configurado, retorna vazio
      if (error.message && error.message.includes('fetch')) {
         return null; 
      }
      return [];
    }

    return data;
  } catch (error) {
    console.error('Erro inesperado:', error);
    return null;
  }
};

// Exclui todos os processos de um cliente pelo CPF/CNPJ
export const deleteProcessoByDocumento = async (documento) => {
  const docLimpo = cleanDocument(documento);
  
  try {
    const { error } = await supabase
      .from('processos')
      .delete()
      .eq('documento', docLimpo);

    if (error) {
      console.error('Erro ao excluir processos:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro inesperado ao excluir:', error);
    return false;
  }
};

// Salva ou atualiza os status dos órgãos de um cliente
export const saveProcessos = async (documento, processos) => {
  const docLimpo = cleanDocument(documento);
  
  try {
    // Primeiro exclui os antigos para este documento para inserir os novos, 
    // ou usa um upsert se a tabela tiver chave composta (documento, orgao)
    const { error: deleteError } = await supabase
      .from('processos')
      .delete()
      .eq('documento', docLimpo);

    if (deleteError) {
      console.error('Erro ao limpar processos antigos:', deleteError);
      return false;
    }

    const processosParaInserir = processos.map(p => ({
      documento: docLimpo,
      nome_cliente: p.nome_cliente || null,
      orgao: p.orgao,
      status: p.status,
      atualizado_em: p.atualizado_em,
      etapa: p.etapa || '01 – Início Jurídico do Processo'
    }));

    const { error: insertError } = await supabase
      .from('processos')
      .insert(processosParaInserir);

    if (insertError) {
      console.error('Erro ao inserir processos:', insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro inesperado ao salvar:', error);
    return false;
  }
};

// Salva processos em massa para uma lista de documentos
export const saveProcessosEmMassa = async (listaDocumentos, status, atualizado_em, etapa = '01 – Início Jurídico do Processo') => {
  try {
    const documentosLimpos = listaDocumentos.map(doc => cleanDocument(doc)).filter(doc => doc.length === 11 || doc.length === 14);
    
    if (documentosLimpos.length === 0) return false;

    // Remove os registros antigos para os documentos na lista
    const { error: deleteError } = await supabase
      .from('processos')
      .delete()
      .in('documento', documentosLimpos);

    if (deleteError) {
      console.error('Erro ao limpar processos antigos em massa:', deleteError);
      return false;
    }

    // Monta o array de inserção
    const processosParaInserir = [];
    documentosLimpos.forEach(doc => {
      orgaosList.forEach(orgao => {
        processosParaInserir.push({
          documento: doc,
          orgao: orgao,
          status: status,
          atualizado_em: atualizado_em,
          etapa: etapa
        });
      });
    });

    // Supabase suporta inserção em lote limitando o payload, mas para listas comuns (ex: algumas centenas de CPFs)
    // vai funcionar perfeitamente de uma vez.
    const { error: insertError } = await supabase
      .from('processos')
      .insert(processosParaInserir);

    if (insertError) {
      console.error('Erro ao inserir processos em massa:', insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro inesperado ao salvar em massa:', error);
    return false;
  }
};

// Busca todos os clientes únicos para o Dashboard
export const getAllClientes = async () => {
  try {
    const { data, error } = await supabase
      .from('processos')
      .select('documento, atualizado_em, nome_cliente, etapa')
      .order('atualizado_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar todos os clientes:', error);
      return [];
    }

    // Remover duplicados (já que cada documento tem 5 registros)
    // Manter a data de atualização mais recente para cada documento
    const clientesMap = new Map();
    
    if (data) {
      data.forEach(item => {
        if (!clientesMap.has(item.documento)) {
          clientesMap.set(item.documento, { atualizado_em: item.atualizado_em, nome: item.nome_cliente, etapa: item.etapa });
        } else {
          // Se já existe, checa se essa data é mais recente
          const existingDate = new Date(clientesMap.get(item.documento).atualizado_em);
          const newDate = new Date(item.atualizado_em);
          if (isNaN(newDate.getTime())) return; // ignorar se for invalida
          if (isNaN(existingDate.getTime()) || newDate > existingDate) {
            clientesMap.set(item.documento, { atualizado_em: item.atualizado_em, nome: item.nome_cliente, etapa: item.etapa });
          }
        }
      });
    }


    // Converter para array de objetos
    const clientesUnicos = Array.from(clientesMap, ([documento, valores]) => ({
      documento,
      atualizado_em: valores.atualizado_em,
      nome_cliente: valores.nome,
      etapa: valores.etapa
    }));

    // Ordenar do mais recente para o mais antigo
    return clientesUnicos.sort((a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em));

  } catch (error) {
    console.error('Erro inesperado:', error);
    return [];
  }
};

// Busca clientes únicos por data de atualização (para preview do lote)
export const getClientesByData = async (date) => {
  try {
    const { data, error } = await supabase
      .from('processos')
      .select('documento, nome_cliente, etapa')
      .eq('atualizado_em', date);

    if (error) {
      console.error('Erro ao buscar clientes por data:', error);
      return [];
    }

    const map = new Map();
    data.forEach(item => {
      if (!map.has(item.documento)) {
        map.set(item.documento, { documento: item.documento, nome_cliente: item.nome_cliente, etapa: item.etapa });
      }
    });

    return Array.from(map.values());
  } catch (error) {
    console.error('Erro inesperado:', error);
    return [];
  }
};

// Atualiza status e/ou etapa de todos os processos de uma data específica
export const updateProcessosByData = async (date, updates) => {
  try {
    const payload = {};
    if (updates.status) payload.status = updates.status;
    if (updates.etapa) payload.etapa = updates.etapa;
    if (updates.novaData) payload.atualizado_em = updates.novaData;

    if (Object.keys(payload).length === 0) return false;

    const { error } = await supabase
      .from('processos')
      .update(payload)
      .eq('atualizado_em', date);

    if (error) {
      console.error('Erro ao atualizar em lote:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Erro inesperado:', error);
    return false;
  }
};
