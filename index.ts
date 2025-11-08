import config from "./config.json";

type filterBadWordType = {
    status: boolean;
    result: string;
}

const filtergBadWord = (str: string, censor = false): filterBadWordType => {
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

console.log(filtergBadWord("Asu De Kontol, sama lo semua, ngentot, ngentot, sama lo semua, Asu De Kontol, sama lo Semua Ngentod, Ngentod, sama lo semua", true))