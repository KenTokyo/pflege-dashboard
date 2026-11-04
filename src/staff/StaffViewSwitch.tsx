import { Link, useLocation } from '@tanstack/react-router';
import { NavIcon } from '../components/NavIcon';
import '../styles/staff.css';

/** Sichtwechsel Kunde/Sachbearbeiter als ruhiges Segment (aktive Seite ohne gleitende Tinte). */
export function StaffViewSwitch() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const staff = pathname === '/sachbearbeitung';
  return (
    <nav className="sf-switch" aria-label="Demo-Ansicht wechseln">
      <Link to="/uebersicht" aria-current={staff ? undefined : 'page'}><NavIcon name="care" size={14} /><span>Kundenansicht</span></Link>
      <Link to="/sachbearbeitung" aria-current={staff ? 'page' : undefined}><NavIcon name="staff" size={14} /><span>Sachbearbeiter-Test</span></Link>
    </nav>
  );
}
