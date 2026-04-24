

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
  const color = isBad ? 'text-red-400' : 'text-emerald-400';
  const sign = isUp ? '+' : '';
  const val = decimals > 0 ? Math.abs(diff).toFixed(decimals) : Math.abs(Math.round(diff)).toString();

  return (
    <span className={`text-[10px] font-mono ml-1 ${color}`}>
      ({sign}{isUp ? '' : '-'}{val}{unit})
    </span>
  );
}

export default DeltaBadge;
