import { useAudioPlayerStore } from '../music/player/useAudioPlayerStore';
import { useProjectStore } from '../state/useProjectStore';

const copy = {
  'echo-terminal': { eyebrow: 'NOTES FROM THE GARDEN', title: '沿着旋律，慢慢走。', body: '与守园人交谈，去左侧的工坊取回记忆，再走向前方的门。音乐走到归途时，门会亮起来。WASD 移动，E 交谈。', action: '继续散步' },
  'guide-dialog': { eyebrow: 'THE GARDEN KEEPER', title: '旋律会记得。', body: '欢迎来到花园。去左侧的工坊，取回一段回声。等这首歌走到归途，门就会为你亮起来。', action: '我去看看' },
  'memory-fragment': { eyebrow: 'A MEMORY RECOVERED', title: '风经过窗边，旧日也有了回声。', body: '你已经找到它。沿着石径向前，带着这段记忆，等音乐为归途开门。', action: '带走这段记忆' },
  'journey-ending': { eyebrow: 'A SONG TO TAKE HOME', title: '愿这段旋律，陪你走得更远。', body: '记忆已经送达。你可以在花园多停留片刻。歌曲结束后，按播放键，再走一次。', action: '留在余音里' },
} as const;
export function coastalPanelCopy(id: string) { return Object.entries(copy).find(([key]) => key === id)?.[1]; }
export default function CoastalPanel({ content, onClose }: { content: (typeof copy)[keyof typeof copy]; onClose: () => void }) {
  const restart = useAudioPlayerStore(state => state.restartJourney);
  const credit = useProjectStore(state => state.project.track.rights.attribution);
  if (content === copy['journey-ending']) return <article className="coastal-ending-copy">
    <p className="coastal-eyebrow">A MEMORY TAKEN HOME</p>
    <h2>风停了，<br /><em>旋律还在。</em></h2>
    <p>这一段回声，已经送达。<br />留在花园听余音，或再走一次。</p>
    <div className="coastal-ending-actions"><button onClick={onClose}>留在余音里</button><button aria-label="Restart garden journey" onClick={() => void restart()}>再走一次 ↗</button></div>
    <details className="coastal-rights"><summary>音乐署名</summary><p>{credit}</p></details>
  </article>;
  return <article className="px-5 pb-7 pt-2 text-center sm:px-12"><p className="mb-6 text-[9px] tracking-[.3em] text-[#69846c]">{content.eyebrow}</p><h2 className="mb-6 text-3xl leading-relaxed text-[#36564a]" style={{fontFamily:'Georgia,serif'}}>{content.title}</h2><p className="mx-auto max-w-md text-sm leading-loose text-[#657365]">{content.body}</p><button className="mx-auto mt-8 rounded-full bg-[#3d604e] px-7 py-3 text-sm text-[#fff6df]" onClick={onClose}>{content.action}</button></article>;
}
