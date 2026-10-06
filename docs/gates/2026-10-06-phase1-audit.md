# Phase 1: unabhängige Anforderungs- und Randfallprüfung

Auftrag vom 06.10.2026, Ausgangsstand `1dc2782`. Diese zusätzliche Abnahme beginnt nach dem technischen Node-Abschluss. Der bisherige Bericht `2026-10-06-phase1.md` bleibt dessen historischer Nachweis; diese Prüfung ersetzt kein fehlendes echtes Nutzer-Gate.

## Zuständigkeit und Grenzen

- Ursprünglicher Backend-Sol (`agent-57aea06487987ff6370bde548102f71b`, GPT-6.1 Sol, xhigh): Backend-Randfälle, eigene Fehlerbehebung und Regressionen.
- Unabhängiger Sol (`agent-bcb3da8e7c5bd97aaea65b6dd6ed17fe`, GPT-6.1 Sol, xhigh): vollständige Anforderungsmatrix und Querverbindungen; ausschließlich eigener Prüfbericht, keine App-Änderungen.
- Ursprünglicher Frontend-Opus (`agent-c2f0c080d724ad307a7f96d6f7c0dbfa`, Opus 5.5, high): Frontend-Randfälle, Oberflächenprüfung und eigene Nacharbeit. Alleiniger Browser-Slot, höchstens 1280×720, headless, vorgeschriebener Chrome for Testing.
- Orchestrator: unabhängige Verbindungskontrolle, Review, Bildsichtung, Dokumentation und lokaler Commit ohne Push.

Tool-Vorabprüfung zeigt die vorhandenen Agenten und akzeptiert den ausdrücklich vorgegebenen neuen Sol-Modellschlüssel samt `reasoningEffort:xhigh`. Die Favoritenliste ist keine vollständige Modellliste; kein Modellwechsel vorgenommen. Höchstens zwei Sol gleichzeitig plus ein Opus. Hosting-Chat bleibt gestoppt, keine neuen Unteragenten.

Keine Konten, Zugangseingaben, Provideraufrufe, Kosten, Edge Functions oder Veröffentlichung. Bestehende geschützte Projektkonfiguration ausschließlich im bereits autorisierten eigenen Projekt. Keine Phase 2 vor dem echten Phase-1-Nutzergate. Synthetische UI-/HTTP-Prüfungen bleiben ausdrücklich synthetisch.

## Ergebnis und geprüfte Nacharbeit

Die zusätzliche technische Prüfung ist bestanden. Die ursprünglichen Bereichsinhaber haben die bestätigten Fehler selbst behoben. Der Orchestrator hat Änderungen, Gegenproben und Bildbelege geprüft sowie die vollständigen aktuellen Frontend-, nativen Supabase- und Hosted-Node-Prüfungen unabhängig ausgeführt. **Das echte angemeldete Nutzer-/KI-Gate bleibt offen.**

| Bereich | Fehler im Ausgangsstand | Geprüfter Endstand |
| --- | --- | --- |
| Vollständige Listen | Stille Grenzen von 400 Nachrichten, 100 Aufgaben, 200 Gesprächen und 50 Dokumenten; neueste Antworten verschwinden nach Neuladen | Vollständige Seitenabfragen, stabile Reihenfolge, ID-Deduplizierung; 1.201 Nachrichten und mehr als 500 andere Datensätze technisch geprüft |
| Aktiver KI-Stream | Live-Sitzungsprüfung hängt von neuen Providerstücken ab; bei stillem Anbieter oder Rückstau fehlen die zugesagten Prüfungen alle fünf Sekunden | Unabhängiger aktiver 5s-Wächter, korrekter Widerrufsgrund und Cleanup. Abschließende Gegenprobe deckte auf: Ein Abbruchsignal allein begrenzt eine noch wartende SQL-Verbindung nicht zuverlässig. Jetzt beendet eine unabhängige 2,5s-Frist auch diesen Wartepunkt; zusätzlicher Regressionstest bestanden, kein Leerlauf-Polling |
| Mehrseitige Abfragen | Erster Pagination-Entwurf wechselt nach `auth.detach()` für Folgeseiten zum neuen Client | Client an Sitzung gebunden; Generation vor/nach jeder Seite, Abbruchsignal bis zur Anfrage, kein altes Teilergebnis |
| Dashboard | Aufgaben-Ladefehler wird auf Personenkarte als „Keine offene Frist“ dargestellt | Ehrlicher Ladefehler auf der Personenkarte; UI-Regression bestanden |
| Stream nach Navigation | Gespeicherte Assistant-Zeile mit Status streaming verdrängt neuere lokale Deltas | Erst endgültige gespeicherte Antwort ersetzt Live-Text; Navigation, Abschluss und Abbruch ohne doppelte Antwort geprüft |
| Gesprächsreihenfolge | Frage und Antwort bekommen denselben Zeitstempel; Zufalls-UUID entscheidet ihre Reihenfolge | Backend und Frontend sortieren nach Zeit, Anfrage, Rolle, ID. Zusätzlicher Orchestrator-Repro für zwei zeitgleiche Paare bestanden: Frage A, Antwort A, Frage B, Antwort B |
| KI-Kontext | Abgebrochene Aufgaben (`cancelled`) zählen serverseitig als offen | Ausschließlich `open` und `in_progress`; reale SQL-Regression und Gegenprobe gegen alte Funktion bestanden |
| Auth-Störung | Netzwerk-/Serverfehler erscheint als ungültige Anmeldung | Wiederholbarer 503 statt erzwungenem Logout; echte ungültige Anmeldung weiterhin 401, Abbruch gesondert |
| Start/Stop | Stop während Listenerstart kann auf ein nie eintretendes Ereignis warten | Startabbruch und gemeinsamer Abschluss; kein erneutes Listen nach Stop |
| Verbrauch bei Modellabweichung | Bekannte Verbrauchswerte gehen bei falschem Antwortmodell oder überschrittener Tokenzahl verloren | Tatsächliche Werte erreichen konservative SQL-Abrechnung; Antwort bleibt fehlgeschlagen, Reservierung/Sperre erhalten |
| Oberfläche und Tastatur | Überlappende Dokumentbedienung, überbreite Auswahl, abgeschnittene Namen, verlorener Fokus, unklarer Wartezustand | Mobil-/Tablet-/Desktop-Nacharbeit, vollständige Namen, Fokus nach Fehler/Abbruch, statischer Wartehinweis und eindeutige Datumsangaben |

Die zusätzliche Migration `20261006150000_phase1_context_order.sql` ersetzt ausschließlich `private.chat_prepare`. Die vorherigen sieben Migrationen und der Seed sind bytegleich zum Referenzstand. Der eigene Hosted-Bestand wurde vor der additiven Übernahme mit dem bisherigen Siebenerstand verglichen. Kein Reset oder Seed-Replay auf Hosted; Tabellen-/Storage-Besitz, RLS, Daten und Nullbudget erhalten. Der Vertrag ist jetzt v1.2; Pfade, Body-/SSE-Typen und Fehlercodes bleiben kompatibel.

## Tatsächlich durch den Orchestrator ausgeführt

Alle Befehle aus dem Projektordner, am 06.10.2026. Protokolle liegen ignoriert unter `.local/`; sie werden nicht mit Geheimnissen veröffentlicht.

| Prüfung | Ergebnis |
| --- | --- |
| `npm --prefix backend run typecheck` und `npm --prefix backend test` | Zunächst 92/92; nach letztem 2,5s-Handlerfix am **13:19:26 UTC** erneut strikte Typprüfung und **93/93 Tests** bestanden |
| `npm --prefix backend run check:phase1` | **13:06:17–13:06:33 UTC**, alle 16 Schritte bestanden: echter nativer Supabase-Start, acht Migrationen/Seed frisch, **501 SQL**, **22 Parallelfälle**, **18 Node-PG**, **31 Node-HTTP**, Typgenerierung, strikte Typen und **92 Backendtests** |
| Historische Kontextgegenprobe im Gesamtlauf | Alte Funktion zeigt genau zwei erwartete Fehler; Transaktion zurückgerollt, neue Funktion wiederhergestellt |
| `npm run check` auf finalem Frontend | **131/131 Tests** in 14 Dateien, strikte Typen, Lint, Build, Bundle-/Quellprüfung, **21 Proxy- und 14 Prozessprüfungen** bestanden |
| Direkter Node-Repro mit zwei zeitgleichen Frage-/Antwortpaaren | Beide Paare bleiben zusammen und beginnen mit der Frage |
| `npm --prefix backend run build` und `node backend/scripts/node-smoke.mjs --hosted --static` nach finalem Frontend-Build und letztem Handlerfix | **39/39 echte Hosted-Auth-/SQL-/Node-/Static-Prüfungen** erneut bestanden; eigener letzter Port 55552 anschließend geschlossen, PID 9271 beendet (vorheriger Lauf: Port 53269, PID 4032 ebenfalls beendet) |
| `npm --prefix backend run hosted:inspect` | Acht Migrationen, Struktur/Rechte gleich lokal, 25 App-Tabellen, TLS verifiziert, Storage-Owner/RLS erhalten, ein Workspace, null Auth-Nutzer, Nullbudget bestätigt |
| Bildberichte und tatsächliche Bildsichtung | 38 Vorher-/38 Nachher-Bilder sowie acht echte Login-Bilder; alle höchstens 1280×720. Nachher keine gemeldeten Layoutprobleme. Vier endgültige Nachher-Bilder persönlich geprüft, dazu vier Zwischenstände zur Fehlerkontrolle |
| Bereinigung und Geheimnisprüfung | Alle in den Bildberichten vermerkten eigenen Browser-/Wächter-/Dev-PIDs beendet; Projektports geschlossen. Keine tatsächlichen Datenbank-Zugangswerte in geänderten Dateien; Produkt-Bundle ebenfalls geprüft |

Der separate Agentenlauf fand zuvor **12:58:20–12:58:35 UTC** statt. Sein ursprüngliches Ergebnis ist zusätzlich unter `.local/backend-agent-phase1-audit-result.json` gesichert; `backend/.local/phase1-result.json` enthält den späteren unabhängigen Orchestratorlauf. Frontend-/Hosted-Protokolle: `.local/orchestrator-phase1-audit-frontend.log`, `.local/orchestrator-phase1-audit-hosted.log`. Cleanupbeleg: `.local/orchestrator-phase1-audit-cleanup.json`.

Der abschließende reine Handlerfix änderte keine Migration, Typform oder Oberfläche. Dafür wurden gezielt die gesamte Backend-Testgruppe, strikte Typen, Produktbuild und echte Hosted-/Static-Prüfungen erneut ausgeführt (`.local/orchestrator-phase1-audit-final-backend.log`); kein unnötiger weiterer Supabase-Reset. Der reale 501-SQL-Nachweis bleibt der Lauf von 13:06 UTC mit damals 92 Tests.

## Oberfläche und Bewertung

Der Frontend-Agent prüfte die echte nicht angemeldete App über `npm run dev`: **28/28** Fälle zu Login, geschützter Route, beiden Themes, lokaler E-Mail-Prüfung und Fokus; null Anfragen an fremde Dienste. Dashboard und Chat verwenden im Bildlauf synthetische Daten. Das ist kein erfolgreicher echter Login oder KI-Dialog.

| Screen/Ablauf | Vorher → nachher | Nachweisgrenze |
| --- | --- | --- |
| Login und Fehlerfokus | 7 → 9/10 | Echte nicht angemeldete App und UI-Tests; kein Kontologin |
| Dashboard und lange Namen | 6 → 9/10 | Tatsächlich gesichtete synthetische Bilder, Fehlerzustand und Datenadaptertests |
| Aufgaben am Telefon | 6 → 9/10 | Frontend-Bildpaar und Listenprüfungen |
| Dokumente am Telefon | 4 → 9/10 | Überdeckung im Ausgangsbild bestätigt, endgültiges korrigiertes Bild persönlich geprüft |
| Gesprächsliste | 7 → 9/10 | Vollständigkeit und Jahresangaben technisch geprüft |
| Verlauf, Navigation und Streaming | 5 → 9/10 | UI-/Adaptertests, Paar-Repro, synthetische Bilder |
| Langsame/abgebrochene Antwort | 7 → 9/10 | Fokus-/Abbruchtests, endgültiges Telefonbild persönlich geprüft |
| Leerer Bestand | 9 → 9/10 | Synthetischer Bildlauf |
| Tastatur und Sitzungswechsel | 6–7 → 9/10 | 30 Tab-Schritte auf zwei Breiten durch Frontend, gezielte Abbruchtests; kein Live-Screenreader |
| Serverkontext, Widerruf und Kostenabschluss | 8 → 9/10 | Neue reale SQL-/HTTP-Abnahme plus synthetische Adapter-/Handlerfehler; keine Providerrechnung |

Die Zahlen bewerten den jeweiligen geprüften Umfang, nicht die ausstehende echte Nutzbarkeit mit Konto/KI. Detaillierte Agentennoten und Dateilisten stehen in [Frontend-Randfälle](../frontend-phase1-randfaelle.md), [Backend-Randfälle](../backend-phase1-randfaelle.md) und [52-zeiligem Anforderungsabgleich](../phase1-anforderungsabgleich.md). Der unabhängige Matrixbericht endet zeitlich vor den finalen SQL-/Bildläufen; seine dort offenen SQL-Nachweise sind durch die obige Orchestratorabnahme geschlossen.

Endgültig gesichtete Beispiele: [Dokumente Telefon dunkel](../mocks/tagwerk/phase1-randfaelle/nachher/lang-dokumente-telefon-dunkel.png), [Dashboard breit dunkel](../mocks/tagwerk/phase1-randfaelle/nachher/lang-dashboard-breit-dunkel.png), [Dashboard Tablet hell](../mocks/tagwerk/phase1-randfaelle/nachher/lang-dashboard-tablet-hell.png), [Abbruch Telefon hell](../mocks/tagwerk/phase1-randfaelle/nachher/langsam-abgebrochen-telefon-hell.png).

## Einordnung sämtlicher Anforderungen

Phase 0 (Designauswahl) ist abgeschlossen. Phase 1 (Anmeldung, Grundgerüst, Themes, Dashboard, Textstreaming und Audit-Schreiben) ist technisch geliefert und Gegenstand dieser vertieften Prüfung. Das echte angemeldete Gespräch in beiden Themes fehlt weiterhin mangels Nutzerkonto/Mitgliedschaft und freigegebener KI-Konfiguration.

Phase 2 (Bestätigungskarten, schreibende Werkzeuge, mehrere Anbieter/Modellwechsel, Uploads, Editor, PDF/DOCX, menschliche Übergabe und Wissen), Phase 3 (Vorführpaket/Veröffentlichungsvorbereitung/Datenschutzcheckliste) und Phase 4 (abschließender Gesamtfeinschliff) sind planmäßig noch offen. Es wäre falsch, das gesamte Produkt bereits als fertig zu melden. Der unabhängige Bericht ordnet jede Einzelanforderung mit Code- und Testbelegen zu.

Weitere verbleibende Nachweisgrenzen: kein realer positiver Einstellungs-Speicher-/Resetflow mit Nutzerkonto, keine Live-Screenreader-/Safari-/iOS-Abnahme, keine warme CPU-Leerlaufmessung, keine echten langsamen Providerverbindungen. Die Seitenabfragen sind keine atomare Momentaufnahme gleichzeitig geänderter Bestände; das Verhalten am Hosted-PostgREST mit großem angemeldetem Bestand ist noch nicht real geprüft. Fehlende Nachweise werden nicht durch künstliche Funktionssperren ersetzt.

Eigene Browser und Server sind beendet; fremde Prüfbrowser/Server wurden nicht angefasst. Keine Konten, Providerkosten, Edge Functions, Veröffentlichung oder Git-Push. App und Backend bleiben striktes TypeScript (`.ts`/`.tsx`); `.mjs` dient überwiegend Start- und Prüfwerkzeugen. Eine pauschale Dateiumbenennung bringt keinen zusätzlichen Nutzernachweis.

**Selbstbewertung: 9/10.** Konkrete Fehler mit Gegenproben geschlossen und beide Lieferungen unabhängig geprüft; echte Anmeldung/KI und die oben genannten Geräte-/Laufzeitgrenzen bleiben ehrlich offen.
