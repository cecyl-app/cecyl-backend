import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
    testEnvironment: "node",
    transform: {
        "^.+\\.ts?$|@mohtasham/md-to-docx": [
            "ts-jest",
            {
                useESM: true,
            },
        ],
    },
    waitForUnhandledRejections: true,
    extensionsToTreatAsEsm: [".ts"],
    transformIgnorePatterns: [
        "node_modules/(?!(@mohtasham/md-to-docx)/)",
    ],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
};

export default config;