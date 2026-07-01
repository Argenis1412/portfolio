import { m, AnimatePresence } from 'framer-motion';

interface DeltaBadgeProps {
  current: number;
  previous: number | null;
  unit?: string;
  invertColor?: boolean; // true = higher is bad (latency, errors)
  decimals?: number;
}

export function DeltaBadge({ current, previous, unit = '', invertColor = true, decimals = 0 }: DeltaBadgeProps) {
  if (previous === null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.001) return null;

  const isUp = diff > 0;
  const isBad = invertColor ? isUp : !isUp;
  const color = isBad ? 'text-status-error' : 'text-status-ok';
  const sign = isUp ? '+' : '';
  const val = decimals > 0 ? Math.abs(diff).toFixed(decimals) : Math.abs(Math.round(diff)).toString();

  return (
    <AnimatePresence mode="wait">
      <m.span
        key={diff}
        initial={{ opacity: 0, y: -4, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={`text-[10px] font-mono ml-1 ${color}`}
        style={{ display: 'inline-block' }}
      >
        ({sign}{isUp ? '' : '-'}{val}{unit})
      </m.span>
    </AnimatePresence>
  );
}

export default DeltaBadge;
