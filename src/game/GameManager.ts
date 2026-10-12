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
  readonly cause: string;
}

const DIFFICULTY_SETTINGS = {
  easy: { speed: 2.15, drain: 0.72, damage: 22 },
  medium: { speed: 2.65, drain: 1, damage: 32 },
  hard: { speed: 3.2, drain: 1.45, damage: 45 },
} as const;

const SAFE_OPENING_BLOCKS = 6;
const MIN_HAZARD_SEPARATION = 6;

export class GameManager {
  public readonly astronaut: Astronaut;
  public readonly modules = new DoublyLinkedList<StationModule>();
  public readonly history = new SinglyLinkedList<BlockRecord>();
  public state: GameState = "ready";
  public distance = 0;
  public elapsedSeconds = 0;
  public modulesAvoided = 0;
  public energyCollected = 0;
  private generatedThrough = 0;
  private lastHazardBlock = 0;
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
    if (!this.astronaut.jump()) {
      this.onMessage("Salto duplo já utilizado");
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
    while (remainingTime > 0 && this.state === "running") {
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
      cause,
    };
    this.ranking.insertSorted({
      name: this.astronaut.configuration.name,
      distance: summary.distance,
      durationSeconds: summary.durationSeconds,
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
      (type === "energy" || type === "shield" || type === "turbo")
    ) {
      outcome = "Ultrapassado durante o salto";
      this.onMessage("Módulo ultrapassado no salto — recurso não coletado");
      this.history.append({ block, moduleType: type, outcome });
      return;
    }

    switch (type) {
      case "explosive":
        if (this.shieldActive || this.astronaut.isAirborne) {
          this.modulesAvoided += 1;
          outcome = this.shieldActive ? "Protegido pelo escudo" : "Explosivo evitado";
          this.onMessage(outcome);
        } else {
          this.astronaut.energy = Math.max(0, this.astronaut.energy - this.settings.damage);
          outcome = "Dano: salto duplo ou escudo necessário";
          this.onMessage("Explosão! Faça o salto duplo para evitar dano");
          if (this.astronaut.energy === 0) {
            this.history.append({ block, moduleType: type, outcome });
            this.finish("A explosão esgotou a energia do traje.");
            return;
          }
        }
        break;
      case "energy": {
        const recovered = this.astronaut.recharge(25);
        this.energyCollected += recovered;
        outcome = `Energia +${Math.round(recovered)}%`;
        this.onMessage(recovered > 0 ? outcome : "Bateria já está cheia");
        break;
      }
      case "shield":
        this.astronaut.shieldSeconds = 5;
        outcome = "Escudo ativado";
        this.onMessage("Escudo ativado por 5 segundos");
        break;
      case "blackHole":
        if (this.astronaut.isAirborne) {
          this.modulesAvoided += 1;
          outcome = "Buraco negro saltado";
          this.onMessage("Buraco negro evitado");
        } else {
          this.history.append({ block, moduleType: type, outcome: "Missão encerrada" });
          this.finish("O astronauta caiu em um buraco negro.");
          return;
        }
        break;
      case "turbo":
        outcome = "Turbo: salto de 3 blocos";
        this.onMessage("Turbo! Salto automático de 3 blocos");
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
      if (node !== null && (type === "explosive" || type === "blackHole")) {
        this.modulesAvoided += 1;
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
              block - this.lastHazardBlock >= MIN_HAZARD_SEPARATION,
            );
      this.modules.append(module);
      if (module.type === "explosive" || module.type === "blackHole") {
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
