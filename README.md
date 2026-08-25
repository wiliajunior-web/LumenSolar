# ⚡ LumenSolar

**App desktop para dimensionamento fotovoltaico e documentação técnica CEMIG.**  
Desenvolvido pela Lumen Soluções Ltda — Araguari/MG.

> Stack: Electron 31 · React 18 · TypeScript · Vite 5 · Zustand · Vitest  
> Projeto irmão: [ProjetEletrico](https://github.com/wiliamjunioreng-dotcom/ProjetEletrico-agora-vai) (NBR 5410/5444)

---

## Status

| Item | Estado |
|------|--------|
| Testes automatizados | **852 passando** (E2E, cálculos, persistência, precificação de serviços, proteção CC, UTM, checklist de documentação, mapa de células do Formulário CEMIG, dimensionamento Grupo A, wiring do store, geração dos PDFs de proposta) |
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

**DUB (ago/2026, revisado contra exemplo oficial CEMIG):** diagrama unifilar simplificado
gerado a partir dos dados reais do projeto — reaproveita `calcularCaboCA` (lado CA) e o novo
`calcularProtecaoCC` (lado CC: cabo solar, fusível de string, DPS, Voc corrigido por
temperatura mínima — NBR 16690:2019 5.3.3/5.4.2), a mesma função que já alimentava (sem
teste, até esta correção) o painel "Componentes Recomendados" do passo Kit Solar. Depois de
comparar com o exemplo oficial de DUB da CEMIG ("Anexo 1 – Exemplo de D.U.B.", fornecido pelo
usuário), o diagrama passou a trazer a fronteira de responsabilidade REDE CEMIG (acessada) /
ACESSANTE (linha tracejada no ponto de conexão) e o aviso obrigatório "CUIDADO — RETORNO DE
ENERGIA" junto ao medidor bidirecional. Continua um diagrama **simplificado**: mostra
topologia e as grandezas dimensionadas, mas não com a simbologia NBR 5444/título normalizado
do exemplo oficial (quadro de revisão, símbolos CAD específicos) nem representa múltiplos
inversores automaticamente (o aviso no PDF pede edição manual nesse caso) — não substitui um
projeto revisado por responsável técnico, o próprio PDF traz esse aviso.

**Planta de Situação (ago/2026, revisado contra modelos oficiais CEMIG):** geocodifica o
endereço do cliente (Nominatim/OpenStreetMap, gratuito) e monta um mosaico de imagem de
satélite (Esri World Imagery, gratuito, sem chave de API) com marcador nas coordenadas — mais
uma tabela conferindo a UTM digitada no passo Local contra a UTM do endereço geocodificado,
alertando se divergirem mais de 300m. Depende de internet no computador do usuário; a busca de
tiles não pôde ser testada de ponta a ponta no ambiente onde foi desenvolvida (sem acesso de
rede para arcgisonline.com) — a matemática de qual tile buscar é testada
(`src/domain/plantaSituacao/tileMercator.test.ts`), a busca/stitch em si roda só no app real.
Os modelos oficiais da CEMIG ("Modelos de Plantas de Situação", fornecidos pelo usuário)
mostram a área do telhado/placas solares e o ponto do padrão de entrada demarcados
manualmente sobre a imagem de satélite — o software não tem como inferir esse polígono a
partir só do endereço, então o PDF explica isso e orienta a demarcar manualmente antes do
envio, em vez de fingir automatizar algo que não automatiza.

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
npm test              # 824 testes (Vitest)
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

- [x] **Corrigido (ago/2026):** o mapa de células do Formulário CEMIG MicroGD
  (`src/domain/excel/gerarFormularioCemig.ts`, `MAPA_CELULAS`) tinha 28 das 31 posições
  erradas — apontava sistematicamente para uma linha abaixo da caixa real de preenchimento no
  arquivo oficial (confirmado célula a célula com o `Formulario-MicroGD_Rev_N4.xlsx` real,
  fornecido pelo usuário). O caso mais grave: a célula antiga de "Local e data" (B234) era a
  própria célula do RÓTULO no arquivo oficial, não uma célula em branco. Corrigido e travado
  por teste de regressão (`gerarFormularioCemig.test.ts`) — mas o arquivo oficial não faz
  parte do repositório (documento interno da CEMIG), então o teste só impede regressão
  acidental do mapa já verificado, não revalida contra o arquivo a cada execução.
- [ ] Teste de fluxo completo no `.exe` (criar proposta → gerar todos os documentos)
- [x] **Corrigido (ago/2026):** erro de tipo em `App.tsx` (`kit.tipoModulo` não aceitava
  `bifacial_ntype`/`bifacial_ptype`/`hibrido`/`cdte` em `PropostaData`) — `tsc --noEmit` falhava
  silenciosamente (mascarado porque `vite build`/esbuild não faz type-check completo).
  `EspecificacaoKit.tipoModulo` ampliado para `TipoModuloPreset | 'bifacial'`.
- [ ] Tema foi migrado de escuro para claro (ago/2026); ProjetEletrico ficou dessincronizado — decidir se replica lá também
- [ ] Fusível/proteção CC do DUB (`calcularProtecaoCC`) usa o coeficiente de temperatura de Pmax como aproximação de Voc (conservador, mas não é o valor real do datasheet) — adicionar campo `coefTempVocPercent` dedicado ao kit
- [ ] Busca de tiles de satélite da Planta de Situação (Esri World Imagery) não pôde ser testada de ponta a ponta no ambiente onde foi construída (rede bloqueada para arcgisonline.com) — só a matemática de qual tile buscar foi testada; testar a busca real no primeiro uso no computador do usuário
- [ ] `gerarPacoteCompleto()` dispara 6 downloads em sequência via `<a download>` — em alguns navegadores/SOs isso pode exigir permissão explícita para "múltiplos downloads"; testar no .exe real

### Auditoria completa (ago/2026) — cálculos, retornos e procedimentos

Auditoria de ponta a ponta (dimensionamento, financeiro/retornos, precificação, geração de
documentos, App.tsx/store) usando 5 agentes independentes, cada um recalculando as fórmulas à
mão/script antes de confiar no "expected" dos testes existentes (vários testes tautológicos —
que replicavam o mesmo bug do código no cálculo do "expected" — foram encontrados e corrigidos
neste processo). Corrigidos e cobertos por teste de regressão nesta sessão:

- [x] **CRÍTICO — `calcularCaboCA.ts`:** queda de tensão CA (NBR 5410) dividia por `tensaoSaidaV`
  duas vezes, retornando valores ~220x/380x menores que o real — `quedaTensaoOk` praticamente
  nunca dava `false`, e o Diagrama Unifilar Básico mostrava "0,00% (OK)" mesmo acima dos 4% da
  norma. Teste tautológico correspondente (`auditoria_completa_v2.test.ts`, bloco CA-4) também
  corrigido — replicava o mesmo bug no valor esperado.
- [x] **CRÍTICO — `PropostaPDF.tsx` (Doc Técnica) divergia de `PropostaComercialPDF.tsx`:**
  reimplementava payback e "economia em 25 anos" com fórmula ingênua (sem degradação, reajuste
  ou Fio B), chegando a divergir >100% do valor do outro PDF para os mesmos dados. Agora ambos
  usam `indicadores` (calcularFluxoCaixa).
- [x] **ALTO — Fio B ficava congelado no percentual do ano de instalação por toda a projeção de
  25 anos** (`useProjetoStore.ts`), apesar do texto do PDF afirmar o contrário ("já considerado
  na projeção financeira" — Lei 14.300/2022 escalona 15%→100% entre 2023 e 2029). Corrigido
  conectando `projetarCustosAnuais` (existia, testado, mas nunca era chamado em lugar nenhum) ao
  fluxo de caixa e às simulações de financiamento via novo parâmetro `economiaMensalPorAno`.
- [x] **ALTO — Excel de Auditoria (aba Resumo):** Payback e TIR sempre exibiam 0,00 (nomes de
  campo errados: `paybackSimplesAnos`/`tir` não existiam no objeto real). VPL da aba Resumo tinha
  TMA hardcoded em 8% em vez de referenciar a célula real (divergia do VPL da aba Fluxo_Caixa).
  "Área necessária" lia um campo inexistente e caía sempre no fallback impreciso.
- [x] **ALTO — Formulário MicroGD CEMIG:** campo do fuso UTM nunca era preenchido (`fusoUtm` vs
  `utmFuso` — nome de campo errado), mesmo com o usuário preenchendo corretamente no app.
- [x] **MÉDIO — `calcularCustosRecorrentes`:** quando geração < consumo (sistema
  subdimensionado), a energia não compensada não era cobrada — economia relatada podia sair mais
  que o dobro da real. Hoje mitigado pela UI (Estratégia de kWp trava em 100%-300%), mas a função
  de domínio em si tinha o bug.
- [x] **MÉDIO — tabela de projeção do Fio B nos PDFs:** usava geração total em vez de energia
  compensada (min(geração, consumo)) e fração de tarifa do Fio B hardcoded em 35% (ignorando
  `empresa.fracaoTarifaFioB` configurável) — superestimava o custo futuro em até ~50% para
  sistemas superdimensionados.
- [x] **MÉDIO — Excel de Auditoria (aba FioB_Economia):** referências de Tarifa/CIP/kWh mínimo
  apontavam para linhas erradas da aba Entradas; a "correção" anterior tinha travado esses
  valores como estáticos em vez de fórmula viva, quebrando a promessa de "segunda opinião
  auditável" — se o usuário mudasse esses valores em Entradas, a cadeia inteira (Fluxo_Caixa,
  VPL, TIR, Payback) não recalculava.
- [x] **BAIXO — `tipoLigacao` hardcoded em `'bifasica'`** em `ComponentesRecomendados` (App.tsx)
  e `DiagramaUnifilarBasico.tsx`, ignorando o valor real do cliente — inflava a queda de tensão
  CA exibida em ~15,6% para todo cliente trifásico.
- [x] **CRÍTICO — crash no `.exe` empacotado:** `require('@domain/dimensionamento/...')` dinâmico
  em 3 pontos de `App.tsx` resolvia o alias `@domain` só em `npm run dev` (via Vite); no
  Electron empacotado (`app.asar`) o `require()` é uma chamada real do Node, que não conhece o
  alias — `Cannot find module` na inicialização, sempre. Corrigido convertendo os 3 para `import`
  estático no topo do arquivo. Confirmado pré-existente (build antigo, não introduzido nesta
  sessão) e confirmado ausente do bundle gerado após a correção.
- [x] **MÉDIO — 4 links externos quebrados:** botão ANEEL (domínio migrado), Aldo Solar (DNS
  morto), Solfácil (redirecionava para domínio não relacionado) e CEMIG (caminho 404). Cada URL
  nova só foi trocada após confirmar via busca/fetch que carrega de fato — 1 link (INMETRO) ficou
  como estava por falta de evidência conclusiva (timeout de conexão não é prova de link quebrado).
- [x] **ALTO — `calcularGrupoA.ts` e `useProjetoStore.ts` (motor central `calcularTudo()`) tinham
  ZERO cobertura de teste.** A auditoria anterior chegou a descrever `calcularGrupoA.ts` como
  "pronto e testado" — afirmação incorreta, não havia nenhum teste. Adicionados
  `calcularGrupoA.test.ts` (agora 17 testes, valores calculados manualmente antes de rodar,
  incluindo regressão específica para detectar histórico Ponta/Fora-Ponta trocado) e
  `useProjetoStore.test.ts` (wiring do `resultadoGrupoA`, comparado contra chamada independente
  da função de domínio usando os mesmos hsp/perdas reais).
- [x] **MÉDIO — ultrapassagem de demanda (`calcularCustoDemanda`, Grupo A) cobrava a partir de
  QUALQUER excedente, sem tolerância.** Pesquisado nesta sessão (não foi possível acessar o texto
  literal da REN ANEEL 1.000/2021 — aneel.gov.br bloqueou o fetch repetidamente; usadas fontes
  secundárias convergentes: Copel, TAB Energia, CUBi Energia, Perfil Energia, pv magazine Brasil).
  Todas concordam numa tolerância de 5% acima da demanda contratada antes de qualquer cobrança de
  ultrapassagem — o código não aplicava tolerância nenhuma (5% ainda ficava sujeito à cobrança).
  Corrigido: `TOLERANCIA_ULTRAPASSAGEM_FATOR = 1.05`. O multiplicador 2× sobre o excedente e a
  estrutura 1×base+2×penalidade não foram alterados — não há confirmação de fonte primária
  suficiente para mexer nisso com segurança; a ressalva no código permanece. **Ainda não usar
  este cálculo para cobrança real a cliente sem confirmar com a ND da CEMIG.**
- [x] **Investigado e descartado por não ser possível fazer corretamente: "seletividade automática
  de proteção conforme norma".** Pedido explicitamente nesta sessão. Pesquisado: a NBR 5410 não
  define uma fórmula numérica universal de seletividade entre disjuntores/fusíveis em série — a
  coordenação real depende de tabelas de seletividade e curvas tempo-corrente específicas de cada
  fabricante/modelo, que este app não modela (o cadastro de kit não guarda curva de disparo de
  disjuntor nenhuma). Implementar uma regra numérica genérica (ex: razão fixa entre correntes
  nominais) e apresentá-la como "conforme norma" seria fabricar conformidade que não existe. Além
  disso, os dispositivos que o app hoje dimensiona (fusível de string CC, disjuntor CA, DPS CC/CA)
  não formam um par em série no sentido clássico de seletividade — são de lados diferentes do
  inversor. A seletividade que importaria de verdade (disjuntor geral × proteção da distribuidora
  a montante) depende de dado que o app não tem (ajuste da proteção da distribuidora). Não
  implementado — não dá para fazer sem inventar norma.

**Não corrigido nesta auditoria — requer trabalho dedicado:**

- [ ] **ALTO — Grupo A (Média Tensão): cálculo roda e é exibido no painel; os documentos gerados
  agora ALERTAM sobre a divergência, mas ainda não usam os números certos por padrão.** Nesta
  sessão, `calcularDimensionamentoGrupoA` foi conectado ao store (`resultadoGrupoA`, calculado
  quando `consumo.grupoTensao === 'A'`) e ganhou UI própria no painel de Consumo (histórico mensal
  Ponta/Fora-Ponta, resultado de dimensionamento e financeiro, alertas). Numa segunda etapa, os
  três documentos gerados (`PropostaComercialPDF.tsx`, `PropostaPDF.tsx` e a aba "Resumo" do Excel
  em `gerarExcel.ts`) ganharam uma página/bloco de aviso vermelho, inserido como a primeira coisa
  visível do documento quando `grupoTensao==='A'`, mostrando os números corretos de Grupo A lado a
  lado com o aviso de que o restante do documento usa Grupo B. Isso evita o cenário anterior — o
  documento inteiro silenciosamente errado, sem nenhum sinal — mas **não é a integração completa**:
  potência/módulos/economia/payback/TIR do restante do PDF e do Excel, e o Formulário CEMIG,
  continuam sempre calculados como Grupo B. Uma integração completa exigiria redefinir o
  significado de campos compartilhados entre os dois modelos (ex: "taxa de disponibilidade" não
  existe em Grupo A, que cobra demanda contratada) em cada seção de cada documento — feito com
  cuidado, não às pressas, para não gerar documento com rótulo incorreto. Continue não gerando
  proposta final para cliente de média tensão sem revisar manualmente os números do bloco de aviso.
- [ ] `tributacao.ts` (tabela do Simples Nacional por faixa) e `calcularTabelaAtualizada.ts`
  (correção monetária da tabela de serviços) estão corretos e testados, mas não são chamados em
  lugar nenhum do app em produção — só existem via os próprios testes. Não é bug de cálculo, é
  funcionalidade que nunca foi conectada à UI.
- [ ] Suspeita não totalmente confirmada: o dimensionamento e todos os indicadores financeiros
  usam `dimensionamento.geracaoMensalEstimadaKWh` (geração teórica recomendada pelo algoritmo),
  não a quantidade de módulos realmente configurada em `kit.quantidade` — se o instalador digitar
  uma quantidade diferente da sugerida, os indicadores do PDF podem não refletir o sistema
  vendido de fato. Não aprofundado nesta auditoria (fora do escopo de cálculo puro).
- [ ] Observação de risco comercial, não de cálculo: o PDF "Doc Técnica"
  (`PropostaPDF.tsx`, botão "🔧 Técnica") exibe a composição completa de custos, incluindo o
  custo de compra do kit junto ao fornecedor — se esse documento for de fato entregue ao cliente
  (e não só uso interno/engenharia), o cliente consegue calcular a margem exata da empresa.
  Confirmar com quem usa o app qual é o uso real desse PDF.
