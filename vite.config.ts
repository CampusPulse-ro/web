import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // A build always says which API it talks to: no silent fallback to stage in something we ship.
  // CI and the deploy workflows set VITE_API_BASE; locally, put it in .env.local. `bun dev`
  // without it talks to the stage API (src/config.ts).
  const apiBase = process.env.VITE_API_BASE || loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE
  if (command === 'build' && !apiBase) {
    throw new Error(
      'VITE_API_BASE is not set. A build must name its API, e.g. ' +
        'VITE_API_BASE=https://campuspulse-api-stage.thorsp.net (CI and the deploy workflows set it; ' +
        'locally, put it in .env.local).',
    )
  }
  return { plugins: [react(), tailwindcss()] }
})
