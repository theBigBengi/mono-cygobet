const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: extend watchFolders to include workspace root
config.watchFolders = [...(config.watchFolders || []), workspaceRoot];

// Monorepo: extend nodeModulesPaths for workspace resolution
const workspaceNodeModules = path.resolve(workspaceRoot, "node_modules");
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  workspaceNodeModules,
];

// Fix for Jotai: disable package exports to avoid import.meta issues
config.resolver.unstable_enablePackageExports = false;

module.exports = config;