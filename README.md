# Macbeth

Editor de texto feito para o teatro: escrever, dirigir e ensaiar uma peça a partir do mesmo arquivo.

A peça é tratada como estrutura (atos, cenas, rubricas, falas e personagens), e não como texto corrido. A formatação acontece sozinha enquanto se digita.

## Estado

Em desenvolvimento. A primeira entrega cobre:

- editor estruturado, com Enter, Tab e atalhos no estilo Fountain;
- cadastro de personagens;
- abrir e salvar arquivos `.mbth`;
- exportação em PDF;
- visuais Papel (claro) e Coxia (escuro);
- formatações "Em linha" (o padrão das edições brasileiras) e "Centralizado" (o padrão em inglês), escolhidas por peça.

## Estrutura do repositório

```
packages/core/   regras da peça em TypeScript puro, sem dependência de Vue
packages/ui/     componentes Vue compartilhados
apps/web/        o aplicativo Vue
apps/desktop/    casca de desktop com Tauri 2
```

## Como rodar

Requisitos: Node 22 ou mais novo, pnpm (via `corepack enable`) e, para o desktop, Rust e as [dependências do Tauri](https://v2.tauri.app/start/prerequisites/) do seu sistema.

```bash
pnpm install
pnpm desktop     # abre o app de desktop
pnpm dev         # abre só a versão web, em http://localhost:1420
pnpm test        # roda os testes
```

## Licença

[GNU Affero General Public License v3.0](LICENSE). Veja também [CONTRIBUTING.md](CONTRIBUTING.md).
