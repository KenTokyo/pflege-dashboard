import './icons.css';
import * as Legacy from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import type { ReactElement } from 'react';
import { Icon, type IconName, type Thing } from '../grundlage/Icon';

/** Nur die Zeichnung wechselt. Tagwerk erhält dieselbe Lucide-Komponente und dieselben Props. */
function symbol(legacy: LucideIcon, name: IconName | ReactElement, thing: Thing = 'conversation') {
  const LegacyIcon = legacy;
  return function ChatSymbol(props: LucideProps) {
    return <LegacyIcon {...props} className={`${props.className ?? ''} in-chat-symbol`}>
      <g className="in-chat-symbol-drawing" visibility="hidden">
        {typeof name === 'string' ? <Icon name={name} thing={thing} size={24} />
          : <g strokeWidth="1.5" style={{ color: `var(--thing-${thing})` }}>{name}</g>}
      </g>
    </LegacyIcon>;
  };
}

const archive = <><path d="M4 8h16v13H4zM3 3h18v5H3zM9 12h6" /></>;
const pen = <><path d="m5 15 11-11 4 4L9 19l-5 1zM14 6l4 4M4 21h16" /></>;
const microphone = <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6" /></>;
export const MessagesSquare = symbol(Legacy.MessagesSquare, 'conversation');
export const MessageSquareText = symbol(Legacy.MessageSquareText, 'conversation');
export const SquarePen = symbol(Legacy.SquarePen, pen);
export const Search = symbol(Legacy.Search, 'search');
export const User = symbol(Legacy.User, 'person', 'person');
export const Users = symbol(Legacy.Users, 'care', 'person');
export const Archive = symbol(Legacy.Archive, archive, 'document');
export const ArchiveRestore = symbol(Legacy.ArchiveRestore, archive, 'document');
export const ArrowLeft = symbol(Legacy.ArrowLeft, <path d="M20 12H4m6-6-6 6 6 6" />);
export const ArrowRight = symbol(Legacy.ArrowRight, 'arrow');
export const ArrowUp = symbol(Legacy.ArrowUp, <path d="M12 20V4m-6 6 6-6 6 6" />);
export const Check = symbol(Legacy.Check, 'check', 'task');
export const X = symbol(Legacy.X, 'close');
export const Cpu = symbol(Legacy.Cpu, 'ai', 'ai');
export const Pencil = symbol(Legacy.Pencil, pen);
export const PencilLine = symbol(Legacy.PencilLine, pen);
export const PenLine = symbol(Legacy.PenLine, pen, 'document');
export const Mic = symbol(Legacy.Mic, microphone);
export const MicOff = symbol(Legacy.MicOff, <>{microphone}<path d="m3 3 18 18" /></>);
export const ShieldCheck = symbol(Legacy.ShieldCheck, 'shield', 'person');
export const Square = symbol(Legacy.Square, <rect x="6" y="6" width="12" height="12" rx="1" />);
export const CircleAlert = symbol(Legacy.CircleAlert, 'warning', 'deadline');
export const Info = symbol(Legacy.Info, 'care', 'person');
export const Quote = symbol(Legacy.Quote, <path d="M4 6h6v8H6v4H3v-7h7M14 6h6v8h-4v4h-3v-7h7" />, 'document');
export const RefreshCw = symbol(Legacy.RefreshCw, <path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" />);
export const RotateCcw = symbol(Legacy.RotateCcw, <path d="M4 8a8 8 0 1 1 0 8M4 3v5h5" />);
export const Send = symbol(Legacy.Send, 'arrow');
export const ChevronDown = symbol(Legacy.ChevronDown, <path d="m5 9 7 7 7-7" />);
export const Code2 = symbol(Legacy.Code2, 'settings', 'ai');
export const LayoutList = symbol(Legacy.LayoutList, 'task', 'task');
export const Pilcrow = symbol(Legacy.Pilcrow, <path d="M14 20V4h-4a4 4 0 0 0 0 8h4M18 4v16M12 4h8" />);
export const Compass = symbol(Legacy.Compass, 'overview', 'person');
export const ListTodo = symbol(Legacy.ListTodo, 'task', 'task');
export const BookOpenText = symbol(Legacy.BookOpenText, 'document', 'document');
