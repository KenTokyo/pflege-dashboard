# Gemini und OpenCode: echte Liveabnahme

## Initial goal

Auftrag: [Original und Arbeitsauftrag](2026-10-07-gemini-live-enhanced-prompt.md).

## Diagnose und Anschluss

- [x] Lokalen Fehler und Vercel getrennt prüfen, aktuelle Anbieter-Dokumentation abgleichen.
- [x] Gemini mit dem ausdrücklich bereitgestellten Schlüssel ausschließlich serverseitig anbinden; für die Vorführung als nutzbare Alternative bereitstellen.
- [x] Bestehenden OpenCode-Go-Anschluss prüfen und belegte Fehler beheben; keine CLI-Abhängigkeit oder Providerverwechslung.
- [x] Vorhandene Sitzungs-, Kontext-, Streaming- und Zugriffsregeln erhalten; angemessene Fehlerfälle prüfen.

## Veröffentlichung und Abschluss

- [x] Backend und Frontend unabhängig prüfen; notwendige Datenbankänderungen zunächst lokal prüfen.
- [x] Geschützte lokale/Vercel-Konfiguration einrichten, geprüfte Dateien gezielt committen und hochladen.
- [x] Echte Oberfläche auf Vercel: Anfrage, Folgefrage, Datenbezug, Speicherung/Neuladen und beide Themes prüfen.
- [x] Prüfprozesse schließen, Ergebnis und verbleibende Grenzen dokumentieren.

Verantwortung: Root integriert, richtet Hosting ein, prüft und veröffentlicht. Backend-Agent besitzt Backend/API/Schema/Typen, Frontend-Agent besitzt Oberfläche und ihre Tests. Keine fremde bestehende .gitignore-Änderung übernehmen. Kein Start weiterer Produktphasen.

## Ausdrücklich erweiterter Demoauftrag

- [x] DeepSeek Standard erhalten; Gemini nur manuell wählbare Reserve.
- [x] Aktiven Denk-/Schreibzustand und aufklappbare echte Ablaufdaten einschließlich bereinigtem JSON zeigen.
- [x] Fragen-Dialog und Dashboardflächen nach Tagwerk verbessern, Grenzen subtil und Farbe gezielt einsetzen.
- [x] Deutsche Spracheingabe samt Stop, Wiederaufnahme nach normalen Browserpausen, Fehlern und Bereinigung prüfen.
- [x] Sichtwechsel Kundenansicht/Sachbearbeiter-Test mit echten Supabase-Analytics, Fällen, Aufgabenpriorisierung und KI-Einstiegen.
- [x] Sichere anfragebezogene Arbeitsansicht nach OpenUI-Vorbild; tatsächliche Fähigkeiten kenntlich machen.
- [x] Zusätzliche fiktive Daten idempotent einspielen, bestehende Nutzerinhalte und Konten erhalten.
- [x] Akzeptanzkriterien, schmale/helle/dunkle Oberfläche, Liveabläufe, Tastatur und Nachweisgrenzen dokumentieren.

Neue Arbeitsteilung: dritter Agent besitzt ausschließlich neue Sachbearbeiter-Dateien, eigene Styles/Tests und abgesprochene Router-/Navigationsintegration. Vorhandene Chat-/Dashboard-/Dialogdateien bleiben beim Frontend-Agenten, Schema/Analytics/Seed beim Backend-Agenten. Root besitzt allein die Browserabnahme und Hosted-Änderungen. Die vom Nutzer ausdrücklich hinzugefügten Funktionen ersetzen die frühere Grenze nur in diesem konkreten Umfang.

Zwischenergebnis: Lokale Konfiguration hatte keinen Providerkey. Gemini-Schlüssel geschützt lokal und als Vercel-Production-Secret gespeichert. Google gemini-3.8-flash beantwortet echten normalen und gestreamten Test mit STOP. Separater echter Vercel-DeepSeek-Test am 07.10. abgeschlossen, 875 Zeichen, 724/283 Tokens, genau eine Ledgerzeile; Reload mit erhaltenem Zugang/Antwort und ohne Fehler bestätigt. Keine CLI ist für den Online-Chat erforderlich.

Abschluss: siehe [Liveabnahme](../gates/2026-10-07-demo-ausbau.md). Echte Vercel-Antworten beider Anbieter und lokaler Gemini-Aufruf bestanden, bestehende Daten erhalten. Mikrofonabläufe automatisiert geprüft; menschliche Sprachprobe angefragt und bis zur Rückmeldung offen.
