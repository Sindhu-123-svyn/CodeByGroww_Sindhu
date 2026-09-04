import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Auto-cleanup normally relies on a global afterEach (Jest-style globals);
// since vite.config.ts's test.globals is left off (explicit `vitest`
// imports are clearer), it's wired up manually here instead.
afterEach(() => {
  cleanup();
});
