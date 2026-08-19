/**
 * Presets de módulos fotovoltaicos — dados técnicos por tipo.
 * Arquivo isolado: sem dependências de Zustand ou Electron.
 * Pode ser importado com segurança em componentes @react-pdf/renderer.
 */

export const PRESETS_MODULO = {
  monocristalino:   { label: 'Monocristalino',                coef: -0.34, noct: 45, bifacial: false, ganho: 0 },
  policristalino:   { label: 'Policristalino',                 coef: -0.40, noct: 46, bifacial: false, ganho: 0 },
  bifacial_ntype:   { label: 'Bifacial N-TYPE (TOPCon)',       coef: -0.29, noct: 45, bifacial: true,  ganho: 5 },
  bifacial_ptype:   { label: 'Bifacial P-TYPE (PERC)',         coef: -0.34, noct: 45, bifacial: true,  ganho: 3 },
  hibrido:          { label: 'Híbrido (mono+amorf)',           coef: -0.32, noct: 45, bifacial: false, ganho: 0 },
  cdte:             { label: 'Telureto de Cádmio (CdTe)',      coef: -0.25, noct: 44, bifacial: false, ganho: 0 },
} as const;

export type TipoModuloPreset = keyof typeof PRESETS_MODULO;
