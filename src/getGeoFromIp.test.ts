import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock mmdb.js Reader
vi.mock("mmdb.js", () => {
  class Reader {
    private db: any;
    constructor(db: any) {
      this.db = db;
    }
    get(ip: string) {
      return this.db?.[ip];
    }
  }

  return { Reader };
});

// Mock fetchFileAsBuffer to avoid network
vi.mock("./utils", () => ({
  fetchFileAsBuffer: vi.fn(async () => Buffer.from("fake-mmdb")),
}));

describe("getGeoFromIp", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns zh-CN name if present", async () => {
    const mod = await import("./getGeoFromIp");

    // Patch the mocked Reader to return a result for this IP
    const { Reader } = await import("mmdb.js");
    (Reader as any).prototype.get = vi.fn(() => ({
      country: { names: { "zh-CN": "中国", en: "China" } },
    }));

    const geo = await mod.getGeoFromIp("8.8.8.8");
    expect(geo).toBe("中国");
  });

  it("falls back to en name", async () => {
    const mod = await import("./getGeoFromIp");

    const { Reader } = await import("mmdb.js");
    (Reader as any).prototype.get = vi.fn(() => ({
      country: { names: { en: "Japan" } },
    }));

    const geo = await mod.getGeoFromIp("1.1.1.1");
    expect(geo).toBe("Japan");
  });

  it("caches by ip (Reader.get called once)", async () => {
    const mod = await import("./getGeoFromIp");

    const { Reader } = await import("mmdb.js");
    const getSpy = vi.fn(() => ({
      country: { names: { en: "US" } },
    }));
    (Reader as any).prototype.get = getSpy;

    const ip = "9.9.9.9";
    const a = await mod.getGeoFromIp(ip);
    const b = await mod.getGeoFromIp(ip);

    expect(a).toBe("US");
    expect(b).toBe("US");
    expect(getSpy).toHaveBeenCalledTimes(1);
  });
});
