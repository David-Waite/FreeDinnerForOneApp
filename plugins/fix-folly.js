const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function (config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, "Podfile");
      const contents = await fs.promises.readFile(file, "utf8");

      // The fix: Disable coroutines to prevent looking for the missing header
      const fix = `
      installer.pods_project.targets.each do |target|
        target.build_configurations.each do |config|
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] ||= '$(inherited)'
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] << ' -DFOLLY_CFG_NO_COROUTINES=1'
          config.build_settings['OTHER_CFLAGS'] ||= '$(inherited)'
          config.build_settings['OTHER_CFLAGS'] << ' -DFOLLY_CFG_NO_COROUTINES=1'
        end
      end
      `;

      if (!contents.includes("DFOLLY_CFG_NO_COROUTINES=1")) {
        // Insert the fix inside the existing post_install block
        const newContents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|
${fix}`,
        );
        await fs.promises.writeFile(file, newContents, "utf8");
      }
      return config;
    },
  ]);
};
