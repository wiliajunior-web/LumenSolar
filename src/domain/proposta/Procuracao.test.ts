import { describe, it, expect } from 'vitest';
import { Procuracao } from './Procuracao';
import { extractPdfTextJoined } from './pdfTextTestHelper';

// Procuracao.tsx não tinha NENHUMA cobertura de teste antes desta rodada.
// Os dois bugs abaixo foram descobertos por auditoria de subagente e
// confirmados lendo o arquivo inteiro (ago/2026).

function dataBase(overrides: any = {}) {
  return {
    empresa: { razaoSocial: 'Lumen Soluções Ltda', cnpj: '11.111.111/0001-11' },
    cliente: { nome: 'Maria Oliveira', cpf: '123.456.789-00', cidade: 'Araguari', uf: 'MG' },
    consumo: {},
    localizacao: {},
    enquadramento: { classe: 'microgeracao' },
    ...overrides,
  };
}

describe('Procuracao — estado civil (ecCivil)', () => {
  // BUG CORRIGIDO (ago/2026): `ecMap[cliente.estadoCivil] || 'solteiro(a)'`
  // afirmava "solteiro(a)" como FATO sempre que estadoCivil fosse 'outro'
  // (mapeava para '', falsy) ou qualquer valor ausente/não reconhecido — e
  // não existe (nem existia) nenhum campo de estado civil na UI, então essa
  // era A única saída possível na prática. Um documento com efeito legal
  // (procuração) não deve afirmar um dado nunca confirmado pelo usuário.

  it('estadoCivil="outro" (mapeia para string vazia) mostra placeholder em branco, NÃO "solteiro(a)"', () => {
    const data = dataBase({ cliente: { ...dataBase().cliente, estadoCivil: 'outro' } });
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).not.toContain('solteiro(a)');
    expect(texto).toContain('____________');
  });

  it('estadoCivil ausente/undefined mostra placeholder em branco, NÃO "solteiro(a)"', () => {
    const data = dataBase(); // cliente sem estadoCivil
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).not.toContain('solteiro(a)');
    expect(texto).toContain('____________');
  });

  it('estadoCivil="casado" (valor real informado) mostra "casado(a)" corretamente', () => {
    const data = dataBase({ cliente: { ...dataBase().cliente, estadoCivil: 'casado' } });
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('casado(a)');
    expect(texto).not.toContain('solteiro(a)');
  });

  it('estadoCivil="solteiro" (valor real informado) mostra "solteiro(a)" — não é mais um fallback, é o dado real', () => {
    const data = dataBase({ cliente: { ...dataBase().cliente, estadoCivil: 'solteiro' } });
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('solteiro(a)');
  });
});

describe('Procuracao — classe de geração (microgeracao vs minigeracao)', () => {
  // BUG CORRIGIDO (ago/2026): texto de "Poderes Outorgados" sempre dizia
  // "instalacao do sistema de microgeracao fotovoltaica", mesmo quando
  // enquadramento.classe (LIMITE_MICROGERACAO_KW=75kWp, fioB/types.ts)
  // classificava o projeto como minigeração.

  it('enquadramento.classe="minigeracao" gera texto com "minigeracao", não "microgeracao"', () => {
    const data = dataBase({ enquadramento: { classe: 'minigeracao' } });
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('minigeracao');
    expect(texto).not.toContain('sistema de microgeracao');
  });

  it('enquadramento.classe="microgeracao" gera texto com "microgeracao" (comportamento correto p/ projeto pequeno)', () => {
    const data = dataBase({ enquadramento: { classe: 'microgeracao' } });
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('microgeracao');
  });

  it('enquadramento ausente (documento gerado sem cálculo completo) não quebra — assume microgeracao por padrão', () => {
    const data = dataBase({ enquadramento: undefined });
    expect(() => Procuracao({ data })).not.toThrow();
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('microgeracao');
  });
});
