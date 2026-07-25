import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

export default {
  input: 'index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/text-purifier.umd.js',
      format: 'umd',
      name: 'TextPurifier',
      sourcemap: true,
    }
  ],
  plugins: [
    typescript({ tsconfig: './tsconfig.json' }),
    json()
  ]
};
