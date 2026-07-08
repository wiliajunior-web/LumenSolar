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
