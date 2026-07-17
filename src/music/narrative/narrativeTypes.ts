export type NarrativeTone = 'neutral' | 'wonder' | 'memory' | 'tension' | 'release';

export interface NarrativeEnvironmentState {
  skyColor: string;
  groundColor: string;
  fogColor: string;
  fogDensity: number;
  stars: number;
  bloomIntensity: number;
  rainIntensity: number;
}

export type SpatialNarrativeAction =
  | {