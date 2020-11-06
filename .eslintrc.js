module.exports = {
  env: {
    es2020: true,
    node: true,
    jest: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    // 0=off, 1=warn, 2=error
    'import/no-unresolved': 0, // allow for slyp imports
    'no-use-before-define': 0, // allow functions out of order
    'consistent-return': 0, // allow different returns, e.g. null / object / undefined
    'max-classes-per-file': 0,
    'no-unused-vars': 1, // only warn for unused variables
    'import/no-extraneous-dependencies': 1, // allow for slyp imports
    'no-continue': 1,
    'no-param-reassign': 1,
    'prefer-object-spread': 1,
    'no-unused-expressions': 1,
    'no-case-declarations': 1,
    'max-len': [
      2,
      {
        code: 160,
        tabWidth: 2,
        ignoreComments: true,
        ignoreTrailingComments: true,
      },
    ],
    'object-curly-newline': [
      2,
      {
        ObjectExpression: { consistent: true },
        ImportDeclaration: { consistent: true },
        ExportDeclaration: { consistent: true },
      },
    ],
    'implicit-arrow-linebreak': 0,
  },
};
