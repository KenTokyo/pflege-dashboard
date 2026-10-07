import { Link } from '@tanstack/react-router';
import { BriefcaseBusiness, HeartHandshake } from 'lucide-react';
import '../styles/staff.css';

export function StaffViewSwitch() {
  return <nav className="staff-view-switch" aria-label="Demo-Ansicht wechseln">
    <Link to="/" activeOptions={{ exact: true }} activeProps={{ 'aria-current': 'page' }}><HeartHandshake className="i" size={17} aria-hidden="true" />Kundenansicht</Link>
    <Link to="/sachbearbeitung" activeProps={{ 'aria-current': 'page' }}><BriefcaseBusiness className="i" size={17} aria-hidden="true" />Sachbearbeiter-Test</Link>
  </nav>;
}
