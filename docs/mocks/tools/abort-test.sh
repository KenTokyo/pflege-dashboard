#!/bin/sh
# Startet den Abbruchtest und prüft danach, dass Node, Browser und Wächter weg sind.
cd "$(dirname "$0")/.." || exit 1
LOG="${TMPDIR:-/tmp}/pd-abort-test.log"
HANG_TEST_MS=30000 node tools/abort-test.mjs >"$LOG" 2>&1 &
NODE=$!
sleep 3
BROWSER=$(sed -n 's/.*PID \([0-9]*\), Gruppe.*/\1/p' "$LOG" | head -1)
WATCH=$(sed -n 's/.*Wächter \([0-9]*\).*/\1/p' "$LOG" | head -1)
echo "Node $NODE, Browser $BROWSER, Wächter $WATCH"
i=0
while kill -0 "$NODE" 2>/dev/null && [ $i -lt 30 ]; do sleep 1; i=$((i+1)); done
sleep 1
cat "$LOG"
for p in $NODE $BROWSER $WATCH; do
  if [ -n "$p" ] && kill -0 "$p" 2>/dev/null; then echo "FEHLER: $p lebt noch"; exit 1; fi
done
LEFT=$(pgrep -g "$BROWSER" 2>/dev/null | wc -l | tr -d ' ')
echo "Prozessgruppe $BROWSER: $LEFT Prozesse übrig"
[ "$LEFT" = "0" ] && echo "OK: Wächter hat nach ${i}s alles beendet (interner Timer war blockiert)."
