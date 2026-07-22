interface LifecycleDetailRowProps {
  t: (key: string) => string;
  lifecycle: string;
}

// NORMAL means no chaos context at all — showing the phase clause then reads as
// a contradiction next to a real-degradation ⚠ status label, regardless of what
// any other detail row in the caller is doing. STABLE (22-30s post-incident) is
// still a genuine, non-contradictory chaos-recovery state worth showing.
export default function LifecycleDetailRow({ t, lifecycle }: LifecycleDetailRowProps) {
  const showLifecycle = lifecycle !== 'NORMAL';
  if (!showLifecycle) return null;

  return (
    <>
      <span className="text-current/45">·</span>
      <span className="text-current/80">
        <span className="text-current/55">{t('banner.incident_phase')}: </span>
        <span className="capitalize">{t(`metrics.lifecycle.${lifecycle}`).toLowerCase()}</span>
      </span>
    </>
  );
}
