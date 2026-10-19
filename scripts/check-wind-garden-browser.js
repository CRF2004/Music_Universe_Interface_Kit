async (page) => {
  const origin = new URL(page.url()).origin;
  const basePath = new URL(page.url()).pathname.replace(/\/?$/, '/');
  const browser = await page.evaluate(() => navigator.userAgent.includes('Edg/') ? 'edge' : 'chrome');
  const output = `output/playwright/wind-garden-${browser}`;
  const checks = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (name, ok) => { checks.push({ name, passed: !!ok }); if (!ok) throw new Error(name); };
  const button = name => page.getByRole('button', { name, exact: true });
  const snap = () => page.evaluate(() => window.__MUSIC_UNIVERSE_WORLD_E2E__.getSnapshot());
  await page.goto(`${origin}${basePath}?study=coastal&play=wind-v1&e2e=1`);
  await button('Enter Echo Garden').waitFor();
  await page.waitForFunction(() => window.__MUSIC_UNIVERSE_WORLD_E2E__?.getSnapshot().interactions.some(i => i.id === 'wind-pickup'));
  check('distinct wind project and four authored roles', (await snap()).interactions.length === 4);
  await page.screenshot({ path: `${output}/entry.png` });
  await button('Enter Echo Garden').focus(); await page.keyboard.press('Enter');
  await button('Study music play pause').waitFor();
  await page.waitForFunction(() => window.__MUSIC_UNIVERSE_E2E__?.grounded);
  check('Childhood full mix loaded', Math.abs(Number(await page.getByLabel('Study music progress', { exact: true }).getAttribute('max')) - 137.079) < .25);
  const pressE = async () => { await page.locator('canvas').focus(); await page.keyboard.press('e'); await page.waitForTimeout(750); };
  // Real WASD events steer using public camera/player telemetry. No teleport or direct flag writes.
  const walkTo = async (x, z, tolerance = 1.6) => {
    await page.locator('canvas').focus();
    const held = new Set();
    try {
      for (let i = 0; i < 100; i++) {
        const drive = await page.evaluate(([x, z]) => {
          const e = window.__MUSIC_UNIVERSE_E2E__, p = e.getPlayerPosition(), r = 60, d = Math.hypot(x, z), a = d / r;
          const target = [x * Math.sin(a) * r / d, Math.cos(a) * r - r, z * Math.sin(a) * r / d];
          const up = e.groundUp, dot = (a,b) => a.reduce((s,n,i)=>s+n*b[i],0), norm = a => {const l=Math.hypot(...a);return a.map(n=>n/l);};
          const [qx,qy,qz,qw] = e.cameraQuaternion;
          let f = [-2*(qx*qz+qy*qw), -2*(qy*qz-qx*qw), -1+2*(qx*qx+qy*qy)];
          f = norm(f.map((n,i)=>n-up[i]*dot(f,up)));
          const right = [f[1]*up[2]-f[2]*up[1],f[2]*up[0]-f[0]*up[2],f[0]*up[1]-f[1]*up[0]];
          let v = target.map((n,i)=>n-p[i]); v=v.map((n,i)=>n-up[i]*dot(v,up));
          const distance=Math.hypot(...v); v=norm(v);
          const forward=dot(v,f), side=dot(v,right), keys=[];
          if(Math.abs(forward)>.38)keys.push(forward>0?'w':'s');
          if(Math.abs(side)>.38)keys.push(side>0?'d':'a');
          return {distance,keys};
        }, [x,z]);
        if (drive.distance < tolerance) return;
        for (const key of held) if (!drive.keys.includes(key)) { await page.keyboard.up(key); held.delete(key); }
        for (const key of drive.keys) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
        await page.waitForTimeout(150);
      }
      throw new Error(`Could not walk to ${x},${z}`);
    } finally { for (const key of held) await page.keyboard.up(key); await page.waitForTimeout(200); }
  };
  await walkTo(-1,-3);
  await pressE();
  check('real E picks up wheel', (await snap()).flags['wind.carried'] === true);
  await page.screenshot({ path: `${output}/carrying.png` });
  await walkTo(0,-8.1,.5);
  check('real movement reaches flowerbed', (await snap()).nearestInteractionId === 'wind-flowerbed');
  await pressE();
  check('planting leaves turning unfinished', (await snap()).flags['wind.planted'] === true && (await snap()).flags['wind.turned'] !== true);
  await pressE();
  check('second operation changes base orientation', (await snap()).flags['wind.turned'] === true && (await snap()).flags['wind.awakened'] !== true);
  await page.screenshot({ path: `${output}/turning.png` });
  await pressE(); await page.waitForTimeout(3500);
  check('third operation catches wind without automatic completion', (await snap()).flags['wind.awakened'] === true && (await snap()).flags['wind.completed'] !== true);
  await page.screenshot({ path: `${output}/petal-path.png` });
  await walkTo(3,-13); await walkTo(7,-17);
  check('walking through midpoint records earned passage', (await snap()).flags['wind.checkpoint'] === true);
  await walkTo(9,-22); await walkTo(8,-28);
  await page.waitForTimeout(700);
  check('walking into pavilion completes slice', (await snap()).flags['wind.completed'] === true);
  await page.screenshot({ path: `${output}/complete.png` });
  const seek = async time => {
    await page.getByLabel('Study music progress', { exact: true }).evaluate((el,time)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(time));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},time);
    await page.waitForTimeout(500);
  };
  await seek(0);
  check('backward seek preserves earned completion', (await snap()).flags['wind.completed'] === true);
  await button('Restart wind garden').click(); await page.waitForTimeout(900);
  const restarted = await snap();
  check('restart clears all wind progress', Object.keys(restarted.flags).every(key=>!key.startsWith('wind.')));
  check('restart returns to configured spawn', Math.abs(restarted.playerPosition[2]-3)<.6 && Math.abs(restarted.playerPosition[0])<.6);
  await button('Study music play pause').click();
  await seek(136.8); await button('Study music play pause').click(); await page.waitForTimeout(1400);
  check('natural ending does not fabricate progress', (await snap()).flags['wind.awakened'] !== true);
  if(await button('Study reduced effects').getAttribute('aria-pressed')!=='true')await button('Study reduced effects').click();
  if(await button('Study music mute').getAttribute('aria-pressed')!=='true')await button('Study music mute').click();
  await walkTo(-1,-3); await pressE(); await walkTo(0,-8.1,.5);
  await pressE(); await pressE(); await pressE();
  check('late arrival remains playable after song ends', (await snap()).flags['wind.awakened'] === true);
  await page.setViewportSize({ width:800,height:600 });
  await page.screenshot({ path: `${output}/compact-reduced.png` });
  check('compact objective fits viewport', await page.getByLabel('Study journey objective').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));
  await walkTo(3,-13); await walkTo(7,-17); await walkTo(9,-22); await walkTo(8,-28);
  check('muted reduced-effects natural-ending completion works', (await snap()).flags['wind.completed'] === true);
  const performance = await page.evaluate(() => window.__MUSIC_UNIVERSE_PERFORMANCE_E2E__);
  await page.reload(); await button('Enter Echo Garden').waitFor();
  await page.waitForFunction(() => window.__MUSIC_UNIVERSE_WORLD_E2E__?.getSnapshot().interactions.some(i=>i.id==='wind-pickup'));
  check('refresh restores wind project with fresh session', (await snap()).flags['wind.completed'] !== true);
  check('no runtime page errors', errors.length === 0);
  const report = {status:'passed',browser,checks,errors,performance};
  const download = page.waitForEvent('download');
  await page.evaluate(report=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='wind-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},report);
  await (await download).saveAs(`${output}/report.json`);
  return report;
}
