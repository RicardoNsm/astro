export class SinglyLinkedNode<T> {
  public next: SinglyLinkedNode<T> | null = null;

  public constructor(public value: T) {}
}

/** Linked route history that preserves the order blocks were traversed. */
export class SinglyLinkedList<T> {
  public head: SinglyLinkedNode<T> | null = null;
  public tail: SinglyLinkedNode<T> | null = null;
  private count = 0;
  private changes = 0;

  public get size(): number {
    return this.count;
  }

  public get revision(): number {
    return this.changes;
  }

  public append(value: T): SinglyLinkedNode<T> {
    const node = new SinglyLinkedNode(value);
    if (this.tail === null) {
      this.head = node;
    } else {
      this.tail.next = node;
    }
    this.tail = node;
    this.count += 1;
    this.changes += 1;
    return node;
  }

  /** Replaces the newest route record without adding a duplicate block. */
  public replaceLast(value: T): boolean {
    if (this.tail === null) {
      return false;
    }
    this.tail.value = value;
    this.changes += 1;
    return true;
  }

  public forEach(visitor: (value: T, index: number) => void): void {
    let current = this.head;
    let index = 0;
    while (current !== null) {
      visitor(current.value, index);
      current = current.next;
      index += 1;
    }
  }
}
