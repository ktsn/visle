import toDiffableHtml from 'diffable-html'

export default {
  test(val: unknown): boolean {
    return typeof val === 'string' && val.trimStart().startsWith('<')
  },
  serialize(val: string): string {
    return toDiffableHtml(val).trim()
  },
}
