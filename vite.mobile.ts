import baseConfig from './vite.config';
import { mergeConfig, defineConfig } from 'vite';

export default defineConfig(async ({ command, mode }) => {
  const cfg = await baseConfig({ command, mode });
  return mergeConfig(cfg, {
    // Mobile-specific overrides
    build: {
      outDir: 'dist-mobile',
    },
    server: {
      ...(cfg.server ?? {}),
      port: 1423,
    },
  });
}); 