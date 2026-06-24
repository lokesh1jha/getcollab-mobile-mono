const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const sharedRoot = path.resolve(projectRoot, '../packages/mobile-shared')

const config = getDefaultConfig(projectRoot)

// Watch the shared package so Metro picks up changes
config.watchFolders = [sharedRoot]

// Resolve @shared/* to the shared package src
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
