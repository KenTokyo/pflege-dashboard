import type { CSSProperties, HTMLAttributes } from 'react';
import './motion.css';

export type RevealProps = HTMLAttributes<HTMLDivElement> & {
  stage?: 'frame' | 'head' | 'metric' | 'data' | 'action'; index?: number;
};
const phases = { frame: 0, head: 110, metric: 220, data: 340, action: 460 };

export function Reveal({ stage = 'frame', index = 0, className = '', style, children, ...props }: RevealProps) {
  return <div {...props} className={`in-reveal ${className}`} data-stage={stage}
    style={{ '--in-delay': `${Math.max(0, index) * 60 + phases[stage]}ms`, ...style } as CSSProperties}>
    {children}
  </div>;
}
