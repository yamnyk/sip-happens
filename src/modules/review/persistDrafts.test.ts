import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();
let setDelay = 0;
vi.mock("idb-keyval", () => ({
  get: async (k: string) => store.get(k),
  set: async (k: string, v: unknown) => {
    if (setDelay) await new Promise((r) => setTimeout(r, setDelay));
    store.set(k, v);
  },
  del: async (k: string) => void store.delete(k),
  keys: async () => [...store.keys()],
}));

const { clearDrafts, persistDrafts, whenDraftWritesSettled } =
  await import("./drafts.js");

const meta = {
  name: "Barolo",
  type: "red" as const,
  subtype: { subtypeId: null, newName: null },
};
const empty = { scores: {}, note: "" };

beforeEach(() => {
  store.clear();
  setDelay = 0;
});

describe("persistDrafts", () => {
  it("writes stages and meta when there is input", async () => {
    await persistDrafts(
      "u",
      "c",
      { first: { scores: { aroma: 3 }, note: "" }, final: empty },
      meta,
    );
    expect(store.has("draft:u:c:first")).toBe(true);
    expect(store.has("draft:u:c:meta")).toBe(true);
  });

  it("clears everything when no stage has input", async () => {
    store.set("draft:u:c:meta", {});
    await persistDrafts("u", "c", { first: empty, final: empty }, meta);
    expect(store.has("draft:u:c:meta")).toBe(false);
    expect(store.has("draft:u:c:first")).toBe(false);
  });

  it("a clear queued behind a slow in-flight persist wins (no ghost draft)", async () => {
    setDelay = 20;
    const input = { first: { scores: { aroma: 3 }, note: "" }, final: empty };
    const p = persistDrafts("u", "c", input, meta);
    const c = clearDrafts("u", "c");
    await Promise.all([p, c]);
    expect([...store.keys()]).toEqual([]);
  });

  it("whenDraftWritesSettled waits for queued writes", async () => {
    setDelay = 20;
    void persistDrafts(
      "u",
      "c",
      { first: { scores: { aroma: 3 }, note: "" }, final: empty },
      meta,
    );
    expect(store.has("draft:u:c:first")).toBe(false);
    await whenDraftWritesSettled();
    expect(store.has("draft:u:c:first")).toBe(true);
    expect(store.has("draft:u:c:meta")).toBe(true);
  });
});
