import { createContext } from 'react';

export type ChaosPreset = 'off' | 'mild' | 'stress' | 'failure';

export interface ChaosContextValue {
  preset: ChaosPreset;
  setPreset: (preset: ChaosPreset) => void;
}

export const ChaosContext = createContext<ChaosContextValue | undefined>(undefined);
