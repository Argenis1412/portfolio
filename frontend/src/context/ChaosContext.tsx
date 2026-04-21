import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ChaosPreset = 'off' | 'mild' | 'stress' | 'failure';

interface ChaosContextValue {
  preset: ChaosPreset;
  setPreset: (preset: ChaosPreset) => void;
}

const ChaosContext = createContext<ChaosContextValue | undefined>(undefined);

export function ChaosModeProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<ChaosPreset>('off');

  const value = {
    preset,
    setPreset,
  };

  return <ChaosContext.Provider value={value}>{children}</ChaosContext.Provider>;
}

export function useChaosMode() {
  const context = useContext(ChaosContext);
  if (!context) {
    throw new Error('useChaosMode must be used within a ChaosModeProvider');
  }
  return context;
}
