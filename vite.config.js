import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		enhancedImages(),
		sveltekit()
	],
	resolve: {
		alias: {
		}
	},
	optimizeDeps: {
		include: []
	},
	ssr: {
		noExternal: []
	},
	build: {
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
			},
		},
		commonjsOptions: {
			include: [/node_modules/]
		},
		rollupOptions: {
			output: {
				entryFileNames: '_app/immutable/entry/[name]-[hash].js',
				chunkFileNames: '_app/immutable/chunks/[name]-[hash].js',
				assetFileNames: '_app/immutable/assets/[name]-[hash][extname]'
			}
		}
	},
});