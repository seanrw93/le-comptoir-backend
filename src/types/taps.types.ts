export type PourSize = 'half' | 'pint';
 
export type Tap = {
  id: number;
  position: number;
  remainingMl: number;
};
 
export const POUR_VOLUMES: Record<PourSize, number> = {
  half: 250,
  pint: 500,
};