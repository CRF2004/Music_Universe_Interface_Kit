async (page) => {
  const button = name => page.getByRole('button', { name, exact: true });
  if (await button('Close project editor').isVisible()) await button('Close project editor').click();
  const file = 'output/playwright/music-analysis-energy-change.wav';
  await page.locator('#music-file-input').setInputFiles(file);
  await page.waitForFunction(() => document.querySelector('.coastal-credit')?.textContent.includes('music-analysis-energy-change.wav'));
  await button('Enter Echo Garden').click();
  await button('Study music play pause').waitFor(); await button('Study music play pause').click();
  await page.waitForTimeout(1100); await page.reload();
  await button('Enter Echo Garden').waitFor();
  let demoFetches = 0;
  const listener = request => { if (request.url().includes('crywolf-athetosis-demo') && request.url().includes('.ogg')) demoFetches++; };
  page.on('request', listener);
  await button('Enter Echo Garden').click();
  await page.getByText('请打开音乐设置，重新选择这首歌曲，再进入花园。', { exact: true }).waitFor();
  await page.waitForTimeout(500);
  if (demoFetches !== 0) throw new Error('Local song recovery fetched the demo');
  if (await button('Study music play pause').isVisible()) throw new Error('Unrestored local song incorrectly started');
  await page.getByLabel('Restore original project song', { exact: true }).setInputFiles(file);
  await page.waitForTimeout(700); await button('Enter Echo Garden').click();
  await button('Study music play pause').waitFor(); await page.waitForTimeout(600);
  if (Number(await page.getByLabel('Study music progress', { exact: true }).inputValue()) <= .1) throw new Error('Restored local song did not advance');
  await button('Study music play pause').click();
  page.off('request', listener);
  return { status:'passed', checks:['local song title shown', 'refresh requests original song', 'recovery does not fetch the demo or start unrelated music', 'original song reattachment plays successfully'] };
}
