import { describe, expect, test } from "bun:test";
import {
  environmentAuthMethod,
  environmentAuthPasswordConfigured,
  verifyEnvironmentAuthPassword,
} from "./authEnvironment";

describe("environment authentication policy", () => {
  test("forces only the supported shared-password method", () => {
    expect(environmentAuthMethod({ YTZERO_AUTH_METHOD: "shared" })).toBe("shared");
    expect(environmentAuthMethod({})).toBeNull();
    expect(environmentAuthMethod({ YTZERO_AUTH_METHOD: "none" })).toBeNull();
  });

  test("requires a non-empty environment password and verifies it with a password hash", async () => {
    const environment = { YTZERO_AUTH_PASSWORD: "correct horse battery staple" };
    expect(environmentAuthPasswordConfigured(environment)).toBe(true);
    expect(await verifyEnvironmentAuthPassword("correct horse battery staple", environment)).toBe(true);
    expect(await verifyEnvironmentAuthPassword("Correct horse battery staple", environment)).toBe(false);
    expect(environmentAuthPasswordConfigured({ YTZERO_AUTH_PASSWORD: "" })).toBe(false);
    expect(await verifyEnvironmentAuthPassword("", { YTZERO_AUTH_PASSWORD: "" })).toBe(false);
  });

  // Bun loads a developer's .env into every test process, and the harnesses
  // inherit it. An instance configured for shared auth there would answer 401
  // to every harness request; .env.test blanks those keys for the test run.
  test("ignores the instance configuration a developer keeps in .env", () => {
    expect(environmentAuthMethod()).toBeNull();
    expect(environmentAuthPasswordConfigured()).toBe(false);
  });
});
