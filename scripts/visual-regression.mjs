import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from '../frontend/node_modules/playwright/index.js';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5200';
const update = process.argv.includes('--update');
const baselineDir = 'docs/visual-baselines';
const currentDir = 'docs/visual-current';
const cases = [
  ['core', /CORE/i],
  ['network', /NETWORK/i],
  ['signal', /SIGNAL/i],
  ['prototype', /PROTOTYPE/i],
];

await mkdir(baselineDir, { recursive: true });
await mkdir(currentDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 860 }, deviceScaleFactor: 1 });
await page.addInitScript(() => {
  localStorage.setItem('nc-performance', 'true');
  localStorage.setItem('nc-audio-muted', 'true');
  localStorage.setItem('nc-intensity', '72');
});
await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(4300);

const failures = [];
for (const [name, label] of cases) {
  await page.getByRole('button', { name: label }).click();
  await page.waitForTimeout(600);
  const currentPath = `${currentDir}/${name}.png`;
  const baselinePath = `${baselineDir}/${name}.png`;
  await page.screenshot({ path: currentPath, fullPage: false });

  if (update || !existsSync(baselinePath)) {
    await writeFile(baselinePath, await readFile(currentPath));
    console.log(`baseline ${update ? 'updated' : 'created'}: ${baselinePath}`);
    continue;
  }

  const current = await readFile(currentPath);
  const baseline = await readFile(baselinePath);
  const length = Math.max(current.length, baseline.length);
  let different = Math.abs(current.length - baseline.length);
  for (let index = 0; index < Math.min(current.length, baseline.length); index += 1) {
    if (current[index] !== baseline[index]) different += 1;
  }
  const ratio = different / length;
  if (ratio > 0.36) failures.push(`${name}: ${(ratio * 100).toFixed(1)}% byte drift`);
  console.log(`${name}: ${(ratio * 100).toFixed(1)}% byte drift`);
}

await browser.close();

if (failures.length) {
  throw new Error(`Visual regression threshold exceeded: ${failures.join(', ')}`);
}
