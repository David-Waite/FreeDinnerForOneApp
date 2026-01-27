const { withPodfile } = require("expo/config-plugins");

const withIosRelaxedIncludes = (config) => {
  return withPodfile(config, (config) => {
    const podfileContents = config.modResults.contents;

    // This setting tells Xcode to allow Frameworks (like Firebase) to import
    // non-modular headers (like React Native).
    const buildSetting = `
      installer.pods_project.targets.each do |target|
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    `;

    // Inject this setting into the existing post_install block
    if (podfileContents.includes("post_install do |installer|")) {
      config.modResults.contents = podfileContents.replace(
        "post_install do |installer|",
        `post_install do |installer|\n${buildSetting}`,
      );
    } else {
      // Fallback: If for some reason there isn't one, add it to the end
      config.modResults.contents += `
        post_install do |installer|
          ${buildSetting}
        end
      `;
    }

    return config;
  });
};

module.exports = withIosRelaxedIncludes;
