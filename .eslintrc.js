module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: 'airbnb-base',
  rules: {
    'arrow-parens': ['error', 'as-needed'],
    'consistent-return': 'off',
    'function-paren-newline': 'off',
    'max-len': [ 'error', 240 ],
    'newline-per-chained-call': 'off',
  },
};
