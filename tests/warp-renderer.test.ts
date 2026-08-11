import { describe, expect, it } from "vitest";
import {
  WARP_HEIGHT,
  WARP_WIDTH,
  renderWarpImage
} from "../src/warp-renderer.js";

describe("Warp image renderer", () => {
  it("creates a valid RGBA PNG at the expected resolution", () => {
    const image = renderWarpImage("WARP");
    expect([...image.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(image.toString("ascii", 12, 16)).toBe("IHDR");
    expect(image.readUInt32BE(16)).toBe(WARP_WIDTH);
    expect(image.readUInt32BE(20)).toBe(WARP_HEIGHT);
    expect(image.length).toBeLessThan(500_000);
  });

  it("randomizes repeated renders", () => {
    expect(renderWarpImage("WARP").equals(renderWarpImage("WARP"))).toBe(false);
  });
});
