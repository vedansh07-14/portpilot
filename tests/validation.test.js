import { describe, it, expect } from 'vitest';
import { validatePort, validatePid, validateSearchQuery } from '../src/utils/validation.js';

describe('Validation Utilities', () => {
  describe('validatePort', () => {
    it('accepts valid integer ports', () => {
      expect(validatePort(1)).toBe(1);
      expect(validatePort(80)).toBe(80);
      expect(validatePort(3000)).toBe(3000);
      expect(validatePort('5173')).toBe(5173);
      expect(validatePort(65535)).toBe(65535);
    });

    it('rejects ports below 1', () => {
      expect(() => validatePort(0)).toThrow(/Invalid port/);
      expect(() => validatePort(-10)).toThrow(/Invalid port/);
    });

    it('rejects ports above 65535', () => {
      expect(() => validatePort(65536)).toThrow(/Invalid port/);
      expect(() => validatePort(100000)).toThrow(/Invalid port/);
    });

    it('rejects non-integer and non-numeric inputs', () => {
      expect(() => validatePort(3000.5)).toThrow(/Invalid port/);
      expect(() => validatePort('invalid')).toThrow(/Invalid port/);
      expect(() => validatePort('')).toThrow(/Invalid port/);
      expect(() => validatePort(NaN)).toThrow(/Invalid port/);
      expect(() => validatePort(null)).toThrow(/Invalid port/);
    });
  });

  describe('validatePid', () => {
    it('accepts valid positive integer PIDs', () => {
      expect(validatePid(100)).toBe(100);
      expect(validatePid('18452')).toBe(18452);
    });

    it('rejects non-positive PIDs', () => {
      expect(() => validatePid(0)).toThrow(/Invalid PID/);
      expect(() => validatePid(-5)).toThrow(/Invalid PID/);
    });

    it('rejects non-numeric PIDs', () => {
      expect(() => validatePid('abc')).toThrow(/Invalid PID/);
      expect(() => validatePid(NaN)).toThrow(/Invalid PID/);
    });
  });

  describe('validateSearchQuery', () => {
    it('trims and returns valid query strings', () => {
      expect(validateSearchQuery('node')).toBe('node');
      expect(validateSearchQuery('  postgres  ')).toBe('postgres');
    });

    it('rejects empty or whitespace-only queries', () => {
      expect(() => validateSearchQuery('')).toThrow(/non-empty string/);
      expect(() => validateSearchQuery('   ')).toThrow(/non-empty string/);
      expect(() => validateSearchQuery(123)).toThrow(/non-empty string/);
    });
  });
});
