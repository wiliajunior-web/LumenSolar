# ⚡ LumenSolar

**App desktop para dimensionamento fotovoltaico e documentação técnica CEMIG.**  
Desenvolvido pela Lumen Soluções Ltda — Araguari/MG.

> Stack: Electron 31 · React 18 · TypeScript · Vite 5 · Zustand · Vitest  
> Projeto irmão: [ProjetEletrico](https://github.com/wiliamjunioreng-dotcom/ProjetEletrico-agora-vai) (NBR 5410/5444)

---

## Status

| Item | Estado |
|------|--------|
| Testes automatizados | **729 passando** (E2E, cálculos, persistência) |
| Build Windows | ✅ GitHub Actions → artifact `LumenSolar-Windows` |
| Normas implementadas | IEC 61724-1, NBR 16690, NBR 5410, Lei 14.300/2022, REN ANEEL 1.000/2021 |
| Tarifa CEMIG | R$1,1827/kWh (Res. ANEEL 3.589/2026) |

---

## Funcionalidades implementadas

### Fluxo de 6 etapas

**1. Home — Mini-CRM**
- Lista de propostas com status: Rascunho / Enviada / Negociação / Aprovada / Perdida
- Criar nova proposta, duplicar existente, abrir arquivo `.lumensolar`

**2. Cliente**
- Dados pessoais: nome, CPF (validação Receita Federal + máscara automática), RG, estado civil
- CNPJ com validação
- Endereço completo

**3. Consumo**
- Seleção de distribuidora (CEMIG e outras)
- Histórico de 12 meses de consumo (kWh)
- Tarifa real da conta (R$/kWh) com botão ⚡ ANEEL para consultar tarifas vigentes
- CIP/COSIP mensal
- Tipo de ligação: monofásico / bifásico / trifásico
- Alerta automático quando tarifa inserida diverge do banco de dados (>5%)
- Enquadramento FioB: Art.26 (protocolo até jan/2023) ou Art.27 (escalonamento 2023–2029+)

**4. Local**
- Tipo de telhado e inclinação
- Orientação azimutal
- Coordenadas UTM automáticas via Nominatim (OpenStreetMap) — hemisfério Sul corrigido (+10.000.000)
- Número da UC e medidor CEMIG
- Link direto para o portal CEMIG Atende

**5. Kit Solar**
- Tipo de módulo: Monocristalino / Policristalino / Bifacial N-TYPE (TOPCon) / P-TYPE (PERC) / Híbrido / CdTe
- Importar datasheet PDF via IA (Anthropic API):
  - Extrai specs do módulo e do inversor automaticamente
  - Detecta tipo de inversor: string / microinversor / híbrido
  - Extrai configuração de strings recomendada pelo fabricante
  - Exibe recomendação do fabricante em card dourado
- Validação MPPT: Vmpp do sistema dentro da faixa do inversor
- Validação Voc: Voc corrigido por temperatura (NBR 16690 5.3.3) < 1.000V
- Alerta de carga estrutural > 12 kg/m²
- Estratégia de dimensionamento: cobrir 100% / percentual customizado / superdimensionar (com justificativa)
- Componentes recomendados: cabo CC, String box, fusível, DPS 275V, disjuntor CA (NBR 5410)

**6. Precificação**
- Composição de custo: kit + estrutura + materiais elétricos + mão de obra + projeto/ART + outros
- Alíquota de impostos (Simples Nacional por faixa de faturamento)
- Margem desejada
- Preço de venda = custo / (1 − impostos − margem)
- Balanço verificado: custo + imposto + lucro = preço (erro < R$0,01)
- Condições de pagamento: à vista / parcelado (Solfácil, Price 48×)

**7. Resultado**
- Indicadores financeiros: TIR, VPL, Payback simples, ROI
- Conta antes × conta depois × economia mensal/anual
- Projeção FioB 2026–2029 (Lei 14.300/2022 Art.27)
- Gráfico sazonal Consumo × Geração (12 meses)
- Tabela Price completa (Solfácil, juros 1,99%m, 48 parcelas)

---

### Documentos gerados

| Documento | Norma base | Formato |
|-----------|-----------|---------|
| Proposta Comercial | — | PDF |
| Proposta Técnica | NBR 16690, IEC 61724-1 | PDF |
| Memorial Descritivo | ND CEMIG 5.30 | PDF |
| Procuração | REN ANEEL 1.000/2021 Art.9 | PDF |
| Formulário CEMIG MicroGD | Rev. N4 (03/12/2024) | Excel |
| Auditoria técnica | 8 abas com 490+ fórmulas vivas | Excel |

**Excel — 8 abas:**
- `Resumo` — visual para o cliente (KPIs, FioB, checklist CEMIG)
- `Entradas` — todos os dados do projeto
- `Perdas` — composição de perdas (IEC 61724-1)
- `Dimensionamento` — kWp, módulos, geração
- `FioB_Economia` — projeção 2026–2029
- `Precificacao` — custo, imposto, margem, preço
- `Tabela_Price` — amortização completa
- `Fluxo_Caixa` — 25 anos com degradação e reajuste tarifário (=IRR, =NPV, =PMT vivos)

---

### Integrações

| Botão | Destino |
|-------|---------|
| 💬 WhatsApp | wa.me com mensagem pré-preenchida |
| 📧 E-mail | Download PDF + cliente de email com assunto/corpo |
| 🛒 Belenus | belenus.com.br/energy |
| 🛒 Aldo Solar | aldosolar.com.br |
| 💳 Solfácil | Simulador com valor da proposta |
| 🗺️ Google Maps | Endereço do cliente |
| 🔌 CEMIG Atende | Portal de acesso |
| ⚡ ANEEL | Tarifas vigentes |
| 🏛 INMETRO | Certificação do equipamento |
| 🗺️ Nominatim | UTM automático via OpenStreetMap |
| 📋 Form. CEMIG | Formulário MicroGD Rev. N4 pré-preenchido |
| 📊 Excel | Auditoria técnica + resumo visual |
| 📄 Import Datasheet | Extração via Anthropic API (Claude) |

---

### Cálculos verificados (auditoria 46 pontos, 0 bugs)

| Bloco | Norma | Verificação |
|-------|-------|-------------|
| Perdas do sistema | IEC 61724-1 | Tcell, ΔT, composição encadeada, clamp frio, bifacial |
| Dimensionamento | IEC 61724-1 | kWp = consumo/(HSP×30.4167×efic), DIAS_MES=365/12 |
| FioB | Lei 14.300/2022 | 8 percentuais Art.27, Art.26 até 2045, min(ger,cons) |
| Custos CEMIG | Res. ANEEL 3.589/2026 | R$379,34 / R$59,14 / R$203,88 / R$157,27 (conta real) |
| Precificação | — | Balanço erro = 0,00000000 |
| Tabela Price | — | Saldo final = 0,000000 após n parcelas |
| TIR | — | Newton-Raphson, VPL na TIR = -0,0000 |
| Simples Nacional | LC 123/2006 | Continuidade faixas 1-5: Δ = 0,0000pp |
| NBR 16690 (CC) | NBR 16690 | Voc frio, fusível Isc≤F≤2,5×Isc, Vmpp MPPT |
| NBR 5410 (CA) | NBR 5410 | Seção cabo por Iproj=Inom×1,25 |
| UTM hemisfério Sul | IBGE | +10.000.000 (falsa origem), Araguari: E=796084 N=7935844 |
| CPF | Receita Federal | Dois dígitos verificadores, 5 casos de borda |

---

### Persistência

- Arquivo `.lumensolar` — formato JSON com envelope de metadados
- Checksum SHA-256: detecta corrupção de qualquer byte
- Auto-save automático
- Backup `.bak` antes de sobrescrever

---

## Design

- Tema escuro **60-30-10**: `#0f1117` fundo · `#1a1d2b` cards · `#c9a227` ouro
- Sincronizado com ProjetEletrico (mesmas variáveis CSS)
- Tooltip com detecção de borda (não corta nas extremidades da tela)
- Modal de erros ao tentar calcular com campos incompletos

---

## Como rodar

```bash
npm install
npm test              # 729 testes (Vitest)
npm run dev           # Vite dev server
npm run build         # build de produção
npm run build:win     # gera .exe (requer wine ou Windows)
```

---

## Checklist de documentos CEMIG (MicroGD)

| Documento | Gerado pelo LumenSolar |
|-----------|----------------------|
| Formulário MicroGD Rev. N4 | ✅ |
| Procuração (Art.9 REN 1.000/2021) | ✅ |
| Memorial Descritivo (ND 5.30) | ✅ |
| DUB — Diagrama Unifilar Básico | ❌ manual |
| Planta de Situação (satélite + UTM) | ❌ manual |
| ART do Responsável Técnico | ❌ manual |
| RG + CPF + Comprovante de imóvel | ❌ manual |
| Certificados INMETRO | ❌ manual |

---

## Pendências conhecidas

- [ ] Teste de fluxo completo no `.exe` (criar proposta → gerar todos os documentos)
- [ ] Suporte a Grupo A (P/FP/HR, demanda contratada — sistemas >75 kWp)
- [ ] Expansão de usina existente (campo "potência atual instalada")
- [ ] Token `wiliamjunioreng-dotcom` configurado para sincronizar design com ProjetEletrico ✅
