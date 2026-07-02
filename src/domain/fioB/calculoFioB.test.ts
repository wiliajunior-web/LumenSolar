import { describe, expect, it } from 'vitest';
import { classificarEnquadramento, percentualFioBPorAno, custoAnualFioB } from './calculoFioB';
import { ParametrosEnquadramentoGD } from './types';

const base: ParametrosEnquadramentoGD = {
  dataProtocoloAcesso: '2026-06-15',
  potenciaInstaladaKW: 8,
  fonte: 'fotovoltaica',
  modalidade: 'autoconsumo_local',
};

describe('classificarEnquadramento', () => {
  it('classifica como microgeração até 75 kW', () => {
    const r = classificarEnquadramento({ ...base, potenciaInstaladaKW: 75 });
    expect(r.classe).toBe('microgeracao');
  });

  it('classifica como minigeração acima de 75 kW', () => {
    const r = classificarEnquadramento({ ...base, potenciaInstaladaKW: 75.01 });
    expect(r.classe).toBe('minigeracao');
  });

  it('não é elegível ao art. 26 quando protocolado após 12 meses da publicação', () => {
    const r = classificarEnquadramento({ ...base, dataProtocoloAcesso: '2026-06-15' });
    expect(r.elegivelArt26).toBe(false);
  });

  it('é elegível ao art. 26 quando protocolado dentro de 12 meses da publicação (07/01/2022)', () => {
    const r = classificarEnquadramento({ ...base, dataProtocoloAcesso: '2022-12-01' });
    expect(r.elegivelArt26).toBe(true);
  });

  it('é elegível ao art. 26 no limite exato de 12 meses', () => {
    const r = classificarEnquadramento({ ...base, dataProtocoloAcesso: '2023-01-07' });
    expect(r.elegivelArt26).toBe(true);
  });

  it('aplica regra especial do art. 27 §1º para minigeração >500kW, autoconsumo remoto, titular >=25%', () => {
    const r = classificarEnquadramento({
      ...base,
      potenciaInstaladaKW: 600,
      modalidade: 'autoconsumo_remoto',
      participacaoMaiorTitularPercent: 30,
    });
    expect(r.regraEspecialArt27Paragrafo1).toBe(true);
  });

  it('não aplica regra especial se participação do titular for menor que 25%', () => {
    const r = classificarEnquadramento({
      ...base,
      potenciaInstaladaKW: 600,
      modalidade: 'autoconsumo_remoto',
      participacaoMaiorTitularPercent: 10,
    });
    expect(r.regraEspecialArt27Paragrafo1).toBe(false);
  });
});

describe('percentualFioBPorAno', () => {
  it('retorna 0% para unidades elegíveis ao art. 26 (transição) até 2045', () => {
    const enquadramento = classificarEnquadramento({ ...base, dataProtocoloAcesso: '2022-06-01' });
    expect(percentualFioBPorAno(enquadramento, 2030)).toBe(0);
    expect(percentualFioBPorAno(enquadramento, 2045)).toBe(0);
  });

  it('segue o escalonamento do art. 27 para quem não é elegível ao art. 26', () => {
    const enquadramento = classificarEnquadramento({ ...base, dataProtocoloAcesso: '2026-06-15' });
    expect(percentualFioBPorAno(enquadramento, 2023)).toBe(0.15);
    expect(percentualFioBPorAno(enquadramento, 2024)).toBe(0.30);
    expect(percentualFioBPorAno(enquadramento, 2025)).toBe(0.45);
    expect(percentualFioBPorAno(enquadramento, 2026)).toBe(0.60);
    expect(percentualFioBPorAno(enquadramento, 2027)).toBe(0.75);
    expect(percentualFioBPorAno(enquadramento, 2028)).toBe(0.90);
    expect(percentualFioBPorAno(enquadramento, 2029)).toBe(1);
    expect(percentualFioBPorAno(enquadramento, 2035)).toBe(1);
  });

  it('100% para regra especial do art. 27 §1º, mesmo antes de 2028', () => {
    const enquadramento = classificarEnquadramento({
      ...base,
      potenciaInstaladaKW: 600,
      dataProtocoloAcesso: '2026-06-15',
      modalidade: 'geracao_compartilhada',
      participacaoMaiorTitularPercent: 50,
    });
    expect(percentualFioBPorAno(enquadramento, 2026)).toBe(1);
  });
});

describe('custoAnualFioB', () => {
  it('calcula o custo proporcional ao percentual do ano', () => {
    const enquadramento = classificarEnquadramento({ ...base, dataProtocoloAcesso: '2026-06-15' });
    const custo = custoAnualFioB(6000, 0.30, enquadramento, 2026); // 60% em 2026
    expect(custo).toBeCloseTo(6000 * 0.30 * 0.60, 5);
  });

  it('é zero para unidade com direito ao art. 26', () => {
    const enquadramento = classificarEnquadramento({ ...base, dataProtocoloAcesso: '2022-03-01' });
    const custo = custoAnualFioB(6000, 0.30, enquadramento, 2026);
    expect(custo).toBe(0);
  });
});
