import type { HelmetType } from "../models/Astronaut";

export interface RankingEntry {
  readonly name: string;
  readonly distance: number;
  readonly bestTimeSeconds: number;
  readonly suitColor: string;
  readonly helmet: HelmetType;
}

class RankingNode {
  public next: RankingNode | null = null;

  public constructor(public value: RankingEntry) {}
}

/** A manually sorted singly linked list of each astronaut's personal record. */
export class RankingList {
  private head: RankingNode | null = null;
  private count = 0;

  public get size(): number {
    return this.count;
  }

  /** Updates a player's personal records or inserts a new player by distance. */
  public insertSorted(entry: RankingEntry): void {
    let existing = this.head;
    const normalizedName = entry.name.trim().toLocaleLowerCase();
    while (
      existing !== null &&
      existing.value.name.trim().toLocaleLowerCase() !== normalizedName
    ) {
      existing = existing.next;
    }

    if (existing !== null) {
      const previous = this.findPrevious(existing);
      if (previous === null) {
        this.head = existing.next;
      } else {
        previous.next = existing.next;
      }
      const establishesDistanceRecord =
        entry.distance > existing.value.distance ||
        (entry.distance === existing.value.distance &&
          entry.bestTimeSeconds > existing.value.bestTimeSeconds);
      existing.value = {
        ...entry,
        distance: Math.max(existing.value.distance, entry.distance),
        bestTimeSeconds: Math.max(existing.value.bestTimeSeconds, entry.bestTimeSeconds),
        suitColor: establishesDistanceRecord ? entry.suitColor : existing.value.suitColor,
        helmet: establishesDistanceRecord ? entry.helmet : existing.value.helmet,
      };
      existing.next = null;
      this.insertNodeSorted(existing);
      return;
    }

    const node = new RankingNode(entry);
    this.insertNodeSorted(node);
    this.count += 1;
  }

  public forEach(visitor: (entry: RankingEntry, rank: number) => void): void {
    let current = this.head;
    let rank = 1;
    while (current !== null) {
      visitor(current.value, rank);
      current = current.next;
      rank += 1;
    }
  }

  public serialize(): string {
    let serialized = "astro-runner-ranking-v1\n";
    this.forEach((entry) => {
      serialized +=
        encodeURIComponent(entry.name) +
        "\t" +
        String(entry.distance) +
        "\t" +
        String(entry.bestTimeSeconds) +
        "\t" +
        encodeURIComponent(entry.suitColor) +
        "\t" +
        entry.helmet +
        "\n";
    });
    return serialized;
  }

  /** Loads persisted rows directly into linked nodes without retaining a native collection. */
  public loadSerialized(serialized: string): void {
    const header = "astro-runner-ranking-v1\n";
    if (!serialized.startsWith(header)) {
      throw new Error("Formato de ranking salvo não reconhecido.");
    }

    let cursor = header.length;
    while (cursor < serialized.length) {
      const lineEnd = serialized.indexOf("\n", cursor);
      const end = lineEnd < 0 ? serialized.length : lineEnd;
      const line = serialized.substring(cursor, end);
      cursor = end + 1;
      if (line.length === 0) {
        continue;
      }

      const nameEnd = line.indexOf("\t");
      const distanceEnd = line.indexOf("\t", nameEnd + 1);
      const timeEnd = line.indexOf("\t", distanceEnd + 1);
      const colorEnd = line.indexOf("\t", timeEnd + 1);
      if (nameEnd < 0 || distanceEnd < 0 || timeEnd < 0 || colorEnd < 0) {
        throw new Error("Uma linha do ranking salvo está incompleta.");
      }

      const name = decodeURIComponent(line.substring(0, nameEnd));
      const distanceText = line.substring(nameEnd + 1, distanceEnd);
      const timeText = line.substring(distanceEnd + 1, timeEnd);
      const suitColor = decodeURIComponent(line.substring(timeEnd + 1, colorEnd));
      const helmet = line.substring(colorEnd + 1);
      const distance = Number(distanceText);
      const bestTimeSeconds = Number(timeText);
      if (
        name.trim().length === 0 ||
        !Number.isSafeInteger(distance) ||
        distance < 0 ||
        !Number.isSafeInteger(bestTimeSeconds) ||
        bestTimeSeconds < 0 ||
        !/^#[0-9a-fA-F]{6}$/.test(suitColor) ||
        (helmet !== "visor" && helmet !== "classic" && helmet !== "pilot")
      ) {
        throw new Error("O ranking salvo contém dados inválidos.");
      }
      this.insertSorted({ name, distance, bestTimeSeconds, suitColor, helmet });
    }
  }

  private findPrevious(node: RankingNode): RankingNode | null {
    let current = this.head;
    let previous: RankingNode | null = null;
    while (current !== null && current !== node) {
      previous = current;
      current = current.next;
    }
    return previous;
  }

  private insertNodeSorted(node: RankingNode): void {
    if (
      this.head === null ||
      node.value.distance > this.head.value.distance ||
      (node.value.distance === this.head.value.distance &&
        node.value.bestTimeSeconds > this.head.value.bestTimeSeconds)
    ) {
      node.next = this.head;
      this.head = node;
      return;
    }

    let current = this.head;
    while (
      current.next !== null &&
      (current.next.value.distance > node.value.distance ||
        (current.next.value.distance === node.value.distance &&
          current.next.value.bestTimeSeconds >= node.value.bestTimeSeconds))
    ) {
      current = current.next;
    }
    node.next = current.next;
    current.next = node;
  }
}
