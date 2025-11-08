import config from "./config.json";

type filterBadWordType = {
    status: boolean;
    result: string;
}

/**
 * Filter and detect bad words in a string
 * @param {string} str - The input string to check for bad words
 * @param {boolean} [censor=false] - If true, replaces bad words with asterisks. If false, returns error message when bad word is detected
 * @returns {filterBadWordType} An object containing:
 *   - status: false if bad word detected (when censor=false), true if bad word found and censored (when censor=true)
 *   - result: censored string if censor=true, or "Ban word detected!" message if censor=false
 * @example
 * // Without censoring (returns immediately when bad word found)
 * filtergBadWord("Hello anjing", false)
 * // Returns: { status: false, result: "Ban word detected!" }
 * 
 * // With censoring (replaces bad words with asterisks)
 * filtergBadWord("Hello anjing", true)
 * // Returns: { status: true, result: "Hello *****" }
 */
export const filtergBadWord = (str: string, censor = false): filterBadWordType => {
    let s = str.toLowerCase();

    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    let mapAliasCharacter = s.split('').map(chara => {
        return (config.characterMap as Record<string, string>)[chara] ?? chara;
    });

    s = mapAliasCharacter.join('').replace(/[^a-z\s]/g, '');
    console.log(s)

    const strArr = str.split(" ");
    const newSArr = [];
    let i = 0;
    let detected = false;
    for(const word of s.split(" ")) {
        if(config.banWords.some(badWord => word.includes(badWord))) {
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
}