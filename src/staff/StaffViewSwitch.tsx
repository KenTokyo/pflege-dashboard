import { Link, useLocation } from '@tanstack/react-router';
import { LayoutGroup } from 'motion/react';
import { NavIcon } from '../components/NavIcon';
import { SegInk } from '../components/Segmented';
import '../styles/staff.css';

export function StaffViewSwitch() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const staff = pathname === '/sachbearbeitung';
  return <LayoutGroup id="tg-staff-switch">
    <nav className="staff-view-switch" aria-label="Demo-Ansicht wechseln">
      <Link to="/" aria-current={staff ? undefined : 'page'}>{staff ? null : <SegInk id="staff-ink" />}<NavIcon name="care" size={17} /><span>Kundenansicht</span></Link>
      <Link to="/sachbearbeitung" aria-current={staff ? 'page' : undefined}>{staff ? <SegInk id="staff-ink" /> : null}<NavIcon name="staff" size={17} /><span>Sachbearbeiter-Test</span></Link>
    </nav>
  </LayoutGroup>;
}
