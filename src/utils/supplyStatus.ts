export type SupplyStatus = 'full' | 'low' | 'critical' | 'empty';

export const getSupplyStatus = (current: number, initial: number): SupplyStatus => {
  const ratio = current / initial;
  if (ratio >= 0.5) return 'full';
  if (ratio >= 0.25) return 'low';
  if (current > 0) return 'critical';
  return 'empty';
}