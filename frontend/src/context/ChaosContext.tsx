import { useState, type ReactNode } from 'react';
import { ChaosContext, type ChaosPreset } from './ChaosContextCore';

export function ChaosModeProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<ChaosPreset>('off');

  const value = {
    preset,
    setPreset,
  };

  return <ChaosContext.Provider value={value}>{children}</ChaosContext.Provider>;
}
