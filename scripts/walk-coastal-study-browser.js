// Physical route exercise, with only the initial spawn set by the test probe.
async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload();
  await page.waitForFunction(() => !!window.__MUSIC_UNIVERSE_E2E__ && !!window.__MUSIC_UNIVERSE_WORLD_E2E__);
  await page.getByRole('button', { name: 'Enter Echo Garden', exact: true }).click();
  await page.getByRole('button', { name: 'Study music play pause', exact: true }).click();
  await page.evaluate(() => window.__MUSIC_UNIVERSE_E2E__.setPlayerTransform([0, .65, 2], Math.PI));
  await page.waitForTimeout(500);
  const walk = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(250); };
  const states = [];
  const record = async name => states.push({ name, state: await page.evaluate(() => window.__MUSIC_UNIVERSE_WORLD_E2E__.getSnapshot()) });
  await page.locator('canvas').click({ position: { x: 600, y: 350 } });
  await walk('w', 950); await page.keyboard.press('Escape'); await record('keeper approach');
  await page.keyboard.press('e');
  await page.getByRole('button', { name: '我去看看', exact: true }).click();
  await walk('a', 400); await walk('w', 1550); await record('atelier approach');
  await page.keyboard.press('e');
  await page.getByRole('button', { name: '带走这段记忆', exact: true }).click();
  await walk('d', 400); await walk('w', 400); await record('gate approach');
  await page.getByRole('button', { name: '归途', exact: true }).click();
  await page.keyboard.press('e');
  await page.getByRole('button', { name: '留在余音里', exact: true }).waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'output/playwright/coastal-childhood-edge/physical-walk-ending.png' });
  return { route: 'spawn → keeper → atelier → gate, WASD and E, no intermediate teleport', completed: await page.evaluate(() => window.__MUSIC_UNIVERSE_WORLD_E2E__.getSnapshot().flags['journey.completed']), states };
}
