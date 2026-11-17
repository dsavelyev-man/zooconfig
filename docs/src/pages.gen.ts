// deno-fmt-ignore-file
// biome-ignore format: generated types do not need formatting
// prettier-ignore
import type { PathsForPages } from 'waku/router'

// prettier-ignore
type Page =
  | { path: '/api'; render: 'static' }
  | { path: '/cli'; render: 'static' }
  | { path: '/configuration'; render: 'static' }
  | { path: '/environment'; render: 'static' }
  | { path: '/getting-started'; render: 'static' }
  | { path: '/'; render: 'static' }
  | { path: '/packages'; render: 'static' }
  | { path: '/packages/js'; render: 'static' }
  | { path: '/packages/jsonc'; render: 'static' }
  | { path: '/packages/toml'; render: 'static' }
  | { path: '/packages/yaml'; render: 'static' }
  | { path: '/plugins'; render: 'static' }
  | { path: '/validation'; render: 'static' }

// prettier-ignore
declare module 'waku/router' {
  interface RouteConfig {
    paths: PathsForPages<Page>
  }
  interface CreatePagesConfig {
    pages: Page
  }
}
