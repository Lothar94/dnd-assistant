import { describe, expect, it } from 'vitest';
import { reciprocalRankFusion } from '../src/index.js';

describe('reciprocalRankFusion', () => {
  it('ranks ids present in several lists first', () => {
    expect(
      reciprocalRankFusion([
        ['a', 'b'],
        ['c', 'a'],
      ])[0],
    ).toBe('a');
  });

  it('returns an empty ranking for no input', () => {
    expect(reciprocalRankFusion([])).toEqual([]);
  });

  it('keeps every id exactly once', () => {
    expect(
      reciprocalRankFusion([
        ['a', 'b'],
        ['b', 'a'],
      ]).sort(),
    ).toEqual(['a', 'b']);
  });
});
