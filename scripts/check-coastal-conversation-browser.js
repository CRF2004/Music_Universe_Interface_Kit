async (page) => {
  await page.setViewportSize({ width: 800, height: 600 }); await page.reload();
  await page.waitForFunction(() => !!window.__MUSIC_UNIVERSE_E2E__ && !!window.__MUSIC_UNIVERSE_WORLD_E2E__);
  const button = name => page.getByRole('button', { name, exact: true });
  await button('Enter Echo Garden').waitFor();
  if (await button('Study reduced effects').getAttribute('aria-pressed') !== 'true') await button('Study reduced effects').click();
  await button('Enter Echo Garden').click(); await button('Study music play pause').click();
  await page.evaluate(() => {
    const r = 60, z = -3, h = .65;
    window.__MUSIC_UNIVERSE_E2E__.setPlayerTransform([0, Math.cos(3/r)*(r+h)-r, Math.sin(3/r)*(r+h)*Math.sign(z)], Math.PI);
  });
  await page.waitForTimeout(500); await page.keyboard.press('e');
  await page.getByRole('dialog').waitFor(); await page.waitForTimeout(600);
  if (!await page.getByRole('dialog').evaluate(el => { const r=el.getBoundingClientRect(); return r.left >= innerWidth/2 && r.right <= innerWidth && r.top>=0 && r.bottom<=innerHeight; })) throw new Error('Compact conversation does not fit');
  await page.screenshot({ path:'output/playwright/coastal-childhood-edge/compact-reduced-conversation.png' });
  await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state:'hidden' });
  if (!await button('Study music play pause').isVisible()) throw new Error('Escape did not restore exploration controls');
  return { status:'passed', checks:['compact conversation fits', 'reduced-effects portrait inspected', 'Escape returns to exploration'] };
}
