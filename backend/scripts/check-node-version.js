#!/usr/bin/env node

const requiredMajor = 24;
const currentMajor = parseInt(process.versions.node.split('.')[0], 10);

if (currentMajor < requiredMajor) {
  console.error(
    `\x1b[31m[ERROR] MANVIA requires Node.js v${requiredMajor} LTS or higher. Current version: ${process.version}\x1b[0m`,
  );
  process.exit(1);
} else {
  console.log(
    `\x1b[32m[OK] Node.js version check passed: ${process.version} (satisfies >= v${requiredMajor})\x1b[0m`,
  );
}
