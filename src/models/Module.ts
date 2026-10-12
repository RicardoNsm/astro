import type { Difficulty } from "./Astronaut";

export type ModuleType =
  | "clear"
  | "explosive"
  | "energy"
  | "shield"
  | "blackHole"
  | "turbo"
  | "gap";

export const MODULE_LABELS: Record<ModuleType, string> = {
  clear: "Plataforma",
  explosive: "Explosivo",
  energy: "Energia",
  shield: "Escudo",
  blackHole: "Buraco negro",
  turbo: "Turbo",
  gap: "Lacuna",
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
    gapChance: number,
  ): StationModule {
    const roll = Math.random();
    const energyChance = difficulty === "easy" ? 0.14 : difficulty === "medium" ? 0.11 : 0.08;
    const shieldChance = difficulty === "easy" ? 0.08 : difficulty === "medium" ? 0.065 : 0.05;
    const turboChance = 0.04;
    const resourceChance = energyChance + shieldChance + turboChance;
    if (roll < energyChance) {
      return new StationModule(block, "energy");
    }
    if (roll < energyChance + shieldChance) {
      return new StationModule(block, "shield");
    }
    if (roll < resourceChance) {
      return new StationModule(block, "turbo");
    }
    if (!hazardsAllowed) {
      return new StationModule(block, "clear");
    }

    const hazardChance = difficulty === "easy" ? 0.22 : difficulty === "medium" ? 0.4 : 0.62;
    const hazardRoll = (roll - resourceChance) / (1 - resourceChance);
    if (hazardRoll >= hazardChance) {
      return new StationModule(block, "clear");
    }
    if (hazardRoll < gapChance) {
      return new StationModule(block, "gap");
    }
    const typeRoll = (hazardRoll - gapChance) / (hazardChance - gapChance);
    const explosiveChance = difficulty === "easy" ? 0.78 : difficulty === "medium" ? 0.64 : 0.57;
    if (typeRoll < explosiveChance) {
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
