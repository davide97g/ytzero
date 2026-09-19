// Minimal DOM/extension stand-ins so the content scripts can be exercised
// without a browser. Only the surface the scripts actually touch is modelled.
import { readFileSync } from "node:fs";

class FakeElement {
  constructor(id) {
    this.id = id;
    this.textContent = "";
    this.attributes = {};
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
}

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  removeEventListener(type, handler) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== handler));
  }

  dispatchEvent(event) {
    event.target ??= this;
    for (const handler of [...(this.listeners.get(event.type) ?? [])]) handler(event);
    return !event.defaultPrevented;
  }
}

export function createHarness({ pathname = "/watch/dQw4w9WgXcQ" } = {}) {
  const document = new FakeEventTarget();
  const elements = new Map();
  const sent = [];
  const relayListeners = [];

  document.documentElement = {
    appendChild(node) {
      if (node?.id) elements.set(node.id, node);
      return node;
    },
    requestFullscreen: () => Promise.resolve(),
  };
  document.getElementById = (id) => elements.get(id) ?? null;
  document.querySelector = (selector) => harness.selectors[selector] ?? null;
  document.createElement = (tag) => {
    const element = new FakeElement("");
    element.tagName = tag.toUpperCase();
    element.click = () => {};
    element.remove = () => {};
    return element;
  };
  document.fullscreenElement = null;
  document.pictureInPictureElement = null;
  document.exitFullscreen = () => Promise.resolve();
  document.exitPictureInPicture = () => Promise.resolve();

  const harness = {
    document,
    sent,
    selectors: {},
    element(id) {
      if (!elements.has(id)) elements.set(id, new FakeElement(id));
      return elements.get(id);
    },
    configure(json) {
      harness.element("ytzero-enhance-configuration").textContent = json;
    },
    /** Delivers a relay envelope as the background worker would. */
    deliver(message) {
      for (const listener of relayListeners) listener(message, {}, () => {});
    },
    dispatch(type, detail, { cancelable = false } = {}) {
      const event = {
        type,
        detail: JSON.stringify(detail),
        cancelable,
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
      };
      document.dispatchEvent(event);
      return event;
    },
    relayed(to) {
      return sent.filter((message) => message.type === "ytzero:enhance:relay" && message.to === to).map((message) => message.payload);
    },
    events() {
      return sent.filter((message) => message.type !== "ytzero:enhance:relay");
    },
  };

  globalThis.window = { top: undefined };
  globalThis.window.top = globalThis.window;
  globalThis.document = document;
  globalThis.location = { pathname, href: `https://ytzero.example.com${pathname}` };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
      this.cancelable = Boolean(options.cancelable);
      this.defaultPrevented = false;
    }

    preventDefault() {
      this.defaultPrevented = true;
    }
  };
  const observers = [];
  harness.mutate = () => {
    for (const callback of [...observers]) callback([]);
  };
  globalThis.MutationObserver = class MutationObserver {
    constructor(callback) {
      this.callback = callback;
      observers.push(callback);
    }

    observe() {}

    disconnect() {
      observers.splice(observers.indexOf(this.callback), 1);
    }
  };
  globalThis.chrome = {
    runtime: {
      sendMessage: (message) => sent.push(message),
      onMessage: { addListener: (listener) => relayListeners.push(listener) },
    },
  };

  return harness;
}

/** Re-executes a content script so each test starts from clean module state. */
export function loadScript(path) {
  // eslint-disable-next-line no-new-func -- the scripts are plain globals-based files.
  new Function(readFileSync(new URL(path, import.meta.url), "utf8"))();
}

export function resetEnhance() {
  delete globalThis.YTZEnhance;
}
