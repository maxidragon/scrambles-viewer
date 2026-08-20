#!/usr/bin/env node
// Sets expo.version (the user-facing version) in an app config.
//
// The release workflow calls this with the version from the release tag; you can
// also run it locally: node scripts/set-app-version.js 1.2.3
//
// android.versionCode / ios.buildNumber are NOT touched here — eas.json sets
// appVersionSource to "remote", so EAS increments those on its own servers.

const fs = require('fs');

const [version, file = 'app.json'] = process.argv.slice(2);

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Expected a version like 1.2.3, got: ${version || '(nothing)'}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(file, 'utf8'));

if (config.expo.version === version) {
  console.log(`${file} is already at ${version}`);
  process.exit(0);
}

config.expo.version = version;
fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
console.log(`Set expo.version to ${version} in ${file}`);
