import { describe, expect, it } from "vitest";
import { sizeMatchesFilter } from "../catalog/catalog-utils.js";

describe("sizeMatchesFilter", () => {
  it("ne confond pas S et XS", () => {
    expect(sizeMatchesFilter("XS", "S")).toBe(false);
  });

  it("fait correspondre une taille combinée", () => {
    expect(sizeMatchesFilter("S/M", "S")).toBe(true);
    expect(sizeMatchesFilter("S/M", "M")).toBe(true);
    expect(sizeMatchesFilter("S/M", "L")).toBe(false);
  });
});
