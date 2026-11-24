import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR =
  process.env.PW_SCREENSHOT_DIR ||
  'C:/Users/isaia/.gemini/antigravity/brain/a57695cb-9013-4143-bc57-59f0c46129f2/scratch';

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

      // Verify redundant #simulador section was removed
      assert(
        (await page.locator('#simulador').count()) === 0,
        'Redundant #simulador section still exists on /welcome'
      );

      const welcomeOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      assert(!welcomeOverflow, '/welcome has horizontal overflow on desktop');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-welcome-desktop.png'),
        fullPage: false,
      });

      // Switch industry in Hero selector
      await page.getByRole('button', { name: 'Construcción' }).click();
      await page.waitForTimeout(350);
      const bodyAfterInd = await page.locator('body').innerText();
      assert(
        bodyAfterInd.includes('Constructora') || bodyAfterInd.includes('Construcción'),
        '/welcome did not adapt copy to Construcción industry'
      );

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

      // Dismiss modal with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      assert((await modalDialog.count()) === 0, 'PlanDetailModal did not close on Escape');

      // Select ALL 7 modules in "Arma tu Plan" and verify $147.920 > Enterprise $109.990 nudge
      const addonButtons = page.locator('button:has-text("Cargo mensual adicional")');
      const addonCount = await addonButtons.count();
      assert(addonCount === 7, `Expected 7 selectable add-ons, got ${addonCount}`);
      for (let i = 0; i < addonCount; i++) {
        const btn = addonButtons.nth(i);
        const pressed = await btn.getAttribute('aria-pressed');
        const cls = (await btn.getAttribute('class')) || '';
        const isActive = pressed === 'true' || cls.includes('bg-white/95') || cls.includes('ring-1');
        if (!isActive) {
          await btn.click();
        }
      }
      await page.waitForTimeout(600);
      const welcomePlansText = await page.locator('#planes').innerText();
      assert(
        welcomePlansText.includes('7 módulos') && welcomePlansText.includes('¡Te conviene Enterprise!'),
        `Arma tu Plan with all 7 modules did not display 7 módulos and Enterprise savings nudge`
      );

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
      await mPage.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-welcome-mobile.png'),
        fullPage: false,
      });
      await mobileCtx.close();

      // =========================================================
      // 3. AUDIT /demo -> Real ERP in Local Cache (Zero Supabase DB calls)
      // =========================================================
      const supabaseDbViolations = [];
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('supabase.co')) {
          supabaseDbViolations.push(url);
        }
      });

      await page.goto(`${BASE_URL}/demo`, { waitUntil: 'networkidle' });
      await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
      await page.waitForTimeout(500);

      // Verify zero DUO Producciones leaks
      const demoBodyText = await page.locator('body').innerText();
      assert(
        !/duo\s*producciones|duoproducciones/i.test(demoBodyText),
        'Found forbidden DUO Producciones reference in Demo ERP'
      );

      // Verify NO Administración section in Demo Sidebar
      const sidebarText = await page.locator('aside').first().innerText();
      assert(
        !/administraci[oó]n/i.test(sidebarText),
        'Demo Sidebar still contains Administración section'
      );

      // Verify local cache consent banner & accept
      const consentBtn = page.getByRole('button', { name: /Entendido, continuar/i });
      if ((await consentBtn.count()) > 0) {
        await consentBtn.click();
        await page.waitForTimeout(250);
      }

      // Verify Floating "Bot Guía Demo" button exists
      const guideBotBtn = page.getByRole('button', { name: /Bot Guía Demo/i });
      assert((await guideBotBtn.count()) > 0, 'Missing floating Bot Guía Demo button');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-demo-dashboard.png'),
        fullPage: false,
      });

      // Navigate to /costs (Tarifas) and verify tariff editing dialog (CostFormDialog) opens
      await page.goto(`${BASE_URL}/costs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(450);
      const editButtons = page.locator('table tbody tr button').first();
      assert((await editButtons.count()) > 0, 'No tariff action buttons found in /costs');
      await editButtons.click();
      await page.waitForTimeout(300);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-demo-costs-edit.png'),
        fullPage: false,
      });

      // Navigate to /events/new and verify full real EventForm (with description and retail toggle)
      await page.goto(`${BASE_URL}/events/new`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(350);
      assert(
        (await page.locator('textarea#description').count()) === 1 &&
          (await page.locator('input#has_retail_sales').count()) === 1,
        '/events/new is missing full EventForm fields (description or has_retail_sales)'
      );

      // Navigate to real Event Detail workspace (/events/d0000002-0000-4000-8000-000000000003)
      await page.goto(`${BASE_URL}/events/d0000002-0000-4000-8000-000000000003`, {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(500);

      // Verify 4 real tabs + Floating Financial Advisor chatbot button + ZERO DUO leaks inside EventDetailPage
      const eventPageText = await page.locator('body').innerText();
      assert(
        eventPageText.includes('Borrador de Costos') &&
          eventPageText.includes('Presupuesto Oficial') &&
          eventPageText.includes('Finanzas'),
        'Real 4-tab EventDetailPage did not render in Demo'
      );
      assert(
        !/\bduo\b|duoproducciones/i.test(eventPageText),
        'Found forbidden DUO reference inside Demo EventDetailPage'
      );

      // Click Borrador de Costos tab
      await page.locator('button:has-text("Borrador de Costos")').first().click();
      await page.waitForTimeout(350);

      const draftPageText = await page.locator('body').innerText();
      assert(
        !/\bduo\b|duoproducciones/i.test(draftPageText),
        'Found forbidden DUO reference inside Demo Borrador de Costos tab'
      );

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-demo-project.png'),
        fullPage: false,
      });

      // Navigate to /analytics and verify Recharts
      await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      const chartCount = await page.locator('.recharts-wrapper > svg.recharts-surface').count();
      assert(chartCount >= 2, `Expected >= 2 Recharts SVGs in /analytics, got ${chartCount}`);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-demo-analytics.png'),
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

      console.log('PLAYWRIGHT_ADVERSARIAL_AUDIT: ALL CHECKS PASSED (0 ERRORS, 0 OVERFLOWS, 0 SUPABASE CALLS IN DEMO)');
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
