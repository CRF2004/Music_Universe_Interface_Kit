import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getInteractionVisualProfile,
  interactionVisualProfiles,
} from './visualProfiles';
import { demoWorld } from '../content/demoWorld';

describe('interaction visual profiles', () => {
  it('keeps the normalized hangar inside its reviewed collision volume', () => {
    const profile = interactionVisualProfiles.building;
    assert.equal(profile.targetHeight, 5.2);
    assert.equal(profile.collider.type, 'cuboid');
    if (profile.collider.type !== 'cuboid') return;

    const fullExtents = profile.collider.halfExtents.map((value) => value * 2);
    assert.ok(fullExtents[0] >= 10.4);
    assert.ok(fullExtents[1] >= 5.2);
    assert.ok(fullExtents[2] >= 14.2);
  });

  it('keeps portals traversable and unknown props safely crate-sized', () => {
    assert.equal(interactionVisualProfiles.portal.collider.type, 'none');
    assert.equal(
      getInteractionVisualProfile('future-unknown-prop'),
      interactionVisualProfiles.crate,
    );
  });

  it('keeps the Memory Archive interaction reachable outside the hangar', () => {
    const archive = demoWorld.interactions.find(
      (interaction) => interaction.id === 'memory-archive',
    );
    const collider = interactionVisualProfiles.building.collider;
    assert.ok(archive);
    assert.equal(collider.type, 'cuboid');
    if (!archive || collider.type !== 'cuboid') return;

    assert.ok((archive.radius ?? 0) > collider.halfExtents[2] + 0.3);
  });

});
