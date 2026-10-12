import { GameManager, type MissionSummary } from "./game/GameManager";
import { MODULE_LABELS, type BlockRecord } from "./models/Module";
import type { AstronautConfiguration } from "./models/Astronaut";
import { RankingList } from "./structures/RankingList";
import { GameRenderer } from "./ui/GameRenderer";
import "./styles.css";

const requireElement = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`Elemento obrigatório não encontrado: ${selector}`);
  }
  return element;
};

const canvas = requireElement<HTMLCanvasElement>("#game-canvas");
const setupForm = requireElement<HTMLFormElement>("#setup-form");
const nameInput = requireElement<HTMLInputElement>("#astronaut-name");
const colorInput = requireElement<HTMLInputElement>("#suit-color");
const helmetInput = requireElement<HTMLSelectElement>("#helmet-type");
const distanceValue = requireElement<HTMLElement>("#distance-value");
const timeValue = requireElement<HTMLElement>("#time-value");
const energyValue = requireElement<HTMLElement>("#energy-value");
const missionStatus = requireElement<HTMLElement>("#mission-status");
const canvasHint = requireElement<HTMLElement>("#canvas-hint");
const toast = requireElement<HTMLElement>("#game-toast");
const resultsOverlay = requireElement<HTMLElement>("#results-overlay");
const historyPanel = requireElement<HTMLElement>("#history-panel");
const rankingPanel = requireElement<HTMLElement>("#ranking-panel");
const historyTab = requireElement<HTMLButtonElement>("#history-tab");
const rankingTab = requireElement<HTMLButtonElement>("#ranking-tab");
const renderer = new GameRenderer(canvas);
const ranking = new RankingList();

let currentGame: GameManager | null = null;
let toastTimeout = 0;

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

const showToast = (message: string): void => {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 1700);
};

const renderHistory = (game: GameManager): void => {
  historyPanel.replaceChildren();
  if (game.history.size === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhum bloco foi percorrido.";
    historyPanel.append(empty);
    return;
  }

  const list = document.createElement("ol");
  list.className = "record-items";
  let rendered = 0;
  game.history.forEach((record: BlockRecord, index) => {
    if (index < game.history.size - 12) {
      return;
    }
    const item = document.createElement("li");
    item.className = "record-item";
    const block = document.createElement("span");
    block.className = "record-block";
    block.textContent = `BLOCO ${record.block.toString().padStart(3, "0")}`;
    const detail = document.createElement("span");
    detail.className = "record-detail";
    detail.textContent = `${MODULE_LABELS[record.moduleType]} · ${record.outcome}`;
    item.append(block, detail);
    list.append(item);
    rendered += 1;
  });
  if (rendered > 0) {
    historyPanel.append(list);
  }
};

const renderRanking = (): void => {
  rankingPanel.replaceChildren();
  if (ranking.size === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Complete uma missão para inaugurar o ranking.";
    rankingPanel.append(empty);
    return;
  }

  const list = document.createElement("ol");
  list.className = "record-items ranking-items";
  ranking.forEach((entry, rankPosition) => {
    if (rankPosition > 10) {
      return;
    }
    const item = document.createElement("li");
    item.className = "record-item";
    const position = document.createElement("span");
    position.className = "rank-position";
    position.textContent = `#${rankPosition.toString().padStart(2, "0")}`;
    const name = document.createElement("span");
    name.className = "rank-name";
    name.textContent = entry.name;
    const score = document.createElement("strong");
    score.className = "rank-score";
    score.textContent = `${entry.distance} blocos`;
    item.append(position, name, score);
    list.append(item);
  });
  rankingPanel.append(list);
};

const renderStats = (): void => {
  const game = currentGame;
  if (game === null) {
    return;
  }
  distanceValue.textContent = String(Math.floor(game.distance));
  timeValue.textContent = formatTime(Math.floor(game.elapsedSeconds));
  energyValue.textContent = String(Math.ceil(game.astronaut.energy));
  const energyFill = requireElement<HTMLElement>(".energy-stat");
  energyFill.classList.toggle("energy-low", game.astronaut.energy < 25);
  requireElement<HTMLElement>("#energy-bar").style.width = `${game.astronaut.energy}%`;
  missionStatus.textContent = game.state === "running" ? "MISSÃO EM ANDAMENTO" : "MISSÃO ENCERRADA";
  canvasHint.classList.toggle("hidden", game.state !== "running");
  renderHistory(game);
};

const renderEndOfMission = (summary: MissionSummary): void => {
  renderStats();
  showToast(summary.cause);
  missionStatus.textContent = "MISSÃO ENCERRADA";
  canvasHint.classList.add("hidden");
  renderRanking();
  requireElement<HTMLElement>("#results-cause").textContent = summary.cause;
  requireElement<HTMLElement>("#results-distance").textContent = `${summary.distance} blocos`;
  requireElement<HTMLElement>("#results-time").textContent = formatTime(summary.durationSeconds);
  requireElement<HTMLElement>("#results-avoided").textContent = String(summary.modulesAvoided);
  requireElement<HTMLElement>("#results-energy").textContent = `${Math.round(summary.energyCollected)}%`;
  resultsOverlay.hidden = false;
};

setupForm.addEventListener("submit", (event: SubmitEvent) => {
  event.preventDefault();
  const selectedDifficulty = setupForm.querySelector<HTMLInputElement>('input[name="difficulty"]:checked')?.value;
  if (selectedDifficulty !== "easy" && selectedDifficulty !== "medium" && selectedDifficulty !== "hard") {
    throw new Error("Selecione um nível de dificuldade válido.");
  }
  const helmet = helmetInput.value;
  if (helmet !== "visor" && helmet !== "classic" && helmet !== "pilot") {
    throw new Error("Selecione um tipo de capacete válido.");
  }

  const configuration: AstronautConfiguration = {
    name: nameInput.value.trim() || "Astronauta",
    suitColor: colorInput.value,
    helmet,
    difficulty: selectedDifficulty,
  };

  currentGame = new GameManager(configuration, ranking, renderEndOfMission, showToast);
  currentGame.start();
  renderer.setManager(currentGame);
  resultsOverlay.hidden = true;
  missionStatus.textContent = "MISSÃO EM ANDAMENTO";
  distanceValue.textContent = "0";
  timeValue.textContent = "00:00";
  energyValue.textContent = "100";
  historyPanel.replaceChildren();
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = "Seu trajeto aparecerá aqui após a missão.";
  historyPanel.append(empty);
  canvasHint.classList.remove("hidden");
  showToast(`Boa sorte, ${configuration.name}!`);
  renderer.showFrame();
  canvas.focus();
  requireElement<HTMLElement>(".energy-stat").classList.remove("energy-low");
});

const jumpOnKeyboard = (event: KeyboardEvent): void => {
  if (event.code !== "Space" && event.code !== "ArrowUp" && event.code !== "KeyW") {
    return;
  }
  event.preventDefault();
  if (!event.repeat) {
    currentGame?.jump();
  }
};

window.addEventListener("keydown", jumpOnKeyboard);
requireElement<HTMLButtonElement>("#jump-button").addEventListener("click", () => currentGame?.jump());
window.setInterval(renderStats, 100);

historyTab.addEventListener("click", () => {
  historyTab.classList.add("active");
  rankingTab.classList.remove("active");
  historyTab.setAttribute("aria-selected", "true");
  rankingTab.setAttribute("aria-selected", "false");
  historyPanel.hidden = false;
  rankingPanel.hidden = true;
});

rankingTab.addEventListener("click", () => {
  rankingTab.classList.add("active");
  historyTab.classList.remove("active");
  rankingTab.setAttribute("aria-selected", "true");
  historyTab.setAttribute("aria-selected", "false");
  historyPanel.hidden = true;
  rankingPanel.hidden = false;
});

requireElement<HTMLButtonElement>("#results-history-button").addEventListener("click", () => {
  historyTab.click();
  historyPanel.scrollIntoView({ behavior: "smooth", block: "center" });
});

renderRanking();
