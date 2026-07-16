export type NarrativeTone = 'neutral' | 'wonder' | 'memory' | 'tension' | 'release';

export interface NarrativeEnvironmentState {
  skyColor: string;
  groundColor: string;
  fogColor: string;
  stars: number;
  bloomIntensity: number;
}

export type SpatialNarrativeAction =
  | { type: 'set-environment'; payload: Partial<NarrativeEnvironmentState> }
  | { type: 'set-camera'; payload: { mode: string } }
  | { type: 'show-narration'; payload: { body: string; tone?: NarrativeTone } }
  | { type: 'set-portal'; payload: { id: string; open: boolean } };

export interface SpatialNarrativeCue {
  id: string;
  atSeconds: number;
  label?: string;
  actions: SpatialNarrativeAction[];
}
