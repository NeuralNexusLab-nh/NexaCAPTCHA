import { describe, expect, it } from "vitest";
import {
  ALGEBRA_HEIGHT,
  ALGEBRA_WIDTH,
  generateAlgebraProblem,
  renderAlgebraImage
} from "../src/algebra-renderer.js";

describe("Algebra renderer", () => {
  it("keeps both integer answers in the configured range", () => {
    for (let sample = 0; sample < 1_000; sample += 1) {
      const problem = generateAlgebraProblem();
      expect(problem.answerX).toBeGreaterThanOrEqual(-50);
      expect(problem.answerX).toBeLessThanOrEqual(50);
      expect(problem.answerY).toBeGreaterThanOrEqual(-50);
      expect(problem.answerY).toBeLessThanOrEqual(50);
      expect(problem.equations).toHaveLength(2);
      expect(problem.equations.every((equation) => equation.includes("x") && equation.includes("y")))
        .toBe(true);
    }
  });

  it("renders a PNG with the configured dimensions", () => {
    const image = renderAlgebraImage({
      answerX: -12,
      answerY: 34,
      equations: [
        "-3(2x-5y+7)+4(-6x+3y-2)=5(4x+7y-9)-552",
        "4(-2x+3y-6)-2(7x-4y+5)=-5(3x+2y-8)+428"
      ]
    });
    expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(image.readUInt32BE(16)).toBe(ALGEBRA_WIDTH);
    expect(image.readUInt32BE(20)).toBe(ALGEBRA_HEIGHT);
  });
});
