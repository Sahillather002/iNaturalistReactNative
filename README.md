# iNaturalistReactNative ![test workflow](https://github.com/inaturalist/iNaturalistReactNative/actions/workflows/test.yml/badge.svg) ![iOS e2e workflow](https://github.com/inaturalist/iNaturalistReactNative/actions/workflows/e2e_ios.yml/badge.svg) ![Android e2e workflow](https://github.com/inaturalist/iNaturalistReactNative/actions/workflows/e2e_android.yml/badge.svg)

This is an official iNaturalist client written in React Native that will eventually replace our existing iOS and Android apps. Achieving parity with those established apps is taking some time, but we're getting there!

## Contributing
See [CONTRIBUTING](CONTRIBUTING.md) for guidelines on contributing to this project.

## Setup

### Requirements

* Xcode 13 or above
* [Android and iOS environment setup](https://reactnative.dev/docs/environment-setup) described in the RN docs

### Install packages and pods

1. Run `npm install`
1. Run `npx pod-install` or `cd ios && pod install` from the root directory
1. `cp env.example .env.staging` for staging and `cp env.example .env` for production and fill in appropriate values. This is not part of the code repo (contains secrets, such as OAuth client ID).
1. To run on Android, do this `cp android/example-keystore.properties android/keystore.properties`. Fill in the relevant values. If you are a member of iNat staff, get them from another member of iNat Staff.
1. Add AR Camera model and taxonomy files. The computer vision model files are not part of the code repo, and have to be installed. The app itself will load the model file with the filename specified in a .env file. On Android, the current file names are specified in these env variables `ANDROID_MODEL_FILE_NAME` and `ANDROID_TAXONOMY_FILE_NAME`. On iOS, the current file names are specified in these env variables `IOS_MODEL_FILE_NAME` and `IOS_TAXONOMY_FILE_NAME`. Currently, after a fresh clone of the repo, and copy of the env.example file, see above, you have to add the files following these steps:
    1. Add the example model files by executing `npm run add-example-model`. If that does not work continue with the next step.
    1. If the download script fails: The sample model files are available in this [`small_model.zip`](https://github.com/inaturalist/SeekReactNative/releases/tag/v2.9.1-138) file.
    1. On Android, these files are named `small_inception_tf1.tflite` and `small_export_tax.csv`. Create a camera folder within Android assets (i.e. `android/app/src/debug/assets/camera`) and place the files there.
    1. On iOS, these files are named `small_inception_tf1.mlmodel` and `small_export_tax.json` and should be added to the `ios` folder.

### Set up pre-commit hooks

1. We're using [Husky](https://typicode.github.io/husky/#/) to automatically run `eslint` before each commit. Run `npm run postinstall` to install Husky locally.

### Run build

1. Run `npm start -- --reset-cache` (`npm start` works too, but resetting the cache each time makes for a lot less build issues)
2. Run `npm run ios` or `npm run android`

### Running with staging environment

If you're on staff you can configure the app to read from and write to our staging server. Override `API_URL` to a staging API domain, either using local `.env.staging` file, or overriding the environment variable when calling `npm start`, e.g. `API_URL=http://example.com npm start -- --reset-cache`.

## Tests
We currently have three kinds of tests:

1. `tests/integration`: Tests the integration of multiple modules, e.g. a list of observation that makes requests to a mocked API, persists the response data in local storage, retrieves the data from local storage and renders components.
2. `tests/unit`: Tests only specific modules, like a single component, or a hook.
3. `e2e`: Tests user interactions on the finished app build running on the iOS simulator (see below).

### Unit tests & integration tests
We're using [Jest](https://jestjs.io/) and [React Native Testing Library](https://callstack.github.io/react-native-testing-library/) for most of our tests, [factoria](https://github.com/phanan/factoria) and [faker.js](https://github.com/Marak/faker.js/) to generate test data for use with mocks. `Local*` model factories represent locally persisted data, while `Remote*` factories represent that kinds of records we get from an API or external package.

```bash
# Run all tests
npm test

# Run test paths matching a pattern
npm test MyObs

# Run individual tests matching a pattern. Note the `--` to pass arguments to jest
npm test -- -t accessibility

# Update snapshots for a specific path
npm test Button.test.js -- --updateSnapshot
```

Note that you can run `npx jest` as well, but that will omit some environment variables we need to set for the test environment, so for consistent test runs please use `npm test`.

Also note that `i18next` needs to be initialized in individual test files (haven't figured out a way to await initialization before *all* tests, plus allowing tests to control initialization helps when testing different locales). Add `beforeAll( async ( ) => { await initI18next( ); } );` to a test file if it depends on localized text.

### E2E tests
We're using [Detox](https://wix.github.io/Detox/docs/introduction/getting-started/) for E2E tests. If you want to run the e2e tests on your local machine, make sure you follow the Detox environment setup instructions.

Then you have to populate `E2E_TEST_USERNAME` and `E2E_TEST_PASSWORD` in `.env` with real iNaturalist login credentials so the e2e test can actually authenticate.

Then you can run the tests:

```bash
# Build the app and run the tests
npm run e2e
```

If you don't have the iOS simulator the e2e tests are [configured](https://github.com/inaturalist/iNaturalistReactNative/blob/main/.detoxrc.js#L51) to use, you may need to create it in XCode 15: Go to Window > Devices and Simulators, click the Simulators tab, click the "+" button in the lower left, and create a simulator that matches the `device.simulator.device.type` setting in `.detoxrc.js`.

If you have built the app already for a previous test, and just want to run an updated test without changing the app code, you can run `npm run e2e:test`.

If you are running into some issues after the tests have been working for some time, try updating `applesimutils` with `brew update && brew upgrade applesimutils`.

If you want to run the Android tests you need to prepare your environment. Before you dive into the [setup](https://wix.github.io/Detox/docs/19.x/introduction/android-dev-env), know that alternatively you might find it easier setting up the required local emulator, preferrably an AOSP (Android Open Source Project) version, using Android Studio. Make sure the emulator has the same name as in the `.detoxrc.js` file.

Run `npm run e2e:build:android && npm run e2e:test:android` to build the APK for testing purposes and install and run it on the emulator with the name as stated in the `.detoxrc.js` file.

## Translations

### Adding new text

1. Add new strings in English to `src/i18n/strings.ftl` using [Fluent syntax](https://projectfluent.org/fluent/guide/), e.g.
    ```Fluent
    # Header for a paragraph describing projects
    ABOUT-PROJECTS = ABOUT
    # Text describing what projects are
    projects-description =
      Projects are really great, probably iNat's best feature.
    ```
    Try to match case and strike a balance between specificity and reusability when choosing a key. Please add context comments to help translators understand how the text is used, avoid variables whenever possible, and try to keep `strings.ftl` alphabetized by key.
1. Run `node src/i18n/i18ncli.js build` to build the JSON files i18next needs to access text in the app
1. In a commponent, use the `useTranslation` hook to reference your new string, e.g.
    ```jsx
    import { useTranslation } from "sharedHooks";
    const MyComponent = ( ) => {
      const { t } = useTranslation( );
      return (
        <View>
          <Text>{ t( "ABOUT-PROJECTS" ) }</Text>
          <Text>{ t( "projects-description" ) }</Text>
        </View>
      );
    };
    ````

### Translating text

We manage translations through Crowdin. Actually updating the translation files should be largely automated, but this is what it looks like to do it manually (you must have the [Crowdin CLI](https://github.com/crowdin/crowdin-cli) installed and have an [access token](https://crowdin.com/settings#api-key) associated with a Crowdin user that can post files to the specified project):

```bash
# Upload new strings. Source and destination paths are specified in crowdin.yml
crowdin upload --token YOUR_ACCESS_TOKEN --project-id YOUR_PROJECT_ID

# Download new translations and build for use in the app
crowdin download --token YOUR_ACCESS_TOKEN --project-id YOUR_PROJECT_ID
node src/i18n/i18ncli.js build
git add src/i18n/l10n/*
git commit -a -m "Updated translations"
```

## Styling
We're using Nativewind, a styling system for React Native based on Tailwind CSS. Check the [Nativewind documentation](https://www.nativewind.dev/) to see what styles can be used in RN.

## Icons

We have a custom set of icons stored as SVG files and compiled into a font. New icons should be included with issues in a ready-to-use form, but some editing may be required.

1. Add / edit SVGs to / in `src/images/icons/` (`git add` any new icons). Icon SVGs must meet the following requirements
  * `<svg>` element must have `width="24"` and `height="24"` attributes
  * No paths with `fill-rule="evenodd"` attribute or `fill-rule: evenodd styles`
1. `npm run icons`
1. Rebuild the app (you'll have newly-linked assets that won't hot reload)

## Troubleshooting

1. Run `npx react-native clean-project`. This will give you options to clean caches, clean builds, reinstall pods, and reinstall node_modules. Using this eliminates a lot of hard-to-diagnose build issues.
1. If you're running on an M series chip, you may need to install a specific version of NDK to the app to build for Android. See `android/build.gradle`


## Deploying

We use [fastlane](https://docs.fastlane.tools/) to help automate parts of the deployment process, which requires some additional setup.

### Setting up fastlane

1. Make a [Github personal access token](https://github.com/settings/tokens/) with repo access in the `GITHUB_API_TOKEN` environmental variable.
1. `cp android/example-keystore.properties android/keystore.properties` and fill in the relevant values provided by another member of iNat staff.
1. `cp fastlane/example-Appfile fastlane/Appfile` and fill in the relevant values provided by another member of iNat staff.
1. Work with iNat staff to either get a new Apple ID or associate an existing one with the iNat Apple development team
1. Sign in to Xcode with your Apple ID
1. Manage Certificates and add an Apple Distribution certificate associated with the iNaturalist team


### Using Fastlane

The current expectation is that we tag to freeze the code, bump the internal build number, and describe the changes represented by the tag. Then we release to make builds and publish on Github. Later, presumably when some of the change logs have been translated, we push builds for internal testing. If that looks ok, we push to public testing, and later to production release.

```zsh
# Make a git tag. This will bump the build number and prompt you to describe
# what changed, which will be used for the eventual github release
# description and changelogs uploaded to the app stores.
fastlane tag

# Make a github release. This will make relevant builds, a github release, and
# add build files to the release
fastlane release

# Upload the build for the latest tag for internal testing
fastlane internal

# Upload the build for the latest tag for public testing (promotes latest
# internal build to open testing)
fastlane beta

# Upload the build for the latest tag to production release. In Android, this
# should just promote the last beta to prod.
fastlane prod
```

### Example: Build & Release for Internal Testing

1. Ensure all tests are passing on the main branch
1. Manual testing
    1. Install a "Release" build on an iOS device
        1. Online
            1. Sign in
            1. Make an observation by taking a new photo
            1. Make an observation by importing an existing
            1. Make an observation without a photo
            1. Upload
        1. Offline
            1. Go into airplane mode
            1. Make an observation by taking a new photo
            1. Make an observation by importing an existing
            1. Make an observation without a photo
            1. Turn off airplane mode
            1. Upload
    1. Install a "release" build on an Android device and repeat iOS steps
1. Write release notes based on commits since the last release. Try to keep them brief but emphasize what's new and what's fixed. Just keep them in a text editor; you'll save them at a later step.
1. Edit `package.json` and update the `version` per semantic versioning rules: bump the patch version if the only changes were bug fixes, bump minor version if there were new features, and bump the major version if the app was completely re-written or can't import data from previous versions.
1. `npm install` to set the version in `package-lock.json`
1. Commit changes
1. `bundle exec fastlane tag` to create a tag and bump the build number. You'll be prompted to enter those release notes you wrote. (:wq to save and exit)
1. `bundle exec fastlane release` to build and push a release to Github
1. `bundle exec fastlane internal` to distribute the builds to TestFlight and the Play Store
