# Text Purifier

A small TypeScript library for detecting and censoring words with configurable
word lists, character aliases, whitelisting, and match metadata.

## Features

- Exact-word matching by default to reduce false positives
- Optional substring matching
- Character aliases such as `@` → `a` and `0` → `o`
- Detection of separated forms such as `b-a-d`
- Preserves whitespace, newlines, and surrounding punctuation
- Match offsets against the original input
- Custom censor character and runtime configuration
- TypeScript declarations, ESM, and browser UMD builds

## Installation

```bash
npm install text-purifier
```

## Upgrading from v1

Version 2 uses exact-word matching by default. To retain v1 substring matching,
set `matchMode: "substring"`. The legacy `status` field remains available, but
new code should use `detected`.

## Basic usage

```typescript
import { createBadWordFilter } from "text-purifier";

const filter = createBadWordFilter();

const detection = filter.filterText("Hello anjing");
console.log(detection.detected); // true
console.log(detection.result); // "Ban word detected!"

const censored = filter.filterText("Hello anjing!", true);
console.log(censored.result); // "Hello ******!"
```

## Result

`filterText()` returns:

```typescript
{
  detected: true,
  result: "Hello ******!",
  matches: [
    {
      word: "anjing",
      normalized: "anjing",
      start: 6,
      end: 12
    }
  ],
  status: true
}
```

Use `detected` to determine whether a banned word was found. `status` remains
available for compatibility with v1 and is true only when censoring was
requested and text was changed.

## Configuration

```typescript
const filter = createBadWordFilter({
  banWords: ["bad", "word"],
  whitelist: ["allowed"],
  characterMap: {
    "@": "a",
    "4": "a",
    "$": "s",
    "0": "o"
  },
  matchMode: "exact",
  censorCharacter: "*"
});
```

Default banned words are stored in separate language dictionaries:

- `ban-words/en.json`
- `ban-words/id.json`

All dictionaries are enabled by default. Use `languages` as an allowlist to
select only the languages that should be filtered:

```typescript
const indonesianFilter = createBadWordFilter({
  languages: ["id"]
});
```

Use `excludeLanguages` as a denylist when you want to enable all languages
except specific ones:

```typescript
const nonEnglishFilter = createBadWordFilter({
  excludeLanguages: ["en"]
});
```

When both options contain the same language, `excludeLanguages` takes
precedence. Custom `banWords` still replaces the selected built-in
dictionaries. The raw dictionaries can also be imported from
`text-purifier/ban-words/en.json` and `text-purifier/ban-words/id.json`.

Providing `banWords` or `characterMap` replaces the corresponding default
value for that filter instance. Configuration objects are cloned, so runtime
updates do not mutate the values supplied by the caller.

### Match modes

The default `exact` mode avoids matching a banned word inside an otherwise
valid word:

```typescript
const filter = createBadWordFilter({ banWords: ["ass"] });
filter.filterText("classic", true).detected; // false
```

The previous substring behavior is available explicitly:

```typescript
const filter = createBadWordFilter({
  banWords: ["ass"],
  matchMode: "substring"
});

filter.filterText("classic", true).detected; // true
```

### Runtime updates

```typescript
const filter = createBadWordFilter();

filter.addBanWords(["custom"]);
filter.addWhitelistWords(["allowed"]);
filter.addCharacterMap({ "3": "e" });
```

## API

### `createBadWordFilter(config?)`

Creates an isolated filter. Available configuration:

- `banWords: string[]`
- `languages: ("en" | "id")[]`
- `excludeLanguages: ("en" | "id")[]`
- `characterMap: Record<string, string>`
- `whitelist: string[]`
- `matchMode: "exact" | "substring"`
- `censorCharacter: string` — exactly one Unicode code point

### `filterText(text, censor?)`

Detects banned words. With `censor: true`, matched content is replaced while
the surrounding text formatting is preserved.

### `addBanWords(words)`

Adds words to the current filter instance.

### `addWhitelistWords(words)`

Adds exact normalized words that should not be matched.

### `addCharacterMap(mappings)`

Adds or replaces character aliases and rebuilds the normalized word lists.

## Development

```bash
npm ci
npm test
npm run build
```

The test scripts use [Bun](https://bun.sh/) 1.3.5.

## License

[GPL-2.0-only](LICENSE)
