# Carry Android Alpha

Carry's Android alpha is distributed as a standalone signed APK using Expo EAS internal distribution. It does not require Expo Go or a local Metro server.

## One-time repository setup

The GitHub workflow authenticates to Expo with a personal access token.

1. In Expo, create an access token from your account settings.
2. In GitHub, open `tomcwxyz/Carry` → **Settings** → **Secrets and variables** → **Actions**.
3. Add a repository secret named `EXPO_TOKEN` containing the Expo token.

The workflow runs `eas init --force --non-interactive`, so the first successful run creates or links the EAS project for the `carry` slug automatically under the account represented by the token.

## Build an APK

Open **Actions** → **Android Alpha APK** → **Run workflow** on `main`.

The workflow:

1. installs the current dependencies;
2. links/creates the EAS project;
3. builds the `alpha` internal-distribution profile;
4. waits for EAS to finish;
5. downloads the signed APK;
6. uploads it as a workflow artifact; and
7. publishes it as a GitHub pre-release named `Carry Android Alpha #<run>`.

The APK is built with:

- Android package: `uk.co.goodship.carry`
- API: `https://carry-gilt.vercel.app`
- distribution: internal
- artifact: APK
- Android version code: managed and incremented remotely by EAS

## Install

On the Android phone, open the latest Carry Android Alpha pre-release in GitHub and download `Carry-alpha.apk`. Android may ask you to allow installation from the browser or GitHub app used to download it.

## Local alternative

With EAS CLI authenticated locally:

```powershell
npx eas-cli init
npx eas-cli build --platform android --profile alpha
```

EAS provides an internal install URL when the build completes.
