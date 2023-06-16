const pkg = require('../package.json')
const tag = process.env.GITHUB_REF.replace('refs/tags/v', '')
if (tag !== pkg.version) {
  console.error(`Version in package.json (${pkg.version}) does not match tag (${tag})`)
  process.exit(1)
}
