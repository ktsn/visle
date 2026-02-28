export function loadModule(entry: string): Promise<Record<string, any>> {
  return import(/* @vite-ignore */ entry)
}
