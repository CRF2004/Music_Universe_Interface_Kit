import { lazy, Suspense, useState } from 'react';
import { detectWorldStartupSupport } from './runtime/worldStartup';
import WorldRuntimeErrorBoundary from './ui/WorldRuntimeErrorBoundary';
import WorldStartupFallback from './ui/WorldStartupFallback';

const ExperienceRoot = lazy(() => import('./ExperienceRoot'));

function AppLoadingScreen() {
  return (
    <main className="flex h-screen w-full items-center justify-center bg-[#26375d] text-white">
      <div className="comic-panel max-w-sm text-center text-ink">
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-ink/55">
          Music Universe
        </p>
        <p className="mt-2 font-display text-xl font-bold">Loading the world…</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/15">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-comic-yellow" />
        </div>
      </div>
    </main>
  );
}

/**
 * @license MIT
 * Copyright (c) 2026 Music Universe
 */
export default function App() {
  const [startupSupport] = useState(() =>
    detectWorldStartupSupport(undefined, {
      allowSoftwareRenderer: new URLSearchParams(window.location.search).has('e2e'),
    }),
  );
  const reloadWorld = () => window.location.reload();

  if ('reason' in startupSupport) {
    return (
      <WorldStartupFallback
        kind={startupSupport.reason}
        onRetry={reloadWorld}
      />
    );
  }

  return (
    <WorldRuntimeErrorBoundary onRetry={reloadWorld}>
      <Suspense fallback={<AppLoadingScreen />}>
        <ExperienceRoot />
      </Suspense>
    </WorldRuntimeErrorBoundary>
  );
}
