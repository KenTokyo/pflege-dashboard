# Lokales Backend starten, prüfen und stoppen

Dieses Backend läuft nachgewiesen mit der **echten Supabase CLI 2.119.0** im nativen Modus auf diesem Apple-Silicon-Mac. Kein Docker-Fenster, kein Browser und kein eigenständiger PostgreSQL-Ersatz. Es verwendet ein eigenes Laufzeitverzeichnis ohne Leerzeichen, weil die experimentelle native Laufzeit den ursprünglichen Pfad beim TLS-Start falsch verarbeitet hat. Diese Pfadkorrektur ändert keine fremde Konfiguration.

## Vollständige sichere Wiederholung

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
mkdir -p .local
npm ci --no-audit --no-fund > .local/npm-ci.log 2>&1
npm run check:phase0
```

Der vollständige Prüflauf startet Supabase, setzt **nur die eigene lokale Datenbank** frisch zurück, wendet beide Migrationen und den fiktiven Seed an, prüft Dienste, SQL-Zugriffsschutz und echte Parallelkonflikte, erzeugt die Datenbanktypen und prüft Typen/Logik. Danach stoppt er den eigenen Stack im `finally` und prüft Prozesse und Ports. Auch bei Fehler oder Ctrl+C. Ein kompletter Lauf dauert höchstens 15 Minuten. Ein frischer eigener Reset ist Bestandteil dieses Prüfbefehls; eigene Änderungen in der Testdatenbank werden dabei gelöscht, fremde Stacks bleiben unangetastet.

Ergebnisse: `docs/backend-pruefung.md` und die ignorierte `backend/.local/phase0-result.json`. Keine Vollausgabe von `supabase status`, keine Schlüssel in den Chat. CLI-Ausgaben werden vom Wrapper vor dem Schreiben redigiert. Keine Providerkeys und kein Supabase-Login/Link nötig.

## Gezielte lokale Arbeit

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
node scripts/supabase-safe.mjs start
node scripts/supabase-safe.mjs reset
node scripts/supabase-safe.mjs test
node scripts/concurrency.mjs
node scripts/supabase-safe.mjs types
npm run typecheck
npm test
node scripts/supabase-safe.mjs stop
node scripts/runtime-cleanup.mjs
```

Bei manueller Ausführung `stop` und `runtime-cleanup` auch nach einem Fehler durchführen; der automatische vollständige Lauf übernimmt das zuverlässig. `--runtime-only` gehört nur zum gesicherten alten Verfügbarkeitsversuch und ist **kein App-Gate**. Eigene Start-/Status-/Testbefehle stets über den Wrapper, nicht direkt mit vollem CLI-Status.

Der Wrapper kopiert nur `supabase/config.toml`, Migrationen, Seed und SQL-Tests in `backend/.local/supabase-project`. Er liest weder root `.env` noch `env.md`. Der eigene SUPABASE_HOME heißt im temporären Systemordner `pflege-dashboard-supabase-57aea064-phase0`; tatsächlicher absoluter Pfad im Prüfbericht. Kein allgemeines `~/.supabase`, kein globales Stoppen. Gestoppte eigene Daten/Caches bleiben für weitere gezielte Prüfungen erhalten.

## Typen und späterer Anschluss

CLI-Generierung gegen die echte App-DB: `supabase gen types --local --lang typescript --schema public` wird sicher vom Wrapper ausgeführt, die Ausgabe landet in `types/database.types.ts`. Keine Handkorrektur dieser Datei. Der spätere JS-Client verwendet `BackendDatabase` aus `types/rpc.ts`, damit null-Overrides und der Promptreset exakt zur SQL-RPC passen. Die geplanten Typen in `types/api.ts` sind noch keine erreichbaren Chat-Endpunkte.

Client-Konfiguration später ausschließlich `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY`. Keine VITE-Admin-/Providerkeys. Der Hosting-Unterchat besitzt root Env und Hosted-Provisionierung; diese Anleitung greift dort nicht ein. Hosted-Migration erst nach freigegebenem Schema-Gate, kein automatischer Deploy.

Der Nutzer legt später Email-/Passwortkonten manuell an. Öffentliche Registrierung und anonyme Auth sind aus. Profile/Mitgliedschaften werden anschließend ausschließlich vertrauenswürdig provisioniert, nach Prüfung des vorhandenen Auth-Nutzers; alle zugelassenen Demo-Nutzer bekommen denselben Workspace. Ein Profil oder SQL-Fixture ist kein Auth-Konto. Agenten legen keine Logins an und geben keine Zugangsdaten ein.

Die tatsächlichen lokalen Auth-Werte sind 15m Inaktivität, 8h Timebox, 300s JWT. Der spätere Client speichert standardmäßig keine dauerhafte Anmeldung und meldet nach 15 Minuten echter Interaktionsinaktivität ab. Supabase misst Refresh-Aktivität; ein echter Nutzersitzungstest und der zusätzliche serverseitige Aktivitätsnachweis fehlen bewusst noch. Hostingplan/Wirkung prüfen, keine Sessiongarantie aus der Config ableiten.

## Spätere Abnahme

Nach Designwahl: Phase 1 mit manuell provisioniertem Login, neuem Gespräch, Personenzuordnung, echtem Antwortenstream und beiden Themes. Phase 2 prüft erst den **Nutzer-Chat → editierbare Vorschau → Bestätigung → Dokument** samt PDF/DOCX, Uploads, Übergabe, Modellherkunft, Modusfilter, Parallelbestätigung und harten Kostenregeln. Providersecrets setzt der Nutzer selbst ausschließlich als Supabase Edge Secrets. Keine Modellaufrufe, Konten oder Kosten in dieser Phase-0-Prüfung.
