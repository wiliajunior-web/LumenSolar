# Como gerar o SolarPropV.exe

## Opção 1 — Na sua máquina Windows (mais simples)

**Pré-requisito:** ter o Node.js instalado.
- Baixe em https://nodejs.org (versão LTS)
- Instale normalmente (próximo, próximo, concluir)
- Feche e reabra o terminal após instalar

**Para gerar o .exe:**
1. Extraia o arquivo `.tar.gz` (use o 7-Zip se precisar)
2. Abra a pasta `solarpropv`
3. Dê dois cliques no arquivo **`build.bat`**
4. Aguarde — na primeira vez demora ~5 minutos (baixa o Electron)
5. A pasta `release/` abre automaticamente com o **`SolarPropV-0.5.0-portable.exe`**

Pronto. Copie o `.exe` para onde quiser — funciona sem instalar nada.

---

## Opção 2 — GitHub Actions (automático a cada atualização)

Se você tiver uma conta no GitHub:

1. Crie um repositório e suba esse projeto (`git push`)
2. Vá em **Actions** → o workflow "Gerar SolarPropV.exe" roda automaticamente
3. Quando terminar (~3 minutos), clique no workflow → **Artifacts** → baixe o `.exe`

A cada vez que você mudar o código e fizer push, o `.exe` é gerado automaticamente.

---

## Opção 3 — Terminal (qualquer OS com Node.js)

```bash
npm install
npm run build
npx electron-builder --win portable --x64
# .exe gerado em: release/SolarPropV-0.5.0-portable.exe
```
