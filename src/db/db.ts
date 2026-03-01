import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

import {
  CREATE_SETTINGS_TABLE_SQL,
  CREATE_READINGS_TABLE_SQL,
  DB_NAME,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type ReadingInsert,
  type ReadingRecord,
} from "./schema";

let database: SQLiteDatabase | null = null;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getDatabase() {
  if (!database) {
    database = openDatabaseSync(DB_NAME);
    database.execSync(CREATE_READINGS_TABLE_SQL);
    database.execSync(CREATE_SETTINGS_TABLE_SQL);
    ensureReadingColumns(database);
  }

  return database;
}

function ensureReadingColumns(db: SQLiteDatabase) {
  const migrationStatements = [
    "ALTER TABLE readings ADD COLUMN cough INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE readings ADD COLUMN wheeze INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE readings ADD COLUMN nightSymptoms INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE readings ADD COLUMN rescueInhalerPuffs INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE readings ADD COLUMN triggerTags TEXT NOT NULL DEFAULT ''",
  ];

  migrationStatements.forEach((statement) => {
    try {
      db.execSync(statement);
    } catch {
      // Column already exists on upgraded installs.
    }
  });
}

export function initializeDatabase() {
  getDatabase();
}

export function formatLocalTimestamp(value: Date) {
  const year = value.getFullYear();
  const month = pad(value.getMonth() + 1);
  const day = pad(value.getDate());
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());
  const seconds = pad(value.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function parseStoredTimestamp(value: string) {
  if (value.endsWith("Z")) {
    return new Date(value);
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hours, minutes, seconds = "00"] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  );
}

export function insertReading(input: ReadingInsert) {
  const db = getDatabase();

  const result = db.runSync(
    `
      INSERT INTO readings (
        recordedAt,
        trial1,
        trial2,
        trial3,
        feeling,
        eventType,
        eventNote,
        cough,
        wheeze,
        nightSymptoms,
        rescueInhalerPuffs,
        triggerTags
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.recordedAt,
      input.trial1,
      input.trial2,
      input.trial3,
      input.feeling,
      input.eventType,
      input.eventNote,
      Number(input.cough),
      Number(input.wheeze),
      Number(input.nightSymptoms),
      input.rescueInhalerPuffs,
      input.triggerTags,
    ]
  );

  return result.lastInsertRowId;
}

export function getAllReadings() {
  const db = getDatabase();
  const rows = db.getAllSync<
    Omit<ReadingRecord, "cough" | "wheeze" | "nightSymptoms"> & {
      cough: number;
      wheeze: number;
      nightSymptoms: number;
    }
  >(
    `
      SELECT
        id,
        recordedAt,
        trial1,
        trial2,
        trial3,
        feeling,
        eventType,
        eventNote,
        cough,
        wheeze,
        nightSymptoms,
        rescueInhalerPuffs,
        triggerTags
      FROM readings
      ORDER BY recordedAt ASC, id ASC
    `
  );

  return rows.map((row) => ({
    ...row,
    cough: Boolean(row.cough),
    wheeze: Boolean(row.wheeze),
    nightSymptoms: Boolean(row.nightSymptoms),
  }));
}

export function updateReading(id: number, input: ReadingInsert) {
  const db = getDatabase();

  db.runSync(
    `
      UPDATE readings
      SET
        recordedAt = ?,
        trial1 = ?,
        trial2 = ?,
        trial3 = ?,
        feeling = ?,
        eventType = ?,
        eventNote = ?,
        cough = ?,
        wheeze = ?,
        nightSymptoms = ?,
        rescueInhalerPuffs = ?,
        triggerTags = ?
      WHERE id = ?
    `,
    [
      input.recordedAt,
      input.trial1,
      input.trial2,
      input.trial3,
      input.feeling,
      input.eventType,
      input.eventNote,
      Number(input.cough),
      Number(input.wheeze),
      Number(input.nightSymptoms),
      input.rescueInhalerPuffs,
      input.triggerTags,
      id,
    ]
  );
}

export function deleteReading(id: number) {
  const db = getDatabase();
  db.runSync("DELETE FROM readings WHERE id = ?", [id]);
}

type SettingsRow = {
  key: string;
  value: string | null;
};

const BOOLEAN_SETTING_KEYS = new Set<keyof AppSettings>([
  "morningReminderEnabled",
  "eveningReminderEnabled",
]);

const NUMBER_SETTING_KEYS = new Set<keyof AppSettings>(["personalBest"]);

export function getAppSettings(): AppSettings {
  const db = getDatabase();
  const rows = db.getAllSync<SettingsRow>("SELECT key, value FROM app_settings");
  const settings: AppSettings = { ...DEFAULT_APP_SETTINGS };

  rows.forEach((row) => {
    const key = row.key as keyof AppSettings;

    if (!(key in settings) || row.value === null) {
      return;
    }

    if (BOOLEAN_SETTING_KEYS.has(key)) {
      settings[key] = (row.value === "true") as never;
      return;
    }

    if (NUMBER_SETTING_KEYS.has(key)) {
      settings[key] = Number(row.value) as never;
      return;
    }

    settings[key] = row.value as never;
  });

  return settings;
}

export function updateAppSettings(patch: Partial<AppSettings>) {
  const db = getDatabase();
  const entries = Object.entries(patch) as [keyof AppSettings, AppSettings[keyof AppSettings]][];

  entries.forEach(([key, value]) => {
    db.runSync(
      `
        INSERT INTO app_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
      [key, value === null ? null : String(value)]
    );
  });
}
