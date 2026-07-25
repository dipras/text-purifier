import defaultConfig from "./config.json";
import englishBanWords from "./ban-words/en.json";
import indonesianBanWords from "./ban-words/id.json";

export type MatchMode = "exact" | "substring";

export const supportedLanguages = ["en", "id"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export type TextPurifierConfig = {
    banWords: string[];
    languages: SupportedLanguage[];
    excludeLanguages: SupportedLanguage[];
    characterMap: Record<string, string>;
    whitelist: string[];
    matchMode: MatchMode;
    censorCharacter: string;
};

/**
 * @deprecated Use `TextPurifierConfig` instead.
 */
export type FilterConfig = TextPurifierConfig;

export type TextPurifierMatch = {
    word: string;
    normalized: string;
    start: number;
    end: number;
};

/**
 * @deprecated Use `TextPurifierMatch` instead.
 */
export type FilterMatch = TextPurifierMatch;

export type DetectionResult = {
    detected: boolean;
    matches: TextPurifierMatch[];
};

export type CensorResult = DetectionResult & {
    censoredText: string;
};

/**
 * @deprecated Use `DetectionResult` or `CensorResult` instead.
 */
export type FilterBadWordResult = {
    /**
     * @deprecated Use `detected` instead. This field preserves the v1 behavior:
     * it is true only when censoring was requested and text was censored.
     */
    status: boolean;
    detected: boolean;
    result: string;
    matches: TextPurifierMatch[];
};

export interface TextPurifier {
    detect: (text: string) => DetectionResult;
    censor: (text: string) => CensorResult;
    /**
     * @deprecated Use `detect(text)` or `censor(text)` instead.
     */
    filterText: (str: string, censor?: boolean) => FilterBadWordResult;
    addBanWords: (words: string[]) => void;
    addCharacterMap: (mappings: Record<string, string>) => void;
    addWhitelistWords: (words: string[]) => void;
}

/**
 * @deprecated Use `TextPurifier` instead.
 */
export type BadWordFilter = TextPurifier;

type NormalizedToken = {
    value: string;
    contentStart: number;
    contentEnd: number;
};

const combiningMarks = /[\u0300-\u036f]/g;
const asciiLettersAndNumbersOnly = /^[A-Za-z0-9]+$/;
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
    if (asciiLettersAndNumbersOnly.test(token)) {
        let value = "";

        for (let index = 0; index < token.length; index += 1) {
            const character = token[index].toLowerCase();
            value += characterMap[character] ?? character;
        }

        return [
            {
                value: value.replace(/[^\p{L}\p{N}]/gu, ""),
                contentStart: 0,
                contentEnd: token.length,
            },
        ];
    }

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
    exactBanWords: Set<string>,
    matchMode: MatchMode
): boolean => {
    if (matchMode === "substring") {
        return banWords.some((badWord) => candidate.includes(badWord));
    }

    return exactBanWords.has(candidate);
};

/**
 * Create an isolated text purifier instance.
 */
export const createTextPurifier = (
    customConfig?: Partial<TextPurifierConfig>
): TextPurifier => {
    const excludedLanguages = new Set(customConfig?.excludeLanguages ?? []);
    const languages = (
        customConfig?.languages ?? [...supportedLanguages]
    ).filter((language) => !excludedLanguages.has(language));
    const languageBanWords = languages.flatMap(
        (language) => banWordsByLanguage[language]
    );
    const characterMap = normalizeCharacterMap(
        customConfig?.characterMap ?? defaultConfig.characterMap
    );

    const config: TextPurifierConfig = {
        banWords: [...(customConfig?.banWords ?? languageBanWords)],
        languages: [...languages],
        excludeLanguages: [...excludedLanguages],
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
    let normalizedBanWordSet = new Set(normalizedBanWords);
    let normalizedWhitelist = normalizeWordList(config.whitelist);
    let normalizedWhitelistSet = new Set(normalizedWhitelist);

    const findMatches = (str: string): TextPurifierMatch[] => {
        const matches: TextPurifierMatch[] = [];

        for (const tokenMatch of str.matchAll(nonWhitespaceToken)) {
            const token = tokenMatch[0];
            const tokenStart = tokenMatch.index;
            const candidates = normalizeToken(token, config.characterMap);
            const candidate = candidates.find(
                ({ value }) =>
                    !normalizedWhitelistSet.has(value) &&
                    matchesBannedWord(
                        value,
                        normalizedBanWords,
                        normalizedBanWordSet,
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
        }

        return matches;
    };

    const censorMatches = (
        str: string,
        matches: TextPurifierMatch[]
    ): string => {
        if (matches.length === 0) {
            return str;
        }

        let censoredText = "";
        let previousEnd = 0;

        for (const match of matches) {
            censoredText += str.slice(previousEnd, match.start);
            censoredText += config.censorCharacter.repeat(
                Array.from(match.normalized).length
            );
            previousEnd = match.end;
        }

        return censoredText + str.slice(previousEnd);
    };

    const detect = (text: string): DetectionResult => {
        const matches = findMatches(text);

        return {
            detected: matches.length > 0,
            matches,
        };
    };

    const censor = (text: string): CensorResult => {
        const matches = findMatches(text);

        return {
            detected: matches.length > 0,
            censoredText: censorMatches(text, matches),
            matches,
        };
    };

    const filterText = (
        str: string,
        shouldCensor = false
    ): FilterBadWordResult => {
        const matches = findMatches(str);
        const detected = matches.length > 0;

        return {
            status: shouldCensor && detected,
            detected,
            result: shouldCensor
                ? censorMatches(str, matches)
                : detected
                  ? "Ban word detected!"
                  : str,
            matches,
        };
    };

    const addBanWords = (words: string[]): void => {
        config.banWords.push(...words);
        normalizedBanWords = normalizeWordList(config.banWords);
        normalizedBanWordSet = new Set(normalizedBanWords);
    };

    const addCharacterMap = (mappings: Record<string, string>): void => {
        Object.assign(config.characterMap, normalizeCharacterMap(mappings));
        normalizedBanWords = normalizeWordList(config.banWords);
        normalizedBanWordSet = new Set(normalizedBanWords);
        normalizedWhitelist = normalizeWordList(config.whitelist);
        normalizedWhitelistSet = new Set(normalizedWhitelist);
    };

    const addWhitelistWords = (words: string[]): void => {
        config.whitelist.push(...words);
        normalizedWhitelist = normalizeWordList(config.whitelist);
        normalizedWhitelistSet = new Set(normalizedWhitelist);
    };

    return {
        detect,
        censor,
        filterText,
        addBanWords,
        addCharacterMap,
        addWhitelistWords,
    };
};

/**
 * Short alias for `createTextPurifier`.
 */
export const createFilter = createTextPurifier;

/**
 * @deprecated Use `createTextPurifier()` instead.
 */
export const createBadWordFilter = createTextPurifier;
