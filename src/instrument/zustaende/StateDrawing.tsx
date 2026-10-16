import './zustaende.css';

type DrawingKind = 'access' | 'empty' | 'error' | 'connection' | 'loading';

/** Eigene isometrische Linienzeichnung. Ein Sachteil trägt den Zustand, kein erfundener Fortschritt. */
export function StateDrawing({ kind = 'empty' }: { kind?: DrawingKind }) {
  return <svg className={`in-state-drawing in-state-drawing-${kind}`} viewBox="0 0 300 160" fill="none" aria-hidden="true"
    strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
    <path className="in-drawing-guide" d="m25 112 125-65 125 65-125 35zM150 47V19m-90 76V67m180 28V67" strokeDasharray="3 5" />
    <path d="m70 95 81-43 80 43-81 43z" fill="var(--sunken)" />
    <path d="M70 95v10l80 43 81-43V95m-81 43v10" />
    {kind === 'access' ? <>
      <path d="m101 80 47-25 55 29-47 25z" fill="var(--surface2)" />
      <path d="M101 80V49l47-25 55 29v31M101 49l55 29 47-25m-47 25v31" />
      <path className="in-drawing-focus" d="m133 73 17-9 27 14-17 9z" fill="currentColor" />
      <path d="M142 64v-8c0-9 16-5 16 3v9" />
    </> : kind === 'connection' || kind === 'error' ? <>
      <path d="m90 83 35-19 31 17-35 19zM90 83v16l31 17 35-19V81m-35 19v16" fill="var(--surface2)" />
      <path className="in-drawing-focus" d="m179 65 24-13 24 13-24 13zM179 65v21l24 13 24-13V65m-24 13v21" />
      <path d="m155 89 14-7m-11-5 7 12M178 74l-8 4" strokeDasharray="3 4" />
    </> : <>
      <path d="m100 89 52-28 53 28-52 28zM100 89v14l53 28 52-28V89m-52 28v14" fill="var(--surface2)" />
      <path className="in-drawing-focus" d="m110 65 43-23 43 23-43 23z" fill="var(--surface)" />
      <path className="in-drawing-focus" d="m128 65 25-13 25 13-25 13z" fill="currentColor" />
      <path d="M110 65v15m86-15v15M153 88v16" strokeDasharray="3 4" />
    </>}
  </svg>;
}
