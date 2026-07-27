import { useLoader, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import {
  AudioListener,
  AudioLoader,
  PositionalAudio as ThreePositionalAudio,
} from 'three';
import { useRuntimeAsset } from '../assets/runtimeAssetManifest';
import { FOOTSTEP_EVENT } from './audioEvents';

interface AudioE2ETelemetry {
  spatialLoopsPlaying: number;
  uiHoverEvents: number;
  uiConfirmEvents: number;
  footstepEvents: number;
  contextState?: AudioContextState;
}

type AudioE2EWindow = Window & {
  __MUSIC_UNIVERSE_AUDIO_E2E__?: AudioE2ETelemetry;
};

function updateAudioE2E(update: (state: AudioE2ETelemetry) => void) {
  if (!new URLSearchParams(window.location.search).has('e2e')) return;
  const target = window as AudioE2EWindow;
  target.__MUSIC_UNIVERSE_AUDIO_E2E__ ??= {
    spatialLoopsPlaying: 0,
    uiHoverEvents: 0,
    uiConfirmEvents: 0,
    footstepEvents: 0,
  };
  update(target.__MUSIC_UNIVERSE_AUDIO_E2E__);
}

interface AudioUrls {
  portalHum: string;
  windAmbience: string;
  uiHover: string;
  uiConfirm: string;
  footstepA: string;
  footstepB: string;
}

function SpatialLoop({
  listener,
  url,
  distance,
  volume,
  position,
}: {
  listener: AudioListener;
  url: string;
  distance: number;
  volume: number;
  position: [number, number, number];
}) {
  const audio = useRef<ThreePositionalAudio>(null);
  const buffer = useLoader(AudioLoader, url);

  useEffect(() => {
    const source = audio.current;
    if (!source) return;
    source.setBuffer(buffer);
    source.setLoop(true);
    source.setRefDistance(distance);
    source.setRolloffFactor(1.35);
    source.setVolume(volume);

    const start = () => {
      void listener.context.resume().then(() => {
        if (!source.isPlaying) {
          source.play();
          updateAudioE2E((state) => {
            state.spatialLoopsPlaying += 1;
            state.contextState = listener.context.state;
          });
        }
      });
    };
    document.addEventListener('pointerdown', start, { once: true });
    document.addEventListener('keydown', start, { once: true });
    return () => {
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('keydown', start);
      if (source.isPlaying) source.stop();
      updateAudioE2E((state) => {
        state.spatialLoopsPlaying = Math.max(0, state.spatialLoopsPlaying - 1);
        state.contextState = listener.context.state;
      });
      source.disconnect();
    };
  }, [buffer, distance, listener, volume]);

  return <positionalAudio ref={audio} args={[listener]} position={position} />;
}

function UiAndFootstepAudio({
  uiHover,
  uiConfirm,
  footstepA,
  footstepB,
}: Pick<AudioUrls, 'uiHover' | 'uiConfirm' | 'footstepA' | 'footstepB'>) {
  useEffect(() => {
    const hover = new Audio(uiHover);
    const confirm = new Audio(uiConfirm);
    const footsteps = [new Audio(footstepA), new Audio(footstepB)];
    hover.volume = 0.18;
    confirm.volume = 0.28;
    footsteps.forEach((audio) => {
      audio.volume = 0.22;
      audio.preload = 'auto';
    });
    let footstepIndex = 0;

    const play = (audio: HTMLAudioElement) => {
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    };
    const isInteractive = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('button, a, label, input, [role="button"]'));
    const onHover = (event: PointerEvent) => {
      const interactiveTarget =
        event.target instanceof Element
          ? event.target.closest('button, a, label, input, [role="button"]')
          : null;
      const previousInteractiveTarget =
        event.relatedTarget instanceof Element
          ? event.relatedTarget.closest('button, a, label, input, [role="button"]')
          : null;
      if (interactiveTarget && interactiveTarget !== previousInteractiveTarget) {
        play(hover);
        updateAudioE2E((state) => {
          state.uiHoverEvents += 1;
        });
      }
    };
    const onConfirm = (event: MouseEvent) => {
      if (isInteractive(event.target)) {
        play(confirm);
        updateAudioE2E((state) => {
          state.uiConfirmEvents += 1;
        });
      }
    };
    const onFootstep = () => {
      play(footsteps[footstepIndex % footsteps.length]);
      footstepIndex += 1;
      updateAudioE2E((state) => {
        state.footstepEvents += 1;
      });
    };

    document.addEventListener('pointerover', onHover);
    document.addEventListener('click', onConfirm);
    window.addEventListener(FOOTSTEP_EVENT, onFootstep);
    return () => {
      document.removeEventListener('pointerover', onHover);
      document.removeEventListener('click', onConfirm);
      window.removeEventListener(FOOTSTEP_EVENT, onFootstep);
      [hover, confirm, ...footsteps].forEach((audio) => {
        audio.pause();
        audio.removeAttribute('src');
      });
    };
  }, [footstepA, footstepB, uiConfirm, uiHover]);

  return null;
}

function AudioRuntime({ urls }: { urls: AudioUrls }) {
  const camera = useThree((state) => state.camera);
  const [listener] = useState(() => new AudioListener());

  useEffect(() => {
    camera.add(listener);
    return () => {
      camera.remove(listener);
    };
  }, [camera, listener]);

  return (
    <>
      <SpatialLoop
        listener={listener}
        url={urls.portalHum}
        distance={3.2}
        volume={0.24}
        position={[12, 1.6, 5]}
      />
      <SpatialLoop
        listener={listener}
        url={urls.windAmbience}
        distance={22}
        volume={0.12}
        position={[0, 5, -9]}
      />
      <UiAndFootstepAudio
        uiHover={urls.uiHover}
        uiConfirm={urls.uiConfirm}
        footstepA={urls.footstepA}
        footstepB={urls.footstepB}
      />
    </>
  );
}

export default function AudioWorld() {
  const portalHum = useRuntimeAsset('portal-hum', 'audio');
  const windAmbience = useRuntimeAsset('wind-ambience', 'audio');
  const uiHover = useRuntimeAsset('ui-hover', 'audio');
  const uiConfirm = useRuntimeAsset('ui-confirm', 'audio');
  const footstepA = useRuntimeAsset('footstep-a', 'audio');
  const footstepB = useRuntimeAsset('footstep-b', 'audio');
  const assets = [portalHum, windAmbience, uiHover, uiConfirm, footstepA, footstepB];

  if (assets.some((asset) => asset.status !== 'ready')) return null;

  return (
    <Suspense fallback={null}>
      <AudioRuntime
        urls={{
          portalHum: portalHum.asset.url,
          windAmbience: windAmbience.asset.url,
          uiHover: uiHover.asset.url,
          uiConfirm: uiConfirm.asset.url,
          footstepA: footstepA.asset.url,
          footstepB: footstepB.asset.url,
        }}
      />
    </Suspense>
  );
}
