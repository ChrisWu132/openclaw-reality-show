/**
 * Visual test — walks through the entire game flow with Playwright,
 * takes a screenshot at every phase so we can inspect visuals.
 *
 * Usage: node test-visual.mjs
 * Output: screenshots/01-intro.png, 02-agent-select.png, ... etc.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = path.resolve("screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR);

let shotIndex = 0;
async function snap(page, label) {
  shotIndex++;
  const name = `${String(shotIndex).padStart(2, "0")}-${label}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, name);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  [SCREENSHOT] ${name}`);
}

async function main() {
  console.log("=== Visual Test: Full Game Flow ===\n");

  const browser = await chromium.launch({ headless: false }); // headed so WebGL works
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // 1. Intro screen
  console.log("[1] Navigating to app...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  await page.waitForTimeout(8000); // wait for intro animation to finish
  await snap(page, "intro");

  // 2. Click "SEND YOUR AGENT IN"
  console.log("[2] Clicking SEND YOUR AGENT IN...");
  await page.click("text=SEND YOUR AGENT IN");
  await page.waitForTimeout(1000);
  await snap(page, "agent-select");

  // 3. Click "USE DEFAULT COORDINATOR"
  console.log("[3] Clicking USE DEFAULT COORDINATOR...");
  await page.click("text=USE DEFAULT COORDINATOR");
  await page.waitForTimeout(2000);
  await snap(page, "loading");

  // 4. Wait for game to enter "playing" phase — look for ROUND text
  console.log("[4] Waiting for game to start...");
  try {
    await page.waitForSelector("text=ROUND", { timeout: 15000 });
  } catch {
    console.log("  (no ROUND text found, taking screenshot anyway)");
  }
  await page.waitForTimeout(1500);
  await snap(page, "round1-start");

  // Walk through first 3 rounds to see all phases
  for (let round = 1; round <= 3; round++) {
    console.log(`\n[Round ${round}] Walking through phases...`);

    // Click to advance past round_start
    console.log(`  Clicking to advance past ROUND ${round}...`);
    await page.click("body");
    await page.waitForTimeout(2000);
    await snap(page, `round${round}-dilemma`);

    // Click to let AI decide
    console.log("  Clicking to let AI decide...");
    await page.click("body");
    await page.waitForTimeout(1000);
    await snap(page, `round${round}-deciding`);

    // Wait for decision (AI takes several seconds)
    console.log("  Waiting for AI decision...");
    try {
      await page.waitForSelector("text=INNER MONOLOGUE", { timeout: 30000 });
    } catch {
      console.log("  (no INNER MONOLOGUE found, checking for decision_made...)");
    }
    await page.waitForTimeout(1500);
    await snap(page, `round${round}-decision`);

    // Click to see consequence
    console.log("  Clicking to see consequence...");
    await page.click("body");
    await page.waitForTimeout(1500);
    await snap(page, `round${round}-consequence`);

    // Click to advance to next round
    console.log("  Clicking to advance to next round...");
    await page.click("body");
    await page.waitForTimeout(1500);

    if (round < 3) {
      await snap(page, `round${round + 1}-start`);
    }
  }

  // Take a final screenshot
  await snap(page, "final-state");

  console.log("\n=== Visual test complete ===");
  console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log(`Total screenshots: ${shotIndex}`);

  await browser.close();
}

main().catch((err) => {
  console.error("Visual test failed:", err);
  process.exit(1);
});
