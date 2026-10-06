// Ein semantisches Tokensystem für alle drei Richtungen. Gleiche Namen, je dunkel und hell.
// Kontraste prüft tools/check-source.mjs (WCAG AA).

export const TOKEN_NAMES = [
  'bg', 'surface', 'surface2', 'sunken', 'border', 'borderStrong',
  'text', 'textMuted', 'accent', 'onAccent', 'accentText', 'accentSoft',
  'danger', 'dangerSoft', 'warning', 'warningSoft', 'success', 'successSoft',
  'marker', 'focus', 'bannerBg', 'bannerText', 'shadow',
];

export const directions = [
  {
    id: 'linie',
    name: 'Linie',
    graffiti: 'sehr dezent',
    pitch:
      'Linie ist die leiseste Richtung: ein grafitgraues Werkzeug im Stil moderner Arbeitsoberflächen. Dichte, präzise Listen mit Inter, eine klare Seitenleiste und ein kühles Iris-Violett für Aktionen. Graffiti gibt es nur als einen einzigen handgezogenen Friststrich unter der nächsten Frist und einen kleinen Haken beim erstellten Dokument. Für ein Publikum, das vor allem Ruhe, Tempo und Seriosität sehen soll.',
    nav: 'sidebar',
    fonts: { body: "'Inter Variable', 'Inter', system-ui, sans-serif", display: "'Inter Variable', 'Inter', system-ui, sans-serif", mono: "'Inter Variable', system-ui, sans-serif" },
    fontFiles: ['inter'],
    scale: { base: '14px', small: '12.5px', h1: '22px', h2: '15px', radius: '8px', radiusSm: '6px', row: '40px', control: '36px', icon: '1.75' },
    motion: { name: 'Friststrich', ms: 420, what: 'Ein Markerstrich zieht sich unter die Widerspruchsfrist.' },
    themes: {
      dunkel: {
        bg: '#0C0D10', surface: '#14161A', surface2: '#1B1E23', sunken: '#101215', border: '#24272E', borderStrong: '#666D7A',
        text: '#E9EBEF', textMuted: '#9EA4B0', accent: '#5F5CE8', onAccent: '#FFFFFF', accentText: '#A9A8FF', accentSoft: 'rgba(110,108,242,0.16)',
        danger: '#FF8A80', dangerSoft: 'rgba(255,138,128,0.13)', warning: '#F3BC55', warningSoft: 'rgba(243,188,85,0.13)', success: '#5DD39B', successSoft: 'rgba(93,211,155,0.13)',
        marker: '#F3BC55', focus: '#A9A8FF', bannerBg: '#241C0E', bannerText: '#F7D08A', shadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.35)',
      },
      hell: {
        bg: '#F6F7F9', surface: '#FFFFFF', surface2: '#F1F2F5', sunken: '#F6F7F9', border: '#E1E4E9', borderStrong: '#878E9B',
        text: '#15171C', textMuted: '#585F6C', accent: '#5452E0', onAccent: '#FFFFFF', accentText: '#4744CF', accentSoft: 'rgba(84,82,224,0.10)',
        danger: '#C42B21', dangerSoft: 'rgba(196,43,33,0.08)', warning: '#8A5800', warningSoft: 'rgba(214,145,20,0.13)', success: '#147A4B', successSoft: 'rgba(20,122,75,0.09)',
        marker: '#E3A11B', focus: '#5452E0', bannerBg: '#FFF3D6', bannerText: '#634000', shadow: '0 1px 2px rgba(16,18,24,0.05), 0 6px 18px rgba(16,18,24,0.05)',
      },
    },
  },
  {
    id: 'klartext',
    name: 'Klartext',
    graffiti: 'ausgewogen',
    pitch:
      'Klartext wirkt wie ein sehr gutes Amtsportal, nur freundlicher: IBM Plex Sans mit Plex Mono für Daten und Fristen, Petrol als Vertrauensfarbe und eine waagerechte Navigation mit großzügigem Raster. Graffiti setzt gezielte Akzente: ein gelber Markerkreis um die dringendste Zahl, ein Klebestreifen auf „Entwurf“ und ein Haken, der sich beim Erstellen eines Dokuments selbst zeichnet. Für eine Präsentation, die Fachlichkeit und Wärme zugleich zeigen soll.',
    nav: 'top',
    fonts: { body: "'IBM Plex Sans', system-ui, sans-serif", display: "'IBM Plex Sans', system-ui, sans-serif", mono: "'IBM Plex Mono', ui-monospace, monospace" },
    fontFiles: ['plex-sans', 'plex-mono'],
    scale: { base: '15px', small: '13px', h1: '24px', h2: '16px', radius: '6px', radiusSm: '4px', row: '44px', control: '40px', icon: '1.6' },
    motion: { name: 'Haken beim Erstellen', ms: 600, what: 'Die Bestätigung kippt in „Erstellt“, ein Markerhaken zeichnet sich.' },
    themes: {
      dunkel: {
        bg: '#0A1214', surface: '#101B1E', surface2: '#162428', sunken: '#0D1619', border: '#203137', borderStrong: '#5F787E',
        text: '#E4EFF0', textMuted: '#95ABB0', accent: '#2FB3A3', onAccent: '#03201C', accentText: '#63D6C7', accentSoft: 'rgba(47,179,163,0.15)',
        danger: '#FF8B7E', dangerSoft: 'rgba(255,139,126,0.13)', warning: '#F1C452', warningSoft: 'rgba(241,196,82,0.13)', success: '#62D292', successSoft: 'rgba(98,210,146,0.13)',
        marker: '#F5D547', focus: '#7FE5D8', bannerBg: '#2A2410', bannerText: '#F6DE86', shadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 28px rgba(0,0,0,0.32)',
      },
      hell: {
        bg: '#F2F5F5', surface: '#FFFFFF', surface2: '#EDF2F2', sunken: '#F5F8F8', border: '#D4DEE0', borderStrong: '#7A8E92',
        text: '#0F1F21', textMuted: '#4B6064', accent: '#0A6E64', onAccent: '#FFFFFF', accentText: '#08665D', accentSoft: 'rgba(10,110,100,0.09)',
        danger: '#B42318', dangerSoft: 'rgba(180,35,24,0.08)', warning: '#865200', warningSoft: 'rgba(214,160,20,0.15)', success: '#116F3E', successSoft: 'rgba(17,111,62,0.09)',
        marker: '#D9A300', focus: '#0A6E64', bannerBg: '#FFF5CC', bannerText: '#5C4300', shadow: '0 1px 2px rgba(15,31,33,0.05), 0 8px 22px rgba(15,31,33,0.05)',
      },
    },
  },
  {
    id: 'tagwerk',
    name: 'Tagwerk',
    graffiti: 'etwas mutiger',
    pitch:
      'Tagwerk ist die mutigste der drei Richtungen und trotzdem ein Arbeitswerkzeug: warmes Papier und Tinte, Bricolage Grotesque für markante Überschriften und Atkinson Hyperlegible Next für sehr gut lesbaren Text. Kobaltblau führt die Aktionen, ein Signalorange gehört allein dem Graffiti. Sprühpunkte und ein eigener Tag am Login, ein Stempel „Erstellt“ beim bestätigten Dokument und ein Markerkreis um die Frist. Für einen Auftritt, an den man sich nach der Vorführung erinnert.',
    nav: 'rail',
    fonts: { body: "'Atkinson Hyperlegible Next', system-ui, sans-serif", display: "'Bricolage Grotesque Variable', 'Bricolage Grotesque', system-ui, sans-serif", mono: "'Atkinson Hyperlegible Next', system-ui, sans-serif" },
    fontFiles: ['bricolage', 'atkinson'],
    scale: { base: '15px', small: '13px', h1: '28px', h2: '17px', radius: '12px', radiusSm: '8px', row: '44px', control: '42px', icon: '1.9' },
    motion: { name: 'Stempel „Erstellt“', ms: 560, what: 'Ein Stempel landet mit kurzem Überschwingen auf dem bestätigten Dokument.' },
    themes: {
      dunkel: {
        bg: '#13110F', surface: '#1C1916', surface2: '#25211D', sunken: '#171512', border: '#36302A', borderStrong: '#73695C',
        text: '#F5F0E8', textMuted: '#BAB0A3', accent: '#7D93FF', onAccent: '#0A1030', accentText: '#A3B3FF', accentSoft: 'rgba(125,147,255,0.15)',
        danger: '#FF8A7F', dangerSoft: 'rgba(255,138,127,0.13)', warning: '#F4BE55', warningSoft: 'rgba(244,190,85,0.13)', success: '#66D196', successSoft: 'rgba(102,209,150,0.13)',
        marker: '#FF7A45', focus: '#A3B3FF', bannerBg: '#2C1A10', bannerText: '#FFC9A8', shadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 30px rgba(0,0,0,0.35)',
      },
      hell: {
        bg: '#F5F1EA', surface: '#FFFDF9', surface2: '#EFE9DF', sunken: '#FAF7F1', border: '#E0D7C9', borderStrong: '#8A7F70',
        text: '#1E1A15', textMuted: '#5F5547', accent: '#2F4FDB', onAccent: '#FFFFFF', accentText: '#2A47C7', accentSoft: 'rgba(47,79,219,0.09)',
        danger: '#B3261B', dangerSoft: 'rgba(179,38,27,0.08)', warning: '#875000', warningSoft: 'rgba(214,145,20,0.14)', success: '#196C3F', successSoft: 'rgba(25,108,63,0.09)',
        marker: '#E2531D', focus: '#2F4FDB', bannerBg: '#FFE9DA', bannerText: '#6B2A08', shadow: '0 1px 2px rgba(40,28,14,0.06), 0 10px 26px rgba(40,28,14,0.06)',
      },
    },
  },
];

export const screens = [
  { id: 'login', title: 'Login' },
  { id: 'dashboard', title: 'Dashboard' },
  { id: 'chat', title: 'Chat' },
  { id: 'einstellungen', title: 'Einstellungen' },
];

export const themes = [
  { id: 'dunkel', title: 'Dunkel' },
  { id: 'hell', title: 'Hell' },
];

const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function tokenCss(dir) {
  const block = (t) => TOKEN_NAMES.map((n) => `  --${kebab(n)}: ${t[n]};`).join('\n');
  const s = dir.scale;
  return `/* Generiert aus tools/tokens.mjs – nicht von Hand ändern. Richtung: ${dir.name} */
:root {
  --font-body: ${dir.fonts.body};
  --font-display: ${dir.fonts.display};
  --font-mono: ${dir.fonts.mono};
  --fs-base: ${s.base};
  --fs-small: ${s.small};
  --fs-h1: ${s.h1};
  --fs-h2: ${s.h2};
  --radius: ${s.radius};
  --radius-sm: ${s.radiusSm};
  --row-h: ${s.row};
  --control-h: ${s.control};
  --icon-stroke: ${s.icon};
  color-scheme: dark;
${block(dir.themes.dunkel)}
}
:root[data-theme='hell'] {
  color-scheme: light;
${block(dir.themes.hell)}
}
`;
}
