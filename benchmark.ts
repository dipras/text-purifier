import { performance } from "node:perf_hooks";
import { Filter as BadWordsFilter } from "bad-words";
import { createTextPurifier } from "./index";

const sizes = [100, 1_000, 10_000] as const;
const iterationsBySize: Record<(typeof sizes)[number], number> = {
    100: 2_000,
    1_000: 200,
    10_000: 20,
};

const createInput = (wordCount: number): string =>
    Array.from({ length: wordCount }, (_, index) =>
        index % 20 === 0 ? "bad" : "clean"
    ).join(" ");

const measure = (
    operation: () => string,
    iterations: number
): { milliseconds: number; operationsPerSecond: number } => {
    for (let index = 0; index < 20; index += 1) {
        operation();
    }

    let checksum = 0;
    const samples: number[] = [];

    for (let sample = 0; sample < 5; sample += 1) {
        const start = performance.now();

        for (let index = 0; index < iterations; index += 1) {
            checksum += operation().length;
        }

        samples.push(performance.now() - start);
    }

    samples.sort((left, right) => left - right);
    const milliseconds = samples[Math.floor(samples.length / 2)];

    if (checksum === 0) {
        throw new Error("Benchmark operation returned an empty result");
    }

    return {
        milliseconds,
        operationsPerSecond: (iterations / milliseconds) * 1_000,
    };
};

const formatNumber = (value: number): string =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);

const purifier = createTextPurifier({ banWords: ["bad"] });
const badWords = new BadWordsFilter({ emptyList: true });
badWords.addWords("bad");

console.log(`Runtime: Bun ${Bun.version}`);
console.log(
    "Workload: censor text with the same one-word dictionary (median of 5)"
);
console.log("");
console.log(
    "Words".padStart(8),
    "Library".padEnd(16),
    "ops/sec".padStart(12),
    "total ms".padStart(12)
);

for (const size of sizes) {
    const input = createInput(size);
    const iterations = iterationsBySize[size];
    const purifiedText = purifier.censor(input).censoredText;
    const badWordsText = badWords.clean(input);

    if (purifiedText !== badWordsText) {
        throw new Error(`Benchmark outputs differ for ${size} words`);
    }

    const cases = [
        {
            name: "text-purifier",
            operation: () => purifier.censor(input).censoredText,
        },
        {
            name: "bad-words",
            operation: () => badWords.clean(input),
        },
    ];

    for (const benchmarkCase of cases) {
        const result = measure(benchmarkCase.operation, iterations);

        console.log(
            formatNumber(size).padStart(8),
            benchmarkCase.name.padEnd(16),
            formatNumber(result.operationsPerSecond).padStart(12),
            formatNumber(result.milliseconds).padStart(12)
        );
    }
}
