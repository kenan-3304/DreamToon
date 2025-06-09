// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // Tell Metro to use the SVG transformer
  config.transformer.babelTransformerPath = require.resolve(
    "react-native-svg-transformer"
  );

  // Remove 'svg' from asset extensions, add it to source extensions
  config.resolver.assetExts = config.resolver.assetExts.filter(
    (ext) => ext !== "svg"
  );
  config.resolver.sourceExts.push("svg");

  return config;
})();
