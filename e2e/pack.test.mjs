import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const tsc = path.join(repoRoot, "node_modules/typescript/bin/tsc");

const IPS = [
  "1.0.0.1",
  "8.8.8.8",
  "9.9.9.9",
  "2404:6800::1",
  "999.7.7.7",
  "772404:6800:400a:804::200e99",
];
const EXPECTED = ["测试国甲", "Fixtureland B", "n/a", "测试国丙", "n/a", "n/a"];

const lookupScript = (load) => `
${load}
const [url, ...ips] = process.argv.slice(1);
Promise.all(ips.map((ip) => getGeoFromIp(ip, url))).then((r) => console.log(JSON.stringify(r)));
`;

const esmScript = lookupScript(
  'import { getGeoFromIp } from "use-mmdb-vanilla";',
);
const cjsScript = lookupScript(
  'const { getGeoFromIp } = require("use-mmdb-vanilla");',
);
const liveEsmScript = `
import { getGeoFromIp } from "use-mmdb-vanilla";
console.log(JSON.stringify(await getGeoFromIp("112.238.182.153")));
`;

const ESM_TYPES = `import { getGeoFromIp } from "use-mmdb-vanilla";

const withUrl: Promise<string> = getGeoFromIp("1.0.0.1", "https://example.test/a.mmdb");
const withoutUrl: Promise<string> = getGeoFromIp("1.0.0.1");
// @ts-expect-error ip must be a string
getGeoFromIp(123);
export { withUrl, withoutUrl };
`;

const CJS_TYPES = `import lib = require("use-mmdb-vanilla");

const withUrl: Promise<string> = lib.getGeoFromIp("1.0.0.1", "https://example.test/a.mmdb");
const withoutUrl: Promise<string> = lib.getGeoFromIp("1.0.0.1");
// @ts-expect-error ip must be a string
lib.getGeoFromIp(123);
export = { withUrl, withoutUrl };
`;

describe("packed package consumed from a clean project", () => {
  let workDir;
  let consumerDir;
  let server;
  let serverUrl;
  let hits = 0;

  const node = async (args) => {
    try {
      const { stdout } = await run(process.execPath, args, {
        cwd: consumerDir,
      });
      return JSON.parse(stdout.trim());
    } catch (error) {
      const stderr = String(error.stderr ?? error.message);
      const lines = stderr.split("\n").map((line) => line.slice(0, 200));
      assert.fail(
        `node exited with ${error.code}:\n${lines.slice(0, 12).join("\n")}`,
      );
    }
  };

  before(async () => {
    workDir = await mkdtemp(path.join(os.tmpdir(), "use-mmdb-pack-"));
    consumerDir = path.join(workDir, "consumer");

    const { stdout } = await run(
      "npm",
      ["pack", "--json", "--pack-destination", workDir],
      { cwd: repoRoot },
    );
    const tarball = path.join(workDir, JSON.parse(stdout)[0].filename);

    await run("mkdir", [consumerDir]);
    await writeFile(
      path.join(consumerDir, "package.json"),
      JSON.stringify({ name: "consumer", private: true, type: "commonjs" }),
    );
    await run("npm", ["install", "--no-audit", "--no-fund", tarball], {
      cwd: consumerDir,
    });

    const fixture = await readFile(
      path.join(repoRoot, "test/fixtures/geo.mmdb"),
    );
    server = http.createServer((req, res) => {
      if (req.url !== "/geo.mmdb") {
        res.writeHead(404).end();
        return;
      }
      hits += 1;
      res
        .writeHead(200, { "content-type": "application/octet-stream" })
        .end(fixture);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    serverUrl = `http://127.0.0.1:${server.address().port}/geo.mmdb`;
  });

  after(async () => {
    await new Promise((resolve) =>
      server ? server.close(resolve) : resolve(),
    );
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  test("ESM import resolves, loads in Node and downloads the database once", async () => {
    const before = hits;
    const results = await node([
      "--input-type=module",
      "-e",
      esmScript,
      serverUrl,
      ...IPS,
    ]);
    assert.deepEqual(results, EXPECTED);
    assert.equal(hits - before, 1);
  });

  test("CJS require resolves, loads in Node and downloads the database once", async () => {
    const before = hits;
    const results = await node(["-e", cjsScript, serverUrl, ...IPS]);
    assert.deepEqual(results, EXPECTED);
    assert.equal(hits - before, 1);
  });

  test("TypeScript consumers type-check under nodenext for ESM and CJS", async () => {
    await writeFile(path.join(consumerDir, "esm.mts"), ESM_TYPES);
    await writeFile(path.join(consumerDir, "cjs.cts"), CJS_TYPES);
    await run(
      process.execPath,
      [
        tsc,
        "--noEmit",
        "--strict",
        "--module",
        "nodenext",
        "--moduleResolution",
        "nodenext",
        "--skipLibCheck",
        "false",
        "esm.mts",
        "cjs.cts",
      ],
      { cwd: consumerDir },
    ).catch((error) => {
      assert.fail(`tsc failed:\n${error.stdout}${error.stderr}`);
    });
  });

  test(
    "default database url resolves a real IP",
    { skip: process.env.E2E_LIVE !== "1" },
    async () => {
      const result = await node(["--input-type=module", "-e", liveEsmScript]);
      assert.equal(result, "中国");
    },
  );
});
