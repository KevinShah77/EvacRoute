import { formatDuration, formatDistance } from './formatters';

describe('formatters', () => {
  describe('formatDuration', () => {
    test('formats zero seconds', () => {
      expect(formatDuration(0)).toBe('0 sec');
    });

    test('formats seconds only when under 60', () => {
      expect(formatDuration(45)).toBe('45 sec');
    });

    test('formats exact minutes', () => {
      expect(formatDuration(60)).toBe('1 min');
      expect(formatDuration(120)).toBe('2 min');
    });

    test('formats minutes and seconds combined', () => {
      expect(formatDuration(75)).toBe('1 min 15 sec');
      expect(formatDuration(150)).toBe('2 min 30 sec');
    });

    test('handles negative, null, and undefined values safely', () => {
      expect(formatDuration(-10)).toBe('0 sec');
      expect(formatDuration(null)).toBe('0 sec');
      expect(formatDuration(undefined)).toBe('0 sec');
    });
  });

  describe('formatDistance', () => {
    test('formats meters with m suffix', () => {
      expect(formatDistance(50)).toBe('50m');
      expect(formatDistance(49.6)).toBe('50m');
    });

    test('handles null/undefined gracefully', () => {
      expect(formatDistance(null)).toBe('0m');
      expect(formatDistance(undefined)).toBe('0m');
    });
  });
});
