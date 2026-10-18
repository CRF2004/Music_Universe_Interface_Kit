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
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const flags = useInteractionStore((state) => state.interactionFlags);
  const activePanelId = useInteractionStore((state) => state.activePanelId);
  const helpOpen = useWorldStore((state) => state.helpOpen);
  const setHelpOpen = useWorldStore((state) => state.setHelpOpen);
  const helpDialogRef = useRef<HTMLElement>(null);

  useEffect(
    () =>
      interactionEventBus.subscribe((event) => {
        if (event.type === 'interaction.blocked') {
          setFeedback({
            message: blockedMessage(event.interactionId, useInteractionStore.getState().interactionFlags),
            success: false,
          });
          return;
        }
        if (event.type === 'interaction.runtime-reset') {
          setFeedback(null);
          return;
        }
        if (event.type !== 'interaction.flag-changed' || event.value !== true) return;
        const messages: Record<string, string> = {
          'journey.started': 'Journey accepted — follow the violet trail to the Memory Archive.',
          'memory.received': 'Memory recovered — the green signal marks the Departure Gate.',
          'journey.completed': 'Memory carried home — your journey is complete.',
        };
        const message = messages[event.key];
        if (message) setFeedback({ message, success: true });
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
    const helpTrigger = document.querySelector<HTMLElement>(
      '[aria-label="Open journey guide"]',
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHelpOpen(false);
        return;
      }
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
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      helpTrigger?.focus();
    };
  }, [helpOpen, setHelpOpen]);

  const objective =
    flags['journey.started'] !== true
      ? 'Meet the Listener Guide'
      : flags['memory.received'] !== true
        ? 'Recover the Archive’s memory'
        : flags['journey.completed'] !== true
          ? 'Reach the Departure Gate'
          : 'Journey complete';
  const step =
    flags['journey.started'] !== true
      ? 1
      : flags['memory.received'] !== true
        ? 2
        : 3;

  return (
    <>
      <aside
        aria-label="Current journey objective"
        className="pointer-events-none fixed right-5 top-5 z-[55] max-w-[min(20rem,calc(100vw-2.5rem))] rounded-xl border-2 border-white/70 bg-ink/80 px-4 py-3 text-white shadow-lg backdrop-blur"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
          Journey step {step} / 3
        </p>
        <p className="mt-1 font-display font-bold">{objective}</p>
        {flags['journey.completed'] !== true && (
          <p className="mt-1 text-xs text-white/70">Follow the pulsing trail and world marker.</p>
        )}
      </aside>

      <div
        aria-atomic="true"
        aria-live="polite"
        className="pointer-events-none fixed left-1/2 top-24 z-[80] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2"
      >
        {feedback && !activePanelId && (
          <div
            className={`rounded-xl border-4 border-ink p-4 text-center font-display font-bold shadow-[6px_6px_0_0_#111] ${
              feedback.success ? 'bg-emerald-300' : 'bg-comic-yellow'
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.16em] opacity-60">
              {feedback.success ? 'Objective updated' : 'Not yet'}
            </p>
            {feedback.message}
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
              <li><strong>Look:</strong> Click the world, then move the mouse</li>
              <li><strong>Interact:</strong> E or click</li>
              <li><strong>Jump:</strong> Space</li>
              <li><strong>Run:</strong> Shift</li>
              <li><strong>Release mouse:</strong> Esc</li>
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
