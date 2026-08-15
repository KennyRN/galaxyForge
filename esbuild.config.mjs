// Standard community-plugin esbuild script: bundles main.ts -> main.js,
// externalising Obsidian's own runtime (it is provided by the host app, not
// bundled) and Node/Electron builtins. Not part of the conformance gates
// (verification/run-gates.js typechecks main.ts/vault.ts directly; this
// script's only job is producing the runnable main.js the manifest points at).
import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';

const banner = `/* StarForge - built ${new Date().toISOString()}. Do not edit main.js directly; edit the .ts sources and rebuild. */`;

const watch = process.argv.includes('--watch') || process.argv.includes('-w');
const production = process.argv.includes('production');

const ctx = await esbuild.context({
  banner: { js: banner },
  entryPoints: ['main.ts'],
  bundle: true,
  external: [
    'obsidian', 'electron', '@codemirror/autocomplete', '@codemirror/collab',
    '@codemirror/commands', '@codemirror/language', '@codemirror/lint',
    '@codemirror/search', '@codemirror/state', '@codemirror/view', '@lezer/common',
    '@lezer/highlight', '@lezer/lr', ...builtins,
  ],
  format: 'cjs',
  target: 'es2020',
  logLevel: 'info',
  sourcemap: production ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  minify: production,
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  process.exit(0);
}
