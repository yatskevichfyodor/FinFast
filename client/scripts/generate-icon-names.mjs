import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const root = process.cwd()

const sources = [
  {
    package: '@iconify-json/mdi',
    output: 'src/assets/icon-names/mdi.json',
  },
  {
    package: '@iconify-json/simple-icons',
    output: 'src/assets/icon-names/simple-icons.json',
  },
]

for (const { package: packageName, output } of sources) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`)
  const packageDir = path.dirname(packageJsonPath)

  const iconsPath = path.join(packageDir, 'icons.json')
  const iconsJson = JSON.parse(await readFile(iconsPath, 'utf8'))

  const names = Object.keys(iconsJson.icons)

  const outputPath = path.join(root, output)

  await mkdir(path.dirname(outputPath), { recursive: true })

  await writeFile(
    outputPath,
    `${JSON.stringify(names, null, 2)}\n`,
    'utf8',
  )

  console.log(`${packageName}: ${names.length} icons -> ${output}`)
}