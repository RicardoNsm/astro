export type HelmetType = "visor" | "classic" | "pilot";
export type Difficulty = "easy" | "medium" | "hard";

export interface AstronautConfiguration {
  readonly name: string;
  readonly suitColor: string;
  readonly helmet: HelmetType;
  readonly difficulty: Difficulty;
}

export class Astronaut {
  public energy = 100;
  public shieldSeconds = 0;
  public jumpCount = 0;
  public airborneSeconds = 0;

  public constructor(public readonly configuration: AstronautConfiguration) {}

  public get isAirborne(): boolean {
    return this.airborneSeconds > 0;
  }

  public jump(): boolean {
    if (this.airborneSeconds <= 0) {
      this.jumpCount = 1;
      this.airborneSeconds = 0.78;
      return true;
    }
    if (this.jumpCount === 1) {
      this.jumpCount = 2;
      this.airborneSeconds = 0.82;
      return true;
    }
    return false;
  }

  public update(deltaSeconds: number): void {
    this.airborneSeconds = Math.max(0, this.airborneSeconds - deltaSeconds);
    if (this.airborneSeconds === 0) {
      this.jumpCount = 0;
    }
    this.shieldSeconds = Math.max(0, this.shieldSeconds - deltaSeconds);
  }

  public recharge(amount: number): number {
    const recovered = Math.min(amount, 100 - this.energy);
    this.energy += recovered;
    return recovered;
  }
}
