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
    // Check if port 3099 is already serving
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

      // Switch industry in Hero selector
      await page.getByRole('button', { name: 'Construcción' }).click();
      await page.waitForTimeout(400);
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
        const cls = (await btn.getAttribute('class')) || '';
        if (!cls.includes('bg-[#0D1829]')) {
          await btn.click();
        }
      }
      await page.waitForTimeout(550);
      const welcomePlansText = await page.locator('#planes').innerText();
      assert(
        welcomePlansText.includes('147.920') && welcomePlansText.includes('¡Te conviene Enterprise!'),
        'Arma tu Plan with all 7 modules did not display $147.920 and Enterprise savings nudge'
      );

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-welcome-desktop.png'),
        fullPage: false,
      });

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
      // 3. AUDIT /demo (Enterprise Local Sandbox, Zero Supabase)
      // =========================================================
      const demoNetworkViolations = [];
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('supabase.co') || url.includes('/api/')) {
          demoNetworkViolations.push(url);
        }
      });

      await page.goto(`${BASE_URL}/demo`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      // Verify zero DUO Producciones leaks
      const demoBodyText = await page.locator('body').innerText();
      assert(
        !/duo\s*producciones|duoproducciones/i.test(demoBodyText),
        'Found forbidden DUO Producciones reference in /demo'
      );

      // Verify local cache consent banner & accept
      const consentBtn = page.getByRole('button', { name: /Entendido, continuar/i });
      if ((await consentBtn.count()) > 0) {
        await consentBtn.click();
        await page.waitForTimeout(250);
        const storedConsent = await page.evaluate(() =>
          localStorage.getItem('kairos_demo_cache_consent')
        );
        assert(storedConsent === 'accepted', 'Cache consent was not saved in localStorage');
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-demo-dashboard.png'),
        fullPage: false,
      });

      // Switch industry in /demo header select
      const industrySelect = page.locator('header select').first();
      await industrySelect.selectOption('construccion_arquitectura');
      await page.waitForTimeout(450);

      // Open a project from Dashboard scenario card -> DemoProjectDetail
      await page.locator('button:has-text("Abrir")').first().click();
      await page.waitForTimeout(450);

      // Tab 1: Budget - Add item from catalog
      const rowsBefore = await page.locator('tbody tr').count();
      await page.getByRole('button', { name: 'Agregar', exact: true }).click();
      await page.waitForTimeout(250);
      const rowsAfter = await page.locator('tbody tr').count();
      assert(rowsAfter > rowsBefore, 'Adding item from catalog in /demo did not increase table rows');

      // Tab 2: Cash flow
      await page.getByRole('button', { name: /Flujo de Caja/i }).click();
      await page.waitForTimeout(250);
      await page.locator('input[placeholder*="Pago cuota"]').fill('Abono Prueba Playwright');
      await page.getByRole('button', { name: /Registrar en Trazabilidad Local/i }).click();
      await page.waitForTimeout(250);
      const cashText = await page.locator('main').innerText();
      assert(cashText.includes('Abono Prueba Playwright'), 'Transaction was not added in Cashflow tab');

      // Tab 3: Suite IA & OCR
      await page.getByRole('button', { name: /Suite IA & OCR/i }).click();
      await page.waitForTimeout(250);
      await page.getByRole('button', { name: /Ejecutar Auditoría de Márgenes IA/i }).click();
      await page.waitForTimeout(850);
      await page.getByRole('button', { name: /Aplicar al Presupuesto/i }).first().click();
      await page.waitForTimeout(250);
      await page.getByRole('button', { name: /Procesar Documento e Importar/i }).first().click();
      await page.waitForTimeout(800);

      // Tab 4: PDF Marca Blanca
      await page.getByRole('button', { name: /Cotizador PDF Marca Blanca/i }).click();
      await page.waitForTimeout(300);
      const pdfText = await page.locator('main').innerText();
      assert(pdfText.includes('MODO DEMO · KAIROS'), 'PDF preview missing DEMO watermark');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-demo-project.png'),
        fullPage: false,
      });

      // Navigate via Sidebar to Catalog, Analytics (Recharts), and Branding
      await page.locator('aside nav').first().locator('button').nth(1).click(); // Catalog
      await page.waitForTimeout(300);
      await page.locator('aside').getByRole('button', { name: /F29/i }).click(); // Analytics & F29
      await page.waitForTimeout(900);

      const chartCount = await page.locator('.recharts-wrapper > svg.recharts-surface').count();
      assert(chartCount >= 2, `Expected >= 2 Recharts SVGs in /demo Analytics, got ${chartCount}`);
      const firstChartBox = await page.locator('.recharts-wrapper > svg.recharts-surface').first().boundingBox();
      assert(
        firstChartBox && firstChartBox.width > 100 && firstChartBox.height > 100,
        'Recharts SVG rendered with invalid dimensions'
      );

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-demo-analytics.png'),
        fullPage: false,
      });

      await page.locator('aside').getByRole('button', { name: /Equipo & Marca Blanca/i }).click(); // Equipo & Marca Blanca
      await page.waitForTimeout(300);
      assert(
        (await page.locator('main').innerText()).includes('KAIROS-DEMO-2026'),
        'Branding/Team view missing invite code'
      );

      assert(
        demoNetworkViolations.length === 0,
        `/demo made forbidden network requests: ${demoNetworkViolations.join(', ')}`
      );

      // =========================================================
      // 4. AUDIT /login & /register
      // =========================================================
      for (const route of ['/login', '/register']) {
        const res = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
        assert(res && res.status() === 200, `${route} did not return 200`);
        const ov = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1
        );
        assert(!ov, `${route} has horizontal overflow`);
      }

      await desktopCtx.close();

      assert(consoleErrors.length === 0, `Console errors detected:\n${consoleErrors.join('\n')}`);
      assert(pageErrors.length === 0, `Page errors detected:\n${pageErrors.join('\n')}`);
      assert(failedResponses.length === 0, `Failed HTTP responses:\n${failedResponses.join('\n')}`);

      console.log('PLAYWRIGHT_ADVERSARIAL_AUDIT: ALL CHECKS PASSED (0 ERRORS, 0 OVERFLOWS, 0 SUPABASE CALLS IN /demo)');
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
