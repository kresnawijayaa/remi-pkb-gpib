import path from 'node:path';
import console from 'node:console';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
const root = path.resolve('outputs/meeting-panitia-20261021');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto(pathToFileURL(path.join(root, 'Panduan-Meeting.html')).href);
  for (const [name, width, height] of [['desktop',1360,950],['mobile',390,844]]) {
    await page.setViewportSize({width,height});
    await page.screenshot({path:path.join(root,`support/previews/panduan-${name}.png`),fullPage:true});
    await page.screenshot({path:path.join(root,`support/previews/pembuka-${name}.png`)});
    const overflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth);
    if(overflow) throw new Error(`Page overflows: ${name}`);
  }
  await page.setViewportSize({width:1360,height:950});
  await page.locator('#demo').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(root,'support/previews/demo-desktop.png')});
  const links = await page.locator('a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')).filter(Boolean));
  for(const href of links){
    if(href.startsWith('#')) {if(await page.locator(href).count()!==1)throw new Error(`Missing anchor ${href}`);}
    else if(!/^https?:/.test(href)) await fs.access(path.join(root,href));
  }
  if(failures.length)throw new Error(failures.join('\n'));
  await page.goto(pathToFileURL(path.join(root,'Lembar-Hasil-Meja.html')).href);
  await page.setViewportSize({width:1100,height:1250});
  await page.screenshot({path:path.join(root,'support/previews/lembar-hasil.png'),fullPage:true});
  console.log('HTML PASS: desktop/mobile overflow, local links, anchors, and page errors.');
} finally {await browser.close();}
