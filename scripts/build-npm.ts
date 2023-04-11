import { build, emptyDir } from 'https://deno.land/x/dnt@0.33.1/mod.ts'
import pkg from '../deno.json' assert { type: 'json' }

await emptyDir('./npm')

await build({
  scriptModule: 'cjs',
  typeCheck: false,
  test: false,
  declaration: true,
  entryPoints: ['./src/index.ts'],
  outDir: './npm',
  shims: { deno: true, undici: true },
  package: {
    name: 'make-service',
    version: pkg.version,
    description:
      'Some utilities to extend the "fetch" API to better interact with external APIs.',
    license: 'MIT',
    author: 'Gustavo Guichard',
    bugs: {
      url: 'https://github.com/gustavoguichard/make-service/issues',
    },
    homepage: 'https://github.com/gustavoguichard/make-service',
  },
})

// post build steps
Deno.copyFileSync('LICENSE', 'npm/LICENSE')
Deno.copyFileSync('README.md', 'npm/README.md')
