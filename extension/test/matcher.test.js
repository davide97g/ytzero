import { describe, expect, test } from "bun:test";
import "../src/enhance/contract.js";
import "../src/enhance/matcher.js";

const { matcher } = globalThis.YTZEnhance;

function keyEvent(code, modifiers = {}, target = null) {
  return {
    code,
    key: code,
    repeat: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...modifiers,
    composedPath: () => (target ? [target] : []),
  };
}

function element(selector) {
  return { nodeType: 1, matches: (query) => query.split(", ").some((part) => part === selector) };
}

describe("matchAction", () => {
  const bindings = { togglePlay: "KeyK", speedDown: "Shift+Comma", seekPercent: "Digit0-9", toggleMute: null };

  test("matches an exact chord", () => {
    expect(matcher.matchAction(bindings, keyEvent("KeyK"))).toEqual({ action: "togglePlay", digit: null });
  });

  test("an unlisted modifier prevents a match", () => {
    expect(matcher.matchAction(bindings, keyEvent("KeyK", { ctrlKey: true }))).toBeNull();
  });

  test("Shift+Comma does not also match Comma", () => {
    expect(matcher.matchAction(bindings, keyEvent("Comma"))).toBeNull();
    expect(matcher.matchAction(bindings, keyEvent("Comma", { shiftKey: true }))).toEqual({ action: "speedDown", digit: null });
  });

  test("expands Digit0-9 and carries the digit", () => {
    expect(matcher.matchAction(bindings, keyEvent("Digit7"))).toEqual({ action: "seekPercent", digit: 7 });
    expect(matcher.matchAction(bindings, keyEvent("Digit7", { shiftKey: true }))).toBeNull();
  });

  test("a null binding never matches", () => {
    expect(matcher.matchAction(bindings, keyEvent("KeyM"))).toBeNull();
  });

  test("ignores modifier-only keydowns", () => {
    expect(matcher.matchAction({ togglePlay: "ShiftLeft" }, keyEvent("ShiftLeft", { shiftKey: true }))).toBeNull();
  });

  test("ignores editable targets anywhere in the composed path", () => {
    for (const selector of ["input", "textarea", "select", "[contenteditable]:not([contenteditable=\"false\"])"]) {
      expect(matcher.matchAction(bindings, keyEvent("KeyK", {}, element(selector)))).toBeNull();
    }
  });
});

describe("chordFromEvent", () => {
  test("orders modifiers Ctrl, Alt, Shift, Meta", () => {
    expect(matcher.chordFromEvent(keyEvent("KeyK", { metaKey: true, shiftKey: true, ctrlKey: true, altKey: true })))
      .toBe("Ctrl+Alt+Shift+Meta+KeyK");
  });
});
