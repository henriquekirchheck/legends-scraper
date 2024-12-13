import type { Browser } from "puppeteer";
import { debug, multiple, Music } from "../utils.ts";

export const getPages = async (browser: Browser) => {
  const page = await browser.newPage();

  await page.goto(
    "https://antifandom.com/vocaloid/wiki/Category:Hall_of_Legend",
  );

  const links = await page.$$eval(
    ".my-category-list > li > a",
    (links: HTMLAnchorElement[]) => links.map((link) => link.href),
  );

  page.close();

  return links;
};

export const getMusic = async (browser: Browser, musicLinks: string[]) => {
  const music: Music[] = [];
  for (const links of multiple(musicLinks, 5)) {
    const context = await browser.createBrowserContext();
    for (const link of links) {
      const page = await context.newPage();
      page.goto(link);

      const titlePromise = page
        .locator('[data-item-name="title"] b')
        .map((element: HTMLElement) => element.innerText)
        .wait().catch(() => undefined);
      const imagePromise = page
        .locator('[data-source="image"] a')
        .map((element: HTMLAnchorElement) => element.href)
        .wait().catch(() => undefined);
      const mainProducerPromise = page
        .locator('[data-source="producers"] li')
        .map((element: HTMLElement) =>
          element.innerText.replace(/ \(.*\)$/, "")
        )
        .wait().catch(() => undefined);

      const [image, title, mainProducer] = await Promise.all([
        imagePromise,
        titlePromise,
        mainProducerPromise,
      ]);
      if (!title) continue;
      music.push(debug({ image, title, mainProducer }));
    }
    await context.close();
  }
  return music;
};
