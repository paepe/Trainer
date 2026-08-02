import { describe, it, expect } from 'vitest';
import { sortBySessionBlock } from './sessionStructure';

describe('sortBySessionBlock', () => {
  it('orders items by canonical block sequence, regardless of input order', () => {
    const input = [
      { id: 'a', phase: 'cooldown' },
      { id: 'b', phase: 'mobility' },
      { id: 'c', phase: 'strength' },
      { id: 'd', phase: 'warmup' },
    ];
    expect(sortBySessionBlock(input).map(i => i.id)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('keeps items within the same block in their original relative order (stable sort)', () => {
    const input = [
      { id: 'a', phase: 'strength' },
      { id: 'b', phase: 'warmup' },
      { id: 'c', phase: 'strength' },
      { id: 'd', phase: 'strength' },
    ];
    expect(sortBySessionBlock(input).map(i => i.id)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('sorts items with no/unrecognised phase after every named block, preserving their relative order', () => {
    const input = [
      { id: 'a', phase: null },
      { id: 'b', phase: 'strength' },
      { id: 'c', phase: 'not-a-real-block' },
      { id: 'd', phase: 'warmup' },
    ];
    expect(sortBySessionBlock(input).map(i => i.id)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('does not mutate the input array', () => {
    const input = [{ id: 'a', phase: 'cooldown' }, { id: 'b', phase: 'warmup' }];
    const originalOrder = input.map(i => i.id);
    sortBySessionBlock(input);
    expect(input.map(i => i.id)).toEqual(originalOrder);
  });

  it('returns an empty array for empty input', () => {
    expect(sortBySessionBlock([])).toEqual([]);
  });
});
