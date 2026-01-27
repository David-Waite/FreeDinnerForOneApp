const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withIosRelaxedIncludes = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, "Podfile");
      const contents = await fs.promises.readFile(file, "utf8");

      // Prevent duplicate injection if this runs multiple times
      if (contents.includes("added by withIosRelaxedIncludes")) {
        return config;
      }

      // The fix script to inject into the Podfile
      // 1. We use $(PODS_ROOT) so Xcode handles the variable, not JS.
      // 2. We enable non-modular includes so Frameworks can see React headers.
      const fixScript = `
    # added by withIosRelaxedIncludes
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # Fix missing header search paths for specific pods
        config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited)'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/Headers/Public/React-Core"'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/Headers/Public/React-bridging/react/bridging"'
        
        # Critical for Firebase/React Native with use_frameworks!
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
      `;

      let newContents = contents;
      // Inject into the existing post_install block used by Expo
      if (contents.includes("post_install do |installer|")) {
        newContents = contents.replace(
          "post_install do |installer|",
          `post_install do |installer|${fixScript}`,
        );
      } else {
        // Fallback: If no post_install block exists, append one
        newContents += `
          post_install do |installer|
            ${fixScript}
          end
        `;
      }

      await fs.promises.writeFile(file, newContents);
      return config;
    },
  ]);
};

module.exports = withIosRelaxedIncludes;
