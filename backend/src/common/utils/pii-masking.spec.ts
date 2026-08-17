import {
  maskEmail,
  maskCpf,
  maskPhone,
  maskName,
  toCsv,
} from './pii-masking';

describe('pii-masking', () => {
  describe('maskEmail', () => {
    it('masks the user part keeping domain', () => {
      expect(maskEmail('gabriel@toqueplay.com')).toBe('ga***@toqueplay.com');
    });
    it('returns dash for empty/null', () => {
      expect(maskEmail('')).toBe('—');
      expect(maskEmail(null)).toBe('—');
      expect(maskEmail(undefined)).toBe('—');
    });
    it('returns dash for invalid shape', () => {
      expect(maskEmail('noat')).toBe('—');
    });
  });

  describe('maskCpf', () => {
    it('masks CPF keeping middle and verification digits partially', () => {
      expect(maskCpf('12345678901')).toBe('***.456.789-**');
    });
    it('returns dash for wrong length', () => {
      expect(maskCpf('123')).toBe('—');
      expect(maskCpf(null)).toBe('—');
    });
    it('strips non-digits', () => {
      expect(maskCpf('123.456.789-01')).toBe('***.456.789-**');
    });
  });

  describe('maskPhone', () => {
    it('keeps last 4 digits', () => {
      expect(maskPhone('(11) 98765-4321')).toBe('(***) ***-4321');
    });
    it('returns dash for too short', () => {
      expect(maskPhone('123')).toBe('—');
    });
  });

  describe('maskName', () => {
    it('shows first name plus last initial', () => {
      expect(maskName('Gabriel Linck')).toBe('Gabriel L.');
      expect(maskName('Ana Maria Braga Silva')).toBe('Ana S.');
    });
    it('handles single name', () => {
      expect(maskName('Admin')).toBe('Admin');
    });
    it('returns dash for null', () => {
      expect(maskName(null)).toBe('—');
    });
  });

  describe('toCsv', () => {
    it('escapes commas, quotes and newlines per RFC 4180', () => {
      const csv = toCsv(
        [{ a: 'simple', b: 'has,comma', c: 'has\nnewline', d: 'has "quote"' }],
        [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
          { key: 'c', label: 'C' },
          { key: 'd', label: 'D' },
        ],
      );
      expect(csv).toBe(
        'A,B,C,D\n' +
          'simple,"has,comma","has\nnewline","has ""quote"""',
      );
    });
    it('renders header even on empty rows', () => {
      const csv = toCsv([], [{ key: 'x', label: 'X' }]);
      expect(csv).toBe('X\n');
    });
    it('handles null/undefined as empty cell', () => {
      const csv = toCsv([{ x: null, y: undefined } as any], [
        { key: 'x', label: 'X' },
        { key: 'y', label: 'Y' },
      ]);
      expect(csv).toBe('X,Y\n,');
    });
  });
});
