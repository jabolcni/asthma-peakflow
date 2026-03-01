import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { BackupPayload } from "../db/db";

function makeBackupFileName() {
  return `peak-flow-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export function serializeBackup(payload: BackupPayload) {
  return JSON.stringify(payload, null, 2);
}

export function writeBackupToDocuments(json: string) {
  const file = new File(Paths.document, makeBackupFileName());
  file.create({ overwrite: true, intermediates: true });
  file.write(json);
  return file;
}

export async function shareBackupFile(file: File) {
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: "Back up peak flow data",
  });
}

export async function pickBackupJson() {
  const picked = await File.pickFileAsync(undefined, "application/json");
  const file = Array.isArray(picked) ? picked[0] : picked;

  if (!file) {
    throw new Error("No backup file was selected.");
  }

  const text = await file.text();
  return JSON.parse(text);
}
