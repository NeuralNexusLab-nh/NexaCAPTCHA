import { describe, expect, it } from "vitest";
import {
  GRAVITY_HEIGHT,
  GRAVITY_WIDTH,
  renderGravityImage
} from "../src/gravity-renderer.js";

describe("Gravity image renderer", () => {
  it("creates a valid RGBA PNG at the expected resolution", () => {
    const image = renderGravityImage("GRAV");
    expect([...image.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(image.toString("ascii", 12, 16)).toBe("IHDR");
    expect(image.readUInt32BE(16)).toBe(GRAVITY_WIDTH);
    expect(image.readUInt32BE(20)).toBe(GRAVITY_HEIGHT);
    expect(image.length).toBeLessThan(500_000);
  });

  it("randomizes repeated renders", () => {
    expect(renderGravityImage("GRAV").equals(renderGravityImage("GRAV"))).toBe(false);
  });
});
