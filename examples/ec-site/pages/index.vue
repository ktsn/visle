<script setup lang="ts">
import type { Product } from '../app/db.ts'
import Layout from '../components/Layout.vue'

defineProps<{
  products: Product[]
}>()

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
</script>

<template>
  <Layout title="Shop">
    <div :class="$style.grid">
      <a
        v-for="product in products"
        :key="product.id"
        :href="`/products/${product.id}`"
        :class="$style.card"
      >
        <img
          :src="product.images[0]"
          :alt="product.name"
          :class="$style['card-image']"
          :style="{ viewTransitionName: `product-image-${product.id}` }"
          loading="lazy"
        />
        <div :class="$style['card-body']">
          <h2
            :class="$style['card-title']"
            :style="{ viewTransitionName: `product-title-${product.id}` }"
          >
            {{ product.name }}
          </h2>
          <p :class="$style['card-price']">{{ formatPrice(product.price) }}</p>
        </div>
      </a>
    </div>
  </Layout>
</template>

<style module>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e5e5;
  transition: box-shadow 0.2s;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.card-body {
  padding: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  width: fit-content;
}

.card-price {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}
</style>
