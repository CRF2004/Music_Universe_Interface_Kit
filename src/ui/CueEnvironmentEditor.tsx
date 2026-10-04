import { useState } from 'react';
import type { NormalizedMusicTimelineCue } from '../music/musicTimeline';
import { type EditableEnvironment } from '../project/environmentEditing';
import { useProjectStore } from '../state/useProjectStore';

function EnvironmentFields({ cueId, actionIndex, initial }: { cueId: string; actionIndex: number; initial: EditableEnvironment }) {
  const [sky, setSky] = useState(initial.skyColor ?? '');
  const [ground, setGround] = useState(initial.groundColor ?? '');
  const [rain, setRain] = useState(initial.rainIntensity === undefined ? '' : String(initial.rainIntensity));
  const [bloom, setBloom] = useState(initial.bloomIntensity === undefined ? '' : String(initial.bloomIntensity));
  const apply = () => {
    const values: EditableEnvironment = {};
    if (sky.trim()) values.skyColor = sky.trim();
    if (ground.trim()) values.groundColor = ground.trim();
    if (rain.trim()) values.rainIntensity = Number(rain);
    if (bloom.trim()) values.bloomIntensity = Number(bloom);
    useProjectStore.getState().updateCueEnvironment(cueId, actionIndex, values);
  };
  return (
    <div className="mt-3">
      <p id="environment-edit-help" className="text-sm text-ink/65">Blank fields keep the earlier event's value. Apply, then seek to this event in the music player to preview.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">Sky color
          <input aria-label="Cue sky color" aria-describedby="environment-edit-help" placeholder="#334b85" className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono" value={sky} onChange={(event) => setSky(event.target.value)} />
        </label>
        <label className="text-sm font-bold">Ground color
          <input aria-label="Cue ground color" aria-describedby="environment-edit-help" placeholder="#77628f" className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono" value={ground} onChange={(event) => setGround(event.target.value)} />
        </label>
        <label className="text-sm font-bold">Rain · 0–1
          <input aria-label="Cue rain intensity" aria-describedby="environment-edit-help" type="number" min="0" max="1" step="0.05" placeholder="Keep earlier value" className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono" value={rain} onChange={(event) => setRain(event.target.value)} />
        </label>
        <label className="text-sm font-bold">Bloom · 0–2
          <input aria-label="Cue bloom intensity" aria-describedby="environment-edit-help" type="number" min="0" max="2" step="0.05" placeholder="Keep earlier value" className="mt-1 w-full border-2 border-ink px-3 py-2 font-mono" value={bloom} onChange={(event) => setBloom(event.target.value)} />
        </label>
      </div>
      <button className="comic-button mt-3 w-full bg-comic-blue text-white" onClick={apply}>Apply environment action</button>
    </div>
  );
}

export default function CueEnvironmentEditor({ cue }: { cue: NormalizedMusicTimelineCue }) {
  const projectId = useProjectStore((state) => state.activeProjectId);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const actions = cue.actions.flatMap((action, index) => action.type === 'set-environment' ? [{ action, index }] : []);
  const selected = actions.find(({ index }) => index === selectedIndex) ?? actions[0];
  return (
    <section aria-label="Cue action editor" className="mt-5 border-t-2 border-ink/15 pt-4">
      <h4 className="font-display font-bold">Environment action</h4>
      {!selected ? <p className="mt-2 text-sm">This event has no environment action. Choose another event to edit sky, ground, rain or bloom.</p> : <>
        <label className="mt-2 block text-sm font-bold">Action
          <select aria-label="Cue environment action" className="mt-1 w-full border-2 border-ink bg-white px-3 py-2" value={selected.index} onChange={(event) => setSelectedIndex(Number(event.target.value))}>
            {actions.map(({ index }) => <option key={index} value={index}>Environment change · action {index + 1}</option>)}
          </select>
        </label>
        <EnvironmentFields key={`${projectId}:${cue.id}:${selected.index}:${JSON.stringify(selected.action.payload)}`} cueId={cue.id} actionIndex={selected.index} initial={selected.action.payload} />
      </>}
    </section>
  );
}
