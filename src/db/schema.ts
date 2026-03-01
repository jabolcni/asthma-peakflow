export const DB_NAME = "peak-flow.db";

export const EVENT_TYPES = ["illness", "exercise", "medication", "note"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type FeelingScore = 1 | 2 | 3 | 4 | 5;

export const TRIGGER_TAGS = ["pollen", "cold-air", "smoke"] as const;

export type TriggerTag = (typeof TRIGGER_TAGS)[number];

export type ReadingInsert = {
  recordedAt: string;
  trial1: number;
  trial2: number;
  trial3: number;
  feeling: FeelingScore;
  eventType: EventType | null;
  eventNote: string | null;
  cough: boolean;
  wheeze: boolean;
  nightSymptoms: boolean;
  rescueInhalerPuffs: number;
  triggerTags: string;
};

export type ReadingRecord = ReadingInsert & {
  id: number;
};

export type ReminderSlot = "morning" | "evening";

export type AppSettings = {
  personalBest: number;
  morningReminderTime: string;
  morningReminderEnabled: boolean;
  morningReminderId: string | null;
  eveningReminderTime: string;
  eveningReminderEnabled: boolean;
  eveningReminderId: string | null;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  personalBest: 500,
  morningReminderTime: "08:00",
  morningReminderEnabled: false,
  morningReminderId: null,
  eveningReminderTime: "20:00",
  eveningReminderEnabled: false,
  eveningReminderId: null,
};

export const CREATE_READINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recordedAt TEXT NOT NULL,
    trial1 INTEGER NOT NULL,
    trial2 INTEGER NOT NULL,
    trial3 INTEGER NOT NULL,
    feeling INTEGER NOT NULL,
    eventType TEXT,
    eventNote TEXT,
    cough INTEGER NOT NULL DEFAULT 0,
    wheeze INTEGER NOT NULL DEFAULT 0,
    nightSymptoms INTEGER NOT NULL DEFAULT 0,
    rescueInhalerPuffs INTEGER NOT NULL DEFAULT 0,
    triggerTags TEXT NOT NULL DEFAULT ''
  );
`;

export const CREATE_SETTINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
`;
