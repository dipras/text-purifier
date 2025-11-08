import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';

export default [
  {
    input: 'index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'es',
      },
      {
        file: 'dist/text-purifier.umd.js',
        format: 'umd',
        name: 'TextPurifier',
        globals: {}
      }
    ],
    plugins: [
      typescript({ tsconfig: './tsconfig.json' }),
      json()
    ]
  },
  {
    input: 'dist/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es' }],
    plugins: [dts()]
  }
];