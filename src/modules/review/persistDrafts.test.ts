import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: async (k: string) => store.get(k),
  set: async (k: string, v: unknown) => void store.set(k, v),
  del: async (k: string) => void store.delete(k),
  keys: async () => [...store.keys()],
}));

const { persistDrafts } = await import("./drafts.js");

const meta = {
  name: "Barolo",
  type: "red" as const,
  subtype: { subtypeId: null, newName: null },
};
const empty = { scores: {}, note: "" };

beforeEach(() => store.clear());

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
});
