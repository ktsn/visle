<script setup lang="ts">
import type { Product } from '../../app/db.ts'
import Layout from '../Layout.vue'
import ImageCarousel from '../ImageCarousel.island.vue'

const { product } = defineProps<{
  product: Product
}>()

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
</script>

<template>
  <Layout :title="product.name">
    <div :class="$style.detail">
      <div :style="{ viewTransitionName: `product-image-${product.id}` }">
        <ImageCarousel :images="product.images" />
      </div>

      <h1
        id="main-content"
        :class="$style['detail-name']"
        :style="{ viewTransitionName: `product-title-${product.id}` }"
      >
        {{ product.name }}
      </h1>
      <p :class="$style['detail-price']">{{ formatPrice(product.price) }}</p>
      <p :class="$style['detail-description']">{{ product.description }}</p>

      <a href="/" :class="$style['back-link']">&larr; Back to shop</a>
    </div>
  </Layout>
</template>

<style module>
.detail {
  max-width: 640px;
  margin: 0 auto;
}

.detail-name {
  font-size: 28px;
  font-weight: 700;
  margin-top: 24px;
  width: fit-content;
}

.detail-price {
  font-size: 22px;
  font-weight: 700;
  color: #333;
  margin-top: 8px;
}

.detail-description {
  margin-top: 16px;
  color: #555;
  line-height: 1.7;
}

.back-link {
  display: inline-block;
  margin-top: 32px;
  color: #555;
  font-size: 14px;
}

.back-link:hover {
  color: #1a1a1a;
}
</style>
