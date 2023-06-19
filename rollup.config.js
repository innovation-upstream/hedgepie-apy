import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

export default {
  input: 'src/index.ts',
  output: [
    {
      dir: 'dist',
      format: 'cjs',
      exports: 'named',
    },
    {
      dir: 'dist',
      format: 'es',
    },
  ],
  plugins: [
    typescript(),
    resolve({
      mainFields: ['module', 'main', 'jsnext:main', 'browser'],
      extensions
    }),
    commonjs(),
    json(),
    babel({
      exclude: 'node_modules/**',
      presets: [['@babel/preset-env', { modules: false }]],
      plugins: ['@babel/plugin-transform-runtime'],
      babelHelpers: 'runtime',
    }),
  ],
};
