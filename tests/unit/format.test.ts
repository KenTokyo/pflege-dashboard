import { describe, expect, it } from 'vitest';
import { ageFrom, baseName, daysUntil, greeting, initials, relativeDays } from '../../src/lib/format';

describe('Formatierung (Europe/Berlin)', () => {
  it.each([
    ['2026-10-06T05:30:00Z', 'Guten Morgen'], // 07:30 Berlin
    ['2026-10-06T11:02:00Z', 'Guten Tag'], // 13:02 Berlin
    ['2026-10-06T17:30:00Z', 'Guten Abend'], // 19:30 Berlin
    ['2026-10-05T22:30:00Z', 'Guten Morgen'], // 00:30 Berlin
  ])('Begrüßung %s → %s', (iso, expected) => {
    expect(greeting(new Date(iso))).toBe(expected);
  });

  it('Kalendertage bis zur Frist zählen nach Berliner Datum', () => {
    const now = new Date('2026-10-06T21:30:00Z'); // schon 23:30 in Berlin
    expect(daysUntil('2026-10-13T10:00:00Z', now)).toBe(7);
    expect(relativeDays(7)).toBe('noch 7 Tage');
    expect(relativeDays(1)).toBe('morgen');
    expect(relativeDays(-2)).toBe('seit 2 Tagen überfällig');
  });

  it('Alter und Anzeigename aus dem Seed', () => {
    expect(ageFrom('1949-04-18', new Date('2026-10-06T10:00:00Z'))).toBe(77);
    expect(baseName('Martha Beispielwald · fiktiv')).toBe('Martha Beispielwald');
    expect(initials('Martha Beispielwald · fiktiv')).toBe('MB');
    expect(initials('Testnutzerin (synthetisch)')).toBe('T');
    expect(initials('  ')).toBe('?');
  });
});
