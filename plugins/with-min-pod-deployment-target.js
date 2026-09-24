// Xcode 27 rejects pod targets whose deployment target is below 15.0 (older
// Xcode only warned). Some pods — SDWebImage (expo-image), Sentry, RNCAsyncStorage
// resources — still declare 9.0–13.4, so raise every pod target to the app's minimum.
// Lives outside both apps, so resolve expo from the app being configured.
const { withPodfile } = require(require.resolve('expo/config-plugins', { paths: [process.cwd()] }))

const MARKER = '# with-min-pod-deployment-target'
const MIN = '15.1'

module.exports = function withMinPodDeploymentTarget(config) {
  return withPodfile(config, (cfg) => {
    let podfile = cfg.modResults.contents
    if (podfile.includes(MARKER)) return cfg
    const hook = 'post_install do |installer|\n'
    if (!podfile.includes(hook)) throw new Error('with-min-pod-deployment-target: post_install hook not found in Podfile')
    podfile = podfile.replace(
      hook,
      `${hook}    ${MARKER}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${MIN}
          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN}'
        end
      end
    end
`
    )
    cfg.modResults.contents = podfile
    return cfg
  })
}
