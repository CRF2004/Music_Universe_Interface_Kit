async (page) => {
  const button = name => page.getByRole('button', { name, exact: true });
  if (await button('Close project editor').isVisible()) await button('Close project editor').click();
  const exportProject = async () => {
    await button('Open project editor').click();
    const pending = page.waitForEvent('download'); await button('Export project').click();
    const stream = await (await pending).createReadStream(); let json = '';
    for await (const chunk of stream) json += chunk.toString();
    return JSON.parse(json);
  };
  const project = await exportProject();
  project.metadata.title = 'Preserve my garden edits';
  project.scene.objects.find(o => o.id === 'npc-guide').appearance.assetId = 'guide-astronaut';
  project.scene.objects.find(o => o.id === 'echo-terminal').appearance.assetId = 'support-terminal';
  project.scene.objects.find(o => o.id === 'departure-gate').appearance.assetId = 'departure-portal';
  project.scene.objects.find(o => o.id === 'memory-archive').transform.position = [-9, 0, -10];
  const drafts = () => page.getByRole('list', { name: 'Active project drafts', exact: true }).locator(':scope > li');
  const initial = await drafts().count();
  await page.getByLabel('Import MusicWorldProject', { exact: true }).evaluate((el, json) => {
    const t = new DataTransfer(); t.items.add(new File([json], 'legacy-garden.musicworld.json', { type: 'application/json' }));
    el.files = t.files; el.dispatchEvent(new Event('change', { bubbles: true }));
  }, JSON.stringify(project));
  await page.waitForFunction(initial => document.querySelector('[aria-label="Active project drafts"]')?.children.length === initial + 1, initial);
  const before = await drafts().count();
  await page.waitForTimeout(1000); await page.reload();
  await page.waitForFunction(() => window.__MUSIC_UNIVERSE_WORLD_E2E__?.getSnapshot().interactions.find(o => o.id === 'npc-guide')?.loadedAssetUrl?.includes('garden-keeper'));
  const upgraded = await exportProject();
  if (upgraded.scene.objects.find(o => o.id === 'departure-gate').appearance.assetId !== 'garden-arbor') throw new Error('Legacy gate was not upgraded');
  if (await drafts().count() !== before + 1) throw new Error('Upgrade must create one extra draft');
  if (upgraded.metadata.title !== project.metadata.title) throw new Error('Edited title lost');
  if (JSON.stringify(upgraded.scene.objects.find(o => o.id === 'memory-archive').transform.position) !== '[-9,0,-10]') throw new Error('Edited position lost');
  const after = await drafts().count();
  await page.waitForTimeout(800); await page.reload(); await button('Open project editor').click();
  if (await drafts().count() !== after) throw new Error('Upgrade repeated after refresh');
  return { status: 'passed', checks: ['upgrade makes a separate draft', 'edited title retained', 'edited position retained', 'refresh does not repeat upgrade'] };
}
