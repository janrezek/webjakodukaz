import { chromium } from 'playwright';

export async function captureScreenshot(url: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    const buf = await page.screenshot({ fullPage: true, type: 'png' });
    return buf;
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
