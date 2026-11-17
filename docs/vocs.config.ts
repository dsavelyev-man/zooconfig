import { defineConfig } from 'vocs/config'

export default defineConfig({
  title: 'Zooconfig',
  titleTemplate: '%s – Zooconfig',
  description: 'A plugin-based configuration system for Node.js.',
  sidebar: [
    { text: 'Overview', link: '/' },
    {
      text: 'Guide',
      items: [
        { text: 'Getting started', link: '/getting-started' },
        { text: 'Configuration', link: '/configuration' },
        { text: 'Environment variables', link: '/environment' },
        { text: 'Validation', link: '/validation' },
        { text: 'Parser plugins', link: '/plugins' },
      ],
    },
    {
      text: 'Packages',
      items: [
        { text: 'Package overview', link: '/packages' },
        { text: 'Dotenv', link: '/packages/dotenv' },
        { text: 'YAML', link: '/packages/yaml' },
        { text: 'TOML', link: '/packages/toml' },
        { text: 'JSONC', link: '/packages/jsonc' },
        { text: 'JavaScript & TypeScript', link: '/packages/js' },
      ],
    },
    {
      text: 'Reference',
      items: [
        { text: 'API', link: '/api' },
        { text: 'CLI', link: '/cli' },
      ],
    },
  ],
})
