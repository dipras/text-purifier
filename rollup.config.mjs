import { rmSync } from 'node:fs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

const cleanDist = {
  name: 'clean-dist',
  buildStart() {
    rmSync('dist', { recursive: true, force: true });
  },
};

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
    cleanDist,
    typescript({ tsconfig: './tsconfig.json' }),
    json()
  ]
};
