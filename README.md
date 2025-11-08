# Text Purifier

A TypeScript package to filter and censor bad words with support for character mapping and custom word lists. Supports both Bahasa Indonesia and English bad words detection.

## Features

- 🚫 Filter and detect bad words in text
- ⭐ Censorship mode to replace bad words with asterisks
- 🔄 Character mapping to catch obfuscated words (e.g., "@" → "a", "4" → "a")
- ➕ Ability to add custom bad words
- 🗺️ Extensible character mapping
- 📝 Written in TypeScript with full type support
- 🌐 Supports both Bahasa Indonesia and English

## Installation

```bash
npm install bad-word-filter
# or
yarn add bad-word-filter
```

## Usage

### Basic Usage

```typescript
import { createBadWordFilter } from 'bad-word-filter';

// Create a filter instance with default configuration
const filter = createBadWordFilter();

// Check for bad words (returns error message if found)
const result1 = filter.filterText("This is a bad text");
console.log(result1);
// { status: false, result: "Ban word detected!" }

// Censor bad words (replaces them with asterisks)
const result2 = filter.filterText("This is a bad text", true);
console.log(result2);
// { status: true, result: "This is a *** text" }
```

### Custom Configuration

You can create a filter with custom configuration:

```typescript
const filter = createBadWordFilter({
  banWords: ['custom', 'bad', 'words'],
  characterMap: {
    '@': 'a',
    '4': 'a',
    '$': 's',
    '0': 'o'
  }
});
```

### Adding Bad Words

```typescript
const filter = createBadWordFilter();

// Add more words to the ban list
filter.addBanWords(['word1', 'word2']);
```

### Adding Character Mappings

```typescript
const filter = createBadWordFilter();

// Add more character mappings
filter.addCharacterMap({
  '!': 'i',
  '3': 'e'
});
```

### Handle Obfuscated Text

The filter automatically handles obfuscated text using character mapping:

```typescript
const filter = createBadWordFilter();

// Will detect "b@d" as "bad"
const result = filter.filterText("This is b@d");
console.log(result);
// { status: false, result: "Ban word detected!" }

// With censorship enabled
const censored = filter.filterText("This is b@d", true);
console.log(censored);
// { status: true, result: "This is ***" }
```

## API Reference

### `createBadWordFilter(config?: Partial<FilterConfig>)`

Creates a new instance of the bad word filter.

#### Parameters:
- `config` (optional): Configuration object
  - `banWords`: Array of strings to be banned
  - `characterMap`: Object mapping special characters to their letter equivalents

#### Returns:
An object with the following methods:

### `filterText(str: string, censor?: boolean)`

Filters text for bad words.

#### Parameters:
- `str`: The input string to check
- `censor` (optional): If true, replaces bad words with asterisks. If false, returns error message when bad word is detected

#### Returns:
```typescript
{
  status: boolean;  // false if bad word detected (when censor=false), true if word found and censored (when censor=true)
  result: string;   // censored string or error message
}
```

### `addBanWords(words: string[])`

Adds new words to the ban list.

#### Parameters:
- `words`: Array of strings to add to the ban list

### `addCharacterMap(mappings: Record<string, string>)`

Adds new character mappings.

#### Parameters:
- `mappings`: Object with character mappings

## License

This project is licensed under [GPLv2](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html).