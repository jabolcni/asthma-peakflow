# Asthma Peak Flow Tracker

Asthma Peak Flow Tracker is a native-focused Expo / React Native app for recording peak flow meter readings and reviewing trends over time on Android.

The app is designed for quick daily use:

- log one reading with date and time
- record three peak flow trials
- record a 1-5 feeling score with emoji-based UI
- optionally add events such as illness, exercise, medication, or notes
- optionally add symptom/context details such as cough, wheeze, night symptoms, rescue inhaler use, and trigger tags
- review trend lines for max, min, and mean peak flow
- export local data as CSV
- back up data as JSON and restore it with merge behavior
- edit or delete saved readings
- set local reminders for morning and evening use (development build required for notifications)

## Main Features

### Log Entry

The `Log entry` tab is the main daily screen.

- three peak flow sliders in 5-unit steps from 200 to 700
- manual date and time selection
- feeling score input (1-5)
- expandable event section
- symptom/context section
- local save to SQLite on the device

### Trends

The `Trends` tab shows saved data over time.

- range filters: all time, last 30 days, last 7 days
- chart lines:
  - green = maximum of the three trials
  - red = minimum of the three trials
  - blue = average of the three trials
- summary metrics for 7-day mean, 30-day mean, and variability
- automatic insight messages based on recent history
- recent history editor with inline edit/delete
- CSV export for local storage or sharing
- JSON backup to Google Drive or other file-based cloud storage via the share sheet
- JSON restore with merge (adds only missing readings)

## Tech Stack

- Expo SDK 54
- React Native
- Expo Router
- Expo SQLite
- Expo File System
- Expo Sharing
- Expo Notifications
- `@react-native-community/datetimepicker`

## Project Structure

- [app](/c:/Users/Janez/asthma-peakflow/app): Expo Router routes
- [src/screens](/c:/Users/Janez/asthma-peakflow/src/screens): main screen implementations
- [src/components](/c:/Users/Janez/asthma-peakflow/src/components): reusable form and UI components
- [src/db](/c:/Users/Janez/asthma-peakflow/src/db): SQLite schema and persistence helpers
- [src/export](/c:/Users/Janez/asthma-peakflow/src/export): CSV export helpers
- [src/notifications](/c:/Users/Janez/asthma-peakflow/src/notifications): reminder scheduling logic

## Requirements

Before building or running:

- Node.js 18+ recommended
- npm
- Expo CLI tools (via `npx expo ...` or installed tooling)
- EAS CLI for cloud or local native builds
- Android phone or Android emulator for realistic testing

## Install Dependencies

```bash
npm install
```

## Run the App Locally

Start the Metro bundler:

```bash
npx expo start
```

Useful variants:

```bash
npx expo start -c
npx expo start --android
```

Notes:

- `-c` clears the bundler cache, which is useful after routing or plugin changes.
- The app uses Expo Router, so the actual entry point is `expo-router/entry`.

## Local Testing

### Expo Go

You can use Expo Go for basic UI testing:

- logging readings
- editing history
- trends and exports
- SQLite storage

Limitation:

- reminders use `expo-notifications` and are not fully supported in Expo Go on Android
- in Expo Go, reminder actions fail gracefully with a message instead of crashing

### Development Build

For full Android testing, especially reminders, use a development build.

Create and install one with:

```bash
eas build -p android --profile development
```

Then install the generated build on your device and run:

```bash
npx expo start --dev-client
```

This is the preferred workflow when testing notifications and other native modules.

## Build an Android App

You already used the correct general flow:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

### Build Profiles

The project currently uses these EAS profiles from [eas.json](/c:/Users/Janez/asthma-peakflow/eas.json):

- `development`: development client build for internal testing
- `preview`: internal distribution build for installable testing builds
- `production`: production-ready release build

### Recommended Android Build Commands

Internal test build:

```bash
eas build -p android --profile preview
```

Development client:

```bash
eas build -p android --profile development
```

Production build:

```bash
eas build -p android --profile production
```

## Install on Your Phone

After EAS finishes:

1. Download the generated APK or install link from Expo.
2. Open the link on your Android phone.
3. Install the build.
4. If Android blocks the install, allow installs from that source temporarily.

For internal distribution builds, EAS usually gives you a direct install page.

## Common Build / Runtime Notes

### Unmatched Route

If you see `Unmatched Route`, it usually means the root `/` route is missing in Expo Router.

This project already includes:

- `app/index.tsx` redirecting to `/log`
- `app/(tabs)/index.tsx` redirecting to `/log`

### Hidden Index Tab

The tab-group `index` route is hidden intentionally so it does not show as a third tab in the bottom bar.

### Notifications in Expo Go

If reminders do not work in Expo Go, that is expected.

Use a development build instead:

```bash
eas build -p android --profile development
```

## Linting

Run:

```bash
npm run lint
```

This uses Expo ESLint configuration and should stay clean before pushing or building.

## Data Storage

The app stores data locally on the device using SQLite.

Stored reading data includes:

- timestamp
- three trials
- feeling score
- event type and event note
- cough / wheeze / night symptoms
- rescue inhaler puff count
- trigger tags

Exports are created as CSV so they can be opened in Excel or shared to other apps.

Backups are also available as JSON snapshots.

- JSON backups can be shared to Google Drive or other cloud storage apps using the native share sheet
- JSON restore merges only missing readings into local storage
- restore is additive, not destructive
- reminder times are included in backup metadata

## Backup and Restore

The `Trends` tab includes file-based backup and restore actions.

### Backup JSON

Use `Backup JSON to Drive` to:

1. create a JSON snapshot of the current local data
2. open the Android share sheet
3. save the backup to Google Drive or another file storage app

The backup includes:

- all readings
- event and symptom/context fields
- reminder time settings

### Restore JSON

Use `Restore JSON` to:

1. pick a previously exported JSON backup file
2. import it into the app
3. merge only readings that do not already exist locally

Restore behavior:

- existing local readings are kept
- duplicate readings are skipped
- only missing readings are added
- this is a merge, not a full overwrite

## Suggested Test Checklist

Before publishing or sharing builds, test at least the following:

1. Open app and confirm it launches directly to `Log entry`.
2. Save a reading and confirm it appears in `Trends`.
3. Change date and time manually and confirm saved timestamps are correct.
4. Add event note and symptom/context fields and confirm they appear in history and marker details.
5. Edit an old reading and confirm changes persist after app restart.
6. Delete a reading and confirm it is removed from trends and history.
7. Export CSV and verify the file contains all columns.
8. Run JSON backup and verify it can be shared to Google Drive.
9. Restore a JSON backup and confirm only missing readings are merged.
10. In a development build, enable reminders and confirm notification scheduling works.

## GitHub Upload Notes

Before uploading to GitHub:

1. Run `npm run lint`.
2. Confirm `package-lock.json` is committed together with `package.json`.
3. Make sure any local-only secrets or credentials are not in the repository.
4. Include this README so the repository explains how to run and build the app.

## Roadmap

Possible next steps to improve and expand the app:

1. Add a dedicated history tab with search, filters, and bulk export.
2. Add PDF doctor reports in addition to CSV export.
3. Add automatic scheduled backups or visible backup history.
4. Add medication plans and adherence tracking beyond rescue inhaler use.
5. Add trigger customization so users can define their own trigger tags.
6. Add richer trend analytics such as rolling averages, best-day summaries, and symptom correlation.
7. Add clinician-oriented summaries such as weekly symptom burden and rescue inhaler frequency.
8. Add localization for different languages and regional date/time formats.
9. Improve accessibility with larger controls, high-contrast themes, and screen reader tuning.
10. Add secure app lock and optional encrypted backup for more privacy-sensitive use.
