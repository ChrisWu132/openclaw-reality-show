/**
 * Visual E2E test for the full app — Trolley Problem flow.
 * Takes screenshots at every key interaction point.
 *
 * Usage:
 *   1. Start the app: npm run dev
 *   2. Run: node test-conquest-visual.mjs
 *
 * Output: screenshots/v{iteration}/01-intro.png, 02-mode-select.png, ...
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ITERATION = process.argv[2] || "1";
const SCREENSHOTS_DIR = path.resolve(`screenshots/v${ITERATION}`);
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
const API_URL = "http://localhost:3001";

let shotIndex = 0;
async function snap(page, label) {
  shotIndex++;
  const name = `${String(shotIndex).padStart(2, "0")}-${label}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, name);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  [snap] ${name}`);
  return filePath;
}

async function waitAndSnap(page, label, ms = 1000) {
  await page.waitForTimeout(ms);
  return snap(page, label);
}

async function burstCapture(page, label, durationMs = 2000, intervalMs = 150) {
  const count = Math.ceil(durationMs / intervalMs);
  for (let i = 0; i < count; i++) {
    await snap(page, `${label}-f${String(i).padStart(2, "0")}`);
    await page.waitForTimeout(intervalMs);
  }
}

async function registerTestUser() {
  const email = `test-${Date.now()}@visual-test.local`;
  const password = "testpass123";
  const displayName = "Visual Tester";

  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });

  if (!res.ok) {
    // Try login if already registered
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@visual-test.local", password: "testpass123" }),
    });
    if (!loginRes.ok) throw new Error("Could not register or login test user");
    return loginRes.json();
  }
  return res.json();
}

async function main() {
  console.log(`\n===================================`);
  console.log(`  VISUAL TEST — Iteration ${ITERATION}`);
  console.log(`===================================\n`);

  // Health check
  try {
    await fetch(`${API_URL}/api/health`);
    console.log("[ok] Server is running\n");
  } catch {
    console.error("[fail] Server not running at", API_URL);
    console.error("  Run: npm run dev");
    process.exit(1);
  }

  // Register/login test user to get a JWT
  console.log("[0] Registering test user...");
  const auth = await registerTestUser();
  console.log(`  Token: ${auth.token.slice(0, 20)}...`);

  const browser = await chromium.launch({ headless: false });
  const videosDir = path.join(SCREENSHOTS_DIR, "videos");
  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // retina screenshots
    recordVideo: {
      dir: videosDir,
      size: { width: 1440, height: 900 },
    },
  });
  const page = await context.newPage();

  try {
    // ===========================
    // PART 0: LOGIN
    // ===========================
    console.log("--- PART 0: Login ---\n");

    await page.goto(WEB_URL, { waitUntil: "networkidle" });
    await waitAndSnap(page, "login-screen", 1000);

    // Inject the auth token into localStorage to bypass login form
    await page.evaluate((token) => {
      localStorage.setItem("openclaw_token", token);
    }, auth.token);
    // Reload to pick up the stored session
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await snap(page, "after-login");

    // ===========================
    // PART 1: INTRO & MODE SELECT
    // ===========================
    console.log("--- PART 1: Intro & Mode Selection ---\n");

    console.log("[1] Capturing intro...");
    await waitAndSnap(page, "intro-early", 1500);
    await waitAndSnap(page, "intro-mid", 3000);
    await waitAndSnap(page, "intro-ready", 4000);

    // Click "ENTER THE ARENA"
    console.log("[2] Clicking ENTER THE ARENA...");
    const enterBtn = page.getByText("ENTER THE ARENA");
    if (await enterBtn.isVisible().catch(() => false)) {
      await enterBtn.click();
    } else {
      // Fallback: try first visible button
      console.log("  (trying fallback: first visible button...)");
      const buttons = page.locator("button:visible");
      if (await buttons.count() > 0) {
        await buttons.first().click();
      }
    }
    await waitAndSnap(page, "mode-select", 1000);

    // ===========================
    // PART 2: TROLLEY FLOW
    // ===========================
    console.log("\n--- PART 2: Trolley Flow ---\n");

    // Select trolley mode
    console.log("[3] Selecting Trolley Problem...");
    const trolleyCard = page.getByText("THE TROLLEY PROBLEM");
    if (await trolleyCard.isVisible().catch(() => false)) {
      await trolleyCard.click();
      await waitAndSnap(page, "trolley-agent-select", 1000);
    } else {
      console.log("  (Trolley card not found, snapping current state)");
      await snap(page, "trolley-agent-select-fallback");
    }

    // New AgentPicker: select "The Utilitarian" preset
    console.log("[4] Selecting Utilitarian preset...");
    const utilitarianBtn = page.getByText("The Utilitarian");
    if (await utilitarianBtn.isVisible().catch(() => false)) {
      await snap(page, "trolley-agent-picker");
      await utilitarianBtn.click();
      await waitAndSnap(page, "trolley-loading", 2000);
    } else {
      // Fallback: try clicking first button in the QUICK PLAY section
      console.log("  (trying fallback: first preset button...)");
      const presetButtons = page.locator("button").filter({ hasText: /Utilitarian|Empath|By-the-Book/ });
      if (await presetButtons.first().isVisible().catch(() => false)) {
        await presetButtons.first().click();
        await waitAndSnap(page, "trolley-loading", 2000);
      }
    }

    // Wait for game to start
    console.log("[5] Waiting for trolley game to start...");
    try {
      await page.waitForSelector("text=ROUND", { timeout: 15000 });
    } catch {
      console.log("  (ROUND text not found, waiting longer...)");
      await page.waitForTimeout(5000);
    }
    await waitAndSnap(page, "trolley-round1-start", 2000);

    // Walk through first 2 rounds
    for (let round = 1; round <= 2; round++) {
      console.log(`\n[Round ${round}] Walking through trolley phases...`);

      // Click to advance past round_start
      await page.click("body");
      await waitAndSnap(page, `trolley-r${round}-dilemma`, 2000);

      // Click to let AI decide
      await page.click("body");
      await waitAndSnap(page, `trolley-r${round}-deciding`, 1000);

      // Wait for decision
      try {
        await page.waitForSelector("text=INNER MONOLOGUE", { timeout: 30000 });
      } catch {
        console.log("  (waiting for AI...)");
        await page.waitForTimeout(10000);
      }

      // Burst capture the decision/trolley-moving phase (2s @ 150ms)
      console.log(`  Burst capturing trolley movement...`);
      await burstCapture(page, `trolley-r${round}-decision`, 2000, 150);

      // Click to see consequence
      await page.click("body");

      // Burst capture the consequence phase (1.5s @ 150ms)
      console.log(`  Burst capturing consequence animation...`);
      await burstCapture(page, `trolley-r${round}-consequence`, 1500, 150);

      // Click to advance to next round
      await page.click("body");
      await page.waitForTimeout(1500);
    }

    await snap(page, "trolley-final-state");

    // ===========================
    // SUMMARY
    // ===========================
    console.log(`\n===================================`);
    console.log(`  DONE — ${shotIndex} screenshots saved`);
    console.log(`  Location: ${SCREENSHOTS_DIR}`);
    console.log(`===================================\n`);

  } catch (err) {
    console.error("\n[fail] Test failed:", err.message);
    await snap(page, "ERROR-final-state");
  } finally {
    const video = page.video();
    if (video) {
      const videoPath = await video.path();
      console.log(`\n  Video: ${videoPath}`);
    }
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
