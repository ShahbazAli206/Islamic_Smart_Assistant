const { chromium } = require('playwright-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('isa:theme','light');
    localStorage.setItem('isa:city','Toronto'); localStorage.setItem('isa:country','Canada');
    localStorage.setItem('isa:language','ur'); localStorage.setItem('isa:sect','sunni');
    localStorage.setItem('isa:method','1'); localStorage.setItem('isa:name','Shahbaz');
    localStorage.setItem('isa:setupDone','1'); localStorage.setItem('isa:lat','43.6532');
    localStorage.setItem('isa:lng','-79.3832'); localStorage.setItem('isa:coordsFor','Toronto, Canada');
  });
  await page.goto('http://localhost:3939/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: process.argv[2], clip: { x: 232, y: 0, width: 1368, height: 360 } });
  await browser.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
