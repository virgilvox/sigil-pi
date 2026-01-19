import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'sigil': [
                        './src/components/sigil/SigilGame.vue',
                        './src/stores/sigil.ts'
                    ],
                    'junk-mage': [
                        './src/components/junk-mage/JunkMageGame.vue',
                        './src/stores/junk-mage.ts'
                    ],
                    'null-arcana': [
                        './src/components/null-arcana/NullArcanaGame.vue',
                        './src/stores/null-arcana.ts'
                    ]
                }
            }
        }
    }
});
