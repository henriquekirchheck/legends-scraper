import puppeteer from "puppeteer";
import { args, cacheResult, downloadToFile, multiple } from "./utils.ts";

const { getMusic, getPages } = await import(
  `./scraper-functions/ado.ts`
);

const browser = await puppeteer.launch({ headless: !args.open });

const musicLinks = await cacheResult(
  args["pages-cache"],
  () => getPages(browser),
);

const music = await cacheResult(
  args["music-cache"],
  () => getMusic(browser, musicLinks),
);

await browser.close();

for (const itens of multiple(music, 50)) {
  await Deno.mkdir(args.result).catch(() => {});
  await Promise.all(itens.map(downloadToFile));
}
