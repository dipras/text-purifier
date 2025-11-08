import { createBadWordFilter } from './index';

describe('Bad Word Filter', () => {
    describe('Default Configuration', () => {
        const filter = createBadWordFilter();

        test('should detect bad word with default configuration', () => {
            const result = filter.filterText('Hello anjing', false);
            expect(result).toEqual({
                status: false,
                result: 'Ban word detected!'
            });
        });

        test('should censor bad word with default configuration', () => {
            const result = filter.filterText('Hello anjing', true);
            expect(result).toEqual({
                status: true,
                result: 'Hello ******'
            });
        });

        test('should handle clean text', () => {
            const result = filter.filterText('Hello world', false);
            expect(result).toEqual({
                status: false,
                result: 'Hello world'
            });
        });
    });

    describe('Custom Configuration', () => {
        const customFilter = createBadWordFilter({
            banWords: ['bad', 'test'],
            characterMap: {
                '@': 'a',
                '4': 'a',
                '$': 's'
            }
        });

        test('should detect custom bad words', () => {
            const result = customFilter.filterText('This is bad', false);
            expect(result).toEqual({
                status: false,
                result: 'Ban word detected!'
            });
        });

        test('should handle character mapping', () => {
            const result = customFilter.filterText('This is b@d', false);
            expect(result).toEqual({
                status: false,
                result: 'Ban word detected!'
            });
        });

        test('should censor with character mapping', () => {
            const result = customFilter.filterText('This is b@d', true);
            expect(result).toEqual({
                status: true,
                result: 'This is ***'
            });
        });
    });

    describe('Dynamic Configuration', () => {
        const filter = createBadWordFilter();

        test('should allow adding new bad words', () => {
            filter.addBanWords(['newbad']);
            const result = filter.filterText('This is newbad', false);
            expect(result).toEqual({
                status: false,
                result: 'Ban word detected!'
            });
        });

        test('should allow adding new character mappings', () => {
            filter.addCharacterMap({ '3': 'e' });
            const result = filter.filterText('n3wbad', false);
            expect(result).toEqual({
                status: false,
                result: 'Ban word detected!'
            });
        });
    });

    describe('Edge Cases', () => {
        const filter = createBadWordFilter();

        test('should handle empty string', () => {
            const result = filter.filterText('', false);
            expect(result).toEqual({
                status: false,
                result: ''
            });
        });

        test('should handle string with only spaces', () => {
            const result = filter.filterText('   ', false);
            expect(result).toEqual({
                status: false,
                result: '   '
            });
        });

        test('should handle special characters', () => {
            const result = filter.filterText('Hello! @#$%^&*()', false);
            expect(result).toEqual({
                status: false,
                result: 'Hello! @#$%^&*()'
            });
        });
    });
});