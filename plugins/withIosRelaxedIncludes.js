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

      // The ruby code we want to inject to relax the compiler
      const fixScript = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
      `;

      // If the fix is already there, don't add it again
      if (
        contents.includes(
          "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES",
        )
      ) {
        return config;
      }

      // Inject the fix into the post_install block
      if (contents.includes("post_install do |installer|")) {
        contents = contents.replace(
          "post_install do |installer|",
          `post_install do |installer|${fixScript}`,
        );
      } else {
        // Fallback if no post_install block exists (rare but possible)
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
