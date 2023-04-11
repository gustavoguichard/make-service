import { build, emptyDir } from 'https://deno.land/x/dnt@0.33.1/mod.ts'
import pkg from '../deno.json' assert { type: 'json' }

await emptyDir('./npm')

await build({
  scriptModule: 'cjs',
  typeCheck: false,
  declaration: true,
  entryPoints: ['./src/index.ts'],
  outDir: './npm',
  shims: { deno: true },
  package: {
    name: 'make-api',
    version: pkg.version,
    description:
      'Some utilities to extend the "fetch" API adding some utilities to better interact with external APIs.',
    license: 'MIT',
    author: 'Gustavo Guichard',
    bugs: {
      url: 'https://github.com/gustavoguichard/make-api/issues',
    },
    homepage: 'https://github.com/gustavoguichard/make-api',
  },
})

// post build steps
Deno.copyFileSync('LICENSE', 'npm/LICENSE')
Deno.copyFileSync('README.md', 'npm/README.md')
