async (page) => {
  const checks = [];
  const check = (name, value) => { if (!value) throw new Error(name); checks.push(name); };
  let missingRequests = 0;
  const scenery = '**/assets/generated/coastal-garden*.glb';
  await page.route(scenery, route => { missingRequests++; return route.fulfill({ status: 404, body: 'Missing test scenery' }); });
  const missingResponse = page.waitForResponse(response => response.url().includes('/coastal-garden.') && response.status() === 404);
  await page.reload();
  await missingResponse;
  await page.getByRole('button', { name: 'Enter Echo Garden', exact: true }).waitFor();
  await page.getByText('花园景物正在加载，载入失败时可刷新重试。', { exact: true }).waitFor();
  check('missing scenery keeps a readable fallback and entry', missingRequests > 0 && await page.getByText('花园景物正在加载，载入失败时可刷新重试。', { exact: true }).isVisible());
  await page.unroute(scenery); await page.reload();
  await page.getByText('花园景物正在加载，载入失败时可刷新重试。', { exact: true }).waitFor({ state: 'hidden' });
  check('refresh recovers the garden after source restoration', true);
  const music = '**/assets/generated/scott-buckley-childhood*.ogg';
  await page.route(music, route => route.fulfill({ status: 404, body: 'Missing test song' }));
  await page.getByRole('button', { name: 'Enter Echo Garden', exact: true }).click();
  await page.getByRole('alert').waitFor();
  check('song failure has readable error and allows retry', await page.getByRole('button', { name: 'Enter Echo Garden', exact: true }).isEnabled());
  await page.screenshot({ path: 'output/playwright/coastal-chrome/song-error.png' });
  await page.unroute(music);
  await page.getByRole('button', { name: 'Enter Echo Garden', exact: true }).click();
  await page.getByRole('button', { name: 'Study music play pause', exact: true }).waitFor();
  await page.waitForTimeout(600);
  check('song retry advances real audio', Number(await page.getByLabel('Study music progress', { exact: true }).inputValue()) > .1);
  await page.getByRole('button', { name: 'Study music play pause', exact: true }).click();
  return { status: 'passed', checks, expectedFailures: ['scenery HTTP 404 caught by asset boundary', 'song HTTP 404 caught by study player'] };
}
