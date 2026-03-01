import React, { useMemo, useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Line, Polygon, Polyline, Text as SvgText } from "react-native-svg";

import { EventExpander, getEventColor, getEventLabel } from "../components/EventExpander";
import { FeelingSlider } from "../components/FeelingSlider";
import { SymptomContextFields } from "../components/SymptomContextFields";
import { VolumeSlider } from "../components/VolumeSlider";
import {
  buildBackupPayload,
  deleteReading,
  formatLocalTimestamp,
  getAllReadings,
  initializeDatabase,
  mergeBackupPayload,
  parseStoredTimestamp,
  updateReading,
} from "../db/db";
import type { EventType, FeelingScore, ReadingRecord } from "../db/schema";
import {
  pickBackupJson,
  serializeBackup,
  shareBackupFile,
  writeBackupToDocuments,
} from "../export/backup";
import {
  buildCsv,
  saveCsvToPickedDirectory,
  shareCsvFile,
  writeCsvToDocuments,
} from "../export/csv";

type RangeKey = "all" | "30d" | "7d";
type EditPickerState = null | "date" | "time";

type TrendPoint = ReadingRecord & {
  average: number;
  maximum: number;
  minimum: number;
  stdDev: number;
};

type EditDraft = {
  id: number;
  timestamp: Date;
  trial1: number;
  trial2: number;
  trial3: number;
  feeling: FeelingScore;
  eventType: EventType | null;
  eventNote: string;
  cough: boolean;
  wheeze: boolean;
  nightSymptoms: boolean;
  rescueInhalerPuffs: number;
  triggerTags: string[];
};

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "30d", label: "Last 30 days" },
  { key: "7d", label: "Last 7 days" },
];

const CHART_WIDTH = 320;
const CHART_HEIGHT = 220;
const LEFT_PAD = 38;
const RIGHT_PAD = 18;
const TOP_PAD = 18;
const BOTTOM_PAD = 28;

function toTrendPoint(reading: ReadingRecord): TrendPoint {
  const values = [reading.trial1, reading.trial2, reading.trial3];
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;

  return {
    ...reading,
    average,
    maximum: Math.max(...values),
    minimum: Math.min(...values),
    stdDev: Math.sqrt(variance),
  };
}

function formatVolume(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value)} L/min`;
}

function computeMean(points: TrendPoint[]) {
  if (!points.length) {
    return null;
  }

  const total = points.reduce((sum, point) => sum + point.average, 0);
  return total / points.length;
}

function filterByDays(points: TrendPoint[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return points.filter((point) => parseStoredTimestamp(point.recordedAt).getTime() >= cutoff);
}

function filterBetweenDays(points: TrendPoint[], newerDays: number, olderDays: number) {
  const now = Date.now();
  const newerCutoff = now - newerDays * 24 * 60 * 60 * 1000;
  const olderCutoff = now - olderDays * 24 * 60 * 60 * 1000;

  return points.filter((point) => {
    const timestamp = parseStoredTimestamp(point.recordedAt).getTime();
    return timestamp < newerCutoff && timestamp >= olderCutoff;
  });
}

function parseTriggerTags(value: string) {
  if (!value.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function hasContextMarker(point: TrendPoint) {
  return (
    Boolean(point.eventType) ||
    Boolean(point.cough) ||
    Boolean(point.wheeze) ||
    Boolean(point.nightSymptoms) ||
    point.rescueInhalerPuffs > 0 ||
    Boolean(point.triggerTags.trim())
  );
}

function formatContextSummary(point: Pick<TrendPoint, "cough" | "wheeze" | "nightSymptoms" | "rescueInhalerPuffs" | "triggerTags">) {
  const parts: string[] = [];

  if (point.cough) {
    parts.push("cough");
  }
  if (point.wheeze) {
    parts.push("wheeze");
  }
  if (point.nightSymptoms) {
    parts.push("night symptoms");
  }
  if (point.rescueInhalerPuffs > 0) {
    parts.push(`${point.rescueInhalerPuffs} rescue puffs`);
  }

  const tags = parseTriggerTags(point.triggerTags);
  if (tags.length) {
    parts.push(`triggers: ${tags.join(", ")}`);
  }

  return parts.length ? parts.join(" | ") : "No added symptom context.";
}

export default function TrendsScreen() {
  initializeDatabase();

  const [range, setRange] = useState<RangeKey>("all");
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editPickerState, setEditPickerState] = useState<EditPickerState>(null);

  const refreshData = React.useCallback(() => {
    setReadings(getAllReadings());
  }, []);

  useFocusEffect(refreshData);

  const trendPoints = useMemo(() => readings.map(toTrendPoint), [readings]);

  const visiblePoints = useMemo(() => {
    if (range === "7d") {
      return filterByDays(trendPoints, 7);
    }

    if (range === "30d") {
      return filterByDays(trendPoints, 30);
    }

    return trendPoints;
  }, [range, trendPoints]);

  const summary = useMemo(() => {
    const last7 = filterByDays(trendPoints, 7);
    const last30 = filterByDays(trendPoints, 30);
    const visibleVariability =
      visiblePoints.length > 0
        ? visiblePoints.reduce((sum, point) => sum + point.stdDev, 0) / visiblePoints.length
        : null;

    return {
      mean7d: computeMean(last7),
      mean30d: computeMean(last30),
      variability: visibleVariability,
    };
  }, [trendPoints, visiblePoints]);

  const selectedMarkerPoint =
    visiblePoints.find((point) => point.id === selectedEventId && hasContextMarker(point)) ?? null;

  const insights = useMemo(() => {
    const recent7 = filterByDays(trendPoints, 7);
    const previous7 = filterBetweenDays(trendPoints, 7, 14);
    const recent7Mean = computeMean(recent7);
    const previous7Mean = computeMean(previous7);
    const recent7Variability =
      recent7.length > 0 ? recent7.reduce((sum, point) => sum + point.stdDev, 0) / recent7.length : null;
    const previous7Variability =
      previous7.length > 0
        ? previous7.reduce((sum, point) => sum + point.stdDev, 0) / previous7.length
        : null;
    const baselineMean = computeMean(filterByDays(trendPoints, 30)) ?? computeMean(trendPoints);
    const lowThreshold = baselineMean ? baselineMean * 0.8 : null;
    const lowReadings48h = trendPoints.filter((point) => {
      const timestamp = parseStoredTimestamp(point.recordedAt).getTime();
      const recentEnough = timestamp >= Date.now() - 48 * 60 * 60 * 1000;
      return recentEnough && lowThreshold !== null && point.maximum < lowThreshold;
    }).length;

    const messages: string[] = [];

    if (recent7Mean !== null && previous7Mean !== null && previous7Mean > 0) {
      const deltaPercent = ((recent7Mean - previous7Mean) / previous7Mean) * 100;
      const roundedDelta = Math.abs(Math.round(deltaPercent));
      if (deltaPercent <= -1) {
        messages.push(`7-day mean is down ${roundedDelta}% vs previous 7 days.`);
      } else if (deltaPercent >= 1) {
        messages.push(`7-day mean is up ${roundedDelta}% vs previous 7 days.`);
      } else {
        messages.push("7-day mean is steady versus the previous 7 days.");
      }
    } else {
      messages.push("Need at least two weeks of readings for week-over-week mean insight.");
    }

    if (recent7Variability !== null && previous7Variability !== null) {
      const delta = recent7Variability - previous7Variability;
      if (delta > 3) {
        messages.push("Variability increased this week.");
      } else if (delta < -3) {
        messages.push("Variability decreased this week.");
      } else {
        messages.push("Variability is stable this week.");
      }
    } else {
      messages.push("Need more recent history for a variability trend.");
    }

    if (lowThreshold !== null) {
      messages.push(`${lowReadings48h} low readings in the last 48 hours.`);
    } else {
      messages.push("Need a baseline before low-reading alerts can be estimated.");
    }

    return messages;
  }, [trendPoints]);

  const chart = useMemo(() => {
    if (!visiblePoints.length) {
      return null;
    }

    const values = visiblePoints.flatMap((point) => [point.minimum, point.average, point.maximum]);
    const yMin = Math.max(180, Math.floor(Math.min(...values) / 10) * 10 - 20);
    const yMax = Math.min(720, Math.ceil(Math.max(...values) / 10) * 10 + 20);
    const plotWidth = CHART_WIDTH - LEFT_PAD - RIGHT_PAD;
    const plotHeight = CHART_HEIGHT - TOP_PAD - BOTTOM_PAD;

    const xForIndex = (index: number) =>
      LEFT_PAD +
      (visiblePoints.length === 1 ? plotWidth / 2 : (index / (visiblePoints.length - 1)) * plotWidth);

    const yForValue = (value: number) => {
      const ratio = (value - yMin) / Math.max(1, yMax - yMin);
      return CHART_HEIGHT - BOTTOM_PAD - ratio * plotHeight;
    };

    const makePolyline = (selector: (point: TrendPoint) => number) =>
      visiblePoints.map((point, index) => `${xForIndex(index)},${yForValue(selector(point))}`).join(" ");

    const guides = [yMin, Math.round((yMin + yMax) / 2), yMax];

    return {
      guides,
      yForValue,
      xForIndex,
      maximumLine: makePolyline((point) => point.maximum),
      minimumLine: makePolyline((point) => point.minimum),
      averageLine: makePolyline((point) => point.average),
    };
  }, [visiblePoints]);

  const historyPoints = useMemo(() => [...trendPoints].reverse(), [trendPoints]);

  const onShareExport = async () => {
    try {
      const csv = buildCsv(readings);
      const file = writeCsvToDocuments(csv);
      await shareCsvFile(file);
    } catch (error) {
      Alert.alert("Export failed", error instanceof Error ? error.message : "Could not share file.");
    }
  };

  const onSaveExport = async () => {
    try {
      const csv = buildCsv(readings);
      const file = await saveCsvToPickedDirectory(csv);
      Alert.alert("Saved", `CSV stored at ${file.uri}`);
    } catch (error) {
      Alert.alert("Export failed", error instanceof Error ? error.message : "Could not save file.");
    }
  };

  const onBackupJson = async () => {
    try {
      const payload = buildBackupPayload();
      const json = serializeBackup(payload);
      const file = writeBackupToDocuments(json);
      await shareBackupFile(file);
    } catch (error) {
      Alert.alert("Backup failed", error instanceof Error ? error.message : "Could not create backup.");
    }
  };

  const onRestoreJson = async () => {
    try {
      const payload = await pickBackupJson();
      const mergedCount = mergeBackupPayload(payload);
      refreshData();
      Alert.alert("Restore complete", `Merged ${mergedCount} new reading${mergedCount === 1 ? "" : "s"}.`);
    } catch (error) {
      Alert.alert("Restore failed", error instanceof Error ? error.message : "Could not restore backup.");
    }
  };

  const startEditing = (reading: ReadingRecord) => {
    setEditingId(reading.id);
    setEditDraft({
      id: reading.id,
      timestamp: parseStoredTimestamp(reading.recordedAt),
      trial1: reading.trial1,
      trial2: reading.trial2,
      trial3: reading.trial3,
      feeling: reading.feeling,
      eventType: reading.eventType,
      eventNote: reading.eventNote ?? "",
      cough: reading.cough,
      wheeze: reading.wheeze,
      nightSymptoms: reading.nightSymptoms,
      rescueInhalerPuffs: reading.rescueInhalerPuffs,
      triggerTags: parseTriggerTags(reading.triggerTags),
    });
  };

  const handleDelete = (id: number) => {
    Alert.alert("Delete reading", "Remove this reading from history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteReading(id);
          if (editingId === id) {
            setEditingId(null);
            setEditDraft(null);
          }
          refreshData();
        },
      },
    ]);
  };

  const handleEditPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentMode = editPickerState;
    setEditPickerState(null);

    if (event.type !== "set" || !selectedDate || !editDraft || !currentMode) {
      return;
    }

    if (currentMode === "date") {
      const updated = new Date(editDraft.timestamp);
      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setEditDraft({ ...editDraft, timestamp: updated });
      return;
    }

    const updated = new Date(editDraft.timestamp);
    updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    setEditDraft({ ...editDraft, timestamp: updated });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.rangeRow}>
        {RANGE_OPTIONS.map((option) => {
          const isActive = option.key === range;
          return (
            <Pressable
              key={option.key}
              onPress={() => setRange(option.key)}
              style={[styles.rangeButton, isActive && styles.rangeButtonActive]}
            >
              <Text style={[styles.rangeButtonText, isActive && styles.rangeButtonTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>7-day mean</Text>
          <Text style={styles.metricValue}>{formatVolume(summary.mean7d)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>30-day mean</Text>
          <Text style={styles.metricValue}>{formatVolume(summary.mean30d)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Variability</Text>
          <Text style={styles.metricValue}>
            {summary.variability === null ? "--" : summary.variability.toFixed(1)}
          </Text>
        </View>
      </View>

      <View style={styles.insightsCard}>
        <Text style={styles.sectionTitle}>Trend insights</Text>
        <View style={styles.insightList}>
          {insights.map((insight) => (
            <View key={insight} style={styles.insightItem}>
              <Text style={styles.insightBullet}>•</Text>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Best, worst and mean volume</Text>

        {chart ? (
          <>
            <View style={styles.chartFrame}>
              <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                {chart.guides.map((guide) => {
                  const y = chart.yForValue(guide);
                  return (
                    <React.Fragment key={guide}>
                      <Line
                        x1={LEFT_PAD}
                        y1={y}
                        x2={CHART_WIDTH - RIGHT_PAD}
                        y2={y}
                        stroke="#cbd5e1"
                        strokeDasharray="3 3"
                        strokeWidth={1}
                      />
                      <SvgText x={6} y={y + 4} fontSize="11" fill="#52606d">
                        {guide}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                <Line
                  x1={LEFT_PAD}
                  y1={TOP_PAD}
                  x2={LEFT_PAD}
                  y2={CHART_HEIGHT - BOTTOM_PAD}
                  stroke="#94a3b8"
                  strokeWidth={1}
                />
                <Line
                  x1={LEFT_PAD}
                  y1={CHART_HEIGHT - BOTTOM_PAD}
                  x2={CHART_WIDTH - RIGHT_PAD}
                  y2={CHART_HEIGHT - BOTTOM_PAD}
                  stroke="#94a3b8"
                  strokeWidth={1}
                />

                <Polyline
                  points={chart.maximumLine}
                  fill="none"
                  stroke="#2f855a"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <Polyline
                  points={chart.minimumLine}
                  fill="none"
                  stroke="#d64545"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <Polyline
                  points={chart.averageLine}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {visiblePoints.map((point, index) => {
                  if (!hasContextMarker(point)) {
                    return null;
                  }

                  const x = chart.xForIndex(index);
                  const y = chart.yForValue(point.maximum) - 14;

                  return (
                    <Polygon
                      key={point.id}
                      points={`${x},${y} ${x - 7},${y + 12} ${x + 7},${y + 12}`}
                      fill={point.eventType ? getEventColor(point.eventType) : "#475569"}
                      onPress={() => setSelectedEventId(point.id)}
                    />
                  );
                })}
              </Svg>
            </View>

            <View style={styles.legendRow}>
              <Text style={[styles.legendItem, { color: "#2f855a" }]}>Green max</Text>
              <Text style={[styles.legendItem, { color: "#d64545" }]}>Red min</Text>
              <Text style={[styles.legendItem, { color: "#2563eb" }]}>Blue mean</Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No readings yet</Text>
            <Text style={styles.emptyHint}>Save a few log entries to populate the trend chart.</Text>
          </View>
        )}
      </View>

      {selectedMarkerPoint ? (
        <View style={styles.eventCard}>
          <Text style={styles.eventCardTitle}>
            {selectedMarkerPoint.eventType ? getEventLabel(selectedMarkerPoint.eventType) : "Symptom context"}
          </Text>
          <Text style={styles.eventCardBody}>
            {selectedMarkerPoint.eventNote?.trim() || "No extra details provided."}
          </Text>
          <Text style={styles.eventCardBody}>{formatContextSummary(selectedMarkerPoint)}</Text>
          <Text style={styles.eventCardMeta}>
            {parseStoredTimestamp(selectedMarkerPoint.recordedAt).toLocaleString()}
          </Text>
        </View>
      ) : null}

      <View style={styles.exportRow}>
        <Pressable style={styles.primaryExport} onPress={onShareExport} disabled={!readings.length}>
          <Text style={styles.primaryExportText}>Share to Cloud Apps</Text>
        </Pressable>
        <Pressable style={styles.secondaryExport} onPress={onSaveExport} disabled={!readings.length}>
          <Text style={styles.secondaryExportText}>Save CSV Locally</Text>
        </Pressable>
      </View>

      <View style={styles.exportRow}>
        <Pressable style={styles.primaryExport} onPress={onBackupJson} disabled={!readings.length}>
          <Text style={styles.primaryExportText}>Backup JSON to Drive</Text>
        </Pressable>
        <Pressable style={styles.secondaryExport} onPress={() => void onRestoreJson()}>
          <Text style={styles.secondaryExportText}>Restore JSON</Text>
        </Pressable>
      </View>

      <Text style={styles.exportHint}>
        CSV is Excel-compatible. JSON backup is intended for Google Drive or other file-based
        backup, and restore merges only missing readings into local storage.
      </Text>

      <View style={styles.historyCard}>
        <Text style={styles.sectionTitle}>Recent history</Text>
        <Text style={styles.sectionHint}>Edit or delete saved readings directly from this list.</Text>

        {historyPoints.length ? (
          historyPoints.map((point) => {
            const isEditing = editingId === point.id && editDraft;

            return (
              <View key={point.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historyDate}>
                      {parseStoredTimestamp(point.recordedAt).toLocaleString()}
                    </Text>
                    <Text style={styles.historyValue}>
                      Max {point.maximum} | Mean {Math.round(point.average)}
                    </Text>
                    <Text style={styles.historyContext}>{formatContextSummary(point)}</Text>
                  </View>

                  <View style={styles.historyActions}>
                    <Pressable style={styles.inlineButton} onPress={() => startEditing(point)}>
                      <Text style={styles.inlineButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.inlineButton, styles.deleteButton]}
                      onPress={() => handleDelete(point.id)}
                    >
                      <Text style={[styles.inlineButtonText, styles.deleteButtonText]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>

                {isEditing ? (
                  <View style={styles.editorCard}>
                    <View style={styles.editorTimestampRow}>
                      <Pressable
                        onPress={() => setEditPickerState("date")}
                        style={styles.editorTimestampChip}
                      >
                        <Text style={styles.editorTimestampText}>
                          {editDraft.timestamp.toLocaleDateString()}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setEditPickerState("time")}
                        style={styles.editorTimestampChip}
                      >
                        <Text style={styles.editorTimestampText}>
                          {editDraft.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </Pressable>
                    </View>

                    <VolumeSlider
                      label="Trial 1"
                      value={editDraft.trial1}
                      onChange={(value) => setEditDraft({ ...editDraft, trial1: value })}
                    />
                    <VolumeSlider
                      label="Trial 2"
                      value={editDraft.trial2}
                      onChange={(value) => setEditDraft({ ...editDraft, trial2: value })}
                    />
                    <VolumeSlider
                      label="Trial 3"
                      value={editDraft.trial3}
                      onChange={(value) => setEditDraft({ ...editDraft, trial3: value })}
                    />
                    <FeelingSlider
                      value={editDraft.feeling}
                      onChange={(value) => setEditDraft({ ...editDraft, feeling: value })}
                    />
                    <EventExpander
                      eventType={editDraft.eventType}
                      note={editDraft.eventNote}
                      onChange={(payload) =>
                        setEditDraft({
                          ...editDraft,
                          eventType: payload.eventType,
                          eventNote: payload.note,
                        })
                      }
                    />
                    <SymptomContextFields
                      value={{
                        cough: editDraft.cough,
                        wheeze: editDraft.wheeze,
                        nightSymptoms: editDraft.nightSymptoms,
                        rescueInhalerPuffs: editDraft.rescueInhalerPuffs,
                        triggerTags: editDraft.triggerTags,
                      }}
                      onChange={(value) =>
                        setEditDraft({
                          ...editDraft,
                          cough: value.cough,
                          wheeze: value.wheeze,
                          nightSymptoms: value.nightSymptoms,
                          rescueInhalerPuffs: value.rescueInhalerPuffs,
                          triggerTags: value.triggerTags,
                        })
                      }
                    />

                    <View style={styles.editorActions}>
                      <Pressable
                        style={styles.editorSaveButton}
                        onPress={() => {
                          updateReading(editDraft.id, {
                            recordedAt: formatLocalTimestamp(editDraft.timestamp),
                            trial1: editDraft.trial1,
                            trial2: editDraft.trial2,
                            trial3: editDraft.trial3,
                            feeling: editDraft.feeling,
                            eventType: editDraft.eventType,
                            eventNote: editDraft.eventNote.trim() || null,
                            cough: editDraft.cough,
                            wheeze: editDraft.wheeze,
                            nightSymptoms: editDraft.nightSymptoms,
                            rescueInhalerPuffs: editDraft.rescueInhalerPuffs,
                            triggerTags: editDraft.triggerTags.join(","),
                          });
                          setEditingId(null);
                          setEditDraft(null);
                          refreshData();
                        }}
                      >
                        <Text style={styles.editorSaveText}>Save changes</Text>
                      </Pressable>
                      <Pressable
                        style={styles.editorCancelButton}
                        onPress={() => {
                          setEditingId(null);
                          setEditDraft(null);
                          setEditPickerState(null);
                        }}
                      >
                        <Text style={styles.editorCancelText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyHint}>No saved history yet.</Text>
          </View>
        )}
      </View>

      {editDraft && editPickerState ? (
        <DateTimePicker
          value={editDraft.timestamp}
          mode={editPickerState}
          is24Hour
          display="default"
          onChange={handleEditPickerChange}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f8fb",
  },
  content: {
    padding: 14,
    paddingBottom: 28,
  },
  sectionTitle: {
    color: "#102a43",
    fontSize: 16,
    fontWeight: "800",
  },
  sectionHint: {
    color: "#52606d",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  rangeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  rangeButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d9e2ec",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    alignItems: "center",
  },
  rangeButtonActive: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  rangeButtonText: {
    color: "#334e68",
    fontSize: 12,
    fontWeight: "700",
  },
  rangeButtonTextActive: {
    color: "#ffffff",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    padding: 12,
  },
  metricLabel: {
    color: "#52606d",
    fontSize: 12,
    fontWeight: "700",
  },
  metricValue: {
    color: "#102a43",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  insightsCard: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    padding: 14,
    marginBottom: 14,
  },
  insightList: {
    marginTop: 10,
    gap: 8,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  insightBullet: {
    color: "#0f766e",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 18,
  },
  insightText: {
    flex: 1,
    color: "#334e68",
    fontSize: 13,
    lineHeight: 18,
  },
  chartCard: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    padding: 14,
  },
  chartTitle: {
    color: "#102a43",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  chartFrame: {
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  legendItem: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#102a43",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyHint: {
    color: "#52606d",
    fontSize: 13,
    marginTop: 6,
  },
  eventCard: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#fff8eb",
    padding: 14,
    borderWidth: 1,
    borderColor: "#f6ad55",
  },
  eventCardTitle: {
    color: "#9c4221",
    fontSize: 14,
    fontWeight: "800",
  },
  eventCardBody: {
    color: "#7b341e",
    fontSize: 13,
    marginTop: 6,
  },
  eventCardMeta: {
    color: "#9c4221",
    fontSize: 12,
    marginTop: 8,
  },
  exportRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  primaryExport: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#1d4ed8",
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryExportText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryExport: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#dbeafe",
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryExportText: {
    color: "#1e3a8a",
    fontSize: 13,
    fontWeight: "800",
  },
  exportHint: {
    color: "#52606d",
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  historyCard: {
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    padding: 14,
  },
  historyItem: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
  },
  historyHeader: {
    gap: 10,
  },
  historyMeta: {
    gap: 4,
  },
  historyDate: {
    color: "#102a43",
    fontSize: 13,
    fontWeight: "700",
  },
  historyValue: {
    color: "#52606d",
    fontSize: 12,
  },
  historyContext: {
    color: "#7c3aed",
    fontSize: 12,
  },
  historyActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#e0f2fe",
  },
  inlineButtonText: {
    color: "#0c4a6e",
    fontSize: 12,
    fontWeight: "800",
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
  },
  deleteButtonText: {
    color: "#b91c1c",
  },
  editorCard: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    padding: 12,
  },
  editorTimestampRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  editorTimestampChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  editorTimestampText: {
    color: "#334e68",
    fontSize: 12,
    fontWeight: "700",
  },
  editorActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  editorSaveButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#1f6f4a",
  },
  editorSaveText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  editorCancelButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#e2e8f0",
  },
  editorCancelText: {
    color: "#334e68",
    fontSize: 13,
    fontWeight: "800",
  },
});
