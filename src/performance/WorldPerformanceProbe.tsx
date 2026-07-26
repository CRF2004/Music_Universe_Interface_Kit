import { addAfterEffect, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ResourceTotals {
  count: number;
  transferBytes: number;
  encodedBytes: number;
}

export interface WorldPerformanceTelemetry {
  viewportCssPixels: [number, number];
  devicePixelRatio: number;
  logicalCpuCores: number;
  sampleCount: number;
  medianFps: number | null;
  onePercentLowFps: number | null;
  drawCalls: number;
  visibleTriangles: number;
  geometries: number;
  textures: number;
  estimatedGeometryBytes: number;
  estimatedTextureBytes: number;
  estimatedFramebufferBytes: number;
  estimatedGpuBytesLowerBound: number;
  resources: ResourceTotals;
  renderer: string | null;
  vendor: string | null;
}

type PerformanceWindow = Window & {
  __MUSIC_UNIVERSE_PERFORMANCE_E2E__?: WorldPerformanceTelemetry;
};

const MAX_FRAME_SAMPLES = 600;
const UPDATE_INTERVAL_MS = 500;

function percentile(sortedValues: number[], ratio: number) {
  if (sortedValues.length === 0) return null;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.floor((sortedValues.length - 1) * ratio)),
  );
  return sortedValues[index];
}

function sumResourceTotals(): ResourceTotals {
  return performance
    .getEntriesByType('resource')
    .reduce<ResourceTotals>(
      (totals, entry) => {
        const resource = entry as PerformanceResourceTiming;
        totals.count += 1;
        totals.transferBytes += resource.transferSize || 0;
        totals.encodedBytes += resource.encodedBodySize || 0;
        return totals;
      },
      { count: 0, transferBytes: 0, encodedBytes: 0 },
    );
}

function textureDimensions(texture: THREE.Texture) {
  const image = texture.image as
    | { width?: number; height?: number }
    | Array<{ width?: number; height?: number }>
    | undefined;
  const images = Array.isArray(image) ? image : image ? [image] : [];

  return images.reduce(
    (total, item) => total + Math.max(0, item.width ?? 0) * Math.max(0, item.height ?? 0),
    0,
  );
}

function estimateSceneGpuMemory(
  scene: THREE.Scene,
  viewportWidth: number,
  viewportHeight: number,
  pixelRatio: number,
) {
  const attributeBuffers = new Set<ArrayBufferLike>();
  const textures = new Set<THREE.Texture>();
  let shadowMapPixels = 0;

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const geometry = object.geometry;
      const attributes = [
        ...Object.values(geometry.attributes),
        ...(geometry.index ? [geometry.index] : []),
        ...Object.values(geometry.morphAttributes).flat(),
      ];

      attributes.forEach((attribute) => {
        if (attribute?.array?.buffer) attributeBuffers.add(attribute.array.buffer);
      });

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) textures.add(value);
        });
      });
    }

    if (
      (object instanceof THREE.DirectionalLight ||
        object instanceof THREE.PointLight ||
        object instanceof THREE.SpotLight) &&
      object.castShadow
    ) {
      shadowMapPixels += object.shadow.mapSize.width * object.shadow.mapSize.height;
    }
  });

  const estimatedGeometryBytes = [...attributeBuffers].reduce(
    (total, buffer) => total + buffer.byteLength,
    0,
  );
  const estimatedTextureBytes = [...textures].reduce((total, texture) => {
    const mipFactor = texture.generateMipmaps ? 4 / 3 : 1;
    return total + textureDimensions(texture) * 4 * mipFactor;
  }, 0);
  const physicalWidth = Math.ceil(viewportWidth * pixelRatio);
  const physicalHeight = Math.ceil(viewportHeight * pixelRatio);
  // RGBA8 color + a conservative 32-bit depth/stencil estimate, plus shadow maps.
  const estimatedFramebufferBytes =
    physicalWidth * physicalHeight * 8 + shadowMapPixels * 4;

  return {
    estimatedGeometryBytes,
    estimatedTextureBytes,
    estimatedFramebufferBytes,
    estimatedGpuBytesLowerBound:
      estimatedGeometryBytes + estimatedTextureBytes + estimatedFramebufferBytes,
  };
}

function readRendererIdentity(renderer: THREE.WebGLRenderer) {
  const context = renderer.getContext();
  const extension = context.getExtension('WEBGL_debug_renderer_info');
  if (!extension) return { renderer: null, vendor: null };

  return {
    renderer: context.getParameter(extension.UNMASKED_RENDERER_WEBGL) as string,
    vendor: context.getParameter(extension.UNMASKED_VENDOR_WEBGL) as string,
  };
}

/**
 * Production-safe instrumentation. It is inert unless the page is opened with
 * `?e2e=1`, so release measurements and browser automation share one schema
 * without adding a visible debug HUD.
 */
export default function WorldPerformanceProbe() {
  const { gl, scene, size } = useThree();
  const enabled = useRef(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e'),
  );
  const fpsSamples = useRef<number[]>([]);
  const lastUpdateAt = useRef(0);
  const peakDrawCalls = useRef(0);
  const peakTriangles = useRef(0);

  useEffect(() => {
    const removeAfterEffect = enabled.current
      ? addAfterEffect(() => {
          // Renderer statistics are complete only after the scene and effect
          // passes have rendered; useFrame runs before that point.
          peakDrawCalls.current = Math.max(peakDrawCalls.current, gl.info.render.calls);
          peakTriangles.current = Math.max(peakTriangles.current, gl.info.render.triangles);
        })
      : undefined;

    return () => {
      removeAfterEffect?.();
      if (enabled.current) {
        delete (window as PerformanceWindow).__MUSIC_UNIVERSE_PERFORMANCE_E2E__;
      }
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!enabled.current || delta <= 0 || delta >= 0.5) return;

    const samples = fpsSamples.current;
    samples.push(1 / delta);
    if (samples.length > MAX_FRAME_SAMPLES) samples.shift();

    const now = performance.now();
    if (now - lastUpdateAt.current < UPDATE_INTERVAL_MS) return;
    lastUpdateAt.current = now;

    const sortedFps = [...samples].sort((left, right) => left - right);
    const memory = estimateSceneGpuMemory(scene, size.width, size.height, gl.getPixelRatio());
    const identity = readRendererIdentity(gl);

    (window as PerformanceWindow).__MUSIC_UNIVERSE_PERFORMANCE_E2E__ = {
      viewportCssPixels: [size.width, size.height],
      devicePixelRatio: gl.getPixelRatio(),
      logicalCpuCores: navigator.hardwareConcurrency,
      sampleCount: samples.length,
      medianFps: percentile(sortedFps, 0.5),
      onePercentLowFps: percentile(sortedFps, 0.01),
      drawCalls: peakDrawCalls.current,
      visibleTriangles: peakTriangles.current,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      ...memory,
      resources: sumResourceTotals(),
      ...identity,
    };
  });

  return null;
}
