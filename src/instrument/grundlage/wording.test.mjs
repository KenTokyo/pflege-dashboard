import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Eigener Node-Test im Bereich-A-Ordner; keine Änderung am gemeinsamen Vitest-Vertrag.
test('Instrument-Zahltexte in den tatsächlichen Bausteinen', async (t) => {
  const server = await createServer({
    configFile: false,
    cacheDir: '.local/instrument-welle2-a/wording-cache',
    envDir: import.meta.dirname,
    server: { middlewareMode: true, watch: null, hmr: false },
  });
  try {
    const { Timeline } = await server.ssrLoadModule('/src/instrument/grundlage/Timeline.tsx');
    const { Metric } = await server.ssrLoadModule('/src/instrument/grundlage/Metric.tsx');
    await t.test('Timeline: gestern, vorgestern, heute, morgen und übermorgen', () => {
      const html = renderToStaticMarkup(createElement(Timeline, {
        today: '2026-10-16',
        items: [14, 15, 16, 17, 18].map((day) => ({ id: `${day}`, date: `2026-10-${day}`, label: `Termin ${day}` })),
      }));
      for (const text of ['Seit 2 Tagen überfällig', 'Seit 1 Tag überfällig', 'Heute fällig', 'In 1 Tag', 'In 2 Tagen']) {
        assert.ok(html.includes(`>${text}</span>`), text);
      }
      assert.ok(!html.includes('1 Tagen'));
    });
    await t.test('Metric: Einzahl, Null und Mehrzahl, unabhängig von der übergebenen Form', () => {
      for (const [one, other] of [
        ['Tag', 'Tage'], ['Minute', 'Minuten'], ['Stunde', 'Stunden'], ['Aufgabe', 'Aufgaben'],
        ['Version', 'Versionen'], ['Person', 'Personen'], ['Dokument', 'Dokumente'], ['Gespräch', 'Gespräche'],
        ['Modell', 'Modelle'], ['Fall', 'Fälle'], ['Anfrage', 'Anfragen'],
      ]) {
        for (const unit of [one, other]) {
          for (const value of [0, 1, 2, -1]) {
            const expected = Math.abs(value) === 1 ? one : other;
            const html = renderToStaticMarkup(createElement(Metric, { value, unit, label: 'Prüfwert' }));
            assert.ok(html.includes(`aria-label="${value} ${expected}"`), `${value} ${unit}: zugänglich`);
            assert.ok(html.includes(`>${expected}</span>`), `${value} ${unit}: sichtbar`);
          }
        }
      }
    });
    await t.test('Metric: gerundete Zahl, Dezimalwert und feste Einheiten', () => {
      for (const [value, decimals, unit, expected] of [
        [1.4, 0, 'Aufgaben', '1 Aufgabe'], [1.5, 1, 'Aufgabe', '1,5 Aufgaben'],
        [1, 0, 'von 5', '1 von 5'], [2, 0, 'kg', '2 kg'],
      ]) {
        const html = renderToStaticMarkup(createElement(Metric, { value, decimals, unit, label: 'Prüfwert' }));
        assert.ok(html.includes(`aria-label="${expected}"`), expected);
      }
    });
    await t.test('Unbekannte Werte bleiben als nicht verfügbar gekennzeichnet', () => {
      const metric = renderToStaticMarkup(createElement(Metric, { value: NaN, unit: 'Aufgaben', label: 'Prüfwert' }));
      assert.ok(metric.includes('aria-label="Nicht verfügbar"'));
      assert.ok(metric.includes('>–</span>'));
      const timeline = renderToStaticMarkup(createElement(Timeline, {
        items: [{ id: 'unknown', date: 'ungültig', label: 'Termin' }],
      }));
      assert.ok(timeline.includes('Datum nicht verfügbar'));
    });
  } finally {
    await server.close();
  }
});
