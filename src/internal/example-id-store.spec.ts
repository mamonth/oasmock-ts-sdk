/*
Scenario: Tracking example IDs in a local store
Given an empty example ID store
When IDs are added, removed, and reset
Then the store reflects the local changes without any network access
*/

import { describe, expect, it } from 'vitest';
import { ExampleIdStore } from './example-id-store';

describe('ExampleIdStore', () => {
  /*
  Scenario: Adding IDs to the store
  Given an empty store
  When add is called with IDs
  Then the store contains them and reports its size
  */
  it('should add IDs and report size', () => {
    const store = new ExampleIdStore().add('a').add('b');

    expect(store.size).toBe(2);
    expect(store.has('a')).toBe(true);
    expect(store.has('b')).toBe(true);
    expect([...store]).toEqual(['a', 'b']);
  });

  /*
  Scenario: Adding a duplicate ID
  Given a store that already contains an ID
  When the same ID is added again
  Then the store keeps a single entry
  */
  it('should keep duplicates out', () => {
    const store = new ExampleIdStore().add('a').add('a');

    expect(store.size).toBe(1);
    expect([...store]).toEqual(['a']);
  });

  /*
  Scenario: Removing an ID
  Given a store with one ID
  When remove is called
  Then it reports whether the ID was present
  */
  it('should remove IDs and report presence', () => {
    const store = new ExampleIdStore().add('a');

    expect(store.remove('a')).toBe(true);
    expect(store.remove('a')).toBe(false);
    expect(store.size).toBe(0);
  });

  /*
  Scenario: Resetting the store
  Given a store with several IDs
  When reset is called
  Then the store is empty
  */
  it('should reset all IDs', () => {
    const store = new ExampleIdStore().add('a').add('b');

    store.reset();

    expect(store.size).toBe(0);
    expect([...store]).toEqual([]);
  });

  /*
  Scenario: Iterating an empty store
  Given an empty store
  When it is iterated
  Then it yields no IDs
  */
  it('should iterate an empty store', () => {
    expect([...new ExampleIdStore()]).toEqual([]);
  });
});
