# Backend einrichten und sicher prüfen — Phase 1

Das Backend verwendet echte Supabase CLI **2.119.0** mit nativer Laufzeit auf Apple Silicon. Kein eigener PostgreSQL-/Node-HTTP-Ersatz, kein Browser. Deno **2.9.6** und alle Prüfwerkzeuge liegen unter `backend/`. Die root `.env` verbindet die Oberfläche mit dem eigenen Hosted-Projekt **ttbfpqveexmlqxkzwlmz** in Frankfurt. Das geprüfte App-Schema und der fiktive Seed sind dort vorhanden; der lokale Prüfstapel bleibt nach Tests gestoppt.

## Vollständige lokale Wiederholung

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
mkdir -p .local
npm ci --no-audit --no-fund > .local/npm-ci.log 2>&1
npm run check:phase1
```

Der Node-Ablauf begrenzt die Arbeit auf 15 Minuten. Anschließend bleibt die Bereinigung ebenfalls begrenzt: Stop und Nachprüfung jeweils höchstens drei Minuten, mit gezieltem Abbruch eigener Prozesse. Er startet ausschließlich den eigenen Supabase-Stapel, resettet dessen Testdatenbank, wendet **sechs Migrationen** samt Seed frisch an, prüft tatsächliche Auth-/REST-/Storage-/Edge-Dienste, SQL-Zugriffsregeln, echte Parallelkonflikte, HTTP, Provider-/Streamlogik und Typen. `finally` stoppt und prüft eigene Prozesse/Ports auch bei Fehler und Ctrl+C. Kein Hosted-Reset, keine Auth-Konten, keine Providerkontakte. Positive SQL-Geschäftslogik verwendet synthetische Claims/Aktivitätszeilen; Produktion prüft zusätzlich die reale `auth.sessions`-Zeile. Mock-Provider ist ausschließlich Testabhängigkeit.

Der Wrapper kopiert nur unsere Config, Migrationen, Seed, SQL-Tests und Functions nach `backend/.local/supabase-project`. Er liest keine root `.env` und niemals `env.md`. Nur im ignorierten Spiegel schreibt er `supabase/functions/.env` mit zwei öffentlichen lokalen Origins, ohne Providerwerte. Supabase liefert seine Serverkeys selbst an die Edge-Laufzeit; sie erscheinen nicht in Browser oder Ausgabe. CLI-Start/Status/Testausgaben werden nur redigiert unter `backend/.local/` geschrieben. Keine rohe `supabase status`-Ausgabe verwenden.

Eigener SUPABASE_HOME: System-Tempordner + `pflege-dashboard-supabase-57aea064-phase0`. Der Name bleibt zur sicheren Identität erhalten. Tatsächlicher absoluter Pfad steht im Prüfbericht. Leerzeichenfreier Laufzeitpfad vermeidet einen nachgewiesenen Fehler der experimentellen nativen TLS-Startlogik. Eigene Ports 56421, 56422, 56428; keine fremden Stacks stoppen. Gestoppte eigene Caches und Testdaten dürfen für die nächste Wiederholung bestehen bleiben.

## Typen und gezielte Prüfung

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
node scripts/supabase-safe.mjs start
node scripts/supabase-safe.mjs types
npm run typecheck
npm test
node scripts/supabase-safe.mjs stop
node scripts/runtime-cleanup.mjs
```

Manuelle Schritte verlangen Stop/Cleanup auch nach einem Fehler; der Gesamtprüfbefehl übernimmt das zuverlässig. CLI-Generierung ist tatsächlich `supabase gen types --local --lang typescript --schema public`, mit eigenem SUPABASE_HOME und Spiegel. Kein Handpatch der generierten Datei. Frontend nutzt `BackendDatabase` aus `types/rpc.ts` und HTTP-/SSE-Formen aus `types/phase1.ts`. Backend gibt keine Root-Paketdatei und keinen UI-Code vor.

## Eigenes Hosted-Schema prüfen

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard/backend'
npm run hosted:inspect
npm run hosted:apply
```

`inspect` ist read-only. `apply` akzeptiert ausschließlich das autorisierte Projekt, geschützt gespeicherte eigene Env-Datei und offizielle `.local/supabase-ca.crt`. Node TLS verlangt eine autorisierte verschlüsselte Verbindung und `rejectUnauthorized:true`. Keine Zertifikatsprüfung abschalten. URL/Passwort/Keys bleiben im Speicher, nicht in Argumenten oder Ausgaben. Kein Supabase Login/Link und keine fremde Env-Datei.

`apply` verlangt einen erfolgreichen aktuellen lokalen Komplettlauf, identische Migration-/Seed-Hashes und dessen gesicherten Schemanachweis. Es prüft wirklichen Bestand, Tabellenowner und RLS, erhält Supabase-Storage-Owner/RLS und eine Supabase-eigene `rls_auto_enable`-Hilfsfunktion. Es verwendet das normale `supabase_migrations.schema_migrations`-Journal für Infrastrukturmetadaten; diese Tabelle ist kein App-Datensatz. Bereits vorhandene App-Daten bleiben erhalten. Migrationen laufen additiv und einzeln transaktional. Seed wird ausschließlich bei ursprünglich leerem App-Bestand angewendet. Wiederholung schreibt keine zweite Demo-Familie. Noch nicht abgeschlossene/driftende Zustände stoppen mit konkretem Nachweis.

## Vom Nutzer noch einzurichten

1. Nutzer legt Email-/Passwortkonto manuell im eigenen Supabase-Dashboard an. Registrierung und anonyme Auth bleiben aus. Agenten legen keine Konten an und geben keine Zugangsdaten ein.
2. Nutzer ordnet die Auth-User-ID vertrauenswürdig dem Demo-Workspace zu. Keine automatische Mitgliedschaft durch Browser oder ersten Login. Die folgende Transaktion ist eine **manuelle Admin-Vorlage**, noch nicht ausgeführt: UUID und Namen bewusst ersetzen. Sie verlangt einen vorhandenen nicht anonymen Auth-Nutzer; erstellt ausschließlich Profil/Mitgliedschaft, keinen Auth-Nutzer.

```sql
begin;
do $$
declare u uuid := '<VORHANDENE_AUTH_USER_UUID>';
actor uuid;
begin
  if not exists(select 1 from auth.users where id=u and not coalesce(is_anonymous,false)
      and deleted_at is null and (banned_until is null or banned_until<=now())) then
    raise exception 'Vorhandenen freigegebenen Auth-Nutzer zuerst prüfen';
  end if;
  insert into public.profiles(workspace_id,created_by,kind,user_id,display_name)
    values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','user',u,'Demozugang')
    on conflict(workspace_id,user_id) do update set display_name=excluded.display_name
    returning id into actor;
  insert into public.workspace_memberships(workspace_id,created_by,profile_id,role,status)
    values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',actor,'admin','active')
    on conflict(workspace_id,profile_id) do update set role='admin',status='active';
end $$;
commit;
```

`admin` ist hier eine bewusste manuelle Demo-Adminzuweisung. Für weitere reguläre Zugänge `member` wählen. Keine Self-Escalation aus der Oberfläche. Supabase-Free garantiert die 15m-/8h-Grenzen nicht; App-Client und serverseitige Session-Funktion setzen sie durch. JWT konfiguriert 300s, direkte RLS-/Metadaten-RPC-Restlaufzeit bis JWT-Ablauf ausdrücklich beachten.

3. Management-Autorisierung für die eigenen beiden Edge Functions bereitstellen. In diesem Backend-Scope gibt es derzeit weder Supabase-MCP-Deploymentwerkzeug noch eigenes `SUPABASE_ACCESS_TOKEN`; kein Zugriff auf globale Login-Caches. Hosted-Functions sind deshalb **noch nicht deployed**. Autorisierte spätere CLI-Schritte, ohne Token als Argument und ohne sichtbare Apps:

```sh
cd '/Users/kentoky/Documents/React Projects/pflege-dashboard'
backend/node_modules/.bin/supabase functions deploy session --project-ref ttbfpqveexmlqxkzwlmz --use-api > backend/.local/deploy-session.log 2>&1
backend/node_modules/.bin/supabase functions deploy chat-stream --project-ref ttbfpqveexmlqxkzwlmz --use-api > backend/.local/deploy-chat.log 2>&1
```

Nur mit vorher vom Nutzer geschütztem Prozess-Token ausführen; keine rohe Logausgabe. `verify_jwt=false` in der Functions-Config ist bewusst: Die Function prüft den User live mit Supabase Auth und anschließend dessen reale Session; sie verlässt sich nicht auf eine bloße JWT-Decodierung. Provideraufrufe bleiben ohne weitere Einrichtung unmöglich. JWT-Issuer wird gegen SUPABASE_URL/auth/v1 geprüft; AUTH_JWT_ISSUER darf bei einer ausdrücklich geprüften abweichenden nativen Auth-Adresse nur als serverseitige Konfiguration gesetzt werden. Es ist kein Browserparameter.

4. Nutzer setzt `ALLOWED_ORIGINS` auf ausdrücklich erlaubte Browserherkünfte und `OPENAI_API_KEY` ausschließlich als **Supabase Edge Secrets**. Keine Provider-/Adminwerte mit `VITE_`, keine Übertragung der gesamten root Env als Secrets. Den vorhandenen Beispielen fehlen geprüfte Betriebsfähigkeit und Preise: erst eine reale OpenAI-Textmodell-ID, tatsächliche Fähigkeiten, gültige obere `model_prices`-Version mit Quelle und Ablauf und Workspace-Standard/Override bewusst einrichten. Anthropic/Mistral sind geplante Erweiterungen. Keine erfundenen Preise oder Regionszusagen. **Budget bleibt 0**, bis Nutzer ein Budget ausdrücklich freigibt. Agenten erhöhen es nicht und rufen keine bezahlte KI auf.
5. Erst danach echter Nutzer-Login, Sitzung/Logout, Gespräch/Personenzuordnung und Antwortenstream in beiden Themes. Phase 2 nimmt später Chat → editierte Vorschau → Bestätigung → Dokument samt Export, Uploads, Übergabe und RAG ab. Diese Abläufe sind noch nicht implementiert.

Die native Laufzeit beantwortet OPTIONS teilweise selbst mit `Access-Control-Allow-Origin:*`. Die geschützten POST-Antworten unserer Functions tragen die genaue erlaubte Herkunft; fremde Herkunft wird vor Auth/DB mit 403 verworfen. Hosted-CORS bleibt nach Deployment zusätzlich real zu prüfen.
