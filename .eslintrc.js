module.exports = {
  env: {
    es2021: true,
    node: true
  },
  extends: 'standard-with-typescript',
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json']
  },
  rules: {
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'warn',
    '@typescript-eslint/restrict-plus-operands': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    'new-cap': 'warn',
    'eqeqeq': 'warn',
    'prefer-const': 'warn',
    '@typescript-eslint/space-before-function-paren': 'off',
  },
  ignorePatterns: [
    'dist',
    'node_modules'
  ]
}
