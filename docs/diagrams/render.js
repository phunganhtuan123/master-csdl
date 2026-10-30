// Render các file HTML sơ đồ -> PNG (2x) bằng Playwright.  node render.js architecture erd
// Placeholder {{icon:siNodedotjs:#fff:70}} -> SVG logo từ gói simple-icons (docs/build/node_modules)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const si = require(path.resolve(__dirname, '../build/node_modules/simple-icons'));
const inject = (html) => html.replace(/\{\{icon:(\w+):(#[0-9a-fA-F]{3,6}):(\d+)\}\}/g, (_, name, color, size) => {
  const ic = si[name]; if (!ic) throw new Error('icon ' + name);
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="width:${size}px;height:${size}px"><path d="${ic.path}" fill="${color}"/></svg>`;
});
(async () => {
  const browser = await chromium.launch();
  for (const n of process.argv.slice(2)) {
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    await page.setContent(inject(fs.readFileSync(path.resolve(__dirname, n + '.html'), 'utf8')), { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await (await page.$('#c')).screenshot({ path: path.resolve(__dirname, n + '.png') });
    console.log('wrote', n + '.png');
    await page.close();
  }
  await browser.close();
})();
