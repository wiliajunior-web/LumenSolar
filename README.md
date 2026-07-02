# SolarPropV

Aplicação desktop (Electron + React + TypeScript + Vite + Zustand + Vitest)
para dimensionamento de sistemas fotovoltaicos, geração de proposta econômica
e documentação técnica, com tratamento correto da **Lei nº 14.300/2022**
(marco legal da geração distribuída).

Projeto irmão do **ProjetEletrico**, mas com escopo próprio: comercial/GD em
vez de projeto elétrico predial NBR 5410/5444.

## Stack

- Electron 31 (processo principal + preload com `contextIsolation`)
- React 18 + TypeScript
- Vite 5 (bundler do renderer)
- Zustand (estado da aplicação)
- Vitest (testes do domínio — 26 testes passando no estado atual)

## Estrutura

```
src/
  domain/
    dimensionamento/   # consumo -> kWp -> nº módulos -> geração estimada
    fioB/               # enquadramento e escalonamento da Lei 14.300/2022
    financeiro/         # Tabela Price, fluxo de caixa, payback, VPL
    proposta/           # (a implementar) montagem do documento de proposta
    documentacao/        # (a implementar) memorial descritivo, formulário de acesso
  data/
    hspPorUF.ts          # Horas de Sol Pleno médias por UF (referência)
  renderer/
    App.tsx, main.tsx, store/   # UI e estado (React + Zustand)
  main/
    index.ts             # processo principal do Electron
  preload/
    index.ts             # bridge segura main <-> renderer
```

## Como rodar

```bash
npm install
npm run test        # roda a suíte de testes do domínio
npm run dev          # inicia o Vite dev server (renderer)
npm run build        # type-check + build de produção do renderer
```

> Observação: no ambiente onde este projeto foi montado, o binário do
> Electron não pôde ser baixado (rede restrita), por isso a instalação foi
> feita com `ELECTRON_SKIP_BINARY_DOWNLOAD=1`. Em uma máquina com acesso
> normal à internet, rode `npm install` sem essa variável para baixar o
> Electron e poder usar `npm run electron:dev` de fato dentro do app desktop.

## O que já está implementado e testado

- **Dimensionamento** (`src/domain/dimensionamento`): converte consumo médio
  mensal + HSP local + perdas do sistema + potência do módulo em número de
  módulos e potência instalada, com percentual de compensação configurável.
- **Fio B / Lei 14.300** (`src/domain/fioB`): classifica micro/minigeração,
  verifica elegibilidade à regra de transição do art. 26 (até 2045, conforme
  data de protocolo de acesso) versus o escalonamento do art. 27 (15% em 2023
  até 90% em 2028, 100% a partir de 2029), e a regra especial do art. 27 §1º
  para minigeração >500 kW não despachável em autoconsumo remoto/geração
  compartilhada com titular ≥25% de participação.
- **Financeiro** (`src/domain/financeiro`): Tabela Price (parcelas, juros,
  amortização) e fluxo de caixa anual com degradação dos módulos, reajuste
  tarifário, payback simples/descontado e VPL.
- **UI mínima** (`src/renderer/App.tsx`): formulário de cliente, consumo e
  data de protocolo de acesso, com cálculo de dimensionamento e enquadramento
  exibido em tela. Serve de esqueleto navegável, não é o produto final.

## Próximos passos sugeridos

1. **Validar a tabela de HSP por UF** com dado de irradiação por cidade
   (PVGIS/NASA POWER) em vez de média estadual — a planilha original tinha
   esse nível de granularidade implícito por cliente.
2. **Extrair as tabelas de custo** da planilha original (`CUSTO PROJETO
   POLICRISTALINO`/`MONOCRISTALINO`) para um módulo de precificação de kit
   (módulos, inversor, estrutura, mão de obra, projeto, margem).
3. **Conectar Fio B ao financeiro**: hoje os módulos são independentes; falta
   a função que usa `custoAnualFioB` para gerar a economia líquida mês a mês
   alimentando `calcularFluxoCaixa`.
4. **Módulo de proposta** (PDF/DOCX): juntar dimensionamento + financeiro +
   dados do cliente num documento comercial, reaproveitando o layout da
   planilha `PROPOSTA POLICRISTALINO/MONOCRISTALINO`.
5. **Módulo de documentação técnica**: memorial descritivo e formulário
   padrão de acesso à distribuidora (a Lei exige formulário-padrão da Aneel,
   art. 2º §3º).
6. **Persistência**: salvar/abrir projetos (json local), como no
   ProjetEletrico.
