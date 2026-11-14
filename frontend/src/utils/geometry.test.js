import { edgeMatchesList, getFloorSequence } from './geometry';

describe('geometry utilities', () => {
  describe('edgeMatchesList', () => {
    const edgeList = [
      ['A', 'B'],
      ['C', 'D'],
    ];

    test('matches forward and reverse edge tuples', () => {
      expect(edgeMatchesList(edgeList, 'A', 'B')).toBe(true);
      expect(edgeMatchesList(edgeList, 'B', 'A')).toBe(true);
      expect(edgeMatchesList(edgeList, 'C', 'D')).toBe(true);
      expect(edgeMatchesList(edgeList, 'D', 'C')).toBe(true);
    });

    test('returns false for non-existent edges', () => {
      expect(edgeMatchesList(edgeList, 'A', 'C')).toBe(false);
      expect(edgeMatchesList(edgeList, 'X', 'Y')).toBe(false);
    });

    test('handles empty or null edgeList safely', () => {
      expect(edgeMatchesList(null, 'A', 'B')).toBe(false);
      expect(edgeMatchesList([], 'A', 'B')).toBe(false);
    });
  });

  describe('getFloorSequence', () => {
    const nodes = [
      { id: 'N1', floor: 'Floor 2' },
      { id: 'N2', floor: 'Floor 2' },
      { id: 'N3', floor: 'Floor 1' },
      { id: 'N4', floor: 'Ground' },
    ];

    test('extracts deduplicated sequence in order', () => {
      const path = ['N1', 'N2', 'N3', 'N4'];
      expect(getFloorSequence(nodes, path)).toEqual(['Floor 2', 'Floor 1', 'Ground']);
    });

    test('handles empty or invalid paths', () => {
      expect(getFloorSequence(nodes, [])).toEqual([]);
      expect(getFloorSequence(nodes, null)).toEqual([]);
    });
  });
});
