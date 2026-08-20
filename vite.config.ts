import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Allow SUPABASE_URL / SUPABASE_ANON_KEY (no VITE_ prefix) to reach the browser bundle.
  envPrefix: ['VITE_', 'SUPABASE_'],
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
