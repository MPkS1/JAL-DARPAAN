import type { Band } from '../types';
import { BANDS } from '../lib/risk';

interface Props {
  score: number;
  band: Band;
  size?: number;
  label?: string;
}

export default function RiskRing({ score, band, size = 108, label }: Props) {
  const meta = BANDS[band];
  const stroke = 9;
  const r = (size - stroke) / 2 - 4;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, score) / 100) * c;

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={meta.hex} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          style={{ filter: `drop-shadow(0 0 6px ${meta.hex}88)`, transition: 'stroke-dasharray 0.8s ease, stroke 0.4s' }}
        />
      </svg>        <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display font-bold leading-none text-text-900 tabular" style={{ fontSize: size * 0.26 }}>
            {score.toFixed(0)}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: meta.hex }}>
            {meta.label}
          </div>
          {label && <div className="mt-0.5 text-[9px] uppercase tracking-wider text-text-800">{label}</div>}
        </div>
      </div>
    </div>
  );
}
