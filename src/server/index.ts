import type { AllowedComponentProps, ComponentCustomProps, VNodeProps } from 'vue'

export { createRender } from './render.js'

export type ComponentProps<T> = T extends new (...args: any) => { $props: infer P }
  ? Omit<P, keyof VNodeProps | keyof AllowedComponentProps | keyof ComponentCustomProps>
  : Record<string, unknown>

/**
 * Map of component paths to their props types.
 * Populated by the generated `visle-generated.d.ts` via module augmentation.
 * Pass to `createRender<VisleEntries>()` for type-safe rendering.
 */
export interface VisleEntries {}
