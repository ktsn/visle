import vuePlugin from '@vitejs/plugin-vue'
import { createObjectProperty, createSimpleExpression, NodeTypes } from '@vue/compiler-core'

import { generateComponentId } from '../shared/component-id.js'
import type { ResolvedVisleConfig } from '../shared/config.js'

/**
 * Wrap @vitejs/plugin-vue to inject Visle specific options.
 * Users can specify their own options in the Visle config, which will be merged with the defaults.
 */
export function wrapVuePlugin(config: ResolvedVisleConfig) {
  return vuePlugin({
    ...config.vue,

    features: {
      ...config.vue?.features,
      componentIdGenerator: (filePath, source, isProduction) => {
        return generateComponentId(filePath, source, isProduction ?? false)
      },
    },

    template: {
      ...config.vue?.template,

      compilerOptions: {
        ...config.vue?.template?.compilerOptions,

        isCustomElement: (tag) => {
          return (
            tag === 'vue-island' || config.vue?.template?.compilerOptions?.isCustomElement?.(tag)
          )
        },

        directiveTransforms: {
          ...config.vue?.template?.compilerOptions?.directiveTransforms,

          // server-transform plugin searches v-client directive to detect
          // island component. Strip v-client directive here to make sure to
          // remove it in all environment.
          client: (dir) => {
            const props = [
              createObjectProperty(
                createSimpleExpression('__visle_strategy__', true),
                createSimpleExpression(
                  JSON.stringify(
                    dir.arg?.type === NodeTypes.SIMPLE_EXPRESSION ? dir.arg.content : 'load',
                  ),
                  false,
                ),
              ),
            ]

            if (dir.exp) {
              props.push(
                createObjectProperty(createSimpleExpression('__visle_options__', true), dir.exp),
              )
            }

            return { props }
          },
        },
      },
    },
  })
}
