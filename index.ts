import defaultConfig from "./config.json";

type FilterConfig = {
    banWords: string[];
    characterMap: Record<string, string>;
    whitelist: string[];
}

type FilterBadWordType = {
    status: boolean;
    result: string;
}

interface BadWordFilter {
    filterText: (str: string, censor?: boolean) => FilterBadWordType;
    addBanWords: (words: string[]) => void;
    addCharacterMap: (mappings: Record<string, string>) => void;
    addWhitelistWords: (words: string[]) => void;
}

/**
 * Create a new bad word filter instance with custom configuration
 * @param {FilterConfig} config - Custom configuration for the filter
 * @returns {Object} Filter instance with filterText method
 * @example
 * // Create filter with custom configuration
 * const filter = createBadWordFilter({
 *   banWords: ['bad', 'words'],
 *   characterMap: { '@': 'a', '4': 'a', '$': 's' }
 * });
 * 
 * // Use the filter
 * filter.filterText("b@d w0rd$");
 */
export const createBadWordFilter = (customConfig?: Partial<FilterConfig>): BadWordFilter => {
    const config: FilterConfig = {
        banWords: [...defaultConfig.banWords],
        characterMap: { ...defaultConfig.characterMap },
        whitelist: [],
        ...customConfig
    };

    /**
     * Filter and detect bad words in a string
     * @param {string} str - The input string to check for bad words
     * @param {boolean} [censor=false] - If true, replaces bad words with asterisks. If false, returns error message when bad word is detected
     * @returns {FilterBadWordType} An object containing:
     *   - status: false if bad word detected (when censor=false), true if bad word found and censored (when censor=true)
     *   - result: censored string if censor=true, or "Ban word detected!" message if censor=false
     */
    const filterText = (str: string, censor = false): FilterBadWordType => {
        let s = str.toLowerCase();
        s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        let mapAliasCharacter = s.split('').map((chara: string) => {
            return config.characterMap[chara] ?? chara;
        });

        s = mapAliasCharacter.join('').replace(/[^a-z\s]/g, '');

        const strArr = str.split(" ");
        const newSArr = [];
        let i = 0;
        let detected = false;
        for(const word of s.split(" ")) {
            if (config.whitelist.includes(word)) {
                newSArr.push(strArr[i]);
            } else if(config.banWords.some((badWord: string) => word.includes(badWord))) {
                if(!censor) {
                    return {
                        status: false,
                        result: "Ban word detected!"
                    }
                } else {
                    detected = true;
                    newSArr.push("*".repeat(word.length));
                }
            } else {
                newSArr.push(strArr[i]);
            }
            i++;
        }
        
        return {
            status: detected,
            result: newSArr.join(" ")
        }
    };

    /**
     * Add new words to the ban list
     * @param {string[]} words - Array of words to add to ban list
     */
    const addBanWords = (words: string[]): void => {
        config.banWords.push(...words.map(w => w.toLowerCase()));
    };

    /**
     * Add new character mappings
     * @param {Record<string, string>} mappings - Object with character mappings
     */
    const addCharacterMap = (mappings: Record<string, string>): void => {
        Object.assign(config.characterMap, mappings);
    };

    /**
     * Add new words to the whitelist
     * @param {string[]} words - Array of words to add to whitelist
     */
    const addWhitelistWords = (words: string[]): void => {
        config.whitelist.push(...words.map(w => w.toLowerCase()));
    };

    return {
        filterText,
        addBanWords,
        addCharacterMap,
        addWhitelistWords,
    };
}