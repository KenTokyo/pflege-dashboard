# Pflege-Dashboard

- Zuerst ganz lesen: `docs/anforderungen.md`, dann `/Users/kentoky/Documents/React Projects/shared-docs/CODING-RULES.md`
- Browserprüfungen: zusätzlich `~/.claude/CLAUDE.md` und `shared-docs/SCREENSHOT-GUIDE.md`
- `docs/anforderungen.md` geht vor allgemeinen Git-Vorgaben

## Produkt und Stand

- Eigenständige Neuentwicklung; keine Dateien, Imports oder Anwendungsteile aus NoteTree
- Gestaltung **Tagwerk** (Referenz: 24 Designbilder + drei Bewegungsfolgen unter `docs/mocks/`, bleiben erhalten)
- **Live:** Vercel-Projekt `pflege-dashboard` → `pflege-dashboard-puce.vercel.app`; Server als normale Vercel Node Functions (`api/`, `vercel.json`)
- **Supabase** (eigenes Projekt, EU Frankfurt) für Auth, Daten, Storage; Einrichtung `docs/supabase-provisioning.md`, Backend-Prüfung `docs/backend-pruefung.md`
- **Keine Supabase Edge Functions:** KI-Aufrufe nur im Node-Server; Frontend spricht `/api/session` und `/api/chat-stream` über denselben Ursprung
- **KI-Anbieter:**
  - Standard: DeepSeek V4.1 Flash über OpenCode Go (Abo aktiv), Modell `deepseek-v4.1-flash`, Endpunkt `https://opencode.ai/zen/go/v1/chat/completions`; vorhandene Secret-Variable (Altname) weiter nutzen, nicht neu kopieren
  - Reserve: Gemini mit kostenlosem AI-Studio-Schlüssel, nur serverseitig, manuell auswählbar
  - kein automatischer Providerfallback; kein App-Ausgabenlimit für diesen Workspace, Nutzungsaufzeichnung + Zugriffsschutz bleiben
- **Anmeldung:** Sitzung bleibt auf dem Gerät gespeichert (auch nach Neuladen); nur gültige Sitzungstokens, nie das Passwort; Abmelden löscht die Sitzung; serverseitige Auth-/Workspaceprüfung bleibt
- **Testkonto:** bestehendes bestätigtes `test@test.de` mit Demo-Mitgliedschaft; Abnahme auf dem Live-System damit
- **Funktionen:** Streaming-Chat mit sichtbarem Denk-/Schreibstatus, aufklappbarem technischem Ablauf (echte Thinking-Konfiguration, echte DB-/Provider-Aufrufe, bereinigtes JSON), deutsche Chrome-Spracheingabe, Fragen-Dialog nach Alltagsthemen mit bearbeitbaren Beispielanfragen, Demo-Einstieg
  - Sichtwechsel zu Sachbearbeiter-Testdashboard: echte Supabase-Analytics, Fallübersichten, KI-Einstiege, anfragebezogene Arbeitsflächen nach OpenUI-Vorbild
  - Chat: Wechsel Text ↔ Komponentenansicht (OpenUI), Fett/Kursiv in Tagwerk-Farben, Fakten/Schritte/Hinweise für beide Einstiegspfade; Nur-Auskunft-Grenzen bleiben
  - Uploads noch nicht nötig
- Nie vortäuschen: Login-/KI-Erfolg, MCP-Aufrufe, Rohgedanken, Modellleistungen, Nutzungszahlen
- Neue Produktphase oder neuer Providervertrag nur mit eigenem Auftrag; Aufträge und Fortschritt in `docs/tasks/`

## Arbeitsteilung

- **Orchestrator (Root):** verteilt, prüft Verträge, nimmt unabhängig ab, dokumentiert, veröffentlicht; keine App-Implementierung, nur kleine Verbindungskorrekturen; besitzt diese Datei, `docs/anforderungen.md`, `docs/tasks/`, Gate-Berichte; führt Meilenstein-Commits nach Prüfung aus; koordiniert den einzigen Browserprüfslot
- **Frontend:** `docs/mocks/` (inkl. Mock-Werkzeuge), `src/`, Root-Paketdateien, Frontend-Konfiguration, Designwerte, Bewegung, Sprache/Debug, UI-Tests; liest `types/` nur
- **Backend:** `supabase/`, `types/`, `backend/`, `api/`, `vercel.json`, `docs/api-contract.md`, Demobefüllung, Backend-Einrichtungs-/Testdoku; keine UI
- **Dritter Agent nach Bedarf:** neue Sachbearbeiter-Dateien + abgesprochene Navigation, oder unabhängige Anforderungs-/Randfall-/Browserprüfung
- Höchstens drei Arbeitsagenten gleichzeitig; Modelle: höchstens zwei GPT-6.1-Sol (`reasoningEffort: xhigh`) + bei Bedarf ein Claude Opus 5.5 (`effort: high`) für Oberfläche/End-to-End
- Bereiche erledigen Prüfung und Nacharbeit selbst; keine kleinteiligen Feedbackrunden; Nacharbeit bleibt beim Bereichsinhaber
- Ohne Auftrag des Orchestrators keine weiteren Chats oder Provider-Subagenten; API-Vertragsänderungen über den Orchestrator
- Unterchats stagen/committen keine fremden Dateien, verändern keine Git-Historie

## Grenzen

- Keine Konten anlegen (auch keine lokalen Auth-Testkonten), keine Zugangsdaten eingeben, keine aus anderen Projekten lesen
- Schlüssel nie ausgeben, loggen, committen; Supabase-Status-/Startausgaben vor Anzeige redigieren oder nur in ignorierte `.local/`-Dateien
- Frontend nur öffentliche `VITE_SUPABASE_*`-Werte; Provider- und DB-Geheimnisse bleiben serverseitig; keine echten Geheimnisse in Doku oder `.env.example`
- RLS-Prüfungen mit synthetischen SQL-Claims sind keine Login-Konten; nicht ausführbare angemeldete Tests ehrlich benennen
- Nur fiktive Daten; zusätzliche Demodaten additiv + idempotent
- Native Supabase-Läufe lokal erlaubt, kein eigener PostgreSQL-Ersatz; Migrationen erst nach bestandenem lokalem Backend-Gate, nur auf dieses eigene Projekt
- Nie: fremde Projekte, Konten, Tarif-/Guthabenwechsel, Datenlöschungen, Edge-Function-Deploys
- Geprüfte Änderungen dürfen ohne erneute Freigabe gepusht und über Vercel veröffentlicht werden
- Browser des Nutzers: Tabs und Werte erhalten; keine sichtbaren Ersatz-Apps, keine Umgehung über persönlichen Chrome/OS-Automation

## Prüfung und Kommunikation

- Deutsch, kurze verständliche Sätze
- Bericht: Dateien/Ergebnis, ausgeführte Prüfungen samt Ergebnis, ehrliche Note je Screen/Flow vor und nach Nacharbeit, Nachweisgrenzen, Browser-/Prozessbereinigung; unter 9/10 erst selbst verbessern
- Erst Node-/Quellprüfungen, dann Bilder
- Nur Chrome for Testing (`~/Library/Caches/chrome-for-testing/current/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, Version live prüfen); nie persönlicher Chrome oder Playwright-Chrome
- Keine sichtbaren Fenster, kein Fokuswechsel; höchstens 1280×720, ein Prüfbrowser gleichzeitig im ganzen Auftrag; keine Flags gegen Bildrate oder Hintergrunddrosselung
- Browser, Kontext, Aufnahmeserver mit `try/finally`, Abbruchbehandlung, Zeitlimit schließen; eigene Prozesse nachprüfen; spätestens vor jeder Schlussantwort alles zu
- Keine endlosen dekorativen Animationen, kein WebGL/Three.js; reduzierte Bewegung berücksichtigen
