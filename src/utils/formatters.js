export const formatCPFCNPJ = (value) => {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 11) {
    // Format CPF
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  } else {
    // Format CNPJ
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
};

export const cleanDocument = (value) => {
  return value.replace(/\D/g, '');
};

export const isValidDocument = (value) => {
  const clean = cleanDocument(value);
  return clean.length === 11 || clean.length === 14;
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return ''; // Return empty string if invalid date
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

export const formatDateTime = (isoString) => {
  if (!isoString) return '--/--/---- às --:--';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '--/--/---- às --:--'; // Handle invalid date
  const datePart = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const timePart = date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  return `${datePart} às ${timePart}`;
};
