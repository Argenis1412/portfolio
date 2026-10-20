import { useLiveMetrics } from '../hooks/useLiveMetrics';
import { useDecisionEngine } from '../hooks/useDecisionEngine';

export default function DecisionProcessor() {
  const { data, isStale } = useLiveMetrics();
  useDecisionEngine(isStale ? undefined : data);
  return null;
}
