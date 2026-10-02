import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function checkDeployAssets(source = 'public/assets', output = 'dist/assets') {
  const required = [
    'branding/pfp-approved-v01.png',
    'environments/order-assembly-desktop-v01.webp',
    'environments/order-assembly-mobile-v01.webp',
  ];
  for (const asset of required) {
    if (!existsSync(join(source, asset))) throw new Error(`Production asset is missing: ${asset}`);
  }
  const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const files = [];
  function inspect(directory = '') {
    for (const entry of readdirSync(join(source, directory), { withFileTypes: true })) {
      const asset = join(directory, entry.name);
      if (entry.isDirectory()) inspect(asset);
      else if (entry.isFile()) {
        if (!existsSync(join(output, asset))) throw new Error(`Built asset is missing: ${asset}`);
        if (digest(join(source, asset)) !== digest(join(output, asset)))
          throw new Error(`Built asset differs from its source: ${asset}`);
        files.push(asset.replaceAll('\\', '/'));
      }
    }
  }
  inspect();
  return files;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const files = checkDeployAssets();
    console.log(`Verified ${files.length} production assets in dist/assets.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
