import { createContext, useState, type ReactNode } from 'react';

export type ChaosPreset = 'off' | 'mild' | 'stress' | 'failure';

interface ChaosContextValue {
  preset: ChaosPreset;
  setPreset: (preset: ChaosPreset) => void;
}

export const ChaosContext = createContext<ChaosContextValue | undefined>(undefined);

export function ChaosModeProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<ChaosPreset>('off');

  const value = {
    preset,
    setPreset,
  };

  return <ChaosContext.Provider value={value}>{children}</ChaosContext.Provider>;
}
