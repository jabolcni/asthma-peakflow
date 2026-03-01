import React, { useMemo, useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EventExpander } from "../components/EventExpander";
import { FeelingSlider } from "../components/FeelingSlider";
import {
  SymptomContextFields,
  type SymptomContextValue,
} from "../components/SymptomContextFields";
import { VolumeSlider } from "../components/VolumeSlider";
import {
  formatLocalTimestamp,
  getAppSettings,
  initializeDatabase,
  insertReading,
  updateAppSettings,
} from "../db/db";
import type { EventType, FeelingScore, ReminderSlot } from "../db/schema";
import { cancelReminder, scheduleReminder } from "../notifications/reminders";

type PickerState =
  | null
  | { type: "entryDate" }
  | { type: "entryTime" }
  | { type: "reminder"; slot: ReminderSlot };

function formatReminderTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function timeToDate(value: string) {
  const [hoursText, minutesText] = value.split(":");
  const nextDate = new Date();
  nextDate.setHours(Number(hoursText ?? "8"), Number(minutesText ?? "0"), 0, 0);
  return nextDate;
}

export default function LogEntryScreen() {
  initializeDatabase();

  const initialSettings = useMemo(() => getAppSettings(), []);

  const [trial1, setTrial1] = useState(400);
  const [trial2, setTrial2] = useState(400);
  const [trial3, setTrial3] = useState(400);
  const [feeling, setFeeling] = useState<FeelingScore>(3);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [eventNote, setEventNote] = useState("");
  const [symptomContext, setSymptomContext] = useState<SymptomContextValue>({
    cough: false,
    wheeze: false,
    nightSymptoms: false,
    rescueInhalerPuffs: 0,
    triggerTags: [],
  });
  const [savedCount, setSavedCount] = useState(0);
  const [timestamp, setTimestamp] = useState(() => new Date());
  const [pickerState, setPickerState] = useState<PickerState>(null);
  const [morningReminderTime, setMorningReminderTime] = useState(initialSettings.morningReminderTime);
  const [morningReminderEnabled, setMorningReminderEnabled] = useState(
    initialSettings.morningReminderEnabled
  );
  const [morningReminderId, setMorningReminderId] = useState(initialSettings.morningReminderId);
  const [eveningReminderTime, setEveningReminderTime] = useState(initialSettings.eveningReminderTime);
  const [eveningReminderEnabled, setEveningReminderEnabled] = useState(
    initialSettings.eveningReminderEnabled
  );
  const [eveningReminderId, setEveningReminderId] = useState(initialSettings.eveningReminderId);

  const dateStr = useMemo(
    () =>
      timestamp.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    [timestamp]
  );
  const timeStr = useMemo(
    () =>
      timestamp.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [timestamp]
  );

  const applyDatePart = (nextDate: Date) => {
    setTimestamp((current) => {
      const updated = new Date(current);
      updated.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
      return updated;
    });
  };

  const applyTimePart = (nextTime: Date) => {
    setTimestamp((current) => {
      const updated = new Date(current);
      updated.setHours(nextTime.getHours(), nextTime.getMinutes(), 0, 0);
      return updated;
    });
  };

  const persistReminderState = (slot: ReminderSlot, payload: { enabled: boolean; time: string; id: string | null }) => {
    if (slot === "morning") {
      setMorningReminderEnabled(payload.enabled);
      setMorningReminderTime(payload.time);
      setMorningReminderId(payload.id);
      updateAppSettings({
        morningReminderEnabled: payload.enabled,
        morningReminderTime: payload.time,
        morningReminderId: payload.id,
      });
      return;
    }

    setEveningReminderEnabled(payload.enabled);
    setEveningReminderTime(payload.time);
    setEveningReminderId(payload.id);
    updateAppSettings({
      eveningReminderEnabled: payload.enabled,
      eveningReminderTime: payload.time,
      eveningReminderId: payload.id,
    });
  };

  const rescheduleReminder = async (slot: ReminderSlot, nextTime: string) => {
    const currentId = slot === "morning" ? morningReminderId : eveningReminderId;
    const enabled = slot === "morning" ? morningReminderEnabled : eveningReminderEnabled;

    if (!enabled) {
      persistReminderState(slot, { enabled, time: nextTime, id: currentId });
      return;
    }

    try {
      await cancelReminder(currentId);
      const nextId = await scheduleReminder(slot, nextTime);
      persistReminderState(slot, { enabled: true, time: nextTime, id: nextId });
    } catch (error) {
      Alert.alert("Reminder", error instanceof Error ? error.message : "Could not update reminder.");
    }
  };

  const toggleReminder = async (slot: ReminderSlot) => {
    const enabled = slot === "morning" ? morningReminderEnabled : eveningReminderEnabled;
    const time = slot === "morning" ? morningReminderTime : eveningReminderTime;
    const currentId = slot === "morning" ? morningReminderId : eveningReminderId;

    try {
      if (enabled) {
        await cancelReminder(currentId);
        persistReminderState(slot, { enabled: false, time, id: null });
        return;
      }

      const nextId = await scheduleReminder(slot, time);
      persistReminderState(slot, { enabled: true, time, id: nextId });
    } catch (error) {
      Alert.alert("Reminder", error instanceof Error ? error.message : "Could not update reminder.");
    }
  };

  const handlePickerChange = async (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentPicker = pickerState;
    setPickerState(null);

    if (event.type !== "set" || !selectedDate || !currentPicker) {
      return;
    }

    if (currentPicker.type === "entryDate") {
      applyDatePart(selectedDate);
      return;
    }

    if (currentPicker.type === "entryTime") {
      applyTimePart(selectedDate);
      return;
    }

    const nextTime = formatReminderTime(selectedDate);
    await rescheduleReminder(currentPicker.slot, nextTime);
  };

  const pickerValue =
    pickerState?.type === "reminder"
      ? timeToDate(pickerState.slot === "morning" ? morningReminderTime : eveningReminderTime)
      : timestamp;

  const pickerMode = pickerState?.type === "entryDate" ? "date" : "time";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.topTitle}>New reading</Text>
          <View style={styles.timestampRow}>
            <Pressable onPress={() => setPickerState({ type: "entryDate" })} style={styles.timestampChip}>
              <Text style={styles.timestampText}>{dateStr}</Text>
            </Pressable>
            <Pressable onPress={() => setPickerState({ type: "entryTime" })} style={styles.timestampChip}>
              <Text style={styles.timestampText}>{timeStr}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.counterPill}>
          <Text style={styles.counterText}>{savedCount} saved</Text>
        </View>
      </View>

      <View style={styles.card}>
        <VolumeSlider label="Trial 1" value={trial1} onChange={setTrial1} />
        <VolumeSlider label="Trial 2" value={trial2} onChange={setTrial2} />
        <VolumeSlider label="Trial 3" value={trial3} onChange={setTrial3} />
        <FeelingSlider value={feeling} onChange={setFeeling} />

        <Pressable
          style={styles.saveBtn}
          onPress={() => {
            insertReading({
              recordedAt: formatLocalTimestamp(timestamp),
              trial1,
              trial2,
              trial3,
              feeling,
              eventType,
              eventNote: eventNote.trim() || null,
              cough: symptomContext.cough,
              wheeze: symptomContext.wheeze,
              nightSymptoms: symptomContext.nightSymptoms,
              rescueInhalerPuffs: symptomContext.rescueInhalerPuffs,
              triggerTags: symptomContext.triggerTags.join(","),
            });

            setSavedCount((current) => current + 1);
            setTimestamp(new Date());
            setEventType(null);
            setEventNote("");
            setSymptomContext({
              cough: false,
              wheeze: false,
              nightSymptoms: false,
              rescueInhalerPuffs: 0,
              triggerTags: [],
            });

            Alert.alert("Saved", "Peak flow reading stored locally.");
          }}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>

        <EventExpander
          eventType={eventType}
          note={eventNote}
          onChange={(payload) => {
            setEventType(payload.eventType);
            setEventNote(payload.note);
          }}
        />

        <SymptomContextFields value={symptomContext} onChange={setSymptomContext} />
      </View>

      <View style={styles.reminderCard}>
        <Text style={styles.reminderTitle}>Daily reminders</Text>
        <Text style={styles.reminderHint}>Set morning and evening notifications for routine readings.</Text>

        <View style={styles.reminderRow}>
          <View>
            <Text style={styles.reminderLabel}>Morning</Text>
            <Pressable
              onPress={() => setPickerState({ type: "reminder", slot: "morning" })}
              style={styles.reminderTimeChip}
            >
              <Text style={styles.reminderTimeText}>{morningReminderTime}</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.reminderToggle, morningReminderEnabled && styles.reminderToggleActive]}
            onPress={() => void toggleReminder("morning")}
          >
            <Text
              style={[
                styles.reminderToggleText,
                morningReminderEnabled && styles.reminderToggleTextActive,
              ]}
            >
              {morningReminderEnabled ? "On" : "Off"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.reminderRow}>
          <View>
            <Text style={styles.reminderLabel}>Evening</Text>
            <Pressable
              onPress={() => setPickerState({ type: "reminder", slot: "evening" })}
              style={styles.reminderTimeChip}
            >
              <Text style={styles.reminderTimeText}>{eveningReminderTime}</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.reminderToggle, eveningReminderEnabled && styles.reminderToggleActive]}
            onPress={() => void toggleReminder("evening")}
          >
            <Text
              style={[
                styles.reminderToggleText,
                eveningReminderEnabled && styles.reminderToggleTextActive,
              ]}
            >
              {eveningReminderEnabled ? "On" : "Off"}
            </Text>
          </Pressable>
        </View>
      </View>

      {pickerState ? (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode}
          is24Hour
          display="default"
          onChange={(event, selectedDate) => {
            void handlePickerChange(event, selectedDate);
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef6f2",
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  topTitle: {
    color: "#102a43",
    fontSize: 21,
    fontWeight: "700",
  },
  timestampRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  timestampChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  timestampText: {
    color: "#334e68",
    fontSize: 12,
    fontWeight: "700",
  },
  counterPill: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#d9f2e3",
  },
  counterText: {
    color: "#1f6f4a",
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    padding: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  saveBtn: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#1f6f4a",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  reminderCard: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 14,
  },
  reminderTitle: {
    color: "#102a43",
    fontSize: 16,
    fontWeight: "800",
  },
  reminderHint: {
    color: "#52606d",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  reminderRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reminderLabel: {
    color: "#334e68",
    fontSize: 13,
    fontWeight: "700",
  },
  reminderTimeChip: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  reminderTimeText: {
    color: "#0c4a6e",
    fontSize: 12,
    fontWeight: "800",
  },
  reminderToggle: {
    minWidth: 64,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#e2e8f0",
  },
  reminderToggleActive: {
    backgroundColor: "#1f6f4a",
  },
  reminderToggleText: {
    color: "#334e68",
    fontSize: 12,
    fontWeight: "800",
  },
  reminderToggleTextActive: {
    color: "#ffffff",
  },
});
