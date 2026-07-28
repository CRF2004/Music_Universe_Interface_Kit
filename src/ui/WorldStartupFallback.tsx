interface WorldStartupFallbackProps {
  kind: 'webgl2-unavailable' | 'runtime-error';
  onRetry: () => void;
}

const content = {
  'webgl2-unavailable': {
    eyebrow: 'Graphics unavailable',
    title: 'This world needs WebGL 2',
    body:
      'Enable hardware acceleration or try a current desktop browser, then reload the world.',
  },
  'runtime-error': {
    eyebrow: 'World interrupted',
    title: 'The world could not finish loading',
    body:
      'Your music file has not been uploaded to a server. Reload the experience and choose it again.',
  },
} as const;

export default function WorldStartupFallback({
  kind,
  onRetry,
}: WorldStartupFallbackProps) {
  const message = content[kind];

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#26375d] p-6 text-ink">
      <section
        aria-labelledby="world-startup-title"
        className="comic-panel max-w-lg"
        role="alert"
      >
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-ink/55">
          {message.eyebrow}
        </p>
        <h1
          className="mt-2 font-display text-2xl font-bold"
          id="world-startup-title"
        >
          {message.title}
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-6 text-ink/75">
          {message.body}
        </p>
        <button
          className="comic-button mt-6 bg-comic-yellow"
          onClick={onRetry}
          type="button"
        >
          Reload world
        </button>
      </section>
    </main>
  );
}
