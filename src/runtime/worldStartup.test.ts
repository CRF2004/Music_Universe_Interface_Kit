import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectWorldStartupSupport } from './worldStartup';

describe('world startup support', () => {
  it('accepts a usable WebGL2 context and releases the probe context', () => {
    let released = false;
    const support = detectWorldStartupSupport(() => ({
      getContext: () =>
        ({
          getExtension: (name: string) =>
            name === 'WEBGL_lose_context'
              ? { loseContext: () => { released = true; } }
              : null,
        }) as WebGL2RenderingContext,
    }));

    assert.deepEqual(support, { supported: true });
    assert.equal(released, true);
  });

  it('rejects a browser without a usable WebGL2 context', () => {
    assert.deepEqual(
      detectWorldStartupSupport(() => ({ getContext: () => null })),
      { supported: false, reason: 'webgl2-unavailable' },
    );
  });

  it('converts context creation failures into a recoverable result', () => {
    assert.deepEqual(
      detectWorldStartupSupport(() => {
        throw new Error('GPU process unavailable');
      }),
      { supported: false, reason: 'webgl2-unavailable' },
    );
  });

  it('allows the e2e probe to opt into a software WebGL renderer', () => {
    let requestedAttributes: WebGLContextAttributes | undefined;
    const support = detectWorldStartupSupport(
      () => ({
        getContext: (_contextId, attributes) => {
          requestedAttributes = attributes;
          return {
            getExtension: () => null,
          } as unknown as WebGL2RenderingContext;
        },
      }),
      { allowSoftwareRenderer: true },
    );

    assert.deepEqual(support, { supported: true });
    assert.equal(requestedAttributes?.failIfMajorPerformanceCaveat, false);
  });
});
