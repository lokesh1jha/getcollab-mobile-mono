const path = require('path')
const fs = require('fs')

// Native modules must resolve to a single copy or RN throws "Tried to register two views..."
const DEDUPED_NATIVE_MODULES = [
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-gesture-handler',
  'react-native-reanimated',
  'react-native-worklets',
]

function createMonorepoMetroConfig(projectRoot) {
  const monorepoRoot = path.resolve(projectRoot, '..')
  const sharedRoot = path.resolve(monorepoRoot, 'packages/mobile-shared')
  const srcRoot = path.join(sharedRoot, 'src')

  const appNodeModules = path.resolve(projectRoot, 'node_modules')
  const rootNodeModules = path.resolve(monorepoRoot, 'node_modules')

  const extraNodeModules = {}
  for (const name of DEDUPED_NATIVE_MODULES) {
    const appPath = path.join(appNodeModules, name)
    const rootPath = path.join(rootNodeModules, name)
    if (fs.existsSync(appPath)) {
      extraNodeModules[name] = appPath
    } else if (fs.existsSync(rootPath)) {
      extraNodeModules[name] = rootPath
    }
  }

  return {
    monorepoRoot,
    sharedRoot,
    srcRoot,
    projectRoot,
    extraNodeModules,
    nodeModulesPaths: [rootNodeModules, appNodeModules],
  }
}

function resolveLocalPath(projectRoot, subpath) {
  const extensions = ['.ts', '.tsx', '.js', '.jsx']
  const fullPath = path.join(projectRoot, subpath)
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) return fullPath
  for (const ext of extensions) {
    const withExt = fullPath + ext
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) return withExt
  }
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    for (const ext of extensions) {
      const indexPath = path.join(fullPath, 'index' + ext)
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) return indexPath
    }
  }
  return null
}

function resolveSharedPath(srcRoot, subpath) {
  const extensions = ['.ts', '.tsx', '.js', '.jsx']
  const fullPath = path.join(srcRoot, subpath)
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) return fullPath
  for (const ext of extensions) {
    const withExt = fullPath + ext
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) return withExt
  }
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    for (const ext of extensions) {
      const indexPath = path.join(fullPath, 'index' + ext)
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) return indexPath
    }
  }
  return null
}

function createResolveRequest({ projectRoot, srcRoot }) {
  return (context, moduleName, platform) => {
    if (moduleName === '@shared') {
      return { filePath: path.join(srcRoot, 'index.ts'), type: 'sourceFile' }
    }
    if (moduleName.startsWith('@shared/')) {
      const resolved = resolveSharedPath(srcRoot, moduleName.slice(8))
      if (resolved) return { filePath: resolved, type: 'sourceFile' }
    }
    if (moduleName.startsWith('@/')) {
      const resolved = resolveLocalPath(projectRoot, moduleName.slice(2))
      if (resolved) return { filePath: resolved, type: 'sourceFile' }
    }
    return context.resolveRequest(context, moduleName, platform)
  }
}

module.exports = {
  createMonorepoMetroConfig,
  createResolveRequest,
  DEDUPED_NATIVE_MODULES,
}
