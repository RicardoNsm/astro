export class SinglyLinkedNode<T> {
  public next: SinglyLinkedNode<T> | null = null;

  public constructor(public value: T) {}
}

/** Append-only list used to preserve every block in the astronaut's route. */
export class SinglyLinkedList<T> {
  public head: SinglyLinkedNode<T> | null = null;
  public tail: SinglyLinkedNode<T> | null = null;
  private count = 0;

  public get size(): number {
    return this.count;
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
    return node;
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
