const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withIosRelaxedIncludes = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfile = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      let contents = fs.readFileSync(podfile, "utf-8");

      const fixScript = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'

      # Add explicit search paths for React headers to fix missing macros like RCT_EXPORT_METHOD
      config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited)'
      config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/Headers/Public/React-Core"'
      config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/Headers/Public/React-bridging/react/bridging"'
    end
  end
`;

      if (
        contents.includes(
          "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES",
        ) &&
        contents.includes("Headers/Public/React-Core")
      ) {
        return config;
      }

      if (contents.includes("post_install do |installer|")) {
        contents = contents.replace(
          "post_install do |installer|",
          `post_install do |installer|${fixScript}`,
        );
      } else {
        contents += `
post_install do |installer|
${fixScript}
end
`;
      }

      fs.writeFileSync(podfile, contents);
      return config;
    },
  ]);
};

module.exports = withIosRelaxedIncludes;
