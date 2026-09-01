/**
 * DIMENSIONAMENTO DE BANCO DE BATERIAS
 * Fórmulas verificadas contra o curso (slides 1016–1019)
 * + Manual Fotovoltaico CEPEL/INPE (Equações 6.10–6.19)
 *
 * Aplicações suportadas:
 *  - BACKUP (grid-connected com bateria): autonomia em HORAS
 *  - OFFGRID/SFI: autonomia em DIAS
 */

const DIAS_MES = 365 / 12;

export type TipoBateria =
  | 'estacionaria_comum'   // Pb-ácido sem manutenção, monobloco 12V — DOD max 40%, ~4 anos
  | 'ciclo_profundo_opzs'  // OPzS (aberta, placas tubulares) — DOD max 80%, ~7+ anos
  | 'ciclo_profundo_opzv'  // OPzV (selada, gel) — DOD max 80%, ~7+ anos
  | 'litio_lifepo4';       // LiFePO4 — DOD max 90%, >3000 ciclos

export type TipoSistema = 'backup_hybrid' | 'offgrid_sfi';

interface PerfilBateria {
  label: string;
  dodMaximo: number;
  dodRecomendado: number;
  tensoesSerie: number[]; // tensões de célula/monobloco disponíveis (V)
  observacao: string;
}

export const PERFIS_BATERIA: Record<TipoBateria, PerfilBateria> = {
  estacionaria_comum: {
    label: 'Pb-ácido estacionária (sem manutenção)',
    dodMaximo: 0.50,
    dodRecomendado: 0.40,
    tensoesSerie: [12],
    observacao: 'Monoblocos 12V. DOD máx 40-50% para vida útil de ~4 anos. Máx 4–6 em paralelo.',
  },
  ciclo_profundo_opzs: {
    label: 'OPzS — ciclo profundo (aberta, manutenção)',
    dodMaximo: 0.80,
    dodRecomendado: 0.70,
    tensoesSerie: [2],
    observacao: 'Células 2V, alta capacidade. DOD até 80% com vida útil > 7 anos. Repõe água a cada 6–12 meses.',
  },
  ciclo_profundo_opzv: {
    label: 'OPzV — ciclo profundo (selada, gel)',
    dodMaximo: 0.80,
    dodRecomendado: 0.70,
    tensoesSerie: [2],
    observacao: 'Células 2V seladas. DOD até 80%, sem manutenção. Sensível a temperaturas > 35°C.',
  },
  litio_lifepo4: {
    label: 'Lítio LiFePO4',
    dodMaximo: 0.90,
    dodRecomendado: 0.80,
    tensoesSerie: [48, 24, 12],
    observacao: 'Alta densidade energética, > 3.000 ciclos. Requer BMS dedicado. Custo inicial elevado.',
  },
};

export interface ParamsBateria {
  /** Consumo médio diário (kWh/dia) */
  consumoDiarioKWh: number;
  /** Tipo da bateria */
  tipoBateria: TipoBateria;
  /** Tipo de sistema */
  tipoSistema: TipoSistema;
  /** Autonomia: horas (backup) ou dias (offgrid) */
  autonomia: number;
  /** Tensão nominal do sistema CC (12, 24 ou 48 V) */
  tensaoSistemaV: number;
  /** Capacidade de cada bateria/célula (Ah @ C/20) */
  capacidadeBateriaAh: number;
  /** Corrente de curto-circuito do arranjo FV (A) — para controlador */
  iscArranjoA?: number;
  /** Número de strings em paralelo — para controlador */
  nStringsParalelo?: number;
  /** Potência máxima das cargas CA (W) — para inversor offgrid */
  potenciaMaxCargasW?: number;
  /** HSP mínimo do local (h/dia) — para autonomia empírica offgrid */
  hspMinimo?: number;
}

export interface ResultadoBateria {
  // Energia e capacidade
  energiaDiaria_kWh: number;     // consumo diário corrigido
  capacidadeBruta_Wh: number;    // CBC20 = Energia × Autonomia / DOD (Eq. 6.10)
  capacidadeBruta_Ah: number;    // CBIC20 = CBC20 / Vsist (Eq. 6.11)
  dodUsado: number;              // DOD selecionado

  // Autonomia
  autonomiaDias?: number;        // dias de autonomia (offgrid)
  autonomiaEmpirica?: number;    // N = 0.48×HSPmin + 4.58 (Eq. 6.13)

  // Banco de baterias
  tensaoSistemaV: number;
  bateriasSerie: number;         // baterias em série para atingir Vsist
  bateriasParalelo: number;      // baterias em paralelo (Eq. 6.16) — máx 4–6
  bateriasTotal: number;         // total do banco
  capacidadeRealAh: number;      // capacidade real do banco
  capacidadeRealKWh: number;

  // Controlador de carga
  corrMaxControlador_A: number;  // Ic = 1.25 × Isc × N_parallel (Eq. 6.18)
  tensaoMaxControlador_V: number;// Vcmax > Voc × 1.25 (no frio)

  // Inversor offgrid (se aplicável)
  potMinInversor_W?: number;     // P_inversor ≥ P_max_cargas (slides 1018-1019)

  alertas: string[];
  observacoes: string[];
}

/**
 * Dimensiona banco de baterias conforme fórmulas do curso (slides 1016–1019)
 * e Manual Fotovoltaico CEPEL/INPE (Equações 6.10–6.18).
 */
export function calcularBancoBaterias(p: ParamsBateria): ResultadoBateria {
  const alertas: string[] = [];
  const observacoes: string[] = [];
  const perfil = PERFIS_BATERIA[p.tipoBateria];

  // BUG CORRIGIDO (set/2026, auditoria de robustez): App.tsx chama esta
  // função DENTRO do corpo de renderização de um componente (não num
  // handler de clique/evento) — sem guard, uma `autonomia` negativa (o
  // input "Autonomia" só tem `min="1"` de dica visual, HTML não bloqueia
  // digitação) propagava direto até `bateriasParalelo`/`bateriasTotal`
  // (via Math.ceil de um valor negativo), exibindo ao vivo algo como
  // "-5 unidades total" no painel — sem nenhum erro visível. Diferente do
  // financiamento (indicadores.ts), aqui um `throw` seria PIOR: como a
  // chamada roda a cada renderização (inclusive a cada tecla digitada), um
  // throw travaria a tela inteira (ErrorBoundary) enquanto o usuário ainda
  // está digitando, não só ao confirmar. Por isso a correção aqui é
  // "clampar" para o mínimo fisicamente válido (1) em vez de lançar erro.
  const autonomiaEfetiva = Math.max(1, p.autonomia || 0);
  if (autonomiaEfetiva !== p.autonomia) {
    alertas.push(
      `Autonomia informada (${p.autonomia}) não é um valor válido — usando o mínimo de 1 ` +
      (p.tipoSistema === 'backup_hybrid' ? 'hora' : 'dia') + ' para este cálculo.'
    );
  }
  p = { ...p, autonomia: autonomiaEfetiva };

  // ── 1. Energia diária e autonomia ─────────────────────────────────────────
  const energiaDiaria = p.consumoDiarioKWh; // kWh/dia

  // Para backup (hybrid): autonomia em horas → converter para fração do dia
  // Para offgrid: autonomia em dias
  let energiaAutonomia_kWh: number;
  let autonomiaDias: number | undefined;
  let autonomiaEmpirica: number | undefined;

  if (p.tipoSistema === 'backup_hybrid') {
    // Horas de backup × consumo médio por hora
    energiaAutonomia_kWh = (p.autonomia / 24) * energiaDiaria;
    observacoes.push(
      `Backup de ${p.autonomia}h — equivale a ${energiaAutonomia_kWh.toFixed(2)} kWh necessários.`
    );
  } else {
    // Offgrid: N dias de autonomia
    autonomiaDias = p.autonomia;
    energiaAutonomia_kWh = energiaDiaria * autonomiaDias;

    // Autonomia empírica (Eq. 6.13): N = 0.48 × HSPmin + 4.58
    if (p.hspMinimo) {
      autonomiaEmpirica = parseFloat((0.48 * p.hspMinimo + 4.58).toFixed(1));
      observacoes.push(
        `Autonomia empírica (Eq. 6.13): N = 0.48×${p.hspMinimo} + 4.58 = ${autonomiaEmpirica} dias. ` +
        `Valor informado: ${autonomiaDias} dias.`
      );
    }
    // BUG CORRIGIDO (ago/2026): este alerta de segurança estava dentro do
    // `if (p.hspMinimo)` acima, então só disparava quando o chamador
    // informava HSP mínimo do local — um parâmetro opcional que o único
    // call site real do app (App.tsx, painel "Dimensionamento de Banco de
    // Baterias") nunca passava. Resultado: um sistema offgrid configurado
    // com autonomia insuficiente (inclusive 0 dias) nunca recebia nenhum
    // alerta na UI — o alerta só era testado em `calcularBateria.test.ts`,
    // que passa `hspMinimo` manualmente, cenário que a produção nunca
    // reproduzia. A recomendação de autonomia mínima (curso slide 1016) não
    // depende de HSP — é uma regra de segurança independente — então o
    // check precisa rodar sempre que `autonomiaDias` existir, não só quando
    // a autonomia empírica (que sim depende de HSP) também é calculada.
    if (autonomiaDias !== undefined && autonomiaDias < 2) {
      alertas.push('Autonomia mínima recomendada: 2 dias (curso slide 1016).');
    }
  }

  // ── 2. Capacidade do banco (Eq. 6.10–6.12) ────────────────────────────────
  const dod = perfil.dodRecomendado;

  // CBC20 = Energia_autonomia / DOD (Wh) — (Eq. 6.10)
  const capacidadeBruta_Wh = (energiaAutonomia_kWh * 1000) / dod;

  // CBIC20 = CBC20 / Vsist (Ah) — (Eq. 6.11)
  const capacidadeBruta_Ah = capacidadeBruta_Wh / p.tensaoSistemaV;

  // ── 3. Configuração série × paralelo ────────────────────────────────────
  // Baterias em série: Vsist / Vtensao_bateria (Eq. 6.17)
  // CORRIGIDO (ago/2026): perfis de célula/monobloco único (Pb-ácido 12V,
  // OPzS/OPzV 2V, `tensoesSerie.length === 1`) são projetados para serem
  // empilhados em série até QUALQUER Vsist — isso é o comportamento correto e
  // não muda aqui. O bug era só para litio_lifepo4, cujo `tensoesSerie` é
  // [48, 24, 12] — as tensões de PACK PRONTO que o fabricante vende (não uma
  // lista ordenada da menor para a maior, e não célula unitária para
  // empilhar). O código pegava sempre o índice [0]=48V como "a tensão da
  // bateria", inclusive quando o sistema configurado era 24V ou 12V — dando
  // `bateriasSerie = ceil(Vsist/48) = 1` mesmo para Vsist=12V/24V, quando na
  // prática existe um pack pronto de 12V ou 24V (não faz sentido "1 bateria
  // de 48V em série" para montar banco de 12V). Agora, quando há mais de uma
  // tensão de pack disponível no catálogo, seleciona a que bate exatamente
  // com Vsist; sem correspondência exata, cai na mais próxima e avisa.
  let tensaoBateria = perfil.tensoesSerie[0];
  if (perfil.tensoesSerie.length > 1) {
    const exata = perfil.tensoesSerie.find(v => v === p.tensaoSistemaV);
    if (exata !== undefined) {
      tensaoBateria = exata;
    } else {
      tensaoBateria = perfil.tensoesSerie.reduce((maisProxima, v) =>
        Math.abs(v - p.tensaoSistemaV) < Math.abs(maisProxima - p.tensaoSistemaV) ? v : maisProxima
      , perfil.tensoesSerie[0]);
      alertas.push(
        `Nenhum pack de ${p.tensaoSistemaV}V disponível para "${perfil.label}" ` +
        `(opções: ${perfil.tensoesSerie.join('V, ')}V). Usando ${tensaoBateria}V como referência — ` +
        'confirmar configuração série/paralelo com o fabricante.'
      );
    }
  }
  const bateriasSerie = Math.ceil(p.tensaoSistemaV / tensaoBateria);

  // Baterias em paralelo: CBI / CBI_bat (Eq. 6.16)
  const bateriasParalelo = Math.ceil(capacidadeBruta_Ah / p.capacidadeBateriaAh);

  if (bateriasParalelo > 6) {
    alertas.push(
      `${bateriasParalelo} strings em paralelo excede o máximo recomendado (4–6). ` +
      'Usar bateria de maior capacidade ou aumentar tensão do sistema.'
    );
  }

  const bateriasTotal = bateriasSerie * bateriasParalelo;
  const capacidadeRealAh = bateriasParalelo * p.capacidadeBateriaAh;
  const capacidadeRealKWh = (capacidadeRealAh * p.tensaoSistemaV) / 1000;

  // ── 4. Controlador de carga (Eq. 6.18) ────────────────────────────────────
  // Ic = 1.25 × Isc × N_strings_paralelo
  const Isc = p.iscArranjoA ?? 0;
  const nStr = p.nStringsParalelo ?? 1;
  const corrMaxControlador = parseFloat((1.25 * Isc * nStr).toFixed(1));

  // Tensão máxima do controlador: Vcmax > 1.25 × Voc (no frio, Eq. 6.20)
  // Aproximação: sem Voc informado, usar 1.3 × Vsist como mínimo de segurança
  const tensaoMaxControlador = parseFloat((p.tensaoSistemaV * 1.3).toFixed(0));

  observacoes.push(
    `Controlador: Ic = 1.25 × ${Isc}A × ${nStr} strings = ${corrMaxControlador}A. ` +
    `Tensão máx. entrada > ${tensaoMaxControlador}V.`
  );

  // ── 5. Inversor offgrid ────────────────────────────────────────────────────
  let potMinInversor: number | undefined;
  if (p.tipoSistema === 'offgrid_sfi' && p.potenciaMaxCargasW) {
    potMinInversor = p.potenciaMaxCargasW;
    observacoes.push(
      `Inversor SFI: P ≥ P_max_cargas = ${potMinInversor}W. ` +
      'Para cargas com motor, verificar potência de surto (2–3× nominal).'
    );
  }

  // ── 6. Alertas adicionais ──────────────────────────────────────────────────
  if (p.tipoBateria === 'litio_lifepo4') {
    alertas.push('LiFePO4 requer BMS dedicado. Verificar compatibilidade com o inversor/controlador.');
  }
  if (p.tipoBateria === 'ciclo_profundo_opzv') {
    alertas.push('OPzV perde metade da vida útil a cada 10°C acima de 25°C. Instalação sombreada e ventilada.');
  }
  if (p.tensaoSistemaV < 48 && capacidadeBruta_Ah > 200) {
    alertas.push(`Sistema 12V/${p.tensaoSistemaV}V com correntes elevadas. Considerar tensão 48V para reduzir perdas.`);
  }

  return {
    energiaDiaria_kWh: parseFloat(energiaDiaria.toFixed(2)),
    capacidadeBruta_Wh: parseFloat(capacidadeBruta_Wh.toFixed(0)),
    capacidadeBruta_Ah: parseFloat(capacidadeBruta_Ah.toFixed(0)),
    dodUsado: dod,
    autonomiaDias,
    autonomiaEmpirica,
    tensaoSistemaV: p.tensaoSistemaV,
    bateriasSerie,
    bateriasParalelo,
    bateriasTotal,
    capacidadeRealAh,
    capacidadeRealKWh: parseFloat(capacidadeRealKWh.toFixed(2)),
    corrMaxControlador_A: corrMaxControlador,
    tensaoMaxControlador_V: tensaoMaxControlador,
    potMinInversor_W: potMinInversor,
    alertas,
    observacoes,
  };
}
