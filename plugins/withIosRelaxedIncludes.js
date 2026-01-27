const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withIosRelaxedIncludes = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, "Podfile");
      const contents = await fs.promises.readFile(file, "utf8");

      // Robust fix for Firebase + Static Frameworks missing RN headers
      // We add multiple search paths to ensure RCTBridgeModule.h is found.
      const fixScript = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        
        # Add comprehensive search paths for React Native headers
        config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited)'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/Headers/Public/React-Core"'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/Headers/Public/React-bridging/react/bridging"'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/Headers/Public/React-cxxreact"'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/Headers/Public/React-callinvoker"'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/Headers/Public/React-runtimeexecutor"'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/Headers/Public/Yoga"'
        config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/Headers/Public/React-hermes"'
      end
    end
      `;

      // Prevent duplicate injection
      if (
        contents.includes(
          "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES",
        )
      ) {
        return config;
      }

      let newContents = contents;
      // Inject inside the existing post_install block
      if (contents.includes("post_install do |installer|")) {
        newContents = contents.replace(
          "post_install do |installer|",
          `post_install do |installer|
${fixScript}`,
        );
      } else {
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
