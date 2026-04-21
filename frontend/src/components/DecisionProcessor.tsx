/**
 * DecisionProcessor — Invisible background component that handles
 * systematic decisions and system-wide assertions.
 */
import { useLiveMetrics } from '../hooks/useLiveMetrics';
import { useDecisionEngine } from '../hooks/useDecisionEngine';

export default function DecisionProcessor() {
  const { data } = useLiveMetrics();
  
  // The hook handles comparison, hysteresis, and log emission
  useDecisionEngine(data);

  return null; // Invisible component
}
