import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

const eslintConfig = [
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
    rules: {
      // Disable specific rules
      'react/no-unescaped-entities': 'off',          // allows unescaped double quotes
      '@typescript-eslint/no-explicit-any': 'off',   // allows use of 'any'
      '@next/next/no-page-custom-font': 'off',       // optional, disables font warnings
      
      // ✅ Suppress unused variable warnings (including for 'router')
      '@typescript-eslint/no-unused-vars': 'off',
    },
  }),
]

export default eslintConfig
