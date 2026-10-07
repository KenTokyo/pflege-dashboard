# Abnahme: Text und OpenUI im Chat

Auftrag: [Original](../tasks/2026-10-07-chat-ansichten-enhanced-prompt.md), [Fortschritt](../tasks/2026-10-07-chat-ansichten-tasks.md).

## Entscheidung und Nutzen

Der zuvor verlinkte Dienst ist OpenUI. Die optionale Nachfrage nach OpenUI versus zusätzlichem OpenAI-Anbieter blieb zunächst unbeantwortet; die begründete Arbeitsannahme wurde im Chat genannt. DeepSeek über OpenCode und die manuell gewählte Gemini-Reserve bleiben Anbieter. Kein neues Anbieter-Konto oder Cloud-Gateway wird eingerichtet.

OpenUI eignet sich hier für vom Modell gegliederte Fallübersichten: kurze Antwort, Faktenzeilen, nächste Schritte und Hinweise. Der bestehende Chat wird um den Renderer mit eigenem Tagwerk-Katalog ergänzt. Eine vollständige fremde Chat-Shell würde bereits funktionierende Anmeldung, Quellen, Antwortspeicherung und technische Ablaufanzeige unnötig ersetzen. Allgemeine UI-Formulare, freie HTML-Ausführung und schreibende Werkzeuge gehören nicht zu diesem begrenzten Nur-Auskunft-Ausbau.

Quellen, geprüft am 07.10.2026: [Integration in vorhandene Apps](https://www.openui.com/docs/getting-started), [eigene Komponenten](https://www.openui.com/docs/openui-lang/defining-components), [Renderer und Fehler](https://www.openui.com/docs/openui-lang/renderer), [serverseitige Anweisungen](https://www.openui.com/docs/openui-lang/system-prompts). Die Quellen belegen die Bibliotheksfähigkeiten; sie ersetzen keinen Test unserer App.

## Akzeptanz

| Kriterium | Nachweis |
| --- | --- |
| Text/OpenUI direkt im Chat, per Tastatur bedienbar und nach Reload erhalten | Offen |
| Auswahl allein erzeugt keinen Anbieteraufruf und erhält den Entwurf | Offen |
| Neue OpenUI-Anfrage verwendet den ausgewählten bisherigen Anbieter und den serverseitigen Komponentenvertrag | Offen |
| Gespeicherte Textantworten, Quellen und historische Anbieter bleiben unverändert | Offen |
| OpenUI-Antwort als Komponenten oder vollständiger lesbarer Text, ohne zweiten Modellaufruf | Offen |
| Streaming, Abbruch, Formatfehler, Reload und Replay ohne Rohcode im normalen Antworttext | Offen |
| Keine still verworfenen Einschränkungen oder als ausgeführt dargestellten Aktionen | Offen |
| Fakten-/Schritte-/Hinweis-Komponenten für beide Chat-Einstiege | Offen |
| Fettdruck und Kursivschrift dezent mit Tagwerk-Akzent, weiterhin semantisch erkennbar | Quellregel ergänzt; Sichtprüfung offen |
| 390/768/1280 × 720, hell/dunkel, lange Namen und Inhalte ohne verdeckte Eingabe | Offen |
| Keine fremden Netzwerkaufrufe, selbstlaufende UI-Arbeit oder zurückgelassenen Prüfprozesse | Offen |
| Vercel-Produktion mit echter Antwort und erneutem Öffnen | Offen |

## Grenzen

Reine Darstellungsumschaltung ist keine erneute KI-Generierung alter Textantworten. Die vorhandene Mikrofonfunktion wird erhalten; die menschliche Sprachprobe aus der vorausgehenden Abnahme steht weiterhin aus. Sachbearbeiter-Test und Kundenansicht verwenden denselben angemeldeten Demo-Workspace, keine neuen Rollenrechte. Alle Testinhalte sind fiktiv.

## Datenbank und Backend vor Veröffentlichung

Backend-Owner: 17 Migrationen, 700 SQL-Assertions, 292 Backendtests, 31 HTTP/SQL-Prüfungen, 19 PostgreSQL-Abbruchprüfungen und 8+15 Parallelprüfungen bestanden. Historischer 13→17- sowie direkter 16→17-Upgrade jeweils 15 Prüfungen bestanden. Root hat Typprüfung, alle 292 Backendtests und den Backendbuild unabhängig wiederholt.

Root hat ausschließlich `20261007214239_openui_presentation.sql` in das eigene Hosted-Projekt übertragen. Vollständiger Strukturvergleich mit lokalem Gate bestanden, verifiziertes TLS, 17 Journalversionen, kein erneut eingespielter Seed. Alle bereits vorhandenen Zeilen der zwölf geprüften Tabellen sind anhand vorher gesicherter SHA-256-Werte unverändert: darunter 12 Gespräche, 27 Nachrichten, 13 Requests und 11 Nutzungszeilen. Das vorhandene Authkonto bleibt unverändert.

Hosted-Sicherheitsberatung ist gegenüber der vorigen Abnahme unverändert: drei INFO-Hinweise für absichtlich browserseitig gesperrte interne Tabellen ([RLS-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)) und der bereits vorhandene Auth-WARN zur [Prüfung kompromittierter Passwörter](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Keine Kontoeinstellung geändert.

Zwei echte direkte Gemini-OpenUI-Proben scheiterten nach wenigen Fragmenten. Die zweite kontrollierte Prüfung belegte Googles SSE-Fehler `503 UNAVAILABLE` wegen hoher Nachfrage. Das ist kein nachgewiesener Katalogfehler und keine Schlüsselablehnung. Der Anbieteradapter wurde samt gezielten Randfalltests so ergänzt, dass auch ein Fehler innerhalb des Streams verständlich als temporäre Nichtverfügbarkeit erscheint. Kein automatischer Anbieterwechsel oder stiller zweiter Modellaufruf. [Google: Behandlung temporärer API-Fehler](https://ai.google.dev/gemini-api/docs/troubleshooting).

## Abschlussprüfung vor dem Deploy

Frontend gesamt: 243 Tests in 21 Dateien, Typprüfung, Lint und Produktbuild bestanden. Quellprüfung: 71 Dateien, 46 Kontrastpaare. Bundleprüfung: 36 Dateien / 1374 KiB; fünf nicht öffentliche konfigurierte Werte kommen im Browserbundle nicht vor. Unabhängige Querverbindungsprüfung ohne offene Befunde: [Bericht](../chat-ansichten-unabhaengige-pruefung.md).

Backend gesamt: 292 Tests. Tatsächliche Vercel-Paketierung mit dem installierten Builder 21.0.0: 20 Prüfungen und 1220 Pfadassertions; alle vier gebauten Einstiege importiert und HTTP-Verhalten geprüft. Der temporäre Paketspiegel liegt außerhalb des beobachteten Repos und wird in finally entfernt.

Root-Browserlauf: 109 Prüfungen bestanden, sechs Kombinationen aus 1280/768/390 × 720 und hell/dunkel. Erfasst: Tastatur, erhaltene Entwürfe, null zusätzliche Requests beim Umschalten, vollständiger Hinweistext, Textprojektion, gespeicherte Auswahl nach Neuladen, ungültige Darstellung ohne Ausführung, Abbruch trotz Umschalten, keine Laufzeitfehler und keine Fremdnetzaufrufe. Testdaten und Anbieterantworten dieses Durchlaufs sind ausdrücklich synthetisch.

Sichtprüfung und Nacharbeit: Vor Nacharbeit Desktop 9/10, Tablet 8/10 (isolierte Archivzeile), Mobil 7,5/10 (zu hoher Kopf). Danach Desktop 9/10, Tablet 9/10 und Mobil 9/10: Schalter beim Eingabefeld, subtile Trenner, einheitliche Akzente, lange Texte umbrechend und alle Bedienziele erreichbar. Gemessener Gesprächskopf: 94px am Desktop, 140px am Tablet, 158px mobil. Persönliche gestalterische Bewertung, keine gemessene Nutzerzufriedenheit. Screenshots: [Desktop dunkel](2026-10-07-chat-ansichten/openui-1280-dark.png), [Desktop hell](2026-10-07-chat-ansichten/openui-1280-light.png), [Tablet](2026-10-07-chat-ansichten/openui-768-light.png), [Mobil](2026-10-07-chat-ansichten/openui-390-dark.png).

Prüfbrowser: Chrome for Testing 155.0.8059.40. Letzter eigener Browser PID 55087 samt drei Kindprozessen und Wächter beendet; eigener Aufnahmeserver geschlossen. Kein persönlicher Browser gestartet. Keine unendlichen Animationen in den getesteten ruhenden Ansichten. Daraus folgt kein ausführlicher CPU-Langzeitnachweis.
