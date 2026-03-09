import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Visle',
  description: 'Islands Architecture Renderer for Vue.js',

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
