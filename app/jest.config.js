const nextJest = require("next/jest.js");

const createJestConfig = nextJest({
    dir: "./",
});

/** @type {import('jest').Config} */
const config = {
    coverageProvider: "v8",
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    testMatch: [
        "<rootDir>/src/**/__tests__/**/*.{ts,tsx}",
        "<rootDir>/src/**/*.test.{ts,tsx}",
    ],
    transformIgnorePatterns: [
        "/node_modules/(?!(@solana|bs58|tweetnacl|superstruct)/)",
    ],
};

module.exports = createJestConfig(config);
