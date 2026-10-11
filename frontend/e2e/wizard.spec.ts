import { test, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

for (const width of [1280, 1024]) {
  test(`wizard full flow, exact demo values and repeated reset at ${width}px`, async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Explicit viewport coverage');
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    if (width === 1024) await page.emulateMedia({ reducedMotion: 'reduce' });
    const dir = '../.local/ui-qa/screenshots';
    await mkdir(dir, { recursive: true });
    const scenario = JSON.parse(await readFile(new URL('../../data/compound.json', import.meta.url), 'utf8'));
    scenario.scenario_id = `wizard-${randomUUID().slice(0,8)}`;
    scenario.zones.find((z: any) => z.id === 'E').supply_loss = .65;
    scenario.zones.find((z: any) => z.id === 'E').supply_capacity = 55;
    expect((await request.post('/api/scenarios', { data: scenario })).status()).toBe(201);
    for (let i=0;i<2;i++) {
      const response = await request.post(`/api/scenarios/${scenario.scenario_id}/versions`, { data: scenario });
      expect(response.ok(), await response.text()).toBeTruthy();
      Object.assign(scenario, await response.json());
    }
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.getByLabel('Scenario selection').selectOption(scenario.scenario_id);
    const shot = async (name: string) => {
      await page.locator('.wizard-card-container').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${dir}/${width}-${name}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    };
    await expect(page.getByRole('button',{name:/Step 3: Review/})).toBeDisabled();
    await shot('step1-controls');
    const runResponse = page.waitForResponse(r => r.url().endsWith('/api/runs') && r.request().method() === 'POST');
    const started = Date.now();
    await page.getByRole('button',{name:'Run Simulation',exact:true}).click();
    const { run_id } = await (await runResponse).json();
    await page.getByRole('button',{name:'Investigate',exact:true}).waitFor();
    await page.getByRole('button',{name:'Select zone E, University'}).click();
    if (await page.getByRole('button',{name:/Advanced Parameters/}).getAttribute('aria-expanded') === 'false') await page.getByRole('button',{name:/Advanced Parameters/}).click();
    await expect(page.getByRole('spinbutton',{name:'Temperature °C',exact:true})).toHaveValue('41');
    await page.getByRole('button',{name:'About Temperature',exact:true}).focus();
    await expect(page.getByRole('tooltip')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({path:`${dir}/${width}-drawer.png`});
    await page.getByRole('button',{name:'Close drawer'}).click();
    await page.getByRole('button',{name:/Zone conditions table/}).click();
    await shot('step1-results');
    await page.getByRole('button',{name:'Investigate',exact:true}).click();
    if (width === 1280) {
      await expect(page.getByRole('button',{name:'Review plan',exact:true})).toBeDisabled();
      await page.waitForTimeout(2400);
      await shot('step2-replay');
    }
    await expect(page.getByRole('button',{name:'Review plan',exact:true})).toBeEnabled({timeout:30000});
    const reviewSeconds = (Date.now()-started)/1000;
    if (width === 1024) await shot('step2-complete');
    await page.getByRole('button',{name:'Review plan',exact:true}).click();
    const before = await (await request.get(`/api/runs/${run_id}/results`)).json();
    expect(before.plan.scenario_version).toBe(3);
    expect(before.baseline.totals.below_reserve).toBe(2);
    expect(before.plan.verified_totals.critical_percent).toBe(100);
    expect(before.plan.verified_totals.unmet).toBe(0);
    expect(before.plan.verified_totals.losses).toBeCloseTo(263.8,1);
    const sum = (result: any, id: string, field: string) => result.time_series.reduce((n: number, step: any)=>n+step.zones.find((z: any)=>z.id===id)[field],0);
    expect(sum(before.baseline,'B','unmet')).toBeCloseTo(7.5,1);
    expect(sum(before.baseline,'E','unmet')).toBeCloseTo(11.4,1);
    const ending = (r: any)=>r.time_series.at(-1).zones.map((z: any)=>Number(z.storage.toFixed(1)));
    expect(ending(before.baseline)).toEqual([73.2,0,100.2,75,0,121.5]);
    await expect(page.getByRole('button',{name:'Open evidence report',exact:true})).toBeEnabled();
    await shot('step3-review');
    await page.locator('.step3-sticky-action-bar').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${dir}/${width}-step3-sticky.png`});
    await page.getByRole('button',{name:'Approve exact plan',exact:true}).click();
    await expect(page.getByText('4 of 4 checks shown',{exact:true})).toBeVisible({timeout:30000});
    const after = await (await request.get(`/api/runs/${run_id}/results`)).json();
    expect(after.approved.totals.below_reserve).toBe(0);
    expect(ending(after.approved)).toEqual([282.5,65,260,138.5,80,200.2]);
    const lastE=(r: any)=>r.time_series.at(-1).zones.find((z: any)=>z.id==='E');
    expect(lastE(before.baseline).external / before.baseline.step_hours).toBe(10);
    expect(lastE(after.approved).external / after.approved.step_hours).toBe(52);
    expect(lastE(before.baseline).unmet / before.baseline.step_hours).toBeCloseTo(25.3,1);
    expect(lastE(after.approved).unmet).toBe(0);
    await shot('step4-storage');
    await page.getByRole('tab',{name:'Unmet demand',exact:true}).click();
    await shot('step4-unmet');
    await page.getByRole('button',{name:'Select zone E, University'}).click();
    if (await page.getByRole('button',{name:/Advanced Parameters/}).getAttribute('aria-expanded') === 'false') await page.getByRole('button',{name:/Advanced Parameters/}).click();
    await expect(page.getByRole('spinbutton',{name:'Temperature °C',exact:true})).toHaveValue('41');
    await expect(page.getByRole('button',{name:'Apply changes',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Close drawer'}).click();
    const events = await (await request.get(`/api/runs/${run_id}/events?after_seq=0`)).json();
    await writeFile(`${dir}/${width}-evidence.json`,JSON.stringify({run_id,reviewSeconds,before,after,events,errors},null,2));
    for(let reset=0;reset<2;reset++) {
      const response = page.waitForResponse(r=>r.url().endsWith('/api/runs') && r.request().method()==='POST');
      await page.getByRole('button',{name:'Reset demo and clear run state'}).click();
      const fresh=await(await response).json();
      expect(fresh.run_id).not.toBe(run_id);
      await page.getByRole('button',{name:'Investigate',exact:true}).waitFor();
      const data=await(await request.get(`/api/runs/${fresh.run_id}/results`)).json();
      expect(data.scenario.scenario_version).toBe(3);
      expect(data.scenario.zones.find((z:any)=>z.id==='E').temperature).toBe(41);
      await expect(page.getByRole('button',{name:/Step 3: Review/})).toBeDisabled();
    }
    await page.goto('/?classic=1');
    await expect(page.getByRole('heading',{name:'Scenario lab',exact:true})).toBeVisible();
    expect(errors).toEqual([]);
  });
}
