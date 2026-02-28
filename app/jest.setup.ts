import "@testing-library/jest-dom";

// Polyfill TextEncoder/TextDecoder for jsdom (needed by jwt.ts tests)
import { TextEncoder, TextDecoder } from "util";
if (typeof globalThis.TextEncoder === "undefined") {
    (globalThis as any).TextEncoder = TextEncoder;
    (globalThis as any).TextDecoder = TextDecoder;
}
