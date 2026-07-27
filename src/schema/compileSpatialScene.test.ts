import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { demoScene } from '../content/demoScene';
import { compileSpatialScene } from './compileSpatialScene';

describe('spatial scene visual defaults', () => {
  it('inherits the environment outline setting for interaction visuals', () => {
    const world = compileSpatialScene(demoScene);

    assert.ok(world.interactions.length > 0);
    world.interactions.forEach((interaction) => {
      assert.equal(interaction.visual.outline, true);
    });
  });

  it('allows an object appearance to disable the inherited outline', () => {
    const scene = {
      ...demoScene,
      objects: demoScene.objects.map((object, index) =>
        index === 0
          ? {
              ...object,
              appearance: { ...object.appearance, outline: false },
            }
          : object,
      ),
    };

    const world = compileSpatialScene(scene);

    assert.equal(world.interactions[0].visual.outline, false);
    assert.equal(world.interactions[1].visual.outline, true);
  });
});
