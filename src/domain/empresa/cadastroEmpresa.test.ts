import { describe, it, expect } from 'vitest';
import {
  camposFaltantesCadastroEmpresa,
  cadastroEmpresaIncompleto,
  mensagemCadastroEmpresaIncompleto,
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
