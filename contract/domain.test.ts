import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DRINK_TYPES } from "./domain.js";

describe("DRINK_TYPES", () => {
  it("matches the CHECK list on drinks.type in the initial migration", () => {
    const sql = readFileSync(
      new URL("../supabase/migrations/0001_init.sql", import.meta.url),
      "utf8",
    );
    const match = /type text not null check \(type in \(([^)]*)\)\)/.exec(sql);
    expect(match).not.toBeNull();
    const sqlTypes = match![1]!
      .split(",")
      .map((v) => v.trim().replace(/'/g, ""));
    expect(sqlTypes).toEqual([...DRINK_TYPES]);
  });
});
