module.exports = {
    extends: '@apify/eslint-config',
    parserOptions: {
        ecmaVersion: 2021,
    },
    rules: {
        'max-len': ['error', { code: 120 }],
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
};