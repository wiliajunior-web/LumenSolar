import { describe, it, expect } from 'vitest';
import {
  camposFaltantesCadastroEmpresa,
  cadastroEmpresaIncompleto,
  mensagemCadastroEmpresaIncompleto,
  formatarCrea,
} from './cadastroEmpresa';

describe('cadastroEmpresaIncompleto', () => {
  it('caso real auditado (Ana Maria Vieira de Sá e Silva): empresa sem nenhum dado — incompleto', () => {
    // Valores reais do .lumensolar do caso: responsavelTecnico/crea/cnpj todos "".
    const empresa = { responsavelTecnico: '', crea: '', cnpj: '' };
    expect(cadastroEmpresaIncompleto(empresa)).toBe(true);
  });

  it('empresa com os 3 campos obrigatórios preenchidos: completo', () => {
    const empresa = { responsavelTecnico: 'Eng. João Silva', crea: '123456', cnpj: '11.111.111/0001-11' };
    expect(cadastroEmpresaIncompleto(empresa)).toBe(false);
  });

  it('falta só um dos 3 campos: ainda incompleto (não é "maioria preenchida")', () => {
    expect(cadastroEmpresaIncompleto({ responsavelTecnico: 'Eng. João', crea: '123456', cnpj: '' })).toBe(true);
    expect(cadastroEmpresaIncompleto({ responsavelTecnico: 'Eng. João', crea: '', cnpj: '11.111.111/0001-11' })).toBe(true);
    expect(cadastroEmpresaIncompleto({ responsavelTecnico: '', crea: '123456', cnpj: '11.111.111/0001-11' })).toBe(true);
  });

  it('campo só com espaços em branco conta como vazio (não passa por trim())', () => {
    expect(cadastroEmpresaIncompleto({ responsavelTecnico: '   ', crea: '123456', cnpj: '11.111.111/0001-11' })).toBe(true);
  });

  it('empresa undefined/null: incompleto, sem lançar exceção', () => {
    expect(cadastroEmpresaIncompleto(undefined)).toBe(true);
    expect(cadastroEmpresaIncompleto(null)).toBe(true);
  });
});

describe('camposFaltantesCadastroEmpresa', () => {
  it('lista exatamente os campos vazios, na ordem Responsável Técnico → CREA → CNPJ', () => {
    const faltantes = camposFaltantesCadastroEmpresa({ responsavelTecnico: '', crea: '', cnpj: '11.111.111/0001-11' });
    expect(faltantes.map((f) => f.label)).toEqual(['Responsável Técnico', 'CREA']);
  });

  it('nenhum campo faltando: lista vazia', () => {
    const faltantes = camposFaltantesCadastroEmpresa({ responsavelTecnico: 'Eng. João', crea: '123456', cnpj: '11.111.111/0001-11' });
    expect(faltantes).toHaveLength(0);
  });
});

describe('mensagemCadastroEmpresaIncompleto', () => {
  it('cita só os campos que realmente faltam (caso real: só CNPJ vazio)', () => {
    const msg = mensagemCadastroEmpresaIncompleto({ responsavelTecnico: 'Eng. João', crea: '123456', cnpj: '' });
    expect(msg).toContain('CNPJ');
    expect(msg).not.toContain('Responsável Técnico,');
    expect(msg).not.toContain('CREA,');
  });

  it('menciona onde corrigir (Configurações) e a consequência concreta (Procuração/Formulário CEMIG)', () => {
    const msg = mensagemCadastroEmpresaIncompleto({ responsavelTecnico: '', crea: '', cnpj: '' });
    expect(msg).toContain('Configurações');
    expect(msg).toContain('Procuração');
    expect(msg).toContain('Formulário CEMIG');
  });
});

// ADICIONADO (ago/2026): ver comentário completo em cadastroEmpresa.ts —
// bug real encontrado na auditoria de design dos documentos gerados (caso
// Ana Maria Vieira de Sá e Silva): assinatura da Proposta Comercial saiu
// "CREA-MG CREA-MG 123456".
describe('formatarCrea', () => {
  it('caso real que motivou a correção: usuário já digitou "CREA-MG 123456" — não duplica o prefixo', () => {
    expect(formatarCrea({ crea: 'CREA-MG 123456', uf: 'MG' })).toBe('CREA-MG 123456');
  });

  it('usuário digitou só o número: adiciona o prefixo CREA-{UF}', () => {
    expect(formatarCrea({ crea: '123456', uf: 'MG' })).toBe('CREA-MG 123456');
  });

  it('sem UF cadastrada: usa MG como padrão (mesmo fallback já usado em Procuracao.tsx)', () => {
    expect(formatarCrea({ crea: '123456' })).toBe('CREA-MG 123456');
  });

  it('detecta o prefixo "CREA " com espaço, não só "CREA-" com hífen', () => {
    expect(formatarCrea({ crea: 'CREA MG 123456', uf: 'MG' })).toBe('CREA MG 123456');
  });

  it('CREA vazio ou empresa undefined/null: string vazia, sem lançar exceção', () => {
    expect(formatarCrea({ crea: '' })).toBe('');
    expect(formatarCrea(undefined)).toBe('');
    expect(formatarCrea(null)).toBe('');
  });
});
