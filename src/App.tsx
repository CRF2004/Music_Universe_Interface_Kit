import { lazy, Suspense, useState, type ReactNode } from 'react';
import { detectLaunchSupport } from './runtime/launchSupport';
import { detectWorldStartupSupport } from './runtime/worldStartup';
import WorldRuntimeErrorBoundary from './ui/WorldRuntimeErrorBoundary';
import WorldStartupFallback from './ui/WorldStartupFallback';

const ExperienceRoot = lazy(() => import('./ExperienceRoot'));

function E2ERuntimeFailure(): ReactNode {
  throw new Error('Intentional E2E runtime failure.');
}

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
  const searchParams = new URLSearchParams(window.location.search);
  const e2eEnabled = searchParams.has('e2e');
  const e2eFault = e2eEnabled ? searchParams.get('e2eFault') : null;
  const [launchSupport] = useState(() =>
    e2eEnabled
      ? { supported: true as const }
      : detectLaunchSupport(),
  );
  const [startupSupport] = useState(() =>
    e2eFault === 'webgl2-unavailable'
      ? { supported: false as const, reason: 'webgl2-unavailable' as const }
      : detectWorldStartupSupport(undefined, {
          allowSoftwareRenderer: e2eEnabled,
        }),
  );
  const reloadWorld = () => window.location.reload();

  if ('reason' in launchSupport) {
    return <WorldStartupFallback kind={launchSupport.reason} />;
  }

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
      {e2eFault === 'runtime-error' ? (
        <E2ERuntimeFailure />
      ) : (
        <Suspense fallback={<AppLoadingScreen />}>
          <ExperienceRoot />
        </Suspense>
      )}
    </WorldRuntimeErrorBoundary>
  );
}
