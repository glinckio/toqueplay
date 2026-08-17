import { parseDate, toUtcIso } from './date';

describe('utils/date', () => {
  describe('parseDate', () => {
    it('parses ISO with offset', () => {
      const d = parseDate('2026-06-16T14:00:00-03:00');
      expect(d).toBeInstanceOf(Date);
      expect(d!.toISOString()).toBe('2026-06-16T17:00:00.000Z');
    });

    it('parses date-only as local midnight', () => {
      const d = parseDate('2026-06-16');
      expect(d).toBeInstanceOf(Date);
      // Should not be NaN
      expect(Number.isNaN(d!.getTime())).toBe(false);
    });

    it('passes Date through if valid', () => {
      const original = new Date('2026-01-01T00:00:00Z');
      expect(parseDate(original)).toBe(original);
    });

    it('rejects invalid Date by throwing', () => {
      expect(() => parseDate(new Date('not a date'))).toThrow('Data inválida');
    });

    it('returns null for null/undefined/empty', () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
      expect(parseDate('')).toBeNull();
    });

    it('throws on garbage', () => {
      expect(() => parseDate('not a date')).toThrow('Data inválida');
    });

    it('throws on non-string non-Date input', () => {
      expect(() => parseDate(42 as any)).toThrow('Data inválida');
      expect(() => parseDate({} as any)).toThrow('Data inválida');
    });
  });

  describe('toUtcIso', () => {
    it('returns ISO string in UTC', () => {
      expect(toUtcIso('2026-06-16T14:00:00-03:00')).toBe('2026-06-16T17:00:00.000Z');
    });

    it('returns null for null input', () => {
      expect(toUtcIso(null)).toBeNull();
    });

    it('returns null for empty', () => {
      expect(toUtcIso('')).toBeNull();
    });
  });
});
