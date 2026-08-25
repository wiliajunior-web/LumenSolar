# ⚡ LumenSolar

**App desktop para dimensionamento fotovoltaico e documentação técnica CEMIG.**  
Desenvolvido pela Lumen Soluções Ltda — Araguari/MG.

> Stack: Electron 31 · React 18 · TypeScript · Vite 5 · Zustand · Vitest  
> Projeto irmão: [ProjetEletrico](https://github.com/wiliamjunioreng-dotcom/ProjetEletrico-agora-vai) (NBR 5410/5444)

---

## Status

| Item | Estado |
|------|--------|
| Testes automatizados | **822 passando** (E2E, cálculos, persistência, precificação de serviços, proteção CC, UTM, checklist de documentação) |
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
| DUB — Diagrama Unifilar Básico | NBR 5410, NBR 16690:2019 | PDF |
| Planta de Situação (satélite + UTM) | ND CEMIG 5.30 | PDF |
| Formulário CEMIG MicroGD | Rev. N4 (03/12/2024) | Excel |
| Auditoria técnica | 8 abas com 490+ fórmulas vivas | Excel |

**DUB (ago/2026):** diagrama unifilar simplificado gerado a partir dos dados reais do
projeto — reaproveita `calcularCaboCA` (lado CA) e o novo `calcularProtecaoCC` (lado CC:
cabo solar, fusível de string, DPS, Voc corrigido por temperatura mínima — NBR 16690:2019
5.3.3/5.4.2), a mesma função que já alimentava (sem teste, até esta correção) o painel
"Componentes Recomendados" do passo Kit Solar. É um diagrama **simplificado**: mostra
topologia e as grandezas dimensionadas, não substitui um projeto com simbologia NBR 5444
revisado por responsável técnico — o próprio PDF traz esse aviso.

**Planta de Situação (ago/2026):** geocodifica o endereço do cliente (Nominatim/
OpenStreetMap, gratuito) e monta um mosaico de imagem de satélite (Esri World Imagery,
gratuito, sem chave de API) com marcador nas coordenadas — mais uma tabela conferindo a
UTM digitada no passo Local contra a UTM do endereço geocodificado, alertando se
divergirem mais de 300m. Depende de internet no computador do usuário; a busca de tiles
não pôde ser testada de ponta a ponta no ambiente onde foi desenvolvida (sem acesso de
rede para arcgisonline.com) — a matemática de qual tile buscar é testada
(`src/domain/plantaSituacao/tileMercator.test.ts`), a busca/stitch em si roda só no app real.

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

### Tabela de referência de preços — projetos elétricos, subestação, SPDA

Módulo `src/domain/precificacaoServicos/` — não é usado ainda na UI do LumenSolar, mas é
um agregador de dados pensado para ser reaproveitado tanto aqui quanto no
[ProjetEletrico](https://github.com/wiliamjunioreng-dotcom/ProjetEletrico-agora-vai):

- `src/data/tabelaReferenciaPrecosServicos.ts` — 27 itens de referência (Toolbox de Elite),
  data-base ~07/2023, com proveniência documentada (arquivo de origem, data de extração)
- `indiceCorrecao.ts` — corrige os valores por IPCA acumulado (jul/2023 → jul/2026, fator
  ≈1,1484), com a justificativa de por que IPCA e não INCC-DI/IGP-M documentada no código
- `calcularTabelaAtualizada.ts` — gera a tabela corrigida sem perder os valores originais
- `scripts/gerarTabelaReferenciaXlsx.ts` — exporta a tabela (original + corrigida) para
  `.xlsx`: `npx tsx scripts/gerarTabelaReferenciaXlsx.ts <saida.xlsx>`

⚠️ Mesmo corrigidos por inflação, os valores desta tabela podem estar abaixo do praticado
no mercado em algumas regiões (ex.: tabela ABEE-MS cobra mínimo de R$1.900 para projeto
elétrico residencial, vs. R$1.263 aqui após correção) — usar como piso de referência, não
como preço final.

---

## Design

- Tema claro: `#f2f0e8` fundo · `#ffffff` cards · `#1a1a1a` texto · `#c9a227` ouro (accent, mantido escuro em chips pontuais como o resumo de preço de venda)
- Tooltip com detecção de borda (não corta nas extremidades da tela)
- Modal de erros ao tentar calcular com campos incompletos

---

## Como rodar

```bash
npm install
npm test              # 822 testes (Vitest)
npm run dev           # Vite dev server
npm run build         # build de produção
npm run build:win     # gera .exe (requer wine ou Windows)
```

**Scripts de verificação visual** (não fazem parte do build do app):
```bash
# Screenshots da UI real (Electron completo, não o bundle num browser comum —
# ver comentário no topo do arquivo sobre por quê)
xvfb-run -a node scripts/verificarUiVisualmente.mjs [pasta-de-saida]

# Renderiza um PDF (DUB, Planta de Situação, etc.) fora do Electron, com dados
# de exemplo — útil pra conferir layout sem precisar rodar o app inteiro
npx tsx scripts/testarGeracaoPdf.tsx [saida.pdf]
npx tsx scripts/testarPlantaSituacao.tsx [saida.pdf]
```

---

## Checklist de documentos CEMIG (MicroGD)

O app tem um checklist real (persistido no `.lumensolar`, visível no passo Resultado) —
`src/domain/documentacaoCemig/checklist.ts`. Itens "gerado pelo LumenSolar" se marcam
sozinhos quando o PDF/Excel correspondente é gerado; os 3 últimos são documentos de
terceiro (profissional responsável técnico, cliente, fabricante) que o app **nunca**
gera automaticamente — nem finge gerar — porque exigem assinatura/responsabilidade que
não é do software; o usuário confirma manualmente que anexou por fora. O botão
"📦 Pacote Completo" (passo Resultado) gera os 6 documentos automatizáveis em sequência.

| Documento | Gerado pelo LumenSolar |
|-----------|----------------------|
| Formulário MicroGD Rev. N4 | ✅ |
| Procuração (Art.9 REN 1.000/2021) | ✅ |
| Memorial Descritivo (ND 5.30) | ✅ |
| DUB — Diagrama Unifilar Básico | ✅ (ago/2026 — simplificado, ver acima) |
| Planta de Situação (satélite + UTM) | ✅ (ago/2026 — ver acima) |
| ART do Responsável Técnico | ❌ manual — exige assinatura de responsável técnico |
| RG + CPF + Comprovante de imóvel | ❌ manual — documento do cliente |
| Certificados INMETRO | ❌ manual — emitido pelo fabricante |

---

## Pendências conhecidas

- [ ] Teste de fluxo completo no `.exe` (criar proposta → gerar todos os documentos)
- [ ] Suporte a Grupo A (P/FP/HR, demanda contratada — sistemas >75 kWp)
- [ ] Expansão de usina existente (campo "potência atual instalada")
- [ ] Token `wiliamjunioreng-dotcom` configurado para sincronizar design com ProjetEletrico ✅
- [ ] Erro de tipo em `App.tsx` (`kit.tipoModulo` não aceita `bifacial_ntype`/`bifacial_ptype`/etc. em `PropostaData`) — `tsc --noEmit` falha, mas `vite build` "passa" porque o esbuild não faz type-check completo; corrigir o tipo em `types.ts` antes que isso mascare um bug real
- [ ] Tema foi migrado de escuro para claro (ago/2026); ProjetEletrico ficou dessincronizado — decidir se replica lá também
- [ ] Fusível/proteção CC do DUB (`calcularProtecaoCC`) usa o coeficiente de temperatura de Pmax como aproximação de Voc (conservador, mas não é o valor real do datasheet) — adicionar campo `coefTempVocPercent` dedicado ao kit
- [ ] Busca de tiles de satélite da Planta de Situação (Esri World Imagery) não pôde ser testada de ponta a ponta no ambiente onde foi construída (rede bloqueada para arcgisonline.com) — só a matemática de qual tile buscar foi testada; testar a busca real no primeiro uso no computador do usuário
- [ ] `gerarPacoteCompleto()` dispara 6 downloads em sequência via `<a download>` — em alguns navegadores/SOs isso pode exigir permissão explícita para "múltiplos downloads"; testar no .exe real
