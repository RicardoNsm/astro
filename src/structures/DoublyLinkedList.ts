export class DoublyLinkedNode<T> {
  public next: DoublyLinkedNode<T> | null = null;
  public previous: DoublyLinkedNode<T> | null = null;

  public constructor(public value: T) {}
}

/** A manually linked sequence with bidirectional traversal and removal. */
export class DoublyLinkedList<T> {
  public head: DoublyLinkedNode<T> | null = null;
  public tail: DoublyLinkedNode<T> | null = null;
  private count = 0;

  public get size(): number {
    return this.count;
  }

  public append(value: T): DoublyLinkedNode<T> {
    const node = new DoublyLinkedNode(value);
    if (this.tail === null) {
      this.head = node;
      this.tail = node;
    } else {
      node.previous = this.tail;
      this.tail.next = node;
      this.tail = node;
    }
    this.count += 1;
    return node;
  }

  public prepend(value: T): DoublyLinkedNode<T> {
    const node = new DoublyLinkedNode(value);
    if (this.head === null) {
      this.head = node;
      this.tail = node;
    } else {
      node.next = this.head;
      this.head.previous = node;
      this.head = node;
    }
    this.count += 1;
    return node;
  }

  /** Reconnects both neighboring nodes before releasing the removed node. */
  public remove(node: DoublyLinkedNode<T>): T {
    if (node.previous === null) {
      this.head = node.next;
    } else {
      node.previous.next = node.next;
    }

    if (node.next === null) {
      this.tail = node.previous;
    } else {
      node.next.previous = node.previous;
    }

    node.next = null;
    node.previous = null;
    this.count -= 1;
    return node.value;
  }

  public find(predicate: (value: T) => boolean): DoublyLinkedNode<T> | null {
    let current = this.head;
    while (current !== null) {
      if (predicate(current.value)) {
        return current;
      }
      current = current.next;
    }
    return null;
  }

  public forEach(visitor: (value: T, node: DoublyLinkedNode<T>) => void): void {
    let current = this.head;
    while (current !== null) {
      const next = current.next;
      visitor(current.value, current);
      current = next;
    }
  }

  public forEachReverse(visitor: (value: T, node: DoublyLinkedNode<T>) => void): void {
    let current = this.tail;
    while (current !== null) {
      const previous = current.previous;
      visitor(current.value, current);
      current = previous;
    }
  }
}
