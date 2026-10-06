import { describe, expect, it } from 'vitest';
import { ageFrom, baseName, daysUntil, greeting, initials, listWhen, relativeDays, stampWhen } from '../../src/lib/format';

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

  it('Randfälle der Fristtage: Mitternacht in Berlin, Zeitumstellung, überfällig', () => {
    const morning = new Date('2026-10-06T08:00:00Z');
    // 00:30 Berlin am Folgetag ist „morgen“, obwohl in UTC noch derselbe Tag.
    expect(daysUntil('2026-10-06T22:30:00Z', morning)).toBe(1);
    // 23:30 Berlin desselben Tages ist „heute“.
    expect(daysUntil('2026-10-06T21:30:00Z', morning)).toBe(0);
    // Ende der Sommerzeit (25.10.2026): ein 25-Stunden-Tag zählt trotzdem als ein Tag.
    // 25.10. 00:30 (Sommerzeit) bis 26.10. 01:30 (Winterzeit) in Berlin.
    expect(daysUntil('2026-10-26T00:30:00Z', new Date('2026-10-24T22:30:00Z'))).toBe(1);
    expect(daysUntil('2026-10-25T23:30:00Z', new Date('2026-10-25T00:30:00Z'))).toBe(1);
    expect(relativeDays(0)).toBe('heute');
    expect(relativeDays(-1)).toBe('seit gestern überfällig');
  });

  it('Alter am Geburtstag und bei 29. Februar', () => {
    expect(ageFrom('1949-10-06', new Date('2026-10-06T10:00:00Z'))).toBe(77);
    expect(ageFrom('1949-10-07', new Date('2026-10-06T10:00:00Z'))).toBe(76);
    expect(ageFrom('1948-02-29', new Date('2026-02-28T10:00:00Z'))).toBe(77);
    expect(ageFrom('1948-02-29', new Date('2026-03-01T10:00:00Z'))).toBe(78);
    expect(ageFrom(null, new Date())).toBeNull();
    expect(ageFrom('kaputt', new Date())).toBeNull();
  });

  it('Listen- und Nachrichtenzeit: Vorjahr eindeutig, ältere Nachrichten mit Datum', () => {
    const now = new Date('2026-10-06T10:00:00Z');
    expect(listWhen('2026-10-06T06:15:00Z', now)).toBe('08:15');
    expect(listWhen('2026-10-05T06:15:00Z', now)).toBe('gestern');
    expect(listWhen('2026-09-30T06:15:00Z', now)).toBe('30.09.');
    expect(listWhen('2025-10-06T06:15:00Z', now)).toBe('06.10.2025');
    expect(stampWhen('2026-10-06T06:15:00Z', now)).toBe('08:15');
    expect(stampWhen('2026-10-05T06:15:00Z', now)).toBe('gestern, 08:15');
    expect(stampWhen('2026-09-30T06:15:00Z', now)).toBe('30.09., 08:15');
    expect(stampWhen('2025-12-31T22:30:00Z', now)).toBe('31.12.2025, 23:30');
  });
});
