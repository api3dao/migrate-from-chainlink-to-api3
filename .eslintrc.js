module.exports = {
  extends: ['plugin:@api3/eslint-plugin-commons/universal'],
  parserOptions: {
    project: ['./tsconfig.json'],
  },
  rules: {
    camelcase: 'off',
    'no-console': 'off',
    'functional/no-promise-reject': 'off',
    'unicorn/prefer-spread': 'off',
  },
};
