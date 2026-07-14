const { chromium } = require('playwright');
const OUT = 'C:/Users/M7200~1.SHA/AppData/Local/Temp/claude/d--Projects-islamic-smart-assistant/c1f741d2-0369-49b9-8c00-f383509eacf2/scratchpad';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  // Pre-seed persisted state: light theme + Read Only Mode already on, so no UI
  // clicking is needed to reach the redesigned page view.
  await page.addInitScript(() => {
    localStorage.setItem('isa:theme', 'light');
    localStorage.setItem('isa:quran-read-only-mode', 'true');
    localStorage.setItem('isa:quran-last-read-page', '3');
  });

  await page.goto('http://localhost:3015/dashboard/quran', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const modalCloseX = page.getByRole('button', { name: 'Close' });
  if (await modalCloseX.isVisible().catch(() => false)) { await modalCloseX.click(); await page.waitForTimeout(500); }

  const pageInput = page.locator('input[type="number"]');
  await pageInput.fill('3');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/redesign-01-page3-light.png` });

  await pageInput.fill('4');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/redesign-02-page4-light.png` });

  // Check horizontal overflow: any line wider than its container?
  const overflow = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[dir="rtl"].font-arabic')];
    return rows.filter(r => r.scrollWidth > r.clientWidth + 2).length;
  });
  console.log('rows overflowing horizontally on page 4:', overflow);

  console.log('CONSOLE_ERRORS:', JSON.stringify(errors, null, 2));
  await browser.close();
})().catch((e) => { console.error('SCRIPT_ERROR', e); process.exit(1); });
