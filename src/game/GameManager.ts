import { Astronaut, type AstronautConfiguration } from "../models/Astronaut";
import { StationModule, type BlockRecord, type ModuleType } from "../models/Module";
import { DoublyLinkedList } from "../structures/DoublyLinkedList";
import { RankingList } from "../structures/RankingList";
import { SinglyLinkedList } from "../structures/SinglyLinkedList";

export type GameState = "ready" | "running" | "over";

export interface MissionSummary {
  readonly distance: number;
  readonly durationSeconds: number;
  readonly modulesAvoided: number;
  readonly energyCollected: number;
  readonly explosivesAvoided: number;
  readonly explosivesDetonated: number;
  readonly explosionsAbsorbed: number;
  readonly energyModulesCollected: number;
  readonly shieldsUsed: number;
  readonly superJumps: number;
  readonly ultraJumps: number;
  readonly nearDeaths: number;
  readonly cause: string;
}

const DIFFICULTY_SETTINGS = {
  easy: { speed: 2.15, drain: 0.65, damage: 18, hazardGap: 7, blackHoleReaction: 1.15 },
  medium: { speed: 2.65, drain: 1, damage: 32, hazardGap: 5, blackHoleReaction: 0.85 },
  hard: { speed: 3.2, drain: 1.45, damage: 45, hazardGap: 3, blackHoleReaction: 0.6 },
} as const;

const SAFE_OPENING_BLOCKS = 6;
const DOUBLE_JUMP_ENERGY_COST = 12;
const GAP_CHANCE = { easy: 0.012, medium: 0.025, hard: 0.04 } as const;

export class GameManager {
  public readonly astronaut: Astronaut;
  public readonly modules = new DoublyLinkedList<StationModule>();
  public readonly history = new SinglyLinkedList<BlockRecord>();
  public state: GameState = "ready";
  public distance = 0;
  public elapsedSeconds = 0;
  public modulesAvoided = 0;
  public energyCollected = 0;
  public explosivesAvoided = 0;
  public explosivesDetonated = 0;
  public explosionsAbsorbed = 0;
  public energyModulesCollected = 0;
  public shieldsUsed = 0;
  public superJumps = 0;
  public ultraJumps = 0;
  public nearDeaths = 0;
  private generatedThrough = 0;
  private lastHazardBlock = 0;
  private caughtInBlackHoleBlock: number | null = null;
  private blackHoleTimeRemaining = 0;
  private readonly settings: (typeof DIFFICULTY_SETTINGS)[keyof typeof DIFFICULTY_SETTINGS];

  public constructor(
    configuration: AstronautConfiguration,
    private readonly ranking: RankingList,
    private readonly onGameOver: (summary: MissionSummary) => void,
    private readonly onMessage: (message: string) => void,
  ) {
    this.astronaut = new Astronaut(configuration);
    this.settings = DIFFICULTY_SETTINGS[configuration.difficulty];
    this.generateAhead();
  }

  public start(): void {
    this.state = "running";
  }

  public jump(): void {
    if (this.state !== "running") {
      return;
    }
    const isSuperJump = this.astronaut.isAirborne && this.astronaut.jumpCount === 1;
    if (
      isSuperJump &&
      (this.astronaut.energy <= DOUBLE_JUMP_ENERGY_COST ||
        !this.astronaut.consumeEnergy(DOUBLE_JUMP_ENERGY_COST))
    ) {
      this.onMessage("Energia insuficiente para o super salto (12%)");
      return;
    }
    if (!this.astronaut.jump()) {
      this.onMessage("Salto duplo já utilizado");
      return;
    }
    if (this.caughtInBlackHoleBlock !== null) {
      const block = this.caughtInBlackHoleBlock;
      this.caughtInBlackHoleBlock = null;
      this.blackHoleTimeRemaining = 0;
      this.nearDeaths += 1;
      this.modulesAvoided += 1;
      if (
        !this.history.replaceLast({
          block,
          moduleType: "blackHole",
          outcome: "Buraco negro evitado por salto",
        })
      ) {
        throw new Error("Não foi possível atualizar o histórico do buraco negro.");
      }
      this.onMessage("Você escapou do buraco negro no último instante!");
    }
    if (isSuperJump) {
      this.superJumps += 1;
    }
  }

  public update(deltaSeconds: number): void {
    if (this.state !== "running") {
      return;
    }

    const delta = Math.min(deltaSeconds, 0.05);
    this.elapsedSeconds += delta;
    this.astronaut.energy = Math.max(0, this.astronaut.energy - this.settings.drain * delta);
    if (this.astronaut.energy === 0) {
      this.finish("A bateria do traje acabou.");
      return;
    }

    let remainingTime = delta;
    while (
      remainingTime > 0 &&
      this.state === "running" &&
      this.caughtInBlackHoleBlock === null
    ) {
      const nextBlock = Math.floor(this.distance) + 1;
      const timeToBlock = (nextBlock - this.distance) / this.settings.speed;

      if (timeToBlock > remainingTime) {
        this.astronaut.update(remainingTime);
        this.distance += this.settings.speed * remainingTime;
        remainingTime = 0;
        continue;
      }

      // Evaluate the jump and shield at the instant the astronaut reaches this block.
      this.astronaut.update(timeToBlock);
      remainingTime = Math.max(0, remainingTime - timeToBlock);
      this.distance = nextBlock;
      this.resolveBlock(nextBlock);
    }

    if (this.state === "running" && this.caughtInBlackHoleBlock !== null) {
      this.astronaut.update(remainingTime);
      this.blackHoleTimeRemaining -= remainingTime;
      if (this.blackHoleTimeRemaining <= 0) {
        const block = this.caughtInBlackHoleBlock;
        if (
          !this.history.replaceLast({
            block,
            moduleType: "blackHole",
            outcome: "Sugada pelo buraco negro",
          })
        ) {
          throw new Error("Não foi possível atualizar o histórico do buraco negro.");
        }
        this.finish("O astronauta parou sobre um buraco negro e foi sugado.");
      }
    }

    this.generateAhead();
    this.removeDistantModules();
  }

  public moduleAt(block: number): StationModule | null {
    const node = this.modules.find((module) => module.block === block);
    return node === null ? null : node.value;
  }

  public get shieldActive(): boolean {
    return this.astronaut.shieldSeconds > 0;
  }

  public get isAirborne(): boolean {
    return this.astronaut.isAirborne;
  }

  public finish(cause: string): void {
    if (this.state === "over") {
      return;
    }
    this.state = "over";
    const summary: MissionSummary = {
      distance: Math.floor(this.distance),
      durationSeconds: Math.floor(this.elapsedSeconds),
      modulesAvoided: this.modulesAvoided,
      energyCollected: this.energyCollected,
      explosivesAvoided: this.explosivesAvoided,
      explosivesDetonated: this.explosivesDetonated,
      explosionsAbsorbed: this.explosionsAbsorbed,
      energyModulesCollected: this.energyModulesCollected,
      shieldsUsed: this.shieldsUsed,
      superJumps: this.superJumps,
      ultraJumps: this.ultraJumps,
      nearDeaths: this.nearDeaths,
      cause,
    };
    this.ranking.insertSorted({
      name: this.astronaut.configuration.name,
      distance: summary.distance,
      bestTimeSeconds: summary.durationSeconds,
      suitColor: this.astronaut.configuration.suitColor,
      helmet: this.astronaut.configuration.helmet,
    });
    this.onGameOver(summary);
  }

  private resolveBlock(block: number): void {
    const node = this.modules.find((module) => module.block === block && !module.resolved);
    const module = node === null ? null : node.value;
    const type: ModuleType = module === null ? "clear" : module.type;
    let outcome = "Percorrido";

    if (module !== null) {
      module.resolved = true;
    }

    if (
      this.astronaut.isAirborne &&
      type !== "explosive" &&
      type !== "blackHole" &&
      type !== "gap" &&
      type !== "clear"
    ) {
      outcome = "Ultrapassado durante o salto";
      this.onMessage("Módulo ultrapassado no salto — recurso não coletado");
      this.history.append({ block, moduleType: type, outcome });
      return;
    }

    switch (type) {
      case "explosive":
        if (this.shieldActive) {
          this.explosivesDetonated += 1;
          this.explosionsAbsorbed += 1;
          this.modulesAvoided += 1;
          this.nearDeaths += 1;
          outcome = "Explosão absorvida pelo escudo";
          this.onMessage(outcome);
        } else if (this.astronaut.isAirborne && this.astronaut.jumpCount >= 2) {
          this.modulesAvoided += 1;
          this.explosivesAvoided += 1;
          outcome = "Super salto: explosivo evitado";
          this.onMessage(outcome);
        } else {
          this.astronaut.energy = Math.max(0, this.astronaut.energy - this.settings.damage);
          this.explosivesDetonated += 1;
          if (this.astronaut.energy > 0 && this.astronaut.energy <= 20) {
            this.nearDeaths += 1;
          }
          outcome = "Explosão: super salto ou escudo necessário";
          this.onMessage("Explosão! Faça o super salto ou use o escudo");
          if (this.astronaut.energy === 0) {
            this.history.append({ block, moduleType: type, outcome });
            this.finish("A explosão esgotou a energia do traje.");
            return;
          }
        }
        break;
      case "energy": {
        this.energyModulesCollected += 1;
        const recovered = this.astronaut.recharge(25);
        this.energyCollected += recovered;
        outcome = `Energia +${Math.round(recovered)}%`;
        this.onMessage(recovered > 0 ? outcome : "Bateria já está cheia");
        break;
      }
      case "shield":
        this.astronaut.shieldSeconds = 5;
        this.shieldsUsed += 1;
        outcome = "Escudo ativado";
        this.onMessage("Escudo ativado por 5 segundos");
        break;
      case "blackHole":
        if (this.astronaut.isAirborne) {
          this.modulesAvoided += 1;
          outcome = "Buraco negro saltado";
          this.onMessage("Buraco negro evitado");
        } else {
          this.caughtInBlackHoleBlock = block;
          this.blackHoleTimeRemaining = this.settings.blackHoleReaction;
          outcome = "Preso — salte antes de ser sugado";
          this.onMessage("Buraco negro! Salte agora para escapar");
        }
        break;
      case "gap":
        if (this.astronaut.isAirborne) {
          this.modulesAvoided += 1;
          this.nearDeaths += 1;
          outcome = "Lacuna atravessada por salto";
          this.onMessage("Lacuna evitada");
        } else {
          this.history.append({ block, moduleType: type, outcome: "Caiu no espaço" });
          this.finish("O astronauta caiu no espaço entre os módulos.");
          return;
        }
        break;
      case "turbo":
        outcome = "Turbo: salto de 3 blocos";
        this.onMessage("Turbo! Salto automático de 3 blocos");
        this.ultraJumps += 1;
        this.astronaut.launchTurboJump(3 / this.settings.speed + 0.25);
        this.skipAheadThreeBlocks(block);
        break;
      case "clear":
        break;
    }

    this.history.append({ block, moduleType: type, outcome });
  }

  private skipAheadThreeBlocks(startBlock: number): void {
    let skipped = 1;
    while (skipped <= 3) {
      const block = startBlock + skipped;
      const node = this.modules.find((module) => module.block === block);
      const type = node === null ? "clear" : node.value.type;
      if (
        node !== null &&
        (type === "explosive" || type === "blackHole" || type === "gap")
      ) {
        this.modulesAvoided += 1;
        if (type === "explosive") {
          this.explosivesAvoided += 1;
        }
        if (type === "gap") {
          this.nearDeaths += 1;
        }
      }
      if (node !== null) {
        node.value.resolved = true;
      }
      this.history.append({ block, moduleType: type, outcome: "Ultrapassado pelo turbo" });
      skipped += 1;
    }
    this.distance = startBlock + 3;
  }

  private generateAhead(): void {
    const finalBlock = Math.floor(this.distance) + 16;
    while (this.generatedThrough < finalBlock) {
      this.generatedThrough += 1;
      const block = this.generatedThrough;
      const module =
        block <= SAFE_OPENING_BLOCKS
          ? new StationModule(block, "clear")
          : StationModule.generate(
              block,
              this.astronaut.configuration.difficulty,
              block - this.lastHazardBlock >= this.settings.hazardGap,
              GAP_CHANCE[this.astronaut.configuration.difficulty],
            );
      this.modules.append(module);
      if (
        module.type === "explosive" ||
        module.type === "blackHole" ||
        module.type === "gap"
      ) {
        this.lastHazardBlock = block;
      }
    }
  }

  private removeDistantModules(): void {
    const oldestBlock = Math.floor(this.distance) - 1;
    let node = this.modules.head;
    while (node !== null) {
      const next = node.next;
      if (node.value.block < oldestBlock) {
        this.modules.remove(node);
      }
      node = next;
    }
  }
}
