import { useContext } from 'react';
import { ChaosContext, type ChaosPreset } from '../context/ChaosContext';

export function useChaosMode() {
  const context = useContext(ChaosContext);
  if (!context) {
    throw new Error('useChaosMode must be used within a ChaosModeProvider');
  }
  return context;
}

export type { ChaosPreset };
