import chromium from "@sparticuz/chromium";

export async function launchBrowser() {
  if (process.env.VERCEL) {
    const { chromium: playwrightChromium } = await import("playwright-core");
    const executablePath = await chromium.executablePath();

    return playwrightChromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  }

  const { chromium: localChromium } = await import("playwright");
  return localChromium.launch({ headless: true });
}
