#!/usr/bin/env node
// Bumps the user-facing version across all apps and packages in the monorepo.
// iOS buildNumber and Android versionCode are managed by EAS (autoIncrement: true).
//
// Usage: node scripts/bump-version.js <patch|minor|major>

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')

const FILES = {
  rootPkg:        path.join(ROOT, 'package.json'),
  brandPkg:       path.join(ROOT, 'getcollab-brand/package.json'),
  influencerPkg:  path.join(ROOT, 'getcollab-influencer/package.json'),
  brandApp:       path.join(ROOT, 'getcollab-brand/app.json'),
  influencerApp:  path.join(ROOT, 'getcollab-influencer/app.json'),
}

function bumpSemver(version, type) {
  const [major, minor, patch] = version.split('.').map(Number)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`
  throw new Error(`Unknown bump type: ${type}`)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
}

const bumpType = process.argv[2]
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node scripts/bump-version.js <patch|minor|major>')
  process.exit(1)
}

const rootPkg = readJson(FILES.rootPkg)
const currentVersion = rootPkg.version
const nextVersion = bumpSemver(currentVersion, bumpType)

console.log(`Bumping version: ${currentVersion} → ${nextVersion} (${bumpType})`)

// Update root package.json
rootPkg.version = nextVersion
writeJson(FILES.rootPkg, rootPkg)
console.log(`  ✓ package.json`)

// Update brand package.json
const brandPkg = readJson(FILES.brandPkg)
brandPkg.version = nextVersion
writeJson(FILES.brandPkg, brandPkg)
console.log(`  ✓ getcollab-brand/package.json`)

// Update influencer package.json
const influencerPkg = readJson(FILES.influencerPkg)
influencerPkg.version = nextVersion
writeJson(FILES.influencerPkg, influencerPkg)
console.log(`  ✓ getcollab-influencer/package.json`)

// Update brand app.json (expo.version only — buildNumber/versionCode managed by EAS)
const brandApp = readJson(FILES.brandApp)
brandApp.expo.version = nextVersion
writeJson(FILES.brandApp, brandApp)
console.log(`  ✓ getcollab-brand/app.json`)

// Update influencer app.json
const influencerApp = readJson(FILES.influencerApp)
influencerApp.expo.version = nextVersion
writeJson(FILES.influencerApp, influencerApp)
console.log(`  ✓ getcollab-influencer/app.json`)

// Git: stage, commit, tag
try {
  execSync(
    `git add package.json getcollab-brand/package.json getcollab-influencer/package.json getcollab-brand/app.json getcollab-influencer/app.json`,
    { cwd: ROOT, stdio: 'inherit' }
  )
  execSync(
    `git commit -m "chore: release v${nextVersion}"`,
    { cwd: ROOT, stdio: 'inherit' }
  )
  execSync(
    `git tag v${nextVersion}`,
    { cwd: ROOT, stdio: 'inherit' }
  )
  console.log(`\n✅ Version bumped to ${nextVersion} and tagged as v${nextVersion}`)
  console.log(`   Run "git push && git push --tags" to publish.`)
} catch (err) {
  console.log(`\n✅ Version files updated to ${nextVersion}`)
  console.log(`   Git commit/tag skipped (not a git repo or nothing to commit).`)
}
