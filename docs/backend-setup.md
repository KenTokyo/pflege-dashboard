# Backend starten und prüfen — Node + Supabase

Stand 06.10.2026, Vertrag v1.2. **Keine Edge Functions und keine Veröffentlichung der Anwendung.** Ein gewöhnlicher lokaler Node-Server führt Sitzung und Chat aus; Supabase bleibt für Auth, Datenbank und private Dateien zuständig. Root `.env` gehört zum ausdrücklich autorisierten eigenen Frankfurt-Projekt `ttbfpqveexmlqxkzwlmz`. Sie wird nur im Server gelesen, niemals angezeigt, umgeschrieben oder an Vite weitergegeben. `env.md` und fremde Env-Dateien werden nicht gelesen.

## App-Anschluss

Frontend besitzt den gemeinsamen Root-Start. `npm run dev` startet Node auf **127.0.0.1:5174** und Vite auf **5173**. Vite proxyt `/api` mit `changeOrigin:true` zum Node-Server. `npm start` verwendet den gebauten Root-`dist` und denselben Node-Ursprung. Diese Root-Skripte werden vom Frontend geliefert; der Backend-Chat verändert sie nicht.

Backend einzeln, vom Projektwurzelordner:

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard'
npm --prefix backend run serve
```

Der Befehl baut TypeScript nach `backend/.local/build` und startet `backend/.local/build/backend/runtime/index.js`. Der Server liest geschützte root `.env`, prüft eigenes Projekt und offizielle CA, verbindet den begrenzten PG-Pool und prüft die freigegebenen SQL-Funktionen, bevor `/api/health` bereit ist. Stop während Konfiguration, Datenbankprüfung oder Listenerstart verhindert einen späteren Start. Ausgaben sind feste sichere Texte, keine URLs mit Secrets, Token oder Datenbankfehler. Zum Beenden Ctrl+C; SIGINT/SIGTERM schließen eigene Requests, Sockets und Pool in weniger als fünf Sekunden.

Gebautes Frontend einzeln über Node anbieten:

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard'
STATIC_DIR='/Users/kentoky/Documents/React Projects/pflege-dashboard/dist' npm --prefix backend run serve
```

`STATIC_DIR` muss absolut auf das tatsächliche Root-`dist` zeigen. Ohne diese Variable gibt es nur API. Hosts nur `localhost:<PORT>` und `127.0.0.1:<PORT>`. Default `HOST=127.0.0.1`, `PORT=5174`; öffentliche Bindung wird nicht angeboten. Preview erreichbar unter `http://127.0.0.1:5174`. Health ist minimal `GET /api/health` → `200 {"ok":true}`; das beweist Serverbereitschaft, keinen angemeldeten KI-Erfolg.

API: `POST /api/session` und `POST /api/chat-stream`, `Authorization: Bearer <Access-Token>`, JSON, kein apikey-Header, keine Cookies (`credentials:omit`). Session- und SSE-Formen in `types/phase1.ts`; Pfade als `PHASE1_API`. Browser liest Supabase-Tabellen und verwendet nur sechs auditierende Metadaten-RPCs. Serverseitige Chat-/Session-SQL-Namen `edge_*` sind historische kompatible Namen, keine Edge-Abhängigkeit.

## Serverkonfiguration ohne Schlüsselanzeige

| Name                                                  | Nutzung                                                                                                                                                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Bereits vorhandene öffentliche Clientwerte; Node verwendet sie für echte Supabase-Auth-Tokenprüfung                                                                                                                        |
| `DATABASE_URL`                                        | Bereits vorhandene eigene Serververbindung; niemals `VITE_` oder Clientimport                                                                                                                                              |
| `PGSSLROOTCERT` / `PGSSLMODE`                         | Offizielle CA; `require`, `verify-ca` oder `verify-full` in vorhandener Datei werden sicher mit tatsächlichem `rejectUnauthorized:true` und Hostprüfung verwendet. URL-SSL-Parameter können diese Prüfung nicht abschalten |
| `OPENAI_API_KEY`                                      | Optionaler zukünftiger Providerkey ausschließlich im Server. Fehlt aktuell; kein Agent legt ihn an oder gibt ihn aus                                                                                                       |
| `HOST` / `PORT`                                       | Default `127.0.0.1` / `5174`; nur Loopback                                                                                                                                                                                 |
| `STATIC_DIR`                                          | Absoluter gebauter Root-`dist`, nur für Produktionsvorschau                                                                                                                                                                |
| `ALLOWED_ORIGINS`                                     | Optionaler vollständiger Ersatz der vier exakten Standard-Origins. Ein gesetzter leerer Wert sperrt Browserherkünfte; keine Wildcard                                                                                       |

Standard-Origins: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:5174`, `http://127.0.0.1:5174`. Prozessumgebung überschreibt nur diese bekannten Namen; bestehende Env-Werte bleiben unverändert. Root `.env` muss reguläre eigene Datei mit Modus 600 sein. Datenbank und Provider bleiben serverseitig; Vite erhält ausschließlich seine öffentlichen `VITE_SUPABASE_*`-Werte. Keine Shell-Ausgabe oder `cat .env` verwenden. Ein Service-Role-Key, PAT, Supabase Login/Link und Edge Secrets sind für diesen Weg nicht erforderlich.

Node setzt in kurzen parametrisierten Transaktionen ausschließlich **pflege_backend**. Dies ist eine **NOLOGIN-Berechtigungsrolle**, kein Auth-Konto, ohne Passwort, RLS-Bypass, direkte Tabellenrechte oder private Schema-Rechte. Nur sieben geprüfte SQL-Wrapper sind ausführbar. Funktion/Rolle/SQL/Actor werden nicht aus Clientpayload gewählt. Supabase Auth validiert den Bearer live; SQL prüft zusätzlich tatsächliche `auth.sessions`, Mitgliedschaft, 15m-Inaktivität und 8h-Zeitbox. `300s` JWT ist lokal konfiguriert; Hosted-Free garantiert diese zusätzlichen Grenzen nicht. Direkte Browser-Metadatenzugriffe können bis zum JWT-Ablauf bestehen; empfindlicher Node-Chat prüft live. Während einer aktiven Antwort prüft ein eigener Timer alle fünf Sekunden auch bei Stille/Rückstau; maximal eine gleichzeitige Prüfung, 2,5 Sekunden Prüffrist. Er erneuert keine Aktivität und endet mit dem Stream. Echter Widerrufsgrund bleibt sichtbar.

## Vollständige lokale Prüfung

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
mkdir -p .local
npm ci --no-audit --no-fund > .local/npm-ci.log 2>&1
npm run check:phase1
```

Ein zeitlich begrenzter Node-Ablauf startet ausschließlich den eigenen **echten nativen Supabase-Stapel**, resettet seine lokale Testdatenbank, wendet acht Migrationen und den fiktiven Seed frisch an, spricht Auth/REST/Storage tatsächlich an, prüft SQL/RLS/Storage/Audit/Session/Kosten, Parallelfälle, den Node-HTTP-Transport und echte PG-Abbrüche. Danach reale CLI-Typgenerierung, Strict-Typecheck, Build und Mock-Provider-/Transporttests. **Keine Auth-Konten, keine kostenpflichtigen Providerkontakte.** `finally` stoppt ausschließlich den eigenen Stack und prüft Prozesse/Ports, auch nach Fehler. Edge-Dienst bleibt absichtlich gestoppt. Die CLI-Sammelreadiness kann wegen dieses deaktivierten Dienstes `stopped` heißen; vier benötigte Dienste und reale HTTP-Antworten werden separat belegt.

Eigener `SUPABASE_HOME`: vom Betriebssystem bereitgestelltes Temp-Verzeichnis, darunter `pflege-dashboard-supabase-57aea064-phase0`. Spiegel: `backend/.local/supabase-project`. Der Wrapper kopiert ausschließlich eigene Config/Migrationen/Seed/SQL-Tests, niemals root `.env`. Kein Ersatz-PostgreSQL und kein globales Supabase-Home. Vorhandene fremde Stacks werden nicht gestoppt. Ports 56421/56422; historischer eigener Inspectorport 56428 wird beim Cleanup mit geprüft. Node-Smoke benutzt ausschließlich einen zufällig reservierten eigenen Port; 5173/5174 gehören dem Frontend. Vorhandene fremde Server werden nicht beendet.

Gezielte Wiederholung ohne Gesamtreset:

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
npm run typecheck
npm run build
npm test
npm run smoke:node
npm run hosted:inspect
```

`smoke:node` startet den echten gebauten Node-Server gegen das eigene Hosted-Supabase, prüft HTTP-Verweigerung/TLS/SQL und beendet ihn zuverlässig. Kein tatsächlicher Login oder KI-Request. `hosted:inspect` ist ein reiner Bestands-/Owner-/RLS-/Rechte-/CA-Vergleich und anonyme REST-Leseverweigerung; keine Edge-Route mehr.

Manuelle lokale Supabase-Schritte nur mit anschließender Bereinigung:

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
npm run supabase:start
npm run supabase:reset
npm run supabase:test
npm run supabase:types
npm run supabase:stop
node scripts/runtime-cleanup.mjs
```

Exakter Generierweg intern: `supabase gen types --local --lang typescript --schema public` über `scripts/supabase-safe.mjs`, eigenes Home und Spiegel; komplette CLI-Status-/Startausgaben ausschließlich redigiert in ignorierte `.local/`-Logs. **Keine rohe `supabase status`-Ausgabe.** Automatischer Gesamtbefehl ist für Fehlerfälle vorzuziehen. Seed und Tests enthalten eindeutig fiktive Personen; SQL-Claims/Aktivitätsfixtures sind keine Login-Konten.

## Hosted-Bestand und verbleibende Gates

Die vorhandenen sechs App-Migrationen und der fiktive Seed sind geprüft. Die siebte Migration richtet die reine Node-Ausführungsrolle und genaue Rechte ein. Die achte additive Migration korrigiert allein die Provider-Kontextreihenfolge und filtert Aufgaben auf open/in_progress; keine historischen Migrationen ändern, keine Nutzerdaten resetten/dropen, keine Systemtabellen übernehmen. `npm run hosted:apply` darf ausschließlich nach aktuellem vollständigem lokalem Gate und geprüftem tatsächlichem Bestand/Owner/RLS auf dem autorisierten eigenen Projekt arbeiten. Vorhandener Seed wird bei bestehender App nicht wiederholt. Der aktuelle Bericht `docs/backend-phase1-randfaelle.md` nennt den ausgeführten Stand; vorheriger Abschluss in `docs/backend-phase1-pruefung.md`.

Weiter offen: echtes Auth-Konto und vertrauenswürdig zugewiesene Demo-Mitgliedschaft, serverseitiger Providerkey, geprüftes aktives OpenAI-Textmodell und gültige obere Preisversion sowie ausdrücklich freigegebenes Budget. Der Agent erstellt keine Konten und beschafft keine Providerzugänge. **Budget bleibt 0.** Kein Produkt-Mockchat. Fehlende Voraussetzungen liefern konkrete sichere Fehler; der vorhandene Produktadapter bleibt kostenfrei unaufgerufen. Anthropic/EU-Anbieter sind geplante spätere Erweiterungen, keine erfundene Machbarkeit oder EU-Datenschutzgarantie.

Der echte Nutzertest Login → Sitzung → Gespräch → KI-Stream bleibt ohne diese Voraussetzungen offen. Phase 2 erst nach eigenem Gate: bearbeitbare Vorschau → bestätigte transaktionale Erstellung → Dokument/Task/Notiz, RAG/Uploads/Exporte/Übergabe. Kein Node-Login-Testkonto und kein vorgezogener Bestätigungsflow.
