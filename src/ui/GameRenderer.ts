import { GameManager } from "../game/GameManager";
import { MODULE_LABELS, type ModuleType } from "../models/Module";

const MODULE_COLORS: Record<ModuleType, string> = {
  clear: "#34445d",
  explosive: "#ff785f",
  energy: "#ffd66e",
  shield: "#70a9ff",
  blackHole: "#bd8bff",
  turbo: "#72e4c4",
};

const MODULE_SYMBOLS: Record<ModuleType, string> = {
  clear: "",
  explosive: "✹",
  energy: "ϟ",
  shield: "⬡",
  blackHole: "◉",
  turbo: "➤",
};

export class GameRenderer {
  private readonly context: CanvasRenderingContext2D;
  private previousFrame = 0;
  private manager: GameManager | null = null;
  private readonly resizeHandler: () => void;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Não foi possível inicializar o Canvas 2D.");
    }
    this.context = context;
    this.resizeHandler = () => this.resize();
    window.addEventListener("resize", this.resizeHandler);
    this.resize();
    window.requestAnimationFrame(this.frame);
  }

  public setManager(manager: GameManager): void {
    this.manager = manager;
  }

  public showFrame(): void {
    this.draw();
  }

  private readonly frame = (timestamp: number): void => {
    const delta = this.previousFrame === 0 ? 0 : (timestamp - this.previousFrame) / 1000;
    this.previousFrame = timestamp;
    if (this.manager?.state === "running") {
      this.manager.update(delta);
    }
    this.draw();
    window.requestAnimationFrame(this.frame);
  };

  private resize(): void {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw();
  }

  private draw(): void {
    const context = this.context;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }
    context.clearRect(0, 0, width, height);

    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#10192d");
    background.addColorStop(0.54, "#172139");
    background.addColorStop(1, "#0a1120");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    const manager = this.manager;
    const elapsedSeconds = manager?.elapsedSeconds ?? 0;
    this.drawNebula(width, height);
    this.drawStars(width, height, elapsedSeconds);
    this.drawStationSilhouette(width, height);
    if (manager === null) {
      this.drawIntro(width, height);
      return;
    }

    const groundY = height * 0.77;
    const cellWidth = Math.max(52, Math.min(76, width / 10));
    const playerX = width * 0.2;
    const currentBlock = manager.distance;
    const firstBlock = Math.floor(currentBlock) - 1;
    const lastBlock = Math.ceil(currentBlock + width / cellWidth) + 1;

    const horizon = context.createLinearGradient(0, groundY - 34, 0, groundY + 17);
    horizon.addColorStop(0, "rgba(112, 155, 207, 0)");
    horizon.addColorStop(0.8, "rgba(112, 155, 207, 0.13)");
    horizon.addColorStop(1, "rgba(119, 229, 209, 0.025)");
    context.fillStyle = horizon;
    context.fillRect(0, groundY - 34, width, 51);

    context.strokeStyle = "rgba(130, 170, 217, 0.2)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, groundY + 28);
    context.lineTo(width, groundY + 28);
    context.stroke();

    let floorMarker = Math.floor(currentBlock / 2) * 2;
    while (floorMarker < lastBlock + 2) {
      const x = playerX + (floorMarker - currentBlock) * cellWidth;
      const floorGradient = context.createLinearGradient(0, groundY + 28, 0, height);
      floorGradient.addColorStop(0, "rgba(33, 48, 72, 0.78)");
      floorGradient.addColorStop(1, "rgba(12, 20, 35, 0.08)");
      context.fillStyle = floorGradient;
      context.beginPath();
      context.moveTo(x, groundY + 29);
      context.lineTo(x + cellWidth, groundY + 29);
      context.lineTo(x + cellWidth + 17, height);
      context.lineTo(x - 17, height);
      context.closePath();
      context.fill();
      context.strokeStyle = "rgba(133, 162, 201, 0.12)";
      context.beginPath();
      context.moveTo(x, groundY + 29);
      context.lineTo(x - 17, height);
      context.stroke();
      floorMarker += 2;
    }

    let block = firstBlock;
    while (block <= lastBlock) {
      const x = playerX + (block - currentBlock) * cellWidth;
      if (x > -cellWidth && x < width + cellWidth) {
        this.drawBlock(x, groundY, cellWidth, manager.moduleAt(block)?.type ?? "clear", block);
      }
      block += 1;
    }

    const suitColor = manager.astronaut.configuration.suitColor;
    const jumpHeight = manager.isAirborne
      ? Math.sin(((0.82 - manager.astronaut.airborneSeconds) / 0.82) * Math.PI) * 61
      : 0;
    this.drawAstronaut(
      context,
      playerX,
      groundY - 34 - jumpHeight,
      suitColor,
      manager.astronaut.configuration.helmet,
      manager,
    );
    this.drawDistanceMarkers(width, currentBlock);
  }

  private drawNebula(width: number, height: number): void {
    const context = this.context;
    const nebula = context.createRadialGradient(
      width * 0.73,
      height * 0.31,
      4,
      width * 0.73,
      height * 0.31,
      width * 0.55,
    );
    nebula.addColorStop(0, "rgba(87, 112, 179, 0.19)");
    nebula.addColorStop(0.55, "rgba(66, 99, 149, 0.075)");
    nebula.addColorStop(1, "rgba(26, 40, 67, 0)");
    context.fillStyle = nebula;
    context.fillRect(0, 0, width, height);

    const glow = context.createRadialGradient(
      width * 0.2,
      height * 0.76,
      2,
      width * 0.2,
      height * 0.76,
      width * 0.4,
    );
    glow.addColorStop(0, "rgba(74, 205, 187, 0.09)");
    glow.addColorStop(1, "rgba(44, 119, 124, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }

  private drawStars(width: number, height: number, elapsedSeconds: number): void {
    const context = this.context;
    let index = 0;
    while (index < 68) {
      const drift = elapsedSeconds * (5 + index % 9);
      const x = (index * 167 + 53 - drift) % Math.max(width, 1);
      const normalizedX = x < 0 ? x + width : x;
      const y = (index * 73 + 19) % Math.max(Math.floor(height * 0.68), 1);
      context.globalAlpha = index % 7 === 0 ? 0.78 : 0.28;
      context.fillStyle = index % 8 === 0 ? "#9df2e1" : "#d3e1ff";
      context.beginPath();
      context.arc(normalizedX, y, index % 7 === 0 ? 1.35 : 0.7, 0, Math.PI * 2);
      context.fill();
      index += 1;
    }
    context.globalAlpha = 1;
  }

  private drawStationSilhouette(width: number, height: number): void {
    const context = this.context;
    const horizon = height * 0.68;
    const drift = (this.manager?.elapsedSeconds ?? 0) * 7;
    let index = 0;
    while (index < 4) {
      const rawX = index * width * 0.38 + 100 - drift;
      const x = ((rawX % (width + 250)) + width + 250) % (width + 250) - 125;
      const y = horizon + (index % 2) * 24;
      context.globalAlpha = 0.4;
      context.fillStyle = "#202c43";
      context.fillRect(x, y, 76, 4);
      context.fillRect(x + 18, y - 15, 40, 16);
      context.fillStyle = "#91a5c5";
      context.globalAlpha = 0.25;
      context.fillRect(x + 3, y - 2, 11, 1);
      context.fillRect(x + 62, y - 2, 11, 1);
      context.strokeStyle = "rgba(145, 165, 197, 0.28)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x + 38, y - 15);
      context.lineTo(x + 38, y - 26);
      context.stroke();
      context.fillStyle = "#ffb77a";
      context.beginPath();
      context.arc(x + 38, y - 27, 1.5, 0, Math.PI * 2);
      context.fill();
      index += 1;
    }
    context.globalAlpha = 1;
  }

  private drawIntro(width: number, height: number): void {
    const context = this.context;
    const centerX = width / 2;
    const centerY = height * 0.48;
    context.strokeStyle = "rgba(119, 229, 209, 0.12)";
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(centerX, centerY, 65, 19, -0.22, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.ellipse(centerX, centerY, 83, 27, -0.22, 0, Math.PI * 2);
    context.stroke();
    const core = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 44);
    core.addColorStop(0, "rgba(119, 229, 209, 0.19)");
    core.addColorStop(1, "rgba(119, 229, 209, 0)");
    context.fillStyle = core;
    context.beginPath();
    context.arc(centerX, centerY, 44, 0, Math.PI * 2);
    context.fill();
    context.textAlign = "center";
    context.fillStyle = "#77e5d1";
    context.font = "32px sans-serif";
    context.fillText("✦", centerX, centerY + 11);
    context.fillStyle = "#edf3ff";
    context.font = "600 13px system-ui, sans-serif";
    context.fillText("A ESTACAO AGUARDA SUA TRIPULACAO", centerX, height * 0.72);
    context.fillStyle = "#8494ae";
    context.font = "11px system-ui, sans-serif";
    context.fillText("Configure a missão para iniciar a simulação", centerX, height * 0.79);
  }

  private drawBlock(x: number, groundY: number, cellWidth: number, type: ModuleType, block: number): void {
    const context = this.context;
    const color = MODULE_COLORS[type];
    const gap = 5;
    const left = x + gap / 2;
    const top = groundY;
    const tileWidth = cellWidth - gap;

    context.fillStyle = "rgba(3, 8, 18, 0.32)";
    context.beginPath();
    context.ellipse(x + cellWidth / 2, top + 32, tileWidth * 0.46, 6, 0, 0, Math.PI * 2);
    context.fill();

    const tileGradient = context.createLinearGradient(left, top, left, top + 29);
    tileGradient.addColorStop(0, type === "clear" ? "#3a4b67" : "#354159");
    tileGradient.addColorStop(1, "#18243a");
    context.fillStyle = tileGradient;
    context.beginPath();
    context.roundRect(left, top, tileWidth, 27, 5);
    context.fill();
    context.strokeStyle = type === "clear" ? "rgba(147, 174, 213, 0.24)" : `${color}88`;
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = type === "clear" ? "#71829d" : color;
    context.beginPath();
    context.roundRect(left + 3, top + 2, tileWidth - 6, 2, 1);
    context.fill();

    if (type === "clear") {
      context.fillStyle = "rgba(189, 205, 230, 0.45)";
      context.font = "10px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(String(block), x + cellWidth / 2, top + 19);
      return;
    }

    const centerX = x + cellWidth / 2;
    const iconY = top - 22;
    const glow = context.createRadialGradient(centerX, iconY, 2, centerX, iconY, 31);
    glow.addColorStop(0, `${color}39`);
    glow.addColorStop(1, `${color}00`);
    context.fillStyle = glow;
    context.beginPath();
    context.arc(centerX, iconY, 31, 0, Math.PI * 2);
    context.fill();

    if (type === "blackHole") {
      const hole = context.createRadialGradient(centerX, top + 8, 2, centerX, top + 8, 23);
      hole.addColorStop(0, "#03050b");
      hole.addColorStop(0.52, "#090817");
      hole.addColorStop(0.73, "#8b69d8");
      hole.addColorStop(1, "rgba(189, 139, 255, 0)");
      context.fillStyle = hole;
      context.beginPath();
      context.ellipse(centerX, top + 8, 23, 11, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = `${color}cc`;
      context.lineWidth = 1.4;
      context.beginPath();
      context.ellipse(centerX, top + 8, 17, 6.5, -0.2, 0, Math.PI * 2);
      context.stroke();
    } else if (type === "explosive") {
      context.fillStyle = "#351d2c";
      context.beginPath();
      context.moveTo(centerX - 11, top - 2);
      context.lineTo(centerX - 9, top - 22);
      context.lineTo(centerX, top - 30);
      context.lineTo(centerX + 10, top - 19);
      context.lineTo(centerX + 9, top - 2);
      context.closePath();
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = 1.6;
      context.stroke();
      context.fillStyle = "#ffd1a3";
      context.beginPath();
      context.arc(centerX, top - 15, 3.2, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#ffac75";
      context.beginPath();
      context.moveTo(centerX + 2, top - 24);
      context.quadraticCurveTo(centerX + 12, top - 32, centerX + 9, top - 38);
      context.stroke();
    } else {
      context.fillStyle = color;
      context.font = `bold ${type === "energy" ? 23 : 21}px system-ui, sans-serif`;
      context.textAlign = "center";
      context.fillText(MODULE_SYMBOLS[type], centerX, top - 14);
    }

    const label = context.measureText(MODULE_LABELS[type].toUpperCase()).width;
    const labelWidth = Math.min(tileWidth - 2, label + 12);
    context.fillStyle = "rgba(8, 13, 25, 0.84)";
    context.beginPath();
    context.roundRect(centerX - labelWidth / 2, top + 8, labelWidth, 12, 5);
    context.fill();
    context.fillStyle = "#e0e8f7";
    context.font = "600 7px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(MODULE_LABELS[type].toUpperCase(), centerX, top + 17);
  }

  private drawAstronaut(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    suitColor: string,
    helmet: "visor" | "classic" | "pilot",
    manager: GameManager,
  ): void {
    const stride = manager.isAirborne ? 0 : Math.sin(manager.elapsedSeconds * 13) * 3;
    const shadowScale = manager.isAirborne ? 0.76 : 1;
    context.globalAlpha = 0.34 * shadowScale;
    context.fillStyle = "#030710";
    context.beginPath();
    context.ellipse(x, y + 34 + (manager.isAirborne ? 17 : 0), 20 * shadowScale, 5, 0, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;

    const pulse = manager.shieldActive ? 5 + Math.sin(manager.elapsedSeconds * 8) * 2 : 0;
    if (manager.shieldActive) {
      context.strokeStyle = "rgba(120, 170, 255, 0.72)";
      context.globalAlpha = 0.65;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(x, y - 10, 26 + pulse, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 0.13;
      context.fillStyle = "#78aaff";
      context.fill();
      context.globalAlpha = 1;
    }

    const suit = context.createLinearGradient(x - 12, y, x + 13, y + 23);
    suit.addColorStop(0, suitColor);
    suit.addColorStop(1, "#8291a8");
    context.fillStyle = suit;
    context.beginPath();
    context.roundRect(x - 12, y - 3, 24, 26, 8);
    context.fill();
    context.fillStyle = "rgba(240, 247, 255, 0.28)";
    context.beginPath();
    context.roundRect(x - 8, y + 2, 4, 15, 2);
    context.fill();

    const pack = context.createLinearGradient(x - 19, y, x - 12, y);
    pack.addColorStop(0, "#556782");
    pack.addColorStop(1, "#26384f");
    context.fillStyle = pack;
    context.beginPath();
    context.roundRect(x - 19, y + 1, 7, 17, 3);
    context.fill();
    context.fillStyle = "#ffb879";
    context.fillRect(x - 20, y + 15, 2, 4);

    context.fillStyle = "#e5edf9";
    context.beginPath();
    context.arc(x, y - 14, 12, 0, Math.PI * 2);
    context.fill();
    const visor = context.createLinearGradient(x - 7, y - 19, x + 6, y - 8);
    visor.addColorStop(0, "#8fe3e1");
    visor.addColorStop(0.38, "#548ab1");
    visor.addColorStop(1, "#223955");
    context.fillStyle = visor;
    context.beginPath();
    const visorWidth = helmet === "classic" ? 6.5 : helmet === "pilot" ? 8 : 9;
    context.ellipse(x, y - 14, visorWidth, helmet === "classic" ? 5.5 : 7, -0.16, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.78)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x - 4, y - 18);
    context.lineTo(x + 1, y - 20);
    context.stroke();
    if (helmet === "pilot") {
      context.fillStyle = "#ffd66e";
      context.fillRect(x + 5, y - 23, 7, 2);
    }

    context.strokeStyle = "#d8e1ef";
    context.lineWidth = 5;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x - 9, y + 21);
    context.lineTo(x - 11 + stride, y + 28);
    context.moveTo(x + 8, y + 21);
    context.lineTo(x + 10 - stride, y + 28);
    context.stroke();
    context.strokeStyle = "#e9eff8";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x + 10, y + 1);
    context.lineTo(x + 15, y + 8 + stride * 0.4);
    context.moveTo(x - 10, y + 2);
    context.lineTo(x - 14, y + 8 - stride * 0.4);
    context.stroke();
    context.lineCap = "butt";
  }

  private drawDistanceMarkers(width: number, distance: number): void {
    const context = this.context;
    context.fillStyle = "#9aa9c1";
    context.font = "600 9px system-ui, sans-serif";
    context.textAlign = "left";
    context.fillText("SETOR  " + String(Math.floor(distance / 10) + 1).padStart(2, "0"), 20, 24);
    context.textAlign = "right";
    context.fillStyle = "rgba(154, 169, 193, 0.8)";
    context.fillText("TRILHO DE EVACUAÇÃO  /  E-07", width - 20, 24);
  }
}
