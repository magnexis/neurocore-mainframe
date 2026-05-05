import { mkdir } from 'node:fs/promises';
import playwright from '../frontend/node_modules/playwright/index.js';

const { chromium } = playwright;

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5200';
const outputDir = 'docs/screenshots';
const shots = [
  ['core', 'core-dashboard.png'],
  ['network', 'network-map.png'],
  ['detection', 'detection-sweep.png'],
  ['prototype', 'prototype-sonar.png'],
  ['settings', 'settings.png'],
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(4300);

for (const [moduleId, filename] of shots) {
  await page.locator(`button[data-module="${moduleId}"]`).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outputDir}/${filename}`, fullPage: false });
  console.log(`wrote ${outputDir}/${filename}`);
}

await browser.close();
