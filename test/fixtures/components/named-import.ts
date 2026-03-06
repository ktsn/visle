import { defineComponent, h, ref } from 'vue'

export const Counter = defineComponent({
  props: {
    count: {
      type: Number,
      default: 0,
    },
  },
  setup(props) {
    const current = ref(props.count)
    return () => h('button', `Count: ${current.value}`)
  },
})
