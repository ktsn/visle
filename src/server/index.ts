import type { AllowedComponentProps, ComponentCustomProps, VNodeProps } from 'vue'

export { createRender } from './render.js'

export type ComponentProps<T> = T extends new (...args: any) => { $props: infer P }
  ? // ComponentCustomProps can have extra fields with declaration merging.
    // oxlint-disable-next-line typescript/no-redundant-type-constituents
    Omit<P, keyof VNodeProps | keyof AllowedComponentProps | keyof ComponentCustomProps>
  : Record<string, unknown>

/**
 * Map of component paths to their props types.
 * Populated by the generated d.ts file via module augmentation.
 * Pass to `createRender<VisleEntries>()` for type-safe rendering.
 */
export interface VisleEntries {}
