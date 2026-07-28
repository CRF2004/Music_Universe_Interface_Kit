import { useEffect, useRef, useState } from 'react';
import { interactionEventBus } from '../interaction/interactionRuntime';
import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';

function blockedMessage(interactionId: string, flags: Readonly<Record<string, unknown>>) {
  if (interactionId === 'memory-archive' && flags['journey.started'] !== true) {
    return 'The Archive is sealed. Speak with the Listener Guide first.';
  }
  if (interactionId === 'departure-gate') {
    if (flags['memory.received'] !== true) {
      return 'The gate hears no memory. Follow the Light Path back to the Memory Archive.';
    }
    return 'The gate is still listening. Stay with the music until it opens.';
  }
  return 'That response is not available yet. Try the current objective first.';
}

export default function JourneyRuntimeHUD() {
  const [feedback, setFeedback] = useState<string | null>(null);
  const flags = useInteractionStore((state) => state.interactionFlags);
  const helpOpen = useWorldStore((state) => state.helpOpen);
  const setHelpOpen = useWorldStore((state) => state.setHelpOpen);
  const helpDialogRef = useRef<HTMLElement>(null);

  useEffect(
    () =>
      interactionEventBus.subscribe((event) => {
        if (event.type !== 'interaction.blocked') return;
        setFeedback(blockedMessage(event.interactionId, useInteractionStore.getState().interactionFlags));
      }),
    [],
  );

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (!helpOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !helpDialogRef.current) return;
      const focusable = Array.from(
        helpDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [helpOpen]);

  const objective =
    flags['journey.started'] !== true
      ? 'Meet the Listener Guide'
      : flags['memory.received'] !== true
        ? 'Recover the Archive’s memory'
        : flags['journey.completed'] !== true
          ? 'Reach the Departure Gate'
          : 'Journey complete';

  return (
    <>
      <aside
        aria-label="Current journey objective"
        className="pointer-events-none fixed right-5 top-5 z-[55] max-w-[min(20rem,calc(100vw-2.5rem))] rounded-xl border-2 border-white/70 bg-ink/80 px-4 py-3 text-white shadow-lg backdrop-blur"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Current objective</p>
        <p className="mt-1 font-display font-bold">{objective}</p>
      </aside>

      <div
        aria-atomic="true"
        aria-live="polite"
        className="pointer-events-none fixed left-1/2 top-24 z-[80] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2"
      >
        {feedback && (
          <div className="rounded-xl border-4 border-ink bg-comic-yellow p-4 text-center font-display font-bold shadow-[6px_6px_0_0_#111]">
            {feedback}
          </div>
        )}
      </div>

      {helpOpen && (
        <div className="pointer-events-auto fixed inset-0 z-[90] flex items-center justify-center bg-ink/70 p-4">
          <section
            ref={helpDialogRef}
            aria-labelledby="journey-welcome-title"
            aria-modal="true"
            className="comic-panel w-full max-w-xl"
            role="dialog"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-comic-blue">Memory Journey</p>
            <h1 id="journey-welcome-title" className="mt-2 font-display text-4xl font-black">
              Carry one memory home.
            </h1>
            <p className="mt-4 text-lg leading-relaxed">
              Meet the Guide, recover the Archive’s memory, and follow the music to the Departure Gate.
            </p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              <li><strong>Move:</strong> WASD / arrows</li>
              <li><strong>Interact:</strong> E or click</li>
              <li><strong>Jump:</strong> Space</li>
              <li><strong>Run:</strong> Shift</li>
            </ul>
            <button
              autoFocus
              className="comic-button mt-6 w-full bg-comic-blue py-3 text-lg text-white"
              onClick={() => {
                window.localStorage.setItem('music-universe.onboarding-seen', 'true');
                setHelpOpen(false);
              }}
            >
              Enter the world
            </button>
          </section>
        </div>
      )}
    </>
  );
}
