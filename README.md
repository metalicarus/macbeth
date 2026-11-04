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
- formatação "Em linha", o padrão das edições brasileiras.

## Estrutura do repositório

```
packages/core/   regras da peça em TypeScript puro, sem dependência de Vue
packages/ui/     componentes Vue compartilhados
apps/web/        o aplicativo Vue
apps/desktop/    casca de desktop com Tauri 2
```

## Licença

[GNU Affero General Public License v3.0](LICENSE). Veja também [CONTRIBUTING.md](CONTRIBUTING.md).
