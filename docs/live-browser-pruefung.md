# Live-Prüfung der Vorführung

Stand: 06.10.2026. Ziel: den veröffentlichten Ablauf mit dem vom Nutzer angelegten Demo-Konto auf `https://pflege-dashboard-puce.vercel.app` tatsächlich abschließen.

## Vorgehen und Grenzen

- Vorhandener Chrome-Tab über das ChatGPT-Browser-Plugin. Kein eigener Browserprozess, keine Ersatz-App, kein Fokuswechsel. Nutzer-Tabs bleiben erhalten.
- Nur fiktive Daten. Keine Zugangsdaten, Sitzungsschlüssel oder Browser-Speicher auslesen. Keine Konto- oder Passwortänderung.
- Orchestrator stellt die geprüfte Online-Version und bei Bedarf den geschützten Zugang bereit. Dieser Prüfchat beginnt den Browserablauf erst nach dessen Meldung „Live bereit“.
- Quellprüfung und erfolgreiche Paketprüfungen sind kein Beleg für erfolgreichen Login oder echte KI-Antworten.
- Der Nutzer möchte die Anmeldung speichern. Die bewusste Option ist für diese Vorführung daher vorausgewählt. Geplanter Vertrag: Standard-Sitzung 15 Minuten ohne Aktivität/maximal 8 Stunden; ausdrücklich gespeicherte Sitzung 30 Tage. Tatsächliche Oberfläche und Serververhalten werden gegen diesen Vertrag geprüft.
- Kein vorzeitiges Abmelden des vorhandenen Kontos: Ohne bekanntes Passwort würde das den selbstständigen weiteren Live-Test blockieren. Abmelde- und Löschverhalten zunächst anhand der unabhängigen Tests dokumentieren; echter Abmeldetest erst ganz am Ende, wenn eine erneute Anmeldung durch den Nutzer ohnehin möglich ist.

## Vorbereiteter Prüflauf

| Schritt | Erwartetes tatsächliches Ergebnis | Stand |
| --- | --- | --- |
| Anmeldung | Vorhandenes Demo-Konto gelangt in seinen Arbeitsbereich; verständliche Fehler statt leerer Seite | Bestanden laut Root-Livebeleg: Nutzer selbst angemeldet, Demo-Zugang aktiv |
| Anmeldung speichern | Verständlich benannte, aufgrund des ausdrücklichen Nutzerwunschs vorausgewählte Option; Anzeige stimmt mit tatsächlicher 30-Tage-Regel überein | Root-Livebeleg plus SQL: aktiv, remember_session=true, Restdauer 30,00 Tage |
| Startseite | Martha Beispielwald, Pflegegrad 3, zugehörige Kasse und zwei offene Aufgaben sichtbar | Bestanden laut Root-Livebelegen auf 3d534ee: Person, Kasse, zwei Aufgaben und gespeicherter Entwurf sichtbar |
| Fragenvorlagen | Dialog mit Themen und Beispielsätzen in Alltagssprache; Satz übernimmt sich als bearbeitbare Eingabe | Bestanden laut Root: fünf Kategorien mit je drei Optionen tatsächlich geöffnet und gezählt |
| Entwurf erhalten | Vorhandene ungesendete Eingabe wird durch Vorlage nicht still überschrieben | Bestanden laut Root-DOM: Prefix, Leerzeile, vollständige Telefonatvorlage erhalten; nicht automatisch gesendet |
| Personenbezug | Neues Gespräch ist sichtbar Martha zugeordnet | Bestanden laut Root-Livebeleg auf 2295d70: neuer Chat Martha zugeordnet, echte Antwort verwendet ihre gespeicherten Angaben |
| Echte KI-Antwort | DeepSeek antwortet auf die gespeicherten Angaben und benennt das antwortende Modell | Bestanden auf 7f9825b: vollständige 1119 Zeichen, korrekte Fakten, Modell deepseek-v4.1-flash, Anfrage und Nachricht completed, genau eine Nutzungsbuchung |
| Folgefrage | Einfache Nachfrage bezieht sich auf die vorherige Antwort | Bestanden auf 7f9825b: vollständige 1041 Zeichen mit direktem Bezug und Benennung fehlender Unterlagen, completed, genau eine Nutzungsbuchung |
| Neuladen | Anmeldung und abgeschlossene Unterhaltung bleiben im selben Tab erhalten | Bestanden nach tatsächlichem abschließendem Reload: Demo-Zugang sichtbar, zwei Antwortartikel, keine Fehlermeldung, Folgeantworttext und dunkles Design erhalten |
| Erneutes Öffnen | Soweit ohne Fokuswechsel unterstützt: neuer eigener Tab derselben Website übernimmt die gültige gespeicherte Sitzung; Test-Tab danach schließen | Bestanden laut Root: neuer Tab nach erneuter Plugin-Verbindung im selben Profil automatisch angemeldet, beide Antworten und dunkles Design erhalten; Prüftab anschließend geschlossen |
| Sitzungsende | Unabhängige Tests belegen Standard-/Speicherdauer und Entfernung nach Abmeldung; keine 30 Tage verstrichene Echtzeit behaupten | Einstellungen zeigen 30 Tage und Ende 05.11.2026 18:10; sofortige Entfernung bei Abmeldung nur als UI-Text beobachtet, nicht tatsächlich ausgeführt |
| Gesprächsliste | Neu angelegtes Gespräch auffindbar; Titel und Personenbezug stimmen | Aktueller Vorführungs-Chat laut Root auf Übersicht sichtbar; Personenbezug separat bestätigt |
| Beide Designs | Startseite, Gespräch und Vorlagendialog in hellem und dunklem Design lesbar und bedienbar | Übersicht, Vorlagendialog und erfolgreich abgeschlossener Chat hell/dunkel laut Root-Screenshots lesbar, jeweils 9/10 |
| Schmale Ansicht | Nur soweit über die erlaubte bestehende Verbindung ohne Fokuswechsel unterstützt: Navigation, Dialog und Eingabe bedienbar | Nicht live nachgewiesen: Größenänderung wirkte nicht, ursprünglicher Zustand wiederhergestellt |
| Ehrliche Grenzen | Keine vorgetäuschten Uploads, Exporte, Rechtsauskünfte oder gespeicherten Dokumente | Dokumentansicht öffnet tatsächlich gespeicherten fiktiven Entwurf; weist sichtbar darauf hin, dass nichts versandt wird; übrige Phase-2-Funktionen nicht als gebaut ausgegeben |

Geplante erste Frage: „Was weißt du schon über Martha, und welche zwei Aufgaben stehen bei ihr an? Bitte erklär mir das ganz einfach.“ Danach: „Was sollte ich davon zuerst angehen? Verwende nur die hinterlegten Angaben und sag mir, wenn etwas fehlt.“

## Vorbereitende Quellprüfung

Die vorhandenen Komponenten besitzen bezeichnete Eingabefelder und Knöpfe für Anmeldung, neue Gespräche, Nachricht senden, Suche und Designwechsel. Das Dialogmuster verwendet ein natives modales Dialogelement mit Schließen und Escape. Der bisherige Anmeldespeicher ist flüchtig; die beauftragte Überarbeitung des Frontend-Agenten muss deshalb durch ein echtes Neuladen geprüft werden. Gesprächserstellung und Personenbezug werden getrennt vom KI-Antwortnachweis geprüft.

Zum Zeitpunkt der Vorbereitung war noch keine Live-Browserprüfung durchgeführt. Die späteren konkreten Root-Belege stehen unten. Dieser Prüfchat vergibt keine visuelle Bildschirmnote ohne eigene Screenshotbeobachtung.

## Übergabestand vom Orchestrator

Commit `2601b4a`: Live-API laut Orchestrator wieder gesund (`health` 200; Sitzung und Chat ohne Anmeldung 401 als JSON; unbekannter API-Pfad 404; fremder Ursprung 403; ungültiger Token nach Datenbankinitialisierung 401). Dies sind übernommene Infrastrukturbelege, keine von diesem Prüfchat selbst durchgeführten Login- oder Chatnachweise. Anmeldespeicherung und 30-Tage-Vertrag werden noch fertiggestellt. Nutzer meldet sich danach einmal selbst an; auf „Live bereit“ warten.

Commit `2b9bb8b`: Orchestrator meldet Live bereit, Vercel Ready und Einstiegspaket `index-nd6jmd1l.js` identisch zur lokal geprüften Version. Übergebene Prüfzahlen: 146 Frontend-, 134 Backend-, 579 SQL-, 12 Upgrade-, 33 Hosted- und 11 Cloud-Prüfungen bestanden.

Bei der anschließenden tatsächlichen Browserübernahme kann dieser Unteragent den vorhandenen App-Tab nicht beanspruchen: Er gehört bereits zur Browser-Sitzung des Orchestrators. Die erlaubte Browser-API bietet keine Übergabefunktion während dessen laufendem Turn. Deshalb noch keine DOM- oder Screenshotbeobachtung dieses Prüfchats; keine Appaktion ausgeführt. Orchestrator ist informiert und kann den Ablauf in der bereits verbundenen Sitzung weiterführen. Kein Umgehungsweg über Browser-Speicher, CDP oder andere Prozesse versucht.

## Konkrete Livebelege des Orchestrators

Die folgenden Abschnitte bilden den Verlauf chronologisch ab. Frühere Fehlerstände sind historische Belege; für die aktuelle Abnahme gelten der positive Endbeleg auf `7f9825b` und die Übersicht oben.

### Neue Anmeldung, Hauptdomain, Deployment `2b9bb8b` – erster Einstieg

Herkunft: Root-Orchestrator hat den vorhandenen App-Tab über seine bereits gebundene Browser-Verbindung neu geladen und die Oberfläche bedient. Dieser Unteragent bewertet den übermittelten Befund, hat diesen Bildschirm nicht selbst beobachtet.

- Neuer Knopf „Demo-Zugang verwenden“ sichtbar. Der Klick setzt die bekannte Demo-E-Mail und führt zum noch leeren Passwortfeld.
- „Anmelden“ bleibt deaktiviert; kein ausgefülltes Browser-Autofill beobachtet. Es wurde kein Passwort gelesen oder übertragen.
- Auswahl „Anmeldung auf diesem Gerät speichern“ ist aktiviert (`checked`, AX-Wert 1).
- Sichtbare Erklärung: „Mit dieser Auswahl bleiben Sie bis zu 30 Tage angemeldet. Beim Öffnen wird Ihr Zugang geprüft. Ihr Passwort wird nicht gespeichert.“
- Nutzer zur bereits gewünschten einmaligen eigenen Anmeldung aufgefordert. Zu diesem Zeitpunkt waren positiver Login und echte KI-Antwort noch offen.

Unabhängige Einordnung dieses ersten Schritts: Der gemeldete Einstieg entspricht dem beauftragten vereinfachten Login und täuscht keine bereits erfolgte Anmeldung vor. Die vorausgewählte Speicherung und angezeigte Dauer stimmen mit dem vereinbarten Vertrag überein. Zu diesem Zeitpunkt fehlte noch der Nachweis nach tatsächlicher Anmeldung und Neuladen.

### Tatsächliche Anmeldung und Sitzungserhaltung

Herkunft: Root-Livebelege auf derselben Hauptdomain und Version `2b9bb8b`; SQL-Befund ebenfalls vom Orchestrator übermittelt.

- Der Nutzer hat sich selbst angemeldet. Kontoanzeige „Demo-Zugang“ sichtbar.
- Zugehörige `session_activity`: `remember_session=true`, `active=true`, `remaining_days=30.00`.
- Nach tatsächlichem Neuladen bleiben Konto „Demo-Zugang“, derselbe Chat und die bereits gesendete Nutzernachricht erhalten. Das gewählte helle Design bleibt ebenfalls erhalten.

Einordnung: Reale Anmeldung und unmittelbare Sitzungserhaltung bei Reload sind nachgewiesen. Der SQL-Wert belegt die gesetzte 30-Tage-Regel, nicht einen 30 Tage lang durchgelaufenen Echtzeittest. Wiederöffnung in einem anderen Tab, Abmeldung und Ablauf bleiben gesonderte offene Punkte. Kein Passwort wurde vom Prüfchat gelesen oder eingegeben.

### Erster echter Chatversuch – noch fehlgeschlagen

- Frage zu Marthas gespeicherten Angaben, Aufgaben und Terminen tatsächlich gesendet.
- Gespräch: `f8e0a132-3371-43f9-9668-79fbb3537f6f`.
- Anfrage: `77bc9cdf-4e5e-4271-b1c7-90bef9274f75`.
- Ergebnis: `PROVIDER_FAILED`, Antwortinhalt leer (`content=0`), Nutzungswerte fehlen (`usage=NULL`). Backend-Bereichsinhaber untersucht den Fehler.

Einordnung: Die Anfrage ist kein Beleg für eine erfolgreiche Antwort des Providers. Datenbezug der KI, Modellantwort, Folgefrage und Erhaltung einer abgeschlossenen Antwort sind weiterhin nicht abgenommen. Aus `usage=NULL` lässt sich nicht sicher ableiten, ob beim Anbieter eine Nutzung entstand. Das Gesamtergebnis „Vorführung funktioniert“ bleibt offen, bis eine echte Antwort und die Folgeprüfung erfolgreich abgeschlossen sind.

### Fragenvorlagen und bestehender Entwurf

- Fünf Themenkategorien tatsächlich geöffnet; je drei auswählbare Beispiele gezählt.
- Kategorie „Ein Gespräch vorbereiten“ ausgewählt, Beispiel „Ein Telefonat vorbereiten“ gewählt.
- Vorhandener Text: „Bitte kurz und in einfachen Worten.“
- Nach Anhängen zeigt der DOM-Beleg genau den vorhandenen Text, eine Leerzeile und danach die vollständige ausgewählte Vorlage.
- Kein automatisches Senden; Dialog geschlossen und Fokus in der bearbeitbaren Nachrichteneingabe.

Einordnung: Die alltäglichen Vorlagen sind zugänglich, nach Themen geordnet und zerstören den vorhandenen Entwurf nicht. Auswahl und Versand sind getrennt. Das erfolgreiche Einfügen ist unabhängig vom weiterhin fehlerhaften KI-Antwortweg belegt.

### Zweiter echter Chatversuch – damaliger Zwischenstand

Herkunft: tatsächliche Root-Liveanfrage auf Vercel-Version `f489365` (Ready), zugehöriger bereinigter Serverbefund.

- Anfrage `ccfa9992-cef4-4ba8-9f47-89771a53ba9f`, Logzeit 19:18:13.
- Anbieterantwort: `reason=HTTP_REJECTED`, `httpStatus=401`, `contentType=json`.
- Das bedeutet eine zurückgewiesene Authentifizierung beim Anbieter. Eine erfolgreiche KI-Antwort ist weiter nicht vorhanden.
- Damals wurde ein geschützter Schlüsseltausch als nächster Schritt angenommen. Diese Aufforderung ist durch den nachfolgenden Anbieterbeleg überholt: Kein Schlüsseltausch wird mehr verlangt. Kein Schlüssel wurde für diese Diagnose ausgelesen oder ausgegeben.

Einordnung des damaligen Belegs: Die Verbindung erreichte den direkt angesprochenen Anbieter, der die Authentifizierung ablehnte. HTTP 401 allein bewies keinen ungültigen Schlüssel. Der inzwischen belegte Anbieterunterschied wird im nächsten Abschnitt korrigiert. Echte Antwort, Datenbezug, Folgefrage und erneutes Laden der vollständigen Unterhaltung bleiben verpflichtende Abschlussprüfungen.

### Korrigierte Ursache: OpenCode-Schlüssel am falschen Endpunkt

Herkunft: Nutzer-Screenshot und Link zur OpenCode-Konsole; Root-Abgleich mit `https://opencode.ai/docs/zen/` und `https://opencode.ai/zen/v1/models`. Dieser Prüfchat hat keine Schlüsselwerte gesehen und keine eigene Anbieterabfrage ausgeführt.

- Nutzerbeleg zeigt den Schlüssel bei OpenCode als aktiv. Das gewünschte V4.1-Modell ist in der OpenCode-Konsole aktiviert.
- Offizielle Modellkennung laut Root-Abgleich: `deepseek-v4.1-flash` über OpenCode Zen.
- Der bisherige Server schickte den vorhandenen Schlüssel an den direkten DeepSeek-Endpunkt. Diese falsche Anbieterzuordnung war ein Fehler unserer Einrichtung; sie ist kein belegter Fehler des vom Nutzer hinterlegten Schlüssels.
- Backend-Bereichsinhaber stellt den Provider auf `opencode` und den passenden Endpunkt um. Der bereits geschützte Wert soll über einen ausdrücklich dafür vorgesehenen Rückgriff auf den bisherigen Variablennamen nutzbar bleiben. Kein zusätzliches Eingeben oder Auslesen des Schlüssels nötig.

#### Unabhängige Prüfung des laufenden Diff-Stands

Nur Quellprüfung, keine neuen Tests oder Browseraktionen dieses Prüfchats:

- Die fertigen Frontendänderungen ergänzen „über OpenCode“ ausschließlich für den Provider `opencode` im Gesprächskopf, bei laufenden Antworten und in gespeicherten Modell-Snapshots. Ein vorhandener Zusatz wird nicht verdoppelt.
- Historische direkte DeepSeek-Antworten behalten ihre historische Anbieterzuordnung. Die Einstellungen zeigen unbekannte Anbieter unverfälscht statt eines irreführenden Mistral-Fallbacks.
- Der bestehende Stream-Leser akzeptiert die Providerkennung bereits als Zeichenkette. Der neue Name wird daher nicht durch eine veraltete Laufzeitliste verworfen.
- Zum Zeitpunkt dieser Quellprüfung ist der Backendumbau noch nicht geliefert: Handler, Verfügbarkeitsermittlung und gemeinsame Context-/Modelltypen enthalten noch den bisherigen Direktanbieter. Das ist als laufende Arbeit dokumentiert, nicht als abgeschlossener Integrationsfehler gewertet.

Vor der nächsten Liveabnahme zusammen prüfen: neue Providerkennung durch DB-Enum, Kontextvorbereitung, Verfügbarkeit und gemeinsame Typen; richtige Paarung von geschütztem Schlüssel und OpenCode-Endpunkt; aktuelle OpenCode-Modellkennung, Preisgrundlage und tatsächliche Stream-/Nutzungsdaten; Gesprächsstandard ohne versehentlich weiterwirkende Direktanbieter-Auswahl. Alte Antwort-Snapshots erhalten und keinen weiteren direkten DeepSeek-Versuch mit dem OpenCode-Schlüssel auslösen.

### Erster tatsächlicher OpenCode-Stream – Datenbezug stimmt, Abschluss noch defekt

Herkunft: Root-Livebelege zur Version `2295d70`, Vercel-Bereitstellung `9VgdW9FQHugV6sDtysHgnwb5eRVD` Ready, Bundle `CNhp63cW` entspricht geprüftem Stand. Dieser Prüfchat wertet die übermittelten Browser-, Log- und Datenbankbelege aus.

- Nach Neuladen weiterhin angemeldet. Neues Gespräch `8b8bf5f8-5109-4b51-accf-38a1d7e79d7b` erfolgreich Martha zugeordnet.
- Echte Anfrage `28d3bbff-84d0-472e-9ef4-fb45c87f740e`: Anbieter antwortet HTTP 200 mit tatsächlichem Stream, gemeldetes Modell `deepseek-v4.1-flash`.
- Genutzter Anbieterweg ist OpenCode Go aus dem vorhandenen aktiven Abonnement. Nutzerkonto zeigt 0 Credits, Zusatznutzung ausgeschaltet; keine Aufladung, Tarifänderung oder Aktivierung von Zusatznutzung durchgeführt. Die vorherige Zen-Zuordnung ist damit hinsichtlich des konkreten verwendeten Produkts präzisiert.
- Inhalt nennt korrekt Pflegegrad 3, Pflegekasse, Lenas hinterlegte Notiz, den vorhandenen Entwurf und die Aufgaben vom 13. und 20. Oktober. Beide Termine werden als manuelle fiktive Aufgabenplanung bezeichnet, nicht als berechnete Rechtsfristen.
- Der Text endet unvollständig bei „…Menschen gep“, gespeichert mit Status `failed`. Das ist noch keine abgeschlossene Antwort.
- Log meldete `TOKEN_BOUND`; Datenbank weist jedoch 725 Eingabe- und 275 Ausgabetokens bei Grenzen von 1.000.000/1.024 aus. Beide gemeldeten Werte liegen eindeutig innerhalb ihrer Grenzen.
- Nutzungsbuchung: 548 Mikro-US-Dollar, als Schätzung markiert. `workspace.blocked=false`. Diese Buchung ist eine interne Schätzung und kein Nachweis einer zusätzlichen Abbuchung vom Abonnementkonto.
- Backend-Bereichsinhaber repariert das pauschale Verwerfen von Inhalt im letzten Stream-Delta sowie die irreführende Fehlerdiagnose. Nach vorliegenden Zahlen ist dies kein belegtes Tokenlimitproblem; eine Erhöhung der Grenzen würde die diagnostizierte Parserursache nicht beheben.

Einordnung: Authentifizierung bei OpenCode, echter Modellaufruf und sachlich korrekter Bezug auf die gespeicherten Demodaten sind erstmals belegt. Vollständiger Streamabschluss, erfolgreicher Speicherstatus, Folgefrage und Reload einer vollständig abgeschlossenen Antwort sind weiterhin offen. Keinen positiven Gesamtabschluss aus HTTP 200 oder dem Teiltext ableiten.

### Nach erstem Parserfix: vollständiger Text, weiterer Abschlussfehler

Herkunft: neue Root-Livebelege zur Version `3d534ee`, Vercel-Bereitstellung `Ahhrkuib4GsGrzayHFiU9Vbagook` Ready. Root meldet zuvor 180 bestandene Tests und 20 bestandene Vercel-Artefaktprüfungen. Dieser Unteragent hat diese Prüfungen nicht erneut ausgeführt.

- Neue echte Anfrage `542e0382-5436-497f-a714-bdc9dad3e90c` im Gespräch `2d4c6f96-264c-428e-99da-35c80d877423`.
- Vollständiger Antworttext mit 907 Zeichen vorhanden. Gemeldetes Modell korrekt `deepseek-v4.1-flash`.
- Nutzungswerte: 725 Eingabe- und 292 Ausgabetokens. Interne Schätzung: 568 Mikro-US-Dollar; keine zusätzliche Abonnementabbuchung behauptet.
- Trotz vollständig angekommenem Text endet die Anfrage mit `failed` und Diagnose `EVENT_ENVELOPE` nach dem Textabschluss. Backend-Bereichsinhaber bearbeitet diesen weiteren Streamabschlussfehler.

Unabhängige Einordnung: Der erste Fehler beim letzten Textstück wurde im echten Ablauf erkennbar behoben. Ein vollständiger sichtbarer Text allein genügt aber nicht: Der tatsächliche Abschluss- und Speicherstatus ist weiterhin fehlerhaft. Deshalb weder „Chat funktioniert vollständig“ noch erfolgreicher Folgekontext behaupten. Die automatisierten Prüfungen deckten dieses tatsächliche Abschlussformat noch nicht hinreichend ab; der konkrete Livebeleg bleibt maßgeblich. Nach Reparatur müssen Status `completed`, erhaltene Nutzungswerte, vollständiger Text nach Reload und eine echte Folgeantwort zusammen nachgewiesen werden.

### Dialoglage, Tastatur und Bildschirmgröße

- Der Root fand den Vorlagendialog visuell oben links. Das ist ein tatsächlicher Layoutbefund.
- Frontendkorrektur `margin: auto` in Commit `60eb994` hochgeladen. Vercel-Bereitstellung `47XfCzDhxEU7GS8jeKwoLk7L1mfo` Ready.
- Tatsächlicher Root-Nachtest nach Reload mit Screenshots in hellem und dunklem Design: Dialog bei x=620, y=45, Breite 680, Höhe 732 in 1920 × 821. Das liegt horizontal mittig; oberer und unterer Abstand betragen 45 bzw. 44 Pixel. Kopf, Optionen und Fußbereich innerhalb des sichtbaren Ausschnitts und lesbar.
- Root-Bewertung der Dialoglage vorher 6/10, nach Korrektur in beiden Designs 9/10. Diese Noten stammen aus der tatsächlichen Screenshotbewertung des Roots; dieser Unteragent bestätigt die geometrische Folgerung aus den übermittelten Maßen und vergibt keine separate eigene Bildnote.
- Escape schließt den Dialog im tatsächlichen Liveablauf.
- Ein Browser-Größenoverride auf 1280 × 720 änderte das beobachtete DOM-Maß 1920 × 821 nicht. Der Override wurde zurückgesetzt.
- Damit kein Nachweis einer schmalen oder mobilen Liveansicht. Keine Bildschirmnote für unbeobachtete Varianten und keine behauptete Einhaltung der angeforderten Testauflösung durch diesen wirkungslosen Override.

### Übersicht, Aufgabenfilter und gespeicherte Dokumente

Herkunft: weitere tatsächliche Root-Browserbelege auf `3d534ee`. Es wurde dabei kein weiterer Provideraufruf ausgelöst.

- Übersicht in hellem und dunklem Design per Screenshot angesehen. Root-Bewertung 9/10: lesbar und ohne Überlauf. Dies ist eine übernommene Bildbewertung, keine eigene Screenshotprüfung dieses Unteragenten.
- Sichtbar: Martha, 77 Jahre, Pflegegrad 3, Pflegekasse Beispielwald. Zwei Aufgaben: dringender Termin am 13.10. mit „noch 7 Tage“ sowie 20.10. mit „noch 14 Tage“. Diese Abstände stimmen mit dem Prüftag 06.10.2026 überein.
- Der vorhandene Entwurf und der aktuelle Vorführungs-Chat sind in der Übersicht sichtbar.
- Aufgabenseite: Klick auf „Dringend“ filtert tatsächlich auf genau die Widerspruchsaufgabe. Anschließend „Alle“ wiederhergestellt.
- Dokumentseite: „Text anzeigen“ öffnet den tatsächlich gespeicherten fiktiven Entwurf. Die Auswahl „Entwurf“, „Geprüft“, „Versendet“ ist sichtbar; der Text erklärt, dass die App nichts versendet. Kein Dokumentstatus geändert.

Unabhängige Einordnung: Übersicht und Aufgabenfilter erfüllen die belegten Vorführungsabläufe; der Datumsabgleich ist nachvollziehbar. Das Öffnen eines vorhandenen Dokuments belegt weder neue KI-Dokumenterstellung noch Export oder Versand. Die sichtbare Versandgrenze verhindert hier eine falsche Funktionsbehauptung.

### Einstellungen, Laufzeitangaben und aktuell eingegrenztes Streamformat

Herkunft: zusätzliche Root-Livebelege zur Oberfläche und bereinigte Providerdiagnose auf Version `71205d8`.

- Einstellungen zeigen „DeepSeek V4.1 Flash · OpenCode Go“ als Standard und freigegeben. Der bisherige direkte DeepSeek-Anbieter steht auf „Außer Betrieb“.
- Modus „Nur Auskunft“ sichtbar. Die Oberfläche erklärt ausdrücklich, dass keine Briefe, Aufgaben oder Notizen angelegt werden. Das ist mit der weiterhin begrenzten Phase-1-Funktion vereinbar.
- Gespeicherte Sitzung sichtbar „bis zu 30 Tage“, konkretes Gültigkeitsende 05.11.2026, 18:10. Die sofortige Entfernung bei „Abmelden“ ist als Text erklärt; ein tatsächlicher Abmeldevorgang wurde bewusst nicht ausgeführt.
- Der verbleibende Providerfehler ist auf eine zusätzliche reine Nutzungsnachricht nach den bereits im Abschlussblock enthaltenen Nutzungswerten eingegrenzt: Zustand `after_usage`, keine Antwortauswahl (`choices` leer), ausschließlich Standardfelder, keine unbekannten Felder. Backend-Bereichsinhaber korrigiert genau diese Verarbeitung.

Unabhängige Einordnung: Die angezeigte aktive Anbieterroute und das deaktivierte Direktmodell passen zur reparierten Schlüsselzuordnung. Das erfasste zusätzliche Metadatenformat erklärt einen weiteren Parserabbruch, beweist für sich aber noch keinen erfolgreich abgeschlossenen Stream. Die gezielte Korrektur darf Nutzungswerte weder doppelt buchen noch nachträgliche widersprüchliche Modell-/Nutzungswerte still übernehmen. Dafür sind entsprechende Prüfungen und anschließend ein positiver tatsächlicher Liveabschluss erforderlich. Sichtbare Sitzungsinformationen ersetzen keinen ausgeführten Abmelde- oder Ablauftest.

### Positiver vollständiger Liveablauf auf `7f9825b`

Herkunft: tatsächliche Root-Browserbelege und zugehörige Datenbankabfragen. Vercel-Bereitstellung `AswXMTrdU78Q5sTsXmqoy4hbtzYS` Ready. Neues Gespräch `8c7a31ac-f659-4141-a3e0-1c24f79b3c01`.

| Beleg | Erste Frage zu Martha und Aufgaben | Folgefrage: in drei einfache Schritte ordnen |
| --- | --- | --- |
| Anfrage | `b9cf6529-7a36-46e3-871e-136c79d5d425` | `846f65d9-79a2-4ca5-b93c-f6bbe59c2946` |
| Antwortlänge | 1119 Zeichen, vollständig | 1041 Zeichen, vollständig |
| Tatsächlich gemeldetes Modell | `deepseek-v4.1-flash` | `deepseek-v4.1-flash` |
| Anfrage- und Nachrichtenstatus | `completed` | `completed` |
| Eingabe-/Ausgabetokens | 725 / 357 | 1124 / 309 |
| Interne Kostenschätzung | 646 Mikro-US-Dollar | 708 Mikro-US-Dollar |
| Nutzungsbuchungen | Genau eine | Genau eine |

- Erste Antwort verwendet die korrekten gespeicherten Daten und Termine einschließlich Berliner Zeit.
- Die Folgeantwort greift das vorherige Anliegen direkt auf, ordnet es in drei verständliche Schritte und benennt fehlende Unterlagen. Damit ist mehr als eine isolierte Einzelantwort belegt.
- Chat in hellem und dunklem Design tatsächlich per Screenshot angesehen: laut Root lesbar, kein Fehlerzustand, 9/10. Die Bewertung stammt aus Root-Screenshots, nicht aus einer eigenen Bildbetrachtung dieses Unteragenten.
- Die Browser-Erweiterung wurde kurz getrennt und anschließend mit einer anderen Browser-ID im selben Profil neu verbunden. Die bisherigen App-Tabs waren danach nicht mehr vorhanden. Dies belegt keinen Neustart des Browsers; eine Ursache für das Fehlen der Tabs wird nicht unterstellt.
- Root öffnete den eigenen Prüftab `1821542964`. Dort war „Demo-Zugang“ automatisch angemeldet, beide abgeschlossenen Antworten vollständig vorhanden und das dunkle Design erhalten. Neuer-Tab- und gespeicherter-Verlauf-Nachweis damit bestanden, ohne erneute Passwortübergabe.
- Drei fehlgeschlagene Testgespräche wurden wiederherstellbar archiviert. Seed-Gespräch und erfolgreiches Vorführungsgespräch bleiben vorhanden. Keine dauerhafte Löschung behauptet.
- Zusätzlicher tatsächlicher Reload danach abgeschlossen. Root-DOM-Beleg: Konto „Demo-Zugang“ genau einmal sichtbar, zwei Antwortartikel vorhanden, null Alerts, exakter Folgeantworttext „Drei einfache nächste Schritte:“ einmal vorhanden. Dunkles Design erhalten.

Unabhängige Einordnung: Die erforderliche Kombination aus echter Modellantwort, korrektem Datenbezug, erfolgreichem Abschluss, unverfälschter Nutzungsbuchung, Folgeantwort und Wiederladen des gespeicherten Verlaufs in einem neuen Tab ist nun belegt. Die vorherigen Parserfehler verhindern diesen konkret geprüften Ablauf nicht mehr. Zwei einzelne Buchungen belegen keine Doppelbuchung dieser Antworten. Die Kostenzahlen bleiben interne Schätzungen, keine Behauptung über zusätzliche Rechnungsbeträge des Abonnements.

## Abschlussstand dieser unabhängigen Belegauswertung

Der konkret beauftragte Desktop-Vorführungsablauf ist auf `7f9825b` anhand der transparent benannten Root-Belege erfolgreich durchlaufen: selbst angelegtes Konto, gespeicherte Anmeldung, Demodaten, Fragenvorlagen, echte DeepSeek-Antwort über OpenCode Go mit Datenbezug, verständliche Folgeantwort sowie vollständiger gespeicherter Verlauf im neu geöffneten Tab und nach anschließendem tatsächlichem Reload. Beide Antworten sind tatsächlich `completed`; die früheren Fehlerstände sind damit für diesen Ablauf überholt. Der abschließende DOM-Beleg enthält beide Antworten und keine Fehlermeldung.

Übersicht, Dialog und abgeschlossener Chat sind in beiden Designs geprüft; Aufgabenfilter und Anzeige des vorhandenen Entwurfs funktionieren. Grenzen: keine erfolgreiche schmale/mobile Liveprüfung, kein tatsächlicher Browserneustart, kein ausgeführter Abmelde-/Sitzungsablauftest und kein 30-Tage-Echtzeittest. Neue Dokumente, Exporte und Versand wurden nicht implementiert oder als geprüft behauptet. Diese Grenzen bleiben getrennt vom bestandenen Desktop-Login-/Chatablauf.

## Bereinigung

Bisher keine eigenen Browser, Server oder Hintergrundprozesse gestartet.
Dieser Unteragent hat keine Nutzer-Tabs verändert, keinen neuen Tab erstellt, keine Geheimnisse gelesen und keinen Commit ausgeführt. Der Root hat seinen temporären Größenoverride zurückgesetzt. Nutzer-Browsersitzung und Tabs bleiben erhalten.
Nach Wiederverbindung nutzte der Root den neu angelegten Prüftab `1821542964` und schloss ihn nach dem abschließenden Reload. Danach ergab `browser.tabs.list()` eine leere Liste der eigenen Prüfsitzung. Kein eigener Browserprozess wurde gestartet. Dieser Prüfchat hat keine Tabaktion ausgeführt. Dokumentationsstand damit eingefroren; kein weiterer unveränderter Testlauf erforderlich.
