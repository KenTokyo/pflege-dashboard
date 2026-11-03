import { AnimatePresence, motion } from 'motion/react';
import { useDesign } from '../app/ThemeProvider';
import { InstrumentDemoBanner } from '../instrument/rahmen/InstrumentDemoBanner';
import { SPRING } from '../motion/tokens';
import { setDemoNoticeOpen, useDemoNoticeOpen } from './demoNotice';
import { NavIcon } from './NavIcon';

/**
 * Pflichthinweis der Demo als schwebende Karte unten rechts, schließbar. Erscheint nach jedem Neuladen wieder;
 * im Tagwerk-Rahmen holt „Demo-Hinweis“ in der Seitenleiste ihn zurück. Der Arbeitsbereich kann ihn ganz ausschalten.
 */
export function DemoBanner() {
  const { design } = useDesign();
  const open = useDemoNoticeOpen();
  if (design === 'instrument') return <InstrumentDemoBanner />;

  const close = () => {
    setDemoNoticeOpen(false);
    // Fokus nicht ins Leere fallen lassen: zum Wieder-Öffnen-Knopf, sonst zum Hauptbereich.
    requestAnimationFrame(() => { (document.getElementById('demo-reopen') ?? document.getElementById('main'))?.focus({ preventScroll: true }); });
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside key="demo" className="demo-pop" role="note" aria-label="Demo-Hinweis"
          initial={{ opacity: 0, y: 22, scale: 0.94, rotate: -1.2 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, transition: { ...SPRING.soft, delay: 0.32 } }}
          exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18, ease: [0.5, 0, 0.75, 0] } }}>
          <span className="tape" aria-hidden="true">Demo</span>
          <span className="demo-pop-icon" aria-hidden="true"><NavIcon name="shield" size={20} /></span>
          <div className="demo-pop-text">
            <strong>Demo – keine echten Daten eingeben</strong>
            <span>Alle Personen und Vorgänge sind fiktiv.</span>
          </div>
          <button type="button" className="demo-pop-close" onClick={close} aria-label="Demo-Hinweis schließen" title="Schließen">
            <NavIcon name="close" size={16} />
          </button>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
