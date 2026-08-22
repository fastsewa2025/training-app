const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Support @/ and @shared/ path aliases defined in tsconfig.json
config.resolver.alias = {
  "@": path.resolve(__dirname, "client/src"),
  "@shared": path.resolve(__dirname, "shared"),
};

// Allow importing from the shared/ folder outside client/
config.watchFolders = [
  path.resolve(__dirname, "shared"),
  path.resolve(__dirname, "client/src"),
];

module.exports = config;
