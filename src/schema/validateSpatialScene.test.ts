import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { demoScene } from '../content/demoScene';
import { validateSpatialScene } from './validateSpatialScene';

function cloneDemoScene(): Record<string, unknown> {
  return structuredClone(demoScene) as unknown as Record<string, unknown>;
}

function firstInteraction(scene: Record<string, unknown>) {
  const objects = scene.objects as Array<Record<string, unknown>>;
  return objects[0].interaction as Record<string, unknown>;
}

describe('spatial scene interaction condition validation', () => {
  it('accepts the current demo scene', () => {
    assert.equal(validateSpatialScene(demoScene).valid, true);
  });

  it('validates trigger condition type, key, and operator', () => {
    const scene = cloneDemoScene();
    const interaction = firstInteraction(scene);
    const triggers = interaction.triggers as Array<Record<string, unknown>>;
    triggers[0].conditions = [
      { type: 'unknown', key: '', operator: 'approximately', value: true },
    ];

    const result = validateSpatialScene(scene);
    const paths = result.issues.map((issue) => issue.path);

    assert.equal(result.valid, false);
    assert.ok(paths.includes('$.objects[0].interaction.triggers[0].conditions[0].type'));
    assert.ok(paths.includes('$.objects[0].interaction.triggers[0].conditions[0].key'));
    assert.ok(paths.includes('$.objects[0].interaction.triggers[0].conditions[0].operator'));
  });

  it('requires operator values and finite numeric comparisons', () => {
    const scene = cloneDemoScene();
    const interaction = firstInteraction(scene);
    const actions = interaction.actions as Array<Record<string, unknown>>;
    actions[0].conditions = [
      { type: 'flag', key: 'journey.started', operator: 'equals' },
      {
        type: 'app-state',
        key: 'progress',
        operator: 'gt',
        value: 'two',
      },
    ];

    const result = validateSpatialScene(scene);

    assert.equal(result.valid, false);
    assert.deepEqual(
      result.issues
        .filter((issue) => issue.path.endsWith('.value'))
        .map((issue) => issue.message),
      [
        'is required for the equals operator',
        'must be a finite number for the gt operator',
      ],
    );
  });

  it('allows omitted operators to mean exists or equals deterministically', () => {
    const scene = cloneDemoScene();
    const interaction = firstInteraction(scene);
    const actions = interaction.actions as Array<Record<string, unknown>>;
    actions[0].conditions = [
      { type: 'flag', key: 'journey.started' },
      { type: 'flag', key: 'memory.received', value: true },
    ];

    assert.equal(validateSpatialScene(scene).valid, true);
  });

  it('validates set-flag and clear-flag payload contracts', () => {
    const validScene = cloneDemoScene();
    const validInteraction = firstInteraction(validScene);
    validInteraction.actions = [
      {
        id: 'start-journey',
        type: 'set-flag',
        payload: { key: 'journey.started', value: true },
      },
      {
        id: 'clear-memory',
        type: 'clear-flag',
        payload: { key: 'memory.received' },
      },
    ];
    assert.equal(validateSpatialScene(validScene).valid, true);

    const invalidScene = cloneDemoScene();
    const invalidInteraction = firstInteraction(invalidScene);
    invalidInteraction.actions = [
      {
        id: 'broken-flag',
        type: 'set-flag',
        payload: { key: '' },
      },
    ];
    const result = validateSpatialScene(invalidScene);
    assert.equal(result.valid, false);
    assert.deepEqual(
      result.issues.map((issue) => issue.path),
      [
        '$.objects[0].interaction.actions[0].payload.key',
        '$.objects[0].interaction.actions[0].payload.value',
      ],
    );
  });
});
