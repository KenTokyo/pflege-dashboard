# Sachbearbeiter-Test: Arbeitsansicht und Abnahme

## Auftrag und Umfang

Stand 07.10.2026. Ergänzung des ausdrücklich erweiterten [Demoauftrags](tasks/2026-10-07-gemini-live-enhanced-prompt.md). Der Wechsel zur Sachbearbeitung ist eine Ansicht desselben angemeldeten Demo-Arbeitsbereichs. Er verändert weder Login, Mitgliedschaft noch Berechtigungen. Nur fiktive Pflegedaten; Nutzungszahlen stammen ausschließlich aus gespeicherten echten Aufrufen.

## Referenz und Gestaltung vor der Umsetzung

Gelesen: aktuelle `src/components/Shell.tsx`, `src/routes/DashboardPage.tsx`, `src/routes/chat/NewConversationDialog.tsx`, `src/styles/tokens.css`, `src/styles/app.css`. Gesehen: `docs/mocks/tagwerk/phase1-randfaelle/vorher/lang-dashboard-breit-hell.png` (1280 × 720). Das ist eine bestehende Referenz, kein Nachweis der neuen Ansicht.

Referenz [OpenUI](https://www.openui.com/), am 07.10.2026 gelesen: eigene vordefinierte Komponenten mit aktuellen Daten verbinden; keine freie Codeausführung. Die Umsetzung heißt ausdrücklich **Filteranfrage**. Ein kleiner lokaler Parser setzt Person, Ansicht und Sortierung; er ist kein generatives Modell. Die echte KI bleibt über „KI fragen“ erreichbar. Keine Installation eines zusätzlichen UI-Frameworks.

Tagwerk beibehalten: Bricolage Grotesque für Titel, Atkinson Hyperlegible Next für Inhalt, gemeinsames helles/dunkles Tokensystem. 28px Seitentitel, 17–18px Abschnittstitel, 14–16px Inhalt, mindestens 12px Hinweise. Flache Arbeitslisten statt verschachtelter Karten. 24px zwischen Abschnitten, 8–12px innerhalb von Gruppen, mobil 16px Außenabstand. Aktionen mindestens 44px hoch. Farbige Akzente beziehen sich auf Fall, Dringlichkeit oder Nutzung; Primäraktionen folgen dem vorhandenen Akzent. Unter 768px Details als Vollbilddialog mit festem Kopf/Fuß und genau einem Scrollbereich. Lange Personennamen umbrechen.

## Akzeptanzkriterien

- [x] Direkter Wechsel Kundenansicht ↔ Sachbearbeiter-Test, auch nach Anmeldung über einen geschützten Direktlink (DOM-Test mit echter App-Sitzungslogik, synthetischem Transport).
- [x] Keine Änderung von Authentifizierung, Workspace oder Rolle; keine erfundenen Kontakte/Anmeldungen.
- [x] Fälle/Aufgaben nutzen bestehende vollständige Supabase-Abfragen. Gesprächszahlen/Modellnutzung lesen `staff_overview`; kein Produkt-Fallback auf Prüfdaten. Echter Hosted-RPC-Nachweis liegt beim Backend/Orchestrator.
- [x] Aufgaben nach Frist/Priorität und Fälle nach Gesprächszahl sortierbar. Personen- und Dringlichkeitsfilter zurücksetzbar.
- [x] Filteranfrage erzeugt nur unterstützte feste Ansichten und zeigt die erkannte Auswahl; unbekannte/mehrdeutige Personen ergeben eine verständliche Meldung.
- [x] „Fall öffnen“ zeigt gespeicherte Angaben, Aufgaben, Dokumente und Gespräche; „KI fragen“ öffnet den echten Gesprächsdialog mit dieser Person, ohne automatische Anfrage.
- [x] Lade-, Leer-, Fehler- und laufende Aktualisierungszustände; Fehler werden nie als Null ausgegeben.
- [x] Tastaturbedienung, sichtbarer Fokus, Escape/Fokusrückkehr in Dialogen, keine verschachtelten interaktiven Elemente.
- [x] 390px, 768px und 1280 × 720, beide Themes, langer Name, keine waagerechten Überläufe; andere Akzentfarbe erhalten.
- [x] Abmeldung verwirft Daten; kein Polling oder dauernde Animation; keine eigenen Browser/Server gestartet, Prüfprozesse beendet.

## Prüfstand

Die Umsetzung ist fertig. Hauptdateien: `src/routes/StaffPage.tsx`, `src/staff/`, `src/styles/staff.css`. Die abgesprochenen Verbindungen liegen in Router, Rücksprungziel, Shell sowie `getStaffOverview` am bestehenden Backend-Port. Die SQL-Funktion und `types/staff.ts` gehören dem Backend-Agenten.

Prüfungen am 07.10.2026:

- `npm run typecheck`: bestanden.
- `npm run lint`: gesamtes Projekt bestanden; nach letzten eigenen Änderungen betroffene Dateien nochmals bestanden.
- `npm test`: 216/216 bestanden. Anschließend zusätzlicher positiver Nutzungsfall und kompakter, standardmäßig eingeklappter Anfragebereich: gezielter Lauf 13/13 bestanden. Gemeinsames finales Gesamtergebnis dokumentiert der Orchestrator.
- `npm run check:source`: 64 Quelldateien, 46 gemeinsame Kontrastpaare, kein Polling/Endlosanimation, Schrift mindestens 12px: bestanden.
- DOM-Fälle: Mitgliedrolle bleibt erhalten; geschützter Direktlink; Hin-/Rücknavigation; offene Aufgaben nach Frist/Priorität, kombinierte Personen-/Dringlichkeitsfilter, mehrdeutige/unbekannte Namen, Schreibbefehle und freie Fragen abgewiesen; keine automatische KI-Anfrage; Fall → neues Gespräch übernimmt Person; Fehler/Aktualisierung/leer/Abmeldung; vorhandene Beispieldialoge zählen nicht als echte KI-Aufrufe; gelieferte Tokenwerte unverändert, keine erfundenen Kosten.
- Ein im gemeinsamen Lauf gefundener Testablauffehler wurde behoben: der Navigationstest wartet nach Kundenwechsel jetzt auf den tatsächlichen Seiteninhalt statt nur auf die bereits geänderte URL.

Die Filteranfrage ist standardmäßig eingeklappt, damit Fallliste und Fristen auf dem Laptop früh sichtbar werden. Der Klick auf „Arbeitsansicht per Anfrage“ zeigt Eingabe und drei bearbeitbare Beispiele. Das ist eine lokale Filtergrammatik, keine generierte KI-Oberfläche.

## Browserübergabe und Grenzen

Browserabnahme liegt beim Orchestrator; dieser Agent hat keinen Browser gestartet. Vorbereitetes Szenario: `/sachbearbeitung?szenario=staff` im bestehenden Vite-Harness (`vite.harness.config.ts`). Es enthält sechs rein synthetische Personen, zwölf Aufgaben, einen sehr langen Namen, Null-KI-Nutzung und eine normale Mitgliedrolle. Die Datei `tests/support/staffScenario.ts` gelangt nie in den Produkt-Build. Anmelden über den vorhandenen synthetischen Harness-Zugang; kein echtes Konto. Alternativ `szenario=leer` und `szenario=lang`.

Noch wirklich zu sehen: 390px, 768px, 1280 × 720; hell/dunkel/abweichender Akzent; nativer Dialog mit Fokusfalle und Fokusrückkehr; auf-/zugeklappte Filteranfrage, lange Namen, keine Überläufe; echte Vercel-Daten plus Fall-/Chat-Einstieg. JSDOM emuliert keinen Browser-Top-Layer und meldet sein nicht implementiertes `scrollTo`; Tests belegen daher keine visuelle Endabnahme.

Bewertung vor/nach: Funktion vorher nicht vorhanden; Logik und DOM-Vertrag nach Nacharbeit **9/10 im geprüften Umfang**. Visuelle Qualität für Übersicht, Filteranfrage und Fall-/Gesprächsfluss **noch nicht bewertet**, bis der Orchestrator die echten Bilder prüft. Keine unbesehen behauptete 9/10.

## UI-Politur nach better-ui

| Schwere | Ort | Vorher | Nachher | Grund |
| --- | --- | --- | --- | --- |
| Mittel | `src/styles/staff.css` | Neue Ansicht fehlte | Bestehende Schrift/Tokens, strukturierende schwache Trenner, 44px-Aktionen | Gemeinsames System, klare Arbeitszeilen |
| Mittel | `src/routes/StaffPage.tsx` | Ausführliche Anfragefläche hätte die Fälle unter den sichtbaren Bereich gedrängt | Native, standardmäßig geschlossene Anfragefläche | Hauptaufgabe zuerst |
| Niedrig | `src/styles/staff.css` | Neue Interaktionszustände fehlten | Benannte 150ms-Übergänge, scale(0.96) bei Druck, reduzierte Bewegung statisch | Unterbrechbare kurze Rückmeldung |

Quellzustände geprüft: Standard, Fokus, Hover/Pressed, Lade-/Leer-/Fehlerstatus, reduzierte Bewegung. **Approve für Quell-/DOM-Umfang. Not verified: Browserdarstellung, native Fokusfalle, Live-RPC.**

## Unabhängige Root-Abnahme

91 Browserprüfungen bei 390 / 768 / 1280 × 720 in beiden Themes mit sechs synthetischen Fällen bestanden. Alle acht Layoutbilder einzeln geprüft; Ansicht/Fall-Dialog jeweils 9/10. Anschließend echte Vercel-Abnahme mit bestehendem normalem Mitglied und tatsächlichen Supabase-Daten: sechs Fälle, zwölf Aufgaben; Nora öffnen, direktes KI-Gespräch, zwei DeepSeek-Antworten und bewusst gewählte Gemini-Antwort erfolgreich. Filteranfrage zu Nora, Rücksetzen und beide Themes live geprüft. Kennzahlen aktualisieren auf tatsächlich acht erfolgreiche Aufrufe nach zusätzlichem lokalen Gemini-Test. Keine Rollenänderung, keine erfundene Nutzung. Abmeldung/Datenverwerfen durch bestehende automatisierte Authprüfungen belegt; menschlichen Browser nicht zur erneuten Passworteingabe abgemeldet. Einzelbelege und Restgrenzen stehen im [Root-Gate](gates/2026-10-07-demo-ausbau.md).
