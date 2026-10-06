// Bewegungsvorschau: ?t=<ms> friert einen Zeitpunkt ein (für Aufnahmen). „Einmal abspielen“ startet genau einen Durchlauf.
(function () {
  var root = document.documentElement;
  var dur = Number(getComputedStyle(document.body).getPropertyValue('--dur')) || 0;
  var label = document.getElementById('t-label');
  var t = root.classList.contains('frozen') ? Number(root.style.getPropertyValue('--t')) : null;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (label) label.textContent = t === null ? 'Endzustand · ' + dur + ' ms' : 't = ' + t + ' ms von ' + dur + ' ms' + (reduced ? ' · reduziert' : '');
  var btn = document.getElementById('replay');
  if (!btn) return;
  btn.addEventListener('click', function () {
    root.classList.remove('frozen');
    root.style.removeProperty('--t');
    var box = document.getElementById('box');
    var fresh = box.cloneNode(true);
    box.replaceWith(fresh);
    if (label) label.textContent = 'läuft einmal · ' + dur + ' ms';
  });
})();
