export function loadModule(entry: string): Promise<Record<string, unknown>> {
  return import(/* @vite-ignore */ entry)
}
