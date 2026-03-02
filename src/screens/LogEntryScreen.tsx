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
import { formatLocalTimestamp, initializeDatabase, insertReading } from "../db/db";
import type { EventType, FeelingScore } from "../db/schema";

type PickerState = null | "entryDate" | "entryTime";

export default function LogEntryScreen() {
  initializeDatabase();

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

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentPicker = pickerState;
    setPickerState(null);

    if (event.type !== "set" || !selectedDate || !currentPicker) {
      return;
    }

    if (currentPicker === "entryDate") {
      setTimestamp((current) => {
        const updated = new Date(current);
        updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        return updated;
      });
      return;
    }

    setTimestamp((current) => {
      const updated = new Date(current);
      updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      return updated;
    });
  };

  const pickerMode = pickerState === "entryDate" ? "date" : "time";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.topTitle}>New reading</Text>
          <View style={styles.timestampRow}>
            <Pressable onPress={() => setPickerState("entryDate")} style={styles.timestampChip}>
              <Text style={styles.timestampText}>{dateStr}</Text>
            </Pressable>
            <Pressable onPress={() => setPickerState("entryTime")} style={styles.timestampChip}>
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

      {pickerState ? (
        <DateTimePicker
          value={timestamp}
          mode={pickerMode}
          is24Hour
          display="default"
          onChange={handlePickerChange}
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
});
