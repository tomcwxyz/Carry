import fs from 'node:fs';

const payload = JSON.parse(fs.readFileSync('eas-build.json', 'utf8'));
const build = Array.isArray(payload) ? payload[0] : payload;

if (!build) {
  throw new Error('EAS did not return a build');
}

const apkUrl =
  build.artifacts?.buildUrl ??
  build.artifacts?.applicationArchiveUrl ??
  build.artifacts?.applicationArchiveURL;

if (!apkUrl) {
  throw new Error(`EAS build completed without an APK URL: ${JSON.stringify(build)}`);
}

const buildPage =
  build.buildDetailsPageUrl ??
  build.detailsPageUrl ??
  build.url ??
  '';

const output = process.env.GITHUB_OUTPUT;
if (output) {
  fs.appendFileSync(output, `apk_url=${apkUrl}\n`);
  fs.appendFileSync(output, `build_page=${buildPage}\n`);
}

console.log(`APK: ${apkUrl}`);
if (buildPage) console.log(`Build: ${buildPage}`);
