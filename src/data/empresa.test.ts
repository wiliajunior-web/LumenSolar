import { describe, it, expect } from 'vitest';
import { empresaSemSegredos, DADOS_EMPRESA_PADRAO } from './empresa';

// BUG CORRIGIDO (set/2026): ver o comentário completo em `empresaSemSegredos`
// (empresa.ts) para o histórico do problema — resumo: o objeto `empresa` da
// store carrega um campo solto `anthropicApiKey` (nunca fez parte de
// `DadosEmpresa`, adicionado via `as any` na tela "⚙ Empresa" só pra
// alimentar a importação de datasheet por IA) e esse MESMO objeto era
// embutido inteiro, sem filtro, em três artefatos que saem da máquina do
// usuário: o arquivo .lumensolar salvo, o Excel de auditoria/CEMIG (enviado
// à distribuidora) e o payload de todos os PDFs (enviados ao cliente).
// `empresaSemSegredos` é o ponto único que remove esse campo antes de
// qualquer um desses três usos — estes testes cobrem a função pura; a
// verificação de que ela está de fato sendo chamada nos 3 pontos de uso é
// feita por auditoria de código (grep) e por um teste de ponta a ponta real
// em `arquivo_lumensolar.test.ts` (grava um arquivo .lumensolar de verdade
// com uma chave de API fake no estado e confirma que o texto da chave NÃO
// aparece em lugar nenhum do arquivo gravado em disco).
describe('empresaSemSegredos', () => {
  it('remove o campo anthropicApiKey mas preserva todos os outros campos', () => {
    const comChave = { ...DADOS_EMPRESA_PADRAO, razaoSocial: 'Teste LTDA', anthropicApiKey: 'sk-ant-api03-SEGREDO-FALSO-DE-TESTE' } as any;
    const limpo = empresaSemSegredos(comChave);
    expect(limpo.anthropicApiKey).toBeUndefined();
    expect('anthropicApiKey' in limpo).toBe(false);
    expect(limpo.razaoSocial).toBe('Teste LTDA');
    // Todos os outros campos de DadosEmpresa devem sobreviver intactos —
    // comparação campo a campo, não só "algum objeto voltou".
    for (const chave of Object.keys(DADOS_EMPRESA_PADRAO)) {
      expect((limpo as any)[chave]).toEqual((comChave as any)[chave]);
    }
  });

  it('não modifica o objeto original (retorna cópia, não muta in-place)', () => {
    const comChave = { ...DADOS_EMPRESA_PADRAO, anthropicApiKey: 'sk-ant-api03-OUTRO-SEGREDO-FALSO' } as any;
    empresaSemSegredos(comChave);
    // O objeto passado como argumento continua com a chave — só a CÓPIA
    // retornada é que não tem. Isso importa porque a store (Zustand) não
    // pode ter seu estado mutado por fora de um `set()`.
    expect(comChave.anthropicApiKey).toBe('sk-ant-api03-OUTRO-SEGREDO-FALSO');
  });

  it('funciona normalmente quando não há chave de API nenhuma (caso comum: usuário nunca configurou)', () => {
    const semChave = { ...DADOS_EMPRESA_PADRAO };
    const limpo = empresaSemSegredos(semChave as any);
    expect(limpo).toEqual(semChave);
  });

  it('lida com null/undefined sem lançar (defensivo — chamado em vários pontos de exportação)', () => {
    expect(empresaSemSegredos(null as any)).toBeNull();
    expect(empresaSemSegredos(undefined as any)).toBeUndefined();
  });
});
