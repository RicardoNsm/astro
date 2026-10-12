export interface RankingEntry {
  readonly name: string;
  readonly distance: number;
  readonly durationSeconds: number;
}

class RankingNode {
  public next: RankingNode | null = null;

  public constructor(public value: RankingEntry) {}
}

/** A descending, manually sorted singly linked list of mission results. */
export class RankingList {
  private head: RankingNode | null = null;
  private count = 0;

  public get size(): number {
    return this.count;
  }

  /** Inserts before the first shorter run; equal distances favor faster runs. */
  public insertSorted(entry: RankingEntry): void {
    const node = new RankingNode(entry);
    if (
      this.head === null ||
      entry.distance > this.head.value.distance ||
      (entry.distance === this.head.value.distance &&
        entry.durationSeconds < this.head.value.durationSeconds)
    ) {
      node.next = this.head;
      this.head = node;
      this.count += 1;
      return;
    }

    let current = this.head;
    while (
      current.next !== null &&
      (current.next.value.distance > entry.distance ||
        (current.next.value.distance === entry.distance &&
          current.next.value.durationSeconds <= entry.durationSeconds))
    ) {
      current = current.next;
    }
    node.next = current.next;
    current.next = node;
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
}
