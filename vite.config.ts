import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    singleQuote: true,
    semi: false,
    experimentalSortImports: {},
    experimentalSortPackageJson: true,
  },
  lint: {
    plugins: [
      'eslint',
      'unicorn',
      'oxc',
      'node',
      'promise',
      'typescript',
      'import',
      'vue',
      'vitest',
    ],
    categories: {
      correctness: 'error',
      suspicious: 'error',
      perf: 'error',
    },
    ignorePatterns: ['dist/', 'node_modules/'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    snapshotSerializers: ['./test/html-serializer.ts'],
    silent: 'passed-only',
  },
})
