async (page) => {
  await page.waitForFunction(() => typeof window.runExperiment === 'function');
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const report = await page.evaluate(() => window.runExperiment());
  report.pageErrors = errors;
  const browser = report.browser.includes('Edg/') ? 'edge' : 'chrome';
  const pending = page.waitForEvent('download');
  await page.evaluate(report => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })); a.download = 'bpm-report.json'; a.click();
  }, report);
  await (await pending).saveAs(`output/tool-pilots/bpm-2026-10-05/${browser}-report.json`);
  return { browser, summary: report.summary, realSong: report.realSong, rows: report.rows.length, errors };
}
