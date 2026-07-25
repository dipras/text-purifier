import {
    createBadWordFilter,
    type FilterBadWordResult,
} from "./index";

const cleanResult = (result: string): FilterBadWordResult => ({
    status: false,
    detected: false,
    result,
    matches: [],
});

describe("createBadWordFilter", () => {
    test("detects a default banned word without changing the legacy result", () => {
        const result = createBadWordFilter().filterText("Hello anjing");

        expect(result).toEqual({
            status: false,
            detected: true,
            result: "Ban word detected!",
            matches: [
                {
                    word: "anjing",
                    normalized: "anjing",
                    start: 6,
                    end: 12,
                },
            ],
        });
    });

    test("censors a default banned word", () => {
        const result = createBadWordFilter().filterText("Hello anjing", true);

        expect(result).toEqual({
            status: true,
            detected: true,
            result: "Hello ******",
            matches: [
                {
                    word: "anjing",
                    normalized: "anjing",
                    start: 6,
                    end: 12,
                },
            ],
        });
    });

    test("returns the original clean text", () => {
        expect(createBadWordFilter().filterText("Hello world")).toEqual(
            cleanResult("Hello world")
        );
    });

    test("uses exact-word matching by default to avoid false positives", () => {
        const filter = createBadWordFilter({
            banWords: ["ass", "tai"],
        });

        expect(filter.filterText("A classic detail", true)).toEqual(
            cleanResult("A classic detail")
        );
        expect(filter.filterText("ass tai", true).result).toBe("*** ***");
    });

    test("supports substring matching when explicitly requested", () => {
        const filter = createBadWordFilter({
            banWords: ["ass"],
            matchMode: "substring",
        });

        expect(filter.filterText("classic", true)).toMatchObject({
            detected: true,
            result: "*******",
        });
    });

    test("detects aliases and internal separators", () => {
        const filter = createBadWordFilter({
            banWords: ["bad", "shit"],
            characterMap: {
                "@": "a",
                "$": "s",
            },
        });

        expect(filter.filterText("b@d b-a-d $hit", true).result).toBe(
            "*** *** ****"
        );
    });

    test("preserves surrounding punctuation instead of mapping it as an alias", () => {
        const filter = createBadWordFilter({
            banWords: ["bad"],
            characterMap: { "!": "i" },
        });

        expect(filter.filterText("BAD!!!", true).result).toBe("***!!!");
    });

    test("preserves spaces, tabs, and newlines", () => {
        const filter = createBadWordFilter({ banWords: ["bad"] });
        const input = "one  bad\nbad\tthree";

        expect(filter.filterText(input, true).result).toBe(
            "one  ***\n***\tthree"
        );
    });

    test("reports offsets against the original text", () => {
        const filter = createBadWordFilter({ banWords: ["bad"] });
        const result = filter.filterText("Hi, (b-a-d)!", true);

        expect(result.result).toBe("Hi, (***)!");
        expect(result.matches).toEqual([
            {
                word: "b-a-d",
                normalized: "bad",
                start: 5,
                end: 10,
            },
        ]);
    });

    test("respects initial and dynamically added whitelist words", () => {
        const filter = createBadWordFilter({
            banWords: ["ass"],
            whitelist: ["ass"],
        });

        expect(filter.filterText("ass", true)).toEqual(cleanResult("ass"));

        const dynamicFilter = createBadWordFilter({
            banWords: ["classic"],
        });
        dynamicFilter.addWhitelistWords(["classic"]);

        expect(dynamicFilter.filterText("classic", true)).toEqual(
            cleanResult("classic")
        );
    });

    test("supports dynamic banned words and character mappings", () => {
        const filter = createBadWordFilter({ banWords: [] });

        filter.addBanWords(["newbad"]);
        filter.addCharacterMap({ "3": "E" });

        expect(filter.filterText("n3wbad", true).result).toBe("******");
    });

    test("does not mutate configuration supplied by the caller", () => {
        const banWords = ["bad"];
        const whitelist: string[] = [];
        const characterMap = { "@": "a" };
        const filter = createBadWordFilter({
            banWords,
            whitelist,
            characterMap,
        });

        filter.addBanWords(["evil"]);
        filter.addWhitelistWords(["bad"]);
        filter.addCharacterMap({ "3": "e" });

        expect(banWords).toEqual(["bad"]);
        expect(whitelist).toEqual([]);
        expect(characterMap).toEqual({ "@": "a" });
    });

    test("normalizes case and accents in custom lists", () => {
        const filter = createBadWordFilter({ banWords: ["BÁD"] });

        expect(filter.filterText("bad BÁD", true).result).toBe("*** ***");
    });

    test("supports a custom censor character", () => {
        const filter = createBadWordFilter({
            banWords: ["bad"],
            censorCharacter: "•",
        });

        expect(filter.filterText("bad", true).result).toBe("•••");
    });

    test("rejects an invalid censor character", () => {
        expect(() =>
            createBadWordFilter({
                censorCharacter: "**",
            })
        ).toThrow("censorCharacter must contain exactly one character");
    });

    test.each(["", "   ", "Hello! @#$%^&*()"])(
        "handles clean edge case %j",
        (input) => {
            expect(createBadWordFilter().filterText(input)).toEqual(
                cleanResult(input)
            );
        }
    );
});
