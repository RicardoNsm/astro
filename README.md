# Astro Runner

Jogo de corrida espacial em TypeScript, Canvas e DOM, executado localmente no navegador.

## Executar

```sh
npm install
npm run dev
```

Para validar e gerar a versão de produção:

```sh
npm run build
npm run preview
```

## Controles e regras

- `Espaço`, `↑` ou `W`: saltar; pressione novamente durante o salto para fazer o salto duplo.
- Explosivos causam dano se não forem atravessados durante qualquer salto ou com escudo.
- Buracos negros encerram a missão se o astronauta cair neles; um salto pode evitá-los.
- Recursos ultrapassados enquanto o astronauta está no ar não são coletados.
- O turbo avança automaticamente três blocos, registrando os módulos ultrapassados.
- Energia e frequência dos obstáculos variam com a dificuldade.

## Estruturas de dados

- `DoublyLinkedList`: módulos ativos e remoção eficiente das extremidades do percurso.
- `SinglyLinkedList`: registro cronológico dos blocos visitados durante a missão.
- `RankingList`: lista simplesmente encadeada com inserção ordenada por distância e, em empate, menor tempo.

O histórico e o ranking são mantidos durante a sessão atual do navegador.
