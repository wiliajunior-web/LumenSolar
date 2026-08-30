import { describe, it, expect } from 'vitest';
import { camposEmpresaParaPreencherAoImportar } from './App';

// ADICIONADO (ago/2026): auditoria de rotinas do sistema encontrou
// `restaurarDados()` (App.tsx, usada por "Importar arquivo") fazendo merge
// raso de `data.empresa` por cima da config atual — importar um arquivo
// .lumensolar mais antigo (salvo antes do usuário preencher ⚙ Configurações)
// apagava Responsável Técnico/CREA/CNPJ já preenchidos, reintroduzindo pelo
// caminho de importação o mesmo bug de "Procuração sai com nome do
// engenheiro em branco" já corrigido nesta sessão. App.tsx não tem infra de
// teste de componente/interação (mesma limitação de sempre) — só a função
// pura que decide QUAIS campos aplicar é testável, extraída especificamente
// para isto.
describe('camposEmpresaParaPreencherAoImportar', () => {
  it('caso real que motivou a correção: arquivo antigo sem cadastro não apaga config atual já preenchida', () => {
    // Config atual: usuário já preencheu Configurações depois do bug da
    // Procuração ter sido corrigido.
    const empresaAtual = {
      razaoSocial: 'Lumen Soluções Ltda',
      responsavelTecnico: 'Eng. João Silva',
      crea: '123456',
      cnpj: '11.111.111/0001-11',
    };
    // Snapshot embutido no arquivo .lumensolar da Ana Maria — salvo ANTES do
    // cadastro ter sido preenchido (valores reais do caso auditado).
    const empresaArquivo = {
      razaoSocial: 'Lumen Soluções Ltda',
      responsavelTecnico: '',
      crea: '',
      cnpj: '',
      telefone: '',
      email: '',
    };
    const faltantes = camposEmpresaParaPreencherAoImportar(empresaAtual, empresaArquivo);
    expect(faltantes).toEqual({}); // nada deve ser aplicado — atual já está completo
  });

  it('config atual vazia (primeiro uso): preenche a partir do snapshot do arquivo', () => {
    const empresaAtual = { razaoSocial: '', responsavelTecnico: '', crea: '', cnpj: '' };
    const empresaArquivo = { razaoSocial: 'Lumen Soluções Ltda', responsavelTecnico: 'Eng. João Silva', crea: '123456', cnpj: '11.111.111/0001-11' };
    const faltantes = camposEmpresaParaPreencherAoImportar(empresaAtual, empresaArquivo);
    expect(faltantes).toEqual(empresaArquivo);
  });

  it('preenche só as lacunas — não mexe em campos já preenchidos, mesmo que o arquivo traga valor diferente', () => {
    const empresaAtual = { responsavelTecnico: 'Eng. João Silva', crea: '', cnpj: '11.111.111/0001-11' };
    const empresaArquivo = { responsavelTecnico: 'Eng. Outro Nome', crea: '654321', cnpj: '22.222.222/0001-22' };
    const faltantes = camposEmpresaParaPreencherAoImportar(empresaAtual, empresaArquivo);
    expect(faltantes).toEqual({ crea: '654321' }); // só o campo que estava vazio
  });

  it('valor vazio no arquivo nunca "preenche" nada, mesmo que o campo atual também esteja vazio', () => {
    const faltantes = camposEmpresaParaPreencherAoImportar({ crea: '' }, { crea: '' });
    expect(faltantes).toEqual({});
  });

  it('empresa atual ou do arquivo undefined/null: não lança exceção', () => {
    expect(camposEmpresaParaPreencherAoImportar(undefined, { crea: '123456' })).toEqual({ crea: '123456' });
    expect(camposEmpresaParaPreencherAoImportar({ crea: '123456' }, undefined)).toEqual({});
    expect(camposEmpresaParaPreencherAoImportar(null, null)).toEqual({});
  });
});
