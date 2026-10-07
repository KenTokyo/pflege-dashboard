# Chat-Ansichten

## Initial goal

[Original und Arbeitsauftrag](2026-10-07-chat-ansichten-enhanced-prompt.md).

## 1. Konzept und Vertrag

Ziel: Echte Komponentenansicht mit bestehendem Anbieter und gewähltem Designsystem.

- [x] Bestehenden Chatrenderer, Providerweg und Nutzerreferenz prüfen.
- [x] Offizielle OpenUI-Integration und Alternativen bewerten; begrenzten Komponenten-/Antwortvertrag festlegen.
- [x] Umsetzung und Nachweisgrenzen für beide Einstiegspfade festhalten.

Referenz: Nutzerbild vom 07.10.2026 mit Martha-Antwort und vorhandene Tagwerk-Komponenten `src/routes/chat/ThreadHead.tsx`, `src/chat/Markdown.tsx`. Ruhige 14–16px-Antwortschrift, begrenzte Textbreite, flache Gruppen, bestehende Lavendel-Akzente; keine neue Kartenverschachtelung. Offizielle OpenUI-Quellen: https://www.openui.com/docs/getting-started und https://www.openui.com/docs/openui-lang/defining-components (07.10.2026). Vor Layoutumsetzung wird eine tatsächliche professionelle Komponentenreferenz ausgewertet.

Referenzprüfung: OpenUI-Startseite am 07.10. im verbundenen Hintergrundbrowser betrachtet; der sichtbare Vergleich trennt normale Textantwort und strukturierte Antwort innerhalb desselben Chatkontexts. Zusätzlich die tatsächlichen `StatCard`-/List-/Root-Komponentendefinitionen der offiziellen Dokumentation gelesen. Übernommen werden Hierarchie und begrenzte wiederverwendbare Bausteine, nicht Marketinglayout/Schrift. Tagwerk-Maße bleiben verbindlich: 44px Bedienziele, 16px mobiles Padding, 8–12px innerhalb Gruppen und 24px zwischen Abschnitten; dunkles/helles Theme, ruhende Zustände ohne Dauerschleifen. Recherche-Tabs geschlossen.

Entscheidung: Echter OpenUI-Renderer mit kleinem eigenen Nur-Lesen-Katalog (Antwort, Text, Fakten, Schritte, Hinweis). Keine neue Chat-Shell, kein zusätzlicher KI-Anbieter und kein Cloud-Gateway. `responseFormat` ist optional und bleibt standardmäßig `text`. Neue OpenUI-Antworten speichern eine versionierte Darstellung getrennt vom lesbaren Antworttext. Eigener SSE-Darstellungsstrom, normale Textdeltas bleiben kompatibel. Die Auswahl ändert die nächste Anfrage; ein reiner Ansichtswechsel erzeugt keinen Modellaufruf. Bereits gespeicherte normale Antworten bleiben vollständig lesbar. Quellen, Warnungen und tatsächliche Anbieterkennzeichnung bleiben außerhalb der optionalen Darstellung sichtbar. Beide Rollen-Einstiege benutzen denselben Chat. Keine Rollenrechte, Datenänderungen oder Erstellungswerkzeuge werden ergänzt.

## 2. Umsetzung

Ziel: Umschaltung, farbige Betonung und zuverlässige KI-Komponenten.

- [x] Normale Markdownbetonung in beiden Themes farblich verbessern.
- [x] Zugänglichen Ansichtsschalter mit erhaltenen Entwürfen und stabilen Antworten ergänzen.
- [x] Strukturierte Fakten, Schritte und Hinweise aus tatsächlicher Modellantwort; Quellen, Warnungen und Textansicht erhalten.
- [x] Streaming, Speicherung/Reload, Fehler und bestehende Gespräche berücksichtigen.

Verantwortung: Frontend-Agent besitzt App-Oberfläche und Paketdateien. Backend-Agent besitzt Backend, gemeinsame Typen und API-Vertrag. Staff-Agent prüft unabhängig read-only. Root dokumentiert, integriert, prüft und veröffentlicht. Fremde `.gitignore` bleibt unangetastet.

## 3. Abnahme und Veröffentlichung

Ziel: Auf der bestehenden Vercel-URL vorführbar.

- [x] Passende Node-/Vertrags-/Sicherheitsprüfungen, Build und Bundlecheck.
- [x] Dark/Light, 390/768/1280px, Tastatur, lange Inhalte, beide Einstiegspfade; keine eigenen dauerhaften Prüfprozesse.
- [x] Geprüfte Änderungen gezielt committen/pushen, Deployment prüfen.
- [x] Echter Live-Chat mit Komponenten, Textwechsel und Reload; ehrliche Grenzen dokumentieren.
