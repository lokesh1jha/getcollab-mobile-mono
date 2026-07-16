const { getDefaultConfig } = require('expo/metro-config')
const { createMonorepoMetroConfig, createResolveRequest } = require('../metro.shared')

const projectRoot = __dirname
const { monorepoRoot, sharedRoot, srcRoot, extraNodeModules, nodeModulesPaths } =
  createMonorepoMetroConfig(projectRoot)

const config = getDefaultConfig(projectRoot)

config.resolver.unstable_enableSymlinks = true
config.watchFolders = [monorepoRoot, sharedRoot]
config.resolver.nodeModulesPaths = nodeModulesPaths
config.resolver.extraNodeModules = extraNodeModules
config.resolver.resolveRequest = createResolveRequest({ projectRoot, srcRoot })

module.exports = config
