import { describe, it, expect } from 'vitest';
import { calcularProtecaoCC, calcularDPSCA } from './calcularProtecaoCC';

describe('calcularProtecaoCC', () => {
  // Caso de referência conferido manualmente antes de escrever o teste:
  // Isc=14A, 2 strings, Voc=49.5V, 10 módulos/string, coef=-0.34%/°C, 40°C
  //   Icc total = 14*2 = 28A; Iprojeto = 28*1.25 = 35A
  //   FTA(40°C) = 0.91 (valor tabelado exato — NBR 16612 Tab. C.2)
  //   Iprojeto/FTA = 35/0.91 = 38.4615...A → cabo 6mm² (41A ≥ 38.46, 4mm²=32A insuficiente)
  //   Iz corrigida = 41*0.91 = 37.31A
  //   DPS CC: Isc=14 > 12 → 10kA
  //   Voc sistema = 49.5*10 = 495V
  //   Voc frio = 495*(1+(-0.34/100)*(5-25)) = 495*(1+0.068) = 528.66V (< 1000V, ok)
  //   Fusível: primeiro de [8,10,12,15,20,25,30] com f>=14 e f<=35 → 15A
  it('caso de referência (verificado manualmente): kit típico 2 strings de 10 módulos', () => {
    const r = calcularProtecaoCC({
      iscA: 14, vocV: 49.5, numStrings: 2, modulosPorString: 10,
      coeficienteTemperaturaPercentPorC: -0.34, temperaturaInstalacaoC: 40,
    });
    expect(r.correnteCurtoCircuitoTotalA).toBe(28);
    expect(r.correnteProjetoA).toBe(35);
    expect(r.fta).toBe(0.91);
    expect(r.correnteProjetoComFtaA).toBeCloseTo(38.46, 1);
    expect(r.secaoCaboMm2).toBe(6);
    expect(r.izCaboA).toBe(41);
    expect(r.izCorrigidaA).toBeCloseTo(37.31, 1);
    expect(r.dpsClasseKA).toBe(10);
    expect(r.vocSistemaV).toBeCloseTo(495, 0);
    expect(r.vocMaximoFrioV).toBeCloseTo(528.66, 1);
    expect(r.dentroDoLimiteTensao).toBe(true);
    expect(r.fusivelStringA).toBe(15);
    expect(r.alertas).toHaveLength(0);
  });

  it('DPS CC usa 5kA quando Isc <= 12A', () => {
    const r = calcularProtecaoCC({
      iscA: 10, vocV: 40, numStrings: 1, modulosPorString: 8,
      coeficienteTemperaturaPercentPorC: -0.34,
    });
    expect(r.dpsClasseKA).toBe(5);
  });

  it('alerta quando Voc no frio excede 1000V (string longa demais)', () => {
    const r = calcularProtecaoCC({
      iscA: 12, vocV: 49.5, numStrings: 1, modulosPorString: 22, // 22*49.5=1089V em STC, pior no frio
      coeficienteTemperaturaPercentPorC: -0.34,
    });
    expect(r.dentroDoLimiteTensao).toBe(false);
    expect(r.alertas.some((a) => a.includes('1000V'))).toBe(true);
  });

  it('alerta quando a corrente CC excede a maior seção tabelada (16mm²/76A)', () => {
    const r = calcularProtecaoCC({
      iscA: 14, vocV: 49.5, numStrings: 10, modulosPorString: 10, // Icc=140A, bem acima da tabela
      coeficienteTemperaturaPercentPorC: -0.34,
    });
    expect(r.secaoCaboMm2).toBe(16);
    expect(r.alertas.some((a) => a.includes('16mm'))).toBe(true);
  });

  it('respeita temperatura mínima de projeto customizada', () => {
    const padrao = calcularProtecaoCC({ iscA: 14, vocV: 49.5, numStrings: 2, modulosPorString: 10, coeficienteTemperaturaPercentPorC: -0.34 });
    const maisFrio = calcularProtecaoCC({ iscA: 14, vocV: 49.5, numStrings: 2, modulosPorString: 10, coeficienteTemperaturaPercentPorC: -0.34, temperaturaMinimaProjetoC: 0 });
    // Quanto mais frio o mínimo de projeto, maior a alta de Voc esperada
    expect(maisFrio.vocMaximoFrioV).toBeGreaterThan(padrao.vocMaximoFrioV);
  });
});

describe('calcularDPSCA', () => {
  it('15kA para potência <= 3kW (residencial baixa exposição)', () => {
    expect(calcularDPSCA(3).classeKA).toBe(15);
    expect(calcularDPSCA(2).classeKA).toBe(15);
  });

  it('20kA para 3kW < potência <= 12kW (residencial/comercial padrão)', () => {
    expect(calcularDPSCA(12).classeKA).toBe(20);
    expect(calcularDPSCA(5).classeKA).toBe(20);
  });

  it('45kA para potência > 12kW (alta exposição / industrial)', () => {
    expect(calcularDPSCA(12.1).classeKA).toBe(45);
    expect(calcularDPSCA(50).classeKA).toBe(45);
  });
});
