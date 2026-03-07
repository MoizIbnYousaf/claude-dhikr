import { describe, it, expect } from 'bun:test';
import { getShuffled } from '../src/dhikr.js';

const EXPECTED_ADHKAR = [
  'SubhanAllah — Glory be to Allah',
  'Alhamdulillah — All praise is for Allah',
  'Allahu Akbar — Allah is the Greatest',
  'La ilaha illAllah — There is no god but Allah',
  'La hawla wa la quwwata illa billah — There is no power except with Allah',
  'Ask Allah for beneficial knowledge',
  'Rabbi zidni ilma — My Lord, increase me in knowledge',
];

describe('dhikr', () => {
  it('returns exactly 7 adhkar', () => {
    const result = getShuffled();
    expect(result).toHaveLength(7);
  });

  it('contains every expected dhikr', () => {
    const result = getShuffled();
    for (const dhikr of EXPECTED_ADHKAR) {
      expect(result).toContain(dhikr);
    }
  });

  it('contains no duplicates', () => {
    const result = getShuffled();
    const unique = new Set(result);
    expect(unique.size).toBe(7);
  });

  it('shuffles the order (run 20 times, at least one differs)', () => {
    const runs = Array.from({ length: 20 }, () => getShuffled().join('|'));
    const unique = new Set(runs);
    // With 7! = 5040 permutations, 20 identical runs is astronomically unlikely
    expect(unique.size).toBeGreaterThan(1);
  });

  it('never adds or removes items across many shuffles', () => {
    for (let i = 0; i < 50; i++) {
      const result = getShuffled();
      expect(result).toHaveLength(7);
      expect(result.sort()).toEqual(EXPECTED_ADHKAR.sort());
    }
  });
});
