import type { IExampleIds } from '../types';

/**
 * In-memory ledger of example IDs created through an SDK instance or scope.
 * Mutations are local only and never hit the mock server.
 */
export class ExampleIdStore implements IExampleIds {
  private readonly ids = new Set<string>();

  get size(): number {
    return this.ids.size;
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  add(id: string): this {
    this.ids.add(id);
    return this;
  }

  remove(id: string): boolean {
    return this.ids.delete(id);
  }

  reset(): void {
    this.ids.clear();
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this.ids[Symbol.iterator]();
  }
}
