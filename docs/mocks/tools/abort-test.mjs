// Abbruchnachweis: blockiert absichtlich die Event-Loop. Erwartung: der externe Wächter
// beendet Browsergruppe und diesen Node-Prozess, obwohl der interne Timer nicht feuern kann.
// Aufruf: HANG_TEST_MS=30000 node tools/abort-test.mjs   (Prüfung danach: tools/abort-test.sh)
import { withTestBrowser } from './browser.mjs';

await withTestBrowser(async () => {
  console.log('unerreichbar: Arbeit hätte nie starten dürfen');
}, { timeoutMs: 3000, label: 'abbruchtest' });
