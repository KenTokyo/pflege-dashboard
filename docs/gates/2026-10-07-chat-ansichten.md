# Abnahme: Text und OpenUI im Chat

Auftrag: [Original](../tasks/2026-10-07-chat-ansichten-enhanced-prompt.md), [Fortschritt](../tasks/2026-10-07-chat-ansichten-tasks.md).

## Entscheidung und Nutzen

Der zuvor verlinkte Dienst ist OpenUI. Die optionale Nachfrage nach OpenUI versus zusätzlichem OpenAI-Anbieter blieb zunächst unbeantwortet; die begründete Arbeitsannahme wurde im Chat genannt. DeepSeek über OpenCode und die manuell gewählte Gemini-Reserve bleiben Anbieter. Kein neues Anbieter-Konto oder Cloud-Gateway wird eingerichtet.

OpenUI eignet sich hier für vom Modell gegliederte Fallübersichten: kurze Antwort, Faktenzeilen, nächste Schritte und Hinweise. Der bestehende Chat wird um den Renderer mit eigenem Tagwerk-Katalog ergänzt. Eine vollständige fremde Chat-Shell würde bereits funktionierende Anmeldung, Quellen, Antwortspeicherung und technische Ablaufanzeige unnötig ersetzen. Allgemeine UI-Formulare, freie HTML-Ausführung und schreibende Werkzeuge gehören nicht zu diesem begrenzten Nur-Auskunft-Ausbau.

Quellen, geprüft am 07.10.2026: [Integration in vorhandene Apps](https://www.openui.com/docs/getting-started), [eigene Komponenten](https://www.openui.com/docs/openui-lang/defining-components), [Renderer und Fehler](https://www.openui.com/docs/openui-lang/renderer), [serverseitige Anweisungen](https://www.openui.com/docs/openui-lang/system-prompts). Die Quellen belegen die Bibliotheksfähigkeiten; sie ersetzen keinen Test unserer App.

## Akzeptanz

| Kriterium | Nachweis |
| --- | --- |
| Text/OpenUI direkt im Chat, per Tastatur bedienbar und nach Reload erhalten | Bestanden: automatisierte Prüfungen und unten dokumentierte Liveabnahme |
| Auswahl allein erzeugt keinen Anbieteraufruf und erhält den Entwurf | Bestanden: automatisierte Prüfungen und unten dokumentierte Liveabnahme |
| Neue OpenUI-Anfrage verwendet den ausgewählten bisherigen Anbieter und den serverseitigen Komponentenvertrag | Bestanden: automatisierte Prüfungen und unten dokumentierte Liveabnahme |
| Gespeicherte Textantworten, Quellen und historische Anbieter bleiben unverändert | Bestanden: automatisierte Prüfungen und unten dokumentierte Liveabnahme |
| OpenUI-Antwort als Komponenten oder vollständiger lesbarer Text, ohne zweiten Modellaufruf | Bestanden: automatisierte Prüfungen und unten dokumentierte Liveabnahme |
| Streaming, Abbruch, Formatfehler, Reload und Replay ohne Rohcode im normalen Antworttext | Bestanden: automatisierte Prüfungen und unten dokumentierte Liveabnahme |
| Keine still verworfenen Einschränkungen oder als ausgeführt dargestellten Aktionen | Bestanden: automatisierte Prüfungen und unten dokumentierte Liveabnahme |
| Fakten-/Schritte-/Hinweis-Komponenten für beide Chat-Einstiege | Bestanden: automatisierte Prüfungen und unten dokumentierte Liveabnahme |
| Fettdruck und Kursivschrift dezent mit Tagwerk-Akzent, weiterhin semantisch erkennbar | Bestanden: beide Themes, semantischer Fettdruck/Kursivschrift und sichtbarer Akzent |
| 390/768/1280 × 720, hell/dunkel, lange Namen und Inhalte ohne verdeckte Eingabe | Bestanden: automatisierte Prüfungen und unten dokumentierte Liveabnahme |
| Keine fremden Netzwerkaufrufe, selbstlaufende UI-Arbeit oder zurückgelassenen Prüfprozesse | Bestanden: automatisierte Prüfungen und unten dokumentierte Liveabnahme |
| Vercel-Produktion mit echter Antwort und erneutem Öffnen | Bestanden: automatisierte Prüfungen und unten dokumentierte Liveabnahme |

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

## Echte Liveabnahme am 08.10.2026

App-Meilenstein `0c74cad` wurde über main veröffentlicht. Vercel-Deployment `BGFsYsDDdw4efxrFuQuoqv8Cou8o` meldet Ready; öffentliche Assetnamen stimmen vollständig mit dem lokalen Produktbuild überein, `/api/health` antwortet `{ok:true}`.

Im bestehenden angemeldeten Testkonto wurde über die Kundenansicht das Gespräch „Vorführung · Martha als Fallübersicht“ angelegt: `1720e5ea-76fa-4c8d-b814-93028253b8cc`. Echte DeepSeek-OpenUI-Antwort abgeschlossen, vom Anbieter gemeldetes Modell `deepseek-v4.1-flash`. Erster Text bei 1,51s, Speicherung ab 5,10s. Gespeichert: 1723 Zeichen kanonischer Text, gültige Darstellung mit Text/Facts/Steps/Notice/Notice; serverseitig erneut geparste Textprojektion ist exakt gleich. Nutzungszeile einmalig mit 1744 Eingabe- und 533 Ausgabetokens.

Wechsel OpenUI→Text lieferte die vollständigen gleichen Informationen, einschließlich beider Hinweise, ohne zusätzlichen Chatrequest. Danach echte normale Textfolgeantwort abgeschlossen: 227 Zeichen, Format text, keine Präsentationsdaten, 1369/70 Tokens, genau eine zweite Nutzungszeile. Nach Wechsel auf OpenUI und normalem Neuladen bleiben Anmeldung, Auswahl, strukturierte erste Antwort und normale zweite Antwort erhalten.

Aufklappbarer Ablauf zeigt sechs tatsächlich gemeldete Schritte sowie Thinking-Konfiguration deaktiviert. Die Konfiguration wird korrekt angezeigt, keine internen Gedankeninhalte behauptet. Ein im Live-JSON gefundener Verlust der beiden neuen Metadaten responseFormat/catalogVersion durch den Frontendfilter wurde in `449aea1` gezielt korrigiert, in elf Activity-Tests sowie im tatsächlichen Live-JSON geprüft. Beide neuen Felder sind sichtbar; unbekannte Werte bleiben ausgeschlossen.

Dritte direkte Gemini-Probe nach zeitlichem Abstand bestätigt erneut Google 503 UNAVAILABLE; der korrigierte Adapter liefert nun PROVIDER_UNAVAILABLE. Gemini-OpenUI ist deshalb weiterhin ohne erfolgreichen Liveabschluss, DeepSeek-Text und DeepSeek-OpenUI sind tatsächlich erfolgreich abgeschlossen.

Auch der zweite Einstieg ist live geprüft: Sachbearbeiter-Test → Martha-Fall → gespeichertes Gespräch öffnet dieselbe vollständige OpenUI-Antwort. Die echte Nutzungsübersicht aktualisiert sich auf die neuen abgeschlossenen Anfragen; Beispielgespräche und echte KI-Aufrufe bleiben getrennt gezählt. [Echter Live-Ausschnitt mit Schalter und Mikrofon](2026-10-07-chat-ansichten/live-openui-dark.png).

Bereinigungskontrolle: eigene CfT-PIDs 48277 und 55087 existieren nicht mehr; Port 5199 ist frei. Ein parallel laufender fremder Prüfbrowser gehört laut Prozessverzeichnis zu einem anderen Spieleprojekt und wurde nicht verändert.

## Weiterer Live-Randfall: erneuter Formatwechsel

Die dritte Anfrage im selben Verlauf wechselte nach einer normalen Textantwort wieder auf OpenUI. DeepSeek lieferte reines Markdown (122 Ausgabetokens) statt Komponenten. Die App erhielt und zeigte 374 Zeichen, markierte die Darstellung korrekt als invalid und den Request als failed; genau eine Nutzungszeile wurde angelegt, kein automatischer Retry. Dieser Befund war das zusätzliche Nacharbeitsgate; Korrektur und erfolgreicher Nachtest sind unten dokumentiert. Request: `165ede52-2e1b-4ff5-a921-ce7f34ad6a1f`.

### Korrektur der Formatbindung

Der erzeugte Standardprompt der Bibliothek empfahl Referenzen/Hoisting, während unser Katalog nur Inline-Literale erlaubt. Er wurde durch einen kurzen eindeutigen Prompt mit genau fünf Signaturen ersetzt. Außerdem erhält der Anbieter direkt vor der letzten echten Nutzerfrage eine vertrauenswürdige Systemanweisung zum aktuell gewählten Format. Alle bisherigen Texte und die aktuelle Frage bleiben unverändert. Gemini nutzt seine getrennte systemInstruction ohne unzulässige Systemrollen in contents.

Die Bindung ist bereits vor Reservierung Teil des unveränderlichen Kontext-Snapshots; ihre zusätzliche Transportkopie passt einschließlich UTF-8/JSON unter die bestehende 4096-Byte-Reserve. Kein automatischer Wiederholungsaufruf, kein Anbieterwechsel und keine neue Migration. Backend: 304 Tests einschließlich zwölf neuer Formatwechsel-/Requestbody-/Zählungsfälle bestanden. Root: Frontend-Typprüfung, Produktbuild, Bundleprüfung und 34 OpenUI-/Activityfälle bestanden. Der erneute Livebeleg steht im folgenden Abschnitt.

### Wiederholung auf dem korrigierten Live-System

`de7fb2d` ist Ready und öffentlich ausgeliefert (Assets stimmen mit Produktbuild überein). Derselbe zuvor fehlgeschlagene Inhalt wurde über „Neu senden“ im selben Gespräch erneut geprüft, nicht in einem leeren Verlauf. Request `452fc128-a91a-401f-af9f-79150a74db79`: completed, 243 Zeichen, gültige Facts/Notice-Darstellung, kanonische Projektion identisch, Anbieter deepseek-v4.1-flash, 2568/94 Tokens und genau eine Nutzungszeile. Erster Text nach 61,61s, Speicherung ab 62,14s. Beobachtete Anbieterwartezeit, kein Nachweis eines Formatfehlers; die Oberfläche zeigt den aktiven Zustand und die tatsächliche Dauer.

Die zusätzliche Systemrolle ist für DeepSeek ausdrücklich dokumentiert: [System messages mid-conversation](https://api-docs.deepseek.com/guides/tool_calls/). OpenCodeGo dokumentiert den kompatiblen Endpoint; der vorgenannte erfolgreiche Realaufruf ist der konkrete Integrationsnachweis für unseren Weg.

Auch der anschließende zweite Wechsel in demselben Verlauf ist erfolgreich: Request `2be95d26-02fd-489e-b718-2a58317513db` completed/text, 198 Zeichen, 1995/59 Tokens; danach `b59b4fa9-20af-40c1-9455-dd273e9bd7c7` completed/OpenUI mit Steps/Notice, 370 Zeichen, 2786/121 Tokens. Beide einmalig in der Nutzungsaufzeichnung, OpenUI-Textprojektion erneut identisch. Damit ist der konkrete Verlauf OpenUI → Text → OpenUI nach der Korrektur bis zum Ergebnis geprüft.

Der gemischte Prüfverlauf wurde über die Oberfläche in „Prüfung · Text und OpenUI im Wechsel“ umbenannt und archiviert. Fehler und erfolgreiche Nachtests bleiben darin erhalten, keine Nachrichten gelöscht. Ein eigenes sauberes Vorführgespräch wird getrennt bereitgestellt.

## Abgeschlossener Vorführstand

Sauberes Gespräch: [Vorführung · Martha als Fallübersicht](https://pflege-dashboard-puce.vercel.app/gespraeche/26812b83-3c1b-4f3f-af0c-4c4d65920590). Tatsächliche DeepSeek-Antwort mit genau drei Fakten, zwei Schritten und Hinweis; completed, 652 Zeichen, gültige Text/Facts/Steps/Notice-Darstellung und identische kanonische Textprojektion. Request `56a14d2f-b211-4fb9-b5e1-9c2e32ad160e`, 1866/246 Tokens, eine Nutzungszeile. Normales Neuladen erhält Anmeldung, OpenUI-Auswahl und alle Abschnitte ohne neuen KI-Aufruf. [Sichtnachweis](2026-10-07-chat-ansichten/live-openui-vorfuehrung.png), gestalterische Abschlussbewertung 9/10.

Finaler Appstand `de7fb2d`: Vercel Ready, öffentliche Assets gleich dem lokalen Build; lokale und öffentliche Gesundheitsschnittstelle jeweils ok. Lokaler eigener Entwicklungsserver wurde mit dem aktuellen Backend neu gestartet und bleibt absichtlich für die Anwendung aktiv. Sämtliche eigenen Prüftabs geschlossen; Browser-Sitzungsliste leer. Eigene Aufnahmebrowser/-server waren schon bereinigt. Fremde `.gitignore`-Änderung blieb unberührt und ungestagt.

Ergebnis: angefragte Text-/OpenUI-Ansichten samt Farben und tatsächlichem gemischtem Liveablauf abgenommen. Konkrete verbleibende Grenzen: Google-Gemini lieferte bei diesen OpenUI-Proben 503 wegen Nachfrage; menschliche Mikrofonprobe ist weiterhin nicht durchgeführt. Anbieterantwortzeiten schwanken, ein geprüfter OpenCode-Aufruf benötigte rund 62 Sekunden. Es gibt keinen Nachweis, dass jede künftige Modellausgabe das Format einhält; ungültige Ausgaben behalten deshalb sichtbar ihre Textfassung und werden nicht als vollständige Komponentenantwort ausgegeben.
