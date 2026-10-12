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
- O segundo salto consome 12% de energia; a bateria precisa ter mais que esse valor para executá-lo.
- Explosivos exigem o salto duplo ou um escudo ativo; um salto simples não basta.
- Um buraco negro prende o astronauta por um instante; salte antes de o tempo de reação da dificuldade acabar.
- Lacunas entre módulos encerram a missão se não forem atravessadas por um salto.
- Recursos ultrapassados enquanto o astronauta está no ar não são coletados.
- O turbo avança automaticamente três blocos, registrando os módulos ultrapassados.
- Energia e frequência dos obstáculos variam com a dificuldade.
- O botão **Encerrar missão** registra a partida e exibe todas as estatísticas.
- O contador de quase mortes inclui quedas evitadas por salto, uma explosão absorvida pelo escudo ou um impacto que deixa a bateria em estado crítico (20% ou menos).

## Estruturas de dados

- `DoublyLinkedList`: módulos ativos e remoção eficiente das extremidades do percurso.
- `SinglyLinkedList`: registro cronológico dos blocos visitados durante a missão.
- `RankingList`: lista simplesmente encadeada de recordes pessoais, ordenada por distância e, em empate, melhor tempo de sobrevivência.

O ranking de astronautas é salvo no armazenamento local do navegador. O relatório final mostra a sequência visual completa dos blocos atravessados e o histórico textual da missão.
