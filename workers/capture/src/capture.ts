import { chromium } from 'playwright';
import { createHash } from 'crypto';

/**
 * Metadata about the capture process
 */
export interface CaptureMetadata {
  url: string;
  timestamp: number;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  title: string;
  finalUrl: string;
  screenshotHash: string;
  htmlHash: string;
}

/**
 * Result of capturing a web page
 */
export interface CaptureResult {
  screenshot: Buffer;
  html: string;
  metadata: CaptureMetadata;
}

/**
 * Captures a full-page screenshot and HTML content of a web page.
 * Handles lazy-loaded content by scrolling through the page and waiting for all resources to load.
 * Runs in sandbox environment for security isolation.
 *
 * @param url URL of the web page to capture
 * @returns Promise resolving to object containing PNG screenshot buffer, HTML content, and metadata
 */
export async function capturePage(url: string): Promise<CaptureResult> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--sandbox', // Enable sandbox for security isolation
      '--disable-setuid-sandbox', // Disable setuid sandbox (may be needed in some environments)
      '--disable-dev-shm-usage', // Overcome limited resource problems
    ],
  });
  const page = await browser.newPage();
  const timestamp = Date.now();

  try {
    // Navigate to the page and wait for initial load
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const finalUrl = response?.url() || url;

    // Wait for network to be idle (no requests for 500ms)
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Scroll through the page to trigger lazy-loaded content
    // This ensures images and other lazy-loaded elements are loaded
    await autoScroll(page);

    // Wait again for network to be idle after scrolling (lazy-loaded content may trigger new requests)
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // Additional wait for any animations or transitions to complete
    await page.waitForTimeout(1000);

    // Capture full-page screenshot and HTML content
    const [screenshot, html, title] = await Promise.all([
      page.screenshot({ fullPage: true, type: 'png' }),
      page.content(),
      page.title(),
    ]);

    const screenshotBuffer = screenshot as Buffer;
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const viewportSize = page.viewportSize();

    // Calculate hashes
    const screenshotHash = createHash('sha256').update(screenshotBuffer).digest('hex');
    const htmlHash = createHash('sha256').update(html).digest('hex');

    const metadata: CaptureMetadata = {
      url,
      timestamp,
      userAgent,
      viewport: {
        width: viewportSize?.width || 1920,
        height: viewportSize?.height || 1080,
      },
      title,
      finalUrl,
      screenshotHash,
      htmlHash,
    };

    return {
      screenshot: screenshotBuffer,
      html,
      metadata,
    };
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/**
 * Scrolls through the entire page to trigger lazy-loaded content.
 * Scrolls in increments and waits between scrolls to allow content to load.
 *
 * @param page Playwright page instance
 */
async function autoScroll(page: any): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 300; // Scroll distance in pixels
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        // If we've scrolled past the bottom or reached the end, stop
        if (totalHeight >= scrollHeight || window.innerHeight + window.scrollY >= scrollHeight) {
          clearInterval(timer);
          // Scroll back to top
          window.scrollTo(0, 0);
          resolve();
        }
      }, 200); // Wait 200ms between scrolls
    });
  });
}
