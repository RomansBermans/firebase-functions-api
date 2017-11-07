module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: 'airbnb-base',
  rules: {
    'arrow-parens': ['error', 'as-needed'],
    'function-paren-newline': 'off',
    'newline-per-chained-call': 'off',
  }
}
