# Backend-Typen

`api.ts`: Vertrag v0.2 für den Orchestrator. HTTP, Streams und die neuen Gespräch-/Personenzuordnungs-RPCs sind ausdrücklich geplant.

`database.types.ts` wurde mit **Supabase CLI 2.119.0** aus der tatsächlichen lokalen App-Datenbank nach Migration/Seed erzeugt. Keine schemaabgeleitete Ersatzdatei. Exakter Generieraufruf ist im sicheren Wrapper `backend/scripts/supabase-safe.mjs types`: `supabase gen types --local --lang typescript --schema public` im eigenen Supabase-Ausführungsspiegel, mit eigenem SUPABASE_HOME. Die rohe CLI-Datei wird nicht per Hand korrigiert.

`rpc.ts` ergänzt die echte SQL-Nullbarkeit: Die CLI kann nullable RPC-Parameter nicht aus der Funktionssignatur ableiten. Für den späteren Supabase-JS-Client `BackendDatabase` verwenden; Tabellen/Enums/Beziehungen bleiben unverändert aus der CLI-Datei. `UpdateAgentSettingsArgs` unterscheidet den Reset (Texte dürfen null sein) vom eigenen Prompt (Texte erforderlich). Das ist kein zusätzlicher Endpoint.

Strikte Prüfung: `cd backend && npm run typecheck`. Typbeispiele prüfen zulässige null-Overrides, Reset-Parameter, unzulässigen Mode und dass geplante RPCs noch nicht in den generierten Funktionen stehen. Generierte Insert-/Update-Typen sind Schemaformen und **keine Schreibfreigabe**; die Browserrolle besitzt weiterhin nur SELECT + vier geprüfte RPCs.
