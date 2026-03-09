import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Visle',
  description: 'Islands Architecture Renderer for Vue.js',

  head: [
    [
      'link',
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    ],
    [
      'link',
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: '',
      },
    ],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&display=swap',
      },
    ],
    [
      'style',
      {},
      `:root {
  --vp-c-brand-1: #1a9e6f;
  --vp-c-brand-2: #16875e;
  --vp-c-brand-3: #12704e;
  --vp-c-brand-soft: rgba(26, 158, 111, 0.14);
}
.dark {
  --vp-c-brand-1: #3dd68c;
  --vp-c-brand-2: #34c07d;
  --vp-c-brand-3: #2baa6e;
  --vp-c-brand-soft: rgba(61, 214, 140, 0.16);
}
.vp-doc h1, .vp-doc h2, .vp-doc h3, .vp-doc h4,
.VPHero .name, .VPHero .text {
  font-family: 'Manrope', sans-serif;
}`,
    ],
  ],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/islands' },
      { text: 'API Reference', link: '/api/' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [{ text: 'Getting Started', link: '/' }],
      },
      {
        text: 'Guide',
        items: [
          { text: 'Islands Architecture', link: '/guide/islands' },
          { text: 'Development', link: '/guide/development' },
          { text: 'Production', link: '/guide/production' },
          { text: 'CSS Handling', link: '/guide/css' },
          { text: 'TypeScript', link: '/guide/typescript' },
        ],
      },
      {
        text: 'API Reference',
        items: [{ text: 'API', link: '/api/' }],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/ktsn/visle' }],
  },
})
