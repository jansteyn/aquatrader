import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom',
            include: ['tests/screenerMetadata.test.ts', 'tests/**/*.component.test.tsx'],
            restoreMocks: true,
            pool: 'threads',
            maxWorkers: 1,
            testTimeout: 15_000,
        },
    }),
);
