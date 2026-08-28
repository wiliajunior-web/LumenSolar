# ⚡ LumenSolar

**App desktop para dimensionamento fotovoltaico e documentação técnica CEMIG.**  
Desenvolvido pela Lumen Soluções Ltda — Araguari/MG.

> Stack: Electron 31 · React 18 · TypeScript · Vite 5 · Zustand · Vitest  
> Projeto irmão: [ProjetEletrico](https://github.com/wiliamjunioreng-dotcom/ProjetEletrico-agora-vai) (NBR 5410/5444)

---

## Status

| Item | Estado |
|------|--------|
| Testes automatizados | **951 passando** (E2E, cálculos, persistência de arquivo .lumensolar, precificação de serviços, proteção CC, cabo CA/disjuntor, FDI, banco de baterias, agrupamento de UCs, cronograma de obra, UTM, checklist de documentação, mapa de células do Formulário CEMIG, dimensionamento Grupo A, wiring do store, geração dos PDFs de proposta, geração do Excel de auditoria (fórmulas de perdas/payback/FioB/HSP/tarifa), simulação de financiamento/payback, validação de formulário, detecção de cálculo desatualizado, fábricas de estado padrão, paginação da capa do PDF comercial, fórmula NOCT de temperatura de célula, metadados de "recentes", cancelamento do diálogo de importação, Procuração/Memorial/Diagrama Unifilar/Planta de Situação) |
| Build Windows | ✅ GitHub Actions → artifact `LumenSolar-Windows` |
| Normas implementadas | NBR 16690, NBR 5410, Lei 14.300/2022, REN ANEEL 1.000/2021 |
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
| Proposta Técnica | NBR 16690 | PDF |
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
| Perdas do sistema | — (engenharia FV padrão, não é norma) | Tcell, ΔT, composição encadeada, clamp frio, bifacial |
| Dimensionamento | — (fórmula padrão, não é norma) | kWp = consumo/(HSP×30.4167×efic), DIAS_MES=365/12 |
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
  `calcularGrupoA.test.ts` (agora 14 testes, valores calculados manualmente antes de rodar,
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

### Segunda rodada de revisão (ago/2026) — arquivos sem cobertura de teste

Pedido explícito do usuário ("revise tudo") depois da rodada acima. 5 agentes independentes
auditaram, cada um lendo o arquivo inteiro e recalculando à mão antes de confiar em qualquer
"expected" pré-existente, os módulos que ainda não tinham arquivo de teste dedicado:
`calcularCaboCA.ts`, `calcularBateria.ts`, `calcularAgrupamento.ts`, `calcularFDI.ts`,
`gerarCronograma.ts`, além de reabrir a suspeita (não aprofundada na rodada anterior) de
`kit.quantidade` vs `dimensionamento`. Todos os 5 retornaram achados reais, corrigidos e
cobertos por teste nesta sessão:

- [x] **CRÍTICO — `calcularCaboCA.ts` (cabo CA/disjuntor, NBR 5410 + NBR 16690 5.4), 4 problemas
  na mesma função:** (1) tabela de seções por corrente estava rotulada "Método C" no comentário
  mas os valores são de Método B1 (mais conservador — não é bug de segurança, é citação errada,
  corrigido o rótulo); (2) fator de correção térmica FTA(25°C) estava tabelado como 1,04, mas a
  fórmula documentada `sqrt((70-T)/(70-30))` dá 1,06 — única linha de 8 divergente da própria
  fórmula do arquivo; (3) quando a corrente de projeto era grande o bastante para não haver
  NENHUM disjuntor padrão IEC que satisfizesse `Ib≤In≤Iz'` em nenhuma bitola da tabela, o código
  entregava o disjuntor default de 100A mesmo quando 100A < Ib — disjuntor subdimensionado para
  a carga real, SEM alerta nenhum; (4) temperatura ambiente fora da faixa tabelada (25–60°C) era
  silenciosamente clampada nos extremos, sem avisar que o valor usado não corresponde ao
  informado. Todos corrigidos; `calcularCaboCA.test.ts` novo, 8 testes hand-verified.
- [x] **ALTO — `App.tsx` e `DiagramaUnifilarBasico.tsx`: fator 1,25 da NBR 16690 §5.4 (corrente
  de projeto/carga contínua) nunca chegava de fato em `calcularCaboCA`.** Em ambos os pontos de
  chamada, `corrMaxSaidaA: kit.corrMaxSaidaA || icaProjeto / 1.25` — quando `corrMaxSaidaA` do
  kit estava preenchido (o caso comum), o fator 1,25 era completamente ignorado; quando vazio,
  o fallback DIVIDIA por 1,25 em vez de multiplicar, invertendo o sentido do fator de segurança.
  Corrigido para `kit.corrMaxSaidaA > 0 ? kit.corrMaxSaidaA * 1.25 : icaProjeto` nos dois arquivos.
- [x] **ALTO — `calcularFDI.ts` (Critério 3 do FDI, corrente por MPPT): App.tsx usava
  `corrMaxMpptA: (kit as any).corrMaxMpptA || kit.corrMaxSaidaA || 99` como fallback.** Sem o dado
  real do datasheet, isso aprovava silenciosamente qualquer configuração de strings usando a
  corrente CA de saída do inversor (grandeza errada — CA em vez de CC por MPPT) ou, no pior caso,
  o valor arbitrário 99A. Corrigido: sem o dado informado, `criterio3Avaliado=false` — o critério
  fica marcado como não avaliado (nem aprova nem reprova às cegas) em vez de aprovar sem
  fundamento; a UI mostra "N/AVALIADO" em vez de um "OK" verde enganoso. `corrMaxMpptA` também foi
  formalizado na interface `EntradaKit` (removendo os `as any` espalhados pelo app).
  `calcularFDI.test.ts` novo, 7 testes hand-verified (zero cobertura antes).
- [x] **BAIXO — citação "IEC 61724-1" indevida em 3 lugares além do já corrigido no Grupo A:**
  cabeçalho de `calcularFDI.ts` (a faixa de overload 0,90–1,35 e os 3 critérios vêm de uma
  planilha comercial, não de norma IEC), cabeçalho de `calcularPerdas.ts` e a tabela "Cálculos
  verificados" deste README (linhas Perdas do sistema/Dimensionamento) — IEC 61724-1 trata de
  monitoramento de desempenho de sistema FV em operação, não define fórmulas de perdas ou de
  dimensionamento. Citações removidas nos 4 lugares; os cálculos em si não mudam.
- [x] **MÉDIO — `calcularAgrupamento.ts` (dimensionamento por agrupamento de UCs — SCEE, REN
  1.000/2021 Art.6º VIII): ordem de clamp errada entre a compensável agregada e a compensável por
  UC.** A compensável agregada usada para dimensionar a usina era `max(ΣmediaUC - ΣdispUC, 0)` —
  subtração agregada, clampada uma única vez — enquanto a compensável de cada UC individual
  (usada na distribuição de créditos, logo abaixo no mesmo arquivo) é `max(mediaUC - dispUC, 0)`
  clampada UC a UC. Como `max(a,0)+max(b,0) ≥ max(a+b,0)` sempre que alguma UC tem consumo médio
  abaixo da própria disponibilidade mínima (UC pouco usada), o agregado antigo subdimensionava o
  sistema em relação ao que a soma real das UCs precisa. Corrigido para somar as compensáveis já
  clampadas por UC. **Módulo permanece desconectado da UI** (ver abaixo) — o bug foi corrigido no
  código-fonte mesmo sem tela própria, porque é exportado e pode ser reaproveitado.
  `calcularAgrupamento.test.ts` novo, 3 testes hand-verified (demonstra a divergência 470 vs 390
  entre o valor corrigido e o valor que o bug antigo produziria nos mesmos dados).
- [x] **BAIXO — `calcularBateria.ts` (dimensionamento de banco de baterias): seleção de tensão de
  pack do litio_lifepo4 sempre pegava o primeiro elemento do catálogo (48V), mesmo configurando
  banco de 12V ou 24V.** `tensoesSerie` para litio_lifepo4 é `[48,24,12]` — as tensões de PACK
  PRONTO do fabricante, não uma lista ordenada da menor para a maior nem uma célula unitária para
  empilhar (diferente dos perfis Pb-ácido/OPzS/OPzV, que têm uma única tensão e continuam
  empilhando em série livremente, como sempre foi correto). Corrigido para selecionar o pack que
  bate exatamente com a tensão do sistema quando há mais de uma opção no catálogo; sem
  correspondência exata, cai no mais próximo e avisa o instalador. `calcularBateria.test.ts` novo,
  5 testes hand-verified. **Correção — a afirmação "módulo desconectado da UI" abaixo estava
  ERRADA e foi revisada na rodada seguinte:** existe sim um painel "🔋 Dimensionamento de Banco de
  Baterias" na aba Kit (linha ~2108 de `App.tsx`) — ele só não chamava esta função, reimplementava
  as mesmas fórmulas inline, divergindo silenciosamente do módulo testado (perdendo os alertas de
  BMS obrigatório do lítio, degradação térmica do OPzV, correntes elevadas em 12/24V, autonomia
  mínima de 2 dias no offgrid, e o próprio alerta de pack de tensão sem correspondência corrigido
  acima). Ver correção na rodada seguinte.
- [x] **MÉDIO — `gerarCronograma.ts` (cronograma de obra em Excel): mesmo bug de fuso horário já
  corrigido em `calculoFioB.ts` numa sessão anterior, reaparecendo aqui.** `addWeeks()` fazia
  `new Date("YYYY-MM-DD")` (meia-noite UTC) e depois `.setDate()`/`.toLocaleDateString()` sem
  `timeZone` explícito (fuso LOCAL da máquina) — no Brasil (UTC-3), meia-noite UTC cai às 21h do
  dia ANTERIOR local, então toda data do cronograma (início, cada semana, início/término de cada
  etapa) saía sistematicamente um dia adiantada. Corrigido mantendo tudo em UTC (parse, aritmética
  e formatação), igual ao padrão de `calculoFioB.ts`. `gerarCronograma.test.ts` novo — o teste
  força `TZ=America/Sao_Paulo` (o fuso onde o bug se manifestava) e lê de volta o `.xlsx` gerado
  para confirmar as datas certas; teria falhado com o código antigo.
- [x] **ALTO — confirmada a suspeita da rodada anterior: `kit.quantidade` (kit real configurado
  pelo instalador) e `dimensionamento.numeroModulos` (recomendação do algoritmo a partir do
  consumo) eram duas fontes de verdade independentes que nunca convergiam.** Confirmado com
  citação de arquivo:linha que a contradição aparece na MESMA página em `PropostaPDF.tsx`,
  `PropostaComercialPDF.tsx` e `MemorialDescritivo.tsx` (um bloco mostra o número recomendado,
  outro mostra `kit.quantidade`), e que os indicadores financeiros (payback, TIR, economia mensal)
  eram calculados com a GERAÇÃO do número recomendado enquanto o preço de venda vinha do CUSTO do
  kit real — descasamento silencioso sempre que o instalador escolhe uma quantidade diferente da
  sugerida (o caso comum, já que kits vêm em tamanhos discretos compatíveis com o inversor).
  Corrigido em `calcularTudo()` (`useProjetoStore.ts`): nova função pura
  `ajustarDimensionamentoParaQuantidadeReal` (`dimensionar.ts`) recalcula potência/geração/
  percentual de compensação a partir de `kit.quantidade` quando preenchido e diferente do
  recomendado, mantendo `potenciaSistemaKWp` (o alvo teórico pré-arredondamento) inalterado. O
  resultado ajustado passa a ser o único `dimensionamento` armazenado e consumido por todo o
  resto do app (enquadramento, custos recorrentes, precificação, indicadores, PDFs, Excel) — sem
  precisar reescrever cada documento individualmente. O painel de sugestão de dimensionamento
  (`StrategiaKwp` em App.tsx) não foi afetado: já calculava sua própria sugestão diretamente do
  consumo/HSP, independente deste módulo. `dimensionar.test.ts` ganhou 4 testes novos para a
  função de ajuste; `useProjetoStore.test.ts` ganhou 2 testes novos cobrindo o wiring completo
  (com e sem `kit.quantidade` preenchido).

### Terceira rodada (ago/2026) — persistência de arquivo e "Propostas" (tela inicial)

Continuação do "vamos apurando, melhorando e consertando". `persistence.ts` (salvar/importar
`.lumensolar`, checksum SHA-256) tinha 23 testes, mas nenhum deles chamava de fato
`salvarArquivo()`/`importarArquivo()` — as duas únicas funções realmente usadas por `App.tsx`
(`salvar()`/`abrirImportado()`). Os testes existentes reimplementavam a lógica de checksum em
paralelo só para não depender de `document`/`Blob`, o que não protege contra um bug real dentro
da função de produção (nome de campo trocado, condição invertida, checksum calculado sobre o
objeto errado). Corrigido:

- [x] **Cobertura adicionada — `salvarArquivo()`/`importarArquivo()` agora são chamadas de
  verdade pelos testes**, com stub mínimo de `document`/`<input type=file>`/`<a>` (não precisou
  trocar o ambiente do vitest para jsdom — `Blob`/`URL.createObjectURL` já funcionam nativamente
  no Node 22). 8 testes novos em `arquivo_lumensolar.test.ts`: envelope correto do arquivo salvo
  (formato/versão/checksum/dados, capturando o `Blob` real do download), importação íntegra,
  seletor fechado sem escolher arquivo → resolve `null`, JSON corrompido/truncado, formato de
  outro software, arquivo incompleto, checksum não bate após adulteração (com verificação de que
  os recentes NÃO são atualizados nesse caso), compatibilidade com arquivo antigo sem `_checksum`.
  Nenhum bug real encontrado dentro de `salvarArquivo`/`importarArquivo` em si — a lógica estava
  correta, só não tinha teste de verdade em cima.
- [ ] **Achado (não corrigido — funcionalidade inacabada, não bug em código funcionando):**
  a tela "Propostas" (`TabHome`, botão inicial do app) tem DUAS peças de funcionalidade
  construídas mas nunca conectadas: (1) `handleDuplicar(id)` lê
  `localStorage.getItem('lumen:proposal:' + id)` — mas nada no app inteiro grava dado nessa
  chave; o mecanismo real de persistência (`persistence.ts`) só grava METADADOS em
  `lumen:recent:*`, os dados completos só existem no arquivo `.lumensolar` no disco do usuário
  (design intencional, documentado no topo de `persistence.ts` — "zero risco de perda por
  limpeza de cache"). `handleDuplicar` sempre cairia no `alert('Proposta não encontrada no
  localStorage')` se fosse chamado; (2) não é chamado — não existe nenhum botão "Duplicar" no
  card da lista de propostas, só o botão de excluir. (3) mesma situação com o rastreamento de
  status: existe um componente `BadgeStatus` completo (dropdown com Rascunho/Enviada/Em
  negociação/Aprovada/Perdida, grava em `lumen:status:<id>`) e a leitura desse status já existe
  em `TabHome`, mas o componente nunca é renderizado em lugar nenhum — toda proposta aparece
  eternamente como "Rascunho" porque não existe UI para mudar o status. Não fiz a chamada de
  completar essas duas funcionalidades por conta própria (é decisão de produto — construir a
  camada de cache local + o botão de duplicar, e conectar o dropdown de status — não corrigir um
  bug em algo que já funciona); documentado aqui para decisão do usuário sobre se vale a pena
  terminar.

**Ainda desconectado da UI (bug corrigido no código-fonte, sem tela própria no app):**
`calcularAgrupamento.ts` (agrupamento de UCs/SCEE) continua sem nenhum painel na UI nem wiring em
`calcularTudo()` — mesma situação do Grupo A antes da correção desta sessão. É exportado e coberto
por teste, pronto para conectar quando o app precisar dessa funcionalidade, mas hoje não afeta
nenhum documento gerado porque não é chamado por nenhuma tela. (`calcularBateria.ts` NÃO está
mais nesta situação — ver quarta rodada abaixo: tinha painel próprio, só não chamava a função.)

### Quarta rodada (ago/2026) — auditando App.tsx (2914 linhas, o maior arquivo do projeto)

- [x] **ALTO — achado que corrige um erro desta própria auditoria: o painel "🔋 Dimensionamento
  de Banco de Baterias" (aba Kit, `App.tsx` ~linha 2108) EXISTE e é renderizado — a afirmação nas
  rodadas anteriores de que `calcularBateria.ts` "continua sem tela na UI" estava errada.** O
  painel reimplementava as fórmulas de `calcularBancoBaterias()` inline, direto no JSX, em vez de
  importar a função de domínio — as duas versões concordavam na maior parte da matemática, mas a
  versão inline nunca tinha os alertas que só existem no módulo de domínio: BMS obrigatório para
  lítio, degradação térmica do OPzV acima de 25°C, correntes elevadas em bancos 12V/24V, autonomia
  mínima de 2 dias no offgrid, e — mais importante — o alerta de pack de tensão sem
  correspondência exata que foi justamente o bug corrigido nesta sessão em `calcularBateria.ts`
  (a versão inline usava sua própria lógica simplificada para a tensão do pack de lítio, que por
  coincidência não exibia o mesmo bug porque o `<select>` da UI só oferece 12V/24V/48V — mas
  também nunca alertava se um dia um pack customizado fosse permitido). Corrigido: o painel agora
  chama `calcularBancoBaterias()` de verdade e exibe todos os alertas que a função retorna, não
  só o de "paralelo > 6". Nenhum teste novo (é wiring de UI React, sem infraestrutura de teste de
  componente no projeto) — a lógica em si já está coberta pelos 5 testes de `calcularBateria.test.ts`.

- [x] **ALTO — campo `demandaMedidaFPkW` (Grupo A, ultrapassagem de demanda) nunca tinha um input
  na UI, tornando a lógica de tolerância de 5% (pesquisada, corrigida e testada em rodada anterior
  desta mesma auditoria) inatingível na prática.** O campo já existia formalizado em
  `EntradaConsumo` (`useProjetoStore.ts`), com default `0`, e era passado para
  `calcularDimensionamentoGrupoA` dentro de `calcularTudo()` como
  `consumo.demandaMedidaFPkW || undefined`. Como nenhum lugar de `App.tsx` fazia referência a esse
  campo (confirmado por grep — zero ocorrências antes desta correção), ele chegava sempre
  `undefined`, e `calcularCustoDemanda` caía de volta em `medida = demandaContratadaKW` — que nunca
  é maior que o próprio limite tolerável (105% de si mesmo). Resultado prático:
  `houveUltrapassagemDemanda` NUNCA podia ser `true` em uso real do app, mesmo com a fórmula de
  tolerância certa e testada. Corrigido: adicionado o campo "Demanda medida (kW)" na aba Consumo,
  bloco de tarifas Grupo A, logo após "Demanda contratada (kW)", com tip explicando o uso (valor
  da fatura, opcional). Nenhum teste novo necessário — é só o input que faltava; a lógica de
  cálculo já tinha 3 testes dedicados de uma rodada anterior desta auditoria.

- [x] **ALTO — a tabela "Fio B — Lei 14.300/2022" na aba Resultado (`App.tsx`, `TabResultado`)
  reimplementava um cálculo que já tinha sido corrigido em outro lugar do código, mas o fix nunca
  chegou até aqui — mesma classe de bug do painel de baterias acima.** `PropostaPDF.tsx` (linha
  ~427) já documentava, de uma rodada anterior desta mesma auditoria, a correção de um bug
  equivalente: usar `energiaCompensadaKWh = min(geração, consumo)` em vez da geração bruta, e
  `empresa.fracaoTarifaFioB` (configurável, padrão 0,35) em vez de um `0.35` fixo no código — a
  mesma regra que `calcularCustos.ts` usa internamente. A tabela de `App.tsx`, porém, continuava
  com a fórmula antiga: `dim.geracaoMensalEstimadaKWh × tarifa × 0.35 × pctFioB`. Para qualquer
  sistema superdimensionado (o caminho padrão da Estratégia de kWp, que mira ≥100% de compensação)
  isso superestimava o custo futuro do Fio B mostrado ao cliente em até ~50% — e ignorava por
  completo o campo "Fração da tarifa que é Fio B" configurado em ⚙ Empresa. Corrigido para usar a
  mesma fórmula de `PropostaPDF.tsx`/`calcularCustos.ts`. Também troquei a lista fixa de anos
  `[2025,2026,2027,2028,2029]` (já defasada — 2025 é passado em ago/2026) pela mesma janela
  dinâmica `anoAtual..anoAtual+3, 2029, 2030` que `PropostaPDF.tsx` usa, para as duas telas
  mostrarem os mesmos anos. Nenhum teste novo (é wiring de UI React); a fórmula em si é a mesma já
  coberta pelos testes de `calcularCustos.test.ts`.

**Auditoria de `App.tsx` (2914 linhas) concluída nesta sessão** — o arquivo inteiro foi lido e
revisado seção por seção (Consumo, Local, Componentes Recomendados NBR 5410/16690, Importar
Datasheet via IA, Buscador de Coordenadas UTM, Kit — módulos/inversor/bateria, Precificação,
Resultado — todos os geradores de documento e as ações de assinatura). Os dois achados de maior
impacto (`demandaMedidaFPkW` e a tabela Fio B) estão documentados acima; nenhum outro cálculo
divergente foi encontrado no restante do arquivo.

### Quinta rodada (ago/2026) — documentos PDF sem cobertura de teste (Memorial, DUB, Procuração, Planta de Situação)

- [x] **MÉDIO — `MemorialDescritivo.tsx` calculava a "área ocupada" pelos módulos sem o fator de
  espaçamento de 10% que o resto do app já aplica para a mesma grandeza.** `App.tsx` (card "Sistema
  fotovoltaico") e `PropostaComercialPDF.tsx` mostram `ind.areaNecessariaM2`, calculado por
  `areaTotalNecessariaM2()` em `financeiro/indicadores.ts` — que já inclui ×1,10 de folga para
  fixação/manutenção entre módulos. `gerarFormularioCemig.ts` tem um caminho alternativo, quando as
  dimensões físicas do módulo (do datasheet) estão preenchidas, que também aplica ×1,10 — corrigido
  numa rodada anterior desta auditoria (comentário "BUG CORRIGIDO" no próprio arquivo). O Memorial
  Descritivo, porém, calculava `numeroModulos × comprimento × largura` SEM esse fator — mesma classe
  de bug (fix não propagado para todos os pontos que calculam a mesma grandeza), e justamente no
  documento técnico enviado à distribuidora, mostrando uma área ~10% menor que a dos outros
  documentos do mesmo projeto. Corrigido: adicionado o `× 1.1`, alinhando com
  `gerarFormularioCemig.ts`.
- [x] Lidos e revisados por inteiro (sem bug de cálculo encontrado): `DiagramaUnifilarBasico.tsx`
  (já usa `calcularCaboCA`/`calcularProtecaoCC` de verdade, com os fixes de rodadas anteriores
  citados em comentário próprio), `Procuracao.tsx` (documento jurídico, sem cálculo — só
  formatação/texto), `PlantaDeSituacao.tsx` e `satelliteMosaic.ts` (mosaico de satélite + conferência
  de UTM, delegam a matemática para `converterCoordenadas.ts`/`tileMercator.ts`, ambos testados; a
  parte de rede/canvas do `satelliteMosaic.ts` é documentada no próprio arquivo como não testável em
  vitest/jsdom — testada manualmente no app real).
- [x] **ALTO — revisando `PropostaComercialPDF.tsx`/`PropostaPDF.tsx` (nenhum bug novo neles, já
  corrigidos em rodadas anteriores) encontrei o mesmo bug de novo em `gerarExcel.ts`: a aba "Resumo"
  do Excel (primeira aba, voltada ao cliente) tinha um bloco "PROJEÇÃO FIO-B" que ignorava por
  completo o enquadramento real do cliente.** Nem `enquadramento` nem `percentuaisFioBPorAno`
  (calculados em `calcularTudo()`, já usados por `App.tsx`/`PropostaPDF.tsx`) eram sequer passados
  a `gerarExcelAuditoria()` pelo chamador (`App.tsx` `gerarExcel()`) — a função sempre assumia o
  escalonamento do Art. 27 a partir de 60% em 2026, **mesmo para um cliente elegível à regra de
  transição do Art. 26** (isento até 31/12/2045): nesse caso a aba mostraria ao cliente uma tabela
  de custo crescente de Fio B inteiramente fictícia. Também usava `fracTUSD=0.35` fixo em vez de
  `empresa.fracaoTarifaFioB` (configurável) — mesmo bug do item da tabela Fio B em `App.tsx` acima.
  Corrigido: `App.tsx` agora passa `enquadramento`/`percentuaisFioBPorAno`; `gerarExcel.ts` mostra a
  mensagem de isenção quando `elegivelArt26`, e usa os percentuais reais por ano (com a tabela-padrão
  da lei só como fallback quando o dado não vier). Também corrigido um rótulo falso na aba
  "FioB_Economia" ("35% da tarifa — **fixo em lei**" — não é; é uma estimativa configurável) e seu
  valor inicial, que agora vem de `empresa.fracaoTarifaFioB`. 2 testes novos de regressão em
  `gerarExcel.test.ts`, lendo o `.xlsx` gerado de volta (mesmo padrão de `gerarCronograma.test.ts`):
  um confirma que a tabela de escalonamento NÃO aparece quando `elegivelArt26`, outro confirma que o
  percentual de um ano usado na planilha é o passado em `percentuaisFioBPorAno`, não o valor-padrão
  fixo — ambos falhariam com o código antigo.
- [x] **BAIXO — mais 5 citações incorretas de "IEC 61724-1" removidas** (mesmo erro já corrigido em
  `calcularPerdas.ts`, `calcularFDI.ts` e `App.tsx` em rodadas anteriores desta auditoria — essa
  norma trata de monitoramento de desempenho de sistemas FV em operação, não define fórmulas de
  perdas/dimensionamento nem a média de dias por mês). Encontradas em: `gerarExcel.ts` (cabeçalho do
  arquivo + títulos e notas de célula das abas "Perdas" e "Dimensionamento" — texto que vai para
  dentro do `.xlsx` entregue ao usuário, não só comentário de código) e `dimensionar.ts`
  (`DIAS_MES = 30.4167`, que é só 365/12 — aritmética básica, sem norma nenhuma por trás). Não muda
  nenhum cálculo, só remove citações normativas falsas.

### Sexta rodada (ago/2026) — auditoria via subagentes paralelos (`calcularGrupoA.ts`, `indicadores.ts`/`fluxoCaixa.ts`)

- [x] Auditado por inteiro (fórmulas verificadas à mão, sem bug encontrado): `calcularGrupoA.ts` —
  `calcularCustoDemanda`, o cenário principal de dimensionamento e a álgebra do multiplicador ×3 para
  ultrapassagem de demanda (REN ANEEL 1.000/2021) todos conferem com os valores esperados calculados
  manualmente.
- [x] **ALTO — `simularFinanciamento()` (`financeiro/indicadores.ts`) reportava o MELHOR cenário de
  financiamento possível como o PIOR resultado exibível ao cliente.** A detecção de payback dependia
  de `saldoAcumulado` cruzar de negativo para não-negativo (`saldoAnterior < 0 && saldoAcumulado >= 0`).
  Mas `saldoAcumulado` começa em **0**, não negativo — é uma simulação de financiamento, sem
  investimento inicial à vista (diferente do fluxo de caixa à vista em `fluxoCaixa.ts`, onde o saldo
  de fato começa negativo pelo valor do investimento). Quando a economia mensal já cobre a parcela
  mensal desde o ano 1 — o cenário mais favorável ao cliente — o saldo nunca fica negativo em nenhum
  momento do horizonte, a condição `saldoAnterior < 0` nunca dispara, e `paybackAnos` permanece `null`
  para sempre. `App.tsx` e `PropostaComercialPDF.tsx` tratam `paybackAnos === null` como "> 25 anos"
  (via `formatarPayback`) — ou seja, o financiamento que se paga sozinho desde o primeiro mês aparecia
  para o cliente como se nunca se pagasse. Verificado à mão: `simularFinanciamento(10000, 1000, 0.01,
  12, 0, 0, 5, ...)` → parcela Price (10.000, 1%a.m., 12x) ≈ R$888,49/mês → parcelasAnual ≈
  R$10.661,84 < economiaAnual (R$12.000) já no ano 1. Corrigido: quando `saldoAcumulado >= 0` já no
  ano 1, `paybackAnos = 0` (paga-se a si mesmo desde o início); o caso em que o cruzamento acontece
  depois do ano 1 continua usando a interpolação original, inalterada. 2 testes novos de regressão em
  `indicadores.test.ts`: um reproduz exatamente o cenário do bug (economia cobrindo a parcela já no
  ano 1 → `paybackAnos` deve ser `0`, não `null`) e falharia com o código antigo; outro confirma que o
  caso "não cobre no ano 1, cobre depois" continua funcionando normalmente (`paybackAnos > 0`).
  Encontrado por subagente dedicado a `indicadores.ts`/`fluxoCaixa.ts`, confirmado manualmente antes
  da correção.
- [x] Auditados em paralelo por 4 subagentes dedicados, cada um lendo os arquivos por inteiro e
  verificando as fórmulas à mão (não só conferindo autoconsistência com os testes): `price.ts` +
  `fluxoCaixa.ts` (payback do fluxo à vista confirmado estruturalmente imune ao bug de
  `simularFinanciamento` acima — `investimentoInicial` é validado `> 0` na entrada, então o saldo
  sempre começa negativo) + `gerarCronograma.ts`; `calcularCustos.ts` + `calcularAgrupamento.ts` +
  `calcularBateria.ts`; `calculoFioB.ts` (confirmado como a fonte canônica de enquadramento/
  escalonamento realmente usada por `useProjetoStore.ts` — não é código morto) + `calcularPrecificacao.ts`
  + `calcularTabelaAtualizada.ts`/`indiceCorrecao.ts`; `converterCoordenadas.ts` + `tileMercator.ts` +
  `persistence.ts` + `utils.ts`. Nenhum bug de cálculo novo encontrado nesses arquivos.
- [x] **BAIXO — `validarConsumo()` (`renderer/services/validation.ts`) tinha DOIS `if` idênticos
  checando `cipMensalRS < 0` e empurrando o mesmo erro duas vezes.** Encontrado pelo mesmo subagente
  que auditou `validation.ts`. Quando o usuário digitava um valor de CIP/COSIP negativo, a lista de
  erros continha "CIP/COSIP não pode ser negativo" duplicada — `App.tsx` renderiza essa lista
  diretamente (numerada + alerta `\n`-separado), então o usuário via o mesmo erro nas posições 1. e
  2. Cosmético (não bloqueava nem alterava nenhum cálculo), mas real — o teste existente (V11) usava
  `.some(...)`, que não detecta duplicatas. Corrigido: removida a segunda checagem redundante. Novo
  teste de regressão (V11b) exige exatamente 1 erro de campo `'cip'`, não `.some()` — esse teste
  falharia com o código antigo.

### Sétima rodada (ago/2026) — bugs de state management do React (App.tsx / useProjetoStore.ts)

Até aqui a auditoria tinha mirado bugs de cálculo/fórmula. Esta rodada mudou de ângulo: um subagente
dedicado releu `App.tsx` (2956 linhas) e `useProjetoStore.ts` inteiros procurando uma classe de bug
diferente — closures obsoletas, condições de corrida, campos derivados que não re-sincronizam quando
a entrada muda. Confirmei os dois achados manualmente antes de corrigir.

- [x] **ALTO — nada detectava quando o usuário editava Cliente/Consumo/Kit/Preço DEPOIS de clicar em
  "Calcular resultado completo", deixando o resultado exibido (e qualquer documento gerado) com
  números que não batem com os dados atuais do projeto.** `calcularTudo()` só roda nesse clique — por
  desenho, não recalcula a cada tecla digitada (correto: seria caro e a validação de campos obrigatórios
  também só roda ali). O problema é que a navegação lateral entre etapas não é bloqueada — o usuário
  calcula, volta para Consumo (troca a distribuidora, corrige a tarifa real da conta, ajusta
  `kit.quantidade`, muda a margem em Preço) e vai direto para Resultado, ou clica em qualquer botão de
  documento. O único guard existente (`!s.dimensionamento`) só cobre "nunca calculou" — uma vez
  calculado, fica `true` para sempre, mesmo com os dados desatualizados por baixo. Resultado prático:
  o PDF entregue ao cliente mostra a tarifa/distribuidora/quantidade de módulos NOVA nas seções que
  leem a store ao vivo, mas economia/payback/TIR da tarifa/quantidade ANTIGA — uma proposta
  internamente inconsistente sem nenhum aviso.
  Corrigido com uma "assinatura" das entradas de `calcularTudo()` (`assinaturaEntradasCalculo()` em
  `useProjetoStore.ts`, `JSON.stringify` de `cliente+consumo+kit+empresa+preco`), gravada em
  `ultimoCalculoAssinatura` ao final de cada cálculo bem-sucedido. `calculoDesatualizado()` (App.tsx)
  compara a assinatura atual contra a gravada: se `dimensionamento` já existe mas a assinatura mudou,
  (a) um banner vermelho aparece no topo de `TabResultado` com um botão "🔄 Recalcular agora", e (b)
  `buildData()` — usada por 8 dos 9 geradores de documento — e `gerarExcel()` (o único que não passa
  por `buildData()`) lançam erro e bloqueiam a geração até o usuário recalcular. 4 novos testes de
  regressão em `useProjetoStore.test.ts` provam que a assinatura bate logo após calcular, diverge ao
  editar `consumo`/`kit`, e volta a bater depois de recalcular. `abrirWhatsApp()` (cita kWp/preço
  calculados na mensagem pré-preenchida) recebeu o mesmo guard.
- [x] **MÉDIO — `novaProposta()` (App.tsx) resetava o store com um literal parcial próprio (via
  `as any`), que já estava desatualizado em relação ao formato real de `consumo`/`kit`.** Faltavam por
  completo, em `consumo`: `grupoTensao`, `agrupamentoAtivo`, `unidadesConsumidoras`, `historicoFP`,
  `historicoP`, `tePontaKWh`, `teForaPontaKWh`, `tusdPontaKWh`, `tusdForaPontaKWh`, `tarifaDemandaKW`,
  `demandaContratadaKW`, `demandaMedidaFPkW`; em `kit`: `corrMaxMpptA`, `percentualCompensacaoDesejado`,
  `motivoSuperdimensionamento`, `comprimentoCaboCAm`, `temperaturaInstalacaoC`, `potenciaAtualKWp`,
  `dataProtocoloOriginal`. O `as any` no `setState(...)` escondia isso do TypeScript. Repro: terminar
  uma proposta Grupo A (média tensão), clicar "+ Nova Proposta" — `consumo.grupoTensao` ficava
  `undefined` em vez de voltar para `'B'`, e o toggle Grupo A/B no painel Consumo ficava sem nenhum
  botão selecionado até o usuário clicar em um manualmente. `resultadoGrupoA` e `localizacao`
  (telhado/UTM/nº de UC/medidor) também não eram resetados — a nova proposta herdava coordenadas UTM e
  número de UC do CLIENTE ANTERIOR, um erro que só aparece depois que o Memorial Descritivo/Formulário
  CEMIG já foi protocolado com o endereço errado.
  Corrigido com fábricas de estado padrão (`clientePadrao()`, `consumoPadrao()`, `kitPadrao()`,
  `precoPadrao(empresa)`) em `useProjetoStore.ts`, usadas TANTO pelo estado inicial da store QUANTO por
  `novaProposta()` — os dois nunca mais podem divergir. São funções (não objetos congelados) porque
  `kit.dataProtocoloAcesso` usa `new Date()`: um objeto congelado no topo do módulo travaria essa data
  no momento em que o app foi aberto, não no momento em que "Nova Proposta" foi clicada (app Electron
  pode ficar aberto por dias). `novaProposta()` agora também reseta `resultadoGrupoA`, `localizacao` e
  `ultimoCalculoAssinatura`, sem nenhum `as any`. 4 novos testes de regressão provam que as fábricas
  retornam o formato completo e objetos/arrays independentes entre chamadas (sem vazar mutação de uma
  proposta para a próxima).
- [x] **Efeito colateral saudável do fix acima**: os 4 campos de `kit` (`comprimentoCaboCAm`,
  `temperaturaInstalacaoC`, `potenciaAtualKWp`, `dataProtocoloOriginal`) que causaram o bug do reset
  incompleto nunca tinham sido formalizados na interface `EntradaKit` — existiam só no objeto de
  estado inicial e eram acessados via `(kit as any).campo`/`(s.kit as any).campo` em 8 pontos de
  App.tsx (mesmo padrão já corrigido para `corrMaxMpptA` numa rodada anterior). Formalizados na
  interface; todos os `as any` removidos.
- [x] Descartado (não é bug): closures obsoletas em `useEffect`/`useMemo`/`useCallback` — App.tsx não
  usa nenhum dos três; condição de corrida em handlers assíncronos (import de datasheet via IA,
  geocodificação UTM) — os dois já travam o botão de disparo pelo próprio estado de "carregando", e
  além disso nenhum dos dois componentes está de fato montado em nenhuma aba (funcionalidade
  inacabada/não conectada — já documentado como pendência separada, não é um bug de state).

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
- [ ] Observação de risco comercial, não de cálculo: o PDF "Doc Técnica"
  (`PropostaPDF.tsx`, botão "🔧 Técnica") exibe a composição completa de custos, incluindo o
  custo de compra do kit junto ao fornecedor — se esse documento for de fato entregue ao cliente
  (e não só uso interno/engenharia), o cliente consegue calcular a margem exata da empresa.
  Confirmar com quem usa o app qual é o uso real desse PDF.
- [ ] **Descoberto na 7ª rodada (auditoria de state management): `ImportarDatasheet` (App.tsx:1813 —
  extração de specs de módulo/inversor via IA a partir de um datasheet) e `BuscadorCoordenadas`
  (App.tsx:1968 — geocodificação de endereço para UTM) estão implementados, com seu próprio
  loading-state e tratamento de erro, mas NENHUM dos dois é renderizado em nenhuma aba — não há
  `<ImportarDatasheet .../>` nem `<BuscadorCoordenadas .../>` em lugar nenhum do JSX.** Não é um bug
  de state (os dois travam corretamente o próprio botão enquanto "carregando", sem condição de
  corrida), é funcionalidade pronta mas nunca conectada à UI — o usuário preenche specs de
  módulo/inversor e UTM manualmente hoje, sem saber que esse atalho existe no código. Se o plano é
  usar essas duas funcionalidades, falta só montá-las em algum lugar da aba Kit/Localização.

### Nona rodada (ago/2026) — auditoria via 5 subagentes paralelos (arquivos ainda sem cobertura de auditoria manual)

Ângulo desta rodada: cobrir os arquivos que nenhuma das 8 rodadas anteriores tinha lido por completo —
serviços do renderer, os 4 documentos PDF além da capa (Memorial, Procuração, Diagrama Unifilar, Planta
de Situação), dimensionamento (agrupamento/bateria/FDI/perdas), geração de Excel/CEMIG/FioB, e geografia
(UTM/tiles de mapa). 5 subagentes independentes, cada um instruído a verificar fórmulas manualmente
(não confiar no `expect(...)` do teste) e citar norma/artigo quando aplicável.

- [x] **ALTO — `calcularPerdas.ts`: fórmula de temperatura de célula (NOCT) misturava a irradiância de
  referência do próprio ensaio NOCT (800 W/m²) com a de STC (1000 W/m²), subestimando a perda por
  temperatura em todo dimensionamento do app.** A fórmula padrão (Sandia PVPMC; Duffie & Beckman,
  *Solar Engineering of Thermal Processes*) é `Tcélula = Tamb + (NOCT-20) × (G/800)`, onde 800 W/m² é
  a irradiância do próprio ensaio NOCT — não a de STC. O código já escolhia G=800 W/m² (irradiância
  média anual representativa, decisão de projeto documentada no próprio comentário do arquivo), o que
  faz o fator corretoser G/800=800/800=1 (ΔT = NOCT−20 direto). O código, porém, multiplicava por 0.8
  (=800/1000 — a razão errada, misturando duas irradiâncias de referência que não têm relação nessa
  fórmula). Divergência concreta (módulo padrão NOCT=45°C, Tamb=24°C): fórmula com bug → Tcél=44°C,
  ΔT=19°C, perda-temperatura=6,46%; fórmula corrigida → Tcél=49°C, ΔT=24°C, perda-temperatura=8,16%.
  Como a perda por temperatura entra na composição de `perdaTotalLiquida`, que alimenta diretamente
  `dimensionar.ts` (potência necessária = consumo/(HSP×dias×(1-perdas))), perdas subestimadas geravam
  um sistema dimensionado MENOR do que o necessário para entregar a compensação de energia contratada
  — o risco concreto é o cliente receber um sistema que não bate a economia prometida na proposta.
  Corrigido removendo o fator 0.8 (`Tcélula = Tamb + (NOCT-20)` diretamente, já que G=800=800). Um novo
  teste de regressão em `calcularPerdas.test.ts` verifica o valor exato de Tcélula/perdaTemperatura
  (não só o intervalo 6%-30% que os testes anteriores checavam, que não pegava o bug). **11 testes em
  5 arquivos** (`validacao_calculos.test.ts`, `auditoria_completa_v2.test.ts`, `auditoria.test.ts`,
  `pente_fino.test.ts`, `e2e_fluxo_completo.test.ts`) tinham valores esperados calibrados contra a
  fórmula com bug — recalculados manualmente um a um (mostrado nos comentários de cada teste) e
  atualizados; nenhum teste foi ajustado sem essa verificação independente.
- [x] **ALTO — `persistence.ts`: metadados de "recentes" (usados pela tela Home) liam campos que o
  único chamador real do app nunca envia — toda proposta salva mostrava potência/preço em branco.**
  `salvarArquivo()`/`importarArquivo()` liam `dados.dimensionamento?.potenciaInstaladaRealKWp` e
  `dados.precificacao?.precoVenda` (campos aninhados), mas `App.tsx` (função `salvar()`) monta o
  objeto salvo com `potenciaKWp`/`precoVenda` já resolvidos na RAIZ, sem nenhum campo
  `dimensionamento`/`precificacao` — os dois arquivos nunca tinham o mesmo contrato de dados, e como
  `salvarArquivo(dados: any)` não é tipado, o tsc nunca acusou a dessincronia. Resultado: toda proposta
  salva pelo fluxo real do app (não só nos testes, que usavam o formato aninhado e por isso davam falsa
  confiança) gravava `potenciaKWp`/`precoVenda` como `undefined`, e a tela Home nunca mostrava esses
  valores em nenhum card (renderização condicional `{p.potenciaKWp && (...)}`). Corrigido lendo
  `dados.potenciaKWp ?? dados.dimensionamento?.potenciaInstaladaRealKWp` (mesma ideia para preço) —
  aceita os dois formatos, com o real (raiz) tendo prioridade. Novos testes de regressão exercitam o
  formato REAL enviado por `App.tsx`, não só o aninhado.
- [x] **MÉDIO — `persistence.ts`, `importarArquivo()`: cancelar o diálogo nativo de importação
  travava a Promise para sempre (sem erro, sem log).** Só havia listener em `input.onchange` — em
  Chromium/Electron, quando o usuário clica em "Cancelar" no diálogo nativo sem escolher arquivo, o
  evento `change` NÃO dispara (só dispara quando um arquivo é de fato selecionado). Sem
  `input.oncancel`, a Promise nunca era resolvida nem rejeitada nesse caso. O teste que afirmava cobrir
  esse cenário ("resolve null quando o usuário fecha o seletor sem escolher arquivo") usava um mock que
  sempre disparava `onchange`, mesmo simulando "cancelar" — não reproduzia o comportamento real do DOM.
  Corrigido com `input.oncancel = () => resolve(null)`. Novo teste no mock simula a decisão real do
  navegador (dispara `oncancel`, não `onchange`, quando o usuário cancela).

- [x] **MÉDIO — `calcularBateria.ts`: alerta de segurança "autonomia mínima recomendada: 2 dias"
  nunca disparava em produção — corrigido nesta rodada.** O `if (autonomiaDias < 2)` estava aninhado
  dentro de `if (p.hspMinimo)`, e o único call site real (`App.tsx`, painel "Dimensionamento de Banco
  de Baterias") nunca passava `hspMinimo` — um sistema offgrid configurado com autonomia insuficiente
  (inclusive 0 dias) nunca recebia aviso nenhum na UI. O teste que cobria esse alerta só passava porque
  passava `hspMinimo` manualmente, cenário que a produção nunca reproduzia. Corrigido desacoplando o
  check de autonomia mínima (que não depende de HSP — é regra de segurança independente, curso slide
  1016) do cálculo de autonomia empírica (Eq. 6.13, que sim depende de HSP). De brinde, `App.tsx` agora
  também passa `hspMinimo` (via `HSP_MEDIO_POR_UF[cliente.uf]`, mesma tabela usada por
  `calcularTudo()`), então a autonomia empírica também passa a aparecer na UI, não só o alerta.

- [x] **ALTO — `gerarFormularioCemig.ts`: 3 campos obrigatórios do formulário oficial CEMIG (CPF,
  Bairro, CEP) sempre saíam em branco; 5 campos Sim/Não nunca eram escritos — corrigido nesta rodada.**
  `cliente?.bairro`/`cliente?.cep` liam campos que nunca existiram em `DadosCliente` (só existia
  `endereco` combinado) — as células E22/AS22, obrigatórias no formulário oficial, saíam sempre em
  branco. `cliente?.cpf` (célula AC18, também obrigatória) existia no tipo mas não tinha input nenhum
  na aba Cliente da UI (que só coletava nome/cidade/UF/telefone/e-mail), então também sempre saía em
  branco na prática. Corrigido formalizando `bairro`/`cep` em `DadosCliente` e adicionando 4 novos
  campos na aba Cliente (CPF — com máscara via `formatarCPF`, já importado mas nunca usado antes;
  Endereço; Bairro; CEP), todos opcionais (não bloqueiam avançar — só afetam o Formulário CEMIG e a
  Procuração). Separadamente, `DEFAULTS_CEMIG.grid_zero/fast_track/motor_gerador/armazenamento/
  telhado_arrendado` já tinham coordenada de célula documentada em comentário (`// O14 — padrão`, etc.
  — da mesma verificação linha-a-linha contra o arquivo oficial que corrigiu o resto do mapa numa
  rodada anterior), mas nunca tinham sido adicionadas a `MAPA_CELULAS` nem escritas por `escrever()` —
  5 células obrigatórias saíam sempre em branco, não com "Não" como o código aparentava pretender.
  Novo teste lê o `.xlsx` gerado de volta (não só `expect(...).not.toThrow()`) e confirma que as 8
  células saem preenchidas a partir do formato real de `dados.cliente`; confirmado manualmente que o
  teste falha contra o código original (as 5 células Sim/Não) antes do fix.

- [x] **ALTO — `Procuracao.tsx`: campo "estado civil" do outorgante sempre saía como "solteiro(a)"
  escrito por extenso, mesmo quando era falso — corrigido nesta rodada.**
  `ecMap[cliente.estadoCivil] || 'solteiro(a)'` afirmava "solteiro(a)" como FATO sempre que
  `estadoCivil` era `'outro'` (mapeava para `''`, falsy) ou qualquer valor ausente/não reconhecido —
  e não existe (nem existia) campo de estado civil na UI, então essa era a única saída possível na
  prática: todo instrumento de procuração gerado pelo app afirmava um estado civil nunca confirmado
  pelo usuário, risco jurídico real num documento com esse efeito. Corrigido para cair no mesmo
  padrão de placeholder em branco (`____________`) já usado no restante do arquivo para dado ausente
  (`rgCliente`, `endCliente`), em vez de uma afirmação não verificada — tanto para `'outro'` quanto
  para qualquer valor ausente/desconhecido. Novos testes cobrem os dois casos de bug e os dois casos
  de valor real informado (`'casado'`, `'solteiro'`), este último provando que o valor real continua
  sendo exibido corretamente quando de fato foi informado.
- [x] **ALTO — `MemorialDescritivo.tsx` e `Procuracao.tsx`: texto sempre dizia "microgeração...BT",
  mesmo para minigeração (>75 kWp) ou cliente Grupo A/Média Tensão — corrigido nesta rodada.** Nenhum
  dos dois documentos lia `data.enquadramento`/`data.consumo.grupoTensao`, apesar de `buildData()`
  (`App.tsx`) já enviar os dois campos para ambos — bastava ler o que já chegava, não plumbar dado
  novo. Corrigido com `classeGD = enquadramento?.classe==='minigeracao' ? 'Minigeração' :
  'Microgeração'` (mesmo limiar `LIMITE_MICROGERACAO_KW=75kWp` de `fioB/types.ts`) e
  `nivelTensao = consumo?.grupoTensao==='A' ? 'MT' : 'BT'`, aplicados na capa, no parágrafo de
  OBJETIVO e — achado adicional durante a escrita do teste de regressão, não estava na lista original
  do subagente — na seção 3.4 (Dispositivos de proteção), que também citava "Quadro de Distribuição
  Geral de Baixa Tensão" incondicionalmente. `MemorialDescritivo.tsx` também citava "RN nº 482 da
  ANEEL" no corpo do texto (norma revogada desde 2023) enquanto o comentário do próprio cabeçalho do
  arquivo já citava corretamente "REN ANEEL 1000/2021" — uma inconsistência entre o comentário interno
  e o texto realmente impresso no documento entregue à distribuidora. Corrigido para
  "REN ANEEL no 1.000/2021" no corpo também.
- [x] **ALTO — `DiagramaUnifilarBasico.tsx`: rótulo "REDE CEMIG" fixo no diagrama, para qualquer
  cliente de qualquer uma das 18 distribuidoras cadastradas — corrigido nesta rodada.**
  (`src/data/distribuidoras.ts`) — o arquivo não lia `consumo.codigoDistribuidora`. Documento técnico
  enviado à distribuidora com o nome da rede errado. Corrigido buscando a distribuidora real (mesmo
  padrão de fallback `nomeAbreviado:'CEMIG'` já usado em `MemorialDescritivo.tsx`/`Procuracao.tsx`) e
  usando o nome real nos dois rótulos "REDE ..." do diagrama (bloco da rede e faixa de
  responsabilidade "REDE ... (ACESSADA)").
- [x] **BAIXO — `PlantaDeSituacao.tsx`: UTM digitada manualmente aparecia sem separador de milhar —
  corrigido nesta rodada.** Inconsistente com a UTM geocodificada na mesma tabela —
  `localizacao.utmE`/`utmN` são `string` (campo de texto livre), e
  `String.prototype.toLocaleString()` é, por especificação (ECMA-402 21.1.3.28), equivalente a
  `toString()`: não formata nada, é um no-op silencioso — diferente de
  `Number.prototype.toLocaleString()`, usado corretamente na UTM geocodificada (numérica). Corrigido
  convertendo para `Number` antes de formatar, com fallback para o texto bruto se a conversão não for
  um número válido (defensivo, já que é entrada de texto livre do usuário).

**Todos os achados desta rodada foram corrigidos.** 4 arquivos (`Procuracao.tsx`,
`MemorialDescritivo.tsx`, `DiagramaUnifilarBasico.tsx`, `PlantaDeSituacao.tsx`) não tinham NENHUMA
cobertura de teste antes desta rodada — os 16 novos testes usam um helper
(`pdfTextTestHelper.ts`) que chama os componentes React diretamente (sem `pdf().toBuffer()`) e
extrai todo o texto da árvore de elementos recursivamente — inclusive invocando subcomponentes
customizados (`typeof node.type === 'function'`) para não perder texto que more dentro deles, caso
descoberto ao rodar os testes pela primeira vez contra os componentes já corrigidos (todos os 3
testes do Diagrama Unifilar davam falso-negativo sem esse passo, porque `<DiagramaSvg/>` é um
subcomponente). Isso permite regressão de TEXTO exato (ex: "deve conter 'Minigeração', não deve
conter 'Microgeração'"), não só `expect(buf).toBeTruthy()`.

### Décima rodada (ago/2026) — auditoria via subagente (`gerarExcel.ts`, a planilha de "segunda opinião")

Ângulo desta rodada: `gerarExcel.ts` (709 linhas) — o gerador do Excel de auditoria, cujo propósito
declarado no próprio cabeçalho do arquivo é "permitir segunda opinião e rastreabilidade" replicando
cada cálculo do app como fórmula Excel viva. Auditoria via subagente, com verificação manual
posterior de cada achado (fórmula recalculada à mão, campo cruzado contra o payload real enviado por
`App.tsx` — `gerarExcel()`, que monta o objeto direto de `useProjetoStore.getState()`, não passa por
`buildData()`) antes de aceitar qualquer um deles.

- [x] **ALTO — mesmo bug do fator ×0.8 na temperatura de célula (NOCT), já corrigido em
  `calcularPerdas.ts` numa rodada anterior, reintroduzido nesta planilha.** A aba "Perdas" calculava
  `Tcell = Tamb + (NOCT-20)×0.8`, com o mesmo comentário ("irradiância 800 W/m² vs 1000 STC") que já
  havia sido identificado como fisicamente errado — G=800 W/m² É a irradiância do próprio ensaio
  NOCT, não a de STC, então o fator correto é G/800=1. Exemplo concreto (NOCT=45°C, Tamb=24°C):
  Tcél=44°C (com o bug) vs Tcél=49°C (correto). Corrigido removendo o ×0.8, igual à correção já feita
  em `calcularPerdas.ts`.
- [x] **ALTO — fórmula de "Payback simples (anos)" na aba Fluxo_Caixa estava quebrada por
  construção — sempre mostrava ">25 anos", mesmo quando o payback real era de 4-5 anos.**
  `=IFERROR(MATCH(0,SIGN(F...),0)-1,">25 anos")` procurava o ano em que o fluxo acumulado é
  EXATAMENTE zero — com valores monetários reais isso praticamente nunca acontece (o cruzamento de
  negativo pra positivo cai entre dois meses, não exatamente em zero), então `SIGN(F)` nunca retorna
  0 e o `MATCH` sempre falha, caindo no `IFERROR`. Essa é a célula "viva" de segunda opinião — o
  Payback correto já aparecia certo na aba Resumo (vem de `indicadores.paybackSimplesAnos`, já
  calculado, não desta fórmula), mas a checagem independente que é o propósito declarado do arquivo
  estava sempre errada. Corrigido para `MATCH(1,SIGN(...))` — busca o primeiro ano com fluxo
  acumulado positivo (`SIGN(x)` para `x>0` sempre retorna exatamente `1`, nunca fracionário, então
  esse `MATCH` é confiável).
- [x] **ALTO — aba "FioB_Economia" (a que alimenta Fluxo_Caixa/VPL/TIR/Payback) ignorava por
  completo `enquadramento`/`percentuaisFioBPorAno`, ao contrário da aba "Resumo".** A aba Resumo já
  havia sido corrigida numa rodada anterior para checar `enquadramento?.elegivelArt26` (cliente
  isento de Fio B até 2045 pela regra de transição do Art. 26) — mas a aba "FioB_Economia", cujas
  células alimentam diretamente o Fluxo de Caixa/VPL/TIR/Payback "ao vivo", continuava assumindo o
  escalonamento do Art. 27 (60%→100%) incondicionalmente. Resultado: para um cliente Art.26, o texto
  do Resumo dizia corretamente "Fio B isento... sem escalonamento", mas os números "ao vivo" logo
  abaixo (VPL, Economia 25 anos, TIR/Payback) eram calculados como se ele pagasse Fio B crescente —
  contradição interna no mesmo documento. Corrigido replicando a mesma lógica já usada na aba Resumo
  (decisão Art.26-vs-Art.27 tomada em JS na geração do arquivo, já que não há célula editável de
  "elegível Art.26" nas Entradas) tanto na tabela de percentuais quanto na projeção de 25 anos —
  mantendo a célula "Ano base" reativa dentro do caso Art.27, para não perder a promessa de "fórmula
  viva" do cabeçalho do arquivo.
- [x] **ALTO — HSP (Horas de Sol Pleno) fixo em 5,4 (valor de MG), ignorando `cliente.uf`.**
  `const hsp = 5.4;`, apesar de `cliente` já estar disponível no escopo da função. O app real usa
  `HSP_MEDIO_POR_UF[cliente.uf]` (varia de 4,4 no Amazonas a 5,8 no Rio Grande do Norte — ~30% de
  variação entre estados). Para qualquer cliente fora de MG, a geração/dimensionamento estimados
  nesta planilha divergiam do valor real do app. Corrigido lendo `HSP_MEDIO_POR_UF[cliente.uf]`, com
  fallback para 5,4 (MG, mercado primário da Lumen) se a UF estiver ausente/desconhecida. A nota
  estática da célula ("MG=5.4 | SP=5.2 | BA=5.8") também estava errada mesmo como referência (a
  tabela real tem SP=5.0, BA=5.6) — corrigida para refletir a UF realmente usada.
- [x] **MÉDIO — reajuste tarifário, TMA e taxas Solfácil 48×/60× fixos no código, ignorando os
  campos reais e editáveis de `empresa` (aba Empresa da UI).** `reajuste=0.07` — mas o próprio
  default real (`empresa.reajusteTarifarioAnual`) é **0,06**: nem o caso "sem nenhuma configuração
  customizada" batia. `tma=0.08` e as duas taxas Solfácil coincidiam com o default real só por
  acaso — qualquer empresa que configurasse valores diferentes (os 4 campos são editáveis na aba
  Empresa) via essa configuração ignorada na planilha. Corrigido lendo
  `empresa.reajusteTarifarioAnual`/`empresa.taxaMinimaAtratividadeAnual`/`empresa.taxaSolfacil48Mensal`/
  `empresa.taxaSolfacil60Mensal`, mesmo padrão já usado corretamente para `empresa.fracaoTarifaFioB`
  em outro ponto do mesmo arquivo.
- [x] **MÉDIO — fallback de tarifa (`?? 1.18272801`) não cobria o caso real de campo vazio, e
  assumia CEMIG fixo para qualquer distribuidora.** O operador `??` só cai no fallback quando o
  valor é `null`/`undefined` — mas o default real do campo é `0` (número, não `undefined`; campo
  opcional, deixado em branco com frequência), então sempre que o usuário não preenchia a tarifa, a
  planilha usava tarifa=**0**, zerando a cadeia inteira (Entradas → FioB_Economia → Fluxo_Caixa →
  VPL/TIR/Payback) — não o valor de referência pretendido. O fallback fixo (`1.18272801` ≈
  `DISTRIBUIDORAS.CEMIG.tarifaKWhComICMS`) também assumia CEMIG mesmo para outra distribuidora
  selecionada pelo cliente. Corrigido para o mesmo padrão já usado pelo app real
  (`useProjetoStore.ts`): tarifa real se `> 0`, senão a tarifa de referência da distribuidora
  selecionada (ou CEMIG, se nenhuma bater).

10 novos testes de regressão em `gerarExcel.test.ts` (lendo o `.xlsx` gerado de volta via
`XLSX.readFile`, checando valores/fórmulas reais das células — não só `expect(...).not.toThrow()`),
todos confirmados falhando contra o código pré-fix (via `git stash`) antes de restaurar.

- [x] **ALTO — `gerarCronograma.ts`: para sistemas MiniGD, o cronograma agendava instalação
  mecânica/elétrica e até o comissionamento ANTES do Parecer de Acesso da CEMIG estar concluído.**
  Só a duração da própria etapa "Análise CEMIG — Parecer de Acesso" variava com `tipoSistema` (3
  semanas para MicroGD / 6 semanas para MiniGD, refletindo os prazos reais de 15/30 dias úteis) —
  mas todas as etapas seguintes (Instalação mecânica, Instalação elétrica, Testes e comissionamento,
  Solicitação de vistoria, Vistoria CEMIG, Entrega) tinham `semana` de início FIXA (6, 7, 8, 8, 9,
  13), calibrada apenas para o caso MicroGD, em que o Parecer termina exatamente na semana 3+3=6,
  batendo por coincidência com o início hardcoded da Instalação mecânica. Para um sistema MiniGD
  (>75 kWp, prazo de Parecer maior — 30 dias úteis), o Parecer só termina na semana 3+6=9, mas o
  cronograma gerado continuava mostrando instalação mecânica começando na semana 6, elétrica na 7 e
  comissionamento na 8 — ou seja, 3 semanas antes da aprovação de acesso da distribuidora, um
  cronograma que orientaria a Lumen/o cliente a iniciar obra sem o Parecer de Acesso da CEMIG em mãos
  para projetos de minigeração. Corrigido introduzindo `semanaParecerFim = 3 +
  (tipoSistema==='micro'?3:6)` e reescrevendo a semana de início de cada etapa pós-Parecer como
  deslocamento a partir dele (`semanaParecerFim`, `+1`, `+2`, `+2`, `+3`, `+7`) — verificado
  algebricamente que isso reproduz exatamente o cronograma MicroGD original (semanas 6/7/8/8/9/13,
  zero mudança de comportamento) e desloca corretamente o MiniGD para começar só após a semana 9,
  ainda cabendo dentro da grade fixa de `N_SEMANAS=16` (última etapa cai exatamente na semana 16).
  `gerarCronograma.ts` não tinha NENHUM teste que checasse valores reais de semana/data por etapa
  (só um smoke-test `not.toThrow()` para o caso `'mini'`) — 5 novos testes de regressão em
  `gerarCronograma.test.ts` (lendo o `.xlsx` gerado de volta, comparando datas reais de início/término
  por etapa via `XLSX.readFile`), 2 deles confirmados falhando contra o código pré-fix (via `git
  stash`) antes de restaurar — a etapa "Instalação mecânica" começava 3 semanas antes do "Análise
  CEMIG — Parecer de Acesso" terminar, no caso MiniGD.

### Décima primeira rodada (ago/2026) — auditoria via subagente (`precificacaoServicos/`, `precificacao/`, `geografia/`) + bug de rótulo de hemisfério UTM

Ângulo desta rodada: subagente auditou `calcularTabelaAtualizada.ts`, `indiceCorrecao.ts`,
`calcularPrecificacao.ts`, `converterCoordenadas.ts` e `tileMercator.ts` — reimplementando cada
fórmula (correção monetária composta, precificação "imposto por dentro", projeção UTM de Snyder/USGS
1987, tile math de mapa "slippy") de forma independente (inclusive comparando `converterCoordenadas.ts`
contra `pyproj`, biblioteca GIS de referência) antes de aceitar qualquer valor. **Nenhum bug de
fórmula foi encontrado nesses 5 arquivos** — resultado diferente das rodadas anteriores, reportado
como está (0 bugs), sem inflar a lista com nitpicks de estilo.

O subagente citou, como observação periférica fora do escopo pedido, que `App.tsx` exibia UTM com a
letra do hemisfério ("S") hardcoded. Investigação própria (não do subagente) confirmou que era um bug
real e o expandiu:

- [x] **BAIXO/MÉDIO — letra do hemisfério da UTM ("N" ou "S") hardcoded como "S" em TRÊS lugares,
  presumindo Brasil = hemisfério sul sempre.** `latLonParaUTM()` (`converterCoordenadas.ts`) já
  calculava a falsa origem de 10.000.000 corretamente para hemisfério sul (`lat < 0`) — mas não
  retornava a letra do hemisfério, e os 3 pontos que exibem UTM formatada (busca de coordenadas em
  `App.tsx`, e as duas linhas da tabela UTM em `PlantaDeSituacao.tsx` — este último é o documento
  exigido pela CEMIG ND 5.30, efetivamente enviado à distribuidora) hardcodeavam a letra "S" no texto.
  Isso é verdade para a esmagadora maioria do território brasileiro, mas **não** para Roraima inteiro
  e partes do norte do Amapá/Amazonas (latitude ≥ 0°, hemisfério N pela convenção UTM/MGRS — o
  próprio equador cai na faixa "N"). Para uma instalação nessa região, o documento enviado à
  distribuidora mostraria "Fuso 20S" quando o correto seria "Fuso 20N" — rótulo tecnicamente incorreto
  num documento oficial, ainda que o valor numérico de E/N em si já estivesse certo. Corrigido
  adicionando `hemisferio: 'N'|'S'` ao retorno de `latLonParaUTM()` (campo opcional na interface
  `CoordenadaUTM`, já que UTM digitada manualmente pelo usuário não tem lat/lon associado para
  calcular com certeza — nesse caso, `PlantaDeSituacao.tsx` aproxima usando o hemisfério do endereço
  geocodificado, mesma premissa já usada pelo alerta de divergência entre as duas UTMs) e propagando
  o campo real aos 3 pontos de exibição em vez do "S" fixo.

6 novos testes de regressão (`converterCoordenadas.test.ts` e `PlantaDeSituacao.test.ts`, este último
usando coordenadas de Boa Vista/RR como caso do hemisfério norte), todos confirmados falhando contra
o código pré-fix (via `git stash`) antes de restaurar.

### Décima segunda rodada (ago/2026) — auditoria via subagente do painel Grupo A (`App.tsx`/`useProjetoStore.ts`)

Ângulo desta rodada: auditar a CORRETUDE (não o escopo, já documentado como pendência aceita) do
painel "Cálculo Grupo A (preview)" adicionado numa rodada anterior — o cálculo de Grupo A
(`calcularDimensionamentoGrupoA`) em si, o novo JSX em `TabConsumo` (`App.tsx`) que o exibe, o
`resultadoGrupoA` do store, e os 3 blocos de aviso nos documentos. Subagente confirmou: fórmula de
`calcularGrupoA.ts` correta (já auditada em rodada anterior, sem achado novo); condicional de
exibição do painel (A vs B) correta; mapeamento de campos exibidos correto (sem trocas); os 3 blocos
de aviso nos documentos usam leitura direta de `resultadoGrupoA` (sem fórmula duplicada divergente);
reset ao trocar de grupo funciona.

- [x] **ALTO — o painel "Cálculo Grupo A (preview)" em `App.tsx` (`TabConsumo`) exibia
  `s.resultadoGrupoA` sem checar se os dados de tarifa/demanda/histórico ainda batiam com o último
  cálculo — ao contrário de TODO o resto do app, que já usa `calculoDesatualizado()` para essa
  proteção.** `resultadoGrupoA` só é recalculado dentro de `calcularTudo()` (botão "Calcular
  resultado completo" na aba Preço) — não há nenhum recálculo automático ao editar os campos de
  Grupo A na aba Consumo. `calculoDesatualizado()`/`assinaturaEntradasCalculo()` já protegem
  `buildData()` (geração de PDF) e `gerarExcel()` contra dados obsoletos — mas essa proteção nunca
  era chamada dentro de `TabConsumo`, então o preview de Grupo A ficava sem a mesma rede de
  segurança. Isso é agravado pelo aviso vermelho logo abaixo do próprio painel, que instrui
  explicitamente o vendedor a **copiar esses números manualmente** para a proposta do cliente de
  média tensão ("...use os números deste painel manualmente até a integração com os documentos ser
  concluída") — um fluxo que não passa pelos guards de `buildData()`/`gerarExcel()`. Cenário
  concreto: vendedor calcula com demanda contratada = 100 kW, volta à aba Consumo e corrigie para 60
  kW (erro de digitação) — o painel continuava mostrando os números da conta calculada com 100 kW,
  sem nenhum aviso, e a própria instrução do app dizia para copiar isso à mão para o cliente.
  Corrigido reaproveitando `calculoDesatualizado()` dentro do painel — mesmo padrão visual e botão
  "🔄 Recalcular agora" já usados em `TabResultado`. Como `assinaturaEntradasCalculo()` serializa o
  objeto `consumo` inteiro (não campo a campo), o mecanismo já cobre genericamente qualquer campo de
  Grupo A (tarifas Ponta/Fora-Ponta, demanda contratada/medida, histórico mensal) sem precisar de
  lista própria — confirmado com um novo teste dedicado que edita `demandaContratadaKW` (campo
  exclusivo de Grupo A) depois de calcular e prova que a assinatura diverge, fechando o loop de que o
  mecanismo reaproveitado realmente cobre este caso.
  **Limitação de cobertura de teste, declarada explicitamente:** o projeto não tem infraestrutura de
  teste de componente React (`vitest.config.ts` usa `environment:'node'`, sem jsdom/
  `@testing-library`) — o novo teste em `useProjetoStore.test.ts` prova que o MECANISMO subjacente
  (`calculoDesatualizado`/`assinaturaEntradasCalculo`) funciona para um campo de Grupo A, mas não
  renderiza o JSX do painel em si para provar que o banner aparece na tela; essa parte foi verificada
  por leitura manual cuidadosa do código (mesmo padrão já usado em rodadas anteriores para fixes de
  JSX em `App.tsx`, arquivo sem cobertura de teste de UI desde o início do projeto).

### Décima terceira rodada (ago/2026) — cross-check contra o "Manual do Usuário — Sistema APR Web" oficial da CEMIG (`gerarCronograma.ts`)

O usuário enviou dois documentos oficiais da CEMIG: um pacote de anexos do processo **PART**
(Programa de Antecipação de Redes de Distribuição por Terceiros Legalmente Habilitados — obra de
expansão de rede paga por terceiros, ex.: loteamentos) e o **Manual do Usuário — Sistema APR Web**
(v.2H, 23/12/2021). O primeiro **não se aplica** ao escopo do LumenSolar (processo de expansão de
rede, não de geração distribuída/MicroGD) e foi descartado sem uso. O segundo é diretamente
relevante — é o manual oficial do próprio portal que `gerarCronograma.ts` e `App.tsx` já citam nos
comentários (Cemig Atende + APR Web) — e foi usado para conferir os prazos hardcoded no cronograma
contra a fonte primária.

Confirmado correto: prazo de 24h para cadastrar/enviar a Solicitação de Acesso de GD no APR Web
(manual, seção 8, "Cadastrar e Consultar uma Nota de Serviço") bate com o já existente em
`gerarCronograma.ts`.

- [x] **MÉDIO — a etapa "Solicitação de vistoria CEMIG" atribuía a si mesma o prazo "CEMIG: até 30
  dias úteis", mas esse prazo pertence à etapa SEGUINTE (CEMIG realizar a vistoria depois de
  solicitada), não à ação de solicitar em si — que tem seu PRÓPRIO prazo, e é do acessante, não da
  CEMIG.** Conferido no manual (seção 7.6, card "Vistoria de Mini/Microgeração Distribuída"): "O
  acessante deve solicitar vistoria em até 120 (cento e vinte) dias após a emissão do parecer de
  acesso" — um prazo completamente diferente (quem tem o prazo, e de quantos dias) do que estava
  escrito. Não é uma correção de data (o cronograma já agenda a solicitação ~2 semanas após o fim do
  Parecer, bem dentro dos 120 dias), só de rótulo — mas o rótulo antigo confundia de quem é o prazo e
  citava o número errado para a etapa em questão. A etapa seguinte ("Vistoria CEMIG e troca do
  medidor") também foi corrigida para citar os DOIS prazos sequenciais que na verdade se aplicam a
  ela (CEMIG até 30 dias úteis para REALIZAR a vistoria + até 30 dias para trocar o medidor após
  aprovação) — antes citava só o segundo.
- [x] **ALTO — `Etapa.descricao` (prazos, normas, responsabilidades de cada etapa — inclusive as
  duas citações acima, agora corretas e com fonte) era calculada para as 16 etapas do cronograma mas
  NUNCA era escrita na planilha gerada.** O loop que monta a planilha só escrevia
  Fase/Etapa/Responsável/Início/Término e as barras de Gantt — o campo `descricao` existia no código,
  continha informação real e útil (inclusive os prazos regulatórios citados nos comentários do
  cabeçalho do arquivo), mas era silenciosamente descartado: o cliente/empresa que abrisse o
  cronograma gerado nunca via nenhuma dessas descrições. Corrigido adicionando a coluna "Descrição /
  Prazos" (coluna V, a 22ª, logo após as 16 colunas de semana) e uma largura de coluna própria (70
  caracteres) para o texto ficar legível — o arquivo não tinha nenhuma configuração de largura de
  coluna antes (`!cols` inexistente), então de passagem as 5 primeiras colunas também ganharam
  largura mínima razoável.

4 novos testes de regressão em `gerarCronograma.test.ts` (cabeçalho da coluna, todas as 16 etapas com
descrição não-vazia, e as duas citações de prazo corrigidas), confirmados falhando contra o código
pré-fix (via `git stash`) antes de restaurar.

### Oitava rodada (ago/2026) — bug de renderização/paginação na capa do PDF Comercial (`PropostaComercialPDF.tsx`)

Mudança de ângulo de novo: nenhuma das 6 rodadas anteriores olhou de fato para as *páginas
renderizadas* dos PDFs gerados — só `expect(buf).toBeTruthy()`. Gerei um PDF de exemplo (via o
mesmo fixture de `propostaPdf.grupoA.test.ts`) e inspecionei visualmente cada página; a capa do
"Doc Proposta" (`PropostaComercialPDF.tsx`, botão "📄 Proposta") tinha dois defeitos, o segundo só
visível depois de corrigir o primeiro.

- [x] **ALTO — a capa do PDF entregue ao cliente saía sem a foto de fundo, e o documento ganhava
  uma página extra em branco logo depois dela.** A capa usa uma `<Image>` de fundo full-bleed
  (`position:'absolute', width:'100%', height:'100%'`) seguida de uma `<View>` irmã, também
  absoluta, com overlay de dados do cliente (nome, cidade, kWp, economia, payback). O motor de
  paginação do `@react-pdf/renderer` interpreta essa combinação como "nó grande demais pra caber e
  que não sabe quebrar entre páginas" — emite `console.warn("Node of type IMAGE can't wrap between
  pages and it's bigger than available page height")` e separa o conteúdo: a imagem de fundo fica
  sozinha na página 1 (sem nenhum texto do overlay) e a `<View>` do overlay vira órfã numa página 2
  quase em branco (só o fundo escuro do overlay, sem a foto atrás). Confirmado visualmente: PDF de
  teste tinha 7 páginas em vez de 6, com a página 2 vazia. Corrigido com a prop `fixed` na `<Image>`
  de capa — isenta o nó da paginação normal, mesmo padrão já usado no rodapé
  (`<View style={S.footer} fixed>`, já existente no mesmo arquivo). Página 2 órfã desaparece, PDF
  volta a ter 6 páginas, capa mostra a foto com os dados do cliente por cima, tudo na mesma página.
- [x] **MÉDIO — corrigir o bug acima expôs um segundo defeito que estava escondido atrás dele: o
  texto dinâmico do overlay (nome do cliente, cidade/UF, kWp, economia/mês, payback) colidia
  visualmente com texto/ícones já embutidos na própria foto de capa** (badges "PROJETOS INSTALAÇÃO
  MANUTENÇÃO", "EFICIÊNCIA ECONOMIA SUSTENTABILIDADE", "TECNOLOGIA QUALIDADE CONFIANÇA", já
  desenhados na imagem `IMG_CAPA`), porque o overlay usava `backgroundColor: 'rgba(0,0,0,0.72)'` —
  72% opaco não é suficiente pra apagar completamente o que está atrás em todas as combinações de
  cor/contraste da foto. Cheguei a testar `rgba(0,0,0,0.94)` e ainda sobrava traço visível do badge
  por trás do texto branco/dourado do overlay. Corrigido trocando para uma cor sólida e 100% opaca
  (`C.dark`, `#0a0b10`, já usada no resto da paleta do documento — mesma cor do plano de fundo do
  "Doc Técnica") em vez de `rgba` translúcido: elimina qualquer chance de vazamento da imagem por
  trás do texto, independente da posição exata dos elementos gráficos embutidos na foto (que eu não
  medi pixel a pixel — a cor sólida torna essa medição desnecessária).
- [x] Novo teste de regressão em `propostaPdf.grupoA.test.ts` ataca a causa raiz diretamente: espiona
  `console.warn` durante a geração do PDF e falha se aparecer qualquer warning de paginação
  (`"can't wrap between pages"`). Verificado manualmente que esse teste FALHA contra o código
  original (sem a prop `fixed`) antes de confirmar que passa com o fix — não é um teste de
  placebo. Nenhum dos outros arquivos de PDF (`PropostaPDF.tsx`, `MemorialDescritivo.tsx`,
  `Procuracao.tsx`, `DiagramaUnifilarBasico.tsx`, `PlantaDeSituacao.tsx`) usa o padrão
  imagem-de-fundo-full-bleed-mais-overlay-absoluto — `IMG_APOIO` (segunda imagem do mesmo arquivo)
  usa altura fixa (110pt, não `'100%'`) e não é `position:'absolute'`, então não é afetada pelo
  mesmo bug; confirmado por grep, o defeito é específico da capa do Doc Proposta.
