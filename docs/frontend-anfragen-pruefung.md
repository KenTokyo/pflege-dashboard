# Frontend: Beispielfragen und gespeicherte Anmeldung

Stand: 06.10.2026. Auftrag: Alltagssprache, sortierte Beispielfragen, vorhandene Entwürfe erhalten und die vom Nutzer ausdrücklich gewünschte Anmeldung auf diesem Gerät speichern.

## Umsetzung

- Im Gespräch öffnet **Was kann ich fragen?** den Tagwerk-Dialog. Fünf Themen mit jeweils drei Fragen: Überblick, Aufgaben ordnen, einfach verstehen, Schreiben vorbereiten, Gespräch vorbereiten.
- Eine gewählte Frage wird erst mit **Frage übernehmen** in das bearbeitbare Eingabefeld übernommen. Kein automatischer Versand. Bei bestehendem Entwurf heißt die Aktion ausdrücklich **An meinen Text anhängen** und erhält den bisherigen Text unverändert.
- Die Beispiele beziehen sich auf vorhandene Angaben zur ausgewählten Person und versprechen nur Antworten oder Textentwürfe im Chat. Keine erfundenen Uploads, Exporte, Briefsendungen oder automatischen Aufgabenänderungen.
- Der Dialog nutzt die vorhandene native Dialog-Hülle, Theme-Werte, sichtbare Auswahl, beschriftete Radiofelder und Tastaturbedienung. Unter 768 px Vollbild, fester Kopf/Fuß und ein scrollender Inhalt. Keine Daueranimation oder Hintergrundabfrage.
- **Demo-Zugang verwenden** übernimmt nur die bekannte Demo-E-Mail und fokussiert das Passwortfeld. Keine hinterlegte Geheimzahl und kein Umgehen der Anmeldung.
- **Anmeldung auf diesem Gerät speichern** ist aufgrund des ausdrücklichen Nutzerauftrags vorausgewählt und sichtbar abwählbar. Es werden ausschließlich Supabase-Sitzungsdaten gespeichert, niemals das Passwort. Ohne Merken: Speicher des aktuellen Tabs. Mit Merken: dauerhafter Browser-Speicher.
- Der Server erhält die bewusste Merken-Auswahl beim Sitzungs-Touch. Die verlängerte Dauer wird lokal erst nach bestätigter Serverantwort übernommen. Ein tatsächliches früheres Ablaufdatum bleibt verbindlich. Standard: 15 Minuten ohne Aktivität/8 Stunden insgesamt. Merken: serverseitig höchstens 30 Tage; ungültige oder widerrufene Supabase-Anmeldungen bleiben ungültig.
- Ein stabiler SDK-Speicherschlüssel nutzt gemeinsame Locks und Broadcast-Kanäle für mehrere Tabs. Eine extern gelöschte Sitzung fällt nicht auf eine alte Speicherkopie zurück. Beim Abmelden wird der Browser-Speicher sofort gelöscht, der alte Schreibzugang abgetrennt und der alte SDK-Client vor seinem verzögerten Widerruf stillgelegt. So überschreiben späte Antworten keine neue Anmeldung.
- Kein Hintergrund-Refresh-Timer. Token-Erneuerung erfolgt bei tatsächlicher Anfrage. Lange Einmal-Timer werden an der JavaScript-Obergrenze aufgeteilt.

## Gestaltungsreferenz

Vor Umsetzung gelesen: bestehende Tagwerk-App, `src/routes/chat/NewConversationDialog.tsx`, `src/routes/chat/Composer.tsx` und Dialog-/Composer-Regeln in `src/styles/app.css` (Stand vor diesem Auftrag, 06.10.2026). Die bestehende Hülle ist die Referenz: 18 px Dialogtitel, 16–18 px Flächenabstand, 44 px Bedienziele, 14–16 px Inhalt, ein fester Kopf/Fuß und Themen aus den vorhandenen semantischen Tokens. Erweiterung auf 680 px Desktopbreite, keine zweite Palette und keine verschachtelten Karten. Mobil dieselbe Hülle als Vollbild.

## Prüfung und Grenzen

Eigene Prüfungen verwenden ausschließlich Node/Vitest mit synthetischem Transport. Kein Konto angelegt, kein Passwort eingetragen, kein eigener Browser gestartet.

- Beispielfragen: alle fünf Themen, drei Fragen je Thema, richtige Person, Auswahl nur als Entwurf, danach weiter bearbeitbar, Fokus im Texteingabefeld, vorhandener Entwurf wörtlich erhalten, Schließen ohne Änderung, Themenwechsel ohne versteckte Auswahl.
- Supabase-Adapter: bestehende Logout-/Race-Tests; neue Clientinstanz übernimmt gültige gespeicherte Anmeldung ohne erneuten Passwortaufruf; ungültiges Refresh-Token wird verworfen; Logout entfernt Tokens sofort.
- Speicher: Reload im Tab, Wiederöffnen mit Merken, Abwahl, verspätete Schreib-/Löschaktionen, zwei Speicherinstanzen mit gleichem SDK-Lock und sichtbarem Refresh/Logout.
- Aktivität: Standardgrenzen bleiben, bestätigter langer Modus läuft über 15 Minuten hinaus, frühere Servergrenze gilt, 30-Tage-Timer bleibt unter der Browserobergrenze, kein Heartbeat.
- Live-/Sichtabnahme in beiden Themes sowie 390/768 px führt der separat beauftragte Browserprüfer durch. Diese Node-Prüfungen beweisen weder ein tatsächliches Live-Login noch die optische Abnahme. Die native Fokusfalle/Escape und mobile Tastatur werden im Browser geprüft.

Interaktionsumfang vorher: Beispielfragen fehlten; Neuladen verlor Anmeldung. Nacharbeit im Node-Nachweis: vollständig für die oben genannten Abläufe. Eine optische Note wird erst nach tatsächlicher Browserprüfung vergeben. Keine eigenen Browser oder Server zurückgelassen.

## Abschluss der eigenen Prüfkette

06.10.2026: TypeScript-Prüfung, striktes ESLint, **146 Frontendtests**, Produktionsbuild, Bundle-Geheimnisprüfung und Quellprüfung bestanden. Quellprüfung: 53 Dateien, 46 Kontrastpaare in beiden Themes. Anschließend **21 Proxy-Prüfungen** und **14 Prozessprüfungen** bestanden; eigene Testserver/Prozessgruppen geschlossen. `git diff --check` ohne Befund.

Die Proxy-Fixture wurde nach ausdrücklicher Besitzfreigabe lediglich um die vollständige gültige v1.4-Sessionantwort ergänzt; der Produktparser wurde nicht abgeschwächt. Der Quell-Gate erlaubt Browser-Speicher gezielt nur für den autorisierten Anmeldespeicher und die bestehende Theme-Einstellung. Automatischer Hintergrund-Refresh bleibt verboten.

Der gemeinsame Backend-Vertrag v1.4 wurde konsumiert. Die zugehörige Hosted-Migration, Bereitstellung und Prüfung des echten bereits angelegten Kontos gehören zum Orchestrator-/Backend-/Browser-Gate. Kein Commit, Push oder Hosted-Schreibzugriff durch diesen Frontend-Agenten.
