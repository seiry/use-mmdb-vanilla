import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchFileAsBuffer } from "./utils";

describe("fetchFileAsBuffer", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns a Buffer when the response is ok", async () => {
    const ab = new TextEncoder().encode("hello").buffer;

    globalThis.fetch = vi.fn(async () =>
      (
        {
          ok: true,
          arrayBuffer: async () => ab,
        } as unknown as Response
      )
    ) as unknown as typeof fetch;

    const buf = await fetchFileAsBuffer("https://example.com/file");
    expect(buf).toBeDefined();

    // In a DOM-like environment, Buffer may be polyfilled; assert on behavior.
    expect(typeof (buf as any).toString).toBe("function");
    expect((buf as any).toString("utf8")).toBe("hello");
    expect((buf as any).byteLength).toBe(5);
  });

  it("returns undefined when response is not ok", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false } as Response)) as unknown as typeof fetch;

    const buf = await fetchFileAsBuffer("https://example.com/file");
    expect(buf).toBeUndefined();
  });
});
