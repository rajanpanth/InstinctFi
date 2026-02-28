/**
 * Unit tests for apiClient.ts — error classification.
 */
import { classifyNetworkError } from "../apiClient";

describe("classifyNetworkError", () => {
    it("classifies 'Failed to fetch' as network_offline", () => {
        const err = new TypeError("Failed to fetch");
        expect(classifyNetworkError(err)).toBe("network_offline");
    });

    it("classifies 'NetworkError' as network_offline", () => {
        const err = new TypeError("NetworkError when attempting to fetch");
        expect(classifyNetworkError(err)).toBe("network_offline");
    });

    it("classifies CORS errors as network_cors_error", () => {
        const err = new TypeError("CORS error");
        expect(classifyNetworkError(err)).toBe("network_cors_error");
    });

    it("classifies cross-origin errors as network_cors_error", () => {
        const err = new TypeError("cross-origin request blocked");
        expect(classifyNetworkError(err)).toBe("network_cors_error");
    });

    it("classifies unknown errors as network_unknown", () => {
        const err = new Error("something else");
        expect(classifyNetworkError(err)).toBe("network_unknown");
    });

    it("classifies non-Error objects as network_unknown", () => {
        expect(classifyNetworkError("string error")).toBe("network_unknown");
    });
});
