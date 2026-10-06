// Mock-Helfer: nur Farbschema umschalten. Keine Anmeldung, keine Daten, keine Netzwerkaufrufe.
document.addEventListener('click', function (e) {
  var btn = e.target.closest('[data-theme-toggle]');
  if (!btn) return;
  var root = document.documentElement;
  var next = root.getAttribute('data-theme') === 'hell' ? 'dunkel' : 'hell';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('pd-mock-theme', next); } catch (err) { /* privater Modus: ohne Speichern weiter */ }
});
