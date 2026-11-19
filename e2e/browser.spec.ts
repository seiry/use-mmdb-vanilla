import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CDN = "https://cdn.jsdelivr.net/npm/use-mmdb-vanilla/dist";
const DEFAULT_MMDB_URL =
  "https://raw.githubusercontent.com/Max-Sum/17mon-mmdb/release/Country.mmdb";
const PAGE_URL = "http://lib.test/";

const IPS = [
  "1.0.0.1",
  "8.8.8.8",
  "9.9.9.9",
  "2404:6800::1",
  "999.7.7.7",
  "772404:6800:400a:804::200e99",
];
const EXPECTED = ["测试国甲", "Fixtureland B", "n/a", "测试国丙", "n/a", "n/a"];

const readmeSnippet = (
  build: string,
) => `<script src="${CDN}/index.${build}.js"></script>
<div id="raw"></div>
<script async>
  const ip = "112.238.182.153";
  getGeoFromIp(ip).then((geo) => {
    document.getElementById("raw").innerText = \`\${ip}: \${geo}\`;
  });
</script>`;

for (const build of ["umd", "iife"] as const) {
  test(`README browser snippet works with the ${build} build`, async ({
    page,
  }, testInfo) => {
    const fixture = await readFile(path.join(ROOT, "test/fixtures/geo.mmdb"));
    const bundle = await readFile(path.join(ROOT, `dist/index.${build}.js`));
    let mmdbHits = 0;
    const unexpectedRequests: string[] = [];

    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (url === PAGE_URL) {
        await route.fulfill({
          contentType: "text/html",
          body: `<!doctype html><html><body>${readmeSnippet(build)}</body></html>`,
        });
      } else if (url === `${CDN}/index.${build}.js`) {
        await route.fulfill({
          contentType: "application/javascript",
          body: bundle,
        });
      } else if (url === DEFAULT_MMDB_URL) {
        mmdbHits += 1;
        await route.fulfill({
          contentType: "application/octet-stream",
          headers: { "access-control-allow-origin": "*" },
          body: fixture,
        });
      } else if (url === `${PAGE_URL}favicon.ico`) {
        await route.fulfill({ status: 204 });
      } else {
        unexpectedRequests.push(url);
        await route.abort();
      }
    });

    await page.goto(PAGE_URL);
    await expect(page.locator("#raw")).toHaveText("112.238.182.153: n/a");

    const results = await page.evaluate(
      (ips) =>
        Promise.all(
          ips.map((ip) =>
            (
              window as unknown as {
                getGeoFromIp: (ip: string) => Promise<string>;
              }
            ).getGeoFromIp(ip),
          ),
        ),
      IPS,
    );

    const report = { build, ips: IPS, results, mmdbHits, unexpectedRequests };
    const json = JSON.stringify(report, null, 2);
    await mkdir(path.join(ROOT, "test-results"), { recursive: true });
    await writeFile(
      path.join(ROOT, `test-results/browser-${build}.json`),
      json,
    );
    await testInfo.attach(`report-${build}.json`, {
      body: json,
      contentType: "application/json",
    });

    await page.evaluate((text) => {
      const pre = document.createElement("pre");
      pre.id = "report";
      pre.textContent = text;
      document.body.append(pre);
    }, json);
    await testInfo.attach(`screenshot-${build}.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    expect(unexpectedRequests).toEqual([]);
    expect(results).toEqual(EXPECTED);
    expect(mmdbHits).toBe(1);
  });
}
