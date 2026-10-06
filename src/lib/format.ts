/** Deutsche Datums- und Zahlenformate. Zeitzone der Demo: Europe/Berlin. */
const TZ = 'Europe/Berlin';
const dateFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });
const shortFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const longFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ });
const hourFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: TZ });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatShortDate = (iso: string) => shortFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatLongDate = (date: Date) => longFmt.format(date);

/** Kalendertag in Berlin als YYYY-MM-DD. */
export const dayKey = (date: Date) => dayKeyFmt.format(date);

/** Ganze Kalendertage von heute bis zum Termin (Berlin). Negativ = überfällig. */
export function daysUntil(iso: string, now: Date): number {
  const a = Date.parse(`${dayKey(now)}T00:00:00Z`);
  const b = Date.parse(`${dayKey(new Date(iso))}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function relativeDays(days: number): string {
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days === -1) return 'seit gestern überfällig';
  if (days < 0) return `seit ${-days} Tagen überfällig`;
  return `noch ${days} Tage`;
}

const sameYear = (iso: string, now: Date) => dayKey(new Date(iso)).slice(0, 4) === dayKey(now).slice(0, 4);

/** Kurze Zeitangabe für Listen: heute → Uhrzeit, gestern → „gestern“, dieses Jahr → TT.MM., sonst mit Jahr. */
export function listWhen(iso: string, now: Date): string {
  const d = daysUntil(iso, now);
  if (d === 0) return formatTime(iso);
  if (d === -1) return 'gestern';
  return sameYear(iso, now) ? formatShortDate(iso) : formatDate(iso);
}

/** Zeitstempel einer Nachricht: heute nur Uhrzeit, sonst Tag und Uhrzeit (über Tage laufende Gespräche). */
export function stampWhen(iso: string, now: Date): string {
  const d = daysUntil(iso, now);
  if (d === 0) return formatTime(iso);
  if (d === -1) return `gestern, ${formatTime(iso)}`;
  return `${sameYear(iso, now) ? formatShortDate(iso) : formatDate(iso)}, ${formatTime(iso)}`;
}

export function ageFrom(birthDate: string | null, now: Date): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  const [ny, nm, nd] = dayKey(now).split('-').map(Number) as [number, number, number];
  let age = ny - y;
  if (nm < m || (nm === m && nd < d)) age -= 1;
  return age;
}

export function greeting(now: Date): string {
  // Nur die Stundenzahl (de-DE würde „13 Uhr“ liefern).
  const hour = Number(hourFmt.formatToParts(now).find((p) => p.type === 'hour')?.value ?? '12');
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

/** Anzeigename ohne Zusatz wie „· fiktiv“ und Initialen daraus. */
export function baseName(name: string): string {
  return name.split('·')[0]?.trim() || name.trim();
}
export function initials(name: string): string {
  // Nur Wörter, die mit einem Buchstaben beginnen („Testnutzerin (synthetisch)“ → „T“).
  const parts = baseName(name).split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}
