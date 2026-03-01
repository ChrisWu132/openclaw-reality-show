import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Clean previous screenshots
if (fs.existsSync(SCREENSHOTS_DIR)) {
  for (const f of fs.readdirSync(SCREENSHOTS_DIR)) {
    fs.unlinkSync(path.join(SCREENSHOTS_DIR, f));
  }
}
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function audit() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  let shotIndex = 0;

  async function screenshot(name) {
    shotIndex++;
    const filename = path.join(SCREENSHOTS_DIR, `${String(shotIndex).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: filename, fullPage: false });
    console.log(`[SS ${shotIndex}] ${name}`);
    return filename;
  }

  // Collect console errors and 404s
  const consoleErrors = [];
  const failedResources = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('requestfailed', req => {
    failedResources.push(`${req.failure()?.errorText} — ${req.url()}`);
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      failedResources.push(`HTTP ${res.status()} — ${res.url()}`);
    }
  });

  // Helper: click anywhere on the canvas area to advance dialogue
  async function clickToAdvance() {
    await page.evaluate(() => {
      // Find the click overlay or any clickable area
      const overlay = document.querySelector('[style*="z-index: 25"][style*="cursor: pointer"]') ||
                      document.querySelector('canvas')?.parentElement;
      if (overlay) {
        overlay.click();
      } else {
        // Fallback: click center of viewport
        document.elementFromPoint(640, 450)?.click();
      }
    });
  }

  // Helper: read game state from the store
  async function getGameState() {
    return page.evaluate(() => {
      const text = document.body.textContent || '';
      const html = document.body.innerHTML || '';
      return {
        hasCanvas: !!document.querySelector('canvas'),
        hasLoading: text.includes('INITIALIZING') || text.includes('Connecting'),
        hasError: text.includes('Error') || text.includes('error') || text.includes('failed'),
        hasSituation: /SITUATION \d+ OF 6/i.test(text),
        hasDeciding: text.includes('IS DECIDING'),
        hasStakes: text.includes('WARN') || text.includes('PATROL') || text.includes('WATCHING') || text.includes('REPORT'),
        hasMonitor: text.includes('MONITOR UNIT') && text.includes('LIVE'),
        hasThoughtBubble: !!document.querySelector('[style*="thoughtBubble"]'),
        hasConsequence: text.includes('BEGIN ANOTHER CYCLE') || text.includes('PROCESSING SUITE') || text.includes('UNRESOLVED SPARK') || text.includes('QUIET PATROL'),
        hasEpilogue: text.includes('will remember') || text.includes('looked back') || text.includes('gate opens'),
        hasFrozenCanvas: html.includes('grayscale(60%)'),
        hasAdvanceDots: text.includes('·'),
        bodySnippet: text.substring(0, 300),
        errorElements: html.includes('color: rgb(217') || html.includes('accentRed')
      };
    });
  }

  try {
    // ─── Step 1: Intro Screen ───
    console.log('\n=== STEP 1: INTRO SCREEN ===');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1000);
    await screenshot('intro-initial');
    await sleep(6000);
    await screenshot('intro-full');

    // Click SEND YOUR AGENT IN
    console.log('  Clicking SEND YOUR AGENT IN...');
    const introClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('SEND YOUR AGENT IN') || btn.textContent?.includes('BEGIN OBSERVATION')) {
          btn.click();
          return btn.textContent;
        }
      }
      return false;
    });
    console.log(`  Intro click result: ${introClicked}`);
    await sleep(1500);
    await screenshot('scenario-picker');

    // ─── Step 2: Click Work Halls ───
    console.log('\n=== STEP 2: CLICK WORK HALLS ===');
    const clicked = await page.evaluate(() => {
      const divs = document.querySelectorAll('div');
      for (const div of divs) {
        if (div.textContent?.trim() === 'WORK HALLS' && div.style.fontSize === '12px') {
          const card = div.parentElement;
          if (card) {
            card.click();
            return true;
          }
        }
      }
      return false;
    });
    console.log(`  Click result: ${clicked}`);
    await sleep(1000);
    await screenshot('after-click');

    // ─── Step 3: Wait for game canvas ───
    console.log('\n=== STEP 3: WAITING FOR GAME ===');
    let gameStarted = false;
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const state = await getGameState();
      console.log(`  [${i+1}s] canvas=${state.hasCanvas} loading=${state.hasLoading} situation=${state.hasSituation} deciding=${state.hasDeciding} error=${state.hasError}`);

      if (state.hasError && i > 3) {
        await screenshot('error-detected');
        console.log(`  Error body: ${state.bodySnippet}`);
      }

      if (state.hasCanvas) {
        gameStarted = true;
        await screenshot('game-canvas-appeared');
        break;
      }
      if (state.hasSituation || state.hasDeciding) {
        gameStarted = true;
        await screenshot('game-started');
        break;
      }
    }

    if (!gameStarted) {
      await screenshot('game-never-started');
      console.log('Game never started after 30s.');
      const bodyText = await page.evaluate(() => document.body.textContent?.substring(0, 500));
      console.log('Page content:', bodyText);
    }

    // ─── Step 4: Watch game with Round 4 UX checks ───
    if (gameStarted) {
      console.log('\n=== STEP 4: WATCHING GAME (Round 4 UX checks) ===');
      let lastScreenshotPhase = '';
      let reachedEnd = false;
      let sawSituationCard = false;
      let sawDecidingStakes = false;
      let sawMonitorSeparate = false;
      let sawDelayedMonologue = false;
      let sawQueueDots = false;
      let decidingAppearedDuringNpc = false;
      let clickCount = 0;

      for (let tick = 0; tick < 120; tick++) {
        await sleep(2500);

        const info = await page.evaluate(() => {
          const text = document.body.textContent || '';
          const html = document.body.innerHTML || '';

          // Situation card with subtitle
          const hasSituationCard = /SITUATION \d+ OF 6/.test(text);
          const hasSituationSubtitle = text.includes('None of them asked') ||
            text.includes('clock is ticking') ||
            text.includes('first mark') ||
            text.includes('protocol is clear') ||
            text.includes('hall remembers') ||
            text.includes('what happened');

          // AI Deciding with stakes
          const hasDeciding = text.includes('YOUR AGENT IS DECIDING');
          const hasStakes = text.includes('ROOM FULL OF FEAR') ||
            text.includes('WARN') && text.includes('DETAIN') ||
            text.includes('PERMANENT RECORD') ||
            text.includes('THRESHOLD') ||
            text.includes('CONSEQUENCES ARE');

          // Monitor in right-upper (check for LIVE tag)
          const hasMonitorLive = text.includes('MONITOR UNIT') && text.includes('LIVE');

          // Thought bubble (check for italic reasoning text)
          const thoughtBubbles = document.querySelectorAll('div');
          let hasThoughtBubble = false;
          for (const div of thoughtBubbles) {
            if (div.style?.fontStyle === 'italic' &&
                div.style?.fontFamily?.includes('Courier') &&
                div.style?.color === 'rgb(152, 152, 187)') {
              hasThoughtBubble = true;
              break;
            }
          }

          // Queue depth dots
          const hasQueueDots = html.includes('opacity: 0.35') && html.includes('·');

          // Consequence with frozen canvas
          const hasFrozenCanvas = html.includes('grayscale(60%)');
          const hasConsequence = text.includes('BEGIN ANOTHER CYCLE') ||
            text.includes('PROCESSING SUITE') ||
            text.includes('UNRESOLVED SPARK') ||
            text.includes('QUIET PATROL');
          const hasEpilogue = text.includes('will remember') ||
            text.includes('looked back') ||
            text.includes('gate opens');

          // Check who is currently speaking
          const speakerLabels = ['COORDINATOR', 'NYX', 'SABLE', 'CALLA', 'ELI', 'MONITOR UNIT'];
          let currentSpeaker = '';
          for (const label of speakerLabels) {
            if (text.includes(label)) {
              currentSpeaker = label;
              break;
            }
          }

          // Is click pointer active?
          const clickable = !!document.querySelector('[style*="cursor: pointer"]');

          return {
            hasSituationCard,
            hasSituationSubtitle,
            hasDeciding,
            hasStakes,
            hasMonitorLive,
            hasThoughtBubble,
            hasQueueDots,
            hasFrozenCanvas,
            hasConsequence,
            hasEpilogue,
            currentSpeaker,
            clickable,
            bodySnippet: text.substring(0, 200)
          };
        });

        // Build phase label
        const phase = info.hasConsequence ? 'CONSEQUENCE' :
                      info.hasDeciding ? 'DECIDING' :
                      info.hasSituationCard ? 'SITUATION_CARD' :
                      info.currentSpeaker ? `DIALOGUE:${info.currentSpeaker}` :
                      'PLAYING';

        // Track Round 4 features
        if (info.hasSituationCard && info.hasSituationSubtitle) sawSituationCard = true;
        if (info.hasDeciding && info.hasStakes) sawDecidingStakes = true;
        if (info.hasMonitorLive) sawMonitorSeparate = true;
        if (info.hasThoughtBubble) sawDelayedMonologue = true;
        if (info.hasQueueDots) sawQueueDots = true;

        // Check: DECIDING should NOT appear while NPC is speaking
        if (info.hasDeciding && info.currentSpeaker && info.currentSpeaker !== 'COORDINATOR') {
          decidingAppearedDuringNpc = true;
          console.log(`  ⚠ DECIDING overlay appeared during ${info.currentSpeaker} dialogue!`);
          await screenshot(`bug-deciding-during-${info.currentSpeaker}`);
        }

        console.log(`  [${(tick+1)*2.5}s] ${phase} | speaker=${info.currentSpeaker || '-'} | stakes=${info.hasStakes} | mono=${info.hasThoughtBubble} | dots=${info.hasQueueDots} | click=${info.clickable}`);

        // Screenshot on phase changes
        if (phase !== lastScreenshotPhase) {
          await screenshot(`game-${Math.round((tick+1)*2.5)}s-${phase.replace(/[^a-zA-Z0-9]/g, '_')}`);
          lastScreenshotPhase = phase;
        }

        // Periodic screenshots every ~30s
        if (tick % 12 === 11) {
          await screenshot(`periodic-${Math.round((tick+1)*2.5)}s`);
        }

        // Click to advance if waiting
        if (info.clickable && !info.hasSituationCard && !info.hasConsequence) {
          await clickToAdvance();
          clickCount++;
          if (clickCount % 5 === 0) {
            await screenshot(`after-click-${clickCount}`);
          }
        }

        // ─── Consequence scene checks ───
        if (info.hasConsequence) {
          console.log('\n=== STEP 5: CONSEQUENCE SCENE ===');

          // Check frozen canvas behind
          if (info.hasFrozenCanvas) {
            console.log('  ✓ Frozen grayscale canvas visible behind consequence');
          } else {
            console.log('  ✗ No frozen canvas detected');
          }
          await screenshot('consequence-overlay');

          // Wait for epilogue and button
          console.log('  Waiting for epilogue + button...');
          for (let w = 0; w < 20; w++) {
            await sleep(2000);
            const cState = await page.evaluate(() => {
              const text = document.body.textContent || '';
              return {
                hasEpilogue: text.includes('will remember') || text.includes('looked back') || text.includes('gate opens'),
                hasButton: text.includes('BEGIN ANOTHER CYCLE'),
                hasDivider: document.querySelector('div[style*="linear-gradient"][style*="80px"]') !== null
              };
            });
            console.log(`  [+${(w+1)*2}s] epilogue=${cState.hasEpilogue} button=${cState.hasButton} divider=${cState.hasDivider}`);

            if (cState.hasEpilogue) {
              await screenshot('consequence-epilogue');
            }
            if (cState.hasButton) {
              await screenshot('consequence-button');

              // Click BEGIN ANOTHER CYCLE
              const resetClicked = await page.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                  if (btn.textContent?.includes('BEGIN ANOTHER CYCLE')) {
                    btn.click();
                    return true;
                  }
                }
                return false;
              });
              console.log(`  Clicked BEGIN ANOTHER CYCLE: ${resetClicked}`);
              if (resetClicked) {
                await sleep(2000);
                await screenshot('back-to-intro');
              }
              reachedEnd = true;
              break;
            }
          }
          if (!reachedEnd) {
            await screenshot('consequence-timeout');
          }
          reachedEnd = true;
          break;
        }
      }

      if (!reachedEnd) {
        await screenshot('timeout-no-consequence');
        console.log('Did not reach consequence scene within 5 minutes.');
      }

      // ─── Round 4 Feature Summary ───
      console.log('\n=== ROUND 4 FEATURE CHECK ===');
      console.log(`  Situation card + subtitle:     ${sawSituationCard ? '✓ YES' : '✗ NOT SEEN'}`);
      console.log(`  Deciding overlay + stakes:     ${sawDecidingStakes ? '✓ YES' : '✗ NOT SEEN'}`);
      console.log(`  Monitor separate visual:       ${sawMonitorSeparate ? '✓ YES' : '✗ NOT SEEN'}`);
      console.log(`  Delayed monologue bubble:      ${sawDelayedMonologue ? '✓ YES' : '✗ NOT SEEN'}`);
      console.log(`  Queue depth dots:              ${sawQueueDots ? '✓ YES' : '✗ NOT SEEN'}`);
      console.log(`  DECIDING during NPC (bug):     ${decidingAppearedDuringNpc ? '✗ BUG DETECTED' : '✓ NOT SEEN'}`);
      console.log(`  Total clicks to advance:       ${clickCount}`);
    }

    // ─── Summary ───
    console.log('\n=== AUDIT SUMMARY ===');
    console.log(`Screenshots taken: ${shotIndex}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((e, i) => console.log(`  [err ${i+1}] ${e}`));
    console.log(`Failed resources (404s etc): ${failedResources.length}`);
    failedResources.forEach((e, i) => console.log(`  [404 ${i+1}] ${e}`));

  } catch (err) {
    console.error('FATAL ERROR:', err.message);
    await screenshot('fatal-error').catch(() => {});
  } finally {
    await sleep(3000);
    await browser.close();
  }
}

audit().catch(console.error);
