const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, '../packages/mobile-shared')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [sharedRoot]

config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (target, name) => {
      if (name === '@shared') {
        return path.join(sharedRoot, 'src')
      }
      return path.join(projectRoot, 'node_modules', String(name))
    },
  }
)

module.exports = config
