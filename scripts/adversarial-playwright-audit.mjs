import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR =
  process.env.PW_SCREENSHOT_DIR ||
  'C:/Users/isaia/.gemini/antigravity/brain/8e9fc306-261f-4865-aa45-2e147b6a2c91/scratch';

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

      // Test Guide Bot after scroll + verify exact geometric alignment (compensating html zoom: 0.85)
      await page.evaluate(() => window.scrollBy(0, 320));
      await page.waitForTimeout(250);
      const guideLauncher = page.getByRole('button', { name: /Guía Interactiva|Bot Guía Demo/i }).first();
      await guideLauncher.click();
      await page.waitForTimeout(550);
      const guideDialog = page.getByRole('dialog');
      assert((await guideDialog.count()) > 0, 'Guide Bot dialog did not open');
      const box = await guideDialog.first().boundingBox();
      assert(box && box.y >= 0 && box.y + box.height <= 905, 'Guide Bot dialog clipped outside viewport');

      const alignment = await page.evaluate(() => {
        const el = document.querySelector('[data-tour-id="kpi-ebitda"]');
        const ov = document.querySelector('div.fixed.border-2');
        if (!el || !ov) return null;
        const er = el.getBoundingClientRect();
        const or = ov.getBoundingClientRect();
        return {
          dx: Math.abs(or.left - (er.left - 8 * 0.85)),
          dy: Math.abs(or.top - (er.top - 8 * 0.85)),
          dw: Math.abs(or.width - (er.width + 16 * 0.85)),
          dh: Math.abs(or.height - (er.height + 16 * 0.85)),
        };
      });
      assert(
        alignment && alignment.dx <= 6 && alignment.dy <= 6 && alignment.dw <= 6 && alignment.dh <= 6,
        `Spotlight misaligned with target element: ${JSON.stringify(alignment)}`
      );

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
      const newEventUrl = page.url();
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

      // =========================================================
      // 8. AUDIT EventDetail: Multicurrency UF, OCR Gasto, Non-DUO PDF Guard,
      //    & Interactive Quote Portal (/q/demo-...) with RUT Acceptance
      // =========================================================
      await page.goto(newEventUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Si el proyecto Express parte en Borrador, aprobar la primera partida para probar Portal + PDF
      const sharePortalBtn = page.getByTestId('share-quote-portal-btn');
      if (await sharePortalBtn.isDisabled()) {
        await page.locator('button:has-text("Borrador de Costos")').first().click();
        await page.waitForTimeout(350);
        const approveAllBtn = page.getByRole('button', { name: /Aprobar Todos|Aprobar Selección|Aprobar/i }).first();
        if ((await approveAllBtn.count()) > 0 && !(await approveAllBtn.isDisabled())) {
          await approveAllBtn.click();
          await page.waitForTimeout(500);
        }
      }

      // 8a. Multicurrency UF via EditEventDialog
      await page.getByRole('button', { name: /^Editar$/i }).first().click();
      await page.waitForTimeout(250);
      await page.locator('#edit_currency').selectOption('UF');
      await page.getByRole('button', { name: /Guardar Cambios/i }).click();
      await page.waitForTimeout(450);
      const detailAfterUf = await page.locator('body').innerText();
      assert(detailAfterUf.includes('UF ('), 'EventDetailPage did not show UF currency badge after edit');

      // 8b. OCR button in TransactionDialog (Finanzas -> Documento Gasto)
      await page.locator('button:has-text("Finanzas")').first().click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: /Documento \(Gasto\)/i }).first().click();
      await page.waitForTimeout(300);
      assert(
        (await page.getByTestId('ocr-receipt-trigger').count()) === 1,
        'Missing OCR receipt scanner button inside Gasto TransactionDialog'
      );
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // 8c. Non-DUO PDF Quote Modal Guard (hide DUO music video presets)
      await page.getByRole('button', { name: /Cotización Formal \(PDF\)/i }).first().click();
      await page.waitForTimeout(300);
      const pdfModal = page.getByRole('dialog');
      const videoSwitch = pdfModal.getByTestId('pdf-videos-toggle');
      await videoSwitch.scrollIntoViewIfNeeded();
      await videoSwitch.click();
      await page.waitForTimeout(250);
      const pdfModalText = await pdfModal.innerText();
      assert(
        !/Dúo de Cuerdas|Cuarteto de Cuerdas|Violín & Chelo/i.test(pdfModalText),
        'Non-DUO ClientQuotePdfDialog leaked DUO musical video presets!'
      );
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // 8d. Share Interactive Quote Portal & Accept with Valid RUT
      assert(!(await sharePortalBtn.isDisabled()), 'Portal Cliente button remained disabled with approved items');
      await sharePortalBtn.click();
      await page.waitForTimeout(450);
      const portalLinkEl = page.getByTestId('open-quote-portal-link');
      const portalHref = await portalLinkEl.getAttribute('href');
      assert(portalHref && portalHref.startsWith('/q/demo-'), `Invalid Demo portal href: ${portalHref}`);

      await page.goto(`${BASE_URL}${portalHref}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const portalText = await page.locator('body').innerText();
      assert(
        portalText.includes('Total Propuesta') &&
          portalText.includes('UF ') &&
          !/Costo Insumos|Margen\s*\(/i.test(portalText),
        'Public Quote Portal missing totals/UF or leaked internal cost/margin fields'
      );

      // Mobile viewport check on Public Quote Portal (390px)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      const portalMobileOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      assert(!portalMobileOverflow, 'Public Quote Portal has horizontal overflow on mobile (390px)');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(200);

      // Sign digitally with Módulo 11 RUT (11.111.111-1 is mathematically valid)
      await page.getByPlaceholder(/Carolina Méndez/i).fill('Carolina Méndez Rojas');
      await page.getByPlaceholder('12.345.678-9').fill('111111111');
      await page.getByPlaceholder('cliente@empresa.cl').fill('cmendez@cordillera.cl');
      await page.getByRole('button', { name: /Aprobar Cotización/i }).click();
      await page.waitForTimeout(450);
      const portalAcceptedText = await page.locator('body').innerText();
      assert(
        portalAcceptedText.includes('Propuesta Aceptada Oficialmente'),
        'Public Quote Portal did not confirm acceptance'
      );

      // Verify status synced back to EventDetailPage ('Aprobado' + 'Aceptada Digitalmente')
      await page.goto(newEventUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(450);
      const syncedEventText = await page.locator('body').innerText();
      assert(
        syncedEventText.includes('Aprobado') && syncedEventText.includes('Aceptada Digitalmente'),
        'Accepted quote portal did not auto-promote Event status to Aprobado'
      );

      // =========================================================
      // 9. AUDIT /treasury (Flujo 30/60/90d, F29 Global, Cartola RCV, Agenda)
      // =========================================================
      await page.goto(`${BASE_URL}/treasury`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const treasuryText = await page.locator('body').innerText();
      assert(
        /Por Cobrar Confirmado/i.test(treasuryText) &&
          /Consolidado SII F29 Global/i.test(treasuryText) &&
          /Caja Neta Realizada/i.test(treasuryText),
        `/treasury missing Cashflow or F29 KPI sections. Preview:\n${treasuryText.slice(0, 600)}`
      );
      const treasurySvgs = await page.locator('.recharts-wrapper > svg.recharts-surface').count();
      assert(treasurySvgs >= 1, 'Expected CashflowChart SVG in /treasury');

      const treasuryDesktopOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      assert(!treasuryDesktopOverflow, '/treasury has horizontal overflow on desktop');

      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      const treasuryMobileOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      assert(!treasuryMobileOverflow, '/treasury has horizontal overflow on mobile (390px)');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(200);

      // Test Cartola & RCV SII Reconciler (1-Click Sample + Batch Insert)
      await page.getByRole('button', { name: /Cartola & RCV SII/i }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: /Cargar Cartola Demo/i }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: /Contabilizar \(3\)/i }).click();
      await page.waitForTimeout(500);
      const reconcilerAfterText = await page.locator('body').innerText();
      assert(
        reconcilerAfterText.includes('conciliados y contabilizados exitosamente'),
        'Bank & RCV Reconciler did not batch-insert demo movements'
      );

      // Test Resource Calendar & Collision Detector Tab
      await page.getByRole('button', { name: /^Agenda/i }).click();
      await page.waitForTimeout(350);
      const agendaText = await page.locator('body').innerText();
      assert(
        agendaText.includes('Agenda Operativa'),
        'Resource Calendar Agenda tab did not render'
      );

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'pw-demo-treasury.png'),
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
