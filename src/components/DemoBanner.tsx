import { useDesign } from '../app/ThemeProvider';
import { InstrumentDemoBanner } from '../instrument/rahmen/InstrumentDemoBanner';
import { setDemoNoticeOpen, useDemoNoticeOpen } from './demoNotice';
import { NavIcon } from './NavIcon';

/**
 * Pflichthinweis der Demo als ruhige Karte unten rechts, schließbar (blendet weich ein, V2 ohne Federn).
 * Erscheint nach jedem Neuladen wieder; „Demo-Hinweis“ in der Seitenleiste holt ihn zurück.
 */
export function DemoBanner() {
  const { design } = useDesign();
  const open = useDemoNoticeOpen();
  if (design === 'instrument') return <InstrumentDemoBanner />;
  if (!open) return null;

  const close = () => {
    setDemoNoticeOpen(false);
    // Fokus nicht ins Leere fallen lassen: zum Wieder-Öffnen-Knopf, sonst zum Hauptbereich.
    requestAnimationFrame(() => { (document.getElementById('demo-reopen') ?? document.getElementById('main'))?.focus({ preventScroll: true }); });
  };

  return (
    <aside className="demo-pop" role="note" aria-label="Demo-Hinweis">
      <span className="demo-pop-icon" aria-hidden="true"><NavIcon name="shield" size={16} /></span>
      <div className="demo-pop-text">
        <strong>Demo – keine echten Daten eingeben</strong>
        <span>Alle Personen und Vorgänge sind fiktiv.</span>
      </div>
      <button type="button" className="ibtn ibtn-sm demo-pop-close" onClick={close} aria-label="Demo-Hinweis schließen" title="Schließen">
        <NavIcon name="close" size={14} />
      </button>
    </aside>
  );
}
