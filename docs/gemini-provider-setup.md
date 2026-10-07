# Gemini als ausdrücklich wählbare Reserve

Stand: 07.10.2026. DeepSeek V4.1 Flash über OpenCode Go bleibt das Standardmodell. Gemini wird zusätzlich angeboten. Es gibt keinen automatischen Providerwechsel, keine lokale CLI als Voraussetzung und keine Konto-/Tarifänderung.

## Server und Modell

- `GEMINI_API_KEY` ausschließlich in der geschützten lokalen `.env` und den geschützten Vercel-Servervariablen. Kein `VITE_`-Wert, kein URL-Parameter, kein Client-Speicher. Die lokale Datei bleibt mit Modus `0600` geschützt.
- Nativer fester Anschluss: `https://generativelanguage.googleapis.com/v1beta/models/<model>:streamGenerateContent?alt=sse`. Authentifizierung im `x-goog-api-key`-Header. Keine Provider-SDK-/CLI-Abhängigkeit, keine Wiederholung oder Ersatzroute.
- Root hat `gemini-3.8-flash` tatsächlich mit dem Nutzerkey geprüft: echte Antwort, `STOP`, tatsächliches `modelVersion=gemini-3.8-flash`. Modellmetadaten: `inputTokenLimit=1048576`, `outputTokenLimit=65536`. Dieser Bericht ersetzt keine vollständige App-Liveabnahme.
- Native Eingaben enthalten Systemanweisung und gespeicherten Verlauf, Rolle `assistant` wird zu `model`. Es werden keine Tools geschickt. `candidateCount=1`, sichtbare Antwortgrenze `maxOutputTokens=1024`, tatsächliche Denkoption `thinkingLevel=low`, `includeThoughts=false`.
- `countTokens` prüft vor der Generierung den gesamten nativen Request einschließlich Systemanweisung. Das serverseitig reservierte Eingabelimit bleibt verbindlich. Gedanken werden nicht ausgegeben. Tatsächliche `thoughtsTokenCount` werden zu den sichtbaren `candidatesTokenCount` addiert und als Ausgabetokens gespeichert. Die separate konservative Gesamtgrenze ist 65536, sichtbare Kandidaten bleiben auf die angefragten 1024 begrenzt. Ein frühes kumulatives Usageereignis ist kein Beleg für vollständige Endusage.
- Erfolgreich ist ausschließlich ein vollständiger Stream mit `STOP`, abschließender gültiger Usage und dem exakt freigegebenen Modellnamen. Wiederholte identische kumulative Usage und der tatsächliche leere Abschluss mit Gedanken-Signatur sind zulässig. Signaturen, Rohgedanken und Providerfehlertext gelangen nicht an den Client.

## Datenbank und bewusste Auswahl

Nach erfolgreichem lokalen Gate überträgt ausschließlich Root diese CLI-erzeugten Migrationen in Reihenfolge auf das eigene Projekt:

1. `20261007205331_gemini_provider.sql` – neues Provider-Enum, eigener Commit vor Verwendung.
2. `20261007205338_gemini_stream.sql` – Gemini in bestehender Request-/Reservierungs-/Abschlusslogik, echte kostenlose Preise erlaubt, separate Gesamt-Ausgabegrenze im unveränderlichen Snapshot. Historische Snapshots behalten ihren bisherigen Grenzwert.
3. `20261007210252_staff_overview.sql` – schmaler lesender Überblick für bestehende Mitglieder. Die private privilegierte Funktion prüft zuerst `auth.uid()` und Mitgliedschaft; der öffentliche Wrapper ist `security invoker`. Alle Abfragen haben einen festen Workspacefilter. Rohledger und interne Chatrequests bleiben für normale Browsermitglieder gesperrt.

Der vorhandene geprüfte Übertragungsweg ist `node backend/scripts/hosted-schema.mjs apply`. Er prüft Quellhashes, lokales Gesamtgate und strukturelle Übereinstimmung. Nicht den gesamten Seed erneut ausführen.

Für `supabase/demo-gemini-setup.sql` setzt Root auf **derselben vertrauenswürdigen Operator-Verbindung** die folgenden Transaktions-/Sitzungswerte. Werte sind Modellmetadaten, keine Zugangsdaten:

```sql
select set_config('pflege.gemini.model_id','gemini-3.8-flash',false);
-- Tatsächlichen früheren Root-Probezeitpunkt als ISO-Zeit einsetzen.
select set_config('pflege.gemini.verified_at','<tatsaechlicher Probezeitpunkt>',false);
select set_config('pflege.gemini.select_default','false',false);
-- Anschließend Inhalt von supabase/demo-gemini-setup.sql auf derselben Verbindung ausführen.
```

Das Operator-Setup ist idempotent, registriert Modell, geprüfte Free-Tier-Preisschätzung und Audit. Es ändert weder den DeepSeek-Standard noch bestehende Chatmodelle, Budgets, gehaltene Reservierungen, Kosten, Blockaden oder historische Nachrichten. `select_default=true` ist nur für einen ausdrücklich gewählten zukünftigen Standard vorgesehen; die aktuelle Freigabe ist **false**. Der Nutzer kann Gemini pro Chat über den bereits bestehenden, revisionsgeprüften `set_conversation_preferences`-RPC wählen. Der nächste Request verwendet die Auswahl; laufende und historische Antworten behalten ihre Herkunft.

Der Nutzer hat die kostenlose AI-Studio-Stufe bestätigt. Der Operator speichert deshalb eine **Nullpreis-Schätzung**, echte Tokens werden trotzdem aufgezeichnet und `usage_ledger.estimated=true` kennzeichnet den Preisstand. Dies ist keine Rechnung und keine Behauptung unbegrenzter Anbieterquote. Bestehende unbegrenzte App-Ausgabenwahl wird erhalten; kein neuer Cap. Ein Provider-429 beendet die Anfrage eindeutig, es gibt keinen stillen Wechsel.

## Zusätzliche fiktive Vorführdaten

`supabase/demo-staff-data.sql` ist ein separates additives, idempotentes Operator-Setup. Es ergänzt fünf Personen, drei erfundene Kassen, zehn offene Aufgaben, fünf leere vorbereitete Gespräche und zwei Notizen. Zusammen mit dem ursprünglichen Seed: sechs Personen mit Pflegegrad 0–5 und zwölf offene Aufgaben. Termine sind ausdrücklich erfundene manuelle Plantermine. Bestehende Daten werden weder ersetzt noch umbenannt. Es entstehen keine Authkonten, Modellantworten, Requests oder Tokenverbräuche.

`staff_overview({p_workspace_id})` liefert echte gespeicherte Mengen, pro Person offene Aufgaben/Gespräche/abgeschlossene Antworten und tatsächliche Nutzungsaggregate je Modell. Eine abgeschlossene Antwort braucht einen abgeschlossenen Request, die zugehörige abgeschlossene Assistantnachricht und einen Usagebeleg. Leere Demogespräche werden nur als gespeicherte Gespräche gezählt. Verträge: `types/staff.ts`, `types/rpc.ts`.

## Transparenter Ablauf und Fehler

`message.activity` ergänzt den bestehenden SSE-Vertrag. Reale Phasen: `auth_verified`, `context_ready`, `token_count`, `provider_request`, `awaiting_text`, `streaming`, `persisting`. Ereignisse enthalten Datum, vergangene Millisekunden, feste Quelle/Operation sowie freigegebene Modell-/Denkoption und begrenzte Mengen. Keine Vollprompts, Nachrichteninhalte, Header, Schlüssel, Rohgedanken oder vorgetäuschte MCP-Nutzung. OpenCode sendet tatsächlich `thinking:{type:'disabled'}`; Gemini sendet tatsächlich `thinkingLevel:'low'`. Warten ist kein Nachweis separater Denktexte. Nur wirklich empfangene private Denkblöcke erhöhen `reasoningChunks`. Historische Abläufe werden beim Reload nicht erfunden; echte Nachricht/Modell/Usage bleibt gespeichert.

Neue sichere Fehler: `PROVIDER_AUTH_FAILED`, `PROVIDER_RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `PROVIDER_CONTENT_BLOCKED`. 401/403 des Providers sind Servereinrichtungsfehler, keine abgelaufene Supabase-Sitzung. 429/temporäre Nichtverfügbarkeit sind erneut versuchbar, aber werden nicht automatisch erneut aufgerufen. Abbruch, Live-Sitzungsprüfung, Einmalverarbeitung und konservative Finalisierung bleiben erhalten.

## Lokale Prüfbefehle

```sh
cd backend
npm run typecheck
npm test
node scripts/phase1-check.mjs
node scripts/gemini-upgrade-check.mjs
```

Der vollständige native Lauf erzeugt echte CLI-Typen und schließt den eigenen Stack auch bei Fehlern. Der Upgrade-Lauf startet den tatsächlichen Stand mit 13 Migrationen und prüft die additive Übernahme einschließlich bestehender Session, historischer Nachricht/Request-/Modell-/Usage-Snapshots und normalem Mitglied. Er nutzt keine Authkonten und keinen echten Provider. Ergebnisse liegen geschützt unter `backend/.local/phase1-result.json`, `gemini-setup-result.json`, `gemini-upgrade-result.json`, `runtime-cleanup.json`. Öffentliche Vercel-/Browserabnahme ist der separate Root-Nachweis.

**Tatsächlich lokal bestanden am 07.10.2026:** 16 frisch angewendete Migrationen; 656 SQL-Assertions einschließlich 27 Gemini- und 18 normal-member Staffprüfungen; 242 Backendtests einschließlich 40 Gemini-Nachweise; strict Typecheck und Build; 17 idempotente Provider-/Demo-Operatorprüfungen; 31 HTTP-/SQL-Smokeprüfungen; 19 PG-Rollen-/Abbruchprüfungen; 8+15 Parallelprüfungen. Lokale Supabase-Sicherheitsberatung: `No issues found`. Zusätzlich 15 echte Upgradeprüfungen von 13 auf 16 Migrationen, vollständiger Strukturabgleich und unveränderte historische OpenCode-Snapshots/Usage/Session; normaler Member sieht danach echte Aggregation. Beide eigenen nativen Läufe schließen vollständig: 0 eigene Prozesse, Ports 56421/56422/56428 geschlossen. Kein Browser gestartet, keine Hostedmutation und kein echter Provideraufruf durch den Backendagenten. Backendbewertung nach eigener Nacharbeit: 9,3/10 für Anschluss/Zugriff/Verbrauch/Operatorweg; der tatsächliche Online-Endablauf bleibt die eigene Root-Abnahme.

Offizielle Quellen, am 07.10.2026 geprüft: [Native Generierung und Usage](https://ai.google.dev/api/generate-content), [Tokenizer](https://ai.google.dev/api/tokens), [Denkoptionen der Generate-Content-API](https://ai.google.dev/gemini-api/docs/generate-content/thinking), [Preise](https://ai.google.dev/gemini-api/docs/pricing), [Billing/Free Tier](https://ai.google.dev/gemini-api/docs/billing), [Anbieterfehler](https://ai.google.dev/gemini-api/docs/api-errors), [OpenCode Go und eigener Client-Header](https://opencode.ai/docs/go/).
