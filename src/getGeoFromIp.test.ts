import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("buffer", () => import("node:buffer"));

const fixture = readFileSync(resolve(__dirname, "../test/fixtures/geo.mmdb"));
const DEFAULT_URL =
  "https://raw.githubusercontent.com/Max-Sum/17mon-mmdb/release/Country.mmdb";

const okResponse = () => ({
  ok: true,
  arrayBuffer: async () =>
    fixture.buffer.slice(
      fixture.byteOffset,
      fixture.byteOffset + fixture.byteLength,
    ),
});

const stubFetch = (
  ...responses: Array<ReturnType<typeof okResponse> | { ok: false }>
) => {
  const fetchMock = vi.fn(async () => responses.shift() ?? okResponse());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const load = () => import("./getGeoFromIp");

describe("getGeoFromIp", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  describe("country names", () => {
    it("prefers zh-CN", async () => {
      stubFetch();
      const { getGeoFromIp } = await load();
      expect(await getGeoFromIp("1.0.0.1")).toBe("测试国甲");
    });

    it("falls back to en when zh-CN is missing", async () => {
      stubFetch();
      const { getGeoFromIp } = await load();
      expect(await getGeoFromIp("8.8.8.8")).toBe("Fixtureland B");
    });

    it("returns n/a when the record has no names", async () => {
      stubFetch();
      const { getGeoFromIp } = await load();
      expect(await getGeoFromIp("9.9.9.9")).toBe("n/a");
    });

    it("resolves full and compressed IPv6", async () => {
      stubFetch();
      const { getGeoFromIp } = await load();
      expect(await getGeoFromIp("2404:6800:400a:804::200e")).toBe("测试国丙");
      expect(await getGeoFromIp("2404:6800::1")).toBe("测试国丙");
    });

    it("returns n/a for a valid IP that is not in the database", async () => {
      stubFetch();
      const { getGeoFromIp } = await load();
      expect(await getGeoFromIp("127.0.0.1")).toBe("n/a");
    });
  });

  describe("database loading", () => {
    it("downloads the database once for concurrent first lookups", async () => {
      const fetchMock = stubFetch();
      const { getGeoFromIp } = await load();
      const results = await Promise.all(
        ["1.0.0.1", "8.8.8.8", "9.9.9.9", "2404:6800::1", "127.0.0.1"].map(
          (ip) => getGeoFromIp(ip),
        ),
      );
      expect(results).toEqual([
        "测试国甲",
        "Fixtureland B",
        "n/a",
        "测试国丙",
        "n/a",
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("serves a repeated lookup from cache", async () => {
      const fetchMock = stubFetch();
      const { Reader } = await import("mmdb.js");
      const getSpy = vi.spyOn(Reader.prototype, "get");
      const { getGeoFromIp } = await load();
      expect(await getGeoFromIp("1.0.0.1")).toBe("测试国甲");
      expect(await getGeoFromIp("1.0.0.1")).toBe("测试国甲");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it("returns n/a on a failed download and retries on the next call", async () => {
      const fetchMock = stubFetch({ ok: false });
      const { getGeoFromIp } = await load();
      expect(await getGeoFromIp("1.0.0.1")).toBe("n/a");
      expect(await getGeoFromIp("1.0.0.1")).toBe("测试国甲");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("does not throw when fetch rejects", async () => {
      const fetchMock = vi.fn(async () => {
        throw new Error("offline");
      });
      vi.stubGlobal("fetch", fetchMock);
      const { getGeoFromIp } = await load();
      await expect(getGeoFromIp("1.0.0.1")).resolves.toBe("n/a");
    });
  });

  describe("custom mmdb url", () => {
    it("fetches the default url when none is given", async () => {
      const fetchMock = stubFetch();
      const { getGeoFromIp } = await load();
      await getGeoFromIp("1.0.0.1");
      expect(fetchMock).toHaveBeenCalledWith(DEFAULT_URL);
    });

    it("fetches the custom url instead of the default", async () => {
      const fetchMock = stubFetch();
      const { getGeoFromIp } = await load();
      expect(await getGeoFromIp("1.0.0.1", "https://example.test/a.mmdb")).toBe(
        "测试国甲",
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("https://example.test/a.mmdb");
    });

    it("keeps separate readers and results per url", async () => {
      const fetchMock = stubFetch(okResponse(), {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
      });
      const { getGeoFromIp } = await load();
      const urlA = "https://example.test/a.mmdb";
      const urlB = "https://example.test/b.mmdb";
      expect(await getGeoFromIp("1.0.0.1", urlA)).toBe("测试国甲");
      expect(await getGeoFromIp("1.0.0.1", urlB)).toBe("n/a");
      expect(await getGeoFromIp("1.0.0.1", urlA)).toBe("测试国甲");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("IP validation", () => {
    it.each([
      "999.7.7.7",
      "772404:6800:400a:804::200e99",
      "2404:6800:400a:804::200e99",
      "",
      "1.2.3",
      "abc",
      "::1]@x",
    ])("rejects malformed %j without fetching the database", async (ip) => {
      const fetchMock = stubFetch();
      const { getGeoFromIp } = await load();
      expect(await getGeoFromIp(ip)).toBe("n/a");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      "::1",
      "2404:6800::1",
      "::ffff:1.0.0.1",
      "0.0.0.0",
      "255.255.255.255",
    ])("accepts valid edge case %j and reaches the reader", async (ip) => {
      const fetchMock = stubFetch();
      const { getGeoFromIp } = await load();
      expect(typeof (await getGeoFromIp(ip))).toBe("string");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
