import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../app/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dunkel' ? 'helles' : 'dunkles';
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={`Zu ${next} Design wechseln`} title={`Zu ${next} Design wechseln`}>
      {theme === 'dunkel' ? <Moon className="i" size={18} aria-hidden="true" /> : <Sun className="i" size={18} aria-hidden="true" />}
    </button>
  );
}
