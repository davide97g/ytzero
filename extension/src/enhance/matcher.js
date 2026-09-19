// Exact physical-code chord matching. No DOM writes, no player access.
(function (global) {
  const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Meta"];
  const MODIFIER_CODES = /^(?:Control|Alt|Shift|Meta|OS)(?:Left|Right)?$/;
  const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable=\"false\"])";

  function chordFromEvent(event) {
    const parts = [];
    if (event.ctrlKey) parts.push("Ctrl");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");
    if (event.metaKey) parts.push("Meta");
    return [...MODIFIER_ORDER.filter((modifier) => parts.includes(modifier)), event.code].join("+");
  }

  function isModifierOnly(event) {
    return MODIFIER_CODES.test(event.code ?? "");
  }

  /** Typing must never be stolen, including inside the composed (shadow) path. */
  function isEditableTarget(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    return path.some((node) => {
      if (!node || node.nodeType !== 1 || typeof node.matches !== "function") return false;
      return node.matches(EDITABLE);
    });
  }

  /**
   * `Digit0-9` is the only family chord: it matches Digit0..Digit9 carrying the
   * same modifiers, and the digit selects the target tenth of the duration.
   */
  function matchesChord(chord, event) {
    if (!chord) return null;
    const eventChord = chordFromEvent(event);
    if (chord === eventChord) return { digit: null };
    const family = chord.replace(/Digit0-9$/, "");
    if (family === chord) return null;
    const digit = /^Digit([0-9])$/.exec(event.code);
    if (!digit || `${family}${event.code}` !== eventChord) return null;
    return { digit: Number(digit[1]) };
  }

  /**
   * @returns {{action: string, digit: number|null}|null} the first enabled
   *          binding that matches, or null.
   */
  function matchAction(bindings, event) {
    if (isModifierOnly(event) || isEditableTarget(event)) return null;
    for (const [action, chord] of Object.entries(bindings ?? {})) {
      const match = matchesChord(chord, event);
      if (match) return { action, digit: match.digit };
    }
    return null;
  }

  global.YTZEnhance = {
    ...(global.YTZEnhance ?? {}),
    matcher: { chordFromEvent, isModifierOnly, isEditableTarget, matchesChord, matchAction },
  };
})(globalThis);
