import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'screenshots/startup';
const BASE_URL = 'http://localhost:5173';

if (fs.existsSync(SCREENSHOT_DIR)) {
  fs.rmSync(SCREENSHOT_DIR, { recursive: true });
}
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let shotNum = 0;
async function shot(page, name) {
  shotNum++;
  const filename = `${String(shotNum).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
  console.log(`  Screenshot: ${filename}`);
}

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Intro screen
  console.log('\n--- Intro Screen ---');
  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);
  await shot(page, 'intro');

  // Wait for ENTER THE ARENA button to appear and click it
  console.log('\n--- Waiting for ENTER button ---');
  try {
    await page.waitForSelector('button:has-text("ENTER")', { timeout: 15000 });
    await page.waitForTimeout(500);
    await shot(page, 'intro-ready');
    await page.click('button:has-text("ENTER")');
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log('  Could not find ENTER button, trying to set phase via JS');
    // Force phase change via Zustand store
    await page.evaluate(() => {
      // Access Zustand store from window — try common patterns
      const store = document.querySelector('#root')?.__zustand;
      if (store) store.setState({ phase: 'mode-select' });
    });
    await page.waitForTimeout(500);
  }
  await shot(page, 'mode-select');

  // 2. Click "AI STARTUP ARENA"
  console.log('\n--- Selecting Startup Arena ---');
  try {
    await page.waitForSelector('button:has-text("STARTUP")', { timeout: 5000 });
    await page.click('button:has-text("STARTUP")');
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log('  Mode select not found, current state:', await page.title());
  }
  await shot(page, 'startup-lobby');

  // 3. Click LAUNCH ARENA
  console.log('\n--- Launching Game ---');
  try {
    await page.waitForSelector('button:has-text("LAUNCH")', { timeout: 5000 });
    await page.click('button:has-text("LAUNCH")');
    await page.waitForTimeout(5000); // Give time for game to create and first turns
  } catch (e) {
    console.log('  LAUNCH button not found');
  }
  await shot(page, 'game-initial');

  // 4. Watch the game evolve over turns
  console.log('\n--- Watching Game ---');
  for (let i = 1; i <= 10; i++) {
    await page.waitForTimeout(4000);
    await shot(page, `game-q${i}`);
  }

  // 5. Late game / potentially finished
  await page.waitForTimeout(5000);
  await shot(page, 'game-late');

  console.log(`\nDone! ${shotNum} screenshots saved to ${SCREENSHOT_DIR}/`);
  await browser.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
