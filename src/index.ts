import glob from 'glob'
import { readFileSync, lstatSync } from 'fs'
import { join } from 'path'
import { ServerPlugin } from 'vite'

const globbyImport: ServerPlugin = function ({
  root, // project root directory, absolute path
  resolver,
  app
}) {
  app.use(async (ctx, next) => {
    const filePath = resolver.requestToFile(ctx.path)
    const modulesDir = join(root, '/node_modules/')
    let fileContent =
      !filePath.startsWith(modulesDir) &&
      /\.(vue|js|jsx|ts|tsx)$/.test(filePath) &&
      lstatSync(filePath).isFile()
        ? readFileSync(filePath, 'utf-8')
        : ''

    if (fileContent) {
      fileContent = fileContent.replace(
        /import (\w+) from (['"])([^'"]+\*+[^'"]+)\2/g,
        (_, g1, g2, g3) => {
          const resolvedFilePath = g3.startsWith('.')
            ? resolver.resolveRelativeRequest(filePath, g3)
            : { pathname: resolver.requestToFile(g3) }

          const files = glob.sync(resolvedFilePath.pathname, { dot: true })
          let groups: string[] = []
          let replaceFiles: string[] = files.map((f, i) => {
            groups.push(g1 + i)
            return `import ${g1 + i} from ${g2}${resolver.fileToRequest(
              f
            )}${g2}`
          })

          return (
            replaceFiles.join('\r\n') +
            `\r\nconst ${g1} = { ${groups.join(', ')} }\r\n`
          )
        }
      )
      ctx.body = fileContent
    }
    await next()
  })
}

export = globbyImport
