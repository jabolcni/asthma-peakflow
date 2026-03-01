import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { ReadingRecord } from "../db/schema";

function csvValue(value: string | number | null) {
  if (value === null) {
    return "";
  }

  const stringValue = String(value).replace(/"/g, "\"\"");
  return `"${stringValue}"`;
}

export function buildCsv(readings: ReadingRecord[]) {
  const header = [
    "recorded_at",
    "trial_1",
    "trial_2",
    "trial_3",
    "feeling",
    "event_type",
    "event_note",
    "cough",
    "wheeze",
    "night_symptoms",
    "rescue_inhaler_puffs",
    "trigger_tags",
  ];

  const lines = readings.map((reading) =>
    [
      reading.recordedAt,
      reading.trial1,
      reading.trial2,
      reading.trial3,
      reading.feeling,
      reading.eventType,
      reading.eventNote,
      reading.cough ? 1 : 0,
      reading.wheeze ? 1 : 0,
      reading.nightSymptoms ? 1 : 0,
      reading.rescueInhalerPuffs,
      reading.triggerTags,
    ]
      .map(csvValue)
      .join(",")
  );

  return [header.join(","), ...lines].join("\n");
}

function makeExportFileName() {
  return `peak-flow-export-${new Date().toISOString().slice(0, 10)}.csv`;
}

export function writeCsvToDocuments(csv: string) {
  const file = new File(Paths.document, makeExportFileName());
  file.create({ overwrite: true, intermediates: true });
  file.write(csv);
  return file;
}

export async function shareCsvFile(file: File) {
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: "Share peak flow export",
  });
}

export async function saveCsvToPickedDirectory(csv: string) {
  const directory = await Directory.pickDirectoryAsync();
  const file = directory.createFile(makeExportFileName(), "text/csv");
  file.write(csv);
  return file;
}
