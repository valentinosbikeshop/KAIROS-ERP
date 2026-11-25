import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR =
  process.env.PW_SCREENSHOT_DIR ||
  'C:/Users/isaia/.gemini/antigravity/brain/98f31476-cbfe-4880-8911-0446f35b5c87/scratch';

function findBrowserExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error(`Server did not respond within ${timeoutMs}ms at ${url}`);
}

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

async function runAudit() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const executablePath = findBrowserExecutable();
  assert(executablePath, 'No local Chrome or Edge binary found.');

  let serverProc = null;
  let serverStartedByUs = false;

  try {
    let alreadyUp = false;
    try {
      const probe = await fetch(`${BASE_URL}/welcome`);
      alreadyUp = probe.status === 200;
    } catch {
      alreadyUp = false;
    }

    if (!alreadyUp) {
      serverProc = spawn(
        process.execPath,
        [path.join('node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(PORT)],
        { stdio: 'pipe', cwd: process.cwd() }
      );
      serverStartedByUs = true;
      await waitForServer(`${BASE_URL}/welcome`, 30000);
    }

    const browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu'],
    });

    const consoleErrors = [];
    const pageErrors = [];
    const failedResponses = [];

    const attachMonitors = (page, label) => {
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(`[${label}] console.error: ${msg.text()}`);
        } else if (msg.type() === 'warning' && msg.text().toLowerCase().includes('hydration')) {
          consoleErrors.push(`[${label}] hydration warning: ${msg.text()}`);
        }
      });
      page.on('pageerror', (err) => {
        pageErrors.push(`[${label}] pageerror: ${err.message}`);
      });
      page.on('response', (res) => {
        if (res.status() >= 400 && !res.url().includes('favicon.ico')) {
          failedResponses.push(`[${label}] HTTP ${res.status()} -> ${res.url()}`);
        }
      });
    };

    try {
      // =========================================================
      // 1. AUDIT /welcome (Desktop 1440x900)
      // =========================================================
      const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await desktopCtx.newPage();
      attachMonitors(page, 'welcome-desktop');

      const welcomeRes = await page.goto(`${BASE_URL}/welcome`, { waitUntil: 'networkidle' });
      assert(welcomeRes && welcomeRes.status() === 200, '/welcome did not return 200');

      const welcomeOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      assert(!welcomeOverflow, '/welcome has horizontal overflow on desktop');

      const initialWelcomeText = await page.locator('body').innerText();
      assert(
        !/en cach[eé]/i.test(initialWelcomeText),
        '/welcome still contains unnecessary "en caché" jargon'
      );

      // Switch industry to Construcción & Obras and verify dynamic hero, capabilities & plans
      await page.getByRole('button', { name: /Construcción & Obras/i }).click();
      await page.waitForTimeout(400);
      const bodyAfterInd = await page.locator('body').innerText();
      assert(
        bodyAfterInd.includes('Cotiza partidas y obras') &&
          /para construcci[oó]n & obras:/i.test(bodyAfterInd) &&
          /qu[eé] le falta en este nivel/i.test(bodyAfterInd),
        '/welcome did not adapt hero or plans matrix to Construcción & Obras'
      );

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-welcome-construccion.png'),
        fullPage: false,
      });

      // Open PlanDetailModal on Recommended $59.990 plan
      const detailBtns = page.getByRole('button', { name: /Ver detalle completo/i });
      assert((await detailBtns.count()) >= 4, 'Expected 4 plan detail buttons');
      await detailBtns.nth(2).click();
      await page.waitForTimeout(300);

      const modalDialog = page.getByRole('dialog');
      await modalDialog.waitFor({ state: 'visible', timeout: 5000 });
      const modalText = await modalDialog.innerText();
      assert(/lo que incluye este plan/i.test(modalText), 'PlanDetailModal missing included section');
      assert(/lo que no incluye/i.test(modalText), 'PlanDetailModal missing non-included section');
      assert(/Especializado para Construcción & Obras/i.test(modalText), 'PlanDetailModal missing industry specialty');

      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      assert((await modalDialog.count()) === 0, 'PlanDetailModal did not close on Escape');

      // =========================================================
      // 2. AUDIT /welcome (Mobile 390x844)
      // =========================================================
      const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const mPage = await mobileCtx.newPage();
      attachMonitors(mPage, 'welcome-mobile');
      await mPage.goto(`${BASE_URL}/welcome`, { waitUntil: 'networkidle' });
      const mobileOverflow = await mPage.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      assert(!mobileOverflow, '/welcome has horizontal overflow on mobile (390px)');
      await mobileCtx.close();

      // =========================================================
      // 3. AUDIT /demo?industry=construccion_arquitectura -> 100% Coherent Construcción Demo
      // =========================================================
      const supabaseDbViolations = [];
      page.on('request', (req) => {
        if (req.url().includes('supabase.co')) {
          supabaseDbViolations.push(req.url());
        }
      });

      await page.goto(`${BASE_URL}/demo?industry=construccion_arquitectura`, {
        waitUntil: 'networkidle',
      });
      await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
      await page.waitForTimeout(900);

      const dashText = await page.locator('body').innerText();
      assert(
        dashText.includes('Constructora Cordillera') &&
          dashText.includes('Obras y Proyectos'),
        `Dashboard did not load Construcción & Obras persona`
      );
      assert(
        !/Gala TechChile|Matrimonio Sof[ií]a|Cuarteto de Cuerdas|Fonda Primavera/i.test(dashText),
        'Found Eventos leakage inside Construcción Demo Dashboard!'
      );

      // Accept cache notice once and verify it does NOT reappear after reload
      const consentBtn = page.getByRole('button', { name: /Entendido, continuar/i });
      if ((await consentBtn.count()) > 0) {
        await consentBtn.click();
        await page.waitForTimeout(250);
      }

      // Close auto-started tour if open, then test scroll + Guía Interactiva
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);

      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      assert(
        (await page.getByRole('button', { name: /Entendido, continuar/i }).count()) === 0,
        'Cache notice reappeared after already accepting!'
      );

      // Verify Dashboard trend chart renders
      await page.locator('.recharts-wrapper > svg.recharts-surface').first().waitFor({ state: 'visible', timeout: 6000 });
      const dashCharts = await page.locator('.recharts-wrapper > svg.recharts-surface').count();
      assert(dashCharts >= 1, 'Expected RevenueChart on /dashboard');

      // Test Guide Bot after scroll
      await page.evaluate(() => window.scrollBy(0, 320));
      await page.waitForTimeout(200);
      const guideLauncher = page.getByRole('button', { name: /Guía Interactiva|Bot Guía Demo/i }).first();
      await guideLauncher.click();
      await page.waitForTimeout(500);
      const guideDialog = page.getByRole('dialog');
      assert((await guideDialog.count()) > 0, 'Guide Bot dialog did not open');
      const box = await guideDialog.first().boundingBox();
      assert(box && box.y >= 0 && box.y + box.height <= 905, 'Guide Bot dialog clipped outside viewport');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-demo-dashboard-construccion.png'),
        fullPage: false,
      });

      // Close guide before navigating
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // =========================================================
      // 4. AUDIT /costs (Maestro de Partidas Construcción)
      // =========================================================
      await page.goto(`${BASE_URL}/costs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const costsText = await page.locator('body').innerText();
      assert(
        costsText.includes('Tabiquería Metalcon') &&
          !/Cuarteto de Cuerdas|Banda Live/i.test(costsText),
        'Costs page did not show Construcción tariffs or leaked Eventos tariffs'
      );

      // =========================================================
      // 5. AUDIT /events & 1-Click Duplication + /events/new Express Quote
      // =========================================================
      await page.goto(`${BASE_URL}/events`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const eventsText = await page.locator('body').innerText();
      assert(
        eventsText.includes('Remodelación Integral Casa Los Dominicos') &&
          !/Gala TechChile|Matrimonio Sof[ií]a/i.test(eventsText),
        'Events page leaked Eventos items in Construcción mode'
      );

      // Test 1-Click Duplication
      const dupBtns = page.getByRole('button', { name: /Duplicar cotización/i });
      assert((await dupBtns.count()) > 0, 'Missing 1-click Duplicar button on EventCard');
      await dupBtns.first().click();
      await page.waitForTimeout(500);
      const eventsAfterDup = await page.locator('body').innerText();
      assert(eventsAfterDup.includes('(Copia)'), 'Duplicated project did not appear on /events');

      // Test Cotización Express on /events/new
      await page.goto(`${BASE_URL}/events/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(450);
      const expressBtn = page.getByRole('button', { name: /Crear Cotización Express/i }).first();
      assert((await expressBtn.count()) === 1, 'Missing Cotización Express button on /events/new');
      await expressBtn.click();
      await page.waitForURL(/\/events\/.+/, { timeout: 10000 });
      await page.waitForTimeout(600);
      const newEventDetailText = await page.locator('body').innerText();
      assert(
        newEventDetailText.includes('Borrador de Costos') &&
          newEventDetailText.includes('Presupuesto Oficial'),
        'Express Quote did not redirect to populated EventDetailPage'
      );

      // =========================================================
      // 6. AUDIT Showcase Completed Event Finanzas (Budget vs Actual Variance)
      // =========================================================
      await page.goto(`${BASE_URL}/events/d0000002-0000-4000-8000-000000000001`, {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Finanzas")').first().click();
      await page.waitForTimeout(350);
      const finText = await page.locator('body').innerText();
      assert(
        finText.includes('Control Presupuesto vs. Real'),
        'Missing Budget vs. Actual Variance card in Finanzas tab'
      );

      // =========================================================
      // 7. AUDIT /analytics (Multi-month growth/decline + multi-category CostDistribution)
      // =========================================================
      await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      const chartCount = await page.locator('.recharts-wrapper > svg.recharts-surface').count();
      assert(chartCount >= 2, `Expected >= 2 Recharts SVGs in /analytics, got ${chartCount}`);
      const analyticsText = await page.locator('body').innerText();
      assert(
        analyticsText.includes('Mejor mes:') &&
          analyticsText.includes('Menor actividad:'),
        'Analytics missing growth/decline insight banner'
      );

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-demo-analytics-construccion.png'),
        fullPage: false,
      });

      assert(
        supabaseDbViolations.length === 0,
        `Demo mode made forbidden requests to supabase.co: ${supabaseDbViolations.join(', ')}`
      );

      await desktopCtx.close();

      assert(consoleErrors.length === 0, `Console errors detected:\n${consoleErrors.join('\n')}`);
      assert(pageErrors.length === 0, `Page errors detected:\n${pageErrors.join('\n')}`);
      assert(failedResponses.length === 0, `Failed HTTP responses:\n${failedResponses.join('\n')}`);

      console.log(
        'PLAYWRIGHT_ADVERSARIAL_AUDIT: ALL CHECKS PASSED (0 ERRORS, 0 OVERFLOWS, 100% INDUSTRY COHERENCE, 0 SUPABASE CALLS)'
      );
    } finally {
      await browser.close();
    }
  } finally {
    if (serverStartedByUs && serverProc) {
      serverProc.kill('SIGTERM');
    }
  }
}

runAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
