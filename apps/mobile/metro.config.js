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

// pnpm: Metro must follow symlinks to resolve packages (e.g. expo-linear-gradient)
// config.resolver.unstable_enableSymlinks = true;

// // Explicitly resolve expo-linear-gradient (pnpm symlinks can still fail in Metro dev)
// try {
//   const gradPath = path.dirname(
//     require.resolve("expo-linear-gradient/package.json", {
//       paths: [projectRoot, workspaceNodeModules],
//     })
//   );
//   config.resolver.extraNodeModules = {
//     ...config.resolver.extraNodeModules,
//     "expo-linear-gradient": gradPath,
//   };
// } catch {
//   // fallback: use project node_modules symlink
//   config.resolver.extraNodeModules = {
//     ...config.resolver.extraNodeModules,
//     "expo-linear-gradient": path.join(projectRoot, "node_modules", "expo-linear-gradient"),
//   };
// }

// Fix for Jotai: disable package exports to avoid import.meta issues
config.resolver.unstable_enablePackageExports = false;

module.exports = config;