import esbuild from 'esbuild';
import process from 'process';
import { builtinModules } from 'node:module';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const prod = process.argv[2] === 'production';
const outDir = process.env.OUTDIR || 'dist';

mkdirSync(outDir, { recursive: true });

const copyAssetsPlugin = {
	name: 'copy-assets',
	setup(build) {
		build.onEnd(() => {
			copyFileSync('manifest.json', join(outDir, 'manifest.json'));
			if (existsSync('styles.css')) {
				copyFileSync('styles.css', join(outDir, 'styles.css'));
			}
		});
	},
};

const context = await esbuild.context({
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
		...builtinModules,
		...builtinModules.map((m) => `node:${m}`),
	],
	format: 'cjs',
	target: 'es2021',
	logLevel: 'info',
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outfile: join(outDir, 'main.js'),
	minify: prod,
	plugins: [copyAssetsPlugin],
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
