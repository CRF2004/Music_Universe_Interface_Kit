async (page) => {
  const button = name => page.getByRole('button',{name,exact:true});
  const exportProject = async () => {
    if (!await button('Close project editor').isVisible()) await button('Open project editor').click();
    const pending=page.waitForEvent('download'); await button('Export project').click();
    const stream=await (await pending).createReadStream(); let json=''; for await(const chunk of stream)json+=chunk.toString(); return JSON.parse(json);
  };
  const legacy=await exportProject();
  legacy.metadata.title='My original garden arrangement';
  legacy.track={source:'asset',assetId:'crywolf-athetosis-demo',title:'Original demo',expectedDurationSeconds:278,rights:{licenseRef:'LicenseRef-Project-Owner-Demo-Authorization',attribution:'ATHETOSIS — Crywolf / Justin Taylor Phillips'}};
  legacy.scene.objects.find(o=>o.id==='memory-archive').transform.position=[-9,0,-10];
  const count=()=>page.getByRole('list',{name:'Active project drafts',exact:true}).locator(':scope > li').count();
  const before=await count();
  await page.getByLabel('Import MusicWorldProject',{exact:true}).evaluate((el,json)=>{const t=new DataTransfer();t.items.add(new File([json],'legacy.musicworld.json',{type:'application/json'}));el.files=t.files;el.dispatchEvent(new Event('change',{bubbles:true}));},JSON.stringify(legacy));
  await page.waitForFunction(before=>document.querySelector('[aria-label="Active project drafts"]')?.children.length===before+1,before);
  await page.waitForTimeout(1000);
  await page.goto(`${new URL(page.url()).origin}/?study=coastal&score=childhood-v1&e2e=1`);
  await page.waitForFunction(()=>window.__MUSIC_UNIVERSE_WORLD_E2E__?.getSnapshot().interactions.every(i=>i.loadedAssetUrl));
  const audition=await exportProject();
  if(audition.track.assetId!=='scott-buckley-childhood')throw new Error('Audition did not select Childhood');
  if(await count()!==before+2)throw new Error('Audition must be a separate draft');
  if(JSON.stringify(audition.scene.objects.find(o=>o.id==='memory-archive').transform.position)!=='[-9,0,-10]')throw new Error('Scene edits lost');
  if(!await button('Open project My original garden arrangement').isVisible())throw new Error('Original draft lost');
  await page.waitForTimeout(800);await page.reload();await exportProject();
  if(await count()!==before+2)throw new Error('Refresh recreated audition');
  return {status:'passed',checks:['explicit audition selects Childhood','separate draft preserves original','scene edits retained','refresh preserves the audition without duplication']};
}
