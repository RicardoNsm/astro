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
const endMissionButton = requireElement<HTMLButtonElement>("#end-mission-button");
const resultsOverlay = requireElement<HTMLElement>("#results-overlay");
const routeReview = requireElement<HTMLElement>("#route-review");
const routeStrip = requireElement<HTMLOListElement>("#route-strip");
const historyPanel = requireElement<HTMLElement>("#history-panel");
const rankingPanel = requireElement<HTMLElement>("#ranking-panel");
const historyTab = requireElement<HTMLButtonElement>("#history-tab");
const rankingTab = requireElement<HTMLButtonElement>("#ranking-tab");
const renderer = new GameRenderer(canvas);
let ranking = new RankingList();

let currentGame: GameManager | null = null;
let toastTimeout = 0;
let lastRenderedHistoryRevision = -1;
let completeHistoryRendered = false;

const RANKING_STORAGE_KEY = "astro-runner-ranking-v1";
const MODULE_SYMBOLS: Record<BlockRecord["moduleType"], string> = {
  clear: "·",
  explosive: "✹",
  energy: "ϟ",
  shield: "⬡",
  blackHole: "◉",
  turbo: "➤",
  gap: "▽",
};

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

const persistRanking = (): void => {
  try {
    window.localStorage.setItem(RANKING_STORAGE_KEY, ranking.serialize());
  } catch (error) {
    console.error("Não foi possível salvar o ranking neste navegador.", error);
    showToast("Não foi possível salvar o ranking neste navegador");
  }
};

const restoreRanking = (): void => {
  try {
    const serialized = window.localStorage.getItem(RANKING_STORAGE_KEY);
    if (serialized !== null) {
      const restored = new RankingList();
      restored.loadSerialized(serialized);
      ranking = restored;
    }
  } catch (error) {
    console.error("Não foi possível restaurar o ranking salvo.", error);
    showToast("O ranking salvo não pôde ser restaurado");
  }
};

const renderHistory = (game: GameManager, showAll: boolean): void => {
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
  const firstVisibleIndex = showAll ? 0 : Math.max(0, game.history.size - 12);
  game.history.forEach((record: BlockRecord, index) => {
    if (index < firstVisibleIndex) {
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
  });
  historyPanel.append(list);
};

const renderRoute = (game: GameManager): void => {
  routeStrip.replaceChildren();
  game.history.forEach((record) => {
    const tile = document.createElement("li");
    tile.className = `route-tile route-${record.moduleType}`;
    tile.title = `Bloco ${record.block}: ${MODULE_LABELS[record.moduleType]} — ${record.outcome}`;
    tile.setAttribute("aria-label", tile.title);
    const icon = document.createElement("span");
    icon.className = "route-icon";
    icon.textContent = MODULE_SYMBOLS[record.moduleType];
    const number = document.createElement("span");
    number.className = "route-number";
    number.textContent = String(record.block);
    tile.append(icon, number);
    routeStrip.append(tile);
  });
  requireElement<HTMLElement>("#route-count").textContent = `${game.history.size} blocos`;
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
    const item = document.createElement("li");
    item.className = "record-item";
    const position = document.createElement("span");
    position.className = "rank-position";
    position.textContent = `#${rankPosition.toString().padStart(2, "0")}`;
    const avatar = document.createElement("span");
    avatar.className = "rank-avatar";
    avatar.style.setProperty("--avatar-color", entry.suitColor);
    avatar.textContent = entry.helmet === "pilot" ? "◉" : entry.helmet === "classic" ? "◍" : "◎";
    avatar.title = `Traje ${entry.suitColor}, capacete ${entry.helmet}`;
    const name = document.createElement("span");
    name.className = "rank-name";
    name.textContent = entry.name;
    const records = document.createElement("span");
    records.className = "rank-records";
    const distance = document.createElement("strong");
    distance.textContent = `${entry.distance} módulos`;
    const time = document.createElement("small");
    time.textContent = `Melhor tempo ${formatTime(entry.bestTimeSeconds)}`;
    records.append(distance, time);
    item.append(position, avatar, name, records);
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
  endMissionButton.hidden = game.state !== "running";
  if (
    lastRenderedHistoryRevision !== game.history.revision ||
    (game.state === "over" && !completeHistoryRendered)
  ) {
    const showAll = game.state === "over";
    renderHistory(game, showAll);
    lastRenderedHistoryRevision = game.history.revision;
    completeHistoryRendered = showAll;
  }
};

const renderEndOfMission = (summary: MissionSummary): void => {
  renderStats();
  showToast(summary.cause);
  missionStatus.textContent = "MISSÃO ENCERRADA";
  canvasHint.classList.add("hidden");
  endMissionButton.hidden = true;
  persistRanking();
  renderRanking();
  requireElement<HTMLElement>("#results-cause").textContent = summary.cause;
  requireElement<HTMLElement>("#results-distance").textContent = `${summary.distance} blocos`;
  requireElement<HTMLElement>("#results-time").textContent = formatTime(summary.durationSeconds);
  requireElement<HTMLElement>("#results-modules-avoided").textContent = String(summary.modulesAvoided);
  requireElement<HTMLElement>("#results-avoided").textContent = String(summary.explosivesAvoided);
  requireElement<HTMLElement>("#results-exploded").textContent = String(summary.explosivesDetonated);
  requireElement<HTMLElement>("#results-absorbed").textContent = String(summary.explosionsAbsorbed);
  requireElement<HTMLElement>("#results-energy-modules").textContent = String(summary.energyModulesCollected);
  requireElement<HTMLElement>("#results-shields").textContent = String(summary.shieldsUsed);
  requireElement<HTMLElement>("#results-super-jumps").textContent = String(summary.superJumps);
  requireElement<HTMLElement>("#results-ultra-jumps").textContent = String(summary.ultraJumps);
  requireElement<HTMLElement>("#results-near-deaths").textContent = String(summary.nearDeaths);
  requireElement<HTMLElement>("#results-energy").textContent = `${Math.round(summary.energyCollected)}%`;
  const game = currentGame;
  if (game === null) {
    throw new Error("A missão terminou sem um astronauta ativo.");
  }
  renderRoute(game);
  routeReview.hidden = true;
  requireElement<HTMLButtonElement>("#results-route-button").hidden = false;
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
  routeReview.hidden = true;
  lastRenderedHistoryRevision = -1;
  completeHistoryRendered = false;
  endMissionButton.hidden = false;
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
endMissionButton.addEventListener("click", () => currentGame?.finish("Missão encerrada pelo astronauta."));
window.setInterval(renderStats, 100);

historyTab.addEventListener("click", () => {
  historyTab.classList.add("active");
  rankingTab.classList.remove("active");
  historyTab.setAttribute("aria-selected", "true");
  rankingTab.setAttribute("aria-selected", "false");
  historyPanel.hidden = false;
  rankingPanel.hidden = true;
  requireElement<HTMLElement>("#ranking-column-labels").hidden = true;
});

rankingTab.addEventListener("click", () => {
  rankingTab.classList.add("active");
  historyTab.classList.remove("active");
  rankingTab.setAttribute("aria-selected", "true");
  historyTab.setAttribute("aria-selected", "false");
  historyPanel.hidden = true;
  rankingPanel.hidden = false;
  requireElement<HTMLElement>("#ranking-column-labels").hidden = false;
});

requireElement<HTMLButtonElement>("#results-history-button").addEventListener("click", () => {
  historyTab.click();
  historyPanel.scrollIntoView({ behavior: "smooth", block: "center" });
});

requireElement<HTMLButtonElement>("#results-route-button").addEventListener("click", () => {
  routeReview.hidden = false;
  requireElement<HTMLButtonElement>("#results-route-button").hidden = true;
});

restoreRanking();
renderRanking();
