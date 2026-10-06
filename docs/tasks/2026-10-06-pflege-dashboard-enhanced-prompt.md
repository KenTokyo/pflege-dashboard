# Pflege-Dashboard – Arbeitsauftrag

## Unchanged original

Lies zuerst vollständig die Anforderungsdatei:
/Users/kentoky/Documents/React Projects/quizblitz/docs/prompts/08-pflege-dashboard.md

Du bist der Orchestrator und baust das Pflege-Dashboard genau nach dieser Datei: komplette Neuentwicklung mit eigener Supabase-Datenbank, NoteTree nur als Inspiration, nichts kopieren. Starte als TreeChat-Unterchats einen Frontend-Agenten (Claude Opus 5.5, Effort high) und einen Backend-Agenten (Sol 6.1, Effort high). Prüfe Modelle und Werte vorher mit treechat_capabilities. Nie mehr als 2 gleichzeitig. Du verteilst nur die Arbeit und prüfst sie, Nacharbeit geht an denselben Agenten.

Beginne mit Phase 0: 3 Designrichtungen als Mockups (4 Screens, je dunkel und hell) nach docs/mocks/. Schick sie mir im Chat und warte auf meine Wahl, bevor die Oberfläche gebaut wird. Parallel darf das Backend Schema, Zugriffsregeln, lokales Supabase und den API-Vertrag anlegen. Keine Konten anlegen, keine Zugangsdaten eingeben, keine Schlüssel ausgeben. Berichte auf Deutsch an jedem Gate.

## Improved prompt

Setze die vollständigen [Anforderungen](../anforderungen.md) als eigenständiges Projekt in `/Users/kentoky/Documents/React Projects/pflege-dashboard` um. Der aktuelle TreeChat liegt in `/Users/kentoky/Documents/React Projects/ki-pflegedashboard`; beide lokalen Unterchats erhalten den tatsächlichen Zielordner ausdrücklich. Der Orchestrator erstellt Arbeitsdokumentation, verteilt die Arbeit, prüft und bewertet sie; die Anwendung bauen ausschließlich die zwei beauftragten Unterchats.

Prüfe die konkreten Modelle und Parameter mit `treechat_capabilities`. Falls die verlangten Versionen fehlen, nimm gemäß Anforderungsdatei die nächstliegenden verfügbaren Modelle und benenne die Abweichung. Höchstens zwei aktive Unterchats, lokale Umgebung, voller Zugriff, Rückmeldung nach Abschluss. Kein Ersatzagent für Nacharbeit.

Phase 0: Der Frontend-Unterchat liefert drei eigenständige, seriöse Designrichtungen mit unterschiedlichen Schriften, Farben und Graffiti-Stärken als statische HTML-Mocks. Pro Richtung Login, Dashboard, Chat mit Bestätigungskarte und bereits erstelltem Dokument sowie Einstellungen mit Modus-/Modellauswahl, jeweils dunkel und hell. Liefere alle 24 PNGs unter `docs/mocks/<richtung>/` bei höchstens 1280×720 und je Richtung einen kurzen Bewegungsclip oder eine Bildfolge. Nutze nur fiktive deutsche Inhalte. Prüfe die Bilder und stelle sie mit einem kurzen Absatz je Richtung im Hauptchat vor, insgesamt höchstens zwölf Vorschaubilder. Stoppe danach ausdrücklich bis zur Designwahl. Keine App-UI vor der Wahl.

Parallel erstellt der Backend-Unterchat ausschließlich Schema, RLS-Zugriffsregeln, private Storage-Regeln, fiktiven Seed, lokale Supabase-Konfiguration, prüfbare Zugriffsregeltests, generierte TypeScript-Typen und `docs/api-contract.md`. Der Vertrag bildet die späteren Anforderungen und Grenzen verständlich ab; noch nicht gebaute Endpunkte werden als geplant gekennzeichnet. Keine AI-Aufrufe oder vorgezogene weitere Phase.

Keine Konten erstellen, Zugangsdaten eingeben oder Schlüssel anzeigen, loggen oder committen. Keine Dateien oder Anwendungsteile aus NoteTree kopieren. Für jeden Browserlauf die globalen Regeln lesen, zuerst Prüfungen ohne Browser, nur unsichtbarer passender Chrome for Testing, höchstens ein Browser gleichzeitig und 1280×720; sämtliche eigenen Browser und Aufnahmeserver direkt nach Prüfung schließen.

Lokal pro geprüftem Meilenstein committen; nie pushen, wie die konkrete Anforderungsdatei festlegt. Gate-Berichte auf Deutsch: Ergebnis, tatsächliche Prüfungen, ehrliche Vorher-/Nachher-Bewertungen, Bilder, offene Nachweisgrenzen und benötigte Designentscheidung. Spätere Phasen aus der Anforderungsdatei bleiben im Arbeitsplan, beginnen aber erst nach dem jeweiligen Gate.
