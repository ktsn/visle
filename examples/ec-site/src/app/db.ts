interface Product {
  id: string
  name: string
  price: number
  description: string
  images: string[]
}

const products: Product[] = [
  {
    id: 'classic-leather-bag',
    name: 'Classic Leather Bag',
    price: 12900,
    description:
      'A timeless leather bag crafted from premium full-grain leather. Features a spacious interior with multiple compartments, adjustable shoulder strap, and brass hardware. Perfect for everyday use or travel.',
    images: [
      'https://picsum.photos/seed/leather-bag-1/800/600',
      'https://picsum.photos/seed/leather-bag-2/800/600',
      'https://picsum.photos/seed/leather-bag-3/800/600',
    ],
  },
  {
    id: 'wireless-headphones',
    name: 'Wireless Headphones',
    price: 7900,
    description:
      'Premium wireless headphones with active noise cancellation. Enjoy up to 30 hours of battery life, comfortable over-ear cushions, and rich, balanced sound. Includes a carrying case and USB-C charging cable.',
    images: [
      'https://picsum.photos/seed/headphones-1/800/600',
      'https://picsum.photos/seed/headphones-2/800/600',
      'https://picsum.photos/seed/headphones-3/800/600',
      'https://picsum.photos/seed/headphones-4/800/600',
    ],
  },
  {
    id: 'ceramic-mug-set',
    name: 'Ceramic Mug Set',
    price: 3400,
    description:
      'Set of four handcrafted ceramic mugs in earthy tones. Each mug holds 350ml and features a comfortable handle and matte glaze finish. Microwave and dishwasher safe.',
    images: [
      'https://picsum.photos/seed/mug-set-1/800/600',
      'https://picsum.photos/seed/mug-set-2/800/600',
      'https://picsum.photos/seed/mug-set-3/800/600',
    ],
  },
  {
    id: 'running-shoes',
    name: 'Running Shoes',
    price: 10900,
    description:
      'Lightweight running shoes with responsive cushioning and breathable mesh upper. Designed for road running with a durable rubber outsole and reflective details for visibility in low light.',
    images: [
      'https://picsum.photos/seed/running-shoes-1/800/600',
      'https://picsum.photos/seed/running-shoes-2/800/600',
      'https://picsum.photos/seed/running-shoes-3/800/600',
      'https://picsum.photos/seed/running-shoes-4/800/600',
    ],
  },
  {
    id: 'desk-lamp',
    name: 'Minimalist Desk Lamp',
    price: 5600,
    description:
      'A sleek adjustable desk lamp with three brightness levels and warm to cool color temperature control. Features a slim aluminum body, weighted base, and touch-sensitive controls.',
    images: [
      'https://picsum.photos/seed/desk-lamp-1/800/600',
      'https://picsum.photos/seed/desk-lamp-2/800/600',
      'https://picsum.photos/seed/desk-lamp-3/800/600',
    ],
  },
  {
    id: 'plant-pot',
    name: 'Concrete Plant Pot',
    price: 2800,
    description:
      'Modern concrete plant pot with a geometric design and drainage hole. Hand-poured with a smooth finish and felt pads on the base to protect surfaces. Suitable for small to medium plants.',
    images: [
      'https://picsum.photos/seed/plant-pot-1/800/600',
      'https://picsum.photos/seed/plant-pot-2/800/600',
      'https://picsum.photos/seed/plant-pot-3/800/600',
      'https://picsum.photos/seed/plant-pot-4/800/600',
    ],
  },
]

function getAllProducts(): Product[] {
  return products
}

function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export type { Product }
export { getAllProducts, getProduct }
