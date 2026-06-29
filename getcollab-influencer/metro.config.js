const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')
const fs = require('fs')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '..')
const sharedRoot = path.resolve(monorepoRoot, 'packages/mobile-shared')
const srcRoot = path.join(sharedRoot, 'src')

const config = getDefaultConfig(projectRoot)

// Enable symlinks for pnpm compatibility
config.resolver.unstable_enableSymlinks = true

// Watch the monorepo root node_modules and shared package
config.watchFolders = [monorepoRoot, sharedRoot]

// Tell Metro where to look for modules regardless of where the requiring file lives.
// Without this, when Metro follows expo's symlink into the pnpm store, it can't find
// expo-modules-core via standard node resolution from that deeply-nested path.
config.resolver.nodeModulesPaths = [
  path.resolve(monorepoRoot, 'node_modules'),
  path.resolve(projectRoot, 'node_modules'),
]

// Resolve @shared/* and @/* to their respective roots
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@shared') {
    return { filePath: path.join(srcRoot, 'index.ts'), type: 'sourceFile' }
  }
  if (moduleName.startsWith('@shared/')) {
    const subpath = moduleName.slice(8)
    const resolved = resolveSharedPath(subpath)
    if (resolved) return { filePath: resolved, type: 'sourceFile' }
  }
  if (moduleName.startsWith('@/')) {
    const subpath = moduleName.slice(2)
    const resolved = resolveLocalPath(subpath)
    if (resolved) return { filePath: resolved, type: 'sourceFile' }
  }
  return context.resolveRequest(context, moduleName, platform)
}

function resolveLocalPath(subpath) {
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

function resolveSharedPath(subpath) {
  const extensions = ['.ts', '.tsx', '.js', '.jsx']
  const fullPath = path.join(srcRoot, subpath)

  // Direct match with extension
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    return fullPath
  }

  // Try appending extensions
  for (const ext of extensions) {
    const withExt = fullPath + ext
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt
    }
  }

  // Directory with index file
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    for (const ext of extensions) {
      const indexPath = path.join(fullPath, 'index' + ext)
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        return indexPath
      }
    }
  }

  return null
}

module.exports = config
