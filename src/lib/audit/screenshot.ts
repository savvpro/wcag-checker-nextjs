import { launchBrowser } from "@/lib/audit/browser";

export async function captureScreenshot(normalizedUrl: string): Promise<string | undefined> {
  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1024 },
      deviceScaleFactor: 1,
    });

    await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(1500);

    const buffer = await page.screenshot({
      type: "jpeg",
      quality: 70,
      fullPage: false,
    });

    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("Screenshot capture failed", {
      url: normalizedUrl,
      message: error instanceof Error ? error.message : "Unknown screenshot error",
      environment: process.env.VERCEL ? "vercel" : "local",
    });
    return undefined;
  } finally {
    await browser?.close();
  }
}
