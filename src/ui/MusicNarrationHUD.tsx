import { useMusicExperienceStore } from '../state/useMusicExperienceStore';

export default function MusicNarrationHUD() {
  const narration = useMusicExperienceStore((state) => state.timeline.narration);
  const cue = useMusicExperienceStore((state) => state.timeline.activeCue);

  if (!narration && !cue) return null;

  return (
    <div className="music-narration-hud">
      {cue && <div>{cue.label ?? cue.id}</div>}
      {narration && <p>{narration.body}</p>}
    </div>
  );
}
