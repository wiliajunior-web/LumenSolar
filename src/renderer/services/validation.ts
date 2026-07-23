/**
 * Validação visual dos campos obrigatórios.
 * Cada passo retorna uma lista de erros e o status (vazio / parcial / completo).
 */

export type StatusPasso = 'vazio' | 'parcial' | 'completo';

export interface ErroValidacao {
  campo: string;
  mensagem: string;
}

export interface ResultadoValidacao {
  status: StatusPasso;
  erros: ErroValidacao[];
}

export function validarCliente(cliente: any): ResultadoValidacao {
  const erros: ErroValidacao[] = [];
  if (!cliente.nome?.trim()) erros.push({ campo: 'nome', mensagem: 'Nome completo obrigatório' });
  if (!cliente.cidade?.trim()) erros.push({ campo: 'cidade', mensagem: 'Cidade obrigatória' });
  // UF sempre tem valor padrão 'MG', não precisa ser validada como vazia

  const status: StatusPasso = erros.length === 0 ? 'completo'
    : (cliente.nome || cliente.cidade) ? 'parcial' : 'vazio';
  return { status, erros };
}

export function validarConsumo(consumo: any): ResultadoValidacao {
  const erros: ErroValidacao[] = [];
  const mesesValidos = (consumo.contas ?? []).filter((c: any) => c.kWh > 0).length;
  if ((consumo.cipMensalRS ?? 0) < 0) erros.push({ campo: 'cip', mensagem: 'CIP/COSIP não pode ser negativo' });
  if (mesesValidos < 3) erros.push({ campo: 'contas', mensagem: `Preencha pelo menos 3 meses de consumo (${mesesValidos}/3 preenchidos)` });
  if (consumo.cipMensalRS < 0) erros.push({ campo: 'cip', mensagem: 'CIP/COSIP não pode ser negativo' });

  const status: StatusPasso = erros.length === 0 ? 'completo'
    : mesesValidos > 0 ? 'parcial' : 'vazio';
  return { status, erros };
}

export function validarKit(kit: any): ResultadoValidacao {
  const erros: ErroValidacao[] = [];
  if (!kit.marcaModulo?.trim()) erros.push({ campo: 'marcaModulo', mensagem: 'Marca do módulo obrigatória' });
  if (!kit.potenciaModuloWp || kit.potenciaModuloWp <= 0) erros.push({ campo: 'potenciaModuloWp', mensagem: 'Potência do módulo obrigatória' });
  if (!kit.quantidade || kit.quantidade <= 0) erros.push({ campo: 'quantidade', mensagem: 'Quantidade de módulos obrigatória' });
  if (!kit.marcaInversor?.trim()) erros.push({ campo: 'marcaInversor', mensagem: 'Marca do inversor obrigatória' });
  if (!kit.potenciaInversorKW || kit.potenciaInversorKW <= 0) erros.push({ campo: 'potenciaInversorKW', mensagem: 'Potência do inversor obrigatória' });
  if (!kit.custoKitRS || kit.custoKitRS <= 0) erros.push({ campo: 'custoKitRS', mensagem: 'Custo do kit obrigatório' });

  const temDados = kit.marcaModulo || kit.quantidade || kit.marcaInversor;
  const status: StatusPasso = erros.length === 0 ? 'completo'
    : temDados ? 'parcial' : 'vazio';
  return { status, erros };
}

export function validarPreco(preco: any, custoKit: number): ResultadoValidacao {
  const erros: ErroValidacao[] = [];
  if (custoKit <= 0) erros.push({ campo: 'custoKit', mensagem: 'Custo do kit não informado (preencha na aba Kit)' });
  if (preco.aliquotaImpostos + preco.margemDesejada >= 1) erros.push({ campo: 'impostos', mensagem: 'Soma de impostos + margem não pode atingir 100%' });
  if (preco.aliquotaImpostos < 0 || preco.aliquotaImpostos > 0.50) erros.push({ campo: 'aliquota', mensagem: 'Alíquota de impostos fora do intervalo válido' });

  // Kit com custo preenchido = parcial (indica que usuário começou a preencher)
  const status: StatusPasso = erros.length === 0 ? 'completo'
    : custoKit > 0 ? 'parcial' : 'vazio';
  return { status, erros };
}

export function validarProjetoCompleto(state: any): { podeCalcular: boolean; erros: ErroValidacao[] } {
  const v = [
    validarCliente(state.cliente),
    validarConsumo(state.consumo),
    validarKit(state.kit),
    validarPreco(state.preco, state.kit.custoKitRS),
  ];
  const todosErros = v.flatMap(r => r.erros);
  return {
    podeCalcular: todosErros.length === 0,
    erros: todosErros,
  };
}

/** Valida CPF brasileiro — algoritmo oficial Receita Federal */
export function validarCPF(cpf: string): boolean {
  const s = cpf.replace(/\D/g, '');
  if (s.length !== 11 || /^(\d)\1{10}$/.test(s)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(s[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(s[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(s[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(s[10]);
}

/** Valida CNPJ brasileiro — algoritmo oficial Receita Federal */
export function validarCNPJ(cnpj: string): boolean {
  const s = cnpj.replace(/\D/g, '');
  if (s.length !== 14 || /^(\d)\1{13}$/.test(s)) return false;
  const calc = (n: number) => {
    let soma = 0;
    let pos = n - 7;
    for (let i = 0; i < n; i++) {
      soma += parseInt(s[i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(s[12]) && calc(13) === parseInt(s[13]);
}

/** Formata CPF: 000.000.000-00 */
export function formatarCPF(cpf: string): string {
  const s = cpf.replace(/\D/g, '').slice(0, 11);
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
          .replace(/(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3')
          .replace(/(\d{3})(\d{1,3})$/, '$1.$2');
}
