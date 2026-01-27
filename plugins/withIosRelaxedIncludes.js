// plugins/withIosRelaxedIncludes.js
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withIosRelaxedIncludes(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      let podfileContent = fs.readFileSync(podfilePath, "utf-8");

      // This block sets CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES
      // for all Pods targets during the post_install phase.
      const fixBlock = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

      // Insert the fix inside the existing post_install block
      if (
        !podfileContent.includes(
          "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES",
        )
      ) {
        // We look for the standard expo post_install line and append our fix after it
        if (podfileContent.includes("post_install do |installer|")) {
          podfileContent = podfileContent.replace(
            "post_install do |installer|",
            `post_install do |installer|${fixBlock}`,
          );
        } else {
          // Fallback: append a new post_install block if one wasn't found (rare in Expo)
          podfileContent += `
  post_install do |installer|
    ${fixBlock}
  end
`;
        }

        fs.writeFileSync(podfilePath, podfileContent);
      }
      return config;
    },
  ]);
};
