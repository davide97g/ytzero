import { describe, expect, test } from "bun:test";
import { glowCanvasSize } from "./playerGlow";

describe("glowCanvasSize", () => {
  test("keeps a landscape video's aspect ratio on the long edge", () => {
    expect(glowCanvasSize(1920, 1080)).toEqual({ width: 64, height: 36 });
  });

  test("puts the long edge vertically for portrait video", () => {
    expect(glowCanvasSize(1080, 1920)).toEqual({ width: 36, height: 64 });
  });

  test("never collapses an extreme aspect ratio to zero", () => {
    expect(glowCanvasSize(10_000, 10)).toEqual({ width: 64, height: 1 });
  });

  test("waits for the video to report its dimensions", () => {
    expect(glowCanvasSize(0, 0)).toBeNull();
    expect(glowCanvasSize(Number.NaN, 1080)).toBeNull();
  });
});
