import { Settings2 } from 'lucide-react';
import { DemoBanner } from '../components/DemoBanner';

/** Ohne öffentliche Supabase-Werte gibt es keine Anmeldung und keine Ersatzdaten. */
export function ConfigMissing({ missing }: { missing: string[] }) {
  return (
    <>
      <DemoBanner />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="card max-w-[520px]" style={{ padding: 24 }}>
          <div className="alert alert-warn" role="alert">
            <Settings2 className="i" size={18} aria-hidden="true" />
            <div>
              <strong>Verbindung zu Supabase fehlt</strong>
              <span>
                Diese Ausgabe wurde ohne öffentliche Projektwerte gebaut. Es fehlen: {missing.join(', ')}. Bitte die Werte in der
                lokalen Umgebung setzen und neu bauen.
              </span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
