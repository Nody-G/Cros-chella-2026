const puppeteer = require('puppeteer');
const path = require('path');

const BASE = 'http://localhost:3456';
const W = 390;
const H = 844;

const pages = [
  { name: 'landing', url: '/', wait: 3000 },
  { name: 'participants', url: '/participants', wait: 2000 },
  { name: 'programme', url: '/programme', wait: 2000 },
  { name: 'chat', url: '/chat', wait: 2000 },
  { name: 'galerie', url: '/galerie', wait: 2000 },
  { name: 'depenses', url: '/depenses', wait: 2000 },
  { name: 'jeux', url: '/jeux', wait: 2000 },
  { name: 'billard', url: '/billard', wait: 2000 },
  { name: 'badges', url: '/badges', wait: 2000 },
  { name: 'profil', url: '/profil', wait: 2000 },
  { name: 'alcool', url: '/alcool', wait: 2000 },
  { name: 'sondages', url: '/sondages', wait: 2000 },
];

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

  // Inject localStorage on first page load
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('cros-chella-user', JSON.stringify({
      id: 'test-user-id',
      prenom: 'Niels',
      pseudo: 'Ma\u00EEtre',
      role: 'admin'
    }));
  });

  for (const p of pages) {
    try {
      await page.goto(BASE + p.url, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(r => setTimeout(r, p.wait));
      const outPath = path.join(__dirname, `${p.name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`OK ${p.name}.png`);
    } catch (err) {
      console.error(`FAIL ${p.name}: ${err.message}`);
    }
  }

  // Desktop landing
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(__dirname, 'landing-desktop.png'), fullPage: false });
  console.log('OK landing-desktop.png');

  await browser.close();
  console.log('DONE');
})();
