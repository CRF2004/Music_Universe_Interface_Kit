async (page) => {
  await page.waitForFunction(()=>typeof window.runExperiment==='function');
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const report=await page.evaluate(()=>window.runExperiment());
  report.pageErrors=errors;
  const browser=report.browser.includes('Edg/')?'edge':'chrome';
  const pending=page.waitForEvent('download');
  await page.evaluate(report=>{const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));link.download='percival-report.json';link.click();},report);
  await(await pending).saveAs(`output/tool-pilots/percival-bpm-2026-10-05/${report.corpus}-${browser}.json`);
  return {browser,corpus:report.corpus,summary:report.summary,rows:report.rows.length,errors};
}
