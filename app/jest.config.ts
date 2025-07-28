import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
    testEnvironment: "node",
    transform: {
        "^.+\\.ts?$": [
            "ts-jest",
            {
                useESM: true,
            },
        ],
    },
    waitForUnhandledRejections: true,
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
};

export default config;