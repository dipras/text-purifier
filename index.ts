import defaultConfig from "./config.json";
import englishBanWords from "./ban-words/en.json";
import indonesianBanWords from "./ban-words/id.json";

export type MatchMode = "exact" | "substring";

export const supportedLanguages = ["en", "id"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export type FilterConfig = {
    banWords: string[];
    languages: SupportedLanguage[];
    characterMap: Record<string, string>;
    whitelist: string[];
    matchMode: MatchMode;
    censorCharacter: string;
};

export type FilterMatch = {
    word: string;
    normalized: string;
    start: number;
    end: number;
};

export type FilterBadWordResult = {
    /**
     * @deprecated Use `detected` instead. This field preserves the v1 behavior:
     * it is true only when censoring was requested and text was censored.
     */
    status: boolean;
    detected: boolean;
    result: string;
    matches: FilterMatch[];
};

export interface BadWordFilter {
    filterText: (str: string, censor?: boolean) => FilterBadWordResult;
    addBanWords: (words: string[]) => void;
    addCharacterMap: (mappings: Record<string, string>) => void;
    addWhitelistWords: (words: string[]) => void;
}

type NormalizedToken = {
    value: string;
    contentStart: number;
    contentEnd: number;
};

const combiningMarks = /[\u0300-\u036f]/g;
const lettersAndNumbers = /[\p{L}\p{N}]/u;
const nonWhitespaceToken = /\S+/gu;

const banWordsByLanguage: Record<SupportedLanguage, string[]> = {
    en: englishBanWords,
    id: indonesianBanWords,
};

const normalizeCharacters = (value: string): string =>
    value.toLowerCase().normalize("NFD").replace(combiningMarks, "");

const normalizeCharacterMap = (
    mappings: Record<string, string>
): Record<string, string> =>
    Object.entries(mappings).reduce<Record<string, string>>(
        (normalized, [character, replacement]) => {
            normalized[normalizeCharacters(character)] =
                normalizeCharacters(replacement);
            return normalized;
        },
        {}
    );

const normalizeDictionaryWord = (
    value: string,
    characterMap: Record<string, string>
): string => {
    const normalized = normalizeCharacters(value);

    return Array.from(normalized, (character) => {
        return characterMap[character] ?? character;
    })
        .join("")
        .replace(/[^\p{L}\p{N}]/gu, "");
};

/**
 * Produce two candidates for a token:
 * - punctuation at the edges is ignored, so `bad!!!` normalizes to `bad`
 * - all aliases are mapped, so `$hit` can normalize to `shit`
 *
 * Internal separators are removed in both candidates, allowing forms such as
 * `b-a-d` while offsets continue to point at the original text.
 */
const normalizeToken = (
    token: string,
    characterMap: Record<string, string>
): NormalizedToken[] => {
    const characters = Array.from(token);
    const normalizedCharacters = characters.map(normalizeCharacters);
    const isLetterOrNumber = normalizedCharacters.map((character) =>
        lettersAndNumbers.test(character)
    );

    const firstContent = isLetterOrNumber.indexOf(true);
    const lastContent = isLetterOrNumber.lastIndexOf(true);

    if (firstContent === -1) {
        return [];
    }

    const buildCandidate = (mapEdgeAliases: boolean): NormalizedToken => {
        let value = "";

        normalizedCharacters.forEach((character, index) => {
            const isEdge = index < firstContent || index > lastContent;
            if (isEdge && !mapEdgeAliases) {
                return;
            }

            const mapped = characterMap[character] ?? character;
            value += mapped.replace(/[^\p{L}\p{N}]/gu, "");
        });

        return {
            value,
            contentStart: mapEdgeAliases ? 0 : firstContent,
            contentEnd: mapEdgeAliases ? characters.length : lastContent + 1,
        };
    };

    const candidates = [buildCandidate(false), buildCandidate(true)];

    return candidates.filter(
        (candidate, index) =>
            candidate.value.length > 0 &&
            candidates.findIndex((item) => item.value === candidate.value) === index
    );
};

const matchesBannedWord = (
    candidate: string,
    banWords: string[],
    matchMode: MatchMode
): boolean => {
    if (matchMode === "substring") {
        return banWords.some((badWord) => candidate.includes(badWord));
    }

    return banWords.includes(candidate);
};

/**
 * Create an isolated bad-word filter instance.
 */
export const createBadWordFilter = (
    customConfig?: Partial<FilterConfig>
): BadWordFilter => {
    const languages = customConfig?.languages ?? [...supportedLanguages];
    const languageBanWords = languages.flatMap(
        (language) => banWordsByLanguage[language]
    );
    const characterMap = normalizeCharacterMap(
        customConfig?.characterMap ?? defaultConfig.characterMap
    );

    const config: FilterConfig = {
        banWords: [...(customConfig?.banWords ?? languageBanWords)],
        languages: [...languages],
        characterMap,
        whitelist: [...(customConfig?.whitelist ?? [])],
        matchMode: customConfig?.matchMode ?? "exact",
        censorCharacter: customConfig?.censorCharacter ?? "*",
    };

    if (Array.from(config.censorCharacter).length !== 1) {
        throw new TypeError("censorCharacter must contain exactly one character");
    }

    const normalizeWordList = (words: string[]): string[] =>
        Array.from(
            new Set(
                words
                    .map((word) =>
                        normalizeDictionaryWord(word, config.characterMap)
                    )
                    .filter(Boolean)
            )
        );

    let normalizedBanWords = normalizeWordList(config.banWords);
    let normalizedWhitelist = normalizeWordList(config.whitelist);

    const filterText = (
        str: string,
        censor = false
    ): FilterBadWordResult => {
        const matches: FilterMatch[] = [];
        let censoredResult = "";
        let previousEnd = 0;

        for (const tokenMatch of str.matchAll(nonWhitespaceToken)) {
            const token = tokenMatch[0];
            const tokenStart = tokenMatch.index;
            const candidates = normalizeToken(token, config.characterMap);
            const candidate = candidates.find(
                ({ value }) =>
                    !normalizedWhitelist.includes(value) &&
                    matchesBannedWord(
                        value,
                        normalizedBanWords,
                        config.matchMode
                    )
            );

            if (!candidate) {
                continue;
            }

            const prefixLength = Array.from(token)
                .slice(0, candidate.contentStart)
                .join("").length;
            const contentLength = Array.from(token)
                .slice(candidate.contentStart, candidate.contentEnd)
                .join("").length;
            const start = tokenStart + prefixLength;
            const end = start + contentLength;

            matches.push({
                word: str.slice(start, end),
                normalized: candidate.value,
                start,
                end,
            });

            if (censor) {
                censoredResult += str.slice(previousEnd, start);
                censoredResult += config.censorCharacter.repeat(
                    Array.from(candidate.value).length
                );
                previousEnd = end;
            }
        }

        const detected = matches.length > 0;

        if (!censor && detected) {
            return {
                status: false,
                detected,
                result: "Ban word detected!",
                matches,
            };
        }

        if (censor && detected) {
            censoredResult += str.slice(previousEnd);
        }

        return {
            status: censor && detected,
            detected,
            result: censor && detected ? censoredResult : str,
            matches,
        };
    };

    const addBanWords = (words: string[]): void => {
        config.banWords.push(...words);
        normalizedBanWords = normalizeWordList(config.banWords);
    };

    const addCharacterMap = (mappings: Record<string, string>): void => {
        Object.assign(config.characterMap, normalizeCharacterMap(mappings));
        normalizedBanWords = normalizeWordList(config.banWords);
        normalizedWhitelist = normalizeWordList(config.whitelist);
    };

    const addWhitelistWords = (words: string[]): void => {
        config.whitelist.push(...words);
        normalizedWhitelist = normalizeWordList(config.whitelist);
    };

    return {
        filterText,
        addBanWords,
        addCharacterMap,
        addWhitelistWords,
    };
};
