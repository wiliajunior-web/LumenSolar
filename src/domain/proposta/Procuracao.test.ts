import { describe, it, expect, vi, afterEach } from 'vitest';
import { Procuracao } from './Procuracao';
import { extractPdfTextJoined } from './pdfTextTestHelper';

// Procuracao.tsx não tinha NENHUMA cobertura de teste antes da rodada de
// ago/2026. Os bugs abaixo foram descobertos por auditoria (primeiro sobre
// os PDFs/JSON gerados, depois confirmados lendo o arquivo inteiro).

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

describe('Procuracao — classe de geração (microgeração vs minigeração)', () => {
  // BUG CORRIGIDO (ago/2026): texto de "Poderes Outorgados" sempre dizia
  // "instalacao do sistema de microgeracao fotovoltaica", mesmo quando
  // enquadramento.classe (LIMITE_MICROGERACAO_KW=75kWp, fioB/types.ts)
  // classificava o projeto como minigeração.

  it('enquadramento.classe="minigeracao" gera texto com "minigeração", não "microgeração"', () => {
    const data = dataBase({ enquadramento: { classe: 'minigeracao' } });
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('minigeração');
    expect(texto).not.toContain('sistema de microgeração');
  });

  it('enquadramento.classe="microgeracao" gera texto com "microgeração" (comportamento correto p/ projeto pequeno)', () => {
    const data = dataBase({ enquadramento: { classe: 'microgeracao' } });
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('microgeração');
  });

  it('enquadramento ausente (documento gerado sem cálculo completo) não quebra — assume microgeração por padrão', () => {
    const data = dataBase({ enquadramento: undefined });
    expect(() => Procuracao({ data })).not.toThrow();
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('microgeração');
  });
});

describe('Procuracao — acentuação e símbolos (WinAnsiEncoding)', () => {
  // BUG CORRIGIDO (ago/2026): a função safe() convertia todo acentuado (e
  // nº/°/²/³/aspas curvas/travessão) para ASCII, sob a premissa (falsa,
  // verificada empiricamente com pdftotext — ver comentário em
  // Procuracao.tsx) de que o Helvetica do @react-pdf/renderer não suporta
  // Unicode completo. MemorialDescritivo.tsx e PropostaComercialPDF.tsx já
  // usam a mesma fontFamily:'Helvetica' sem nenhum stripping e renderizam
  // acento corretamente — só a Procuração destoava. Além do stripping da
  // safe(), havia strings hardcoded em ASCII puro (ex: "no" em vez de "nº")
  // que não passavam pela safe() e precisaram ser corrigidas manualmente.

  it('título e corpo saem acentuados, não em ASCII puro', () => {
    const data = dataBase();
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('PROCURAÇÃO');
    expect(texto).not.toContain('PROCURACAO');
    expect(texto).toContain('Através');
    expect(texto).toContain('informações');
    expect(texto).toContain('exigências');
    expect(texto).toContain('certidões');
    expect(texto).toContain('necessários');
    expect(texto).toContain('município');
  });

  it('"nº" sai como símbolo correto, não como "no" literal', () => {
    const data = dataBase({
      cliente: { ...dataBase().cliente, rg: '12.345.678-9' },
      empresa: { ...dataBase().empresa, cpfEngenheiro: '987.654.321-00' },
      localizacao: { numeroUC: '3341234' },
    });
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('RG nº');
    expect(texto).toContain('CPF nº');
    expect(texto).toContain('CNPJ nº');
    expect(texto).toContain('UC nº');
    expect(texto).toContain('Lei nº 14.300/2022');
  });

  it('mês da data por extenso sai acentuado quando cai em março', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15)); // 15/mar/2026 (mês índice 2)
    try {
      const data = dataBase();
      const texto = extractPdfTextJoined(Procuracao({ data }));
      expect(texto).toContain('março');
      expect(texto).not.toContain('marco');
    } finally {
      vi.useRealTimers();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe('Procuracao — aviso de cadastro de empresa incompleto', () => {
  // ADICIONADO (ago/2026): procuração é instrumento de representação legal;
  // sem responsavelTecnico + CREA + CNPJ da empresa preenchidos, o outorgado
  // não está identificado e o documento sai incompleto sem qualquer aviso
  // visível (só os placeholders em branco '___________', fáceis de passar
  // despercebidos). Ver auditoria "geração de documentos" (ago/2026), item 2.

  it('empresa sem responsavelTecnico/CREA/CNPJ mostra aviso de cadastro incompleto', () => {
    const data = dataBase({ empresa: { razaoSocial: 'Lumen Soluções Ltda' } });
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('CADASTRO DA EMPRESA INCOMPLETO');
  });

  it('empresa com responsavelTecnico, CREA e CNPJ preenchidos NÃO mostra aviso', () => {
    const data = dataBase({
      empresa: {
        razaoSocial: 'Lumen Soluções Ltda',
        cnpj: '11.111.111/0001-11',
        responsavelTecnico: 'Wilian Junior',
        crea: '123456',
        uf: 'MG',
      },
    });
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).not.toContain('CADASTRO DA EMPRESA INCOMPLETO');
  });

  it('faltando só o CREA (responsavelTecnico e CNPJ presentes) ainda mostra aviso', () => {
    const data = dataBase({
      empresa: {
        razaoSocial: 'Lumen Soluções Ltda',
        cnpj: '11.111.111/0001-11',
        responsavelTecnico: 'Wilian Junior',
      },
    });
    const texto = extractPdfTextJoined(Procuracao({ data }));
    expect(texto).toContain('CADASTRO DA EMPRESA INCOMPLETO');
  });
});
