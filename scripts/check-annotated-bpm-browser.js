async (page) => {
  await page.waitForFunction(() => typeof window.runExperiment === 'function');
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sampleRate = Number(new URL(page.url()).searchParams.get('rate') || 12000);
  const report = await page.evaluate(rate => window.runExperiment(rate), sampleRate);
  report.pageErrors = errors;
  const browser = report.browser.includes('Edg/') ? 'edge' : 'chrome';
  const corpus = new URL(page.url()).pathname === '/artbeat' ? 'artbeat-' : '';
  const pending = page.waitForEvent('download');
  await page.evaluate(report => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })); a.download = 'annotated-report.json'; a.click();
  }, report);
  await (await pending).saveAs(`output/tool-pilots/annotated-bpm-2026-10-05/${corpus}${browser}${sampleRate === 12000 ? '' : `-${sampleRate}`}-report.json`);
  return { browser, summary: report.summary, rows: report.rows.length, errors };
}
