import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { DESIGN_KEY, resolveDesign } from '../../lib/design.ts';

// Der frühere Modelltest übersah den ersten Bildaufbau. Beide echten Startskripte ausführen,
// ohne React, Browser, Zugangsdaten oder zweiten Speicherpfad für die Anwendung.
for (const file of ['index.html', 'tests/harness/index.html']) {
  const html = readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8');
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
  assert.ok(script, `${file}: Startskript fehlt`);

  for (const [name, stored, light, expectedDesign, expectedTheme] of [
    ['Erstbesuch dunkel', {}, false, 'tagwerk', 'dunkel'],
    ['Erstbesuch hell', {}, true, 'tagwerk', 'hell'],
    ['Instrument plus Hell', { [DESIGN_KEY]: 'instrument', 'pflege-dashboard:theme': 'hell' }, false, 'instrument', 'hell'],
    ['Tagwerk plus Dunkel', { [DESIGN_KEY]: 'tagwerk', 'pflege-dashboard:theme': 'dunkel' }, true, 'tagwerk', 'dunkel'],
    ['Ungültige Speicherwerte', { [DESIGN_KEY]: 'neon', 'pflege-dashboard:theme': 'neon' }, false, 'tagwerk', 'dunkel'],
  ]) {
    test(`${file}: ${name} vor React`, () => {
      const root = { dataset: {} };
      runInNewContext(script, {
        document: { documentElement: root },
        localStorage: { getItem: (key) => stored[key] ?? null },
        window: { matchMedia: () => ({ matches: light }) },
      });
      assert.equal(root.dataset.design, expectedDesign);
      assert.equal(root.dataset.theme, expectedTheme);
      assert.equal(root.dataset.design, resolveDesign(stored[DESIGN_KEY]));
    });
  }

  test(`${file}: gesperrter Speicher verhindert den Start nicht`, () => {
    const root = { dataset: {} };
    runInNewContext(script, {
      document: { documentElement: root },
      localStorage: { getItem: () => { throw new Error('Gesperrt'); } },
      window: { matchMedia: () => ({ matches: true }) },
    });
    assert.equal(root.dataset.design, 'tagwerk');
    assert.equal(root.dataset.theme, 'hell');
  });
}
