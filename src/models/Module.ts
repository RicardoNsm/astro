import type { Difficulty } from "./Astronaut";

export type ModuleType = "clear" | "explosive" | "energy" | "shield" | "blackHole" | "turbo";

export const MODULE_LABELS: Record<ModuleType, string> = {
  clear: "Plataforma",
  explosive: "Explosivo",
  energy: "Energia",
  shield: "Escudo",
  blackHole: "Buraco negro",
  turbo: "Turbo",
};

export class StationModule {
  public resolved = false;

  public constructor(
    public readonly block: number,
    public readonly type: ModuleType,
  ) {}

  public static generate(
    block: number,
    difficulty: Difficulty,
    hazardsAllowed: boolean,
  ): StationModule {
    const roll = Math.random();
    if (roll < 0.11) {
      return new StationModule(block, "energy");
    }
    if (roll < 0.17) {
      return new StationModule(block, "shield");
    }
    if (roll < 0.22) {
      return new StationModule(block, "turbo");
    }
    if (!hazardsAllowed) {
      return new StationModule(block, "clear");
    }

    let hazardChance = 0.2;
    if (difficulty === "medium") {
      hazardChance = 0.32;
    } else if (difficulty === "hard") {
      hazardChance = 0.45;
    }

    const hazardRoll = (roll - 0.22) / 0.78;
    if (hazardRoll >= hazardChance) {
      return new StationModule(block, "clear");
    }
    if (Math.random() < 0.58) {
      return new StationModule(block, "explosive");
    }
    return new StationModule(block, "blackHole");
  }
}

export interface BlockRecord {
  readonly block: number;
  readonly moduleType: ModuleType;
  readonly outcome: string;
}
