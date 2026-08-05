<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  images: string[]
}>()

const currentIndex = ref(0)
const direction = ref<'next' | 'prev'>('next')

function prev() {
  direction.value = 'prev'
  currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length
}

function next() {
  direction.value = 'next'
  currentIndex.value = (currentIndex.value + 1) % props.images.length
}

function goTo(i: number) {
  direction.value = i > currentIndex.value ? 'next' : 'prev'
  currentIndex.value = i
}
</script>

<template>
  <div :class="$style.carousel">
    <div :class="$style['carousel-viewport']">
      <Transition
        :enter-active-class="$style['slide-enter-active']"
        :leave-active-class="$style['slide-leave-active']"
        :enter-from-class="
          direction === 'next' ? $style['slide-next-enter-from'] : $style['slide-prev-enter-from']
        "
        :leave-to-class="
          direction === 'next' ? $style['slide-next-leave-to'] : $style['slide-prev-leave-to']
        "
      >
        <img
          :key="currentIndex"
          :src="images[currentIndex]"
          :alt="`Image ${currentIndex + 1}`"
          :class="$style['carousel-image']"
        />
      </Transition>
      <button :class="[$style['carousel-btn'], $style['carousel-btn-prev']]" @click="prev">
        &#8249;
      </button>
      <button :class="[$style['carousel-btn'], $style['carousel-btn-next']]" @click="next">
        &#8250;
      </button>
    </div>
    <div :class="$style['carousel-dots']">
      <button
        v-for="(_, i) in images"
        :key="i"
        :class="[$style['carousel-dot'], { [$style.active]: i === currentIndex }]"
        @click="goTo(i)"
      />
    </div>
  </div>
</template>

<style module>
.carousel {
  width: 100%;
}

.carousel-viewport {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: #e5e5e5;
}

.carousel-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}

.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.85);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.carousel-btn:hover {
  background: rgba(255, 255, 255, 1);
}

.carousel-btn-prev {
  left: 12px;
}

.carousel-btn-next {
  right: 12px;
}

.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.carousel-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: #ccc;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}

.carousel-dot.active {
  background: #333;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.slide-next-enter-from {
  transform: translateX(100%);
}

.slide-next-leave-to {
  transform: translateX(-100%);
}

.slide-prev-enter-from {
  transform: translateX(-100%);
}

.slide-prev-leave-to {
  transform: translateX(100%);
}
</style>
